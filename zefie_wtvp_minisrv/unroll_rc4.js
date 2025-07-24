const fs = require('fs');
const pcapParser = require('pcap-parser');
const WTVSec = require('./includes/classes/WTVSec.js');
const LZPF = require('./includes/classes/LZPF.js');
const WTVShared = require('./includes/classes/WTVShared.js')['WTVShared'];
const wtvshared = new WTVShared();
const CryptoJS = require('crypto-js');

var wtvsec = null;
var wtv_challenge_response = null;
// A simple mock config, the initial_shared_key is populated dynamically.
const minisrv_config = {
    config: {
        keys: {
            initial_shared_key: null
        },
        debug_flags: {
            debug: false // Set to true for verbose logging from WTVSec
        }
    }
};

// --- Main Execution ---
const pcapFile = process.argv[2];
if (!pcapFile) {
    console.error('Usage: node parse_wtvp_parser.js <path_to_pcap_file>');
    process.exit(1);
}

// A store for all active WTVP sessions, keyed by stream identifier.
const wtvpSessions = {};

const parser = pcapParser.parse(pcapFile);

parser.on('packet', (packet) => {
    const data = packet.data;
    const ethType = data.readUInt16BE(12);
    if (ethType !== 0x0800) return; // Not IPv4

    // IP header parsing
    const ipHeaderLength = (data[14] & 0x0F) * 4;
    const ipHeader = data.slice(14, 14 + ipHeaderLength);
    const protocol = ipHeader[9];
    if (protocol !== 6) return; // Not TCP

    const srcIP = ipHeader.slice(12, 16).join('.');
    const dstIP = ipHeader.slice(16, 20).join('.');

    // TCP header parsing
    const tcpHeaderStart = 14 + ipHeaderLength;
    const tcpHeaderLen = (data[tcpHeaderStart + 12] >> 4) * 4;
    const srcPort = data.readUInt16BE(tcpHeaderStart);
    const dstPort = data.readUInt16BE(tcpHeaderStart + 2);
    const seq = data.readUInt32BE(tcpHeaderStart + 4);
    const flags = data[tcpHeaderStart + 13];
    const isSYN = (flags & 0x02) !== 0;
    const isFIN = (flags & 0x01) !== 0;

    const tcpPayloadOffset = tcpHeaderStart + tcpHeaderLen;
    const payload = data.slice(tcpPayloadOffset);
    const tcpPayloadLength = payload.length;

    console.log(`[DEBUG] data.length=${data.length}, tcpPayloadOffset=${tcpPayloadOffset}`);
    // Create a unique key for the TCP session
    const src = `${srcIP}:${srcPort}`;
    const dst = `${dstIP}:${dstPort}`;
    const sessionKey = [src, dst].sort().join('-');

    // Initialize session state if new
    if (!wtvpSessions[sessionKey]) {
        console.log(`[+] New TCP Session detected: ${sessionKey}`);
        wtvpSessions[sessionKey] = {
            clientAddr: null,
            serverAddr: null,
            wtvsec: null,
            secureMode: false,
            // TCP stream reassembly state, keyed by source ip:port
            streams: {},
        };
    }
    
    const currentSession = wtvpSessions[sessionKey];

    // Ensure a stream object exists for the source of this packet
    if (!currentSession.streams[src]) {
        currentSession.streams[src] = { nextSeq: -1, outOfOrder: {}, data: Buffer.alloc(0), isClient: false };
    }
    const stream = currentSession.streams[src];

    // 1. Identify Client and Server (if not already done)
    if (!currentSession.clientAddr && payload.length > 0) {
        const payloadStr = payload.toString('utf8');
        if (payloadStr.startsWith('GET') || payloadStr.startsWith('POST') || payloadStr.startsWith('SECURE ON')) {
            console.log(`[*] Client identified as ${src}, Server as ${dst}`);
            currentSession.clientAddr = src;
            currentSession.serverAddr = dst;
            
            // Mark the current stream (from src) as the client
            stream.isClient = true;

            // Ensure the server's stream object exists as well
            if (!currentSession.streams[dst]) {
                currentSession.streams[dst] = { nextSeq: -1, outOfOrder: {}, data: Buffer.alloc(0), isClient: false };
            }
        }
    }

    // Set the isClient flag for every packet now that identification might have happened
    if(currentSession.clientAddr){
        stream.isClient = src === currentSession.clientAddr;
    }
    
    //

    // This is the expected in-order packet. Append its payload.
    stream.data = Buffer.concat([stream.data, payload]);
    stream.nextSeq += tcpPayloadLength;
    if (isSYN || isFIN) stream.nextSeq++;

    // Process any buffered out-of-order packets that are now in sequence
    let nextSeqInChain = stream.nextSeq;
    while (stream.outOfOrder[nextSeqInChain]) {
        const bufferedPayload = stream.outOfOrder[nextSeqInChain];
        const bufferedPayloadLength = bufferedPayload.length;
        
        stream.data = Buffer.concat([stream.data, bufferedPayload]);
        delete stream.outOfOrder[nextSeqInChain];
        
        nextSeqInChain += bufferedPayloadLength;
    }
    stream.nextSeq = nextSeqInChain;

    // Now that we have new contiguous data, try to process it as application messages
    for (const addr in currentSession.streams) {
        const s = currentSession.streams[addr];
        if (s.data.length > 0) {
            processStream(currentSession, addr);
        }
    }
});


