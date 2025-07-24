const fs = require('fs');
const pcap = require('pcap-parser');
const WTVSec = require('./includes/classes/WTVSec.js');

// A map to hold the state of each TCP connection.
const connections = new Map();

/**
 * A simple, resilient function to parse HTTP headers from a buffer.
 * @param {Buffer} buffer - The buffer containing HTTP headers.
 * @returns {object|null} An object containing the headers, or null if headers are incomplete.
 */
function parseHeaders(buffer) {
    const headers = {};
    const headerString = buffer.toString('utf8');
    const headersEnd = headerString.indexOf('\r\n\r\n');
    if (headersEnd === -1) {
        return null; // Incomplete headers
    }

    const lines = headerString.slice(0, headersEnd).split('\r\n');
    for (const line of lines) {
        const parts = line.split(':');
        if (parts.length > 1) {
            const key = parts.shift().trim().toLowerCase();
            const value = parts.join(':').trim();
            headers[key] = value;
        }
    }
    return headers;
}

/**
 * Represents the state of a single direction of a TCP connection.
 */
class ConnectionState {
    constructor() {
        this.buffer = Buffer.alloc(0);
        this.securityState = 'PLAINTEXT'; // PLAINTEXT, AWAITING_SECURE_RESPONSE, SECURE
        this.wtvSec = null;
        this.initialKey = null;
        this.challenge = null;
        this.incarnation = null;
        this.isClient = false;
    }

    /**
     * Appends new data to the connection's buffer.
     * @param {Buffer} data - The raw TCP payload data.
     */
    feed(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
    }

    /**
     * Initializes the WTVSec instance for this connection.
     * @param {string} initialKey - The wtv-initial-key from the server.
     * @param {string} challenge - The wtv-challenge from the server.
     */
    initializeSecurity(initialKey, challenge) {
        this.wtvSec = new WTVSec({
            config: {
                keys: { initial_shared_key: initialKey },
                debug_flags: { debug: false }
            }
        });
        this.wtvSec.ProcessChallenge(challenge);
        console.log("🔑 Security context initialized.");
    }

    /**
     * Sets up the RC4 keys for an encrypted session.
     * @param {number} incarnation - The wtv-incarnation value.
     */
    setupEncryption(incarnation) {
        if (this.wtvSec) {
            this.incarnation = incarnation;
            this.wtvSec.set_incarnation(this.incarnation);
            console.log(`🔐 Encryption keys prepared for this stream (incarnation=${this.incarnation})`);
        }
    }

    /**
     * Decrypts data using the appropriate RC4 key.
     * @param {Buffer} data - The data to decrypt.
     * @returns {Buffer} The decrypted or original data.
     */
    decrypt(data) {
        if (this.wtvSec && data.length > 0) {
            try {
                // Client encrypts with key 0, server with key 1.
                const keyNum = this.isClient ? 0 : 1;
                const decrypted = this.wtvSec.Decrypt(keyNum, data);
                console.log(`📦 Decrypted ${data.length} bytes for ${this.isClient ? 'client' : 'server'} stream.`);
                return Buffer.from(decrypted);
            } catch (e) {
                console.error("Decryption failed:", e);
                return data;
            }
        }
        return data;
    }
}

/**
 * Processes the reassembled buffer for a connection, handling state transitions.
 * @param {ConnectionState} state - The state object for the current connection direction.
 * @param {ConnectionState} oppositeState - The state for the opposite direction of the connection.
 */
