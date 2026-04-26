// Pure JS implementation of Microsoft MMS (MMST - MMS over TCP) streaming protocol.
// Used by WebTV Plus (LC2+) to stream WMA and ASF audio content over mms:// URLs.
// Port 1755 (standard MMS port). Commands over TCP; data over TCP or UDP.
//
// Protocol overview:
//   - Command packets use the 48-byte MMST control header that starts with 0xb00bface.
//   - Header/media packets use the 8-byte MMST data preheader:
//       seq(4) + packetId(1) + flags(1) + totalLen(2)
//   - The server replies with command packets for connect/transport/open/header/start,
//     and sends ASF header/media bytes as MMST data packets paced by file bitrate.

'use strict';

const dgram = require('dgram');

const MMS_MAGIC = 0xB00BFACE;
const MMS_PROTOCOL = 0x20534D4D; // "MMS " little-endian
const MMS_COMMAND_HEADER_SIZE = 48;
const MMS_DIRECTION_TO_CLIENT = 0x0004;

// MMS command IDs (client -> server)
const MMS_CLIENT_CONNECT       = 0x01;
const MMS_CLIENT_TRANSPORT     = 0x02;
const MMS_CLIENT_OPEN          = 0x05;
const MMS_CLIENT_START         = 0x07;
const MMS_CLIENT_STOP          = 0x09;
const MMS_CLIENT_CLOSE         = 0x0D;
const MMS_CLIENT_HEADER_REQ    = 0x15;
const MMS_CLIENT_TIMING_REQ    = 0x18;
const MMS_CLIENT_KEEPALIVE     = 0x1B;
const MMS_CLIENT_STREAM_SELECT = 0x33;

// MMS command IDs (server -> client)
const MMS_SERVER_CLIENT_ACCEPTED   = 0x01;
const MMS_SERVER_PROTOCOL_ACCEPTED = 0x02;
const MMS_SERVER_PROTOCOL_FAILED   = 0x03;
const MMS_SERVER_MEDIA_FOLLOWS     = 0x05;
const MMS_SERVER_FILE_DETAILS      = 0x06;
const MMS_SERVER_HEADER_ACCEPTED   = 0x11;
const MMS_SERVER_TIMING_REPLY      = 0x15;
const MMS_SERVER_KEEPALIVE         = 0x1B;
const MMS_SERVER_STREAM_STOPPED    = 0x1E;
const MMS_SERVER_STREAM_ACCEPTED   = 0x21;

const MMS_HEADER_PACKET_ID = 0x05;
const MMS_MEDIA_PACKET_ID = 0x04;
const MMS_HEADER_FLAG_MORE = 0x04;
const MMS_HEADER_FLAG_FINAL = 0x0C;

const MMS_DISABLE_PACKET_PAIR = 0xf0f0f0ef 
const MMS_USE_PACKET_PAIR = 0xf0f0f0f0 

const FILE_ATTRIBUTE_MMS_CANSEEK = 0x01000000;

// Default ASF data packet size (bytes); real files embed this in the ASF header.
// 5001 is the standard Windows Media Encoder default.
const DEFAULT_ASF_PACKET_SIZE = 5001;

// Minimum pacing interval (ms) – prevents spinning too fast on low-bitrate files
const MIN_PACING_INTERVAL_MS = 10;

class WTVMMS {
    minisrv_config = null;
    service_name   = null;
    service_config = null;
    server_config  = null;
    server         = null;
    udpServer      = null;
    udpServerReady = false;
    wtvshared      = null;
    sessions       = new Map();    

    constructor(minisrv_config, service_name, wtvshared, sendToClient, net) {
        this.minisrv_config = minisrv_config;
        this.service_name   = service_name;
        this.service_config = minisrv_config.services[service_name] || {};
        this.server_config  = this.service_config;
        this.wtvshared      = wtvshared;
        this.version        = require(`${wtvshared.path.dirname(require.main.filename)}/package.json`).version.replace(/^v/, '');
        this.server         = net.createServer((socket) => this.handleConnection(socket));
        if (this.service_config.hide_minisrv_version || minisrv_config.config.hide_minisrv_version) {
            this.serverName = "minisrv";
            this.minorVersion = 1;
            this.majorVersion = 0.0;
        } else {
            this.serverName = `minisrv/${this.version}`;
            this.majorVersion = this.version.split('.').slice(0)[0];
            this.minorVersion = this.version.split('.').slice(1).join('.');
        }
    }

    listen(port, host = '0.0.0.0') {
        this.server.listen(port, host);

        const configuredUdpPort = Number(this.server_config?.udp_port);
        const udpPort = Number.isFinite(configuredUdpPort) && configuredUdpPort > 0
            ? Math.floor(configuredUdpPort)
            : 1755;
        this.udpServer = dgram.createSocket('udp4');
        this.udpServerReady = false;
        this.udpServer.on('error', (err) => {
            console.error('[WTVMMS] udp socket error', err.message);
        });
        this.udpServer.on('message', (msg, rinfo) => {
            this._handleUdpDatagram(msg, rinfo);
        });
        this.udpServer.bind(udpPort, host, () => {
            this.udpServerReady = true;
            this.debugLog('udp listen', host + ':' + udpPort);
        });

        return this.server;
    }

