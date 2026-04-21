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

    constructor(minisrv_config, service_name = 'pnm') {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        this.service_config = minisrv_config.services[service_name] || {};
        this.wtvshared = new WTVShared(minisrv_config, true);
        this.server = net.createServer((socket) => this.handleConnection(socket));

        // Stable 32-bit "server id" byte embedded in the first 0x4F chunk of every
        // descriptor.  Observed RealServer values all share the same high bytes
        // (0x00071a??), so keep the upper 24 bits fixed and randomize the low byte
        // per process lifetime.  The low byte (= descriptor[5]) is NOT a checksum;
        // cross-referenced against multi_auth.pcap it is constant within a single
        // server process.
        this.serverId = 0x00071a00 | (crypto.randomInt(0, 0x100) & 0xff);

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
            eosSent: false
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

        if (data.includes(Buffer.from('PNA\x00\x0a', 'latin1'))) {
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

            // Extract UDP port from PNA field ID 1 (2 bytes, big-endian)
            const udpPortField = session.pnaFields.find(f => f.id === 1 && f.len === 2);
            if (udpPortField) {
                session.clientUdpPort = udpPortField.value.readUInt16BE(0);
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
                // Detect WebTV via User-Agent string in raw request data.
                // The WebTV PNM client advertises cook/sipr caps like modern
                // RealPlayer, so codec-sniffing is unreliable; the UA is the
                // only dependable discriminator.  Captured UA format:
                //   'Mozilla/3.0 WebTV/2.5 (Compatible; MSIE 2.0)'
                const raw = data.toString('latin1');
                session.isWebTV = /WebTV\//i.test(raw);
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

            if (session.requestedMedia && !session.mediaPath) {
                console.log(' * PNM RealServer Warning: requested media not found', session.requestedMedia);
                this.sendNotFound(socket, session.requestedMedia);
                session.notFoundSent = true;
                return;
            } else {
                console.log(' * PNM RealServer Request from', session.id, 'for media', session.mediaPath);
            }
        }

        if (session.notFoundSent) return;

        if (!session.helloSent && (ascii.includes('GET /a') || data.includes(Buffer.from('PNA\x00\x0a', 'latin1')))) {
            this.sendHelloSequence(socket, session);
            return;
        }

        if (session.helloSent && !session.descriptorSent && (ascii.includes('GET /r') || ascii.includes('BET /r') || ascii.toLowerCase().includes('sta'))) {
            this.sendDescriptorAndStartStream(socket, session, 'client-trigger');
            return;
        }

        if (session.helloSent && session.descriptorSent) {
            // Client sends hash response: 0x23 0x00 0x20 + 32 hex chars (35 bytes total)
            if (data.length === 35 && data[0] === 0x23) {
                const hashHex = data.toString('ascii', 3, 35);
                this.debugLog('client hash response', session.id, hashHex);
                // Verify client response: RNWK_MD5(serverHello_BE, 0x00000000, clientChallenge)
                const expectedResp = this.computeClientResponse(session);
                if (expectedResp && hashHex === expectedResp) {
                    this.debugLog('client hash VERIFIED', session.id);
                    session.hashVerified = true;
                } else {
                    this.debugLog('client hash MISMATCH', session.id, 'expected', expectedResp);
                }
                if (session.clientUdpPort) {
                    this.startUdpStream(socket, session);
                }
            } else {
                // Post-descriptor control byte stream.  See handleControlCommands
                // for opcode list.  Accumulate and decode — RP8 uses seek/
                // pause/resume commands here that can arrive coalesced or
                // fragmented across TCP segments.
                this.handleControlCommands(socket, session, data);
            }
            return;
        }
    }

    // Parse the post-descriptor TCP control stream sent by RealPlayer during
    // and after playback.  Observed opcodes (multi_seek.pcap, wtv2.pcap):
    //   0x21 ('!')  — 1 byte  — periodic keepalive during playback
    //   0x42 ('B')  — 1 byte  — play/resume (first seen right before UDP starts)
    //   0x50 ('P')  — 1 byte  — pause
    //   0x53 ('S')  — 5 bytes — seek: 0x53 + uint32-BE milliseconds
    //   0x67 ('g')  — 3+N bytes — client stats report: 0x67 + uint16-BE len + payload
    // The native RealServer does NOT application-reply to any of these on
    // TCP (only TCP-ACKs).  The one exception is the 0x45 end-of-stream
    // byte the server emits ~0.5s after the last UDP packet.
    handleControlCommands(socket, session, data) {
        session.ctrlBuf = session.ctrlBuf && session.ctrlBuf.length
            ? Buffer.concat([session.ctrlBuf, data])
            : Buffer.from(data);

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
                if (buf.length - off < 5) break; // need more data
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
                // Unknown byte — log once and skip to resync.
                this.debugLog('ctrl unknown', session.id, `op=0x${op.toString(16)}`,
                    'hex', buf.slice(off, off + 16).toString('hex'));
                off += 1;
            }
        }
        // Preserve any trailing incomplete command for next receive.
        session.ctrlBuf = off < buf.length ? buf.slice(off) : Buffer.alloc(0);
    }

    pauseUdpStream(session) {
        if (!session || session.paused) return;
        session.paused = true;
        if (session.udpTimer) {
            clearInterval(session.udpTimer);
            session.udpTimer = null;
        }
        this.debugLog('udp stream paused', session.id);
    }

    resumeUdpStream(socket, session) {
        if (!session || !session.paused) return;
        session.paused = false;
        // Re-arm the interval where it left off.  _startDataInterval is set
        // up by startUdpStream() and stays on the session so pause/seek/
        // resume can reuse the same timer machinery.
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
        session.mediaFrameIdx = idx;
        // Bump seek generation (RDT b5 high nibble).  multi_seek.pcap shows
        // it incrementing 1→2→3→4→5 across four seeks; we wrap within the
        // 4-bit field, skipping 0 so it always differs from 'no stream'.
        session.seekGen = ((session.seekGen || 0) + 1) & 0x0f;
        if (session.seekGen === 0) session.seekGen = 1;
        // Low nibble restarts at 0 on seek — the next packet carries the new
        // keyframe so seekBaseSeq will be updated in the interval callback
        // to match the wall-seq used for that packet.
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
        if (!Array.isArray(fields) || fields.length === 0) return this.scanRawForMediaName(rawData);

        // Field 0x52 (82) carries the requested file name in observed captures.
        const fileField = fields.find((f) => f && f.id === 82 && f.len > 0);
        if (fileField) {
            const raw = fileField.value.toString('latin1');
            const normalized = this.normalizeRequestedMediaPath(raw);
            if (normalized) return normalized;
        }

        // Some clients may carry filename in another TLV field; scan all text values.
        for (const field of fields) {
            if (!field || !field.len || field.len < 4) continue;
            const raw = field.value.toString('latin1').replace(/\x00+/g, ' ').trim();
            const match = raw.match(/([A-Za-z0-9_\-\.\/]+\.(?:ra|ray|rm|ram))/i);
            if (match) {
                const normalized = this.normalizeRequestedMediaPath(match[1]);
                if (normalized) return normalized;
            }
        }

        // Fallback: scan raw data buffer for media filename pattern.
        return this.scanRawForMediaName(rawData);
    }

    scanRawForMediaName(rawData) {
        if (!Buffer.isBuffer(rawData)) return null;
        const str = rawData.toString('latin1');
        const match = str.match(/([A-Za-z0-9_\-\.\/]+\.(?:ra|ray|rm|ram))(?:[^A-Za-z0-9]|$)/i);
        return match ? this.normalizeRequestedMediaPath(match[1]) : null;
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

        // RealServer sends the 9-byte PNA hello first, then WAITS for the
        // client to ACK it before sending the 361-byte descriptor (observed
        // ~85ms gap in wtv_multi.pcap).  When we send both back-to-back,
        // WebTV silently disconnects after the hello and RP8 gets stuck
        // buffering at 0kbps — both clients parse hello and descriptor in
        // separate states and dislike receiving the descriptor bytes before
        // the hello-handling state completes.
        //
        // Node's 'net' socket doesn't expose per-write ACK callbacks, but a
        // short timer approximates the real flow well enough: send hello,
        // then send descriptor ~100ms later (> typical delayed-ACK of 40ms
        // but < client timeout).  The gap also gives the client time to
        // parse the challenge before the next packet arrives.
        const hello = this.buildPnaHello(session);
        session.helloSent = true;
        this.send(socket, hello);
        this.debugLog('hello sent', session.id, `len=${hello.length}`);

        const descriptorDelay = (typeof this.service_config.descriptor_after_hello_ms === 'number')
            ? this.service_config.descriptor_after_hello_ms
            : 100;

        session.descriptorTimer = setTimeout(() => {
            session.descriptorTimer = null;
            if (socket.destroyed || session.descriptorSent) return;
            const descriptor = this.buildDescriptorPacket(session);
            session.descriptorSent = true;
            this.send(socket, descriptor);
            this.debugLog('descriptor sent', session.id, `len=${descriptor.length}`, `delay=${descriptorDelay}ms`);
            this.prepareMediaData(session);
        }, descriptorDelay);
    }

    clearDescriptorTimer(session) {
        if (!session) return;
        if (session.descriptorTimer) {
            clearTimeout(session.descriptorTimer);
            session.descriptorTimer = null;
        }
    }

    sendDescriptorAndStartStream(socket, session, reason) {
        if (!socket || !session || session.descriptorSent) return;
        this.clearDescriptorTimer(session);
        if (socket.destroyed) return;

        this.send(socket, this.buildDescriptorPacket(session));
        session.descriptorSent = true;
        this.debugLog('descriptor sent', session.id, reason);

        this.prepareMediaData(session);

        // Wait for UDP port response from client before starting stream
        this.debugLog('descriptor sent, waiting for client UDP port response on TCP connection', session.id);
    }

    stopUdpStream(session) {
        if (!session) return;
        if (session.udpStartTimer) {
            clearTimeout(session.udpStartTimer);
            session.udpStartTimer = null;
        }
        if (session.udpTimer) {
            clearInterval(session.udpTimer);
            session.udpTimer = null;
        }
        if (session.udpSocket) {
            try { session.udpSocket.close(); } catch(e) {}
            session.udpSocket = null;
        }
    }

    prepareMediaData(session) {
        if (!session || session.mediaFrames) return;

        if (!session.mediaPath || !fs.existsSync(session.mediaPath)) {
            return;
        }

        try {
            const media = fs.readFileSync(session.mediaPath);

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
            }

            // Parse DATA chunk records.  RA v4 DATA chunk:
            //   [DATA:4][size:4][ver:2][numPkts:4][nextDataOfs:4]  = 18 bytes header
            // Each record:
            //   [ver:2=0x0000][len:2][stream:2][ts:4][flags:2][audio:len-12]
            // The native RealServer maps each record 1:1 to an RDT data packet
            // of the same length, copying the flags field into the RDT header.
            const dataChunk = this.getRealMediaChunk(media, 'DATA');
            if (!dataChunk || dataChunk.size < 18) {
                this.debugLog('media DATA chunk missing or too small', session.id);
                return;
            }
            const numPkts = media.readUInt32BE(dataChunk.offset + 10);
            const frames = [];
            let o = dataChunk.offset + 18;
            const end = dataChunk.offset + dataChunk.size;
            while (o + 12 <= end && frames.length < numPkts) {
                const len = media.readUInt16BE(o + 2);
                if (len < 12 || o + len > end) break;
                const ts = media.readUInt32BE(o + 6);
                const flags = media.readUInt16BE(o + 10);
                const audio = media.slice(o + 12, o + len);
                frames.push({ ts, flags, audio });
                o += len;
            }
            session.mediaFrames = frames;
            session.mediaFrameIdx = 0;
            this.debugLog('media frames parsed', session.id,
                `count=${frames.length}`,
                `expected=${numPkts}`,
                `firstLen=${frames[0]?.audio.length}`);
        } catch (e) {
            this.debugLog('media payload load failed', session.id, e.message);
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
        const syncEvery = 5;
        const firstFrame = session.mediaFrames?.[0];
        const bodyLen = firstFrame ? firstFrame.audio.length : 600;
        const avgBytesPerPacket = bodyLen + (10 / syncEvery);
        const intervalMs = session.avgBitRate > 0
            ? (avgBytesPerPacket * 8000) / (session.avgBitRate + 1024)
            : 220;

        const startDelayMs = 72;
        const redundantSeqs = [0, 1];

        // Pre-start burst: send the first N ms of audio at double rate to
        // pre-fill the client buffer before settling into normal pacing.
        const burstPrestartMs = typeof this.service_config.burst_prestart_ms === 'number'
            ? this.service_config.burst_prestart_ms
            : 3000;
        const burstFrameCount = burstPrestartMs > 0 ? Math.ceil(burstPrestartMs / intervalMs) : 0;
        session.burstFramesSent = 0;

        this.debugLog('udp stream start', session.id,
            `frames=${session.mediaFrames?.length || 0}`,
            `avgBitRate=${session.avgBitRate || 'unknown'}bps`,
            `bodyLen=${bodyLen}`,
            `interval=${intervalMs.toFixed(2)}ms`,
            `burstFrames=${burstFrameCount}`,
            `target=${socket.remoteAddress}:${session.clientUdpPort}`);

        session.udpSocket = dgram.createSocket('udp4');
        session.udpSocket.on('error', (err) => {
            this.debugLog('udp socket error', session.id, err.message);
            this.stopUdpStream(session);
        });
        // Some RDT clients also send ACK/resend requests back on the same UDP
        // flow.  Bind so we can receive (even if we ignore the content).
        session.udpSocket.on('message', (msg, rinfo) => {
            this.debugLog('udp rx', session.id, `from=${rinfo.address}:${rinfo.port}`,
                `len=${msg.length}`, 'hex', msg.slice(0, 32).toString('hex'));
        });

        // sendPacket wraps buildMediaPayload with the every-5th-sync-frame
        // prefix and writes to the UDP socket.  Wall-seq and frame are passed
        // explicitly so the initial-burst retransmit of seq 0,1 (and seeks)
        // can pair any wall-seq with any frame index.
        const sendPacket = (seq, frame) => {
            if (socket.destroyed || !session.udpSocket) return;
            const withSync = (seq > 0) && (seq % syncEvery === (syncEvery - 1));
            const dataFrame = this.buildMediaPayload(session, seq, frame);
            const out = withSync
                ? Buffer.concat([this.buildSyncFrame(session, seq), dataFrame])
                : dataFrame;
            session.udpSocket.send(out, 0, out.length,
                session.clientUdpPort, socket.remoteAddress, (err) => {
                    if (err) this.debugLog('udp send err', session.id, err.message);
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
                const delay = session.burstFramesSent < burstFrameCount ? intervalMs / 2 : intervalMs;
                session.udpTimer = setTimeout(tick, delay);
            };
            const initialDelay = session.burstFramesSent < burstFrameCount ? intervalMs / 2 : intervalMs;
            session.udpTimer = setTimeout(tick, initialDelay);
        };

        session.udpStartTimer = setTimeout(() => {
            session.udpStartTimer = null;
            if (socket.destroyed) return;

            // Initial redundant burst: send seq 0,1 once, then the interval
            // takes over and re-sends frame 0,1,2,3,... with wall-seq 0,1,2,...
            // multi_auth.pcap shows the real RealServer doing this — RP8
            // uses the duplicates for loss recovery.
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
        out.writeUInt16BE(0x000a, 0);           // length
        out.writeUInt16BE(0x0477, 2);           // type (latency report)
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
        const b5 = (seekGen << 4) | ((seq - seekBaseSeq) & 0x0f);

        if (!frame) {
            // No media (or stream exhausted): emit a 12-byte-header filler.
            const out = Buffer.alloc(12);
            out[0] = 0x02; out[1] = 0x64;
            out.writeUInt16BE(seq & 0xffff, 2);
            out[4] = 0x5a; out[5] = b5;
            return out;
        }

        const audioLen = frame.audio.length;
        const out = Buffer.alloc(12 + audioLen);

        // RDT data-packet header (12 bytes).  Layout confirmed against
        // multi_auth.pcap seq 0..3 and multi_seek.pcap gen2+:
        //   [0..1]  02 64               — packet type/flags (constant)
        //   [2..3]  uint16 BE seq
        //   [4]     5a                  — stream flags (constant)
        //   [5]     (seekGen<<4) | ((seq-seekBaseSeq)&0xf)  — see b5 above
        //   [6..7]  uint16 BE ts high (0 for short clips)
        //   [8..9]  uint16 BE ts low  — from RA record
        //   [10..11] uint16 BE flags  — from RA record (0x0002 keyframe)
        out[0] = 0x02;
        out[1] = 0x64;
        out.writeUInt16BE(seq & 0xffff, 2);
        out[4] = 0x5a;
        out[5] = b5;
        out.writeUInt16BE((frame.ts >>> 16) & 0xffff, 6);
        out.writeUInt16BE(frame.ts & 0xffff, 8);
        out.writeUInt16BE(frame.flags & 0xffff, 10);
        frame.audio.copy(out, 12);
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

                    // Clean MDPR chunk by ensuring string fields are null-terminated and codec is injected
                    if (tag === 'MDPR' && chunkData.length >= 42) {
                        try {
                            // The native RealServer replaces the 'startTime' field (offset 28) 
                            // with the 4cc codec ID (e.g. 'slae' or 'cook') for Audio streams
                            // and seemingly adds a static padding byte after the MIME string.
                            
                            // The native RealServer overwrites the 'preroll' offset (32) and sometimes the
                            // 'startTime' offset (28) based on the link bandwidth of the client.
                            if (chunkData.indexOf(Buffer.from('audio/x-pn-', 'ascii')) > -1) {
                                // Enforce the '00 00 10 52' Preroll seen across all WebTV PCAPs
                                chunkData.writeUInt32BE(0x00001052, 32);
                                
                                // Legacy codec compatibility.  In wtv_multi.pcap the
                                // real RealServer leaks *uninitialized stack memory*
                                // into this slot (" lae", "\0\0\0\0", "Slae", "W ro"
                                // across 6 sessions) — WebTV still accepts it, so the
                                // client clearly doesn't read this field.  Default to
                                // zeros (the safest "uninitialized" equivalent).
                                // Override via service_config.mdpr_codec.
                                const codecCfg = this.service_config.mdpr_codec;
                                let codec;
                                if (codecCfg === 'slae' || codecCfg === 'cook') {
                                    codec = Buffer.from(codecCfg, 'ascii');
                                } else if (typeof codecCfg === 'string' && codecCfg.length === 4) {
                                    codec = Buffer.from(codecCfg, 'ascii');
                                } else {
                                    codec = Buffer.alloc(4, 0); // default: null bytes
                                }
                                codec.copy(chunkData, 28);
                            }

                            // Re-align and null-terminate string arrays
                            let off = 40; 
                            const nameL = chunkData.readUInt8(off);
                            const nameStr = chunkData.subarray(off + 1, off + 1 + nameL);
                            off += 1 + nameL;
                            const mimeL = chunkData.readUInt8(off);
                            const mimeStr = chunkData.subarray(off + 1, off + 1 + mimeL);
                            off += 1 + mimeL;

                            const needNameNull = nameStr[nameL - 1] !== 0;
                            const needMimeNull = mimeStr[mimeL - 1] !== 0;

                            const finalNameL = nameL + (needNameNull ? 1 : 0);
                            const finalMimeL = mimeL + (needMimeNull ? 1 : 0);

                            // Construct replacement middle-section
                            const strBuf = Buffer.alloc(1 + finalNameL + 1 + finalMimeL);
                            let w = 0;
                            strBuf.writeUInt8(finalNameL, w++);
                            nameStr.copy(strBuf, w); w += nameL;
                            if (needNameNull) strBuf.writeUInt8(0, w++);

                            strBuf.writeUInt8(finalMimeL, w++);
                            mimeStr.copy(strBuf, w); w += mimeL;
                            if (needMimeNull) strBuf.writeUInt8(0, w++);

                            const head = chunkData.subarray(0, 40);
                            const tail = chunkData.subarray(off);
                            
                            const newChunk = Buffer.concat([head, strBuf, tail]);
                            finalSize = newChunk.length;
                            newChunk.writeUInt32BE(finalSize, 4); // update internal size
                            chunkData = newChunk;

                        } catch (e) {
                            this.debugLog('buildDescriptor MDPR rewrite error', e.message);
                        }
                    }

                    // Wrap in [0x72] [size_16]
                    const wrap = Buffer.alloc(3);
                    wrap[0] = 0x72;
                    wrap.writeUInt16BE(finalSize & 0xFFFF, 1);
                    outChunks.push(wrap);
                    outChunks.push(chunkData);
                }

                if (tag === 'DATA') break; // stop parsing once media data starts
                offset += size;
            }
            
            // The real server appends a 5-byte 0x4C packet EOF marker before the session token tag
            outChunks.push(Buffer.from('4c00000000', 'hex'));

        } else {
            // Fallback generic chunks if media cannot be read or is invalid
            this.debugLog('Falling back to default metadata headers');
            outChunks.push(Buffer.from('72003250524f50000000320000000050bf000050bf0000025800000258000000000000cc130000105200000000000000000001000972001a434f4e540000001a0000000000000008284329203230303500007200a64d445052000000a600000000000050bf000050bf000002580000025800000000000010520000cc130d417564696f2053747265616d0015617564696f2f782d706e2d7265616c617564696f00000000562e7261fd000500002e726135000000100005000000460003000002580000000000025d990000000000090258003c0000000056220000562200000010000167656e72636f6f6b010700000000000801000001020000174c', 'hex'));
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
        // These are NOT a checksum of serverChallenge — verified against
        // multi_auth.pcap (6 sessions, constant serverId, incrementing counter).
        // Descriptor layout: [0x4F, 0x08, serverId(4), sessionCounter(4), ...]
        // so serverId occupies out[2..6] and sessionCounter occupies out[6..10].
        out.writeUInt32BE(this.serverId >>> 0, 2);
        const sessionNumber = (session && typeof session.sessionNumber === 'number')
            ? session.sessionNumber
            : ++this.sessionCounter;
        out.writeUInt32BE(sessionNumber >>> 0, 6);

        return out;
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

    parsePnaMessage(data) {
        const pnaOffset = data.indexOf(Buffer.from('PNA\x00\x0a', 'latin1'));
        if (pnaOffset < 0) return null;

        const fields = [];
        let offset = pnaOffset + 5;

        // Phase 1: TLV fields (u16 tag, u16 len, value) until we hit the
        // special 'tag 0' end-of-TLV sentinel.
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
                break; // tag 0 is always last in TLV phase
            }

            const fieldLen = data.readUInt16BE(offset + 2);
            offset += 4;
            if (fieldLen > 1024 || offset + fieldLen > data.length) {
                // Unparseable TLV entry — skip 1 byte from the field start and retry.
                offset -= 3;
                continue;
            }

            const value = data.slice(offset, offset + fieldLen);
            fields.push({
                id: fieldId,
                len: fieldLen,
                value
            });
            offset += fieldLen;

            if (fieldId === 11 && fieldLen === 0) {
                // End-of-header marker in older (non-tag-0) captures.
                return fields;
            }
        }

        // Phase 2: ASCII-marker section (single-byte marker, u16 BE length,
        // value).  Known markers observed in captures & ROM disasm:
        //   'c' (0x63) — User-Agent string
        //   'l' (0x6c) — (always len 0 in WebTV PNM)
        //   'R' (0x52) — requested resource path (media filename)
        //   'y' (0x79) — end-of-request terminator
        // We fold these into the same `fields` array using the marker byte
        // as the id so callers that look up id === 82 etc. still work.
        while (offset < data.length) {
            const marker = data[offset];
            if (marker === 0x79) {
                // 'y' terminator — optionally consumes nothing else.
                fields.push({ id: 0x79, len: 0, value: Buffer.alloc(0), asciiMarker: true });
                offset += 1;
                break;
            }
            if (offset + 3 > data.length) break;
            const valLen = data.readUInt16BE(offset + 1);
            if (valLen > 1024 || offset + 3 + valLen > data.length) break;
            const value = data.slice(offset + 3, offset + 3 + valLen);
            fields.push({ id: marker, len: valLen, value, asciiMarker: true });
            offset += 3 + valLen;
        }

        return fields;
    }

}

module.exports = WTVPNM;