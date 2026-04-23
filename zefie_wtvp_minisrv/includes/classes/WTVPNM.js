// Pure JS implementation of old Progressive Networks PNM streaming protocol used by WebTV and RealPlayer 8.
// This server only supports UDP streams, so mplayer (and others that are TCP only) will not work
// It does support seeking and pausing via the TCP control channel, but does not support bitrate switching or any of the
// other advanced features of the RealServer protocol. It should be compatible with WebTV 2.5 and RP8 clients.
// RealAudio 3, RealAudio 5, RealAudio G2 and RealAudio 8 (not WebTV compatible) files. 
// It is also not compatible with live streams at this time. 
// Also not tested with SureStream since they never worked with WebTV. (could we, as the server, make SureStream work with WebTV?)

// How it works (roughly):
// The client sends a md5 challenge in the initial request with the filename, and the current timestamp.
// The current timestamp (sent by the client) is parsed into epoch, then XORed with 0x67E32B93 to form "v12"
// The server then generates a challenge response with this value and the client challenge. (this is "initMD5")
// The server then generates a second hash based on the server challenge (random, but small for WebTV, large for RP8) and the request filename, XORed with "initMD5" (this is "resp1").
// The server sends resp1+initMD5 as a large 64-byte challenge
// The client validates this challenge by calculating the server challenge and its own client challenge to produce a final hash, which it sends back to the server.
// If the hash matches, the client is authenticated and the server starts sending UDP packets.

const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dgram = require('dgram');
const { WTVShared } = require('./WTVShared.js');

class WTVPNM {
    minisrv_config = null;
    service_name = null;
    service_config = null;
    server = null;
    wtvshared = null;
    sessions = new Map();

    constructor(...[minisrv_config, service_name]) {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        this.service_config = minisrv_config.services[service_name] || {};
        this.wtvshared = new WTVShared(minisrv_config, true);
        this.server = net.createServer((socket) => this.handleConnection(socket));

        // Descriptor server-id mapping uses full 16-bit source UDP port:
        // serverId = 0x0007pppp where pppp is the reserved UDP source port.
        this.serverIdPort16Base = 0x00070000;

        // Per-session counter embedded in bytes 9..12 of the first 0x4F chunk.
        // multi_auth.pcap increments this 1,2,3,... across successive sessions.
        this.sessionCounter = 0;
    }

    listen(port, host = '0.0.0.0') {
        this.server.listen(port, host);
        return this.server;
    }

    close() {
        if (this.server) this.server.close();
    }

    getDebugEnabled() {
        return this.minisrv_config.config?.debug_flags?.debug || this.service_config.debug;
    }

    debugLog(...args) {
        if (this.getDebugEnabled()) {
            console.log('[WTVPNM]', ...args);
        }
    }

    handleConnection(socket) {
        socket.setNoDelay(true);

        const session = {
            id: `${socket.remoteAddress}:${socket.remotePort}`,
            remoteIp: (socket.remoteAddress || '').replace('::ffff:', ''),
            helloSent: false,
            descriptorSent: false,
            descriptorInFlight: false,
            descriptorTimer: null,
            capabilitiesLogged: false,
            capabilities: [],
            clientChallenge: null,
            requestedMedia: null,
            mediaPath: null,
            notFoundSent: false,
            pnaFields: null,
            bytesRx: 0,
            bytesTx: 0,
            // Control-stream command accumulator.  TCP is byte-oriented so
            // multi-byte commands (0x53 seek, 0x67 stats) can be split across
            // receive events or coalesced with other bytes; we accumulate and
            // decode them here in handleControlCommands().
            ctrlBuf: Buffer.alloc(0),
            // 35-byte auth hash can be fragmented/coalesced on TCP.
            authBuf: Buffer.alloc(0),
            // RDT b5 nibble state.  High nibble = 'seek generation' (starts
            // at 1, bumped on every 0x53 seek).  Low nibble = (seq -
            // seekBaseSeq) & 0xf where seekBaseSeq is the wall-seq of the
            // most recent keyframe (RA flags & 0x02) or seek.  See the
            // b5 breakdown comment in buildMediaPayload.
            seekGen: 1,
            seekBaseSeq: 0,
            paused: false,
            // 'EOS' marker (single 0x45 byte) has been sent on TCP; prevent
            // duplicate sends if stream-complete fires more than once.
            eosSent: false,
            // Per-session RDT wire profile selected from parsed media metadata
            // (avg bitrate, etc.). Falls back to global defaults when unset.
            rdtDataTypeLo: null,
            rdtSyncType: null,
            audioChannels: null,
            mediaUdpPort: null,
            serverId: null,
            serverUdpPort: null,
            _udpSocketHandlersAttached: false,
            udpSocket: null,
            udpPacketCache: new Map(),
            udpPacketOrder: [],
            udpFeedbackWindowStart: 0,
            udpFeedbackResentInWindow: 0,
            udpFeedbackDropped: 0,
            udpFeedbackPeerPort: null,
            udpPriorityUntil: 0,
            udpInboundCount: 0,
            udpFeedbackProbeTimer: null
        };

        this.sessions.set(socket, session);
        this.debugLog('client connected', session.id);

        socket.on('data', (data) => {
            try {
                this.handleData(socket, data);
            } catch (e) {
                console.error(' * WTVPNM Error: handleData', e);
            }
        });

        socket.on('close', (hadError) => {
            this.clearDescriptorTimer(session);
            this.stopUdpStream(session);
            this.debugLog('client disconnected', session.id, hadError ? 'hadError' : 'clean', `tx=${session.bytesTx}`, `rx=${session.bytesRx}`);
            this.sessions.delete(socket);
        });

        socket.on('error', (err) => {
            this.clearDescriptorTimer(session);
            this.stopUdpStream(session);
            this.debugLog('socket error', session.id, err.message);
            this.sessions.delete(socket);
        });
    }

    handleData(socket, data) {
        const session = this.sessions.get(socket);
        if (!session) return;

        session.bytesRx += data.length;
        const ascii = data.toString('latin1').replace(/[^\x20-\x7E]/g, '.');
        this.debugLog('rx', session.id, 'len', data.length, ascii.slice(0, 120));
        this.debugLog('rx hex', session.id, data.toString('hex'));

        const hasPnaHello = data.includes(Buffer.from('PNA\x00\x0a', 'latin1'));
        const hasGetA = ascii.includes('GET /a');

        // Some clients retune on the same TCP socket without first sending a
        // full stop/teardown. When that happens, treat a new hello marker as
        // a fresh session start and clear prior stream/control state.
        if ((hasPnaHello || hasGetA) && (session.helloSent || session.descriptorSent)) {
            this.debugLog('retune detected, resetting session state', session.id);
            this.resetSessionForRetune(session);
        }

        if (hasPnaHello) {
            session.pnaFields = this.parsePnaMessage(data);

            // Dump all parsed PNA fields for debugging
            if (session.pnaFields && session.pnaFields.length > 0) {
                session.pnaFields.forEach((f) => {
                    const txt = f.value.toString('latin1').replace(/[^\x20-\x7E]/g, '.').slice(0, 80);
                    this.debugLog('pna field', session.id, `id=${f.id}`, `len=${f.len}`, `hex=${f.value.toString('hex').slice(0, 60)}`, txt);
                });
            }

            const parsedChallenge = this.getClientChallenge(session.pnaFields);
            if (parsedChallenge) session.clientChallenge = parsedChallenge;

            // Extract client UDP port from PNA field ID 1 (big-endian u16).
            const udpPortField = session.pnaFields.find(f => f.id === 1 && f.len === 2);
            session.clientUdpPort = (udpPortField && Buffer.isBuffer(udpPortField.value))
                ? this.sanitizeUdpPort(udpPortField.value.readUInt16BE(0))
                : null;
            session.mediaUdpPort = session.clientUdpPort;
            if (session.clientUdpPort) {
                this.debugLog('client udp port', session.id, session.clientUdpPort);
            }

            const parsedMedia = this.getRequestedMediaName(session.pnaFields, data);
            if (parsedMedia) {
                session.requestedMedia = parsedMedia;
                session.mediaPath = this.resolveMediaPath(session.requestedMedia);
            }
            if (!session.capabilitiesLogged) {
                session.capabilitiesLogged = true;
                const cap = this.extractCapabilities(data);
                session.capabilities = cap;
                // Detect WebTV via User-Agent, since it prefers low server challenges
                const raw = data.toString('latin1');
                session.isWebTV = /WebTV\//i.test(session.pnaFields?.useragent) || false;
                if (cap.length > 0) {
                    this.debugLog('client capabilities', session.id, cap.join(', '));
                }
                this.debugLog('client type', session.id, session.isWebTV ? 'WebTV' : 'non-WebTV');
                if (session.clientChallenge) {
                    this.debugLog('client challenge', session.id, session.clientChallenge);
                }
                if (session.requestedMedia) {
                    this.debugLog('requested media', session.id, session.requestedMedia);
                }
            }
            console.log('*', `[${session.id}]`, `PNM RealServer Request for media ${session.mediaPath}`);
            const pnmHeaders = {
                    'clientChallenge': session.clientChallenge,
                    'timestamp': session.pnaFields?.timestamp,
                    'requestedMedia': session.requestedMedia,
                    'User-Agent': session.pnaFields?.useragent,
                    'clientUDPPort': session.clientUdpPort,
            };
            console.log('*', 'PNM Request Data:', pnmHeaders);
            if (session.requestedMedia && !session.mediaPath) {
                console.log('*', 'PNM Error:', session.requestedMedia, 'not found in service vault(s)');
                this.sendNotFound(socket, session.requestedMedia);
                session.notFoundSent = true;
                return;
            }
        }

        if (session.notFoundSent) return;

        if (!session.helloSent && (hasGetA || hasPnaHello)) {
            this.sendHelloSequence(socket, session);
            return;
        }

        if (session.helloSent && !session.descriptorSent && (ascii.includes('GET /r') || ascii.includes('BET /r') || ascii.toLowerCase().includes('sta'))) {
            this.sendDescriptorAndStartStream(socket, session, 'client-trigger');
            return;
        }

        if (session.helloSent && session.descriptorSent) {
            if (!session.hashVerified) {
                session.authBuf = session.authBuf && session.authBuf.length
                    ? Buffer.concat([session.authBuf, data])
                    : Buffer.from(data);

                if (session.authBuf.length < 35) {
                    return;
                }

                const expectedResp = this.computeClientResponse(session);
                let authOffset = -1;
                let hashHex = null;

                // Find a complete auth frame anywhere in the buffered stream:
                // [0x23, 0x00, 0x20, 32 ASCII hex chars]
                for (let i = 0; i + 35 <= session.authBuf.length; i++) {
                    if (session.authBuf[i] !== 0x23 || session.authBuf[i + 1] !== 0x00 || session.authBuf[i + 2] !== 0x20) {
                        continue;
                    }

                    const candidate = session.authBuf.toString('ascii', i + 3, i + 35).toLowerCase();
                    if (!/^[a-f0-9]{32}$/.test(candidate)) continue;

                    // Prefer a candidate that matches the expected digest.
                    if (expectedResp && candidate === expectedResp) {
                        authOffset = i;
                        hashHex = candidate;
                        break;
                    }

                    // Keep first syntactically valid candidate as fallback.
                    if (authOffset < 0) {
                        authOffset = i;
                        hashHex = candidate;
                    }
                }

                if (authOffset < 0) {
                    // No complete auth frame yet; spill older bytes to control parser
                    // while keeping a tail window for fragmented auth frames.
                    if (session.authBuf.length > 512) {
                        const keepTail = 96;
                        const spill = session.authBuf.slice(0, session.authBuf.length - keepTail);
                        session.authBuf = session.authBuf.slice(session.authBuf.length - keepTail);
                        if (spill.length > 0) {
                            this.handleControlCommands(socket, session, spill);
                        }
                    }
                    return;
                }

                if (expectedResp && hashHex !== expectedResp) {
                    // Found a syntactically valid auth frame, but not ours yet.
                    // Keep buffering in case the matching frame is still pending.
                    if (session.authBuf.length > 768) {
                        session.authBuf = session.authBuf.slice(-128);
                    }
                    return;
                }

                const preAuth = session.authBuf.slice(0, authOffset);
                const remaining = session.authBuf.slice(authOffset + 35);
                session.authBuf = Buffer.alloc(0);

                if (preAuth.length > 0) {
                    this.handleControlCommands(socket, session, preAuth);
                }

                this.debugLog('client hash response', session.id, hashHex);

                if (expectedResp && hashHex === expectedResp) {
                    session.hashVerified = true;
                    const burstPrestartMs = typeof this.service_config.burst_prestart_ms === 'number'
                        ? this.service_config.burst_prestart_ms
                        : 3000;
                    const mediaHeaders = {
                        'challengeResponse': expectedResp,
                        'avgBitrate': session.avgBitRate,
                        'audioChannels': session.audioChannels,
                        'burstMaxRate': session.avgBitRate * 2,
                        'burstDurationMs': burstPrestartMs
                    };
                    console.log('*', 'PNM Result Data:', mediaHeaders);
                } else {
                    console.log('*', 'PNM Error: client hash response did not match expected value', session.requestedMedia);
                    socket.close();
                    return;
                }

                if (session.clientUdpPort) {
                    this.startUdpStream(socket, session);
                } else {
                    this.debugLog('hash verified, waiting for UDP peer port', session.id);
                    this.attachUdpSocketHandlers(socket, session);
                }

                if (remaining.length > 0) {
                    this.handleControlCommands(socket, session, remaining);
                }
                return;
            }

            // Post-descriptor control byte stream.  See handleControlCommands
            // for opcode list.  Accumulate and decode — RP8 uses seek/
            // pause/resume commands here that can arrive coalesced or
            // fragmented across TCP segments.
            this.handleControlCommands(socket, session, data);
            return;
        }
    }