function processConnectionBuffer(state, oppositeState) {
    while (state.buffer.length > 0) {
        switch (state.securityState) {
            case 'AWAITING_SECURE_RESPONSE': {
                const headersEndIndex = state.buffer.indexOf('\r\n\r\n');
                if (headersEndIndex === -1) {
                    return; // Wait for the full headers.
                }

                const bodyStartIndex = headersEndIndex + 4;
                const plaintextHeaders = state.buffer.slice(0, bodyStartIndex);
                const encryptedBody = state.buffer.slice(bodyStartIndex);

                process.stdout.write(plaintextHeaders);

                if (encryptedBody.length > 0) {
                    const decryptedBody = state.decrypt(encryptedBody);
                    process.stdout.write(decryptedBody);
                }

                state.buffer = Buffer.alloc(0);
                state.securityState = 'SECURE';
                continue;
            }

            case 'SECURE': {
                const output = state.decrypt(state.buffer);
                process.stdout.write(output);
                state.buffer = Buffer.alloc(0);
                return;
            }

            case 'PLAINTEXT':
            default: {
                const headersEndIndex = state.buffer.indexOf('\r\n\r\n');
                if (headersEndIndex === -1) {
                    return;
                }

                const headerSectionLength = headersEndIndex + 4;
                const headerBuffer = state.buffer.slice(0, headerSectionLength);
                const headers = parseHeaders(headerBuffer);

                const requestLine = headerBuffer.toString('utf8').split('\r\n')[0];
                if (state.isClient && requestLine.includes('SECURE ON')) {
                    console.log("▶️ Client sent SECURE ON. Transitioning to encrypted mode.");
                    let incarnation = headers['wtv-incarnation'] ? parseInt(headers['wtv-incarnation'].trim(), 10) : 1;
                    
                    state.setupEncryption(incarnation);
                    state.securityState = 'SECURE';
                    if (oppositeState) {
                        oppositeState.setupEncryption(incarnation);
                        oppositeState.securityState = 'AWAITING_SECURE_RESPONSE';
                    }

                    process.stdout.write(headerBuffer);
                    const remainingData = state.buffer.slice(headerSectionLength);
                    
                    if (remainingData.length > 0) {
                        const decryptedBody = state.decrypt(remainingData);
                        process.stdout.write(decryptedBody);
                    }
                    state.buffer = Buffer.alloc(0);
                    return;
                }

                if (!state.isClient && headers) {
                    if (headers['wtv-initial-key']) {
                        state.initialKey = headers['wtv-initial-key'];
                        if(oppositeState) oppositeState.initialKey = headers['wtv-initial-key'];
                        console.log("Found wtv-initial-key.");
                    }
                    if (headers['wtv-challenge']) {
                        state.challenge = headers['wtv-challenge'];
                        if(oppositeState) oppositeState.challenge = headers['wtv-challenge'];
                        console.log("Found wtv-challenge.");
                    }

                    if (state.initialKey && state.challenge && !state.wtvSec) {
                        state.initializeSecurity(state.initialKey, state.challenge);
                        if (oppositeState) oppositeState.initializeSecurity(state.initialKey, state.challenge);
                    }
                }

                let fullMessageLength = headerSectionLength;
                if (headers && headers['content-length']) {
                    const bodyLength = parseInt(headers['content-length'], 10);
                    fullMessageLength += bodyLength;
                }
                
                if (state.buffer.length < fullMessageLength) {
                    return;
                }

                const fullMessage = state.buffer.slice(0, fullMessageLength);
                process.stdout.write(fullMessage);
                state.buffer = state.buffer.slice(fullMessageLength);
            }
        }
    }
}


// --- Main PCAP Processing Logic ---

const args = process.argv.slice(2);
const inputFile = args[args.indexOf('-i') + 1];
const serverIP = args[args.indexOf('-h') + 1];

if (!inputFile || !serverIP) {
    console.error('Usage: node unroll_rc4.js -i <pcap_file> -h <server_ip>');
    process.exit(1);
}

const parser = pcap.parse(fs.createReadStream(inputFile));
console.log(`🚀 Starting pcap parser for ${inputFile} with server IP ${serverIP}`);

let totalPackets = 0;
let processedPackets = 0;
let linkLayerType = -1;
let ipHeaderOffset = 14;

