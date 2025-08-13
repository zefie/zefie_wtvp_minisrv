#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');
const pcap = require('pcap-parser');
const zlib = require('zlib');

// Import our WebTV classes
const WTVSec = require('./includes/classes/WTVSec.js');
const WTVShared = require('./includes/classes/WTVShared.js')['WTVShared'];
const LZPF = require('./includes/classes/LZPF.js');

/**
 * PCAP Packet Parser for WebTV/WTVP Protocol
 * 
 * This tool analyzes pcap files containing WebTV traffic and decrypts
 * both client and server communications using the WTVSec encryption.
 * 
 * Based on analysis of:
 * - client_emu.js - WebTV client simulation
 * - app.js - Main server request processing 
 * - WTVSec.js - Encryption/decryption implementation
 */
class WebTVPcapAnalyzer {
    constructor(options = {}) {
        this.pcapFilePath = options.pcapFile || '../wtv.pcap';
        this.outputFile = options.outputFile || null;
        this.debug = options.debug || false;
        this.verbose = options.verbose || false;
        this.portRange = options.portRange || null;
        
        // WebTV configuration (load from config if available)
        this.wtvshared = new WTVShared();
        this.config = this.loadConfig();
        
        // Track connections and their encryption state
        this.connections = new Map(); // key: "srcIP:srcPort->dstIP:dstPort"
        this.packets = [];
    // Track bidirectional flow state (correlate client/server halves)
    this.flows = new Map(); // key: canonical "ipA:portA<->ipB:portB", value: { initialKey, challenge, observedResp, expectedResp, handshakeComplete }
    this.connections = new Map(); // key: "ip:port->ip:port", value: { wtvsec, incarnation, handshakeVerified }
        
        // Track server initial keys by server IP
        this.serverInitialKeys = new Map(); // key: server IP, value: initial key
        
        // Output buffer
        this.output = [];
        
        this.debugLog('WebTV PCAP Analyzer initialized');
        this.debugLog(`PCAP file: ${this.pcapFilePath}`);
        if (this.portRange) {
            if (this.portRange.min === this.portRange.max) {
                this.debugLog(`Port filter: ${this.portRange.min}`);
            } else {
                this.debugLog(`Port filter: ${this.portRange.min}-${this.portRange.max}`);
            }
        }
        if (this.outputFile) {
            this.debugLog(`Output file: ${this.outputFile}`);
        }
    }

    debugLog(...args) {
        if (this.debug) {
            console.log('[DEBUG]', ...args);
        }
    }

    verboseLog(...args) {
        if (this.verbose || this.debug) {
            console.log('[VERBOSE]', ...args);
        }
    }