    resetSessionForRetune(session) {
        if (!session) return;
        this.clearDescriptorTimer(session);
        this.stopUdpStream(session);

        session.helloSent = false;
        session.descriptorSent = false;
        session.descriptorInFlight = false;
        session.notFoundSent = false;
        session.capabilitiesLogged = false;
        session.capabilities = [];
        session.clientChallenge = null;
        session.requestedMedia = null;
        session.mediaPath = null;
        session.pnaFields = null;
        session.ctrlBuf = Buffer.alloc(0);
        session.authBuf = Buffer.alloc(0);
        session.paused = false;
        session.eosSent = false;
        session.hashVerified = false;
        session.sessionNumber = undefined;
        session.mediaUdpPort = null;
        session.udpPacketCache = new Map();
        session.udpPacketOrder = [];
        session.udpFeedbackWindowStart = 0;
        session.udpFeedbackResentInWindow = 0;
        session.udpFeedbackDropped = 0;
        session.udpFeedbackPeerPort = null;
        session.udpPriorityUntil = 0;
        session.udpInboundCount = 0;
        if (session.udpFeedbackProbeTimer) {
            clearTimeout(session.udpFeedbackProbeTimer);
            session.udpFeedbackProbeTimer = null;
        }
    }

    // Parse the post-descriptor TCP control stream sent by RealPlayer during
    // and after playback.  Observed opcodes (multi_seek.pcap, wtv2.pcap):
    //   0x21 ('!') - 1 byte  - periodic keepalive during playback
    //   0x42 ('B') - 1 byte  - play/resume (first seen right before UDP starts)
    //   0x50 ('P') - 1 byte  - pause
    //   0x53 ('S') - 5 bytes - seek: 0x53 + uint32-BE milliseconds
    //   0x67 ('g') - 3+N bytes - client stats report: 0x67 + uint16-BE len + payload
    // The native RealServer does NOT application-reply to any of these on
    // TCP (only TCP-ACKs).  The one exception is the 0x45 end-of-stream
    // byte the server emits ~0.5s after the last UDP packet.
    handleControlCommands(socket, session, data) {
        session.ctrlBuf = session.ctrlBuf && session.ctrlBuf.length
            ? Buffer.concat([session.ctrlBuf, data])
            : Buffer.from(data);

        const knownOps = new Set([0x21, 0x42, 0x50, 0x53, 0x67]);
        let off = 0;
        const buf = session.ctrlBuf;
        while (off < buf.length) {
            const op = buf[off];
            if (op === 0x21 || op === 0x42 || op === 0x50) {
                if (op === 0x21) {
                    this.debugLog('ctrl keepalive', session.id);
                } else if (op === 0x42) {
                    this.debugLog('ctrl play/resume', session.id);
                    this.resumeUdpStream(socket, session);
                } else {
                    this.debugLog('ctrl pause', session.id);
                    this.pauseUdpStream(session);
                }
                off += 1;
            } else if (op === 0x53) {
                if (buf.length - off < 5) break;
                const targetMs = buf.readUInt32BE(off + 1);
                this.debugLog('ctrl seek', session.id, `target=${targetMs}ms`);
                this.seekUdpStream(session, targetMs);
                off += 5;
            } else if (op === 0x67) {
                if (buf.length - off < 3) break;
                const slen = buf.readUInt16BE(off + 1);
                if (buf.length - off < 3 + slen) break;
                const statsBody = buf.slice(off + 3, off + 3 + slen);
                const txt = statsBody.toString('latin1').replace(/[^\x20-\x7E]/g, '.');
                this.debugLog('ctrl stats', session.id, `len=${slen}`, txt.slice(0, 120));
                off += 3 + slen;
            } else {
                let nextKnown = -1;
                for (let i = off + 1; i < buf.length; i++) {
                    if (knownOps.has(buf[i])) {
                        nextKnown = i;
                        break;
                    }
                }

                if (nextKnown === -1) {
                    this.debugLog('ctrl opaque blob', session.id,
                        `len=${buf.length - off}`,
                        'hex', buf.slice(off, off + 24).toString('hex'));
                    off = buf.length;
                    break;
                }

                this.debugLog('ctrl unknown block skipped', session.id,
                    `len=${nextKnown - off}`,
                    'hex', buf.slice(off, Math.min(nextKnown, off + 24)).toString('hex'));
                off = nextKnown;
            }
        }

        session.ctrlBuf = off < buf.length ? buf.slice(off) : Buffer.alloc(0);
    }

    pauseUdpStream(session) {
        if (!session || session.paused) return;
        session.paused = true;
        if (session.udpTimer) {
            clearTimeout(session.udpTimer);
            session.udpTimer = null;
        }
        this.debugLog('udp stream paused', session.id);
    }

    resumeUdpStream(socket, session) {
        if (!session || !session.paused) return;
        session.paused = false;
        if (typeof session._startDataInterval === 'function' && !session.udpTimer
            && !socket.destroyed) {
            session._startDataInterval();
            this.debugLog('udp stream resumed', session.id);
        }
    }

    seekUdpStream(session, targetMs) {
        if (!session || !session.mediaFrames || !session.mediaFrames.length) return;
        const frames = session.mediaFrames;
        // Find the largest index whose ts <= targetMs AND is a keyframe
        // (RA flags bit 1 set).  Seeking to a non-keyframe would land mid-
        // block and the cook decoder would emit garbage until the next key.
        // Fallback: if no keyframe at/below target (rare), use the first.
        let idx = 0;
        for (let i = 0; i < frames.length; i++) {
            if (frames[i].ts > targetMs) break;
            if (frames[i].flags & 0x02) idx = i;
        }
    
        // Guard: if seek is beyond the file, cap to the last frame
        if (idx >= frames.length) {
            this.debugLog('⚠️ seekUdpStream: seek target beyond file end', session.id,
                `targetMs=${targetMs}ms`,
                `calculated idx=${idx}`,
                `frames.length=${frames.length}`,
                `capping to last frame`);
            idx = Math.max(0, frames.length - 1);
        }
    
        session.mediaFrameIdx = idx;
        // Bump seek generation (RDT b5 high nibble).  multi_seek.pcap shows
        // it incrementing 1→2→3→4→5 across four seeks; we wrap within the
        // 4-bit field, skipping 0 so it always differs from 'no stream'.
        session.seekGen = ((session.seekGen || 0) + 1) & 0x0f;
        if (session.seekGen === 0) session.seekGen = 1;
        // Low nibble restarts at 0 on seek — the next packet carries the new
        // keyframe so seekBaseSeq will be updated in the interval callback
        // to match the wall-seq used for that packet.
        // Re-arm burst prefill on seek so older clients can re-lock decoder
        // state quickly after timestamp discontinuities.
        session.burstFramesSent = 0;
        session.eosSent = false;
        this.debugLog('udp stream seek', session.id,
            `target=${targetMs}ms`,
            `→frame[${idx}] ts=${frames[idx].ts}ms flags=0x${frames[idx].flags.toString(16)}`,
            `gen=${session.seekGen}`);
    }


    send(socket, buffer) {
        const session = this.sessions.get(socket);
        if (!session) return;
        session.bytesTx += buffer.length;
        this.debugLog('tx', session.id, 'len', buffer.length, 'hex', buffer.toString('hex').slice(0, 100));
        socket.write(buffer);
    }

    sendNotFound(socket, requestedMedia = null) {
        const target = requestedMedia || 'unknown';
        this.debugLog('media missing, sending 404', target);
        const body = `404 Not Found\r\nMissing media: ${target}\r\n`;
        const headers = [
            'HTTP/1.0 404 Not Found',
            'Content-Type: text/plain',
            `Content-Length: ${Buffer.byteLength(body, 'utf8')}`,
            'Connection: close',
            '',
            ''
        ].join('\r\n');
        socket.write(headers + body, () => socket.end());
    }

