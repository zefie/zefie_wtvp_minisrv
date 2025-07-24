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
// The identifier is a sorted combination of src/dst ip:port pairs.
const wtvpSessions = {};

const parser = pcapParser.parse(pcapFile);

parser.on('packet', (packet) => {

    const data = packet.data;
    const ethType = data.readUInt16BE(12);
    if (ethType !== 0x0800) return; // Not IPv4

    const ipHeader = data.slice(14, 34);
    const protocol = ipHeader[9];
    if (protocol !== 6) return; // Not TCP

    const srcIP = ipHeader.slice(12, 16).join('.');
    const dstIP = ipHeader.slice(16, 20).join('.');
    const tcpHeaderStart = 34;
    const srcPort = data.readUInt16BE(tcpHeaderStart);
    const dstPort = data.readUInt16BE(tcpHeaderStart + 2);
    const tcpHeaderLen = (data[tcpHeaderStart + 12] >> 4) * 4;
    const tcpPayloadOffset = tcpHeaderStart + tcpHeaderLen;

    const payload = data.slice(tcpPayloadOffset);
    
    // Create a unique key for the TCP session, independent of direction
    const src = `${srcIP}:${srcPort}`;
    const dst = `${dstIP}:${dstPort}`;
    const sessionKey = [src, dst].sort().join('-');

    // If it's a new session, initialize its state
    if (!wtvpSessions[sessionKey]) {
        console.log(`[+] New TCP Session detected: ${sessionKey}`);
        wtvpSessions[sessionKey] = {
            clientAddr: null,
            serverAddr: null,
            wtvsec: null,
            secureMode: false,
        };
    }
    
    // Ignore packets without a payload
    if (!payload || payload.length === 0) {
        return;
    }

    const currentSession = wtvpSessions[sessionKey];
    const sourceAddr = `${srcIP}:${srcPort}`;
    const payloadStr = payload.toString('utf8');

    // 1. Identify Client and Server
    if (!currentSession.clientAddr) {
        if (payloadStr.startsWith('GET') || payloadStr.startsWith('POST') || payloadStr.startsWith('SECURE ON')) {
            currentSession.clientAddr = sourceAddr;
            currentSession.serverAddr = `${dstIP}:${dstPort}`;
            console.log(`[*] Client identified as ${currentSession.clientAddr}`);
        }
    }

    // This check handles cases where the first packet didn't identify the client.
    if (!currentSession.clientAddr) {
        return;
    }

    const isClient = sourceAddr === currentSession.clientAddr;
    const direction = isClient ? '[CLIENT -> SERVER]' : '[SERVER -> CLIENT]';
    
    console.log(`\n${'='.repeat(20)} ${direction} (${payload.length} bytes) ${'='.repeat(20)}`);

    // 2. Process data based on whether we are in secure mode or not
    if (!currentSession.secureMode) {
        handlePlaintext(currentSession, payloadStr, isClient);
    } else {
        handleEncrypted(currentSession, payload, isClient);
    }
});

parser.on('end', () => {
    console.log('\n[*] PCAP file processing complete.');
});

parser.on('error', (err) => {
    console.error(`[!] An error occurred: ${err.message}`);
});


/**
 * Handles plaintext WTVP messages to set up the security context.
 * @param {object} session - The session state object.
 * @param {string} payload - The plaintext payload.
 * @param {boolean} isClient - True if the message is from the client.
 */
function handlePlaintext(session, payload, isClient) {
    console.log(payload);
    const headers = parseHeaders(payload);
    if (wtvsec && !session.wtvsec) {
        session.wtvsec = wtvsec;
    }

    if (isClient) {
        // Check for the SECURE ON command from the client
        if (payload.startsWith('SECURE ON')) {
            if (session.wtvsec) {
                console.log('[*] SECURE ON detected. Initializing RC4 session.');
                session.wtvsec.SecureOn();
                session.secureMode = true;
            } else {
                console.error('[!] SECURE ON received before wtv-initial-key. Cannot proceed.');
            }
        }
        // Check for wtv-incarnation header
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
        // Look for the initial key to bootstrap the WTVSec instance
        if (headers['wtv-initial-key']) {
            const initialKey = headers['wtv-initial-key'];
            console.log(`[*] Captured wtv-initial-key: ${initialKey}`);
            minisrv_config.config.keys.initial_shared_key = initialKey;
            wtvsec = new WTVSec(minisrv_config);
        }
        // Process the challenge from the server
        if (headers['wtv-challenge'] && wtvsec) {
            const challenge = headers['wtv-challenge'];
            console.log(`[*] Captured wtv-challenge. Processing...`);
            wtv_challenge_response = wtvsec.ProcessChallenge(challenge).toString(CryptoJS.enc.Base64)
            session.wtvsec = wtvsec; // Ensure session has the WTVSec instance
        }
        if (headers['wtv-lzpf'] !== undefined) {
            session.lzpf = true;
        }
    }
}

/**
 * Handles encrypted WTVP messages.
 * @param {object} session - The session state object.
 * @param {Buffer} data - The raw TCP data buffer.
 * @param {boolean} isClient - True if the message is from the client.
 */
function handleEncrypted(session, data, isClient) {
    // The encrypted data comes after the headers and a double newline.
    var lzpf = false;
    const separator = '\n\n';
    const dataStr = data.toString('binary');
    const separatorIndex = dataStr.indexOf(separator);
    
    if (separatorIndex === -1) {
        console.log('[!] Encrypted message without header separator found. Assuming entire payload is encrypted.');
        // This can happen if headers are in a separate packet from the body.
        // For simplicity, we try to decrypt the whole payload.
        // A more robust solution would buffer data across packets.
        try {
            const keyNum = isClient ? 0 : 1;
            const decryptedBody = session.wtvsec.Decrypt(keyNum, data);
            if (session.lzpf) {
                console.log('\n[DECRYPTED DECOMPRESSED PAYLOAD (ASSUMED)]:\n' + decryptedBody.toString('utf8'));                
                var lzpf = new LZPF();
                decryptedBody = lzpf.decompress(decryptedBody);
                session.lzpf = false; // Reset after decompression
            } else {
                console.log('\n[DECRYPTED PAYLOAD (ASSUMED)]:\n' + decryptedBody.toString('utf8'));
            }
        } catch (e) {
            console.error(`[!] Decryption failed: ${e.message}`);
        }
        return;
    }
    
    const headersPart = data.slice(0, separatorIndex).toString('utf8');
    const encryptedBody = data.slice(separatorIndex + separator.length);
    
    console.log('[HEADERS]:');
    console.log(headersPart);
    
    if (encryptedBody.length > 0) {
        // Decrypt based on message direction
        const keyNum = isClient ? 0 : 1; // 0 for client-to-server, 1 for server-to-client
        try {
            const decryptedBody = session.wtvsec.Decrypt(keyNum, encryptedBody);
            if (session.lzpf) {
                console.log('\n[DECRYPTED DECOMPRESSED PAYLOAD]:');
                var lzpf = new LZPF();
                decryptedBody = lzpf.decompress(decryptedBody);
                session.lzpf = false; // Reset after decompression
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
 * A simple utility to parse HTTP-like headers into an object.
 * @param {string} payload - The raw text payload.
 * @returns {object} A key-value map of the headers.
 */
function parseHeaders(payload) {
    const headers = {};
    const lines = payload.split(/\r?\n/);
    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length === 2) {
            headers[parts[0].toLowerCase()] = parts[1].trim();
        }
    });
    return headers;
}