    loadConfig() {
        try {
            // Try to load minisrv config for encryption keys
            const configPath = './includes/config.json';
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.debugLog('Loaded minisrv config for encryption keys');
                return config;
            } else {
                // Use WTVShared to get proper config
                try {
                    const config = this.wtvshared.readMiniSrvConfig(true, false);
                    this.debugLog('Loaded config via WTVShared');
                    return config;
                } catch (e) {
                    this.debugLog('Failed to load config via WTVShared:', e.message);
                }
                
                // Default config with standard WebTV keys
                this.debugLog('Using default WebTV encryption configuration');
                return {
                    config: {
                        keys: {
                            // Default WebTV initial shared key (minisrv default)
                            initial_shared_key: "bWluaXNydiE=" // Base64: "minisrv!" - default minisrv key
                        },
                        debug_flags: {
                            debug: this.debug
                        }
                    }
                };
            }
        } catch (error) {
            this.debugLog('Error loading config, using defaults:', error.message);
            return {
                config: {
                    keys: {
                        initial_shared_key: "QUFBQUFBQUE="
                    },
                    debug_flags: {
                        debug: this.debug
                    }
                }
            };
        }
    }

    /**
     * Parse PCAP file using pcap-parser library
     */
    parsePcapFile() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.pcapFilePath)) {
                reject(new Error(`PCAP file not found: ${this.pcapFilePath}`));
                return;
            }

            this.debugLog(`Parsing PCAP file: ${this.pcapFilePath}`);
            const parser = pcap.parse(this.pcapFilePath);
            let packetCount = 0;

            parser.on('packet', (packet) => {
                try {
                    const parsedPacket = this.parsePacket(packet.data, {
                        timestamp: packet.header.timestampSeconds + (packet.header.timestampMicroseconds / 1000000),
                        capturedLen: packet.header.capturedLength,
                        originalLen: packet.header.originalLength,
                        packetNumber: ++packetCount
                    });

                    if (parsedPacket) {
                        // Check for truncated packets
                        if (packet.header.capturedLength < packet.header.originalLength) {
                            this.debugLog(`Truncated packet #${packetCount}: captured ${packet.header.capturedLength}, original ${packet.header.originalLength} bytes`);
                        }
                        this.packets.push(parsedPacket);
                    }
                } catch (error) {
                    this.debugLog(`Error parsing packet #${packetCount}:`, error.message);
                }
            });

            parser.on('end', () => {
                this.debugLog(`Parsed ${this.packets.length} packets from PCAP file`);
                
                // Skip duplicate removal for now to ensure TCP reassembly works properly
                this.debugLog(`Keeping all ${this.packets.length} packets for proper TCP stream reassembly`);
                
                resolve(this.packets);
            });

            parser.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Remove only exact duplicate packets (same timestamp and data)
     */
    removeSmartDuplicatePackets() {
        const uniquePackets = [];
        const duplicateCount = { removed: 0 };
        const seen = new Set();
        
        this.debugLog(`Starting conservative duplicate removal on ${this.packets.length} packets...`);
        
        for (const packet of this.packets) {
            // Create a key based on connection, timestamp, and data hash
            const connectionKey = `${packet.srcIP}:${packet.srcPort}->${packet.dstIP}:${packet.dstPort}`;
            const dataHash = packet.data ? require('crypto').createHash('md5').update(packet.data).digest('hex') : 'empty';
            const packetKey = `${connectionKey}:${packet.timestamp}:${dataHash}`;
            
            if (!seen.has(packetKey)) {
                seen.add(packetKey);
                uniquePackets.push(packet);
            } else {
                duplicateCount.removed++;
                this.debugLog(`Exact duplicate removed: ${connectionKey} at ${packet.timestamp}`);
            }
        }
        
        this.packets = uniquePackets;
        this.debugLog(`Conservative duplicate removal complete: ${duplicateCount.removed} exact duplicates removed`);
    }

    /**
     * Check if two packets are similar enough to be considered duplicates (less strict than before)
     */
    arePacketsSimilar(packet1, packet2) {
        // Same connection endpoints
        if (packet1.srcIP !== packet2.srcIP || packet1.srcPort !== packet2.srcPort ||
            packet1.dstIP !== packet2.dstIP || packet1.dstPort !== packet2.dstPort) {
            return false;
        }
        
        // If data is identical, they're similar regardless of timestamp
        if (this.arePacketDataSame(packet1.data, packet2.data)) {
            const timeDiff = Math.abs(packet1.timestamp - packet2.timestamp);
            return timeDiff < 2.0; // Allow up to 2 seconds difference for retransmissions
        }
        
        return false;
    }

    /**
     * Check if a packet contains important WebTV headers
     */
    packetHasImportantHeaders(packet, importantHeaders) {
        if (!packet.data) return false;
        
        const dataStr = packet.data.toString('utf8', 0, Math.min(packet.data.length, 2048)); // Check first 2KB
        return importantHeaders.some(header => dataStr.includes(header));
    }
    removeDuplicatePackets() {
        const uniquePackets = [];
        const duplicateCount = { total: 0, exact: 0, similar: 0 };
        
        this.debugLog(`Starting comprehensive duplicate removal on ${this.packets.length} packets...`);
        
        for (let i = 0; i < this.packets.length; i++) {
            const currentPacket = this.packets[i];
            let isDuplicate = false;
            
            // Compare with all previously kept packets
            for (let j = 0; j < uniquePackets.length; j++) {
                const existingPacket = uniquePackets[j];
                
                // Check if packets are duplicates using multiple criteria
                if (this.arePacketsDuplicate(currentPacket, existingPacket)) {
                    isDuplicate = true;
                    duplicateCount.total++;
                    
                    // Determine type of duplicate for debugging
                    if (this.arePacketsExactDuplicate(currentPacket, existingPacket)) {
                        duplicateCount.exact++;
                        this.debugLog(`Exact duplicate: ${currentPacket.srcIP}:${currentPacket.srcPort}->${currentPacket.dstIP}:${currentPacket.dstPort} at ${currentPacket.timestamp}`);
                    } else {
                        duplicateCount.similar++;
                        this.debugLog(`Similar duplicate: ${currentPacket.srcIP}:${currentPacket.srcPort}->${currentPacket.dstIP}:${currentPacket.dstPort} at ${currentPacket.timestamp} vs ${existingPacket.timestamp}`);
                    }
                    break;
                }
            }
            
            if (!isDuplicate) {
                uniquePackets.push(currentPacket);
            }
        }
        
        this.packets = uniquePackets;
        this.debugLog(`Duplicate removal complete: ${duplicateCount.total} total duplicates (${duplicateCount.exact} exact, ${duplicateCount.similar} similar)`);
    }

    /**
     * Check if two packets are duplicates using multiple criteria
     */
    arePacketsDuplicate(packet1, packet2) {
        // Same connection endpoints
        if (packet1.srcIP !== packet2.srcIP || packet1.srcPort !== packet2.srcPort ||
            packet1.dstIP !== packet2.dstIP || packet2.dstPort !== packet2.dstPort) {
            return false;
        }
        
        // Exact timestamp match
        if (packet1.timestamp === packet2.timestamp) {
            return this.arePacketDataSame(packet1.data, packet2.data);
        }
        
        // Close timestamps (within 0.001 seconds) with identical data
        const timeDiff = Math.abs(packet1.timestamp - packet2.timestamp);
        if (timeDiff < 0.001) {
            return this.arePacketDataSame(packet1.data, packet2.data);
        }
        
        // Identical data regardless of timestamp (retransmissions)
        if (this.arePacketDataSame(packet1.data, packet2.data)) {
            // Allow some time difference for retransmissions, but not too much
            return timeDiff < 0; // Within 0.5 seconds
        }
        
        return false;
    }

    /**
     * Check if two packets are exact duplicates
     */
    arePacketsExactDuplicate(packet1, packet2) {
        return packet1.timestamp === packet2.timestamp &&
               packet1.srcIP === packet2.srcIP &&
               packet1.srcPort === packet2.srcPort &&
               packet1.dstIP === packet2.dstIP &&
               packet1.dstPort === packet2.dstPort &&
               this.arePacketDataSame(packet1.data, packet2.data);
    }

    /**
     * Compare packet data for equality
     */
    arePacketDataSame(data1, data2) {
        if (!data1 && !data2) return true;
        if (!data1 || !data2) return false;
        if (data1.length !== data2.length) return false;
        
        // Use Buffer.compare for efficient comparison
        return Buffer.compare(data1, data2) === 0;
    }

    /**
     * Parse individual network packet
     */
    parsePacket(data, meta) {
        try {
            // Parse Ethernet header (14 bytes)
            if (data.length < 14) return null;
            
            const etherType = data.readUInt16BE(12);
            
            // Only process IPv4 packets (0x0800)
            if (etherType !== 0x0800) return null;
            
            let offset = 14; // Skip Ethernet header
            
            // Parse IP header
            if (data.length < offset + 20) return null;
            
            const ipVersion = (data[offset] & 0xF0) >> 4;
            const ipHeaderLen = (data[offset] & 0x0F) * 4;
            const protocol = data[offset + 9];
            const srcIP = this.parseIP(data.slice(offset + 12, offset + 16));
            const dstIP = this.parseIP(data.slice(offset + 16, offset + 20));
            
            offset += ipHeaderLen;
            
            // Only process TCP packets (protocol 6)
            if (protocol !== 6) return null;
            
            // Parse TCP header
            if (data.length < offset + 20) return null;
            
            const srcPort = data.readUInt16BE(offset);
            const dstPort = data.readUInt16BE(offset + 2);
            const tcpSeq = data.readUInt32BE(offset + 4);
            const tcpAck = data.readUInt32BE(offset + 8);
            const tcpHeaderLen = ((data[offset + 12] & 0xF0) >> 4) * 4;
            const tcpFlags = data[offset + 13];
            
            offset += tcpHeaderLen;
            
            // Extract payload
            const payload = data.slice(offset);
            
            const packet = {
                ...meta,
                srcIP,
                dstIP,
                srcPort,
                dstPort,
                tcpSeq,
                tcpAck,
                tcpFlags,
                payload,
                payloadLength: payload.length,
                connectionKey: `${srcIP}:${srcPort}->${dstIP}:${dstPort}`
            };

            // Check if this looks like WebTV traffic
            if (this.isWebTVTraffic(packet)) {
                this.verboseLog(`WebTV packet #${packet.packetNumber}: ${packet.connectionKey} (${packet.payloadLength} bytes)`);
                return packet;
            }

            return null;
        } catch (error) {
            this.debugLog(`Error parsing packet:`, error.message);
            return null;
        }
    }

    parseIP(buffer) {
        return `${buffer[0]}.${buffer[1]}.${buffer[2]}.${buffer[3]}`;
    }

    /**
     * Determine if packet contains WebTV/WTVP traffic
     */
    isWebTVTraffic(packet) {
        if (packet.payloadLength === 0) return false;
        
        // If port range is specified, filter by that first
        if (this.portRange) {
            const srcInRange = packet.srcPort >= this.portRange.min && packet.srcPort <= this.portRange.max;
            const dstInRange = packet.dstPort >= this.portRange.min && packet.dstPort <= this.portRange.max;
            
            if (!srcInRange && !dstInRange) {
                return false; // Neither port is in the specified range
            }
        } else {
            // Check for common WebTV ports (these may vary)
            const webtvPorts = [1515, 1501, 1601, 1615];
            if (!webtvPorts.includes(packet.srcPort) && !webtvPorts.includes(packet.dstPort)) {
                // If no specific ports match, check payload for WebTV signatures
                const payloadStr = packet.payload.toString('ascii', 0, Math.min(200, packet.payload.length));
                
                // Look for WTVP protocol markers
                const webtvSignatures = [
                    'wtv-',
                    'GET wtv-',
                    'POST wtv-',
                    'SECURE ON',
                    'wtv-client-serial-number',
                    'wtv-incarnation',
                    'wtv-challenge',
                    'WebTV',
                    'Mozilla/4.0 WebTV'
                ];

                return webtvSignatures.some(sig => payloadStr.includes(sig));
            }
        }

        return true;
    }

    /**
     * Process all packets and extract WebTV communications
     */
    analyzeTraffic() {
        this.output.push('='.repeat(80));
        this.output.push('WebTV PCAP Analysis Report');
        this.output.push(`Generated: ${new Date().toISOString()}`);
        this.output.push(`PCAP File: ${this.pcapFilePath}`);
        this.output.push('='.repeat(80));
        this.output.push('');

        // Sort packets by timestamp first, then by WebTV protocol flow for identical timestamps
        this.packets.sort((a, b) => {
            // Primary sort: timestamp
            const timeDiff = a.timestamp - b.timestamp;
            if (timeDiff !== 0) {
                return timeDiff;
            }
            
            // Secondary sort: WebTV protocol flow sequence (for identical timestamps)
            const aFlowOrder = this.getWebTVFlowOrder(a);
            const bFlowOrder = this.getWebTVFlowOrder(b);
            
            if (aFlowOrder !== bFlowOrder) {
                return aFlowOrder - bFlowOrder; // Lower order = earlier in flow
            }
            
            // Tertiary sort: WebTV port priority (for identical timestamps)
            const aPriority = this.getWebTVPortPriority(a.srcPort, a.dstPort);
            const bPriority = this.getWebTVPortPriority(b.srcPort, b.dstPort);
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority; // Lower priority number = higher precedence
            }
            
            // Quaternary sort: incarnation number (lower incarnation = earlier)
            const aIncarnation = this.getPacketIncarnation(a);
            const bIncarnation = this.getPacketIncarnation(b);
            
            if (aIncarnation !== bIncarnation) {
                return aIncarnation - bIncarnation;
            }
            
            // Quinary sort: connection direction (server→client FIRST to ensure challenges come before responses)
            const aIsServerToClient = this.isServerToClient(`${a.srcIP}:${a.srcPort}->${a.dstIP}:${a.dstPort}`);
            const bIsServerToClient = this.isServerToClient(`${b.srcIP}:${b.srcPort}->${b.dstIP}:${b.dstPort}`);
            
            // Server→Client packets should come BEFORE Client→Server packets
            if (aIsServerToClient && !bIsServerToClient) return -1;
            if (!aIsServerToClient && bIsServerToClient) return 1;
            
            // Senary sort: sequence number if available (for TCP ordering within same direction)
            if (a.seq !== undefined && b.seq !== undefined) {
                return a.seq - b.seq;
            }
            
            return 0;
        });
        this.debugLog(`Sorted ${this.packets.length} packets by timestamp, WebTV protocol flow, port priority, incarnation, and direction`);

        // Group packets by connection
        const connectionGroups = new Map();
        
        for (const packet of this.packets) {
            const key = packet.connectionKey;
            if (!connectionGroups.has(key)) {
                connectionGroups.set(key, []);
            }
            connectionGroups.get(key).push(packet);
        }

        // Create bidirectional flows by merging client→server and server→client streams
        const bidirectionalFlows = this.createBidirectionalFlows(connectionGroups);

        // Sort flows by chronological order (timestamp of first packet)
        const sortedFlows = Array.from(bidirectionalFlows.entries()).sort((a, b) => {
            const [keyA, flowA] = a;
            const [keyB, flowB] = b;
            
            // Find the earliest timestamp across both directions
            const allPacketsA = [...flowA.clientToServer, ...flowA.serverToClient];
            const allPacketsB = [...flowB.clientToServer, ...flowB.serverToClient];
            
            const earliestA = Math.min(...allPacketsA.map(p => p.timestamp));
            const earliestB = Math.min(...allPacketsB.map(p => p.timestamp));
            
            return earliestA - earliestB;
        });

        // Convert back to Map with sorted order
        const sortedBidirectionalFlows = new Map(sortedFlows);

        this.output.push(`Found ${sortedBidirectionalFlows.size} WebTV bidirectional flows (sorted chronologically):`);
        
        // Show flow summary
        for (const [flowKey, flow] of sortedBidirectionalFlows) {
            const totalPackets = flow.clientToServer.length + flow.serverToClient.length;
            const totalBytes = [...flow.clientToServer, ...flow.serverToClient].reduce((sum, p) => sum + p.payloadLength, 0);
            const allPackets = [...flow.clientToServer, ...flow.serverToClient];
            const firstTimestamp = Math.min(...allPackets.map(p => p.timestamp));
            const timeStr = new Date(firstTimestamp * 1000).toISOString();
            this.output.push(`  ${flowKey}: ${totalPackets} packets (${flow.clientToServer.length}→${flow.serverToClient.length}), ${totalBytes} bytes (started: ${timeStr})`);
        }
        this.output.push('');

        // Process packets chronologically across all connections for proper challenge/response correlation
        this.output.push('Processing packets in chronological order for challenge/response correlation:');
        this.output.push('');
        
        let messageCount = 0;
        for (const packet of this.packets) {
            if (packet.payloadLength === 0) continue;
            
            // Get or create connection state
            const connectionKey = packet.connectionKey;
            if (!this.connections.has(connectionKey)) {
                const connection = {
                    key: connectionKey,
                    wtvsec: null,
                    encryptionEnabled: false,
                    incarnation: 1,
                    challenge: null,
                    initialKey: null,
                    expectedChallengeResponseB64: null,
                    observedChallengeResponseB64: null,
                    challengeMatch: null,
                    serverToClient: this.isServerToClient(connectionKey),
                    dataBuffer: Buffer.alloc(0),
                    streamData: Buffer.alloc(0),
                    secureOnSeen: false,
                    streamBuffer: Buffer.alloc(0)  // Add stream buffer for TCP reassembly
                };
                
                // WTVSec instance will be created when we process the incarnation header
                const isClientToServer = this.isConnectionToWebTVServer(connectionKey);
                if (isClientToServer) {
                    this.debugLog(`Will create WTVSec instance when incarnation is detected for: ${connectionKey}`);
                } else {
                    this.debugLog(`Skipping WTVSec creation for server->client connection: ${connectionKey}`);
                }
                
                this.connections.set(connectionKey, connection);
            }
            
            const connection = this.connections.get(connectionKey);
            
            // Proper TCP stream reassembly with buffering
            connection.streamBuffer = Buffer.concat([connection.streamBuffer, packet.payload]);
            
            // Try to extract complete messages
            const extractedMessages = this.extractMessages(connection.streamBuffer);
            if (extractedMessages.messages.length > 0) {
                for (const message of extractedMessages.messages) {
                    const messageStr = message.toString('utf8');
                    this.verboseLog(`Processing reassembled message from ${connectionKey} (${message.length} bytes)`);
                    
                    // Parse headers and extract WebTV info from complete message
                    const lines = messageStr.split('\r\n');
                    const headerEndIndex = lines.findIndex(line => line === '');
                    const headers = headerEndIndex >= 0 ? lines.slice(0, headerEndIndex) : lines;
                    
                    // Process headers for handshake info
                    const wtvInfo = this.extractWebTVInfo(messageStr, connection);
                    if (wtvInfo) {
                        this.processWebTVHandshakeInfo(wtvInfo, connection, messageStr);
                    }
                    
                    // Now process the complete message for decryption
                    this.processStreamData(message, connection, ++messageCount);
                }
                connection.streamBuffer = extractedMessages.remainder;
            }
        }

        // Process each flow for detailed analysis
        let flowNumber = 0;
        for (const [flowKey, flow] of sortedBidirectionalFlows) {
            this.output.push(`\n${'='.repeat(80)}`);
            this.output.push(`BIDIRECTIONAL FLOW ${++flowNumber} of ${sortedBidirectionalFlows.size}`);
            this.output.push(`${'='.repeat(80)}`);
            this.analyzeBidirectionalFlow(flowKey, flow);
        }

        // Add summary
        this.addFlowAnalysisSummary(sortedBidirectionalFlows);

        return this.output.join('\n');
    }

    /**
     * Create bidirectional flows by merging client→server and server→client streams
     */
    createBidirectionalFlows(connectionGroups) {
        const flows = new Map();
        
        for (const [connectionKey, packets] of connectionGroups) {
            // Parse connection key to get endpoints
            const match = connectionKey.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)->(\d+\.\d+\.\d+\.\d+):(\d+)$/);
            if (!match) continue;
            
            const [, srcIP, srcPort, dstIP, dstPort] = match;
            
            // Create canonical flow key (always sort endpoints alphabetically for consistency)
            const endpoint1 = `${srcIP}:${srcPort}`;
            const endpoint2 = `${dstIP}:${dstPort}`;
            const flowKey = endpoint1 < endpoint2 ? `${endpoint1}<->${endpoint2}` : `${endpoint2}<->${endpoint1}`;
            
            // Initialize flow if not exists
            if (!flows.has(flowKey)) {
                flows.set(flowKey, {
                    clientToServer: [],
                    serverToClient: [],
                    endpoints: { endpoint1, endpoint2 }
                });
            }
            
            const flow = flows.get(flowKey);
            
            // Determine direction based on port numbers (WebTV server ports are in our range)
            const isClientToServer = this.isConnectionToWebTVServer(connectionKey);
            
            if (isClientToServer) {
                flow.clientToServer.push(...packets);
            } else {
                flow.serverToClient.push(...packets);
            }
        }
        
        return flows;
    }

    /**
     * Analyze a bidirectional flow (both client→server and server→client)
     */
    analyzeBidirectionalFlow(flowKey, flow) {
        this.output.push('-'.repeat(60));
        this.output.push(`Bidirectional Flow: ${flowKey}`);
        this.output.push(`Client→Server packets: ${flow.clientToServer.length}`);
        this.output.push(`Server→Client packets: ${flow.serverToClient.length}`);
        this.output.push('-'.repeat(60));

        // Process client→server stream
        if (flow.clientToServer.length > 0) {
            this.output.push(`\nClient→Server Stream:`);
            
            // Find the existing connection for client→server direction
            const clientToServerKey = flow.clientToServer[0].connectionKey;
            let clientConnection = this.connections.get(clientToServerKey);
            
            if (!clientConnection) {
                // Create new connection if it doesn't exist (shouldn't happen)
                clientConnection = {
                    key: clientToServerKey,
                    wtvsec: null,
                    encryptionEnabled: false,
                    incarnation: 1,
                    challenge: null,
                    initialKey: null,
                    expectedChallengeResponseB64: null,
                    observedChallengeResponseB64: null,
                    challengeMatch: null,
                    serverToClient: this.isServerToClient(clientToServerKey),
                    dataBuffer: Buffer.alloc(0),
                    streamData: Buffer.alloc(0),
                    secureOnSeen: false
                };
                this.connections.set(clientToServerKey, clientConnection);
            }
            
            this.reconstructTCPStream(flow.clientToServer, clientConnection);
        }

        // Process server→client stream
        if (flow.serverToClient.length > 0) {
            this.output.push(`\nServer→Client Stream:`);
            
            // Find the existing connection for server→client direction
            const serverToClientKey = flow.serverToClient[0].connectionKey;
            let serverConnection = this.connections.get(serverToClientKey);
            
            if (!serverConnection) {
                // Create new connection if it doesn't exist
                serverConnection = {
                    key: serverToClientKey,
                    wtvsec: null,
                    encryptionEnabled: false,
                    incarnation: 1,
                    challenge: null,
                    initialKey: null,
                    expectedChallengeResponseB64: null,
                    observedChallengeResponseB64: null,
                    challengeMatch: null,
                    serverToClient: this.isServerToClient(serverToClientKey),
                    dataBuffer: Buffer.alloc(0),
                    streamData: Buffer.alloc(0),
                    secureOnSeen: false
                };
                this.connections.set(serverToClientKey, serverConnection);
            }
            
            // Server→client connections should use the WTVSec instance from their corresponding client→server connection
            if (!serverConnection.wtvsec && flow.clientToServer.length > 0) {
                const clientToServerKey = flow.clientToServer[0].connectionKey;
                const clientConnection = this.connections.get(clientToServerKey);
                if (clientConnection && clientConnection.wtvsec) {
                    serverConnection.wtvsec = clientConnection.wtvsec;
                    serverConnection.encryptionEnabled = clientConnection.encryptionEnabled;
                    serverConnection.incarnation = clientConnection.incarnation;
                    this.debugLog(`Shared WTVSec instance from ${clientToServerKey} to ${serverToClientKey}`);
                }
            }
            
            this.reconstructTCPStream(flow.serverToClient, serverConnection);
        }

        this.output.push('');
    }

    /**
     * Add bidirectional flow analysis summary
     */
    addFlowAnalysisSummary(flows) {
        this.output.push('\n' + '='.repeat(80));
        this.output.push('FLOW ANALYSIS SUMMARY');
        this.output.push('='.repeat(80));

        const totalFlows = flows.size;
        let encryptedFlows = 0;
        let challengesSeen = 0;
        let secureOnSeen = 0;

        for (const connection of this.connections.values()) {
            if (connection.encryptionEnabled) encryptedFlows++;
            if (connection.challenge) challengesSeen++;
            if (connection.secureOnSeen) secureOnSeen++;
        }

        this.output.push(`Total WebTV bidirectional flows: ${totalFlows}`);
        this.output.push(`Flows with encryption: ${encryptedFlows}`);
        this.output.push(`wtv-challenge headers seen: ${challengesSeen}`);
        this.output.push(`SECURE ON commands seen: ${secureOnSeen}`);
        this.output.push('');
    }

    /**
     * Add analysis summary
     */
    addAnalysisSummary(connectionGroups) {
        this.output.push('\n' + '='.repeat(80));
        this.output.push('ANALYSIS SUMMARY');
        this.output.push('='.repeat(80));

        const totalConnections = connectionGroups.size;
        let encryptedConnections = 0;
        let challengesSeen = 0;
        let secureOnSeen = 0;

        for (const connection of this.connections.values()) {
            if (connection.encryptionEnabled) encryptedConnections++;
            if (connection.challenge) challengesSeen++;
            if (connection.secureOnSeen) secureOnSeen++;
        }

        this.output.push(`Total WebTV connections: ${totalConnections}`);
        this.output.push(`Connections with encryption: ${encryptedConnections}`);
        this.output.push(`wtv-challenge headers seen: ${challengesSeen}`);
        this.output.push(`SECURE ON commands seen: ${secureOnSeen}`);
        this.output.push('');

        if (encryptedConnections === 0) {
            this.output.push('NOTE: No encrypted connections detected. This may be:');
            this.output.push('  - A capture of unencrypted WebTV traffic');
            this.output.push('  - Missing the encryption handshake packets');
            this.output.push('  - Not actually WebTV/WTVP protocol traffic');
        } else if (challengesSeen === 0) {
            this.output.push('WARNING: Encrypted connections found but no challenges detected.');
            this.output.push('Decryption may not work without the proper challenge/response handshake.');
        }

        this.output.push('');
        this.output.push('For questions about this analysis, refer to:');
        this.output.push('  - client_emu.js: WebTV client implementation');
        this.output.push('  - app.js: Server-side request processing');
        this.output.push('  - WTVSec.js: Encryption/decryption implementation');
    }

    /**
     * Analyze a single TCP connection for WebTV traffic
     */
    analyzeConnection(connectionKey, packets) {
        this.output.push('-'.repeat(60));
        this.output.push(`Connection: ${connectionKey}`);
        this.output.push(`Packets: ${packets.length}`);
        this.output.push('-'.repeat(60));

        // Sort packets by sequence number for proper ordering
        packets.sort((a, b) => a.tcpSeq - b.tcpSeq);

        // Initialize connection state
        const connection = {
            key: connectionKey,
            wtvsec: null,
            encryptionEnabled: false,
            incarnation: 1,
            challenge: null,
            initialKey: null,
            expectedChallengeResponseB64: null,
            observedChallengeResponseB64: null,
            challengeMatch: null,
            serverToClient: this.isServerToClient(connectionKey),
            dataBuffer: Buffer.alloc(0),
            streamData: Buffer.alloc(0),
            secureOnSeen: false
        };

        this.connections.set(connectionKey, connection);

        // Reconstruct TCP streams
        this.reconstructTCPStream(packets, connection);

        this.output.push('');
    }

    /**
     * Check if a connection is from client to WebTV server (dest port in range)
     */
    isConnectionToWebTVServer(connectionKey) {
        // Extract IPs and ports from connection key format "srcIP:srcPort->dstIP:dstPort"
        const match = connectionKey.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)->(\d+\.\d+\.\d+\.\d+):(\d+)$/);
        if (match) {
            const srcPort = parseInt(match[2]);
            const dstPort = parseInt(match[4]);
            
            // Check if destination port is in our WebTV port range AND source port is NOT in range
            // This ensures we only create WTVSec for actual client->server connections
            if (this.portRange) {
                const dstInRange = dstPort >= this.portRange.min && dstPort <= this.portRange.max;
                const srcInRange = srcPort >= this.portRange.min && srcPort <= this.portRange.max;
                
                // True only if destination is WebTV server port and source is NOT a WebTV server port
                return dstInRange && !srcInRange;
            }
        }
        return false;
    }

    /**
     * Check if this is a connection TO a WebTV server (client->server)
     */
    isConnectionToWebTVServer(connectionKey) {
        // Extract IPs and ports from connection key format "srcIP:srcPort->dstIP:dstPort"
        const match = connectionKey.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)->(\d+\.\d+\.\d+\.\d+):(\d+)$/);
        if (match) {
            const dstPort = parseInt(match[4]);
            
            // Check if destination port is in our WebTV port range
            if (this.portRange) {
                return dstPort >= this.portRange.min && dstPort <= this.portRange.max;
            }
        }
        return false;
    }

    /**
     * Get WebTV protocol flow order for packets based on URL sequence
     */
    getWebTVFlowOrder(packet) {
        try {
            if (!packet.data || packet.data.length === 0) {
                return 1000; // Default order for packets without data
            }
            
            const dataStr = packet.data.toString('utf8');
            
            // Look for URLs in various headers
            const getMatch = dataStr.match(/GET\s+([^\s]+)/);
            const refererMatch = dataStr.match(/referer:\s*([^\r\n]+)/i);
            const wtvVisitMatch = dataStr.match(/wtv-visit:\s*([^\r\n]+)/i);
            const locationMatch = dataStr.match(/location:\s*([^\r\n]+)/i);
            
            let url = null;
            let referer = null;
            
            if (getMatch) url = getMatch[1];
            if (refererMatch) referer = refererMatch[1];
            
            // Assign flow order based on WebTV protocol sequence
            if (url) {
                // Client requests - ordered by protocol flow
                if (url.includes('wtv-1800:/preregister')) return 10;
                if (url.includes('wtv-1800:/finish-prereg')) return 20;
                if (url.includes('wtv-head-waiter:/login')) return 30;
                if (url.includes('wtv-head-waiter:/login-stage-two')) return 40;
                if (url.includes('wtv-head-waiter:/check-tellyscript')) return 50;
                if (url.includes('wtv-home:/home')) return 60;
                if (url.includes('wtv-setup:')) return 70;
                if (url.includes('wtv-mail:')) return 80;
                if (url.includes('wtv-disk:')) return 90;
                if (url.includes('wtv-news:')) return 100;
                if (url.includes('wtv-guide:')) return 110;
                if (url.includes('wtv-tricks:')) return 120;
                
                // If referer exists, try to sequence based on that
                if (referer) {
                    if (referer.includes('wtv-1800:/preregister')) return 25;
                    if (referer.includes('wtv-head-waiter:/login')) return 35;
                    if (referer.includes('wtv-head-waiter:/login-stage-two')) return 45;
                    if (referer.includes('wtv-home:/home')) return 65;
                }
            }
            
            // Server responses - should come after corresponding requests
            if (wtvVisitMatch || locationMatch) {
                const visitUrl = wtvVisitMatch ? wtvVisitMatch[1] : locationMatch[1];
                if (visitUrl.includes('wtv-head-waiter:/login')) return 31;
                if (visitUrl.includes('wtv-head-waiter:/login-stage-two')) return 41;
                if (visitUrl.includes('wtv-home:/home')) return 61;
                return 500; // Other server responses
            }
            
            // Check for response status codes
            if (dataStr.includes('200 OK') || dataStr.includes('HTTP/')) {
                return 400; // Server responses without specific URLs
            }
            
            // Check for SECURE ON (encrypted client requests)
            if (dataStr.includes('SECURE ON')) {
                return 200; // Encrypted requests come after initial handshake
            }
            
            return 1000; // Default order for unrecognized packets
            
        } catch (error) {
            return 1000; // Default on error
        }
    }

    /**
     * Get incarnation number from packet headers for sorting
     */
    getPacketIncarnation(packet) {
        // Parse the packet data to look for wtv-incarnation header
        try {
            if (packet.data && packet.data.length > 0) {
                const dataStr = packet.data.toString('utf8');
                const incarnationMatch = dataStr.match(/wtv-incarnation:\s*(\d+)/i);
                if (incarnationMatch) {
                    return parseInt(incarnationMatch[1]);
                }
            }
            return 0; // Default incarnation if not found
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get WebTV port priority for sorting packets with identical timestamps
     */
    getWebTVPortPriority(srcPort, dstPort) {
        // Determine which port is the WebTV service port
        let servicePort = null;
        
        // Check if either port matches our filter range
        if (this.portFilter) {
            const [minPort, maxPort] = this.portFilter.split('-').map(Number);
            if (srcPort >= minPort && srcPort <= maxPort) {
                servicePort = srcPort;
            } else if (dstPort >= minPort && dstPort <= maxPort) {
                servicePort = dstPort;
            }
        }
        
        if (!servicePort) {
            return 999; // No priority if not a WebTV service port
        }
        
        // Get the last two digits to determine priority
        const lastTwoDigits = servicePort % 100;
        
        // Priority based on last two digits:
        // 15 (1515, 1615, etc.) = Priority 1 (highest)
        // 01 (1501, 1601, etc.) = Priority 2
        // 12 (1512, 1612, etc.) = Priority 3
        // Others = Priority 4+ (lower)
        switch (lastTwoDigits) {
            case 15: return 1;
            case 1:  return 2;
            case 12: return 3;
            default: return 4;
        }
    }

    /**
     * Determine connection direction based on port numbers
     */
    isServerToClient(connectionKey) {
        // Extract IPs and ports from connection key format "srcIP:srcPort->dstIP:dstPort"
        const match = connectionKey.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)->(\d+\.\d+\.\d+\.\d+):(\d+)$/);
        if (match) {
            const srcPort = parseInt(match[2]);
            const dstPort = parseInt(match[4]);
            
            // Simple logic: if destination port is in our port range, it's client->server
            // If source port is in our port range, it's server->client
            const isPortInRange = (port) => {
                if (!this.portRange) return false;
                return port >= this.portRange.min && port <= this.portRange.max;
            };
            
            if (isPortInRange(dstPort)) {
                return false; // CLIENT → SERVER (destination is server port)
            } else if (isPortInRange(srcPort)) {
                return true;  // SERVER → CLIENT (source is server port)
            }
            
            // Fallback to original logic if ports aren't in our target range
            const srcIsServer = srcPort < 32768;
            const dstIsClient = dstPort >= 32768;
            return srcIsServer || dstIsClient;
        }
        return false;
    }

    /**
     * Reconstruct TCP stream from packets
     */
    reconstructTCPStream(packets, connection) {
        let streamBuffer = Buffer.alloc(0);
        let expectedSeq = null;
        let messageCount = 0;

        this.debugLog(`Reconstructing TCP stream for ${connection.key} with ${packets.length} packets`);

        for (const packet of packets) {
            if (packet.payloadLength === 0) continue;

            this.debugLog(`Processing packet seq=${packet.tcpSeq}, len=${packet.payloadLength}, expected=${expectedSeq}`);

            // Initialize expected sequence number
            if (expectedSeq === null) {
                expectedSeq = packet.tcpSeq + packet.payloadLength;
            }

            // Check for out-of-order packets
            if (packet.tcpSeq !== expectedSeq && streamBuffer.length > 0) {
                this.debugLog(`Out-of-order packet detected, processing accumulated data first`);
                // Process accumulated data before handling out-of-order packet
                this.processStreamData(streamBuffer, connection, ++messageCount);
                streamBuffer = Buffer.alloc(0);
            }

            // Accumulate packet data
            streamBuffer = Buffer.concat([streamBuffer, packet.payload]);
            expectedSeq = packet.tcpSeq + packet.payloadLength;

            this.debugLog(`Stream buffer now ${streamBuffer.length} bytes after adding packet`);

        // Try to extract complete messages
        const extractedMessages = this.extractMessages(streamBuffer);
            this.debugLog(`Extracted ${extractedMessages.messages.length} messages, remainder: ${extractedMessages.remainder.length} bytes`);
            
            if (extractedMessages.messages.length > 0) {
                for (const message of extractedMessages.messages) {
            this.processStreamData(message, connection, ++messageCount);
                }
                streamBuffer = extractedMessages.remainder;
            }
        }

        // Process any remaining data
        if (streamBuffer.length > 0) {
            this.debugLog(`Processing remaining buffer of ${streamBuffer.length} bytes`);
            this.processStreamData(streamBuffer, connection, ++messageCount);
        }
    }

    /**
     * Extract complete WebTV messages from stream buffer
     */
    extractMessages(buffer) {
        const messages = [];
        let offset = 0;

        while (offset < buffer.length) {
            // Look for HTTP-style headers ending with \r\n\r\n or \n\n
            const crlfcrlf = buffer.indexOf('\r\n\r\n', offset);
            const lflf = buffer.indexOf('\n\n', offset);
            
            let headerEnd = -1;
            let headerSep = 0;
            
            if (crlfcrlf !== -1 && (lflf === -1 || crlfcrlf < lflf)) {
                headerEnd = crlfcrlf;
                headerSep = 4;
            } else if (lflf !== -1) {
                headerEnd = lflf;
                headerSep = 2;
            }

            if (headerEnd === -1) {
                // No complete headers found
                break;
            }

            const headerData = buffer.slice(offset, headerEnd);
            const headerText = headerData.toString('utf8');
            
            // Parse Content-Length if present
            const contentLengthMatch = headerText.match(/content-length:\s*(\d+)/i);
            let contentLength = 0;
            
            if (contentLengthMatch) {
                contentLength = parseInt(contentLengthMatch[1]);
            }

            const messageStart = offset;
            const bodyStart = headerEnd + headerSep;

            // Special handling: when wtv-lzpf: 0 is present, Content-Length reflects the
            // uncompressed size, not the on-the-wire compressed size. In that case, do not
            // trust Content-Length to find message boundaries. Instead, heuristically find
            // the start of the next header block and use that as the end of this message.
            const isLZPF = /wtv-lzpf:\s*0/i.test(headerText);

            if (isLZPF) {
                const nextHeaderIdx = this.findNextHeaderStart(buffer, bodyStart);
                if (nextHeaderIdx !== -1) {
                    const message = buffer.slice(messageStart, nextHeaderIdx);
                    messages.push(message);
                    offset = nextHeaderIdx;
                } else {
                    // No next header found; consume the rest of the buffer as a message
                    const message = buffer.slice(messageStart);
                    messages.push(message);
                    offset = buffer.length;
                    break;
                }
                continue;
            }

            const messageEnd = bodyStart + contentLength;

            // Check if we have complete message
            if (messageEnd <= buffer.length) {
                const message = buffer.slice(messageStart, messageEnd);
                messages.push(message);
                offset = messageEnd;
            } else {
                // Incomplete message
                break;
            }
        }

        return {
            messages,
            remainder: buffer.slice(offset)
        };
    }

    /**
     * Heuristically find the start index of the next plaintext header block
     * following an (encrypted) body. This scans for common request/response
     * line starters like "200 OK", "GET ", "POST ", or "SECURE ON" after
     * the given start index. Returns the absolute index in the buffer of the
     * beginning of the next header line, or -1 if not found.
     */
    findNextHeaderStart(buffer, startIndex) {
        // Candidate patterns (as Buffers) we expect at the start of a header line
        const patterns = [
            Buffer.from('\r\n200 OK', 'utf8'),
            Buffer.from('\n200 OK', 'utf8'),
            Buffer.from('200 OK', 'utf8'),
            Buffer.from('\r\nGET ', 'utf8'),
            Buffer.from('\nGET ', 'utf8'),
            Buffer.from('GET ', 'utf8'),
            Buffer.from('\r\nPOST ', 'utf8'),
            Buffer.from('\nPOST ', 'utf8'),
            Buffer.from('POST ', 'utf8'),
            Buffer.from('\r\nSECURE ON', 'utf8'),
            Buffer.from('\nSECURE ON', 'utf8'),
            Buffer.from('SECURE ON', 'utf8'),
        ];

        let earliest = -1;
        for (const pat of patterns) {
            const idx = buffer.indexOf(pat, startIndex);
            if (idx !== -1) {
                if (earliest === -1 || idx < earliest) {
                    // If pattern includes CR/LF at the start, back up to the next char after them
                    if (pat[0] === 0x0d || pat[0] === 0x0a) {
                        // Move to the first character after CRLF/LF
                        let pos = idx;
                        while (pos < buffer.length && (buffer[pos] === 0x0d || buffer[pos] === 0x0a)) pos++;
                        earliest = pos;
                    } else {
                        earliest = idx;
                    }
                }
            }
        }
        return earliest;
    }

    /**
     * Process WebTV handshake information from complete messages
     */
    processWebTVHandshakeInfo(wtvInfo, connection, messageStr) {
        // Handle initial key
        if (wtvInfo.initialKey) {
            connection.initialKey = wtvInfo.initialKey;
            this.debugLog(`Set initialKey for ${connection.key}: ${wtvInfo.initialKey}`);
        }
        
        // Handle challenge
        if (wtvInfo.challenge) {
            connection.challenge = wtvInfo.challenge;
            this.debugLog(`Set challenge for ${connection.key}: ${wtvInfo.challenge}`);
        }
        
        // Handle incarnation and create WTVSec if needed
        if (wtvInfo.incarnation !== undefined) {
            connection.incarnation = wtvInfo.incarnation;
            this.debugLog(`Set incarnation for ${connection.key}: ${wtvInfo.incarnation}`);
            
            // Create WTVSec instance for client->server connections when incarnation is known
            const isClientToServer = this.isConnectionToWebTVServer(connection.key);
            if (isClientToServer && !connection.wtvsec && connection.initialKey) {
                this.debugLog(`Creating WTVSec instance for ${connection.key} with incarnation ${wtvInfo.incarnation}`);
                connection.wtvsec = new this.WTVSec(this.WTVSec.makeChallengeKeyFromString(connection.initialKey, wtvInfo.incarnation));
            }
        }
        
        // Handle challenge response
        if (wtvInfo.challengeResponse) {
            connection.observedChallengeResponseB64 = wtvInfo.challengeResponse;
            this.debugLog(`Set challengeResponse for ${connection.key}: ${wtvInfo.challengeResponse}`);
        }
        
        // Verify handshake if we have all required components
        if (connection.challenge && connection.initialKey && connection.incarnation !== undefined && !connection.challengeMatch) {
            this.verifyHandshake(connection, wtvInfo);
        }
    }

    /**
     * Process reconstructed stream data
     */
    processStreamData(data, connection, messageNumber) {
        const timestamp = new Date().toISOString(); // Could track actual timestamps
        const direction = connection.serverToClient ? 'SERVER → CLIENT' : 'CLIENT → SERVER';
        
        this.output.push(`[${timestamp}] Message #${messageNumber} (${direction})`);
        this.output.push(`  Length: ${data.length} bytes`);

        try {
            // Quick peek for SECURE ON without consuming full buffer
            const peek = data.toString('utf8', 0, Math.min(200, data.length));
            if (peek.includes('SECURE ON')) {
                this.output.push(`  [*] SECURE ON detected - encryption starting`);
                connection.secureOnSeen = true;
                connection.encryptionEnabled = true;
                this.ensureSecureOn(connection);
            }

            // Prefer buffer-based header/body split to avoid corrupting encrypted bytes
            const split = this.splitHeadersAndBody(data);
            if (split) {
                if (split.leadingBuffer && split.leadingBuffer.length > 0) {
                    this.output.push(`  Note: ${split.leadingBuffer.length} leading encrypted/unknown bytes before header`);
                }
                this.processWebTVMessageBuffer(split.headerText, split.bodyBuffer, connection, direction);
            } else if (connection.encryptionEnabled) {
                this.processEncryptedData(data, connection, direction);
            } else {
                // Binary or unknown data
                this.output.push(`  Raw data: ${data.slice(0, 100).toString('hex')}${data.length > 100 ? '...' : ''}`);
            }
        } catch (error) {
            this.debugLog(`Error processing message #${messageNumber}:`, error.message);
            this.output.push(`  Error processing message: ${error.message}`);
        }

        this.output.push('');
    }

    /**
     * Process complete WebTV message (headers + body)
     */
    processWebTVMessage(text, connection, direction) {
        this.output.push(`  WebTV Message (${direction}):`);
        
        // Split headers and body
        const headerBodySplit = text.includes('\r\n\r\n') ? '\r\n\r\n' : '\n\n';
        const parts = text.split(headerBodySplit, 2);
        const headerText = parts[0];
        const bodyText = parts[1] || '';
        
        const lines = headerText.split(/\r?\n/);
        const headers = {};
        
        // Debug: Check if headerText contains incarnation data
        if (headerText.includes('wtv-incarnation')) {
            this.debugLog(`Raw header text contains incarnation: ${headerText.length} chars`);
            const incarnationIndex = headerText.indexOf('wtv-incarnation');
            const contextStart = Math.max(0, incarnationIndex - 20);
            const contextEnd = Math.min(headerText.length, incarnationIndex + 50);
            const context = headerText.slice(contextStart, contextEnd);
            this.debugLog(`Context around incarnation: "${context}"`);
            this.debugLog(`Context bytes: ${Buffer.from(context, 'utf8').toString('hex')}`);
        }
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            if (i === 0) {
                // Request/response line
                this.output.push(`    ${line}`);
                headers.requestLine = line;
            } else {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.slice(0, colonIndex).toLowerCase();
                    const value = line.slice(colonIndex + 1).trim();
                    
                    // Debug incarnation header parsing
                    if (key === 'wtv-incarnation') {
                        this.debugLog(`Raw incarnation line: "${line}" (length: ${line.length})`);
                        this.debugLog(`Key: "${key}", Value: "${value}" (length: ${value.length})`);
                        
                        // Show raw bytes around this line
                        const lineBytes = Buffer.from(line, 'utf8');
                        this.debugLog(`Raw bytes: ${lineBytes.toString('hex')}`);
                        
                        // If we think this should be incarnation 10, let's see if we can find it in the raw data
                        if (value === '') {
                            this.debugLog(`Expected incarnation but got empty value - checking for truncation`);
                        }
                    }
                    
                    headers[key] = value;
                    this.output.push(`    ${key}: ${value}`);
                }
            }
        }

        // Extract WebTV-specific information
        this.extractWebTVInfo(headers, connection);

    // Display body if present
        if (bodyText.length > 0) {
            // Check if this is a proprietary format that should not be decrypted
            const bodyBuffer = Buffer.from(bodyText, 'binary');
            const isProprietary = headers['wtv-initial-key'] && 
                (bodyText.startsWith('ANDY') || 
                 bodyBuffer.subarray(0, 4).toString() === 'ANDY' ||
                 bodyBuffer.subarray(0, 4).equals(Buffer.from([0x41, 0x4e, 0x44, 0x59])));
            
            if (isProprietary) {
                this.output.push(`  Body (${bodyText.length} bytes): [PROPRIETARY FORMAT - NOT ENCRYPTED]`);
                // Show a preview of the proprietary data
                const previewText = bodyText.slice(0, 100).replace(/[\x00-\x1f\x7f-\xff]/g, '∩┐╜');
                this.output.push(`    ${previewText}${bodyText.length > 100 ? '...' : ''}`);
            } else if (headers['wtv-encrypted'] === 'true' && connection.wtvsec) {
                // Handle encrypted body - decrypt first, then decompress
                this.output.push(`  Body (${bodyText.length} bytes):`);
                
                try {
            // WARNING: This path receives body as UTF-8 text and can corrupt bytes.
            // Prefer buffer-based processing via processWebTVMessageBuffer().
            const bodyBuffer = Buffer.from(bodyText, 'latin1');
                    this.ensureSecureOn(connection);
                    const keyNum = connection.serverToClient ? 1 : 0;
                    this.debugLog(`Decrypting body with key ${keyNum} (${bodyBuffer.length} bytes)`);
                    const decrypted = connection.wtvsec.Decrypt(keyNum, bodyBuffer);
                    const decryptedBuffer = Buffer.from(decrypted);
                    const decompressionResult = this.decompressBody(decryptedBuffer, headers);
                    let finalText;
                    let statusLabel = `[DECRYPTED BODY (key ${keyNum})`;
                    if (decompressionResult.success) {
                        finalText = decompressionResult.data.toString('utf8');
                        statusLabel += ` - ${decompressionResult.method.toUpperCase()} DECOMPRESSED`;
                    } else {
                        finalText = decryptedBuffer.toString('utf8');
                        if (decompressionResult.method === 'failed') {
                            statusLabel += ` - DECOMPRESSION FAILED: ${decompressionResult.error}`;
                        }
                    }
                    statusLabel += ']:';
                    this.output.push(`    ${statusLabel}`);
                    this.output.push(`    ${finalText.length <= 500 ? finalText : finalText.slice(0, 500) + '...'}`);
                } catch (error) {
                    this.debugLog(`Body decryption failed: ${error.message}`);
                    this.output.push(`    [ENCRYPTED - decryption failed: ${error.message}]`);
                    this.output.push(`    ${bodyText.slice(0, 500)}${bodyText.length > 500 ? '...' : ''}`);
                }
            } else {
                // Regular unencrypted body - try decompression
                const bodyBuffer = Buffer.from(bodyText, 'latin1');
                const decompressionResult = this.decompressBody(bodyBuffer, headers);
                
                let finalText;
                let statusLabel = `Body (${bodyText.length} bytes)`;
                
                if (decompressionResult.success) {
                    finalText = decompressionResult.data.toString('utf8');
                    statusLabel += ` - ${decompressionResult.method.toUpperCase()} DECOMPRESSED`;
                } else {
                    finalText = bodyText;
                    if (decompressionResult.method === 'failed') {
                        statusLabel += ` - DECOMPRESSION FAILED: ${decompressionResult.error}`;
                    }
                }
                
                this.output.push(`  ${statusLabel}:`);
                if (finalText.length <= 500) {
                    this.output.push(`    ${finalText}`);
                } else {
                    this.output.push(`    ${finalText.slice(0, 500)}...`);
                }
            }
        }
    }

    /**
     * Split headers and body from a raw Buffer (CRLFCRLF or LFLF). Returns null if no split.
     */
    splitHeadersAndBody(buffer) {
        if (!buffer || buffer.length === 0) return null;
        // Find likely header start anywhere in the buffer
        const headerStart = this.findNextHeaderStart(buffer, 0);
        if (headerStart === -1) return null;

        const leadingBuffer = headerStart > 0 ? buffer.slice(0, headerStart) : Buffer.alloc(0);
        const afterStart = buffer.slice(headerStart);

        // Now split headers/body from the start of header
        let idx = afterStart.indexOf('\r\n\r\n');
        let sepLen = 0;
        if (idx !== -1) {
            sepLen = 4;
        } else {
            idx = afterStart.indexOf('\n\n');
            if (idx !== -1) sepLen = 2;
        }
        if (idx === -1) {
            // Not a complete header block yet
            return null;
        }
        const headerText = afterStart.slice(0, idx).toString('utf8');
        const bodyBuffer = afterStart.slice(idx + sepLen);
        return { headerText, bodyBuffer, leadingBuffer };
    }

    /**
     * Process WebTV message using header text and original body bytes (preferred path)
     */
    processWebTVMessageBuffer(headerText, bodyBuffer, connection, direction) {
        this.output.push(`  WebTV Message (${direction}):`);

        const lines = headerText.split(/\r?\n/);
        const headers = {};
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            if (i === 0) {
                this.output.push(`    ${line}`);
                headers.requestLine = line;
            } else {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.slice(0, colonIndex).toLowerCase();
                    const value = line.slice(colonIndex + 1).trim();
                    headers[key] = value;
                    this.output.push(`    ${key}: ${value}`);
                }
            }
        }

        // Extract WebTV-specific information
        this.extractWebTVInfo(headers, connection);

        // Body handling
        if (bodyBuffer && bodyBuffer.length > 0) {
            const isProprietary = headers['wtv-initial-key'] &&
                (bodyBuffer.slice(0, 4).toString() === 'ANDY' || bodyBuffer.slice(0, 4).equals(Buffer.from([0x41,0x4e,0x44,0x59])));
            if (isProprietary) {
                this.output.push(`  Body (${bodyBuffer.length} bytes): [PROPRIETARY FORMAT - NOT ENCRYPTED]`);
                const preview = bodyBuffer.slice(0, 100).toString('latin1').replace(/[\x00-\x1f\x7f-\xff]/g, '∩┐╜');
                this.output.push(`    ${preview}${bodyBuffer.length > 1000 ? '...' : ''}`);
                return;
            }

            if (headers['wtv-encrypted'] === 'true' && connection.wtvsec) {
                this.output.push(`  Body (${bodyBuffer.length} bytes):`);
                try {
                    this.ensureSecureOn(connection);
                    const keyNum = direction.includes('SERVER') ? 1 : 0;
                    this.debugLog(`Decrypting body with key ${keyNum} (${bodyBuffer.length} bytes)`);
                    const decrypted = connection.wtvsec.Decrypt(keyNum, bodyBuffer);
                    const decryptedBuffer = Buffer.from(decrypted);
                    const decompressionResult = this.decompressBody(decryptedBuffer, headers);
                    let finalText;
                    let statusLabel = `[DECRYPTED BODY (key ${keyNum})`;
                    if (decompressionResult.success) {
                        finalText = decompressionResult.data.toString('utf8');
                        statusLabel += ` - ${decompressionResult.method.toUpperCase()} DECOMPRESSED`;
                    } else {
                        finalText = decryptedBuffer.toString('utf8');
                        if (decompressionResult.method === 'failed') {
                            statusLabel += ` - DECOMPRESSION FAILED: ${decompressionResult.error}`;
                        }
                    }
                    statusLabel += ']:';
                    this.output.push(`    ${statusLabel}`);
                    this.output.push(`    ${finalText.length <= 500 ? finalText : finalText.slice(0, 500) + '...'}`);
                } catch (error) {
                    this.debugLog(`Body decryption failed: ${error.message}`);
                    this.output.push(`    [ENCRYPTED - decryption failed: ${error.message}]`);
                }
            } else {
                const decompressionResult = this.decompressBody(bodyBuffer, headers);
                let finalText;
                let statusLabel = `Body (${bodyBuffer.length} bytes)`;
                if (decompressionResult.success) {
                    finalText = decompressionResult.data.toString('utf8');
                    statusLabel += ` - ${decompressionResult.method.toUpperCase()} DECOMPRESSED`;
                } else {
                    finalText = bodyBuffer.toString('utf8');
                    if (decompressionResult.method === 'failed') {
                        statusLabel += ` - DECOMPRESSION FAILED: ${decompressionResult.error}`;
                    }
                }
                this.output.push(`  ${statusLabel}:`);
                this.output.push(`    ${finalText.length <= 500 ? finalText : finalText.slice(0, 500) + '...'}`);
            }
        }
    }

    /**
     * Process individual packet within a connection
     */
    processPacket(packet, connection) {
        if (packet.payloadLength === 0) return;

        const timestamp = new Date(packet.timestamp * 1000).toISOString();
        const direction = connection.serverToClient ? 'SERVER → CLIENT' : 'CLIENT → SERVER';
        
        this.output.push(`[${timestamp}] Packet #${packet.packetNumber} (${direction})`);
        this.output.push(`  Length: ${packet.payloadLength} bytes`);

        try {
            // Try to parse as text first
            const payloadText = packet.payload.toString('utf8');
            
            if (this.looksLikeWebTVHeaders(payloadText)) {
                this.processWebTVHeaders(payloadText, connection, direction);
            } else if (connection.encryptionEnabled && connection.wtvsec) {
                this.processEncryptedData(packet.payload, connection, direction);
            } else {
                // Binary or unknown data
                this.output.push(`  Raw data: ${packet.payload.slice(0, 100).toString('hex')}${packet.payloadLength > 100 ? '...' : ''}`);
            }
        } catch (error) {
            this.debugLog(`Error processing packet #${packet.packetNumber}:`, error.message);
            this.output.push(`  Error processing packet: ${error.message}`);
        }

        this.output.push('');
    }

    /**
     * Check if data looks like WebTV headers
     */
    looksLikeWebTVHeaders(text) {
        // Look for HTTP-style headers or WebTV-specific headers
        return /^(GET|POST|SECURE|[a-zA-Z-]+:|\d{3}\s)/.test(text) ||
               text.includes('wtv-') ||
               text.includes('WebTV');
    }

    /**
     * Process WebTV headers and extract relevant information
     */
    processWebTVHeaders(text, connection, direction) {
        this.output.push(`  WebTV Message (${direction}):`);
        
        const lines = text.split(/\r?\n/);
        const headers = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) break; // End of headers
            
            if (i === 0) {
                // Request/response line
                this.output.push(`    ${line}`);
                headers.requestLine = line;
            } else {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.slice(0, colonIndex).toLowerCase();
                    const value = line.slice(colonIndex + 1).trim();
                    headers[key] = value;
                    this.output.push(`    ${key}: ${value}`);
                }
            }
        }

        // Extract WebTV-specific information
        this.extractWebTVInfo(headers, connection);

        // Look for body content
        const bodyStart = text.indexOf('\r\n\r\n');
        if (bodyStart >= 0) {
            const bodyText = text.slice(bodyStart + 4);
            if (bodyText.length > 0) {
                // Check if this is a proprietary format that should not be decrypted
                const bodyBuffer = Buffer.from(bodyText, 'binary');
                const isProprietary = headers['wtv-initial-key'] && 
                    (bodyText.startsWith('ANDY') || 
                     bodyBuffer.slice(0, 4).toString() === 'ANDY' ||
                     bodyBuffer.slice(0, 4).equals(Buffer.from([0x41, 0x4e, 0x44, 0x59])));
                
                if (isProprietary) {
                    this.output.push(`  Body (${bodyText.length} bytes): [PROPRIETARY FORMAT - NOT ENCRYPTED]`);
                    // Show a preview of the proprietary data
                    const previewText = bodyText.slice(0, 100).replace(/[\x00-\x1f\x7f-\xff]/g, '∩┐╜');
                    this.output.push(`    ${previewText}${bodyText.length > 1000 ? '...' : ''}`);
                } else if (headers['wtv-encrypted'] === 'true' && connection.wtvsec) {
                    // Avoid this text-path for decryption to prevent byte corruption; handled in processWebTVMessageBuffer.
                    this.output.push(`  Body is encrypted; processing via buffer-based path elsewhere.`);
                } else {
                    // Regular unencrypted body - try decompression
                    const bodyBuffer = Buffer.from(bodyText, 'binary');
                    const decompressionResult = this.decompressBody(bodyBuffer, headers);
                    
                    let finalText;
                    let statusLabel = `Body (${bodyText.length} bytes)`;
                    
                    if (decompressionResult.success) {
                        finalText = decompressionResult.data.toString('utf8');
                        statusLabel += ` - ${decompressionResult.method.toUpperCase()} DECOMPRESSED`;
                    } else {
                        finalText = bodyText;
                        if (decompressionResult.method === 'failed') {
                            statusLabel += ` - DECOMPRESSION FAILED: ${decompressionResult.error}`;
                        }
                    }
                    
                    this.output.push(`  ${statusLabel}:`);
                    if (finalText.length <= 500) {
                        this.output.push(`    ${finalText}`);
                    } else {
                        this.output.push(`    ${finalText.slice(0, 1000)}...`);
                    }
                }
            }
        }
    }

    /**
     * Extract WebTV-specific information from headers
     */
    extractWebTVInfo(headers, connection) {
        // Get both connection key (directional) and flow key (bidirectional)
        const connectionKey = connection.key; // e.g., "192.168.1.1:1234->192.168.1.2:1515"
        const flowKey = this.getFlowKeyFromConnection(connectionKey);
        
        // Initialize connection-specific state
        if (!this.connections.has(connectionKey)) {
            const newConnState = { 
                incarnation: 0, 
                handshakeVerified: false,
                wtvsec: null 
            };
            
            // Don't create WTVSec instance yet - we need to wait for the incarnation header
            // WTVSec will be created when we process the first incarnation header
            const isClientToServer = this.isConnectionToWebTVServer(connectionKey);
            if (isClientToServer) {
                this.debugLog(`Deferring WTVSec creation for client->server connection until incarnation is known: ${connectionKey}`);
            } else {
                this.debugLog(`Skipping WTVSec creation for server->client connection: ${connectionKey}`);
            }
            
            this.connections.set(connectionKey, newConnState);
        }
        const connState = this.connections.get(connectionKey);
        
        // Initialize flow-specific state (bidirectional handshake tracking)
        if (!this.flows.has(flowKey)) {
            this.flows.set(flowKey, { handshakeComplete: false });
        }
        const flow = this.flows.get(flowKey);

        // Track initial key from server (first server response should contain this)
        if (headers['wtv-initial-key']) {
            this.output.push(`    [*] Initial key: ${headers['wtv-initial-key']}`);
            connection.initialKey = headers['wtv-initial-key'];
            flow.initialKey = headers['wtv-initial-key'];
            
            this.debugLog(`Flow ${flowKey} now has initialKey, challenge=${!!flow.challenge}, challengeResponse=${!!flow.observedResp}`);
            
            // Extract server IP from connection key and store the initial key globally
            const serverIP = this.getServerIPFromConnection(connection.key);
            if (serverIP) {
                this.serverInitialKeys.set(serverIP, headers['wtv-initial-key']);
                this.debugLog(`Stored initial key for server ${serverIP}: ${headers['wtv-initial-key']}`);
                
                // Apply this key to any existing connections with this server that don't have an initial key
                this.applyInitialKeyToExistingConnections(serverIP, headers['wtv-initial-key']);
            }
            
            // If we already have challenge and response on this flow, verify now
            if (flow.challenge && flow.observedResp && !flow.handshakeComplete) {
                this.debugLog(`Initial key received, triggering delayed handshake verification for ${connectionKey}`);
                this.verifyHandshake(connectionKey, connState, flow, connection);
            }
        }

        // Track incarnation per connection
        if (headers['wtv-incarnation']) {
            const incarnationStr = headers['wtv-incarnation'].trim();
            if (incarnationStr && incarnationStr !== '') {
                const newIncarnation = parseInt(incarnationStr);
                if (!isNaN(newIncarnation) && newIncarnation !== connState.incarnation) {
                    connState.incarnation = newIncarnation;
                    connection.incarnation = newIncarnation;
                    this.output.push(`    [*] Incarnation: ${newIncarnation} (connection: ${connectionKey})`);
                    
                    // Create WTVSec instance if this is a client->server connection and we don't have one yet
                    const isClientToServer = this.isConnectionToWebTVServer(connectionKey);
                    if (isClientToServer && !connState.wtvsec) {
                        try {
                            this.debugLog(`Creating WTVSec instance with incarnation ${newIncarnation} for: ${connectionKey}`);
                            connState.wtvsec = new WTVSec(this.config, newIncarnation);
                            this.debugLog(`WTVSec instance created successfully for ${connectionKey}`);
                        } catch (error) {
                            console.error(`Error creating WTVSec for ${connectionKey}:`, error);
                        }
                    }
                    // Update existing WTVSec instance if it exists
                    else if (connState.wtvsec) {
                        this.debugLog(`Updating WTVSec incarnation to ${newIncarnation} for: ${connectionKey}`);
                        connState.wtvsec.set_incarnation(newIncarnation);
                    }
                }
            } else {
                this.debugLog(`Empty incarnation header for ${connectionKey}`);
            }
        }

        // Track challenge/response (only verify once per flow)
        if (headers['wtv-challenge'] && !flow.handshakeComplete) {
            this.output.push(`    [*] Challenge detected: ${headers['wtv-challenge']}`);
            connection.challenge = headers['wtv-challenge'];
            flow.challenge = headers['wtv-challenge'];
            
            this.debugLog(`Flow ${flowKey} now has challenge, initialKey=${!!flow.initialKey}`);
            
            // Initialize WTVSec for this connection if needed
            this.initializeConnectionWTVSec(connectionKey, connState, flow);
        }

        if (headers['wtv-challenge-response'] && !flow.handshakeComplete) {
            this.output.push(`    [*] Challenge response: ${headers['wtv-challenge-response']}`);
            connection.observedChallengeResponseB64 = headers['wtv-challenge-response'];
            flow.observedResp = headers['wtv-challenge-response'];
            
            this.debugLog(`Flow ${flowKey} now has challenge-response, initialKey=${!!flow.initialKey}, challenge=${!!flow.challenge}`);
            
            // Verify handshake if we have all components
            if (flow.challenge && !connState.handshakeVerified) {
                // Check if we have an initial key for this flow, or can get one from the server IP
                let initialKeyToUse = flow.initialKey;
                if (!initialKeyToUse) {
                    const serverIP = this.getServerIPFromConnection(connectionKey);
                    if (serverIP && this.serverInitialKeys.has(serverIP)) {
                        initialKeyToUse = this.serverInitialKeys.get(serverIP);
                        flow.initialKey = initialKeyToUse; // Store it on the flow for future use
                        this.debugLog(`Using server-specific initial key for ${connectionKey}: ${initialKeyToUse}`);
                    }
                }
                
                if (initialKeyToUse) {
                    this.debugLog(`All components available for handshake verification on ${connectionKey}`);
                    this.verifyHandshake(connectionKey, connState, flow, connection);
                } else {
                    this.debugLog(`Challenge-response found but no initial key available for ${connectionKey}`);
                }
            }
        }

        // Track encryption
        if (headers['wtv-encrypted'] === 'true') {
            if (!connection.encryptionEnabled) {
                connection.encryptionEnabled = true;
                this.output.push(`    [*] Encryption enabled`);
                // Note: WTVSec initialization will be handled by connection-specific methods
            }
        }

        // SECURE ON command
        if (headers.requestLine && headers.requestLine.includes('SECURE ON')) {
            this.output.push(`    [*] SECURE ON detected - encryption will start`);
            this.debugLog(`SECURE ON detected for ${connectionKey}, current incarnation: ${connState.incarnation}, WTVSec exists: ${!!connState.wtvsec}`);
            connection.encryptionEnabled = true;
            connection.secureOnSeen = true;
            // Note: WTVSec initialization will be handled by connection-specific methods
        }

        // Track serial numbers for session identification
        if (headers['wtv-client-serial-number']) {
            connection.clientSSID = headers['wtv-client-serial-number'];
            this.output.push(`    [*] Client SSID: ${connection.clientSSID}`);
        }
    }

    /**
     * Compute expected challenge-response using current initial key and challenge and log result
     */
    computeAndReportChallenge(connection) {
        try {
            if (!connection.initialKey || !connection.challenge) return;
            if (!connection.wtvsec) {
                connection.wtvsec = new WTVSec(this.config, connection.incarnation);
            }
            // Force the initial key for this connection
            const initialKeyWordArray = CryptoJS.enc.Base64.parse(connection.initialKey);
            connection.wtvsec.initial_shared_key = initialKeyWordArray;
            connection.wtvsec.current_shared_key = initialKeyWordArray;

            const respWordArray = connection.wtvsec.ProcessChallenge(connection.challenge, initialKeyWordArray);
            const respB64 = respWordArray.toString(CryptoJS.enc.Base64);
            connection.expectedChallengeResponseB64 = respB64;
            this.output.push(`    [*] Computed challenge-response: ${respB64}`);

            if (connection.observedChallengeResponseB64) {
                const match = this.compareChallengeResponses(respB64, connection.observedChallengeResponseB64);
                connection.challengeMatch = match;
                this.output.push(`    [${match ? 'PASS' : 'FAIL'}] Computed vs observed challenge-response`);
                if (!match) {
                    this.output.push(`        expected: ${respB64}`);
                    this.output.push(`        observed: ${connection.observedChallengeResponseB64}`);
                }
            }
        } catch (e) {
            this.output.push(`    [!] Failed to compute challenge-response: ${e.message}`);
            this.debugLog(e.stack || e);
        }
    }

    /**
     * Compute expected challenge-response for a flow using its initial key and challenge
     */
    computeAndReportFlowChallenge(flow, connectionCtx) {
        try {
            if (!flow || !flow.initialKey || !flow.challenge) return;
            const wtvsec = new WTVSec(this.config, connectionCtx.incarnation || 1);
            const initialKeyWordArray = CryptoJS.enc.Base64.parse(flow.initialKey);
            wtvsec.initial_shared_key = initialKeyWordArray;
            wtvsec.current_shared_key = initialKeyWordArray;
            const respWordArray = wtvsec.ProcessChallenge(flow.challenge, initialKeyWordArray);
            const respB64 = respWordArray.toString(CryptoJS.enc.Base64);
            flow.expectedResp = respB64;
            this.output.push(`    [*] Computed challenge-response (flow): ${respB64}`);
        } catch (e) {
            this.output.push(`    [!] Failed to compute flow challenge-response: ${e.message}`);
            this.debugLog(e.stack || e);
        }
    }

    /**
     * Build a canonical flow key (direction-agnostic) from a connection key
     */
    getFlowKeyFromConnection(connectionKey) {
        const match = connectionKey.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)->(\d+\.\d+\.\d+\.\d+):(\d+)$/);
        if (!match) return connectionKey;
        const a = { ip: match[1], port: parseInt(match[2]) };
        const b = { ip: match[3], port: parseInt(match[4]) };
        const ipToNum = (ip) => ip.split('.').reduce((n, oct) => (n << 8) + parseInt(oct), 0);
        const aKey = [ipToNum(a.ip), a.port];
        const bKey = [ipToNum(b.ip), b.port];
        const first = (aKey[0] < bKey[0] || (aKey[0] === bKey[0] && aKey[1] <= bKey[1])) ? a : b;
        const second = (first === a) ? b : a;
        return `${first.ip}:${first.port}<->${second.ip}:${second.port}`;
    }

    /**
     * Compare two Base64 challenge-responses for equality (constant-time-ish trim)
     */
    compareChallengeResponses(expectedB64, observedB64) {
        if (!expectedB64 || !observedB64) return false;
        const a = expectedB64.trim();
        const b = observedB64.trim();
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) {
            diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return diff === 0;
    }

    /**
     * Initialize WTVSec for decryption
     */
    /**
     * Initialize WTVSec instance for a specific connection
     */
    initializeConnectionWTVSec(connectionKey, connState, flow) {
        if (!connState.wtvsec && flow.initialKey) {
            try {
                this.debugLog(`Initializing WTVSec for connection: ${connectionKey}`);
                connState.wtvsec = new WTVSec(this.config, connState.incarnation);
                
                // Override the initial shared key with the one provided by the server
                const initialKeyWordArray = CryptoJS.enc.Base64.parse(flow.initialKey);
                connState.wtvsec.initial_shared_key = initialKeyWordArray;
                connState.wtvsec.current_shared_key = initialKeyWordArray;
                
                this.debugLog(`WTVSec initialized with incarnation ${connState.incarnation} and initial key ${flow.initialKey}`);
            } catch (error) {
                console.error(`Error initializing WTVSec for ${connectionKey}:`, error);
            }
        }
    }

    /**
     * Verify the handshake for a connection (only once per flow)
     */
    verifyHandshake(connectionKey, connState, flow, connection) {
        if (connState.handshakeVerified || flow.handshakeComplete) {
            return; // Already verified
        }

        try {
            this.debugLog(`Verifying handshake for connection: ${connectionKey}`);
            this.debugLog(`Using initial key: ${flow.initialKey}`);
            this.debugLog(`Processing challenge: ${flow.challenge}`);

            // Initialize WTVSec if not already done
            this.initializeConnectionWTVSec(connectionKey, connState, flow);

            if (!connState.wtvsec) {
                this.output.push(`    [FAIL] Could not initialize WTVSec for handshake verification`);
                return;
            }

            // Use the server's initial key for challenge processing
            const keyToUse = CryptoJS.enc.Base64.parse(flow.initialKey);
            this.debugLog(`Using key for challenge: ${keyToUse.toString(CryptoJS.enc.Base64)}`);

            const challengeResponse = connState.wtvsec.ProcessChallenge(flow.challenge, keyToUse);
            if (challengeResponse && challengeResponse.toString) {
                const expectedB64 = challengeResponse.toString(CryptoJS.enc.Base64);
                this.debugLog(`Computed challenge-response: ${expectedB64}`);
                
                flow.expectedResp = expectedB64;
                
                // Compare with observed response
                const match = this.compareChallengeResponses(expectedB64, flow.observedResp);
                connection.challengeMatch = match;
                connState.handshakeVerified = true;
                flow.handshakeComplete = true;
                
                this.output.push(`    [${match ? 'PASS' : 'FAIL'}] Handshake verification for ${connectionKey}`);
                if (!match) {
                    this.output.push(`        expected: ${expectedB64}`);
                    this.output.push(`        observed: ${flow.observedResp}`);
                } else {
                    this.output.push(`    [*] Handshake successful - encryption keys established`);
                    
                    // CRITICAL: Copy WTVSec instance to connection for decryption
                    connection.wtvsec = connState.wtvsec;
                    connection.incarnation = connState.incarnation;
                    this.debugLog(`WTVSec instance copied to connection for decryption`);
                }
            } else {
                this.output.push(`    [FAIL] Failed to process challenge - no response generated`);
            }
        } catch (error) {
            console.error(`Error verifying handshake for ${connectionKey}:`, error);
            this.output.push(`    [FAIL] Handshake verification error: ${error.message}`);
        }
    }
    
    /**
     * Extract server IP from connection key
     */
    getServerIPFromConnection(connectionKey) {
        // Connection key format: "srcIP:srcPort->dstIP:dstPort"
        const match = connectionKey.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)->(\d+\.\d+\.\d+\.\d+):(\d+)$/);
        if (match) {
            const srcIP = match[1];
            const srcPort = parseInt(match[2]);
            const dstIP = match[3];
            const dstPort = parseInt(match[4]);
            
            // Determine which is the server IP (servers typically use lower port numbers)
            return srcPort < dstPort ? srcIP : dstIP;
        }
        return null;
    }

    /**
     * Apply initial key to existing connections from the same server
     */
    applyInitialKeyToExistingConnections(serverIP, initialKey) {
        for (const [connectionKey, connection] of this.connections) {
            const connServerIP = this.getServerIPFromConnection(connectionKey);
            if (connServerIP === serverIP && !connection.initialKey) {
                this.debugLog(`Applying initial key to existing connection: ${connectionKey}`);
                connection.initialKey = initialKey;
                
                // If this connection has a challenge but no session keys, retry processing
                if (connection.challenge && connection.wtvsec && 
                    (!connection.wtvsec.session_key1 || !connection.wtvsec.session_key2)) {
                    this.debugLog(`Retrying challenge processing with new initial key for ${connectionKey}`);
                    this.retryChallenge(connection, initialKey);
                }
            }
        }
    }

    /**
     * Retry challenge processing with the correct initial key
     */
    retryChallenge(connection, initialKey) {
        try {
            const keyToUse = CryptoJS.enc.Base64.parse(initialKey);
            connection.wtvsec.initial_shared_key = keyToUse;
            connection.wtvsec.current_shared_key = keyToUse;
            
            this.debugLog(`Retrying challenge processing with server key: ${initialKey}`);
            const response = connection.wtvsec.ProcessChallenge(connection.challenge, keyToUse);
            this.debugLog(`Challenge retry completed successfully`);
            
            if (connection.wtvsec.session_key1 && connection.wtvsec.session_key2) {
                this.debugLog(`Session keys generated from retry - Key1: ${connection.wtvsec.session_key1.toString(CryptoJS.enc.Base64)}, Key2: ${connection.wtvsec.session_key2.toString(CryptoJS.enc.Base64)}`);
                
                // Initialize RC4 sessions now that we have session keys
                if (connection.encryptionEnabled || connection.secureOnSeen) {
                    try {
                        connection.wtvsec.SecureOn();
                        this.debugLog(`RC4 sessions initialized after retry for connection ${connection.key}`);
                    } catch (secureOnError) {
                        this.debugLog(`SecureOn failed after retry: ${secureOnError.message}`);
                    }
                }
            } else {
                this.debugLog(`Challenge retry completed but no session keys generated`);
            }
        } catch (retryError) {
            this.debugLog(`Challenge retry failed: ${retryError.message}`);
        }
    }
    
    /**
     * Score a decryption attempt to determine quality
     */
    scoreDecryption(text, decompressionSuccess) {
        let score = 0;
        
        // Higher score is better
        if (decompressionSuccess) {
            score += 5; // Successfully decompressed data is likely correct
        }
        
        if (this.isPrintableText(text)) {
            score += 3; // Printable text is better than binary
        }
        
        // Look for common WebTV/HTML patterns (case insensitive)
        const lowerText = text.toLowerCase();
        const webtvPatterns = [
            '<html', '<!doctype', '<head', '<body', '<title',
            'wtv-', 'webtv', 'content-type', 'content-length',
            '</html>', '</body>', '</head>', '<script', '<style',
            'get ', 'post ', 'http/', '200 ok', '404 not found',
            'content-', 'charset=', 'javascript', 'text/html',
            'text/plain', 'image/', 'application/'
        ];
        
        for (const pattern of webtvPatterns) {
            if (lowerText.includes(pattern)) {
                score += 2;
            }
        }
        
        // Count character types for better scoring
        let printableCount = 0;
        let nullCount = 0;
        let controlCount = 0;
        
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            
            if (charCode >= 32 && charCode <= 126) {
                printableCount++;
            } else if (charCode === 0) {
                nullCount++;
            } else if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
                controlCount++;
            }
        }
        
        // Score based on character distribution
        const printableRatio = printableCount / text.length;
        const nullRatio = nullCount / text.length;
        const controlRatio = controlCount / text.length;
        
        // Bonus for high printable ratio
        score += printableRatio * 4;
        
        // Penalize excessive null bytes
        if (nullRatio > 0.2) {
            score -= nullRatio * 8;
        }
        
        // Penalize excessive control characters
        if (controlRatio > 0.15) {
            score -= controlRatio * 6;
        }
        
        // Special handling for very short data
        if (text.length <= 10) {
            // For very short packets, prefer clean data
            if (nullRatio < 0.1 && controlRatio < 0.1) {
                score += 3;
            }
        }
        
        // Very short meaningful text gets a bonus
        if (text.length < 50 && this.isPrintableText(text) && text.trim().length > 0) {
            score += 2;
        }
        
        return Math.max(0, score); // Never return negative scores
    }

    /**
     * Process encrypted data
     */
    processEncryptedData(data, connection, direction) {
        this.output.push(`  Encrypted Data (${direction}):`);
        
        if (!connection.wtvsec) {
            this.output.push(`    [!] No WTVSec instance - cannot decrypt`);
            this.output.push(`    Raw: ${data.slice(0, 100).toString('hex')}${data.length > 1000 ? '...' : ''}`);
            return;
        }

        try {
            // For encrypted data, we need to handle the specific WebTV pattern:
            // - Client sends "SECURE ON" in plaintext
            // - Server responds with plaintext headers including wtv-encrypted: true
            // - Subsequent data from both sides is encrypted
            
            // Check if this might be a SECURE ON response with encrypted body
            const dataText = data.toString('utf8', 0, Math.min(200, data.length));
            if (dataText.includes('wtv-encrypted: true') && dataText.includes('\r\n\r\n')) {
                // This is a mixed plaintext header + encrypted body response
                this.processEncryptedResponse(data, connection, direction);
                return;
            }
            
            this.ensureSecureOn(connection);
            const keyNum = connection.serverToClient ? 1 : 0; // server->client uses key 1, client->server uses key 0
            const keyName = keyNum === 0 ? 'session_key1' : 'session_key2';
            this.debugLog(`Decrypting ${data.length} bytes with ${keyName} (key ${keyNum}) for ${direction}`);
            const decrypted = connection.wtvsec.Decrypt(keyNum, data);
            const decryptedBuffer = Buffer.from(decrypted);
            const decryptedText = decryptedBuffer.toString('utf8');
            this.output.push(`    Decrypted with ${keyName} (${decryptedBuffer.length} bytes):`);
            if (this.isPrintableText(decryptedText) || this.looksLikeWebTVHeaders(decryptedText)) {
                this.output.push(`    [*] Decrypted text content:`);
                this.output.push(`    ${decryptedText.length <= 1000 ? decryptedText : decryptedText.slice(0, 1000) + '...'}`);
            } else {
                this.output.push(`    [*] Decrypted binary data:`);
                this.output.push(`    ${decryptedBuffer.slice(0, 100).toString('hex')}${decryptedBuffer.length > 1000 ? '...' : ''}`);
            }
            
        } catch (error) {
            this.debugLog(`Decryption failed:`, error.message);
            this.output.push(`    [!] Decryption failed: ${error.message}`);
            
            // Show raw data for debugging
            this.output.push(`    Raw: ${data.slice(0, 100).toString('hex')}${data.length > 1000 ? '...' : ''}`);
        }
    }

    /**
     * Process mixed plaintext header + encrypted body response
     */
    processEncryptedResponse(data, connection, direction) {
        try {
            // Find header/body split
            let headerEnd = -1;
            let headerSep = 0;
            
            const crlfcrlf = data.indexOf('\r\n\r\n');
            const lflf = data.indexOf('\n\n');
            
            if (crlfcrlf !== -1) {
                headerEnd = crlfcrlf;
                headerSep = 4;
            } else if (lflf !== -1) {
                headerEnd = lflf;
                headerSep = 2;
            }
            
            if (headerEnd === -1) {
                // No header/body split found
                this.processEncryptedData(data, connection, direction);
                return;
            }
            
            // Split headers and body
            const headerData = data.slice(0, headerEnd);
            const bodyData = data.slice(headerEnd + headerSep);
            
            this.output.push(`    [*] Mixed response - plaintext headers + encrypted body:`);
            
            // Process plaintext headers
            const headerText = headerData.toString('utf8');
            this.output.push(`    Headers:`);
            const lines = headerText.split(/\r?\n/);
            for (const line of lines) {
                if (line.trim()) {
                    this.output.push(`      ${line}`);
                }
            }
            
            // Try to decrypt the body
            if (bodyData.length > 0) {
                this.output.push(`    Encrypted body (${bodyData.length} bytes):`);
                
                // Server->client data uses key 1, client->server uses key 0
                const keyNum = connection.serverToClient ? 1 : 0;
                
                try {
                    this.ensureSecureOn(connection);
                    const decrypted = connection.wtvsec.Decrypt(keyNum, bodyData);
                    const decryptedBuffer = Buffer.from(decrypted);
                    const decryptedText = decryptedBuffer.toString('utf8');
                    
                    if (this.isPrintableText(decryptedText) || this.looksLikeWebTVHeaders(decryptedText)) {
                        this.output.push(`      [*] Decrypted body (text):`);
                        this.output.push(`      ${decryptedText.length <= 500 ? decryptedText : decryptedText.slice(0, 1000) + '...'}`);
                    } else {
                        this.output.push(`      [*] Decrypted binary body:`);
                        this.output.push(`      ${decryptedBuffer.slice(0, 100).toString('hex')}${decryptedBuffer.length > 100 ? '...' : ''}`);
                    }
                } catch (error) {
                    this.output.push(`      [!] Body decryption failed: ${error.message}`);
                    this.output.push(`      Raw: ${bodyData.slice(0, 100).toString('hex')}${bodyData.length > 100 ? '...' : ''}`);
                }
            }
            
        } catch (error) {
            this.debugLog(`Error processing mixed response:`, error.message);
            this.output.push(`    [!] Error processing mixed response: ${error.message}`);
        }
    }

    /**
     * Ensure RC4 sessions are initialized when we have session keys and SECURE ON was seen.
     */
    ensureSecureOn(connection) {
        try {
            if (!connection) return;
            if (!connection.wtvsec) return;
            if (connection.rc4Ready) return;
            if (!connection.wtvsec.session_key1 || !connection.wtvsec.session_key2) return;
            if (!connection.secureOnSeen && !connection.encryptionEnabled) return;
            connection.wtvsec.SecureOn();
            connection.rc4Ready = true;
            this.debugLog(`RC4 sessions initialized for connection ${connection.key}`);
        } catch (e) {
            this.debugLog(`ensureSecureOn failed: ${e.message}`);
        }
    }

    /**
     * Check if text is mostly printable ASCII
     */
    isPrintableText(text) {
        if (text.length === 0) return false;
        
        let printableCount = 0;
        for (let i = 0; i < Math.min(text.length, 100); i++) {
            const char = text.charCodeAt(i);
            if ((char >= 32 && char <= 126) || char === 9 || char === 10 || char === 13) {
                printableCount++;
            }
        }
        
        return (printableCount / Math.min(text.length, 100)) > 0.8;
    }

    /**
     * Decompress body content based on headers
     */
    decompressBody(bodyBuffer, headers) {
        try {
            // Check for LZPF compression first
            if (headers['wtv-lzpf'] === '0') {
                this.debugLog('Attempting LZPF decompression');
                const lzpf = new LZPF();
                const decompressed = lzpf.expand(bodyBuffer);
                return {
                    success: true,
                    data: decompressed,
                    method: 'LZPF'
                };
            }
            
            // Check for standard content-encoding
            const contentEncoding = headers['content-encoding'];
            if (contentEncoding) {
                this.debugLog(`Attempting ${contentEncoding} decompression`);
                
                if (contentEncoding === 'deflate') {
                    const decompressed = zlib.inflateSync(bodyBuffer);
                    return {
                        success: true,
                        data: decompressed,
                        method: 'deflate'
                    };
                } else if (contentEncoding === 'gzip') {
                    const decompressed = zlib.gunzipSync(bodyBuffer);
                    return {
                        success: true,
                        data: decompressed,
                        method: 'gzip'
                    };
                }
            }
            
            // No compression detected
            return {
                success: false,
                data: bodyBuffer,
                method: 'none'
            };
            
        } catch (error) {
            this.debugLog(`Decompression failed: ${error.message}`);
            return {
                success: false,
                data: bodyBuffer,
                method: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Save analysis results to file
     */
    saveResults(content) {
        if (this.outputFile) {
            fs.writeFileSync(this.outputFile, content);
            console.log(`Analysis saved to: ${this.outputFile}`);
        } else {
            console.log(content);
        }
    }

    /**
     * Run the complete analysis
     */
    async run() {
        try {
            console.log('Starting WebTV PCAP analysis...');
            
            // Parse PCAP file
            await this.parsePcapFile();
            
            if (this.packets.length === 0) {
                console.log('No WebTV packets found in PCAP file');
                return;
            }

            // Analyze traffic
            const results = this.analyzeTraffic();
            
            // Save or display results
            this.saveResults(results);
            
            console.log(`Analysis complete. Processed ${this.packets.length} WebTV packets.`);
            
        } catch (error) {
            console.error('Error during analysis:', error.message);
            if (this.debug) {
                console.error(error.stack);
            }
        }
    }
}

/**
 * Command line interface
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        pcapFile: '../wtv.pcap',
        outputFile: null,
        debug: false,
        verbose: false,
        portRange: {min: 1600, max: 1699}  // WebTV Default Port Range
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--pcap':
            case '-p':
                if (i + 1 < args.length) {
                    options.pcapFile = args[++i];
                }
                break;
            case '--output':
            case '-o':
                if (i + 1 < args.length) {
                    options.outputFile = args[++i];
                }
                break;
            case '--debug':
            case '-d':
                options.debug = true;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--ports':
                if (i + 1 < args.length) {
                    const portSpec = args[++i];
                    const portRange = parsePortRange(portSpec);
                    if (portRange) {
                        options.portRange = portRange;
                    } else {
                        console.error(`Invalid port range: ${portSpec}. Use format like "1500-1599" or "1515"`);
                        process.exit(1);
                    }
                }
                break;
            case '--help':
            case '-h':
                console.log(`
WebTV PCAP Analyzer

Usage: node unroll_pcap.js [options]

Options:
  -p, --pcap <file>     PCAP file to analyze (default: ../wtv.pcap)
  -o, --output <file>   Output file for results (default: stdout)
  -d, --debug           Enable debug logging
  -v, --verbose         Enable verbose output
  --ports <range>       Filter by port range (e.g., "1500-1599" or "1515")
  -h, --help            Show this help message

Examples:
  node unroll_pcap.js --pcap ../traffic.pcap --output analysis.txt
  node unroll_pcap.js -d -v --pcap ../wtv.pcap
  node unroll_pcap.js --pcap ../wtv.pcap --ports 1500-1599
  node unroll_pcap.js --ports 1515 --debug
                `);
                process.exit(0);
        }
    }

    return options;
}

/**
 * Parse port range specification
 */
function parsePortRange(portSpec) {
    if (!portSpec) return null;
    
    // Handle single port
    if (/^\d+$/.test(portSpec)) {
        const port = parseInt(portSpec);
        if (port >= 1 && port <= 65535) {
            return { min: port, max: port };
        }
        return null;
    }
    
    // Handle port range
    const match = portSpec.match(/^(\d+)-(\d+)$/);
    if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        if (min >= 1 && max <= 65535 && min <= max) {
            return { min: min, max: max };
        }
    }
    
    return null;
}

/**
 * Main execution
 */
if (require.main === module) {
    const options = parseArgs();
    const analyzer = new WebTVPcapAnalyzer(options);
    analyzer.run().catch(console.error);
}

module.exports = WebTVPcapAnalyzer;