    normalizeRequestedMediaPath(value) {
        if (value === null || value === undefined) return null;

        let raw = String(value).replace(/\x00+$/g, '').trim();
        if (!raw) return null;

        // Trim query/fragment and normalize separators to URL-style slashes.
        raw = raw.split(/[?#]/)[0].replace(/\\+/g, '/');

        // Drop common URI scheme prefixes if present.
        raw = raw.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/]*\/?/, '');
        raw = raw.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/*/, '');

        // Keep only a safe relative path under the service vault.
        const parts = raw.split('/').filter((part) => part && part !== '.' && part !== '..');
        if (parts.length === 0) return null;

        return parts.join('/');
    }

    getRequestedMediaName(fields, rawData) {
        if (!Array.isArray(fields) || fields.length === 0) {
            this.debugLog('getRequestedMediaName: no fields, using scanRawForMediaName');
            return this.scanRawForMediaName(rawData);
        }

        // Field 0x52 (82) carries the requested file name in observed captures.
        const fileField = fields.find((f) => f && f.id === 82 && f.len > 0);
        if (fileField) {
            const raw = fileField.value.toString('latin1');
            this.debugLog('getRequestedMediaName: found field 82', `len=${fileField.len}`, `raw=${raw.slice(0, 60)}`);
            const normalized = this.normalizeRequestedMediaPath(raw);
            if (normalized) {
                this.debugLog('getRequestedMediaName: field 82 normalized', normalized);
                return normalized;
            }
            this.debugLog('getRequestedMediaName: field 82 normalized to null');
        } else {
            this.debugLog('getRequestedMediaName: field 82 not found or empty', 
                `fields=${fields.length}`,
                `field ids=[${fields.map(f => `${f?.id}`).join(',')}]`);
        }

        // Some clients may carry filename in another TLV field; scan all text values.
        for (const field of fields) {
            if (!field || !field.len || field.len < 4) continue;
            const raw = field.value.toString('latin1').replace(/\x00+/g, ' ').trim();
            const match = raw.match(/([A-Za-z0-9_\-\.\/]+\.(?:ra|ray|rm|ram))/i);
            if (match) {
                this.debugLog('getRequestedMediaName: found filename in field', `id=${field.id}`, `match=${match[1]}`);
                const normalized = this.normalizeRequestedMediaPath(match[1]);
                if (normalized) {
                    this.debugLog('getRequestedMediaName: alt field normalized', normalized);
                    return normalized;
                }
            }
        }

        // Fallback: scan raw data buffer for media filename pattern.
        this.debugLog('getRequestedMediaName: no fields matched, using scanRawForMediaName');
        return this.scanRawForMediaName(rawData);
    }

    scanRawForMediaName(rawData) {
        if (!Buffer.isBuffer(rawData)) {
            this.debugLog('scanRawForMediaName: input not a buffer');
            return null;
        }
        const str = rawData.toString('latin1');
        const match = str.match(/([A-Za-z0-9_\-\.\/]+\.(?:ra|ray|rm|ram))(?:[^A-Za-z0-9]|$)/i);
        if (match) {
            this.debugLog('scanRawForMediaName: regex match found', `match=${match[1]}`);
            const normalized = this.normalizeRequestedMediaPath(match[1]);
            if (normalized) {
                this.debugLog('scanRawForMediaName: normalized', normalized);
                return normalized;
            }
            this.debugLog('scanRawForMediaName: regex match but normalized to null');
        } else {
            this.debugLog('scanRawForMediaName: no regex match', `dataLen=${str.length}`, `preview=${str.slice(0, 100).replace(/[^\x20-\x7E]/g, '.')}`);
        }
        return null;
    }

    getClientChallenge(fields) {
        if (!Array.isArray(fields) || fields.length === 0) return null;

        // Field 4 carries a 32-char challenge token in observed client hello payloads.
        const challengeField = fields.find((f) => f && f.id === 4 && f.len >= 16);
        if (!challengeField) return null;

        const raw = challengeField.value.toString('latin1').replace(/\x00+$/g, '').trim();
        const match = raw.match(/[a-f0-9]{32}/i);
        if (!match) return null;
        return match[0].toLowerCase();
    }

    getClientTimestamp(fields) {
        if (!Array.isArray(fields) || fields.length === 0) return null;

        // PNA_TIMESTAMP is field ID 0x17 (23). Example string: [17/04/2026:02:50:34 00:00]
        const tsField = fields.find((f) => f && f.id === 23);
        if (!tsField) return null;

        const raw = tsField.value.toString('latin1').replace(/\x00+$/g, '').trim();
        const match = raw.match(/\[?(\d{2})\/(\d{2})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/);
        if (match) {
            const ms = Date.UTC(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10), parseInt(match[4], 10), parseInt(match[5], 10), parseInt(match[6], 10));
            return Math.floor(ms / 1000);
        }
        return null;
    }

    resolveMediaPath(requestedMedia) {
        if (!requestedMedia) return null;

        const serviceVaultDir = this.service_config.servicevault_dir || this.service_name;
        const vaults = this.minisrv_config.config?.ServiceVaults || [];
        const extensionVariants = this.getMediaNameVariants(requestedMedia);

        for (const vault of vaults) {
            const base = this.wtvshared.getAbsolutePath(serviceVaultDir, vault);
            for (const variant of extensionVariants) {
                const candidate = this.wtvshared.makeSafePath(base, variant);
                this.debugLog('testing media candidate', candidate);
                if (candidate && fs.existsSync(candidate) && fs.lstatSync(candidate).isFile()) {
                    if (this.service_config.debug) {
                        this.debugLog('media file found', variant, '->', candidate);
                    }
                    return candidate;
                }
            }
        }
        if (this.service_config.debug) {
            this.debugLog('media file not found in vaults', requestedMedia);
        }
        return null;
    }

    getMediaNameVariants(requestedMedia) {
        const requestedPath = this.normalizeRequestedMediaPath(requestedMedia);
        if (!requestedPath) return [];

        const ext = path.posix.extname(requestedPath).toLowerCase();
        const stem = ext.length > 0 ? requestedPath.slice(0, -ext.length) : requestedPath;
        const variants = [requestedPath];

        if (ext === '.ray') variants.push(`${stem}.ra`);
        if (ext === '.ram') variants.push(`${stem}.ra`);
        if (ext === '.rm') variants.push(`${stem}.ra`);
        if (!ext) {
            variants.push(`${stem}.ra`);
        }

        return Array.from(new Set(variants));
    }

    sendHelloSequence(socket, session) {
        if (!socket || !session || session.helloSent) return;

        // RealServer sends the 9-byte PNA hello first, then sends the
        // descriptor to the client a several milliseconds later
        const hello = this.buildPnaHello(session);
        session.helloSent = true;
        this.send(socket, hello);
        this.debugLog('hello sent', session.id, `len=${hello.length}`);

        const descriptorDelay = (typeof this.service_config.descriptor_after_hello_ms === 'number')
            ? this.service_config.descriptor_after_hello_ms
            : 100;

        session.descriptorTimer = setTimeout(async () => {
            session.descriptorTimer = null;
            if (socket.destroyed || session.descriptorSent || session.descriptorInFlight) return;

            session.descriptorInFlight = true;

            try {
                const udpReady = await this.ensureSessionUdpSocket(session);
                if (!udpReady) {
                    this.debugLog('descriptor aborted: failed to reserve UDP socket', session.id);
                    socket.destroy();
                    return;
                }

                if (socket.destroyed || session.descriptorSent) return;

                const descriptor = this.buildDescriptorPacket(session);
                session.descriptorSent = true;
                this.send(socket, descriptor);
                this.debugLog('descriptor sent', session.id, `len=${descriptor.length}`, `delay=${descriptorDelay}ms`);
                this.prepareMediaData(session);
            } finally {
                session.descriptorInFlight = false;
            }
        }, descriptorDelay);
    }

    clearDescriptorTimer(session) {
        if (!session) return;
        if (session.descriptorTimer) {
            clearTimeout(session.descriptorTimer);
            session.descriptorTimer = null;
        }
    }

    async sendDescriptorAndStartStream(socket, session, reason) {
        if (!socket || !session || session.descriptorSent || session.descriptorInFlight) return;
        this.clearDescriptorTimer(session);
        if (socket.destroyed) return;

        session.descriptorInFlight = true;

        try {
            const udpReady = await this.ensureSessionUdpSocket(session);
            if (!udpReady) {
                this.debugLog('descriptor aborted: failed to reserve UDP socket', session.id);
                socket.destroy();
                return;
            }

            if (socket.destroyed || session.descriptorSent) return;

            this.send(socket, this.buildDescriptorPacket(session));
            session.descriptorSent = true;
            this.debugLog('descriptor sent', session.id, reason);

            this.prepareMediaData(session);

            // Wait for UDP port response from client before starting stream
            this.debugLog('descriptor sent, waiting for client UDP port response on TCP connection', session.id);
        } finally {
            session.descriptorInFlight = false;
        }
    }

    stopUdpStream(session) {
        if (!session) return;
        if (session.udpStartTimer) {
            clearTimeout(session.udpStartTimer);
            session.udpStartTimer = null;
        }
        if (session.udpFeedbackProbeTimer) {
            clearTimeout(session.udpFeedbackProbeTimer);
            session.udpFeedbackProbeTimer = null;
        }
        if (session.udpTimer) {
            clearInterval(session.udpTimer);
            session.udpTimer = null;
        }
        if (session.udpSocket) {
            try { session.udpSocket.close(); } catch(e) {}
            session.udpSocket = null;
        }
        session.serverId = null;
        session.serverUdpPort = null;
        session._udpSocketHandlersAttached = false;
        session.udpPacketCache = new Map();
        session.udpPacketOrder = [];
        session.udpFeedbackWindowStart = 0;
        session.udpFeedbackResentInWindow = 0;
        session.udpFeedbackDropped = 0;
        session.udpFeedbackPeerPort = null;
        session.udpInboundCount = 0;
    }

    sanitizeUdpPort(port) {
        const parsed = Number(port);
        return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : null;
    }

    getUdpBindRange() {
        const configuredMin = this.sanitizeUdpPort(this.service_config.udp_bind_port_min);
        const configuredMax = this.sanitizeUdpPort(this.service_config.udp_bind_port_max);

        if (configuredMin && configuredMax) {
            const min = Math.min(configuredMin, configuredMax);
            const max = Math.max(configuredMin, configuredMax);
            return { min, max, mode: 'minmax' };
        }

        // Backward compatibility for older base/span config.
        const basePort = Number.isInteger(this.service_config.udp_bind_port_base)
            ? this.service_config.udp_bind_port_base
            : 0x1a00;
        const span = Number.isInteger(this.service_config.udp_bind_port_span)
            ? Math.max(1, this.service_config.udp_bind_port_span)
            : 0x100;

        const min = Math.max(1, basePort);
        const max = Math.min(65535, basePort + span - 1);
        return { min, max, mode: 'basespan' };
    }

    buildServerIdForPort(port) {
        const parsedPort = this.sanitizeUdpPort(port);
        if (!parsedPort) return null;
        return (this.serverIdPort16Base | (parsedPort & 0xffff)) >>> 0;
    }

    async ensureSessionUdpSocket(session) {
        if (!session) return false;

        const existingPort = this.sanitizeUdpPort(session.serverUdpPort);
        if (session.udpSocket && existingPort) return true;

        const bindIp = this.minisrv_config?.config?.bind_ip || '0.0.0.0';
        // Keep source ports in 0x1a00-0x1aff by default. When a custom range
        // is used, server-id mapping can follow the full source port.
        const range = this.getUdpBindRange();
        const span = Math.max(1, (range.max - range.min) + 1);
        const startOffset = crypto.randomInt(0, span);
        let udpSocket = null;
        let boundPort = null;

        for (let i = 0; i < span; i++) {
            const port = range.min + ((startOffset + i) % span);
            if (port <= 0 || port > 65535) continue;

            const candidate = dgram.createSocket('udp4');
            const didBind = await new Promise((resolve) => {
                const onError = () => resolve(false);
                candidate.once('error', onError);
                candidate.bind(port, bindIp, () => {
                    candidate.removeListener('error', onError);
                    resolve(true);
                });
            });

            if (didBind) {
                udpSocket = candidate;
                boundPort = port;
                break;
            }

            try { candidate.close(); } catch (_) {}
        }

        if (!udpSocket || !boundPort) {
            this.debugLog('udp reserve bind failed', session.id,
                `range=${range.min}-${range.max}`, `mode=${range.mode}`, 'no free ports');
            return false;
        }

        session.udpSocket = udpSocket;
        session._udpSocketHandlersAttached = false;

        try {
            const addr = udpSocket.address();
            session.serverUdpPort = this.sanitizeUdpPort(addr.port);
            session.serverId = this.buildServerIdForPort(addr.port);
            this.debugLog('udp socket reserved', session.id,
                `${addr.address}:${addr.port}`,
                `serverId=0x${(session.serverId >>> 0).toString(16)}`);
        } catch (_) {
            session.serverId = null;
            session.serverUdpPort = null;
        }

        return !!session.serverUdpPort;
    }

    normalizeIpAddress(ip) {
        return String(ip || '').replace(/^::ffff:/i, '');
    }

    getMediaTargetPort(session) {
        if (!session) return null;
        return this.sanitizeUdpPort(session.udpFeedbackPeerPort)
            || this.sanitizeUdpPort(session.mediaUdpPort)
            || this.sanitizeUdpPort(session.clientUdpPort);
    }

    attachUdpSocketHandlers(socket, session) {
        if (!socket || !session || !session.udpSocket || session._udpSocketHandlersAttached) return;

        session.udpSocket.on('error', (err) => {
            this.debugLog('udp socket error', session.id, err.message);
            this.stopUdpStream(session);
        });

        // Some clients send UDP resend/feedback before playback is fully
        // underway. Keep this listener active as soon as socket is reserved.
        session.udpSocket.on('message', (msg, rinfo) => {
            session.udpInboundCount = (session.udpInboundCount || 0) + 1;
            this.debugLog('udp rx', session.id, `from=${rinfo.address}:${rinfo.port}`,
                `len=${msg.length}`, 'hex', msg.slice(0, 32).toString('hex'));
            this.handleUdpFeedback(socket, session, msg, rinfo);
        });

        session._udpSocketHandlersAttached = true;
    }

    cacheUdpPacketForRetransmit(session, seq16, payload) {
        if (!session || !Buffer.isBuffer(payload)) return;
        const enabled = this.service_config.udp_retransmit_enabled !== false;
        if (!enabled) return;

        if (!session.udpPacketCache) session.udpPacketCache = new Map();
        if (!Array.isArray(session.udpPacketOrder)) session.udpPacketOrder = [];

        const maxCache = Number.isInteger(this.service_config.udp_retransmit_cache_size)
            ? Math.max(64, this.service_config.udp_retransmit_cache_size)
            : 4096;
        const now = Date.now();
        const key = seq16 & 0xffff;
        const existing = session.udpPacketCache.get(key);
        if (!existing) {
            session.udpPacketOrder.push(key);
        }
        session.udpPacketCache.set(key, { payload: Buffer.from(payload), ts: now });

        while (session.udpPacketOrder.length > maxCache) {
            const dropKey = session.udpPacketOrder.shift();
            session.udpPacketCache.delete(dropKey);
        }

        const maxAgeMs = Number.isInteger(this.service_config.udp_retransmit_cache_max_age_ms)
            ? Math.max(250, this.service_config.udp_retransmit_cache_max_age_ms)
            : 30000;
        while (session.udpPacketOrder.length > 0) {
            const oldestKey = session.udpPacketOrder[0];
            const oldestEntry = session.udpPacketCache.get(oldestKey);
            if (!oldestEntry || now - oldestEntry.ts > maxAgeMs) {
                session.udpPacketOrder.shift();
                session.udpPacketCache.delete(oldestKey);
                continue;
            }
            break;
        }
    }

    extractUdpRetransmitSeqs(session, msg) {
        if (!session || !session.udpPacketCache || !Buffer.isBuffer(msg) || msg.length === 0) {
            return [];
        }

        const out = new Set();
        const maxSeqs = Number.isInteger(this.service_config.udp_retransmit_max_seqs_per_feedback)
            ? Math.max(1, this.service_config.udp_retransmit_max_seqs_per_feedback)
            : 32;

        const pushIfCached = (seq) => {
            const key = seq & 0xffff;
            if (session.udpPacketCache.has(key)) {
                out.add(key);
            }
        };

        // ASCII feedback support (test clients/tools):
        //   NAK 12,13,0x0014
        //   RETRANS 12 13
        const ascii = msg.toString('latin1').replace(/[^\x20-\x7E]/g, ' ').trim();
        if (/^(NAK|NACK|RETRANS|RESEND)\b/i.test(ascii)) {
            const matches = ascii.match(/0x[0-9a-fA-F]+|\d+/g) || [];
            for (const token of matches) {
                const parsed = token.toLowerCase().startsWith('0x')
                    ? parseInt(token, 16)
                    : parseInt(token, 10);
                if (Number.isInteger(parsed)) pushIfCached(parsed);
                if (out.size >= maxSeqs) break;
            }
            return Array.from(out);
        }

        // Binary fallback heuristics.
        // Some clients encode seq requests as BE u16, others as LE u16, and
        // some prepend an opcode byte.
        if (msg.length === 2) {
            pushIfCached(msg.readUInt16BE(0));
            pushIfCached(msg.readUInt16LE(0));
            return Array.from(out);
        }

        const collectWords = (startOffset, littleEndian = false) => {
            for (let i = startOffset; i + 1 < msg.length; i += 2) {
                const seq = littleEndian ? msg.readUInt16LE(i) : msg.readUInt16BE(i);
                pushIfCached(seq);
                if (out.size >= maxSeqs) break;
            }
        };

        const collectDwordsLow16 = (startOffset, littleEndian = false) => {
            for (let i = startOffset; i + 3 < msg.length; i += 4) {
                const val = littleEndian ? msg.readUInt32LE(i) : msg.readUInt32BE(i);
                pushIfCached(val & 0xffff);
                if (out.size >= maxSeqs) break;
            }
        };

        if (msg.length % 2 === 0) {
            collectWords(0, false);
            if (out.size < maxSeqs) collectWords(0, true);
        } else {
            collectWords(1, false);
            if (out.size < maxSeqs) collectWords(1, true);
        }

        // Try opposite alignment once.
        if (out.size === 0 && msg.length >= 4) {
            const alt = msg.length % 2 === 0 ? 1 : 0;
            collectWords(alt, false);
            if (out.size < maxSeqs) collectWords(alt, true);
        }

        // Some feedback payloads carry 32-bit request entries.
        if (out.size === 0 && msg.length >= 8) {
            const preferred = msg.length % 2 === 0 ? 0 : 1;
            collectDwordsLow16(preferred, false);
            if (out.size < maxSeqs) collectDwordsLow16(preferred, true);
            if (out.size === 0) {
                const alt = preferred === 0 ? 1 : 0;
                collectDwordsLow16(alt, false);
                if (out.size < maxSeqs) collectDwordsLow16(alt, true);
            }
        }

        return Array.from(out).slice(0, maxSeqs);
    }

    handleUdpFeedback(socket, session, msg, rinfo) {
        if (!socket || !session || !session.udpSocket) return;
        if (this.service_config.udp_retransmit_enabled === false) return;

        const expectedIp = this.normalizeIpAddress(socket.remoteAddress);
        const rxIp = this.normalizeIpAddress(rinfo?.address);
        const rxPort = Number.isInteger(rinfo?.port) ? rinfo.port : -1;
        const strictPeerPort = this.service_config.udp_retransmit_strict_peer_port === true;

        if (rxIp !== expectedIp) {
            this.debugLog('udp feedback ignored (endpoint mismatch)', session.id,
                `from=${rxIp}:${rxPort}`,
                `expected=${expectedIp}:${session.clientUdpPort}`);
            return;
        }

        if (strictPeerPort && session.clientUdpPort && rxPort !== session.clientUdpPort) {
            this.debugLog('udp feedback ignored (port mismatch, strict mode)', session.id,
                `from=${rxIp}:${rxPort}`,
                `expected=${expectedIp}:${session.clientUdpPort}`);
            return;
        }

        if (!strictPeerPort && !session.udpFeedbackPeerPort) {
            session.udpFeedbackPeerPort = rxPort;
            const currentTargetPort = this.getMediaTargetPort(session);
            if (this.sanitizeUdpPort(rxPort) && currentTargetPort !== rxPort) {
                session.mediaUdpPort = rxPort;
            }
            this.debugLog('udp feedback peer learned', session.id,
                `peer=${rxIp}:${rxPort}`,
                `mediaTarget=${expectedIp}:${this.getMediaTargetPort(session) || 'unknown'}`,
                `retransmitTarget=${expectedIp}:${rxPort}`);

            // If auth already passed and stream hasn't started yet, begin now.
            if (session.hashVerified && !session.udpTimer && !session.udpStartTimer) {
                this.debugLog('starting UDP stream after peer learn', session.id,
                    `target=${expectedIp}:${this.getMediaTargetPort(session) || 'unknown'}`);
                this.startUdpStream(socket, session);
            }
        }

        if (!session.clientUdpPort) return;

        const requestedSeqs = this.extractUdpRetransmitSeqs(session, msg);
        if (!requestedSeqs.length) return;

        const priorityHoldMs = Number.isInteger(this.service_config.udp_retransmit_priority_hold_ms)
            ? Math.max(0, this.service_config.udp_retransmit_priority_hold_ms)
            : 18;
        if (priorityHoldMs > 0) {
            session.udpPriorityUntil = Math.max(session.udpPriorityUntil || 0, Date.now() + priorityHoldMs);
        }

        const now = Date.now();
        const windowMs = Number.isInteger(this.service_config.udp_retransmit_window_ms)
            ? Math.max(250, this.service_config.udp_retransmit_window_ms)
            : 1000;
        const maxPerWindow = Number.isInteger(this.service_config.udp_retransmit_max_per_window)
            ? Math.max(1, this.service_config.udp_retransmit_max_per_window)
            : 24;

        if (!session.udpFeedbackWindowStart || now - session.udpFeedbackWindowStart >= windowMs) {
            session.udpFeedbackWindowStart = now;
            session.udpFeedbackResentInWindow = 0;
        }

        let resent = 0;
        for (const seq16 of requestedSeqs) {
            if (session.udpFeedbackResentInWindow >= maxPerWindow) {
                session.udpFeedbackDropped = (session.udpFeedbackDropped || 0) + 1;
                this.debugLog('udp retransmit rate-limited', session.id,
                    `windowMs=${windowMs}`,
                    `max=${maxPerWindow}`,
                    `dropped=${session.udpFeedbackDropped}`);
                break;
            }

            const cached = session.udpPacketCache.get(seq16 & 0xffff);
            if (!cached || !Buffer.isBuffer(cached.payload)) continue;

            const txPort = this.getMediaTargetPort(session);
            if (!txPort) continue;
            session.udpSocket.send(cached.payload, 0, cached.payload.length,
                txPort, expectedIp, (err) => {
                    if (err) this.debugLog('udp retransmit send err', session.id, `seq=${seq16}`, err.message);
                });
            resent++;
            session.udpFeedbackResentInWindow++;
        }

        if (resent > 0) {
            this.debugLog('udp retransmit', session.id,
                `count=${resent}`,
                `seqs=${requestedSeqs.slice(0, resent).join(',')}`);
        }
    }

    prepareMediaData(session) {
        if (!session || session.mediaFrames) return;

        if (!session.mediaPath || !fs.existsSync(session.mediaPath)) {
            this.debugLog('prepareMediaData: media path missing or not found', session.id, session.mediaPath);
            return;
        }

        try {
            const media = fs.readFileSync(session.mediaPath);
            this.debugLog('prepareMediaData: loaded media file', session.id, `size=${media.length} bytes`);

            const classicRa = this.parseClassicRaHeader(media);
            if (classicRa) {
                session.avgBitRate = classicRa.avgBitRate;
                session.audioChannels = classicRa.channels;
                session.rdtPacketMode = 'classic-len';
                session.syncEvery = Number.isInteger(this.service_config.rdt_sync_every_classic)
                    ? Math.max(1, this.service_config.rdt_sync_every_classic)
                    : 5;

                const cfgDataTypeLo = Number.isInteger(this.service_config.rdt_data_type_lo)
                    ? (this.service_config.rdt_data_type_lo & 0xff)
                    : null;
                const cfgSyncType = Number.isInteger(this.service_config.rdt_sync_type)
                    ? (this.service_config.rdt_sync_type & 0xffff)
                    : null;

                if (cfgDataTypeLo !== null && cfgSyncType !== null) {
                    session.rdtDataTypeLo = cfgDataTypeLo;
                    session.rdtSyncType = cfgSyncType;
                } else {
                    const useLegacyProfile = classicRa.channels === 1 || classicRa.channels === null;
                    session.rdtDataTypeLo = useLegacyProfile ? 0x64 : 0x50;
                    session.rdtSyncType = useLegacyProfile ? 0x0477 : 0x04ba;
                }

                const payload = media.subarray(classicRa.dataOffset);
                const packetSize = Math.max(1, classicRa.packetSize);
                let tsStepMs = Number.isInteger(this.service_config.classic_ra_frame_ms)
                    ? Math.max(1, this.service_config.classic_ra_frame_ms)
                    : (classicRa.frameMs > 0
                        ? classicRa.frameMs
                        : Math.max(1, Math.round((packetSize * 8000) / Math.max(1, classicRa.avgBitRate))));

                const frames = [];
                let frameIdx = 0;
                for (let o = 0; o < payload.length; o += packetSize) {
                    const end = Math.min(o + packetSize, payload.length);
                    const audio = payload.subarray(o, end);
                    frames.push({
                        ts: frameIdx * tsStepMs,
                        flags: 0x0002,
                        audio
                    });
                    frameIdx++;
                }

                session.mediaFrames = frames;
                session.mediaFrameIdx = 0;
                session.frameMs = tsStepMs;  // Store frame cadence for pacing
                this.debugLog('prepareMediaData: classic RA parsed', session.id,
                    `codec=${classicRa.codec || 'unknown'}`,
                    `channels=${classicRa.channels || 'unknown'}`,
                    `packetSize=${packetSize}`,
                    `avgBitRate=${classicRa.avgBitRate}`,
                    `frames=${frames.length}`,
                    `tsStep=${tsStepMs}ms`,
                    `dataOffset=${classicRa.dataOffset}`,
                    `mode=${session.rdtDataTypeLo === 0x64 ? 'legacy' : 'realserver'}`);
                return;
            }

            // Read avgBitRate from the PROP chunk so we can pace UDP packets
            // correctly.  Underpacing (> real bitrate ms) causes client-side
            // buffer underruns / dropouts.  PROP layout after 8-byte header:
            //   uint16 version | uint32 maxBitRate | uint32 avgBitRate | ...
            // so avgBitRate lives at PROP.offset + 8 + 2 + 4 = +14.
            const propChunk = this.getRealMediaChunk(media, 'PROP');
            if (propChunk && propChunk.size >= 22) {
                const avgBitRate = media.readUInt32BE(propChunk.offset + 14);
                if (avgBitRate > 0) {
                    session.avgBitRate = avgBitRate;
                    this.debugLog('media avgBitRate', session.id, `${avgBitRate} bps`);
                }
            } else {
                this.debugLog('prepareMediaData: PROP chunk', session.id, propChunk ? `size=${propChunk.size}` : 'missing');
            }

            // Parse channel count from MDPR type-specific codec bytes.
            // This avoids using filename/extension heuristics and gives us a
            // format-driven selector for the on-wire RDT header profile.
            let mdprChannels = null;
            const mdprChunk = this.getRealMediaChunk(media, 'MDPR');
            if (mdprChunk && mdprChunk.size >= 48) {
                try {
                    const mdpr = mdprChunk.chunk;
                    let mdprOff = 40;
                    if (mdprOff < mdpr.length) {
                        const nameLen = mdpr.readUInt8(mdprOff);
                        mdprOff += 1 + nameLen;
                        if (mdprOff < mdpr.length) {
                            const mimeLen = mdpr.readUInt8(mdprOff);
                            mdprOff += 1 + mimeLen;
                            if (mdprOff + 4 <= mdpr.length) {
                                const typeSpecificLen = mdpr.readUInt32BE(mdprOff);
                                mdprOff += 4;
                                if (mdprOff + typeSpecificLen <= mdpr.length) {
                                    const tsd = mdpr.subarray(mdprOff, mdprOff + typeSpecificLen);
                                    const channelOffsets = [60, 80];
                                    for (const cOff of channelOffsets) {
                                        if (cOff + 2 > tsd.length) continue;
                                        const channelCandidate = tsd.readUInt16BE(cOff);
                                        if (channelCandidate === 1 || channelCandidate === 2) {
                                            mdprChannels = channelCandidate;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    this.debugLog('prepareMediaData: MDPR channel parse failed', session.id, e.message);
                }
            }
            session.audioChannels = mdprChannels;

            // Select an RDT header profile from parsed stream metadata.
            // Stereo (2ch) needs the RealServer-like profile from capture,
            // while mono (1ch) keeps the legacy profile.
            const cfgDataTypeLo = Number.isInteger(this.service_config.rdt_data_type_lo)
                ? (this.service_config.rdt_data_type_lo & 0xff)
                : null;
            const cfgSyncType = Number.isInteger(this.service_config.rdt_sync_type)
                ? (this.service_config.rdt_sync_type & 0xffff)
                : null;

            if (cfgDataTypeLo !== null && cfgSyncType !== null) {
                session.rdtDataTypeLo = cfgDataTypeLo;
                session.rdtSyncType = cfgSyncType;
                this.debugLog('rdt profile fixed by config', session.id,
                    `dataTypeLo=0x${session.rdtDataTypeLo.toString(16).padStart(2, '0')}`,
                    `syncType=0x${session.rdtSyncType.toString(16).padStart(4, '0')}`);
            } else if (mdprChannels === 1 || mdprChannels === 2) {
                const useLegacyProfile = mdprChannels === 1;
                session.rdtDataTypeLo = useLegacyProfile ? 0x64 : 0x50;
                session.rdtSyncType = useLegacyProfile ? 0x0477 : 0x04ba;
                this.debugLog('rdt profile from MDPR channels', session.id,
                    `channels=${mdprChannels}`,
                    useLegacyProfile ? 'mode=legacy' : 'mode=realserver',
                    `dataTypeLo=0x${session.rdtDataTypeLo.toString(16).padStart(2, '0')}`,
                    `syncType=0x${session.rdtSyncType.toString(16).padStart(4, '0')}`);
            } else {
                const threshold = Number.isInteger(this.service_config.rdt_stereo_bitrate_threshold)
                    ? this.service_config.rdt_stereo_bitrate_threshold
                    : 30000;
                const useLegacyProfile = Number.isFinite(session.avgBitRate) && session.avgBitRate > 0
                    ? session.avgBitRate < threshold
                    : false;

                session.rdtDataTypeLo = useLegacyProfile ? 0x64 : 0x50;
                session.rdtSyncType = useLegacyProfile ? 0x0477 : 0x04ba;
                this.debugLog('rdt profile auto', session.id,
                    `channels=${mdprChannels === null ? 'unknown' : mdprChannels}`,
                    `avgBitRate=${session.avgBitRate || 'unknown'}`,
                    `threshold=${threshold}`,
                    useLegacyProfile ? 'mode=legacy' : 'mode=realserver',
                    `dataTypeLo=0x${session.rdtDataTypeLo.toString(16).padStart(2, '0')}`,
                    `syncType=0x${session.rdtSyncType.toString(16).padStart(4, '0')}`);
            }

            // Parse DATA chunk records.  RA v4 DATA chunk:
            //   [DATA:4][size:4][ver:2][numPkts:4][nextDataOfs:4]  = 18 bytes header
            // Each record:
            //   [ver:2=0x0000][len:2][stream:2][ts:4][flags:2][audio:len-12]
            // The native RealServer maps each record 1:1 to an RDT data packet
            // of the same length, copying the flags field into the RDT header.
            const dataChunk = this.getRealMediaChunk(media, 'DATA');
            if (!dataChunk || dataChunk.size < 18) {
                this.debugLog('media DATA chunk missing or too small', session.id, dataChunk ? `size=${dataChunk.size}` : 'missing');
                return;
            }
            
            const dataOffset = dataChunk.offset;
            const dataSize = dataChunk.size;
            const chunkVersion = media.readUInt16BE(dataOffset + 8);
            const numPkts = media.readUInt32BE(dataOffset + 10);
            const nextDataOfs = media.readUInt32BE(dataOffset + 14);
            
            this.debugLog('prepareMediaData: DATA chunk header', session.id,
                `ver=${chunkVersion}`, `numPkts=${numPkts}`, `nextOfs=${nextDataOfs}`, `chunkSize=${dataSize}`);
            
            const frames = [];
            let o = dataOffset + 18;
            const end = dataOffset + dataSize;
            let frameIdx = 0;
            
            while (o + 12 <= end && frames.length < numPkts) {
                const recVer = media.readUInt16BE(o);
                const len = media.readUInt16BE(o + 2);
                const stream = media.readUInt16BE(o + 4);
                const ts = media.readUInt32BE(o + 6);
                const flags = media.readUInt16BE(o + 10);
                
                if (len < 12 || o + len > end) {
                    this.debugLog('prepareMediaData: frame parse stop', session.id,
                        `frame=${frameIdx}`, `len=${len}`, `o+len=${o + len}`, `end=${end}`);
                    break;
                }
                
                const audio = media.slice(o + 12, o + len);
                frames.push({ ts, flags, audio });
                
                if (frameIdx < 5) {
                    const frameHex = media.slice(o, Math.min(o + 32, end)).toString('hex');
                    const audioHex = audio.slice(0, Math.min(16, audio.length)).toString('hex');
                    const audioHash = crypto.createHash('sha1').update(audio).digest('hex').slice(0, 12);
                    const prevAudio = frameIdx > 0 ? frames[frameIdx - 1]?.audio : null;
                    const sameAsPrev = !!prevAudio && prevAudio.length === audio.length && prevAudio.equals(audio);
                    this.debugLog('prepareMediaData: frame', session.id,
                        `idx=${frameIdx}`, `offset=${o}`, `len=${len}`, `audioLen=${audio.length}`,
                        `frameHex=${frameHex}`, `audioHex=${audioHex}`,
                        `audioSha1=${audioHash}`, `sameAsPrev=${sameAsPrev}`);
                    
                    // Check if audio is all zeros
                    let isAllZero = audio.length > 0;
                    for (let i = 0; i < Math.min(100, audio.length); i++) {
                        if (audio[i] !== 0) {
                            isAllZero = false;
                            break;
                        }
                    }
                    if (isAllZero) {
                        this.debugLog('⚠️ prepareMediaData: frame audio is ALL ZEROS!', session.id, `idx=${frameIdx}`, `audioLen=${audio.length}`);
                    }
                }
                
                o += len;
                frameIdx++;
            }

            const timestampSample = frames.slice(0, Math.min(frames.length, 5)).map((frame) => frame.ts);
            const hasUsefulInitialTimestamps = timestampSample.length > 1
                && timestampSample.every((ts, idx) => idx === 0 || ts > timestampSample[idx - 1]);
            if (!hasUsefulInitialTimestamps && frames.length > 0) {
                const firstAudioLen = frames[0].audio?.length || 0;
                const syntheticStepMs = session.avgBitRate > 0 && firstAudioLen > 0
                    ? Math.max(1, Math.round((firstAudioLen * 8000) / session.avgBitRate))
                    : 232;
                for (let i = 0; i < frames.length; i++) {
                    frames[i].ts = i * syntheticStepMs;
                }
                this.debugLog('prepareMediaData: synthesized timestamps', session.id,
                    `nativeSample=[${timestampSample.join(',')}]`,
                    `step=${syntheticStepMs}ms`,
                    `count=${frames.length}`,
                    `lastTs=${frames[frames.length - 1].ts}`);
            }
            
            session.mediaFrames = frames;
            session.mediaFrameIdx = 0;
            const lastFrame = frames.length > 0 ? frames[frames.length - 1] : null;
            this.debugLog('prepareMediaData: complete', session.id,
                `frames=${frames.length}`,
                `duration=${lastFrame?.ts || 0}ms`);

            this.debugLog('media frames parsed', session.id,
                `count=${frames.length}`,
                `expected=${numPkts}`,
                `firstLen=${frames[0]?.audio.length}`,
                `lastLen=${frames[frames.length-1]?.audio.length}`);
        } catch (e) {
            this.debugLog('media payload load failed', session.id, e.message, e.stack);
        }
    }

    startUdpStream(socket, session) {
        if (!socket || !session || socket.destroyed) return;
        if (session.udpTimer || session.udpStartTimer) return;

        // Packet cadence is driven by the stream's avgBitRate (read from the
        // PROP chunk in prepareMediaData).  Each RDT data packet carries one
        // RA frame's audio payload (typically 600 bytes for cook).  The sync
        // frame adds 10 bytes every 5th packet, so amortize that into the
        // per-packet average to keep the long-run byte rate matching the
        // avgBitRate (otherwise ~0.4% underrun over time).
        // Fallback to 220 ms only if avgBitRate can't be determined.
        const syncEvery = Number.isInteger(session?.syncEvery) && session.syncEvery > 0
            ? session.syncEvery
            : 5;
        
        // Compute actual average frame siz
        // e from all frames
        let totalAudioBytes = 0;
        if (session.mediaFrames && session.mediaFrames.length > 0) {
            for (const frame of session.mediaFrames) {
                totalAudioBytes += frame.audio?.length || 0;
            }
        }
        const frameCount = session.mediaFrames?.length || 1;
        const bodyLen = frameCount > 0 ? totalAudioBytes / frameCount : 600;
        
        // Account for all overhead in actual UDP packets sent:
        // - 12-byte RDT header per packet
        // - 10-byte sync frame every syncEvery packets  
        const rdtHeaderSize = 12;
        const avgBytesPerPacket = rdtHeaderSize + bodyLen + (10 / syncEvery);
        
        // Compute pacing interval from avgBitRate.
        // Use the bitrate directly without buffer since avgBitRate is computed
        // from actual file payload and duration.
        // On Windows, setTimeout fires slower than requested due to timer
        // granularity. Compensation scales with interval: shorter intervals
        // need more compensation. Formula: 1 - (fixedOverhead / calculatedInterval)
        let intervalMs;

        if (session.avgBitRate > 0) {
            intervalMs = (avgBytesPerPacket * 8000) / session.avgBitRate;
            // Adaptive Windows timer compensation: 13ms is empirical fixed overhead
            const compensation = Math.max(0.90, 1 - (13 / intervalMs));
            intervalMs *= compensation;
            intervalMs -= 6;
        } else {
            intervalMs = 220;
        }

        const startDelayMs = 72;
        const redundantSeqs = Array.isArray(this.service_config.redundant_initial_seqs)
            ? this.service_config.redundant_initial_seqs.filter((value) => Number.isInteger(value) && value >= 0)
            : [];

        // Pre-start burst: send the first N ms of audio at double rate to
        // pre-fill the client buffer before settling into normal pacing.
        const burstPrestartMs = typeof this.service_config.burst_prestart_ms === 'number'
            ? this.service_config.burst_prestart_ms
            : 3000;
        const burstMultiplier = typeof this.service_config.burst_multiplier === 'number'
            ? this.service_config.burst_multiplier : 2;
        const burstFrameCount = burstPrestartMs > 0 ? Math.ceil(burstPrestartMs / intervalMs) : 0;
        session.burstFramesSent = 0;

        const targetIp = this.normalizeIpAddress(socket.remoteAddress);
        const mediaTargetPort = this.getMediaTargetPort(session);
        this.debugLog('udp stream start', session.id,
            `frames=${session.mediaFrames?.length || 0}`,
            `avgBitRate=${session.avgBitRate || 'unknown'}bps`,
            `bodyLen=${bodyLen}`,
            `interval=${intervalMs.toFixed(2)}ms`,
            `burstFrames=${burstFrameCount}`,
            `burstRate=${(session.avgBitRate * burstMultiplier) || 'unknown'}bps`,
            `target=${targetIp}:${mediaTargetPort}`,
            `sourcePort=${session.serverUdpPort || 'unknown'}`);

        if (!session.udpSocket || !this.sanitizeUdpPort(session.serverUdpPort)) {
            this.debugLog('udp stream start failed: socket not reserved', session.id);
            return;
        }
        if (!mediaTargetPort) {
            this.debugLog('udp stream start failed: no target port', session.id,
                `clientUdpPort=${session.clientUdpPort || 'none'}`,
                `feedbackPeerPort=${session.udpFeedbackPeerPort || 'none'}`);
            return;
        }

        this.attachUdpSocketHandlers(socket, session);

        if (session.udpFeedbackProbeTimer) {
            clearTimeout(session.udpFeedbackProbeTimer);
        }
        session.udpFeedbackProbeTimer = setTimeout(() => {
            session.udpFeedbackProbeTimer = null;
            if (!session.udpSocket || socket.destroyed) return;
            if ((session.udpInboundCount || 0) === 0) {
                this.debugLog('udp feedback not seen yet', session.id,
                    `streamTarget=${this.normalizeIpAddress(socket.remoteAddress)}:${mediaTargetPort}`,
                    'If packet capture shows ICMP port unreachable, client is not listening on requested UDP port.');
            }
        }, 2500);

        // sendPacket wraps buildMediaPayload with the every-5th-sync-frame
        // prefix and writes to the UDP socket.  Wall-seq and frame are passed
        // explicitly so any configured initial retransmit (and seeks)
        // can pair any wall-seq with any frame index.
        const sendPacket = (seq, frame) => {
            if (socket.destroyed || !session.udpSocket) return;
            const withSync = (seq > 0) && (seq % syncEvery === (syncEvery - 1));
            const dataFrame = this.buildMediaPayload(session, seq, frame);
            const out = withSync
                ? Buffer.concat([this.buildSyncFrame(session, seq), dataFrame])
                : dataFrame;
            this.cacheUdpPacketForRetransmit(session, seq, out);
            const txPort = this.getMediaTargetPort(session);
            if (!txPort) return;
            session.udpSocket.send(out, 0, out.length,
                txPort, targetIp, (err) => {
                    if (err) this.debugLog('udp send err', session.id, `${targetIp}:${txPort}`, err.message);
                });
        };

        // Wall-seq is the RDT byte-2/3 counter.  It ticks monotonically for
        // the lifetime of the session (including across seeks) while the
        // frame cursor (session.mediaFrameIdx) jumps around on seek.  We
        // close over `seq` in _startDataInterval so pause/resume can pick
        // up right where we left off.
        let seq = 0;
        session.mediaFrameIdx = 0;

        session._startDataInterval = () => {
            if (session.udpTimer) return;
            const tick = () => {
                session.udpTimer = null;
                if (socket.destroyed || !session.udpSocket) {
                    this.stopUdpStream(session);
                    return;
                }
                // Don't re-arm while paused; resumeUdpStream calls _startDataInterval.
                if (session.paused) return;

                const priorityUntil = session.udpPriorityUntil || 0;
                if (priorityUntil > Date.now()) {
                    const waitMs = Math.max(1, Math.min(priorityUntil - Date.now(), 10));
                    session.udpTimer = setTimeout(tick, waitMs);
                    return;
                }

                const frames = session.mediaFrames;
                if (!frames || session.mediaFrameIdx >= frames.length) {
                    // End of media: stop sending once all RA frames are out.
                    this.debugLog('udp stream complete', session.id, `sent=${seq}`);
                    // Signal end-of-stream to the client on TCP.  wtv2.pcap
                    // shows the native RealServer sending a single 0x45 byte
                    // ~0.5s after the last UDP packet; the client then FINs.
                    // Without this the client sits in 'buffering' forever
                    // waiting for more audio it will never get.
                    if (!session.eosSent) {
                        session.eosSent = true;
                        setTimeout(() => {
                            if (!socket.destroyed) {
                                this.send(socket, Buffer.from([0x45]));
                                this.debugLog('sent EOS marker', session.id);
                            }
                            this.stopUdpStream(session);
                        }, 500);
                    }
                    return;
                }
                const frame = frames[session.mediaFrameIdx];
                // Keyframe / post-seek resets the b5 low-nibble counter:
                // the next packet's lo = (seq - seekBaseSeq) & 0xf = 0.
                if (frame.flags & 0x02) session.seekBaseSeq = seq;
                sendPacket(seq, frame);
                seq++;
                session.mediaFrameIdx++;
                session.burstFramesSent++;
                // Use half the interval during the pre-start burst window, then
                // drop to normal pacing once burstFrameCount frames have been sent.
                const delay = session.burstFramesSent < burstFrameCount ? intervalMs / burstMultiplier : intervalMs;
                session.udpTimer = setTimeout(tick, delay);
            };
            const initialDelay = session.burstFramesSent < burstFrameCount ? intervalMs / burstMultiplier : intervalMs;
            session.udpTimer = setTimeout(tick, initialDelay);
        };

        session.udpStartTimer = setTimeout(() => {
            session.udpStartTimer = null;
            if (socket.destroyed) return;

            // Optional initial redundant burst for clients that benefit from
            // replaying the first packets before the normal interval starts.
            const frames = session.mediaFrames || [];
            for (const s of redundantSeqs) {
                const f = frames[s];
                if (f) {
                    if (f.flags & 0x02) session.seekBaseSeq = s;
                    sendPacket(s, f);
                }
            }

            session._startDataInterval();
        }, startDelayMs);
    }

    // RDT Latency/Sync report block.  Observed in multi_auth.pcap prepended
    // to every 5th data packet (making it a 622-byte datagram = 10 + 612).
    // Layout: [len16=0x000a][type16][flags8][seq8][timestamp24][pad8]
    // Captured example at seq 4: `00 0a 04 77 62 00 00 0a dc 00`.
    buildSyncFrame(session, seq) {
        const out = Buffer.alloc(10);
        const syncType = Number.isInteger(this.service_config.rdt_sync_type)
            ? (this.service_config.rdt_sync_type & 0xffff)
            : (Number.isInteger(session?.rdtSyncType) ? (session.rdtSyncType & 0xffff) : 0x04ba);
        out.writeUInt16BE(0x000a, 0);           // length
        out.writeUInt16BE(syncType, 2);         // type (latency report)
        out.writeUInt8(0x62, 4);                // flags/stream
        out.writeUInt8(0x00, 5);                // pad
        // Embed a pseudo-timestamp derived from seq (ms since stream start,
        // using the same 232 ms cadence as data frames).
        const syncTs = (seq * 232 * 3) & 0xffffff;
        out.writeUInt8((syncTs >> 16) & 0xff, 6);
        out.writeUInt8((syncTs >> 8) & 0xff, 7);
        out.writeUInt8(syncTs & 0xff, 8);
        out.writeUInt8(0x00, 9);
        return out;
    }

    buildMediaPayload(session, pSeq, pFrame) {
        const seq = pSeq !== undefined ? pSeq : (session ? session.udpSeq || 0 : 0);
        if (session && pSeq === undefined) session.udpSeq = seq + 1;
        const packetMode = session?.rdtPacketMode || 'rdt';
        const dataTypeLo = Number.isInteger(this.service_config.rdt_data_type_lo)
            ? (this.service_config.rdt_data_type_lo & 0xff)
            : (Number.isInteger(session?.rdtDataTypeLo) ? (session.rdtDataTypeLo & 0xff) : 0x50);

        // Pick the frame: caller can pass one explicitly (interval / burst /
        // seek path) or fall back to indexing by seq against mediaFrames.
        let frame = pFrame;
        if (frame === undefined) {
            frame = session?.mediaFrames?.[seq];
            if (session) {
                session.mediaFrameIdx = Math.max(session.mediaFrameIdx || 0, seq + 1);
            }
        }

        // RDT b5 nibble:
        //   high nibble = seekGen (1 on first play, ++ per 0x53 seek,
        //                 wraps within 4 bits skipping 0)
        //   low  nibble = (seq - seekBaseSeq) & 0xf
        // seekBaseSeq gets bumped to the current wall-seq whenever a
        // keyframe (RA flags bit 1) is emitted OR a seek occurs, which
        // causes lo to reset to 0 at those boundaries.  Matches the pattern
        // observed in multi_seek.pcap (gen1 → gen2 → gen5 on seeks, and
        // natural reset at mid-stream keyframes within a generation).
        const seekGen = (session?.seekGen || 1) & 0x0f;
        const seekBaseSeq = session?.seekBaseSeq || 0;
        const b5 = ((seekGen << 4) | ((seq - seekBaseSeq) & 0x0f));

        if (!frame) {
            // No media (or stream exhausted): emit a 12-byte-header filler.
            const out = Buffer.alloc(12);
            if (packetMode === 'classic-len') {
                out.writeUInt16BE(out.length & 0xffff, 0);
                out.writeUInt16BE(seq & 0xffff, 2);
                out[4] = 0x5a; out[5] = b5;
                out.writeUInt32BE(0, 6);
                out.writeUInt16BE(0, 10);
            } else {
                out[0] = 0x02; out[1] = dataTypeLo;
                out.writeUInt16BE(seq & 0xffff, 2);
                out[4] = 0x5a; out[5] = b5;
            }
            if (this.getDebugEnabled() && seq < 3) {
                this.debugLog('buildMediaPayload: no frame', `seq=${seq}`, `sessionSeq=${session?.mediaFrameIdx}`);
            }
            return out;
        }

        const audioLen = frame.audio.length;
        const out = Buffer.alloc(12 + audioLen);

        // RDT data-packet header (12 bytes).  Layout confirmed against
        // multi_auth.pcap seq 0..3 and multi_seek.pcap gen2+:
        //   [0..1]  02 xx               — packet type/flags (default 0x50)
        //   [2..3]  uint16 BE seq
        //   [4]     5a                  — stream flags (constant)
        //   [5]     (seekGen<<4) | ((seq-seekBaseSeq)&0xf)  — see b5 above
        //   [6..7]  uint16 BE ts high (0 for short clips)
        //   [8..9]  uint16 BE ts low  — from RA record
        //   [10..11] uint16 BE flags  — from RA record (0x0002 keyframe)
        if (packetMode === 'classic-len') {
            out.writeUInt16BE(out.length & 0xffff, 0);
            out.writeUInt16BE(seq & 0xffff, 2);
            out[4] = 0x5a;
            out[5] = b5;
        } else {
            out[0] = 0x02;
            out[1] = dataTypeLo;
            out.writeUInt16BE(seq & 0xffff, 2);
            out[4] = 0x5a;
            out[5] = b5;
        }
        out.writeUInt16BE((frame.ts >>> 16) & 0xffff, 6);
        out.writeUInt16BE(frame.ts & 0xffff, 8);
        out.writeUInt16BE(frame.flags & 0xffff, 10);
        frame.audio.copy(out, 12);
        
        if (this.getDebugEnabled() && seq < 3) {
            this.debugLog('buildMediaPayload: frame', `seq=${seq}`, `ts=${frame.ts}`, 
                `flags=0x${frame.flags.toString(16)}`, `audioLen=${audioLen}`,
                `audioHex=${frame.audio.slice(0, 16).toString('hex')}`);
        }
        
        return out;
    }

    buildPnaHello(session = null) {
        // The client advertises its local `time()` value in tag 0 of the
        // PNA request, XORed with 0x67E32B93.  The hello-parser in
        // pn_net::hello_state compares the server's 4 challenge bytes
        // against the un-masked value and silently closes the connection
        // on mismatch (error 34, 'bad magic').  Echoing the recovered
        // time back is the ONLY way modern WebTV PNM accepts the hello.
        //
        // Fallbacks when tag 0 is absent (older RealPlayer that doesn't
        // send it):
        //   - non-WebTV UA: use our wall-clock time (32-bit)
        //   - WebTV UA: use a small 16-bit increment (upper 16 bits MUST
        //     be zero for WebTV PNM to accept our hello in the first
        //     place — pre-tag-0 builds only range-check the low half).
        const CLIENT_TIME_MASK = 0x67E32B93;
        const isWebTV = session?.isWebTV === true;
        const forceNarrow = this.service_config.force_narrow_challenge === true;

        let challengeValue = null;
        let challengeSource = null;

        const tag0 = Array.isArray(session?.pnaFields)
            ? session.pnaFields.find((f) => f && f.id === 0 && f.len === 4)
            : null;
        if (tag0) {
            challengeValue = (tag0.value.readUInt32BE(0) ^ CLIENT_TIME_MASK) >>> 0;
            challengeSource = 'client-tag0';
        } else if (isWebTV || forceNarrow) {
            const base = this.service_config.server_challenge_base
                ?? (crypto.randomInt(0x0100, 0x0200) & 0xFFFF);
            const nextSession = this.sessionCounter + 1;
            challengeValue = (base + nextSession) & 0xFFFF;
            challengeSource = 'narrow-fallback';
        } else {
            challengeValue = Math.floor(Date.now() / 1000) >>> 0;
            challengeSource = 'wide-fallback';
        }

        if (session) {
            session.serverChallenge = challengeValue;
            if (typeof session.sessionNumber !== 'number') {
                session.sessionNumber = ++this.sessionCounter;
            }
            this.debugLog('pna hello', session.id,
                challengeSource,
                isWebTV ? '[WebTV]' : '',
                `challenge=0x${challengeValue.toString(16)}`);
        }
        const out = Buffer.alloc(9);
        out.write('PNA', 0, 'ascii');
        out[3] = 0x00;
        out[4] = 0x0a;
        out.writeUInt32BE(challengeValue, 5);
        return out;
    }

    buildDescriptorPacket(session = null) {
        const outChunks = [];

        // 4F headers: Rule Tags / Properties (based on capture to appease client parser)
        const initTags = Buffer.from('4f0800071a72000000014f060008000000034f02000c4f02000e4f02000f4f0200154f020010', 'hex');
        outChunks.push(initTags);

        let raBuffer = null;
        if (session && session.mediaPath) {
            try {
                raBuffer = fs.readFileSync(session.mediaPath);
            } catch(e) {
                this.debugLog('buildDescriptor error reading media', session.mediaPath, e.message);
            }
        }

        if (raBuffer && raBuffer.length > 8 && raBuffer.toString('latin1', 0, 4) === '.RMF') {
            let offset = 0;
            // Skip .RMF chunk (usually size 18)
            const rmfSize = raBuffer.readUInt32BE(4);
            offset += rmfSize;

            let chunksFound = [];
            const descriptorChunks = new Map();
            while (offset < raBuffer.length) {
                const tag = raBuffer.toString('latin1', offset, offset + 4);
                const size = raBuffer.readUInt32BE(offset + 4);

                // Descriptor typically includes PROP, CONT, and the first MDPR chunk
                if (['PROP', 'CONT'].includes(tag) || (tag === 'MDPR' && !chunksFound.includes('MDPR'))) {
                    chunksFound.push(tag);

                    let chunkData = raBuffer.subarray(offset, offset + size);
                    let finalSize = size;

                    // Normalize PROP tail fields to the stable RealServer values
                    // seen in both captures.
                    if (tag === 'PROP' && chunkData.length >= 50) {
                        const newChunk = Buffer.from(chunkData);
                        newChunk.writeUInt32BE(0x00000000, 28);
                        newChunk.writeUInt32BE(0xCC130000, 32);
                        newChunk.writeUInt32BE(0x10520000, 36);
                        newChunk.writeUInt32BE(0x00000000, 40);
                        newChunk.writeUInt32BE(0x00000001, 44);
                        newChunk.writeUInt16BE(0x0009, 48);
                        chunkData = newChunk;
                    }

                    // Clean CONT chunk by stripping trailing null bytes from string fields
                    if (tag === 'CONT' && chunkData.length >= 24) {
                        try {
                            const version = chunkData.readUInt16BE(8);
                            let off = 10;
                            const readField = () => {
                                const len = chunkData.readUInt16BE(off);
                                off += 2;
                                const buf = chunkData.subarray(off, off + len);
                                off += len;
                                let cLen = len;
                                while (cLen > 0 && buf[cLen - 1] === 0) cLen--;
                                return { cleanedLen: cLen, buf: buf.subarray(0, cLen) };
                            };
                            
                            const title = readField();
                            const author = readField();
                            const copyright = readField();
                            const comment = readField();
                            
                            finalSize = 10 + (2 + title.cleanedLen) + (2 + author.cleanedLen) + (2 + copyright.cleanedLen) + (2 + comment.cleanedLen);
                            const newChunk = Buffer.alloc(finalSize);
                            chunkData.subarray(0, 8).copy(newChunk, 0); // copy ID and Size
                            newChunk.writeUInt32BE(finalSize, 4); // update internal size
                            newChunk.writeUInt16BE(version, 8); // copy version
                            
                            let wOff = 10;
                            const writeField = (field) => {
                                newChunk.writeUInt16BE(field.cleanedLen, wOff); wOff += 2;
                                field.buf.copy(newChunk, wOff); wOff += field.cleanedLen;
                            };
                            writeField(title);
                            writeField(author);
                            writeField(copyright);
                            writeField(comment);
                            
                            chunkData = newChunk;
                        } catch (e) {
                            this.debugLog('buildDescriptor CONT rewrite error', e.message);
                        }
                    }

                    // Preserve the source MDPR unless a specific override is requested.
                    if (tag === 'MDPR' && chunkData.length >= 42) {
                        try {
                            const mdprFullHex = chunkData.toString('hex');
                            this.debugLog('buildDescriptor MDPR full hex ENTIRE', session?.id || '?',
                                `len=${chunkData.length}`, `hex=${mdprFullHex}`);

                            // RealMedia MDPR structure (after 8-byte "MDPR"+size header):
                            // 8-9: object version (u16)
                            // 10-11: stream number (u16)
                            // 12-15: max bitrate (u32)
                            // 16-19: avg bitrate (u32)
                            // 20-23: max packet size (u32)
                            // 24-27: avg packet size (u32)
                            // 28-31: start time (u32)
                            // 32-35: preroll (u32)
                            // 36-39: duration (u32)
                            const mdprObjVer = chunkData.readUInt16BE(8);
                            const mdprStreamNum = chunkData.readUInt16BE(10);
                            const mdprMaxBitrate = chunkData.readUInt32BE(12);
                            const mdprAvgBitrate = chunkData.readUInt32BE(16);
                            const mdprMaxPacketSize = chunkData.readUInt32BE(20);
                            const mdprAvgPacketSize = chunkData.readUInt32BE(24);
                            const mdprStartTime = chunkData.readUInt32BE(28);
                            const mdprPreroll = chunkData.readUInt32BE(32);
                            const mdprDuration = chunkData.readUInt32BE(36);

                            this.debugLog('buildDescriptor MDPR before cleanup', session?.id || '?',
                                `objVer=${mdprObjVer}`,
                                `streamNum=${mdprStreamNum}`,
                                `maxBr=${mdprMaxBitrate} bps`,
                                `avgBr=${mdprAvgBitrate} bps`,
                                `maxPkt=${mdprMaxPacketSize} B`,
                                `avgPkt=${mdprAvgPacketSize} B`,
                                `start=${mdprStartTime} ms`,
                                `preroll=${mdprPreroll} ms`,
                                `duration=${mdprDuration} ms`,
                                `mdprLen=${chunkData.length}`);

                            const codecCfg = this.service_config.mdpr_codec;
                            if (typeof codecCfg === 'string' && codecCfg.length === 4) {
                                const newChunk = Buffer.from(chunkData);
                                Buffer.from(codecCfg, 'ascii').copy(newChunk, 28);
                                chunkData = newChunk;
                                this.debugLog('buildDescriptor MDPR codec override', session?.id || '?', `codec=${codecCfg}`);
                            } else {
                                this.debugLog('buildDescriptor MDPR preserved', session?.id || '?', 'using source chunk without rewrite');
                            }

                            // Normalize string payload shape to match RealServer:
                            // StreamName and MIME are length-prefixed fields in the MDPR tail.
                            // RealServer includes explicit trailing NUL bytes in both fields,
                            // which increases MDPR size (commonly 0xA4 -> 0xA6).
                            let off = 40;
                            if (off + 1 < chunkData.length) {
                                const nameL = chunkData.readUInt8(off);
                                const nameStart = off + 1;
                                const nameEnd = nameStart + nameL;
                                if (nameEnd < chunkData.length) {
                                    off = nameEnd;
                                    const mimeL = chunkData.readUInt8(off);
                                    const mimeStart = off + 1;
                                    const mimeEnd = mimeStart + mimeL;
                                    if (mimeEnd <= chunkData.length) {
                                        const nameStr = chunkData.subarray(nameStart, nameEnd);
                                        const mimeStr = chunkData.subarray(mimeStart, mimeEnd);
                                        const needNameNull = nameL > 0 && nameStr[nameL - 1] !== 0;
                                        const needMimeNull = mimeL > 0 && mimeStr[mimeL - 1] !== 0;

                                        if (needNameNull || needMimeNull) {
                                            const finalNameL = nameL + (needNameNull ? 1 : 0);
                                            const finalMimeL = mimeL + (needMimeNull ? 1 : 0);
                                            const strBuf = Buffer.alloc(1 + finalNameL + 1 + finalMimeL);
                                            let w = 0;
                                            strBuf.writeUInt8(finalNameL, w++);
                                            nameStr.copy(strBuf, w); w += nameL;
                                            if (needNameNull) strBuf.writeUInt8(0, w++);
                                            strBuf.writeUInt8(finalMimeL, w++);
                                            mimeStr.copy(strBuf, w); w += mimeL;
                                            if (needMimeNull) strBuf.writeUInt8(0, w++);

                                            const head = chunkData.subarray(0, 40);
                                            const tail = chunkData.subarray(mimeEnd);
                                            const newChunk = Buffer.concat([head, strBuf, tail]);
                                            finalSize = newChunk.length;
                                            newChunk.writeUInt32BE(finalSize, 4);
                                            chunkData = newChunk;

                                            this.debugLog('buildDescriptor MDPR string normalize', session?.id || '?',
                                                `newLen=${finalSize}`,
                                                `nameL=${finalNameL}`,
                                                `mimeL=${finalMimeL}`);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            this.debugLog('buildDescriptor MDPR rewrite error', e.message);
                        }
                    }

                    // Wrap in [0x72] [size_16]
                    const wrap = Buffer.alloc(3);
                    wrap[0] = 0x72;
                    wrap.writeUInt16BE(finalSize & 0xFFFF, 1);
                    descriptorChunks.set(tag, [wrap, chunkData]);
                }

                if (tag === 'DATA') break; // stop parsing once media data starts
                offset += size;
            }

            for (const tag of ['PROP', 'CONT', 'MDPR']) {
                const chunkParts = descriptorChunks.get(tag);
                if (chunkParts) outChunks.push(...chunkParts);
            }
            
            // The real server appends a 5-byte 0x4C packet EOF marker before the session token tag
            outChunks.push(Buffer.from('4c00000000', 'hex'));

        } else if (raBuffer) {
            const classicRa = this.parseClassicRaHeader(raBuffer);
            if (classicRa) {
                const descriptorChunks = this.buildClassicRaDescriptorChunks(classicRa, raBuffer);
                for (const tag of ['PROP', 'CONT', 'MDPR']) {
                    const chunkData = descriptorChunks[tag];
                    if (!chunkData) continue;
                    const wrap = Buffer.alloc(3);
                    wrap[0] = 0x72;
                    wrap.writeUInt16BE(chunkData.length & 0xffff, 1);
                    outChunks.push(wrap, chunkData);
                }
                outChunks.push(Buffer.from('4c00000000', 'hex'));
                this.debugLog('buildDescriptor: classic RA fallback', session?.id || '?',
                    `codec=${classicRa.codec || 'unknown'}`,
                    `channels=${classicRa.channels || 'unknown'}`,
                    `packet=${classicRa.packetSize}`,
                    `dataOffset=${classicRa.dataOffset}`);
            } else {
                throw(new Error('Media file missing or unsupported format; expected .RMF or classic .ra'));
            }
        } else {
            throw(new Error('Media file missing or invalid .RMF format; cannot build descriptor'));
        }

        // Include the session token as tag 0x23 [size_16 = 64]
        const token = this.buildSessionToken(session);

        const tokenBuf = Buffer.alloc(3 + 64);
        tokenBuf[0] = 0x23;
        tokenBuf.writeUInt16BE(64, 1);
        Buffer.from(token, 'ascii').copy(tokenBuf, 3);
        outChunks.push(tokenBuf);

        const out = Buffer.concat(outChunks);

        // The first 0x4F/0x08 chunk carries [serverId_u32_BE][sessionCounter_u32_BE].
        // serverId is mapped from the reserved UDP source port as 0x0007pppp
        // so the client can route UDP feedback to the same socket used for
        // media transmission.
        const serverId = Number.isInteger(session?.serverId)
            ? session.serverId
            : ((this.serverIdPort16Base | 0x1a27) >>> 0);
        out.writeUInt32BE(serverId, 2);
        const sessionNumber = (session && typeof session.sessionNumber === 'number')
            ? session.sessionNumber
            : ++this.sessionCounter;
        out.writeUInt32BE(sessionNumber >>> 0, 6);

        return out;
    }



    parseClassicRaHeader(buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length < 64) return null;
        if (!(buffer[0] === 0x2e && buffer[1] === 0x72 && buffer[2] === 0x61 && buffer[3] === 0xfd)) return null;

        const header = {
            version: buffer.readUInt16BE(4),
            fourcc: buffer.toString('latin1', 8, 12),
            packetSize: null,
            channels: null,
            sampleRate: null,
            sampleSize: null,
            interleaver: null,
            codec: null,
            title: null,
            dataOffset: 0,
            avgBitRate: 20000,
            frameMs: 232,
            durationMs: 0
        };

        const packetA = buffer.readUInt16BE(42);
        const packetB = buffer.readUInt16BE(26);
        header.packetSize = (packetA > 0 && packetA <= 2000) ? packetA : ((packetB > 0 && packetB <= 2000) ? packetB : 600);

        const channels = buffer.readUInt16BE(54);
        header.channels = (channels === 1 || channels === 2) ? channels : null;
        header.sampleRate = buffer.readUInt16BE(48);
        header.sampleSize = buffer.readUInt16BE(52);

        // Duration is at a fixed offset in the RA4 header (offset 32)
        const rawDuration = buffer.readUInt32BE(32);
        if (rawDuration > 0 && rawDuration < 86_400_000) {
            header.durationMs = rawDuration;
        }

        let off = 56;
        // interleaver: uint8-length pascal string
        if (off < buffer.length) {
            const ilen = buffer.readUInt8(off); off++;
            if (ilen >= 1 && ilen <= 32 && off + ilen <= buffer.length) {
                header.interleaver = buffer.subarray(off, off + ilen).toString('latin1');
                off += ilen;
            }
        }
        // codec: uint8-length pascal string
        if (off < buffer.length) {
            const clen = buffer.readUInt8(off); off++;
            if (clen >= 1 && clen <= 32 && off + clen <= buffer.length) {
                header.codec = buffer.subarray(off, off + clen).toString('latin1');
                off += clen;
            }
        }
        // After codec, classic RA4 commonly stores:
        //   u16 aux/opaque marker, u16 titleLen, title bytes, optional NUL pad.
        // Example from realaudio3.pcap: 00 02 00 14 "Dialing WebTV (Mono)" 00 00 00
        if (off + 4 <= buffer.length) {
            off += 2; // aux/opaque marker (kept for alignment only)
            const titleLen = buffer.readUInt16BE(off); off += 2;
            if (titleLen > 0 && titleLen <= 255 && off + titleLen <= buffer.length) {
                header.title = buffer.subarray(off, off + titleLen).toString('latin1').replace(/\x00+$/g, '');
                off += titleLen;
            } else {
                // Fallback for variants that use 8-bit title length
                off -= 2;
                if (off < buffer.length) {
                    const titleLen8 = buffer.readUInt8(off); off++;
                    if (titleLen8 > 0 && titleLen8 <= 255 && off + titleLen8 <= buffer.length) {
                        header.title = buffer.subarray(off, off + titleLen8).toString('latin1').replace(/\x00+$/g, '');
                        off += titleLen8;
                    }
                }
            }
        }

        // Some files pad with 1-4 NUL bytes before packetized data.
        let nulPad = 0;
        while (off < buffer.length && buffer[off] === 0x00 && nulPad < 4) {
            off++;
            nulPad++;
        }

        header.dataOffset = Math.min(Math.max(off, 64), buffer.length);

        if (!(header.durationMs > 0 && header.durationMs < 86_400_000)) {
            header.durationMs = 0;
        }

        // Compute frame cadence from known profiles or header duration.
        // Known profiles are preferred; header duration is only used if no profile applies.
        if (header.codec === 'dnet' && header.dataOffset < buffer.length) {
            const payloadBytes = buffer.length - header.dataOffset;
            const packetCount = payloadBytes / header.packetSize;
            
            // Try known dnet profiles by (channels, packetSize) combinations
            let profileFrameMs = null;
            let profileChosen = false;
            
            if (header.channels === 1 && header.packetSize === 278) {
                profileFrameMs = 139;  // mono RA3/4 @ ~16kbps
                // Always use this profile for mono 278; duration inference will correct if needed
                header.frameMs = profileFrameMs;
                profileChosen = true;
            } else if (header.channels === 2 && header.packetSize === 480) {
                // Multiple bitrates possible for stereo 480:
                // Try 80kbps (frameMs=48) and 20kbps (frameMs=192)
                const dur80k = packetCount * 48;
                const dur20k = packetCount * 192;
                const ratio80k = header.durationMs > 0 ? (header.durationMs / dur80k) : 0;
                const ratio20k = header.durationMs > 0 ? (header.durationMs / dur20k) : 0;
                
                // Try to match header with a known profile
                if (ratio80k >= 0.9 && ratio80k <= 1.1) {
                    header.frameMs = 48;
                    profileChosen = true;
                } else if (ratio20k >= 0.9 && ratio20k <= 1.1) {
                    header.frameMs = 192;
                    profileChosen = true;
                } else if (!header.durationMs) {
                    // No header duration: default to 20kbps
                    header.frameMs = 192;
                    profileChosen = true;
                } else {
                    // Header duration doesn't match either profile closely.
                    // Don't trust the header; pick profile based on file size.
                    // Larger files tend to be 80kbps; smaller files 20kbps.
                    // Use ~600KB as threshold: 20kbps*240s ≈ 600KB
                    if (payloadBytes > 1_000_000) {
                        header.frameMs = 48;  // 80kbps profile
                    } else {
                        header.frameMs = 192;  // 20kbps profile
                    }
                    profileChosen = true;
                }
            } else if (header.channels === 1 && header.packetSize === 384) {
                profileFrameMs = 95;   // RA5 @ ~32kbps
                // Always use this profile for mono 384; duration inference will correct if needed
                header.frameMs = profileFrameMs;
                profileChosen = true;
            }
            
            // If no profile matched and we didn't already set frameMs, compute from header
            if (!profileChosen && header.durationMs > 0) {
                header.frameMs = Math.max(1, Math.round(header.durationMs / packetCount));
            }
        }

        // Generic cadence fallback when still no valid frameMs (non-dnet codec)
        if (!(header.frameMs > 0) || header.frameMs === 232) {
            header.frameMs = Math.max(1, Math.round((header.packetSize * 8000) / Math.max(1, header.avgBitRate)));
        }

        // Infer duration from packet count and cadence. This corrects header duration
        // when it's mismatched to actual packet timing.
        if (header.dataOffset < buffer.length && header.packetSize > 0 && header.frameMs > 0) {
            const payloadBytes = buffer.length - header.dataOffset;
            const packetCount = Math.ceil(payloadBytes / header.packetSize);
            const inferredDurationMs = packetCount * header.frameMs;
            if (inferredDurationMs > 0 && inferredDurationMs < 86_400_000) {
                const hasDuration = header.durationMs > 0;
                const ratio = hasDuration ? (header.durationMs / inferredDurationMs) : 0;
                if (!hasDuration || ratio < 0.75 || ratio > 1.25) {
                    header.durationMs = inferredDurationMs;
                }
            }
        }

        // Now compute bitrate from corrected duration and actual file payload.
        if (header.durationMs > 0 && header.dataOffset < buffer.length) {
            const payloadBytes = buffer.length - header.dataOffset;
            const computedAvg = Math.round((payloadBytes * 8 * 1000) / header.durationMs);
            if (computedAvg >= 2000 && computedAvg <= 256000) {
                header.avgBitRate = computedAvg;
            }
        }

        if (Number.isInteger(this.service_config.classic_ra_avg_bitrate)) {
            header.avgBitRate = Math.max(1000, this.service_config.classic_ra_avg_bitrate);
        }

        return header;
    }

    buildClassicRaDescriptorChunks(classicRa, buffer) {
        const avgBr = classicRa.avgBitRate || 20000;
        const maxBr = avgBr;
        const pkt = classicRa.packetSize || 600;
        const prerollMs = 2000;
        const durationMs = classicRa.durationMs || 0;

        const prop = Buffer.alloc(50);
        prop.write('PROP', 0, 'ascii');
        prop.writeUInt32BE(50, 4);
        prop.writeUInt16BE(0, 8);
        prop.writeUInt32BE(maxBr >>> 0, 10);
        prop.writeUInt32BE(avgBr >>> 0, 14);
        prop.writeUInt32BE(pkt >>> 0, 18);
        prop.writeUInt32BE(pkt >>> 0, 22);
        prop.writeUInt32BE(0, 26);
        prop.writeUInt32BE(0, 30);
        prop.writeUInt32BE(durationMs >>> 0, 34);
        prop.writeUInt32BE(prerollMs >>> 0, 38);
        prop.writeUInt32BE(0, 42);
        prop.writeUInt16BE(1, 46);
        prop.writeUInt16BE(9, 48);

        const titleBuf = Buffer.from(classicRa.title || '', 'latin1');
        const contSize = 10 + 2 + titleBuf.length + 2 + 0 + 2 + 0 + 2 + 0;
        const cont = Buffer.alloc(contSize);
        cont.write('CONT', 0, 'ascii');
        cont.writeUInt32BE(contSize, 4);
        cont.writeUInt16BE(0, 8);
        let cOff = 10;
        cont.writeUInt16BE(titleBuf.length, cOff); cOff += 2;
        titleBuf.copy(cont, cOff); cOff += titleBuf.length;
        cont.writeUInt16BE(0, cOff); cOff += 2;
        cont.writeUInt16BE(0, cOff); cOff += 2;
        cont.writeUInt16BE(0, cOff);

        const nameBuf = Buffer.from('Audio Stream\x00', 'latin1');
        const mimeBuf = Buffer.from('audio/x-pn-realaudio\x00', 'latin1');
        const tsd = buffer.subarray(0, Math.max(1, classicRa.dataOffset));
        const mdprSize = 40 + 1 + nameBuf.length + 1 + mimeBuf.length + 4 + tsd.length;
        const mdpr = Buffer.alloc(mdprSize);
        mdpr.write('MDPR', 0, 'ascii');
        mdpr.writeUInt32BE(mdprSize, 4);
        mdpr.writeUInt16BE(0, 8);
        mdpr.writeUInt16BE(0, 10);
        mdpr.writeUInt32BE(maxBr >>> 0, 12);
        mdpr.writeUInt32BE(avgBr >>> 0, 16);
        mdpr.writeUInt32BE(pkt >>> 0, 20);
        mdpr.writeUInt32BE(pkt >>> 0, 24);
        mdpr.writeUInt32BE(0, 28);
        mdpr.writeUInt32BE(prerollMs >>> 0, 32);
        mdpr.writeUInt32BE(durationMs >>> 0, 36);
        let mOff = 40;
        mdpr.writeUInt8(nameBuf.length, mOff); mOff += 1;
        nameBuf.copy(mdpr, mOff); mOff += nameBuf.length;
        mdpr.writeUInt8(mimeBuf.length, mOff); mOff += 1;
        mimeBuf.copy(mdpr, mOff); mOff += mimeBuf.length;
        mdpr.writeUInt32BE(tsd.length >>> 0, mOff); mOff += 4;
        tsd.copy(mdpr, mOff);

        return { PROP: prop, CONT: cont, MDPR: mdpr };
    }

    getRealMediaChunk(buffer, tag) {
        if (!buffer || !tag || tag.length !== 4) return null;
        const needle = Buffer.from(tag, 'ascii');
        const offset = buffer.indexOf(needle);
        if (offset < 0 || offset + 8 > buffer.length) return null;

        const size = buffer.readUInt32BE(offset + 4);
        if (size < 8 || offset + size > buffer.length) return null;

        return {
            tag,
            offset,
            size,
            chunk: buffer.slice(offset, offset + size)
        };
    }

    // Optimized-strlen equivalent from IDA: scan Buffer for first null byte,
    // return length capped at 56 (0x38).  Mirrors the assembly that reads 4
    // bytes at a time looking for a zero byte.
    pnmStrlen(buf) {
        if (!Buffer.isBuffer(buf) || buf.length === 0) return 0;
        const cap = Math.min(buf.length, 56);
        for (let i = 0; i < cap; i++) {
            if (buf[i] === 0) return i;
        }
        return cap;
    }

    // Challenge::Challenge(this, a2, a3, src, a5)
    // 64-byte MD5 input layout: [a2_BE a2_BE | src[0..55] XOR a5[0..55] | zeros]
    // a3 is unused.  a2 is written big-endian to both s[0..3] and s[4..7].
    computeChallengeHash(a2, srcBuf, xorBuf) {
        const key = Buffer.alloc(64, 0);
        key.writeUInt32BE(a2 >>> 0, 0);
        key.writeUInt32BE(a2 >>> 0, 4); // a2 repeated in both halves of the 8-byte key
        if (srcBuf) {
            const len = this.pnmStrlen(srcBuf);
            srcBuf.copy(key, 8, 0, len);
        }
        if (xorBuf) {
            const xorLen = this.pnmStrlen(xorBuf);
            for (let i = 0; i < xorLen; i++) key[8 + i] ^= xorBuf[i];
        }
        return crypto.createHash('md5').update(key).digest();
    }

    // Challenge::response1 / response2(this, src, a3, a4, a5)
    // 64-byte MD5 input layout: [a4_BE a5_BE | src[0..55] XOR a3[0..55] | zeros]
    // a4 fills s[0..3], a5 fills s[4..7] (two independent 32-bit values).
    computeResponseHash(a4, a5, srcBuf, xorBuf) {
        const key = Buffer.alloc(64, 0);
        key.writeUInt32BE(a4 >>> 0, 0);
        key.writeUInt32BE(a5 >>> 0, 4);
        if (srcBuf) {
            const len = this.pnmStrlen(srcBuf);
            srcBuf.copy(key, 8, 0, len);
        }
        if (xorBuf) {
            const xorLen = this.pnmStrlen(xorBuf);
            for (let i = 0; i < xorLen; i++) key[8 + i] ^= xorBuf[i];
        }
        return crypto.createHash('md5').update(key).digest();
    }

    buildSessionToken(session = null) {
        const challenge = session?.clientChallenge || '';
        const serverChallenge = session?.serverChallenge || 0;
        const challengeBuf = Buffer.from(challenge, 'latin1');
        const requestedMedia = session?.requestedMedia || '';
        const requestedMediaPath = this.normalizeRequestedMediaPath(requestedMedia);
        const resolvedBase = session?.mediaPath ? path.basename(session.mediaPath) : '';
        const requestedDir = requestedMediaPath ? path.posix.dirname(requestedMediaPath) : '';
        const resolvedMedia = resolvedBase
            ? (requestedDir && requestedDir !== '.' ? `${requestedDir}/${resolvedBase}` : resolvedBase)
            : requestedMediaPath;
        const responseSource = resolvedMedia || requestedMedia || challenge;
        const respSrcBuf = Buffer.from(responseSource, 'latin1');
        const timestamp = this.getClientTimestamp(session?.pnaFields) ?? Math.floor(Date.now() / 1000);
        const v12 = timestamp ^ 0x67E32B93;
        const initMD5 = this.computeChallengeHash(v12, challengeBuf, null).toString('hex');
        const initMD5Buf = Buffer.from(initMD5, 'latin1');
        // First half matches sub_44FE30(a2=filename, a3=initMD5, a4=serverChallenge, a5=0).
        const resp1 = this.computeResponseHash(serverChallenge, 0, respSrcBuf, initMD5Buf).toString('hex');

        this.debugLog('session token seed', session?.id || '?',
            `clientChallenge=${challenge}`,
            `requestedMedia=${requestedMedia}`,
            `responseSource=${responseSource}`,
            `serverChallenge=${serverChallenge.toString(16)}`,
            `v12=${v12}`,
            `resp1=${resp1}`, `initMD5=${initMD5}`);

        return resp1 + initMD5;
    }

    computeClientResponse(session) {
        const challenge = session?.clientChallenge || '';
        const serverChallenge = session?.serverChallenge || 0;
        if (!challenge) return null;
        const challengeBuf = Buffer.from(challenge, 'latin1');
        return this.computeResponseHash(serverChallenge, 0, challengeBuf, null).toString('hex');
    }

    extractCapabilities(data) {
        const out = new Set();
        const strings = data.toString('latin1').match(/[\x20-\x7E]{4,}/g) || [];
        strings.forEach((s) => {
            if (s.includes('pnrv') || s.includes('dnet') || s.includes('sipr') || s.includes('lpcJ') || s.includes('cook') || s.includes('WinNT_')) {
                const clean = s.trim().replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9_\-\.]+$/, '');
                if (clean.length > 0) out.add(clean);
            }
        });
        return Array.from(out).slice(0, 20);
    }

    getPnaFieldAliases(field) {
        if (!field) return [];

        switch (field.id) {
            case 0:
                return ['maskedclienttime', 'maskedtime'];
            case 1:
                return ['udpport', 'clientudpport'];
            case 4:
                return ['challenge', 'clientchallenge'];
            case 23:
                return ['timestamp', 'clienttimestamp'];
            case 0x42:
                return ['bitrate'];
            case 0x52:
                return ['requestedmedia', 'resourcepath', 'filename'];
            case 0x63:
                return ['useragent'];
            default:
                return [];
        }
    }

    decodePnaFieldValue(field, alias = null) {
        if (!field || !Buffer.isBuffer(field.value)) return null;

        if (alias === 'udpport' || alias === 'clientudpport') {
            return field.len >= 2 ? field.value.readUInt16BE(0) : null;
        }

        if (alias === 'maskedclienttime' || alias === 'maskedtime') {
            return field.len >= 4 ? field.value.readUInt32BE(0) : null;
        }

        if (alias === 'bitrate') {
            if (field.len >= 4) {
                return field.value.readUInt32BE(0);
            }

            const bitrateText = field.value.toString('latin1').replace(/\x00+$/g, '').trim();
            const bitrateMatch = bitrateText.match(/(?:bitrate|avg[_ -]?bitrate|max[_ -]?bitrate)\D+(\d{3,})/i);
            if (bitrateMatch) {
                return parseInt(bitrateMatch[1], 10);
            }
            return bitrateText || null;
        }

        const textValue = field.value.toString('latin1').replace(/\x00+$/g, '').trim();
        if (textValue.length > 0) {
            return textValue;
        }

        return Buffer.from(field.value);
    }

    attachPnaFieldAlias(fields, alias, field) {
        if (!alias || !fields || !field) return;

        const decodedValue = this.decodePnaFieldValue(field, alias);
        const fieldKey = `${alias}Field`;

        if (!(alias in fields)) {
            fields[alias] = decodedValue;
            fields[fieldKey] = field;
            return;
        }

        if (!Array.isArray(fields[alias])) {
            fields[alias] = [fields[alias]];
        }
        fields[alias].push(decodedValue);

        if (!Array.isArray(fields[fieldKey])) {
            fields[fieldKey] = [fields[fieldKey]];
        }
        fields[fieldKey].push(field);
    }

    decoratePnaFields(fields) {
        if (!Array.isArray(fields)) return fields;

        for (const field of fields) {
            if (!field) continue;

            this.attachPnaFieldAlias(fields, `field_${field.id}`, field);

            for (const alias of this.getPnaFieldAliases(field)) {
                this.attachPnaFieldAlias(fields, alias, field);
            }
        }

        return fields;
    }

    parsePnaMessage(data) {
        const pnaOffset = data.indexOf(Buffer.from('PNA\x00\x0a', 'latin1'));
        if (pnaOffset < 0) return null;

        const fields = [];
        let offset = pnaOffset + 5;
        const dbg = this.getDebugEnabled();

        // Phase 1: TLV fields (u16 tag, u16 len, value) until we hit the
        // special 'tag 0' end-of-TLV sentinel OR field 11 with len 0.
        // NOTE: field 11 with len 0 is NOT a guaranteed end marker;
        // phase 2 may still follow. We scan TLV until we can't parse more,
        // then unconditionally proceed to phase 2.
        while (offset + 4 <= data.length) {
            const fieldId = data.readUInt16BE(offset);

            // Tag 0 is the 'masked client time' field.  Per WebTV ROM
            // disassembly of Progressive Networks' pn_net::server_hello
            // this tag has NO length word — just a raw 4-byte value of
            // `time() ^ 0x67E32B93`.  The server MUST echo the un-masked
            // value as its 4 challenge bytes or pn_net::hello_state will
            // close the TCP connection with error 34.
            if (fieldId === 0 && offset + 6 <= data.length) {
                const value = data.slice(offset + 2, offset + 6);
                fields.push({ id: 0, len: 4, value, implicitLen: true });
                offset += 6;
                if (dbg) this.debugLog('pna phase 1 end at offset', offset, 'field 0 (special)');
                break; // tag 0 is always last in TLV phase
            }

            const fieldLen = data.readUInt16BE(offset + 2);
            offset += 4;
            if (fieldLen > 1024 || offset + fieldLen > data.length) {
                // Unparseable TLV entry — likely end of phase 1, break to phase 2
                if (dbg) this.debugLog('pna tlv end (unparse)', `id=0x${fieldId.toString(16)}`, `len=${fieldLen}`, `offset=${offset}`);
                offset -= 4;  // Back up to try as phase 2
                break;
            }

            const value = data.slice(offset, offset + fieldLen);
            fields.push({
                id: fieldId,
                len: fieldLen,
                value
            });
            offset += fieldLen;

            // Field 11 with len 0 is just a marker, doesn't guarantee end of phase 1
            // (phase 2 may still follow). Only break explicitly on tag 0.
        }

        if (dbg) this.debugLog('pna phase 1 end at offset', offset, `phase1_fields=${fields.length}`, `remaining=${data.length - offset} bytes`);

        // Phase 2: ASCII-marker section (single-byte marker, u16 BE length,
        // value).  Known markers observed in captures & ROM disasm:
        //   'c' (0x63) — User-Agent string
        //   'l' (0x6c) — (always len 0 in WebTV PNM)
        //   'R' (0x52) — requested resource path (media filename)
        //   'y' (0x79) — end-of-request terminator
        // We fold these into the same `fields` array using the marker byte
        // as the id so callers that look up id === 82 etc. still work.
        const phase2Start = offset;
        let phase2Count = 0;
        while (offset < data.length) {
            const marker = data[offset];
            const markerChar = String.fromCharCode(marker);
            if (marker === 0x79) {
                // 'y' terminator — optionally consumes nothing else.
                fields.push({ id: 0x79, len: 0, value: Buffer.alloc(0), asciiMarker: true });
                offset += 1;
                if (dbg) this.debugLog('pna phase 2 found terminator y at offset', offset - 1);
                break;
            }
            if (offset + 3 > data.length) {
                if (dbg) this.debugLog('pna phase 2 break: not enough data', `offset=${offset}`, `need 3, have=${data.length - offset}`);
                break;
            }
            const valLen = data.readUInt16BE(offset + 1);
            if (valLen > 1024 || offset + 3 + valLen > data.length) {
                if (dbg) this.debugLog('pna phase 2 break: bad valLen', `marker=0x${marker.toString(16)}(${markerChar})`, `valLen=${valLen}`, `at offset=${offset}`);
                break;
            }
            const value = data.slice(offset + 3, offset + 3 + valLen);
            const valuePreview = value.toString('latin1').slice(0, 60).replace(/[^\x20-\x7E]/g, '.');
            fields.push({ id: marker, len: valLen, value, asciiMarker: true });
            phase2Count++;
            if (dbg) this.debugLog('pna phase 2 marker', `0x${marker.toString(16)}(${markerChar})`, `len=${valLen}`, `val=${valuePreview}`);
            offset += 3 + valLen;
        }

        if (dbg) this.debugLog('pna phase 2 complete', `start_offset=${phase2Start}`, `end_offset=${offset}`, `phase2_markers=${phase2Count}`, `total_fields=${fields.length}`);

        return this.decoratePnaFields(fields);
    }

}

module.exports = WTVPNM;