    close() {
        if (this.server) this.server.close();
        if (this.udpServer) {
            try { this.udpServer.close(); } catch (_) {}
            this.udpServer = null;
            this.udpServerReady = false;
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    getDebugEnabled() {
        return this.service_config.debug;
    }

    debugLog(...args) {
        if (this.getDebugEnabled()) console.log('[WTVMMS]', ...args);
    }

    // Resolve a requested media path across all configured ServiceVaults.
    resolveMediaPath(requestedMedia) {
        if (!requestedMedia) return null;
        const serviceVaultDir = this.service_config.servicevault_dir || this.service_name;
        const vaults = this.minisrv_config.config?.ServiceVaults || [];
        const variants = this._mediaVariants(requestedMedia);

        for (const vault of vaults) {
            const base = this.wtvshared.getAbsolutePath(serviceVaultDir, vault);
            for (const variant of variants) {
                const candidate = this.wtvshared.makeSafePath(base, variant);
                if (candidate && this.wtvshared.fs.existsSync(candidate) && this.wtvshared.fs.lstatSync(candidate).isFile()) {
                    this.debugLog('media resolved', variant, '->', candidate);
                    return candidate;
                }
            }
        }
        return null;
    }

    _mediaVariants(media) {
        const p    = media.replace(/\\/g, '/').replace(/^\/+/, '');
        const ext  = this.wtvshared.path.posix.extname(p).toLowerCase();
        const stem = ext ? p.slice(0, -ext.length) : p;
        const list = [p];
        // Accept both .wma and .asf for the same stem
        if (ext === '.wma') list.push(stem + '.asf');
        if (ext === '.asf') list.push(stem + '.wma');
        if (!ext) { list.push(stem + '.wma'); list.push(stem + '.asf'); }
        return [...new Set(list)];
    }

    // -------------------------------------------------------------------------
    // Connection handling
    // -------------------------------------------------------------------------

    handleConnection(socket) {
        socket.setNoDelay(true);

        const session = {
            id:             `${socket.remoteAddress}:${socket.remotePort}`,
            socket,
            clientEndpointIp: this._normalizeIp(socket.remoteAddress),
            rxBuf:          Buffer.alloc(0),
            mediaPath:      null,
            streaming:      false,
            paused:         false,
            pacingTimer:    null,
            asfFd:          null,
            requestedTransport: '',
            clientPort: 0,
            clientPortCandidates: [],
            udpPeerLearnedPort: 0,
            tcpDataEnabled: true,
            udpDataEnabled: false,
            requestedUdp: false,
            isCubddTransport: false,
            asfPacketSize:  DEFAULT_ASF_PACKET_SIZE,
            asfDataOffset:  0,
            asfFileSize:    0,
            asfPacketCount: 0,
            asfDurationSec: 0,
            bitrateBps:     0,
            commandSeq:     0,
            openFileId:     1,
            clientId:       (Math.random() * 0x7FFFFFFF + 1) >>> 0,
            openIncarnation:   0,
            headerIncarnation: MMS_HEADER_PACKET_ID,
            mediaIncarnation:  MMS_MEDIA_PACKET_ID,
            headerPacketId: MMS_HEADER_PACKET_ID,
            mediaPacketId:  MMS_MEDIA_PACKET_ID,
            readBlockIncarnation: 0,
            dataSequence:   0,
            lastDataSequenceTx: 0,
            dataAfMode:     'auto',
            bytesTx:        0,
            headerPacketsTx: 0,
            mediaPacketsTx:  0,
            burstPacketsRemaining: 0,
            burstMultiplier: 1,
            waitingForDrain: false,
            drainHandler: null,
            packetIntervalMs: MIN_PACING_INTERVAL_MS,
            nextPacketDueAt: 0,
            effectivePacketSize: 0,
            seekGeneration: 0,
            packetQueue: [],
            eosTimer: null,
            eosPingTimer: null,
            lastKeepaliveTxMs: 0,
            resendPacketCache: new Map(),
            resendPacketOrder: [],
            recentPacketSizes: [],
            smoothedPacketSize: 0,
            pacingSamples: 0,
        };

        this.sessions.set(socket, session);
        this.debugLog('client connected', session.id);

        socket.on('data', (data) => {
            try {
                session.rxBuf = Buffer.concat([session.rxBuf, data]);
                this._processIncoming(socket, session);
            } catch (e) {
                console.error('[WTVMMS] handleData error', e);
            }
        });

        socket.on('close', () => {
            this._stopStream(session);
            if (session.asfFd !== null) { try { this.wtvshared.fs.closeSync(session.asfFd); } catch(_){} session.asfFd = null; }
            this.sessions.delete(socket);
            this.debugLog('client disconnected', session.id, 'tx=' + session.bytesTx);
        });

        socket.on('error', (err) => {
            this._stopStream(session);
            if (session.asfFd !== null) { try { this.wtvshared.fs.closeSync(session.asfFd); } catch(_){} session.asfFd = null; }
            this.sessions.delete(socket);
            this.debugLog('socket error', session.id, err.message);
        });
    }

    // -------------------------------------------------------------------------
    // Incoming packet parser
    // -------------------------------------------------------------------------

    _processIncoming(socket, session) {
        while (session.rxBuf.length > 0) {
            const buf = session.rxBuf;

            if (buf[0] === 0x4E || buf[0] === 0x47) {
                const lineEnd = buf.indexOf('\r\n');
                if (lineEnd < 0 && buf.length < 512) break;
                const line = buf.slice(0, lineEnd > 0 ? lineEnd + 2 : buf.length).toString('latin1');
                this.debugLog('text connect line', session.id, line.trim());
                session.rxBuf = buf.slice(lineEnd > 0 ? lineEnd + 2 : buf.length);
                continue;
            }

            if (buf.length < 8) break;

            if (buf.length >= 12 && buf.readUInt32LE(4) === MMS_MAGIC) {
                const totalLength = buf.readUInt32LE(8) + 16;
                if (totalLength < MMS_COMMAND_HEADER_SIZE || totalLength > 1048576) {
                    this.debugLog('invalid command length, dropping connection', session.id, totalLength);
                    socket.destroy();
                    return;
                }
                if (buf.length < totalLength) break;

                const packet = buf.slice(0, totalLength);
                session.rxBuf = buf.slice(totalLength);
                this._handleCommandPacket(socket, session, packet);
                continue;
            }

            const packetLength = buf.readUInt16LE(6);
            if (packetLength >= 8 && buf.length >= packetLength) {
                this.debugLog('discarding unexpected client data packet', session.id, 'len=' + packetLength);
                session.rxBuf = buf.slice(packetLength);
                continue;
            }

            this.debugLog('bad magic, resyncing', session.id, buf.slice(0, 8).toString('hex'));
            session.rxBuf = buf.slice(1);
        }
    }

    // -------------------------------------------------------------------------
    // Command packet dispatch
    // -------------------------------------------------------------------------

    _handleCommandPacket(socket, session, packet) {
        if (packet.length < MMS_COMMAND_HEADER_SIZE) return;

        const cmdId = packet.readUInt16LE(36);
        const direction = packet.readUInt16LE(38);
        const prefix1 = packet.readUInt32LE(40);
        const prefix2 = packet.readUInt32LE(44);
        const payload = packet.slice(MMS_COMMAND_HEADER_SIZE);

        this.debugLog(
            'rx cmd',
            session.id,
            '0x' + cmdId.toString(16),
            'dir=0x' + direction.toString(16),
            'p1=0x' + prefix1.toString(16),
            'p2=0x' + prefix2.toString(16),
            'len=' + packet.length,
            'from=' + socket.remoteAddress + ':' + socket.remotePort
        );

        switch (cmdId) {
            case MMS_CLIENT_CONNECT:
                this._handleConnect(socket, session, payload);
                break;
            case MMS_CLIENT_TRANSPORT:
                this._handleTransport(socket, session, payload);
                break;
            case MMS_CLIENT_OPEN:
                session.openIncarnation = prefix1;  // playIncarnation from OpenFile
                this._handleOpen(socket, session, payload);
                break;
            case MMS_CLIENT_START:
                this._handleStart(socket, session, prefix1, payload);
                break;
            case MMS_CLIENT_STOP:
                this._handleStop(socket, session, prefix2);  // prefix2 = stopPlayIncarnation
                break;
            case MMS_CLIENT_HEADER_REQ:
                this._handleHeaderRequest(socket, session, payload);
                break;
            case MMS_CLIENT_TIMING_REQ:
                this._sendCommand(socket, session, MMS_SERVER_TIMING_REPLY, 0, 0xF0F0F0EF, this._buildFunnelInfoPayload(session));
                break;
            case MMS_CLIENT_KEEPALIVE:
                this._handleClientKeepalive(socket, session, prefix1, prefix2);
                break;
            case MMS_CLIENT_STREAM_SELECT:
                this._sendCommand(socket, session, MMS_SERVER_STREAM_ACCEPTED, 0, 0, Buffer.alloc(0));
                break;
            case MMS_CLIENT_CLOSE:
                socket.end();
                break;
            default:
                this.debugLog('unhandled cmd', session.id, '0x' + cmdId.toString(16));
        }
    }

    // -------------------------------------------------------------------------
    // Protocol handshake handlers
    // -------------------------------------------------------------------------

    _handleConnect(socket, session, payload) {
        const clientStr = payload.length > 4
            ? this._decodeUtf16CString(payload.slice(4))
            : '';
        session.clientPlayer = clientStr;
        session.isLegacyClient = /^NSPlayer\/6\./i.test(clientStr);
        // Preserve ffplay/VLC/MPC compatibility: keep MMST data flags at 0 unless legacy mode is required.
        session.dataAfMode = this._resolveDataAfMode(session);
        this.debugLog('connect', session.id, clientStr || '(no player string)');
        console.log(' * [MMS]', `[${session.id}]`, 'Client connect:', clientStr || '(unknown player)');
        if (session.isLegacyClient) {
            this._sendCommandBatch(socket, session, [
                {
                    cmdId: MMS_SERVER_CLIENT_ACCEPTED,
                    prefix1: 0,
                    prefix2: 0xF0F0F0EF,
                    payloadBuf: this._buildConnectAcceptedPayload(session)
                }
            ]);
            return;
        }

        this._sendCommand(socket, session, MMS_SERVER_CLIENT_ACCEPTED, 0, 0xF0F0F0EF, this._buildConnectAcceptedPayload(session));
    }

    _handleTransport(socket, session, payload) {
        // Transport payload has an 8-byte prefix before the UTF-16 string.
        // If slice(8) yields a valid UTF-16 string, use it; otherwise try slice(4) as fallback.
        const tryBuf8 = payload.length > 8 ? payload.slice(8) : Buffer.alloc(0);
        const tryBuf4 = payload.length > 4 ? payload.slice(4) : Buffer.alloc(0);
        const probe8 = this._decodeUtf16CString(tryBuf8);
        const transportBuf = probe8.length > 0 ? tryBuf8 : tryBuf4;
        const transportUtf16 = probe8.length > 0 ? probe8 : this._decodeUtf16CString(tryBuf4);
        const transportAnsi = transportBuf.toString('latin1').replace(/\0+/g, '').trim();
        const transportStr = this._selectTransportString(transportUtf16, transportAnsi);

        const requested = this._parseTransportRequest(transportStr);
        this.debugLog('transport parsed', session.id, JSON.stringify(requested));
        if (requested) {
            session.requestedTransport = requested.protocol || session.requestedTransport;
            session.requestedClientIp = requested.ip;
            session.clientPort = this._sanitizeUdpPort(requested.port);
            session.clientPortCandidates = Array.isArray(requested.ports)
                ? requested.ports.map((p) => this._sanitizeUdpPort(p)).filter((p) => p > 0)
                : (session.clientPort > 0 ? [session.clientPort] : []);
            if (session.clientPort > 0 && session.clientPortCandidates.indexOf(session.clientPort) < 0) {
                session.clientPortCandidates.unshift(session.clientPort);
            }
            session.udpPeerLearnedPort = 0;
            // Do not trust IP inside transport request; use connected peer IP.
            session.clientEndpointIp = this._normalizeIp(socket.remoteAddress);
            this.debugLog(
                'transport endpoint',
                session.id,
                'requestedTransport=' + session.requestedTransport,
                'requestedIp=' + requested.ip,
                'peerIp=' + session.clientEndpointIp,
                'port=' + requested.port,
                'candidates=' + session.clientPortCandidates.join(',')
            );
        }

        const transportToken = String(session.requestedTransport || '').toUpperCase();

        // CUBDD is WebTV's proprietary UDP transport — treat it as UDP-capable but track separately
        // so CUBDD-specific hacks don't bleed into generic MMSU/UDP handling.
        const isCubdd = transportToken === 'CUBDD'
            || /\bCUBDD\b/i.test(transportStr)
            || /\bCUBDD\b/i.test(transportUtf16)
            || /\bCUBDD\b/i.test(transportAnsi);

        const requestedUdp = isCubdd
            || transportToken === 'UDP'
            || transportToken === 'MMSU'
            || /\b(?:UDP|MMSU)\b/i.test(transportStr)
            || /\b(?:UDP|MMSU)\b/i.test(transportUtf16)
            || /\b(?:UDP|MMSU)\b/i.test(transportAnsi);

        session.isCubddTransport = isCubdd;
        session.requestedUdp = requestedUdp;
        this._refreshUdpTransportState(session);

        // If client asked for UDP but we can't enable it (e.g. invalid/out-of-range port),
        // fall back to TCP so we don't leave both transport flags false.
        if (requestedUdp && !session.udpDataEnabled) {
            this.debugLog('transport udp fallback to tcp', session.id,
                'reason=udpDataEnabled=false clientPort=' + session.clientPort);
            session.tcpDataEnabled = true;
        } else {
            session.tcpDataEnabled = !requestedUdp;
        }
        this.debugLog('transport', session.id,
            'token=' + (transportToken || '(unknown)'),
            'tcpDataEnabled=' + session.tcpDataEnabled,
            'udpDataEnabled=' + session.udpDataEnabled,
            'udpPort=' + (session.clientPort || 0),
            'udpPeer=' + (session.clientEndpointIp || '(none)'),
            'udpReady=' + this.udpServerReady);
        this._sendCommand(socket, session, MMS_SERVER_PROTOCOL_ACCEPTED, 0, 0, this._buildTransportAcceptedPayload());
    }

    _handleOpen(socket, session, payload) {
        let requestedUrl = '';
        if (payload.length > 8) {
            requestedUrl = payload.slice(8).toString('utf16le').split('\0')[0].trim();
        }
        this.debugLog('open file', session.id, requestedUrl);

        let mediaStem = requestedUrl
            .replace(/^mms:\/\/[^/]+/i, '')
            .replace(/^\/+/, '');

        session.mediaPath = this.resolveMediaPath(mediaStem);
        console.log(' * [MMS]', `[${session.id}]`, 'Open:', requestedUrl, '->', session.mediaPath || '(not found)');

        if (!session.mediaPath) {
            this._sendCommand(socket, session, MMS_SERVER_FILE_DETAILS, 0x80070002, session.openIncarnation, Buffer.alloc(0));
            socket.end();
            return;
        }

        this._parseAsfHeader(session);

        this._sendCommand(socket, session, MMS_SERVER_FILE_DETAILS, 0, session.openIncarnation, this._buildFileDetailsPayload(session));
    }

    _handleHeaderRequest(socket, session, payload) {
        if (!session.mediaPath) return;
        let requestedInc = 0;
        // _handleCommandPacket passes the reduced ReadBlock payload that starts at offset,
        // so playIncarnation is 32 bytes into that buffer.
        if (payload.length >= 36) {
            requestedInc = payload.readUInt32LE(32) >>> 0;
        }
        session.readBlockIncarnation = requestedInc;
        // Echo the requested playIncarnation for ReportReadBlock/header data packets.
        // If missing/invalid, retain previous value or fall back to legacy packet id.
        if (requestedInc >= 1 && requestedInc <= 0xFE) {
            session.headerIncarnation = requestedInc;
        } else if (!session.headerIncarnation) {
            session.headerIncarnation = MMS_HEADER_PACKET_ID;
        }
        session.headerPacketId = (session.headerIncarnation & 0xFF) || MMS_HEADER_PACKET_ID;
        session.headerPacketsTx = 0;
        this.debugLog(
            'header request',
            session.id,
            'requestedInc=0x' + requestedInc.toString(16),
            'headerIncarnation=0x' + session.headerIncarnation.toString(16),
            'headerPacketId=0x' + session.headerPacketId.toString(16)
        );

        // ReportReadBlock: hr=0, playIncarnation=from ReadBlock, playSequence=0
        const readBlockPayload = Buffer.alloc(4);
        readBlockPayload.writeUInt32LE(0, 0);  // playSequence
        this._sendCommand(socket, session, MMS_SERVER_HEADER_ACCEPTED, 0, session.headerIncarnation, readBlockPayload);

        this._refreshUdpTransportState(session);

        if (!session.tcpDataEnabled && !session.udpDataEnabled) {
            this.debugLog('no data transport available', session.id, 'closing connection');
            socket.end();
            return;
        }

        const asfHeaderBuf = this._readAsfHeader(session);
        if (asfHeaderBuf && asfHeaderBuf.length > 0) {
            this._sendHeaderPackets(socket, session, asfHeaderBuf);
        }
    }

    _handleStart(socket, session, openFileId, payload) {
        if (!session.mediaPath) {
            this.debugLog('start requested but no media path', session.id);
            return;
        }

        const startReq = this._parseStartPlaying(openFileId, payload);
        if (startReq === null) {
            this.debugLog('start payload too short', session.id, 'len=' + payload.length);
            return;
        }

        this._clearPendingEos(session);
        session.mediaIncarnation = startReq.playIncarnation >>> 0;
        session.mediaPacketId = this._resolveMediaPacketId(session);

        const seek = this._resolveStartSeek(session, startReq);
        if (seek) {
            session._nextReadPos = seek.readPos;
            session._nextPacketNumber = seek.packetNumber;
        }

        // Increment generation counter to invalidate pending packets from old seek
        session.seekGeneration = (session.seekGeneration + 1) >>> 0;
        session.packetQueue = [];

        if (session.streaming) {
            this._stopStream(session);
        }

        // Reset Data packet AFFlags sequence for each new StartPlaying sequence.
        session.dataSequence = 0;

        this.debugLog(
            'start stream',
            session.id,
            'mediaIncarnation=0x' + session.mediaIncarnation.toString(16),
            'position=' + (startReq.position === null ? 'unspecified' : startReq.position),
            'asfOffset=' + startReq.asfOffset,
            'locationId=' + startReq.locationId,
            seek ? ('seekPacket=' + seek.packetNumber) : 'seekPacket=0'
        );

        // ReportStartedPlaying: hr=0, playIncarnation=from StartPlaying,
        // tigerFileId=openFileId, unused1=0, unused2=12 bytes zeros
        session.mediaPacketsTx = seek ? seek.packetNumber : 0;
        const startedPayload = Buffer.alloc(20);
        startedPayload.writeUInt32LE(session.openFileId >>> 0, 0);  // tigerFileId
        // unused1 [4] = 0, unused2 [8-19] = 0 (already zeroed)
        this._sendCommand(socket, session, MMS_SERVER_MEDIA_FOLLOWS, 0, session.mediaIncarnation, startedPayload);

        this._refreshUdpTransportState(session);

        if (!session.tcpDataEnabled && !session.udpDataEnabled) {
            this.debugLog('no data transport available', session.id, 'cannot start media');
            return;
        }

        this._startStream(socket, session);
    }

    _handleStop(socket, session, stopIncarnation) {
        this.debugLog('stop stream', session.id);
        this._stopStream(session);
        // Echo back the playIncarnation from StopPlaying (prefix2 of that message)
        const inc = stopIncarnation >>> 0;
        this._sendCommand(socket, session, MMS_SERVER_STREAM_STOPPED, 0, inc, Buffer.alloc(0));
    }

    // -------------------------------------------------------------------------
    // ASF header parsing (minimal – just packet size and bitrate)
    // -------------------------------------------------------------------------

    _parseAsfHeader(session) {
        if (!session.mediaPath) return;

        try {
            const stat = this.wtvshared.fs.statSync(session.mediaPath);
            session.asfFileSize = stat.size;

            // Read first 64 KB to find ASF header objects
            const readLen = Math.min(65536, stat.size);
            const buf = Buffer.alloc(readLen);
            const fd = this.wtvshared.fs.openSync(session.mediaPath, 'r');
            this.wtvshared.fs.readSync(fd, buf, 0, readLen, 0);
            this.wtvshared.fs.closeSync(fd);

            // ASF Header Object GUID: {75B22630-668E-11CF-A6D9-00AA0062CE6C}
            const ASF_HEADER_GUID = Buffer.from([
                0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
                0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
            ]);

            if (!buf.slice(0, 16).equals(ASF_HEADER_GUID)) {
                this.debugLog('not a valid ASF file (bad header GUID)', session.id);
                session.asfDataOffset = 0;
                return;
            }

            // ASF Header Object: GUID(16) + Size(8) + NumHeaders(4) + Reserved(2)
            const headerSize = Number(buf.readBigUInt64LE(16)); // total header size including GUID+size fields

            // Walk sub-objects inside the header
            // ASF File Properties Object GUID: {8CABDCA1-A947-11CF-8EE4-00C00C205365}
            const ASF_FILE_PROPS_GUID = Buffer.from([
                0xA1, 0xDC, 0xAB, 0x8C, 0x47, 0xA9, 0xCF, 0x11,
                0x8E, 0xE4, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65
            ]);

            // ASF Stream Properties Object GUID: {B7DC0791-A9B7-11CF-8EE6-00C00C205365}
            const ASF_STREAM_PROPS_GUID = Buffer.from([
                0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11,
                0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65
            ]);

            // ASF Data Object GUID: {75B22636-668E-11CF-A6D9-00AA0062CE6C}
            const ASF_DATA_GUID = Buffer.from([
                0x36, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11,
                0xA6, 0xD9, 0x00, 0xAA, 0x00, 0x62, 0xCE, 0x6C
            ]);

            let offset = 30; // skip Header Object's GUID(16)+Size(8)+NumHeaders(4)+Reserved(2)
            let maxBitrate = 0;
            let packetSize = 0;
            let dataPacketCount = 0;
            let durationSec = 0;

            while (offset + 24 <= readLen) {
                const objGuid = buf.slice(offset, offset + 16);
                const objSize = Number(buf.readBigUInt64LE(offset + 16));
                if (objSize < 24) break;

                if (objGuid.equals(ASF_FILE_PROPS_GUID) && objSize >= 104) {
                    // ASF File Properties layout after the 24-byte object header:
                    // FileId(16), FileSize(8), CreationDate(8), DataPacketsCount(8),
                    // PlayDuration(8), SendDuration(8), Preroll(8), Flags(4),
                    // MinDataPacketSize(4), MaxDataPacketSize(4), MaxBitrate(4)
                    const playDuration100ns = Number(buf.readBigUInt64LE(offset + 64));
                    const prerollMs = Number(buf.readBigUInt64LE(offset + 80));
                    dataPacketCount = Number(buf.readBigUInt64LE(offset + 56));
                    packetSize = buf.readUInt32LE(offset + 96);
                    maxBitrate = buf.readUInt32LE(offset + 100);
                    const rawDurationSec = playDuration100ns > 0 ? (playDuration100ns / 10000000.0) : 0;
                    durationSec = Math.max(0, rawDurationSec - (prerollMs / 1000.0));
                }

                if (objGuid.equals(ASF_DATA_GUID)) {
                    session.asfDataOffset = offset;
                    break;
                }

                offset += objSize;
            }

            // If we didn't hit the Data GUID in the read window, the data starts right after the header
            if (session.asfDataOffset === 0 && headerSize > 0 && headerSize < session.asfFileSize) {
                session.asfDataOffset = headerSize;
            }

            if (packetSize > 0) session.asfPacketSize = packetSize;
            if (maxBitrate > 0) session.bitrateBps = maxBitrate;
            if (dataPacketCount > 0) session.asfPacketCount = dataPacketCount;
            if (durationSec > 0) session.asfDurationSec = durationSec;

            this.debugLog('ASF parsed', session.id,
                'packetSize=' + session.asfPacketSize,
                'bitrate=' + session.bitrateBps + 'bps',
                'packetCount=' + session.asfPacketCount,
                'durationSec=' + session.asfDurationSec,
                'dataOffset=0x' + session.asfDataOffset.toString(16));

        } catch (e) {
            console.error('[WTVMMS] ASF parse error', session.id, e.message);
            session.asfDataOffset = 0;
        }
    }

    // Read the raw ASF header bytes (everything before the first Data Object)
    _readAsfHeader(session) {
        if (!session.mediaPath || session.asfDataOffset === 0) return null;
        try {
            const headerLength = Math.min(session.asfFileSize, session.asfDataOffset + 50);
            const buf = Buffer.alloc(headerLength);
            const fd  = this.wtvshared.fs.openSync(session.mediaPath, 'r');
            this.wtvshared.fs.readSync(fd, buf, 0, headerLength, 0);
            this.wtvshared.fs.closeSync(fd);
            return buf;
        } catch (e) {
            console.error('[WTVMMS] ASF header read error', e.message);
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Paced streaming
    // -------------------------------------------------------------------------

    
    _computePacketIntervalMs(session) {
        let intervalMs = MIN_PACING_INTERVAL_MS;
        const packetSizeForPacing = (session.effectivePacketSize > 0)
            ? session.effectivePacketSize
            : session.asfPacketSize;
        if (session.bitrateBps > 0 && packetSizeForPacing > 0) {
            intervalMs = Math.max(
                MIN_PACING_INTERVAL_MS,
                (packetSizeForPacing * 8 / session.bitrateBps) * 1000
            );
        }

        const defaultMultiplier = (session.isLegacyClient && !session.udpDataEnabled) ? 0.94 : 1.0;
        const configuredMultiplier = Number(this.service_config.pacing_multiplier);
        const pacingMultiplier = Number.isFinite(configuredMultiplier) && configuredMultiplier > 0
            ? configuredMultiplier
            : defaultMultiplier;

        return Math.max(MIN_PACING_INTERVAL_MS, Math.floor(intervalMs * pacingMultiplier));
    }

    _startStream(socket, session) {
        session.streaming  = true;
        session.paused     = false;
        session.waitingForDrain = false;
        session.effectivePacketSize = 0;
        session.recentPacketSizes = [];
        session.smoothedPacketSize = 0;
        session.pacingSamples = 0;
        session.resendPacketCache.clear();
        session.resendPacketOrder = [];
        session.streamStartWallMs = Date.now();
        session.streamStartPacketIndex = session.mediaPacketsTx || 0;

        const intervalMs = this._computePacketIntervalMs(session);
        session.packetIntervalMs = intervalMs;
        session.nextPacketDueAt = Date.now();

        let burstPrestartMs = typeof this.service_config.burst_prestart_ms === 'number'
            ? this.service_config.burst_prestart_ms
            : 0;
        let burstMultiplier = typeof this.service_config.burst_multiplier === 'number'
            ? this.service_config.burst_multiplier
            : 1;

        const burstEnabled = this.service_config.enable_burst === true;
        if (!burstEnabled) {
            burstPrestartMs = 0;
            burstMultiplier = 1;
        }
        const burstPacketCount = burstPrestartMs > 0 ? Math.ceil(burstPrestartMs / intervalMs) : 0;

        session.burstPacketsRemaining = Math.max(0, burstPacketCount - 1);
        session.burstMultiplier = burstMultiplier > 1 ? burstMultiplier : 1;

        this.debugLog('stream pacing', session.id,
            'interval=' + intervalMs + 'ms',
            'burstPackets=' + session.burstPacketsRemaining,
            'burstMultiplier=' + session.burstMultiplier);

        try {
            session.asfFd = this.wtvshared.fs.openSync(session.mediaPath, 'r');
        } catch (e) {
            console.error('[WTVMMS] failed to open media for streaming', e.message);
            session.streaming = false;
            return;
        }

        const dataStart = session.asfDataOffset + 50;
        if (typeof session._nextReadPos === 'number' && Number.isFinite(session._nextReadPos)) {
            session._readPos = Math.max(dataStart, Math.min(session._nextReadPos, session.asfFileSize));
        } else {
            // Position read head at the start of the ASF Data Object payload.
            // The Data Object itself has a 50-byte preamble before the first packet:
            //   GUID(16) + Size(8) + FileId(16) + TotalDataPackets(8) + Reserved(2) = 50 bytes
            session._readPos = dataStart;
        }
        delete session._nextReadPos;
        delete session._nextPacketNumber;

        // Record which audio timestamp (ms) we started streaming from.
        // Used by _estimateEosDelayMs to know how much audio remains.
        const startByteOffset = Math.max(0, session._readPos - dataStart);
        const startPacketIdx = session.asfPacketSize > 0
            ? Math.floor(startByteOffset / session.asfPacketSize)
            : 0;
        session.streamStartAudioMs = (session.asfPacketCount > 0 && session.asfDurationSec > 0)
            ? Math.floor((startPacketIdx / session.asfPacketCount) * session.asfDurationSec * 1000)
            : 0;

        this._sendNextPacket(socket, session);
    }

    _stopStream(session) {
        session.streaming = false;
        if (session.pacingTimer) {
            clearTimeout(session.pacingTimer);
            session.pacingTimer = null;
        }
        if (session.drainHandler && session.socket && !session.socket.destroyed) {
            session.socket.off('drain', session.drainHandler);
        }
        session.drainHandler = null;
        session.waitingForDrain = false;
        if (session.asfFd !== null) {
            try { this.wtvshared.fs.closeSync(session.asfFd); } catch(_){}
            session.asfFd = null;
        }
        session.packetQueue = [];
        session.resendPacketCache.clear();
        session.resendPacketOrder = [];
        this._clearPendingEos(session);
    }

    _clearPendingEos(session) {
        if (session.eosTimer) {
            clearTimeout(session.eosTimer);
            session.eosTimer = null;
        }
        if (session.eosPingTimer) {
            clearInterval(session.eosPingTimer);
            session.eosPingTimer = null;
        }
    }

    _estimateEosDelayMs(socket, session) {
        if (!session.isLegacyClient) {
            return 0;
        }

        const cfgTail = Number(this.service_config.webtv_eos_tail_ms);
        const cfgMin = Number(this.service_config.webtv_eos_min_delay_ms);
        const cfgMax = Number(this.service_config.webtv_eos_max_delay_ms);

        const tailMs = Number.isFinite(cfgTail) ? Math.max(0, Math.floor(cfgTail)) : 5000;
        const minMs = Number.isFinite(cfgMin) ? Math.max(0, Math.floor(cfgMin)) : 600;

        const totalDurationMs = Math.floor((session.asfDurationSec || 0) * 1000);
        // Default maxMs to the full file duration + tail + 3s safety headroom.
        // This ensures we never clamp a long file to an arbitrary fixed ceiling.
        const defaultMaxMs = Math.max(10000, totalDurationMs + tailMs + 3000);
        const maxMs = Number.isFinite(cfgMax) ? Math.max(minMs, Math.floor(cfgMax)) : defaultMaxMs;

        // The client plays audio in real-time at 1x speed starting from wherever
        // the stream began (seeked or from the top).  After wallElapsedMs of real
        // time the client has consumed that many ms of audio from the seek point.
        // Remaining = (total duration from seek point) - wallElapsed.
        const seekOffsetMs = session.streamStartAudioMs || 0;
        const streamDurationMs = totalDurationMs - seekOffsetMs; // audio from seek → end
        const wallElapsedMs = session.streamStartWallMs
            ? (Date.now() - session.streamStartWallMs)
            : 0;
        const remainingMs = Math.max(0, streamDurationMs - wallElapsedMs);

        const delayMs = Math.max(minMs, Math.min(maxMs, remainingMs + tailMs));

        this.debugLog('eos delay calc', session.id,
            'totalDurationMs=' + totalDurationMs,
            'seekOffsetMs=' + seekOffsetMs,
            'wallElapsedMs=' + wallElapsedMs,
            'remainingMs=' + remainingMs,
            'delayMs=' + delayMs);

        return delayMs;
    }

    _waitForDrain(socket, session) {
        if (session.waitingForDrain || socket.destroyed) return;

        session.waitingForDrain = true;
        session.drainHandler = () => {
            session.waitingForDrain = false;
            session.drainHandler = null;
            if (!session.streaming || socket.destroyed) return;
            this.debugLog('socket drain', session.id, 'writableLength=' + socket.writableLength);
            this._scheduleNextPacket(session, socket);
        };
        socket.once('drain', session.drainHandler);
    }

    _scheduleNextPacket(session, socket) {
        if (!session.streaming || session.paused) return;

        const writeOk = this._flushQueuedPackets(socket, session);
        if (!writeOk) {
            this._waitForDrain(socket, session);
            return;
        }

        let intervalMs = session.packetIntervalMs || this._computePacketIntervalMs(session);

        if (session.burstPacketsRemaining > 0 && session.burstMultiplier > 1) {
            intervalMs = Math.max(
                MIN_PACING_INTERVAL_MS,
                Math.floor(intervalMs / session.burstMultiplier)
            );
            session.burstPacketsRemaining--;
        }

        const now = Date.now();
        session.nextPacketDueAt = (session.nextPacketDueAt || now) + intervalMs;
        const delayMs = Math.max(MIN_PACING_INTERVAL_MS, session.nextPacketDueAt - now);

        if (session.mediaPacketsTx < 4 || (session.mediaPacketsTx % 64) === 0) {
            this.debugLog('pace next', session.id,
                'in=' + delayMs + 'ms',
                'packet=' + session.mediaPacketsTx,
                'readPos=0x' + session._readPos.toString(16));
        }

        session.pacingTimer = setTimeout(() => {
            session.pacingTimer = null;
            this._sendNextPacket(socket, session);
        }, delayMs);
    }

    _sendNextPacket(socket, session) {
        if (!session.streaming || socket.destroyed) {
            this._stopStream(session);
            return;
        }
        if (session.waitingForDrain) {
            return;
        }

        const pktSize = session.asfPacketSize;
        const buf     = Buffer.alloc(pktSize);

        let bytesRead = 0;
        try {
            bytesRead = this.wtvshared.fs.readSync(session.asfFd, buf, 0, pktSize, session._readPos);
        } catch (e) {
            this.debugLog('read error', session.id, e.message);
            this._endStream(socket, session);
            return;
        }

        if (bytesRead === 0) {
            // End of file
            this._endStream(socket, session);
            return;
        }

        session._readPos += bytesRead;

        const packetBuf = bytesRead < pktSize ? buf.slice(0, bytesRead) : buf;
        const strippedBuf = this._stripAsfPacketPadding(packetBuf, session);

        const txSize = strippedBuf.length;

        // Track transmitted packet sizes for adaptive pacing
        if (txSize > 0) {
            session.recentPacketSizes.push(txSize);
            if (session.recentPacketSizes.length > 20) {
                session.recentPacketSizes.shift();
            }

            // Compute smoothed (median) packet size from recent samples
            const sorted = [...session.recentPacketSizes].sort((a, b) => a - b);
            session.smoothedPacketSize = sorted[Math.floor(sorted.length / 2)];
            session.pacingSamples = session.recentPacketSizes.length;

            // Only adjust pacing interval if the transmitted size differs significantly from expected
            // (e.g., due to padding stripping). Use smoothed size to avoid jitter.
            const paceSize = session.effectivePacketSize > 0 ? session.effectivePacketSize : session.asfPacketSize;
            if (Math.abs(txSize - paceSize) > 10) {
                session.effectivePacketSize = txSize;
                const oldInterval = session.packetIntervalMs;
                session.packetIntervalMs = this._computePacketIntervalMs(session);
                if (session.mediaPacketsTx <= 4 || (session.mediaPacketsTx % 64) === 0) {
                    this.debugLog('pace adjust', session.id,
                        'txSize=' + txSize,
                        'old=' + oldInterval + 'ms',
                        'new=' + session.packetIntervalMs + 'ms',
                        'smoothed=' + session.smoothedPacketSize);
                }
                session.nextPacketDueAt = Date.now();
            }
        }

        const afFlags = this._nextDataFlags(session);
        const writeOk = this._sendDataPacket(socket, session, session.mediaPacketId, afFlags, strippedBuf, false);
        if (!writeOk) {
            this._waitForDrain(socket, session);
            return;
        }
        this._scheduleNextPacket(session, socket);
    }

    _endStream(socket, session) {
        const eosDelayMs = this._estimateEosDelayMs(socket, session);
        this.debugLog('end of stream', session.id, 'eosDelayMs=' + eosDelayMs);

        this._stopStream(session);

        if (eosDelayMs <= 0) {
            this._sendCommand(socket, session, MMS_SERVER_STREAM_STOPPED, 0, session.mediaIncarnation || 0, Buffer.alloc(0));
            return;
        }

        const cfgPingIntervalMs = Number(this.service_config.webtv_eos_ping_interval_ms);
        const eosPingIntervalMs = Number.isFinite(cfgPingIntervalMs)
            ? Math.max(0, Math.floor(cfgPingIntervalMs))
            : 3000;

        if (eosPingIntervalMs > 0) {
            session.eosPingTimer = setInterval(() => {
                if (socket.destroyed || session.streaming || !session.eosTimer) {
                    if (session.eosPingTimer) {
                        clearInterval(session.eosPingTimer);
                        session.eosPingTimer = null;
                    }
                    return;
                }
                // LinkMacToViewerPing (MID=0x0004001B) over MMST command channel.
                this._sendCommand(socket, session, MMS_SERVER_KEEPALIVE, 0, 0, Buffer.alloc(0));
                this.debugLog('eos keepalive ping', session.id, 'intervalMs=' + eosPingIntervalMs);
            }, eosPingIntervalMs);
        }

        session.eosTimer = setTimeout(() => {
            session.eosTimer = null;
            if (session.eosPingTimer) {
                clearInterval(session.eosPingTimer);
                session.eosPingTimer = null;
            }
            if (!socket.destroyed && !session.streaming) {
                this._sendCommand(socket, session, MMS_SERVER_STREAM_STOPPED, 0, session.mediaIncarnation || 0, Buffer.alloc(0));
            }
        }, eosDelayMs);
    }

    // Parse one fixed-size ASF data packet, remove trailing padding, and return
    // the compact payload.  Per MMS spec §3.2.5.11.1, Padding Data SHOULD be
    // stripped before MMST encapsulation and the Padding Length field MUST be
    // updated to reflect the removal.
    _stripAsfPacketPadding(buf, session) {
        if (!buf || buf.length < 6) return buf;

        // Locate Length Type Flags byte, skipping optional error correction header.
        let ltFlagsOffset = 0;
        const byte0 = buf[0];
        if (byte0 & 0x80) {
            // Error Correction Present (bit 7 = 1).
            // Bits 5-6 = EC Length Type; 00 means bits 0-3 carry the data length.
            const ecLenType = (byte0 >> 5) & 0x03;
            const ecDataLen = ecLenType === 0 ? (byte0 & 0x0F) : 0;
            ltFlagsOffset = 1 + ecDataLen;
        }

        if (ltFlagsOffset + 2 > buf.length) return buf;

        const ltFlags    = buf[ltFlagsOffset];
        const padLenType = (ltFlags >> 3) & 0x03; // bits 3-4
        const seqType    = (ltFlags >> 1) & 0x03; // bits 1-2
        const pktLenType = (ltFlags >> 5) & 0x03; // bits 5-6

        if (padLenType === 0) return buf; // no Padding Length field → nothing to strip

        // Byte widths for each type value (0=absent,1=BYTE,2=WORD,3=DWORD)
        const typeSize = [0, 1, 2, 4];

        // After LTFlags(1) + PropFlags(1) come the optional variable-width fields.
        let fieldOffset = ltFlagsOffset + 2;
        fieldOffset += typeSize[pktLenType]; // optional Packet Length
        fieldOffset += typeSize[seqType];    // optional Sequence

        const padLenSize = typeSize[padLenType];
        if (fieldOffset + padLenSize > buf.length) return buf;

        // Read the declared padding length.
        let paddingLen;
        if      (padLenSize === 1) paddingLen = buf.readUInt8(fieldOffset);
        else if (padLenSize === 2) paddingLen = buf.readUInt16LE(fieldOffset);
        else                       paddingLen = buf.readUInt32LE(fieldOffset);

        if (paddingLen === 0) return buf; // already no padding

        const configuredMinStrip = Number(this.service_config.asf_padding_strip_min_bytes);
        const minStripBytes = Number.isFinite(configuredMinStrip) && configuredMinStrip >= 0
            ? Math.floor(configuredMinStrip)
            : 8;
        if (paddingLen < minStripBytes) {
            return buf;
        }

        const newLen = buf.length - paddingLen;
        // Sanity: compacted packet must still hold the header fields we parsed.
        if (newLen < fieldOffset + padLenSize + 6) {
            this.debugLog('asf strip sanity fail', session && session.id,
                'bufLen=' + buf.length, 'paddingLen=' + paddingLen);
            return buf;
        }

        // Copy the packet, zero the Padding Length field, and trim trailing padding.
        const out = Buffer.from(buf.buffer, buf.byteOffset, buf.length);
        if      (padLenSize === 1) out.writeUInt8(0, fieldOffset);
        else if (padLenSize === 2) out.writeUInt16LE(0, fieldOffset);
        else                       out.writeUInt32LE(0, fieldOffset);

        return out.slice(0, newLen);
    }

    // -------------------------------------------------------------------------
    // Packet builders
    // -------------------------------------------------------------------------

    _buildCommandPacket(session, cmdId, prefix1, prefix2, payloadBuf) {
        const payload = payloadBuf || Buffer.alloc(0);
        const paddedPayloadLength = (payload.length + 7) & ~7;
        const payloadBlocks = paddedPayloadLength >> 3;
        const totalLength = MMS_COMMAND_HEADER_SIZE + paddedPayloadLength;
        const packet = Buffer.alloc(totalLength);

        packet.writeUInt32LE(1, 0);
        packet.writeUInt32LE(MMS_MAGIC, 4);
        packet.writeUInt32LE(totalLength - 16, 8);
        packet.writeUInt32LE(MMS_PROTOCOL, 12);
        packet.writeUInt32LE(payloadBlocks + 6, 16);
        packet.writeUInt16LE(session.commandSeq++ & 0xFFFF, 20);
        packet.writeUInt16LE(0, 22);
        packet.writeUInt32LE(0, 24);
        packet.writeUInt32LE(0, 28);
        packet.writeUInt32LE(payloadBlocks + 2, 32);
        packet.writeUInt32LE((MMS_DIRECTION_TO_CLIENT << 16) | (cmdId & 0xffff), 36);
        packet.writeUInt32LE(prefix1 >>> 0, 40);
        packet.writeUInt32LE(prefix2 >>> 0, 44);
        payload.copy(packet, MMS_COMMAND_HEADER_SIZE);

        return packet;
    }

    _sendCommand(socket, session, cmdId, prefix1, prefix2, payloadBuf) {
        if (socket.destroyed) return;

        const pkt = this._buildCommandPacket(session, cmdId, prefix1, prefix2, payloadBuf);
        this.debugLog('tx cmd', session.id, '0x' + cmdId.toString(16), 'len=' + pkt.length), 'to='+socket.remoteAddress+":"+socket.remotePort;
        socket.write(pkt);
        session.bytesTx += pkt.length;
        if (cmdId === MMS_SERVER_KEEPALIVE) {
            session.lastKeepaliveTxMs = Date.now();
        }
    }

    _handleClientKeepalive(socket, session, prefix1, prefix2) {
        // During delayed EOS we already transmit periodic keepalives; if we also
        // answer every client keepalive immediately, both sides can get into a
        // noisy ping-pong loop. Throttle replies while EOS wait is active.
        if (session.eosTimer) {
            const cfgPingIntervalMs = Number(this.service_config.webtv_eos_ping_interval_ms);
            const eosPingIntervalMs = Number.isFinite(cfgPingIntervalMs)
                ? Math.max(1000, Math.floor(cfgPingIntervalMs))
                : 3000;
            const minReplyGapMs = Math.max(1000, eosPingIntervalMs - 500);
            const now = Date.now();
            const sinceLastTx = now - (session.lastKeepaliveTxMs || 0);

            if (sinceLastTx < minReplyGapMs) {
                this.debugLog('keepalive throttled', session.id,
                    'sinceLastTxMs=' + sinceLastTx,
                    'minReplyGapMs=' + minReplyGapMs,
                    'p1=0x' + (prefix1 >>> 0).toString(16),
                    'p2=0x' + (prefix2 >>> 0).toString(16));
                return;
            }
        }

        this._sendCommand(socket, session, MMS_SERVER_KEEPALIVE, 0, 0, Buffer.alloc(0));
    }

    _sendCommandBatch(socket, session, commands) {
        if (socket.destroyed || !Array.isArray(commands) || commands.length === 0) return;

        const packets = [];
        for (const command of commands) {
            const pkt = this._buildCommandPacket(
                session,
                command.cmdId,
                command.prefix1,
                command.prefix2,
                command.payloadBuf
            );
            this.debugLog('tx cmd', session.id, '0x' + command.cmdId.toString(16), 'len=' + pkt.length);
            packets.push(pkt);
            session.bytesTx += pkt.length;
        }

        socket.write(Buffer.concat(packets));
    }

    _sendHeaderPackets(socket, session, headerBuf) {
        const configuredChunkSize = Number(this.service_config.header_chunk_size);
        const maxPayload = Math.max(
            256,
            Math.min(
                0xFFFF - 8,
                Number.isFinite(configuredChunkSize) && configuredChunkSize > 0 ? Math.floor(configuredChunkSize) : 1400
            )
        );
        let offset = 0;
        let count = 0;

        while (offset < headerBuf.length && !socket.destroyed) {
            const remaining = headerBuf.length - offset;
            const chunkLength = Math.min(maxPayload, remaining);
            const flags = offset + chunkLength < headerBuf.length ? MMS_HEADER_FLAG_MORE : MMS_HEADER_FLAG_FINAL;
            this._sendDataPacket(socket, session, session.headerPacketId, flags, headerBuf.slice(offset, offset + chunkLength), true);
            offset += chunkLength;
            count++;
        }

        this.debugLog('header sent', session.id,
            'packets=' + count,
            'bytes=' + headerBuf.length,
            'headerPacketId=0x' + session.headerPacketId.toString(16));
    }

    _sendDataPacket(socket, session, packetId, flags, payloadBuf, isHeaderPacket = false) {
        if (socket.destroyed) return false;

        const payload = payloadBuf || Buffer.alloc(0);
        const totalLength = 8 + payload.length;
        const pkt = Buffer.alloc(totalLength);

        // LocationId: independent per-type sequence starting at 0.
        // For header payloads: 0, 1, 2, ... per header stream.
        // For data payloads: ASF data packet number starting at 0.
        const isHeader = isHeaderPacket;
        const locationId = isHeader ? session.headerPacketsTx : session.mediaPacketsTx;

        pkt.writeUInt32LE(locationId, 0);
        pkt.writeUInt8(packetId & 0xff, 4);
        pkt.writeUInt8(flags & 0xff, 5);
        pkt.writeUInt16LE(totalLength, 6);
        payload.copy(pkt, 8);

        if (isHeader) session.headerPacketsTx++;
        else if (packetId === session.mediaPacketId) session.mediaPacketsTx++;

        if (!isHeader && packetId === session.mediaPacketId) {
            const resendSeq = session.dataAfMode === 'sequence'
                ? (session.lastDataSequenceTx >>> 0)
                : (locationId >>> 0);
            this._cacheResendPacket(session, resendSeq, pkt);
        }

        const shouldLog = isHeader
            ? true
            : session.mediaPacketsTx <= 4 || (session.mediaPacketsTx % 64) === 0;

        if (shouldLog) {
            const previewLength = Math.min(8, payload.length);
            const preview = previewLength > 0 ? payload.subarray(0, previewLength).toString('hex') : '';
            this.debugLog('tx data', 
                (session.udpDataEnabled ? 'UDP' : (session.tcpDataEnabled) ? 'TCP' : '???'),
                'locationId=' + locationId,
                'packetId=0x' + packetId.toString(16),
                'flags=0x' + flags.toString(16),
                'packetSizeField=' + totalLength,
                'payload=' + payload.length,
                preview ? 'preview=' + preview : '');
        }

        if (session.udpDataEnabled) {
            this._sendUdpDataPacket(session, pkt, packetId, locationId, flags, payload.length);
            return true;
        }

        if (isHeader) {
            const writeOk = socket.write(pkt);
            if (!writeOk && shouldLog) {
                this.debugLog('socket buffered', session.id,
                    'packetId=0x' + packetId.toString(16),
                    'writableLength=' + socket.writableLength);
            }
            session.bytesTx += pkt.length;
            return writeOk;
        }

        session.packetQueue.push({
            buffer: pkt,
            generation: session.seekGeneration,
        });
        return true;
    }

    _sendUdpDataPacket(session, packetBuf, packetId, locationId, flags, payloadLen) {
        if (!this.udpServer || !session || !session.clientEndpointIp || !session.clientPort) {
            this.debugLog('udp send skipped', session && session.id,
                'packetId=0x' + packetId.toString(16),
                'peer=' + ((session && session.clientEndpointIp) || '(none)'),
                'port=' + ((session && session.clientPort) || 0));
            return;
        }

        const configuredProbePackets = Number(this.service_config.udp_probe_alt_ports_packets);
        const probeAltPortsPackets = Number.isFinite(configuredProbePackets)
            ? Math.max(0, Math.floor(configuredProbePackets))
            : 96;

        const primaryPort = session.clientPort >>> 0;
        const targetPorts = [primaryPort];

        if (!session.udpPeerLearnedPort && probeAltPortsPackets > 0 && session.mediaPacketsTx <= probeAltPortsPackets) {
            const alternates = Array.isArray(session.clientPortCandidates)
                ? session.clientPortCandidates
                : [];
            for (const candidate of alternates) {
                const p = this._sanitizeUdpPort(candidate);
                if (p > 0 && targetPorts.indexOf(p) < 0) {
                    targetPorts.push(p);
                }
            }
        }

        const host = session.clientEndpointIp;
        for (const port of targetPorts) {
            this.udpServer.send(packetBuf, 0, packetBuf.length, port, host, (err) => {
                if (err) {
                    this.debugLog('udp send error', session.id,
                        'packetId=0x' + packetId.toString(16),
                        'port=' + port,
                        err.message);
                }
            });
        }

        session.bytesTx += packetBuf.length;
    }

    _cacheResendPacket(session, sequenceNumber, packetBuf) {
        if (!session || !Buffer.isBuffer(packetBuf)) return;

        const configuredCacheSize = Number(this.service_config.udp_retransmit_cache_size);
        const maxCacheSize = Number.isFinite(configuredCacheSize)
            ? Math.max(128, Math.floor(configuredCacheSize))
            : 4096;

        const seq = sequenceNumber >>> 0;
        if (!session.resendPacketCache.has(seq)) {
            session.resendPacketOrder.push(seq);
        }

        session.resendPacketCache.set(seq, {
            packet: Buffer.from(packetBuf),
            ts: Date.now(),
        });

        while (session.resendPacketOrder.length > maxCacheSize) {
            const dropSeq = session.resendPacketOrder.shift();
            session.resendPacketCache.delete(dropSeq);
        }
    }

    _lookupResendPacket(session, sequenceNumber) {
        if (!session) return null;

        const seq = sequenceNumber >>> 0;
        const direct = session.resendPacketCache.get(seq);
        if (direct && Buffer.isBuffer(direct.packet)) {
            return direct.packet;
        }

        // Some clients may only preserve the low 8 bits from AFFlags.
        const low8 = seq & 0xFF;
        for (let i = session.resendPacketOrder.length - 1; i >= 0; i--) {
            const candidateSeq = session.resendPacketOrder[i] >>> 0;
            if ((candidateSeq & 0xFF) !== low8) continue;
            const candidate = session.resendPacketCache.get(candidateSeq);
            if (candidate && Buffer.isBuffer(candidate.packet)) {
                return candidate.packet;
            }
        }

        return null;
    }

    _handleUdpDatagram(msg, rinfo) {
        if (!Buffer.isBuffer(msg) || msg.length === 0) {
            return;
        }

        this._learnUdpPeerPort(rinfo);

        if (msg.length < 12) {
            this.debugLog('udp rx', rinfo.address + ':' + rinfo.port, 'len=' + msg.length);
            return;
        }

        const resendReq = this._parseRequestPacketListResend(msg);
        if (!resendReq) {
            this.debugLog('udp rx', rinfo.address + ':' + rinfo.port, 'len=' + msg.length);
            return;
        }

        const peerIp = this._normalizeIp(rinfo.address);
        let targetSession = null;

        for (const session of this.sessions.values()) {
            if (!session || !session.udpDataEnabled || !session.requestedUdp) continue;
            if (this._normalizeIp(session.clientEndpointIp) !== peerIp) continue;
            if ((session.clientId >>> 0) !== resendReq.clientId) continue;
            if (((session.openFileId || 0) & 0xFFFF) !== resendReq.sourceId) continue;

            // If we already learned a client media port, require it to match.
            if (session.clientPort > 0 && session.clientPort !== rinfo.port) {
                continue;
            }

            targetSession = session;
            break;
        }

        if (!targetSession) {
            this.debugLog('udp resend no session',
                'from=' + peerIp + ':' + rinfo.port,
                'clientId=0x' + resendReq.clientId.toString(16),
                'sourceId=0x' + resendReq.sourceId.toString(16),
                'count=' + resendReq.packetList.length);
            return;
        }

        let resent = 0;
        let missing = 0;
        for (const sequenceNumber of resendReq.packetList) {
            const packet = this._lookupResendPacket(targetSession, sequenceNumber);
            if (!packet) {
                missing++;
                continue;
            }

            this.udpServer.send(packet, 0, packet.length, targetSession.clientPort >>> 0, targetSession.clientEndpointIp, (err) => {
                if (err) {
                    this.debugLog('udp resend send error', targetSession.id,
                        'seq=' + (sequenceNumber >>> 0),
                        err.message);
                }
            });
            targetSession.bytesTx += packet.length;
            resent++;
        }

        this.debugLog('udp resend', targetSession.id,
            'requested=' + resendReq.packetList.length,
            'resent=' + resent,
            'missing=' + missing,
            'from=' + peerIp + ':' + rinfo.port);
    }

    _parseRequestPacketListResend(msg) {
        if (!Buffer.isBuffer(msg) || msg.length < 12) return null;

        const MMS_RETRANSMIT_SIGNATURE = 0xBEEFF00D;
        let littleEndian = true;
        if (msg.readUInt32LE(0) !== MMS_RETRANSMIT_SIGNATURE) {
            if (msg.readUInt32BE(0) !== MMS_RETRANSMIT_SIGNATURE) {
                return null;
            }
            littleEndian = false;
        }

        const readU32 = (offset) => littleEndian ? msg.readUInt32LE(offset) : msg.readUInt32BE(offset);
        const readU16 = (offset) => littleEndian ? msg.readUInt16LE(offset) : msg.readUInt16BE(offset);

        const clientId = readU32(4) >>> 0;
        const sourceId = readU16(8) >>> 0;
        const numPackets = readU16(10) >>> 0;
        if (numPackets < 1 || numPackets > 32) {
            return null;
        }

        const expectedLen = 12 + (numPackets * 4);
        if (msg.length < expectedLen) {
            return null;
        }

        const packetList = [];
        let offset = 12;
        for (let i = 0; i < numPackets; i++) {
            packetList.push(readU32(offset) >>> 0);
            offset += 4;
        }

        return {
            clientId,
            sourceId,
            packetList,
        };
    }

    _flushQueuedPackets(socket, session) {
        if (socket.destroyed || session.packetQueue.length === 0) {
            return true;
        }

        const currentGen = session.seekGeneration;
        let writeOk = true;

        while (session.packetQueue.length > 0) {
            const queuedPacket = session.packetQueue[0];
            if (queuedPacket.generation !== currentGen) {
                session.packetQueue.shift();
                continue;
            }

            writeOk = socket.write(queuedPacket.buffer);
            session.bytesTx += queuedPacket.buffer.length;
            session.packetQueue.shift();
            if (!writeOk) return false;
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Individual response payload builders
    // -------------------------------------------------------------------------

    _utf16leBuffer(str) {
        return Buffer.from((str || '') + '\0', 'utf16le');
    }

    _decodeUtf16CString(buf) {
        if (!buf || buf.length === 0) return '';

        let end = buf.length;
        for (let offset = 0; offset + 1 < buf.length; offset += 2) {
            if (buf.readUInt16LE(offset) === 0) {
                end = offset;
                break;
            }
        }

        return buf.slice(0, end).toString('utf16le').trim();
    }

    _normalizeIp(remoteAddress) {
        if (!remoteAddress) return '';
        return remoteAddress.startsWith('::ffff:') ? remoteAddress.slice(7) : remoteAddress;
    }

    _selectTransportString(utf16Str, ansiStr) {
        const a = (utf16Str || '').trim();
        const b = (ansiStr || '').trim();
        const score = (s) => {
            let v = 0;
            if (!s) return v;
            if (s.includes('\\')) v += 2;
            if (/\b(?:CUBDD|MMSU|UDP|TCP)\b/i.test(s)) v += 2;
            if (/\\\d+/.test(s)) v += 1;
            return v;
        };
        return score(a) >= score(b) ? a : b;
    }

    _parseTransportRequest(transportStr) {
        if (!transportStr) return null;
        const ipMatch = transportStr.match(/\\([^\\]+)/);
        const ip = ipMatch ? ipMatch[1] : '';
        const protocol = this._inferTransportToken(transportStr) || '';

        let port = 0;
        const candidatePorts = [];
        if (protocol) {
            const tokenPortRegex = new RegExp('\\\\' + protocol + '(?:\\\\(\\d+))+', 'ig');
            let tokenMatch;
            while ((tokenMatch = tokenPortRegex.exec(transportStr)) !== null) {
                const numericParts = tokenMatch[0].match(/\\(\\d+)/g) || [];
                for (const numericPart of numericParts) {
                    const parsed = parseInt(numericPart.slice(1), 10);
                    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
                        candidatePorts.push(parsed);
                    }
                }
            }
        }

        if (candidatePorts.length === 0) {
            const fallbackPortRegex = /\\(?:CUBDD|MMSU|UDP|TCP)\\(\d+)/ig;
            let fallbackMatch;
            while ((fallbackMatch = fallbackPortRegex.exec(transportStr)) !== null) {
                const parsed = parseInt(fallbackMatch[1], 10);
                if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
                    candidatePorts.push(parsed);
                }
            }
        }

        // Prefer the first valid candidate as initial target, then probe alternates.
        if (candidatePorts.length > 0) {
            port = candidatePorts[0];
        }

        if (!ip && !protocol && !port) return null;
        return {
            ip,
            protocol,
            port,
            ports: [...new Set(candidatePorts)],
        };
    }

    _learnUdpPeerPort(rinfo) {
        if (!rinfo || !Number.isInteger(rinfo.port)) return;
        const peerIp = this._normalizeIp(rinfo.address);
        const learnedPort = this._sanitizeUdpPort(rinfo.port);
        if (!peerIp || learnedPort <= 0) return;

        const matchingSessions = [];
        for (const session of this.sessions.values()) {
            if (!session || !session.requestedUdp) continue;
            if (this._normalizeIp(session.clientEndpointIp) !== peerIp) continue;
            matchingSessions.push(session);
        }

        if (matchingSessions.length !== 1) {
            return;
        }

        const session = matchingSessions[0];
        if (session.udpPeerLearnedPort === learnedPort && session.clientPort === learnedPort) {
            return;
        }

        const previousPort = session.clientPort;
        session.udpPeerLearnedPort = learnedPort;
        session.clientPort = learnedPort;
        if (!Array.isArray(session.clientPortCandidates)) {
            session.clientPortCandidates = [];
        }
        if (session.clientPortCandidates.indexOf(learnedPort) < 0) {
            session.clientPortCandidates.unshift(learnedPort);
        }
        this._refreshUdpTransportState(session);

        this.debugLog('udp peer learned', session.id,
            'oldPort=' + (previousPort || 0),
            'newPort=' + learnedPort,
            'ip=' + peerIp);
    }

    _sanitizeUdpPort(port) {
        const parsed = Number(port);
        return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : 0;
    }

    _refreshUdpTransportState(session) {
        if (!session) return;
        const udpEnabledByConfig = this.service_config.enable_udp !== false;
        session.clientPort = this._sanitizeUdpPort(session.clientPort);
        session.udpDataEnabled = !!session.requestedUdp
            && udpEnabledByConfig
            && !!this.udpServer
            && !!this.udpServerReady
            && session.clientPort > 0
            && !!session.clientEndpointIp;
    }

    _inferTransportToken(transportStr) {
        if (!transportStr) return '';
        const upper = String(transportStr).toUpperCase();
        // Prioritize UDP-like transports over TCP when both appear.
        if (upper.includes('\\CUBDD\\')) return 'CUBDD';
        if (upper.includes('\\MMSU\\')) return 'MMSU';
        if (upper.includes('\\UDP\\')) return 'UDP';
        if (upper.includes('\\TCP\\')) return 'TCP';
        return '';
    }

    _resolveDataAfMode(session) {
        const mode = String(this.service_config?.data_af_mode || 'auto').toLowerCase();
        if (mode === 'zero' || mode === 'sequence') return mode;
        return session.isLegacyClient ? 'sequence' : 'zero';
    }

    _resolveMediaPacketId(session) {
        const mode = String(this.service_config?.media_packet_id_mode || 'auto').toLowerCase();
        if (mode === 'fixed') return MMS_MEDIA_PACKET_ID;
        if (mode === 'incarnation') return session.mediaIncarnation & 0xFF;
        return session.isLegacyClient
            ? (session.mediaIncarnation & 0xFF)
            : MMS_MEDIA_PACKET_ID;
    }

    _nextDataFlags(session) {
        if (session.dataAfMode === 'sequence') {
            const sequence = session.dataSequence >>> 0;
            const flags = sequence & 0xFF;
            session.lastDataSequenceTx = sequence;
            session.dataSequence = (sequence + 1) >>> 0;
            return flags;
        }
        session.lastDataSequenceTx = session.mediaPacketsTx >>> 0;
        return 0x00;
    }

    _parseStartPlaying(openFileId, payload) {
        // _handleCommandPacket passes the reduced StartPlaying payload that begins at position(8).
        if (!payload || payload.length < 24) return null;

        const rawPosition = payload.readDoubleLE(0);
        const asfOffset = payload.readUInt32LE(8) >>> 0;
        const locationId = payload.readUInt32LE(12) >>> 0;
        const frameOffset = payload.readUInt32LE(16) >>> 0;
        const playIncarnation = payload.readUInt32LE(20) >>> 0;
        const position = Number.isFinite(rawPosition) && rawPosition >= 0 && rawPosition < 1e300
            ? rawPosition
            : null;

        return {
            openFileId: openFileId >>> 0,
            position,
            asfOffset,
            locationId,
            frameOffset,
            playIncarnation,
        };
    }

    _resolveStartSeek(session, startReq) {
        if (!startReq || !session.mediaPath) return null;

        const dataStart = session.asfDataOffset + 50;
        const maxPacketSize = Math.max(1, session.asfPacketSize >>> 0);
        const maxMediaBytes = Math.max(0, session.asfFileSize - dataStart);
        const maxPacketFromBytes = maxMediaBytes > 0
            ? Math.max(0, Math.floor((maxMediaBytes - 1) / maxPacketSize))
            : 0;
        const maxPacketFromHeader = session.asfPacketCount > 0
            ? Math.max(0, (session.asfPacketCount >>> 0) - 1)
            : maxPacketFromBytes;
        const maxPacketNumber = Math.max(maxPacketFromBytes, maxPacketFromHeader);

        const clampPacketNumber = (value) => {
            const n = Number.isFinite(value) ? Math.floor(value) : 0;
            return Math.max(0, Math.min(n, maxPacketNumber));
        };

        let packetNumber = 0;
        let readPos = dataStart;
        let seekSource = 'default';

        if (startReq.locationId !== 0 && startReq.locationId !== 0xFFFFFFFF) {
            packetNumber = clampPacketNumber(startReq.locationId >>> 0);
            readPos = dataStart + (packetNumber * maxPacketSize);
            seekSource = 'locationId';
            this.debugLog('seek resolve', session.id, seekSource, 'packet=' + packetNumber, 'readPos=0x' + readPos.toString(16));
            return {
                packetNumber,
                readPos: Math.min(readPos, session.asfFileSize),
            };
        }

        if (startReq.asfOffset !== 0 && startReq.asfOffset !== 0xFFFFFFFF) {
            const requested = Math.max(dataStart, startReq.asfOffset >>> 0);
            const relative = Math.max(0, requested - dataStart);
            packetNumber = clampPacketNumber(Math.floor(relative / maxPacketSize));
            readPos = dataStart + (packetNumber * maxPacketSize);
            seekSource = 'asfOffset';
            this.debugLog('seek resolve', session.id, seekSource, 'packet=' + packetNumber, 'readPos=0x' + readPos.toString(16));
            return {
                packetNumber,
                readPos: Math.min(readPos, session.asfFileSize),
            };
        }

        if (Number.isFinite(startReq.position) && startReq.position > 0 && startReq.position < 1e300) {
            if (session.asfPacketCount > 0 && session.asfDurationSec > 0) {
                const ratio = Math.max(0, Math.min(1, startReq.position / session.asfDurationSec));
                packetNumber = clampPacketNumber(Math.floor(ratio * session.asfPacketCount));
                readPos = dataStart + (packetNumber * maxPacketSize);
                seekSource = 'position-duration';
            } else if (session.bitrateBps > 0) {
                const bytePos = Math.floor((startReq.position * session.bitrateBps) / 8);
                const clamped = Math.max(0, Math.min(bytePos, maxMediaBytes));
                packetNumber = clampPacketNumber(Math.floor(clamped / maxPacketSize));
                readPos = dataStart + (packetNumber * maxPacketSize);
                seekSource = 'position-bitrate';
            }
        }

        this.debugLog('seek resolve', session.id, seekSource, 'packet=' + packetNumber, 'readPos=0x' + readPos.toString(16));

        return {
            packetNumber,
            readPos: Math.min(readPos, session.asfFileSize),
        };
    }

    _buildConnectAcceptedPayload(session) {
        // LinkMacToViewerReportConnectedEX
        const isLegacyClient = /^NSPlayer\/6\./i.test(session?.clientPlayer || '');
        const serverVersion = this._utf16leBuffer(this.majorVersion + '.' + this.minorVersion);
        const playerMinVersion = this._utf16leBuffer(''); // no minimum version
        const updatePlayerUrl = this._utf16leBuffer('');
        const AuthenPackage = this._utf16leBuffer('');
        const configUdp = (this.service_config.enable_udp === false) ? false : true;
        const failure = (!configUdp && session.requestedUdp) || (configUdp && session.requestedUdp) || (!session.requestedUdp && !session.requestedTcp);
        
        const header = Buffer.alloc(48);
        header.writeUInt32LE(header.length / 8, 0);            // chunkLength in 8-byte blocks
        header.writeUInt32LE(0x00040001, 4);                   // MessageID
        header.writeUInt32LE((failure ? 0xC00D0005 : 0x00000000), 8);            // HRESULT (StatusCode) (NS_E_NOCONNECTION if failure = true, 0 = false)
        header.writeUInt32LE(MMS_DISABLE_PACKET_PAIR, 12);     // playIncaration (packet-pair support)
        header.writeUInt32LE(0x0004000B, 16);                  // MacToViewerProtocolRevision
        header.writeUInt32LE(0x0003001C, 20);                  // ViewerToMacProtocolRevision
        header.writeDoubleLE(1.0, 8);                          // blockGroupPlayTime = 1.0
        header.writeUInt32LE(0x00000001, 16);                  // blockGroupBlocks
        header.writeUInt32LE(0x00000001, 20);                  // nMaxOpenFiles
        header.writeUInt32LE(0x00008000, 24);                  // nBlockMaxBytes
        header.writeUInt32LE(0x00989680, 28);                  // maxBitRate
        header.writeUInt32LE(serverVersion.length / 2, 32);               // cbServerVersionInfo (Unicode chars)
        header.writeUInt32LE(playerMinVersion.length / 2, 36);            // cbVersionInfo
        header.writeUInt32LE(updatePlayerUrl.length / 2, 40);             // cbVersionUrl
        header.writeUInt32LE(AuthenPackage.length / 2, 44);               // cbAuthenPackage

        return Buffer.concat([header, serverVersion, playerMinVersion, updatePlayerUrl, AuthenPackage]);
    }

    _buildTransportAcceptedPayload() {
        // packetPayloadSize(4) + funnelName (UTF-16LE, null-terminated)
        const funnelName = Buffer.from('Funnel Of The Gods\0', 'utf16le');
        const buf = Buffer.alloc(4 + funnelName.length);
        // packetPayloadSize = 0 (already zero from alloc)
        funnelName.copy(buf, 4);
        return buf;
    }

    _buildFunnelInfoPayload(session) {
        // transportMask(4) + nBlockFragments(4) + fragmentBytes(4) + nCubs(4)
        // + failedCubs(4) + nDisks(4) + decluster(4) + cubddDatagramSize(4)
        const buf = Buffer.alloc(32);
        buf.writeUInt32LE(0x00000008, 0);              // transportMask
        buf.writeUInt32LE(0x00000001, 4);              // nBlockFragments
        buf.writeUInt32LE(0x00010000, 8);              // fragmentBytes
        buf.writeUInt32LE(session.clientId >>> 0, 12); // nCubs (unique client identifier)
        buf.writeUInt32LE(0x00000000, 16);             // failedCubs
        buf.writeUInt32LE(0x00000001, 20);             // nDisks
        buf.writeUInt32LE(0x00000000, 24);             // decluster
        buf.writeUInt32LE((session.isCubddTransport) ? session.asfPacketSize + 8 : 0x00000000, 28);             // cubddDatagramSize
        return buf;
    }

    _buildFileDetailsPayload(session) {
        // Full LinkMacToViewerReportOpenFile payload (100 bytes)
        const buf = Buffer.alloc(100);
        const headerBuf = this._readAsfHeader(session) || Buffer.alloc(0);
        const mediaDataStart = session.asfDataOffset + 50;
        const mediaBytes = Math.max(0, session.asfFileSize - mediaDataStart);
        const packetCount = session.asfPacketCount > 0
            ? session.asfPacketCount
            : (session.asfPacketSize > 0 ? Math.ceil(mediaBytes / session.asfPacketSize) : 0);
        const durationSeconds = session.asfDurationSec > 0
            ? Math.ceil(session.asfDurationSec)
            : (session.bitrateBps > 0
                ? Math.ceil((mediaBytes * 8) / session.bitrateBps)
                : 0);

        buf.writeUInt32LE(session.openFileId >>> 0, 0);    // openFileId
        // padding [4] = 0, fileName [8] = 0 (already zeroed)
        buf.writeUInt32LE(FILE_ATTRIBUTE_MMS_CANSEEK, 12);  // fileAttributes = FILE_ATTRIBUTE_MMS_CANSEEK
        buf.writeDoubleLE(durationSeconds, 16);             // fileDuration (8-byte double)
        buf.writeUInt32LE(durationSeconds >>> 0, 24);       // fileBlocks (integer seconds)
        // unused1 [28-43] = 0 (already zeroed)
        buf.writeUInt32LE(session.asfPacketSize >>> 0, 44); // filePacketSize
        buf.writeUInt32LE(packetCount >>> 0, 48);           // filePacketCount low 32 bits
        // filePacketCount high 32 bits [52-55] = 0
        buf.writeUInt32LE(session.bitrateBps >>> 0, 56);    // fileBitRate
        buf.writeUInt32LE(headerBuf.length >>> 0, 60);      // fileHeaderSize
        // unused2 [64-99] = 0 (already zeroed)
        return buf;
    }

    _buildOpenFileErrorPayload() {
        return Buffer.alloc(0);
    }
}

module.exports = WTVMMS;