/**
 * Processes the reassembled data buffer for a session, looking for complete messages.
 * @param {object} session - The session state object.
 * @param {string} sourceAddr - The source address (ip:port) of the stream being processed.
 */
function processStream(session, sourceAddr) {
    const stream = session.streams[sourceAddr];
    console.log(`[DEBUG] Processing stream: ${sourceAddr} isClient: ${stream.isClient}, buffer length: ${stream.data.length}`);

    if (!stream || !session.clientAddr) return; // Don't process until client is identified

    const isClient = stream.isClient;
    const direction = isClient ? '[CLIENT -> SERVER]' : '[SERVER -> CLIENT]';

    // Loop to process all complete messages currently in the buffer
    while (true) {
        let buffer = stream.data;
        if (buffer.length === 0) break;
        if (buffer.length === 6) {
            // Special case: buffer is exactly 6 bytes (likely a keepalive or unknown control message)
            // Remove the 6 bytes from the buffer and continue
            stream.data = buffer.slice(6);
            break;
        }

        const lfSeparator = Buffer.from('\n\n');
        const crlfSeparator = Buffer.from('\r\n\r\n');

        let separatorIndex = buffer.indexOf(lfSeparator);
        let separatorLength = lfSeparator.length;
        const crlfIndex = buffer.indexOf(crlfSeparator);

        if (crlfIndex !== -1 && (separatorIndex === -1 || crlfIndex < separatorIndex)) {
            separatorIndex = crlfIndex;
            separatorLength = crlfSeparator.length;
        }
        
        if (separatorIndex === -1) {
            // Incomplete message (no full headers yet), wait for more data.
            break;
        }

        const headersPart = buffer.slice(0, separatorIndex);
        const headers = parseHeaders(headersPart.toString('utf8'));
        const headerBlockLength = separatorIndex + separatorLength;
        
        let messageToProcess;
        let consumedSize;

        if (headers['content-length']) {
            const contentLength = parseInt(headers['content-length'], 10);
            const totalMessageSize = headerBlockLength + contentLength;

            if (buffer.length < totalMessageSize) {
                // We have headers, but the body is not fully here yet. Wait for more data.
                break;
            }
            messageToProcess = buffer.slice(0, totalMessageSize);
            consumedSize = totalMessageSize;
        } else {
            // No content-length. Assume the rest of the buffer is the message.
            messageToProcess = buffer.slice(0, headerBlockLength);
            consumedSize = headerBlockLength;
        }

        
        console.log(`\n${'='.repeat(20)} Processing Message: ${direction} (${messageToProcess.length} bytes) ${'='.repeat(20)}`);

        if (!session.secureMode) {
            handlePlaintext(session, messageToProcess.toString('utf8'), isClient);
        } else {
            handleEncrypted(session, messageToProcess, isClient);
        }

        // Slice the processed message from the front of the buffer
        stream.data = buffer.slice(consumedSize);
    }
}


parser.on('end', () => {
    console.log('\n[*] PCAP file processing complete.');
});

parser.on('error', (err) => {
    console.error(`[!] An error occurred: ${err.message}`);
});


/**
 * Handles a single complete plaintext WTVP message.
 * @param {object} session - The session state object.
 * @param {string} message - The plaintext message string.
 * @param {boolean} isClient - True if the message is from the client.
 */