parser.on('globalHeader', (globalHeader) => {
    linkLayerType = globalHeader.linkLayerType;
    console.log(`[INFO] PCAP Link-Layer Header Type: ${linkLayerType}. Adjusting offsets.`);
    switch (linkLayerType) {
        case 0: ipHeaderOffset = 4; break;
        case 1: ipHeaderOffset = 14; break;
        case 101: ipHeaderOffset = 0; break;
        case 113: ipHeaderOffset = 16; break;
        default:
            console.warn(`[WARN] Unsupported link-layer type: ${linkLayerType}. Assuming Ethernet.`);
            ipHeaderOffset = 14;
    }
});

parser.on('packet', (packet) => {
    totalPackets++;

    let isIPv4 = false;
    switch (linkLayerType) {
        case 0: isIPv4 = (packet.data.length > 4) && (packet.data.readUInt32LE(0) === 2); break;
        case 1: isIPv4 = packet.data.readUInt16BE(12) === 0x0800; break;
        case 101: isIPv4 = (packet.data.length > 0) && ((packet.data[0] >> 4) === 4); break;
        case 113: isIPv4 = packet.data.readUInt16BE(14) === 0x0800; break;
        default: return;
    }
    if (!isIPv4) return;
    
    const protocolOffset = ipHeaderOffset + 9;
    if (packet.data.length <= protocolOffset || packet.data[protocolOffset] !== 6) return;
    
    const ipHeaderLength = (packet.data[ipHeaderOffset] & 0x0F) * 4;
    const tcpHeaderBase = ipHeaderOffset + ipHeaderLength;
    const tcpHeaderLength = (packet.data[tcpHeaderBase + 12] >> 4) * 4;
    const payloadOffset = tcpHeaderBase + tcpHeaderLength;
    if (packet.data.length <= payloadOffset) return;
    const payload = packet.data.slice(payloadOffset);
    if (payload.length === 0) return;

    processedPackets++;
    
    const srcIP = packet.data.slice(ipHeaderOffset + 12, ipHeaderOffset + 16).join('.');
    const dstIP = packet.data.slice(ipHeaderOffset + 16, ipHeaderOffset + 20).join('.');
    const srcPort = packet.data.readUInt16BE(tcpHeaderBase);
    const dstPort = packet.data.readUInt16BE(tcpHeaderBase + 2);
    
    if (srcIP != serverIP && dstIP !== serverIP) {
        return;
    }

    const currentKey = `${srcIP}:${srcPort}->${dstIP}:${dstPort}`;
    const oppositeKey = `${dstIP}:${dstPort}->${srcIP}:${srcPort}`;

    if (!connections.has(currentKey)) {
        let isClientToServer;
        const payloadString = payload.toString('utf8');
        console.log(payloadString);
        if (srcIP === serverIP && dstIP === serverIP) {
            isClientToServer = payloadString.startsWith('GET') || payloadString.startsWith('POST') || payloadString.startsWith('SECURE ON');
        } else {
            isClientToServer = dstIP === serverIP;
        }
        
        connections.set(currentKey, new ConnectionState());
        connections.set(oppositeKey, new ConnectionState());
        connections.get(currentKey).isClient = isClientToServer;
        connections.get(oppositeKey).isClient = !isClientToServer;
    }
    
    const state = connections.get(currentKey);
    const oppositeState = connections.get(oppositeKey);
    
    state.feed(payload);
    processConnectionBuffer(state, oppositeState);
    processConnectionBuffer(oppositeState, state);

});

parser.on('end', () => {
    console.log('\n[INFO] End of PCAP file reached. Processing any remaining buffered data...');
    for(const [key, state] of connections.entries()){
        const parts = key.split('->');
        const oppositeKey = `${parts[1]}->${parts[0]}`;
        if(connections.has(oppositeKey)) {
            const oppositeState = connections.get(oppositeKey);
            processConnectionBuffer(state, oppositeState);
        }
    }
    console.log(`\n✅ Done parsing PCAP. Processed ${processedPackets} out of ${totalPackets} total packets.`);
});