function handlePlaintext(session, message, isClient) {
    const headers = parseHeaders(message);
    if (!headers['wtv-encrypted']) {
        console.log('[PLAINTEXT MESSAGE]:');
        console.log(message);
    }
    if (wtvsec && !session.wtvsec) {
        session.wtvsec = wtvsec;
    }


    if (isClient) {
        if (message.includes('SECURE ON')) {
            if (session.wtvsec) {
                console.log('[*] SECURE ON detected. Initializing RC4 session.');
                session.wtvsec.SecureOn();
                session.secureMode = true;
            } else {
                console.error('[!] SECURE ON received before wtv-initial-key. Cannot proceed.');
            }
        }
        if (headers['wtv-incarnation']) {
            const incarnation = parseInt(headers['wtv-incarnation'], 10);
            if (session.wtvsec) {
                console.log(`[*] Client sent wtv-incarnation: ${incarnation}`);
                session.wtvsec.set_incarnation(incarnation);
            }
        }
        if (headers['wtv-challenge-response']) {
            const challengeResponse = headers['wtv-challenge-response'];
            console.log(`[*] Client sent wtv-challenge-response: ${challengeResponse}`);
            if (wtv_challenge_response != challengeResponse) {
                console.error('[!] Mismatched wtv-challenge-response. Expected:', wtv_challenge_response);
                process.exit(1);
            } else {
                console.log('[*] wtv-challenge-response matches expected value.');
            }
        }
    } else { // Server
        if (headers['wtv-initial-key']) {
            const initialKey = headers['wtv-initial-key'];
            console.log(`[*] Captured wtv-initial-key: ${initialKey}`);
            minisrv_config.config.keys.initial_shared_key = initialKey;
            wtvsec = new WTVSec(minisrv_config);
        }
        if (headers['wtv-challenge'] && wtvsec) {
            const challenge = headers['wtv-challenge'];
            console.log(`[*] Captured wtv-challenge. Processing...`);
            wtv_challenge_response = wtvsec.ProcessChallenge(challenge).toString(CryptoJS.enc.Base64)
            session.wtvsec = wtvsec; // Ensure session has the WTVSec instance
        }
        if (typeof headers['wtv-lzpf'] !== 'undefined') {
            session.lzpf = true;
        }
        if (headers['wtv-encrypted']) {
            handleEncrypted(session, Buffer.from(message), isClient);
        }
    }
}

/**
 * Handles a single complete encrypted WTVP message.
 * @param {object} session - The session state object.
 * @param {Buffer} message - The raw message buffer.
 * @param {boolean} isClient - True if the message is from the client.
 */
function handleEncrypted(session, message, isClient) {
    const lfSeparator = Buffer.from('\n\n');
    const crlfSeparator = Buffer.from('\r\n\r\n');

    let separatorIndex = message.indexOf(lfSeparator);
    let separatorLength = lfSeparator.length;
    const crlfIndex = message.indexOf(crlfSeparator);

    if (crlfIndex !== -1 && (separatorIndex === -1 || crlfIndex < separatorIndex)) {
        separatorIndex = crlfIndex;
        separatorLength = crlfSeparator.length;
    }
    if (separatorIndex === -1) {
        console.log('[!] Encrypted message without header separator. This should not happen with reassembled streams.');
        return;
    }
    
    const headersPart = message.slice(0, separatorIndex).toString('utf8');
    const encryptedBody = message.slice(separatorIndex + separatorLength);

    console.log('[ENCRYPTED HEADERS]:');
    console.log(headersPart);
    
    if (encryptedBody.length > 0) {
        const keyNum = isClient ? 0 : 1;
        try {
            let decryptedBody = session.wtvsec.Decrypt(keyNum, encryptedBody);
            
            // Check for compression flag in the now-decrypted headers
            const headers = parseHeaders(headersPart);
            if (typeof headers['wtv-lzpf'] !== 'undefined') {
                console.log('\n[DECRYPTED DECOMPRESSED PAYLOAD]:');
                var lzpfHandler = new LZPF();
                decryptedBody = lzpfHandler.expand(decryptedBody);
            } else {
                console.log('\n[DECRYPTED PAYLOAD]:');
            }
            console.log(decryptedBody.toString('utf8'));

        } catch (e) {
            console.error(`[!] Decryption failed: ${e.message}`);
        }
    } else {
         console.log('\n[Encrypted message with no body]');
    }
}


/**
 * A utility to parse HTTP-like headers into an object.
 * @param {string} payload - The raw text payload.
 * @returns {object} A key-value map of the headers.
 */
function parseHeaders(payload) {
    const headers = {};
    const lines = payload.split(/\r?\n/);
    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            headers[parts[0].toLowerCase().trim()] = parts.slice(1).join(':').trim();
        }
    });
    return headers;
}
