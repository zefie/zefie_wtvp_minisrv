'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const tls = require('tls');
const crypto = require('crypto');
const RC4 = require('rc4-crypto');
const forge = require('node-forge');
const { http, https } = require('follow-redirects');
const { raw } = require('express');

class WTVMSNTV2 {
    constructor(minisrv_config, service_name, wtvshared, sendToClient, net, runScriptInVM, handlePHP, handleCGI, ssid_sessions, WTVClientSessionData, socket_sessions) {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        this.service_config = minisrv_config.services[service_name] || {};
        this.wtvshared = wtvshared;
        this.sendToClient = sendToClient;
        this.net = net;
        this.runScriptInVM = runScriptInVM || null;
        this.handlePHP = handlePHP || null;
        this.handleCGI = handleCGI || null;
        this.ssid_sessions = ssid_sessions || [];
        this.socket_sessions = socket_sessions || [];
        this.WTVClientSessionData = WTVClientSessionData || null;
        this.tlsContext = this.loadTlsContext();
        this.forgeTlsCredentials = this.loadForgeTlsCredentials();
        this.server = net.createServer((socket) => this.handleConnection(socket));
        this.mimeTypes = {
            html: 'text/html',
            htm: 'text/html',
            css: 'text/css',
            js: 'application/javascript',
            json: 'application/json',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
            txt: 'text/plain',
            xml: 'application/xml',
            csv: 'text/csv',
            svgz: 'image/svg+xml',
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            pdf: 'application/pdf'
        };
    }

    get maxProxyResponseBytes() {
        const defaultMb = 16;
        const configuredMb = parseFloat(this.service_config.max_response_size || defaultMb);
        const mb = Number.isFinite(configuredMb) && configuredMb > 0 ? configuredMb : defaultMb;
        return Math.max(1, mb) * 1024 * 1024;
    }

    isAllowedUserAgent(userAgent) {
        if (!userAgent || typeof userAgent !== 'string') return false;
        return /MSNTV|WebTV/i.test(userAgent);
    }

    listen(port, host = '0.0.0.0') {
        this.server.listen(port, host);
        console.log(` * Started MSNTV2 Proxy on port ${port}`);
        return this.server;
    }

    // Encode a BoxID into a reversible UUID v8 (custom layout shared with MSNTV2 scripts).
    static encodeSessionID(boxID) {
        const source = String(boxID || '').trim();
        if (!/^\d{1,20}$/.test(source)) return null;

        let value = BigInt(source);
        const data = new Uint8Array(9);
        for (let i = 8; i >= 0; i--) {
            data[i] = Number(value & 0xffn);
            value >>= 8n;
        }
        if (value !== 0n) return null; // would not fit in 9 bytes

        const uuid = new Uint8Array(16);
        uuid[0] = data[0];
        uuid[1] = data[1];
        uuid[2] = data[2];
        uuid[3] = data[3];
        uuid[4] = data[4];
        uuid[5] = data[5];
        uuid[6] = 0x80; // version 8 (custom)
        uuid[7] = data[6];
        uuid[8] = 0x80; // variant
        uuid[9] = data[7];
        uuid[10] = data[8];
        // uuid[11..15] remain zero padding

        const h = Buffer.from(uuid).toString('hex');
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
    }

    // Decode a reversible UUID v8 back to a 20-digit BoxID string.
    // Returns null if the UUID does not match our custom layout.
    static decodeSessionID(sessionID) {
        const h = String(sessionID || '').replace(/-/g, '').toLowerCase();
        if (!/^[0-9a-f]{32}$/.test(h)) return null;

        const b = Buffer.from(h, 'hex');
        if (b[6] !== 0x80 || b[8] !== 0x80) return null;

        const data = [b[0], b[1], b[2], b[3], b[4], b[5], b[7], b[9], b[10]];
        let big = 0n;
        for (const byte of data) big = (big << 8n) | BigInt(byte);
        return big.toString().padStart(20, '0');
    }

    // Set sslv2_debug: true in the service config to enable SSL/TLS protocol-level
    // debug logging (handshake stages, cipher setup, record enc/dec, write previews).
    // Defaults to false so normal operation is not flooded with crypto noise.
    get sslv2Debug() {
        return this.service_config.sslv2_debug === true;
    }

    handleConnection(socket) {
        socket.buffer = Buffer.alloc(0);
        socket.id = `msntv2-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        socket.ssid = null;
        socket.connectIntercept = null;
        socket.tlsSocket = null;
        socket.rawDataListener = (chunk) => this.handleData(socket, chunk);
        socket.on('data', socket.rawDataListener);
        socket.on('error', (err) => {
            if (this.service_config.show_verbose_errors) console.error('[WTV-MSNTV2] socket error:', err.message);
        });
    }

    handleData(socket, chunk) {
        socket.buffer = Buffer.concat([socket.buffer, chunk]);
        const maxRequestBytes = this.maxProxyResponseBytes;
        if (socket.buffer.length > maxRequestBytes) {
            this.writeError(socket, 413, 'Request Entity Too Large');
            socket.destroy();
            return;
        }

        const headerEnd = socket.buffer.indexOf('\r\n\r\n');
        if (headerEnd < 0) return;

        const headerBlock = socket.buffer.slice(0, headerEnd).toString('utf8');
        const headerLines = headerBlock.split('\r\n');
        const requestLine = headerLines.shift();
        const requestParts = requestLine.split(' ');
        if (requestParts.length < 3) {
            this.writeError(socket, 400, 'Bad Request');
            return;
        }

        const [method, requestUrl, protocol] = requestParts;
        const headers = {};
        const rawHeaders = [];

        headerLines.forEach((line) => {
            const idx = line.indexOf(':');
            if (idx > -1) {
                const name = line.slice(0, idx).trim();
                const value = line.slice(idx + 1).trim();
                headers[name] = value;
                headers[name.toLowerCase()] = value;
                rawHeaders.push(`${name}: ${value}`);
            }
        });

        const contentLength = parseInt(headers['content-length'] || '0', 10) || 0;
        if (contentLength > 0 && contentLength > maxRequestBytes) {
            this.writeError(socket, 413, 'Request Entity Too Large');
            socket.destroy();
            return;
        }
        const requestLength = headerEnd + 4 + contentLength;
        if (socket.buffer.length < requestLength) return;

        const body = socket.buffer.slice(headerEnd + 4, requestLength);
        const remaining = socket.buffer.slice(requestLength);
        socket.buffer = remaining;

        if (method.toUpperCase() === 'CONNECT') {
            if (remaining.length > 0) {
                socket.unshift(remaining);
            }
            socket.buffer = Buffer.alloc(0);
            this.handleConnect(socket, requestUrl);
            return;
        }

        const request_headers = {
            request: requestLine,
            request_url: requestUrl,
            raw_headers: `Request: ${requestLine}\r\n${rawHeaders.join('\r\n')}\r\n\r\n`,
            post_data: body.length ? body : null
        };

        Object.assign(request_headers, headers);

        const userAgent = request_headers['User-Agent'] || request_headers['user-agent'] || '';
        if (!this.isAllowedUserAgent(userAgent)) {
            if (this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3) {
                console.warn('[WTV-MSNTV2] unsupported User-Agent rejected:', userAgent || '<none>');
            }
            this.writeError(socket, 403, 'Forbidden', request_headers);
            return;
        }

        const verbose = this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3;
        if (verbose) {
            console.log('[WTV-MSNTV2] incoming request:', requestLine);
            if (body.length) {
                console.log('[WTV-MSNTV2] request body length:', body.length);
                console.log('[WTV-MSNTV2] request body (first 1024 bytes):', body.slice(0, 1024).toString('utf8'));
            }
        }

        console.log(" * MSNTV2 %s for %s on socket %s", method, requestUrl, socket.id);
        if (requestUrl.includes('?')) {
            try {
                const qs = requestUrl.slice(requestUrl.indexOf('?') + 1);
                const params = {};
                qs.split('&').forEach(p => {
                    const eq = p.indexOf('=');
                    if (eq > 0) params[decodeURIComponent(p.slice(0, eq))] = decodeURIComponent(p.slice(eq + 1).replace(/\+/g, ' '));
                    else if (p) params[decodeURIComponent(p)] = null;
                });
                console.log(' * MSNTV2 query params on socket %s', socket.id, params);
            } catch (_) {}
        }
        const { domainIntercepted, filePath } = this.interceptRequest(requestUrl, socket.connectIntercept);
        if (verbose) {
            console.log('[WTV-MSNTV2] intercept check for:', requestUrl, '->', domainIntercepted ? (filePath ? 'local file' : 'intercepted/404') : 'proxy');
        }
        if (domainIntercepted) {
            if (filePath) {
                this.sendLocalFile(socket, filePath, request_headers);
            } else {
                console.warn(" * MSNTV2 404 for %s on socket %s (intercepted domain, missing local file)", requestUrl, socket.id);
                this.writeError(socket, 404, 'Not Found', request_headers);
            }
        } else {
            this.proxyRequest(socket, method, requestUrl, request_headers);
        }
    }

    handleConnect(socket, requestUrl) {
        const [host, portString] = requestUrl.split(':');
        const port = parseInt(portString, 10) || 443;
        const verbose = this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3;
        const connectIntercept = this.getConnectIntercept(host);
        if (verbose) console.log('[WTV-MSNTV2] CONNECT request:', requestUrl, 'intercept:', !!connectIntercept);

        if (connectIntercept) {
            if (!this.forgeTlsCredentials && !this.tlsContext) {
                console.error('[WTV-MSNTV2] TLS intercept requested but no cert/key available');
                this.writeError(socket, 502, 'Bad Gateway');
                return;
            }
            socket.connectIntercept = connectIntercept;
            socket.removeListener('data', socket.rawDataListener);
            socket.write('HTTP/1.1 200 Connection Established\r\nProxy-agent: WTV-MSNTV2\r\n\r\n');
            if (verbose) console.log('[WTV-MSNTV2] CONNECT intercepted for host', host, '-> local_dir=', connectIntercept.localDir);
            this.setupSslv2Probe(socket, connectIntercept);
            return;
        }

        const remote = this.net.connect(port, host, () => {
            if (verbose) console.log('[WTV-MSNTV2] CONNECT tunnel established to', host + ':' + port);
            socket.write('HTTP/1.1 200 Connection Established\r\nProxy-agent: WTV-MSNTV2\r\n\r\n');
            socket.pipe(remote);
            remote.pipe(socket);
        });

        remote.on('error', (err) => {
            if (this.service_config.show_verbose_errors) console.error('[WTV-MSNTV2] CONNECT error:', err.message);
            this.writeError(socket, 502, 'Bad Gateway');
        });
    }

    setupTlsSocket(tlsSocket) {
        const verbose = this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3;
        const sslDebug = this.sslv2Debug;
        tlsSocket.on('secureConnect', () => {
            if (sslDebug) console.log('[WTV-MSNTV2] TLS handshake complete for intercepted CONNECT', tlsSocket.connectIntercept.match);
        });
        tlsSocket.on('data', (chunk) => this.handleTlsData(tlsSocket, chunk));
        tlsSocket.on('error', (err) => {
            if (verbose) console.error('[WTV-MSNTV2] TLS socket error:', err.message);
            try { tlsSocket.destroy(); } catch (_) {}
        });
        tlsSocket.on('end', () => {
            if (sslDebug) console.log('[WTV-MSNTV2] TLS socket ended:', tlsSocket.id);
            tlsSocket.end();
        });
        tlsSocket.on('close', () => {
            if (sslDebug) console.log('[WTV-MSNTV2] TLS socket closed:', tlsSocket.id);
        });
    }

    setupForgeTls(socket, connectIntercept) {
        const verbose = this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3;
        const sslDebug = this.sslv2Debug;
        const creds = this.forgeTlsCredentials;
        if (!creds) {
            console.error('[WTV-MSNTV2] missing forge TLS credentials');
            this.writeError(socket, 502, 'Bad Gateway');
            return;
        }

        const forgeConnection = forge.tls.createConnection({
            server: true,
            caStore: [],
            sessionCache: {},
            cipherSuites: [
                forge.tls.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA,
                forge.tls.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA,
                forge.tls.CipherSuites.TLS_RSA_WITH_3DES_EDE_CBC_SHA,
                forge.tls.CipherSuites.TLS_RSA_WITH_RC4_128_SHA,
                forge.tls.CipherSuites.TLS_RSA_WITH_RC4_128_MD5
            ],
            getCertificate: (connection, hint) => creds.cert,
            getPrivateKey: (connection, cert) => creds.key,
            verify: (connection, verified, depth, certs) => true,
            connected: (connection) => {
                if (sslDebug) console.log('[WTV-MSNTV2] forge TLS handshake complete');
            },
            tlsDataReady: (connection) => {
                const data = connection.tlsData.getBytes();
                socket.write(Buffer.from(data, 'binary'));
            },
            dataReady: (connection) => {
                const data = connection.data.getBytes();
                if (sslDebug) console.log('[WTV-MSNTV2] forge decrypted data length:', data.length);
                handleForgeData(connection, data);
            },
            closed: () => {
                if (sslDebug) console.log('[WTV-MSNTV2] forge TLS connection closed');
            },
            error: (connection, error) => {
                console.error('[WTV-MSNTV2] forge TLS error:', error && error.message ? error.message : error);
                if (connection && connection.close) {
                    try { connection.close(); } catch (_) {}
                }
                if (socket && !socket.destroyed) {
                    try { socket.destroy(); } catch (_) {}
                }
            }
        });

        const handleForgeData = (connection, data) => {
            connection.buffer = Buffer.concat([connection.buffer || Buffer.alloc(0), Buffer.from(data, 'binary')]);
            while (true) {
                const headerEnd = connection.buffer.indexOf('\r\n\r\n');
                if (headerEnd < 0) break;
                const headerBlock = connection.buffer.slice(0, headerEnd).toString('utf8');
                const headerLines = headerBlock.split('\r\n');
                const requestLine = headerLines.shift();
                const requestParts = requestLine.split(' ');
                if (requestParts.length < 3) {
                    if (verbose) {
                        console.warn('[WTV-MSNTV2] forge TLS invalid request line:', requestLine);
                        console.warn('[WTV-MSNTV2] forge TLS raw header block:', headerBlock);
                    }
                    this.writeError(socket, 400, 'Bad Request');
                    return;
                }
                const [method, requestUrl, protocol] = requestParts;
                const headers = {};
                const rawHeaders = [];
                headerLines.forEach((line) => {
                    const idx = line.indexOf(':');
                    if (idx > -1) {
                        const name = line.slice(0, idx).trim();
                        const value = line.slice(idx + 1).trim();
                        headers[name] = value;
                        headers[name.toLowerCase()] = value;
                        rawHeaders.push(`${name}: ${value}`);
                    }
                });
                const contentLength = parseInt(headers['content-length'] || '0', 10) || 0;
                const maxRequestBytes = this.maxProxyResponseBytes;
                if (contentLength > 0 && contentLength > maxRequestBytes) {
                    this.writeError(socket, 413, 'Request Entity Too Large');
                    return;
                }
                const requestLength = headerEnd + 4 + contentLength;
                if (connection.buffer.length < requestLength) break;
                const body = connection.buffer.slice(headerEnd + 4, requestLength);
                connection.buffer = connection.buffer.slice(requestLength);
                const request_headers = {
                    request: requestLine,
                    request_url: requestUrl,
                    raw_headers: `Request: ${requestLine}\r\n${rawHeaders.join('\r\n')}\r\n\r\n`,
                    post_data: body.length ? body : null
                };
                Object.assign(request_headers, headers);
                if (verbose) {
                    console.log('[WTV-MSNTV2] forge decrypted request:', requestLine);
                    console.log('[WTV-MSNTV2] forge decrypted headers:\n' + rawHeaders.join('\r\n'));
                }
                console.log(" * MSNTV2(Forge) %s for %s on socket %s", method, requestUrl, socket.id);
                if (requestUrl.includes('?')) {
                    try {
                        const qs = requestUrl.slice(requestUrl.indexOf('?') + 1);
                        const params = {};
                        qs.split('&').forEach(p => {
                            const eq = p.indexOf('=');
                            if (eq > 0) params[decodeURIComponent(p.slice(0, eq))] = decodeURIComponent(p.slice(eq + 1).replace(/\+/g, ' '));
                            else if (p) params[decodeURIComponent(p)] = null;
                        });
                        console.log(' * MSNTV2(Forge) query params on socket %s', socket.id, params);
                    } catch (_) {}
                }
                const { domainIntercepted: di, filePath: fp } = this.interceptRequest(requestUrl, connectIntercept);
                if (di) {
                    if (fp) {
                        this.sendLocalFile(socket, fp, request_headers);
                    } else {
                        console.warn(" * MSNTV2(Forge) 404 for %s on socket %s (intercepted domain, missing local file)", requestUrl, socket.id);
                        this.writeError(socket, 404, 'Not Found', request_headers);
                    }
                } else {
                    this.proxyRequest(socket, method, requestUrl, request_headers);
                }
            }
        };

        socket.on('data', (chunk) => {
            forgeConnection.process(chunk.toString('binary'));
        });

        socket.forgeTls = forgeConnection;
    }

    setupSslv2Probe(socket, connectIntercept) {
        socket.sslv2Probe = true;
        socket.sslv2Buffer = Buffer.alloc(0);
        socket.sslv2ConnectIntercept = connectIntercept;
        socket.sslv2ProbeListener = (chunk) => this.handleSslv2Probe(socket, chunk);
        socket.on('data', socket.sslv2ProbeListener);
    }

    handleSslv2Probe(socket, chunk) {
        socket.sslv2Buffer = Buffer.concat([socket.sslv2Buffer, chunk]);
        const header = this.parseSslv2Header(socket.sslv2Buffer);
        if (!header || socket.sslv2Buffer.length < header.headerLength + header.length) return;

        const payload = socket.sslv2Buffer.slice(header.headerLength, header.headerLength + header.length);
        const type = payload[0];
        const sslDebug = this.sslv2Debug;
        if (sslDebug) {
            console.log('[WTV-MSNTV2] SSLv2 probe header:', header, 'type:', type);
        }
        if (type === 1) {
            socket.removeListener('data', socket.sslv2ProbeListener);
            socket.sslv2Probe = false;
            this.setupLegacySslv2(socket, socket.sslv2ConnectIntercept, socket.sslv2Buffer);
            return;
        }

        socket.removeListener('data', socket.sslv2ProbeListener);
        socket.sslv2Probe = false;
        if (this.forgeTlsCredentials) {
            this.setupForgeTls(socket, socket.sslv2ConnectIntercept);
            if (socket.sslv2Buffer.length) {
                socket.forgeTls.process(socket.sslv2Buffer.toString('binary'));
            }
        } else if (this.tlsContext) {
            const tlsSocket = new tls.TLSSocket(socket, {
                isServer: true,
                secureContext: this.tlsContext,
                requestCert: false,
                rejectUnauthorized: false,
                secureProtocol: 'TLS_method',
                minVersion: 'SSLv1',
                maxVersion: 'TLSv1.3',
                secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT || 0
            });
            tlsSocket.connectIntercept = socket.sslv2ConnectIntercept;
            tlsSocket.id = socket.id;
            this.setupTlsSocket(tlsSocket);
            socket.tlsSocket = tlsSocket;
            if (socket.sslv2Buffer.length) {
                tlsSocket.emit('data', socket.sslv2Buffer);
            }
        } else {
            this.writeError(socket, 502, 'Bad Gateway');
        }
    }

    setupLegacySslv2(socket, connectIntercept, initialPayload) {
        const verbose = this.sslv2Debug;
        const creds = this.forgeTlsCredentials;
        if (!creds) {
            console.error('[WTV-MSNTV2] missing SSLv2 TLS credentials');
            this.writeError(socket, 502, 'Bad Gateway');
            return;
        }

        const certBytes = Buffer.from(forge.pem.decode(creds.certPem)[0].body, 'binary');
        if (verbose) {
            console.log('[WTV-MSNTV2] SSLv2 legacy handshake start, initial payload length:', initialPayload ? initialPayload.length : 0);
        }
        socket.sslv2 = {
            stage: 'hello',
            buffer: Buffer.from(initialPayload || Buffer.alloc(0)),
            connectIntercept,
            clientChallenge: null,
            serverChallenge: crypto.randomBytes(16),
            cipherSpec: null,
            cipherInfo: null,
            certBytes,
            connectionId: crypto.randomBytes(16),
            sessionId: crypto.randomBytes(16),
            keyPem: creds.keyPem,
            certPem: creds.certPem,
            clientCipher: null,
            serverCipher: null,
            clientMacKey: null,
            serverMacKey: null,
            masterSecret: null,
            clientSequence: 0,
            serverSequence: 0
        };

        socket.on('data', (chunk) => this.handleSslv2Data(socket, chunk));
        socket.on('error', (err) => {
            if (verbose) console.error('[WTV-MSNTV2] SSLv2 socket error:', err.message);
            try { socket.destroy(); } catch (_) {}
        });
        socket.on('close', () => {
            if (verbose) console.log('[WTV-MSNTV2] SSLv2 socket closed:', socket.id);
        });

        this.handleSslv2Data(socket, Buffer.alloc(0));
    }

    parseSslv2Header(buffer) {
        if (buffer.length < 2) return null;
        const first = buffer[0];
        if (first & 0x80) {
            return {
                headerLength: 2,
                length: ((first & 0x7f) << 8) | buffer[1],
                padding: 0,
                isEscape: false
            };
        }
        if (buffer.length < 3) return null;
        return {
            headerLength: 3,
            length: ((first & 0x3f) << 8) | buffer[1],
            padding: buffer[2],
            isEscape: (first & 0x40) !== 0
        };
    }

    parseSslv2ClientHello(payload) {
        if (payload.length < 9 || payload[0] !== 1) return null;
        const cipherSpecLength = payload.readUInt16BE(3);
        const sessionIdLength = payload.readUInt16BE(5);
        const challengeLength = payload.readUInt16BE(7);
        const totalLength = 9 + cipherSpecLength + sessionIdLength + challengeLength;
        if (payload.length < totalLength) return null;
        const cipherSpecs = [];
        let offset = 9;
        for (let i = 0; i < cipherSpecLength; i += 3) {
            cipherSpecs.push(payload.slice(offset + i, offset + i + 3));
        }
        offset += cipherSpecLength;
        const sessionId = payload.slice(offset, offset + sessionIdLength);
        offset += sessionIdLength;
        const challenge = payload.slice(offset, offset + challengeLength);

        return { cipherSpecs, sessionId, challenge, totalLength };
    }

    parseSslv2ClientMasterKey(payload) {
        if (payload.length < 10 || payload[0] !== 2) return null;
        const cipherKind = payload.slice(1, 4);
        const clearKeyLength = payload.readUInt16BE(4);
        const encryptedKeyLength = payload.readUInt16BE(6);
        const keyArgLength = payload.readUInt16BE(8);
        const totalLength = 10 + clearKeyLength + encryptedKeyLength + keyArgLength;
        if (payload.length < totalLength) return null;
        let offset = 10;
        const clearKey = payload.slice(offset, offset + clearKeyLength);
        offset += clearKeyLength;
        const encryptedKey = payload.slice(offset, offset + encryptedKeyLength);
        offset += encryptedKeyLength;
        const keyArg = payload.slice(offset, offset + keyArgLength);
        return { cipherKind, clearKey, encryptedKey, keyArg, totalLength };
    }

    parseSslv2ClientFinished(payload) {
        if (payload.length < 2 || payload[0] !== 3) return null;
        return { finished: payload.slice(1) };
    }

    pkcs1Type2Unpad(block) {
        if (!block || block.length < 11) return null;
        if (block[0] !== 0x00 || block[1] !== 0x02) return null;
        let idx = 2;
        while (idx < block.length && block[idx] !== 0x00) {
            idx += 1;
        }
        if (idx >= block.length) return null;
        return block.slice(idx + 1);
    }

    pkcs1Type1Pad(data, blockSize) {
        const msg = Buffer.from(data || Buffer.alloc(0));
        if (msg.length > blockSize - 3) {
            throw new Error('PKCS#1 type-1 message too long');
        }
        const psLength = blockSize - msg.length - 3;
        const ps = Buffer.alloc(psLength, 0xff);
        return Buffer.concat([Buffer.from([0x00, 0x01]), ps, Buffer.from([0x00]), msg]);
    }

    privateEncryptPkcs1Compat(privateKeyPem, data) {
        try {
            return crypto.privateEncrypt({
                key: privateKeyPem,
                padding: crypto.constants.RSA_PKCS1_PADDING
            }, data);
        } catch (err) {
            const keyObj = crypto.createPrivateKey(privateKeyPem);
            const modulusBits = keyObj.asymmetricKeyDetails && keyObj.asymmetricKeyDetails.modulusLength
                ? keyObj.asymmetricKeyDetails.modulusLength
                : 2048;
            const blockSize = Math.ceil(modulusBits / 8);
            const block = this.pkcs1Type1Pad(data, blockSize);
            return crypto.privateEncrypt({
                key: privateKeyPem,
                padding: crypto.constants.RSA_NO_PADDING
            }, block);
        }
    }

    decryptSslv2PreMaster(state, encryptedKey) {
        try {
            return crypto.privateDecrypt({
                key: state.keyPem,
                padding: crypto.constants.RSA_PKCS1_PADDING
            }, encryptedKey);
        } catch (err) {
            const msg = err && err.message ? err.message : '';
            if (!msg.includes('RSA_PKCS1_PADDING is no longer supported for private decryption')) {
                throw err;
            }
            const rawBlock = crypto.privateDecrypt({
                key: state.keyPem,
                padding: crypto.constants.RSA_NO_PADDING
            }, encryptedKey);
            const unpadded = this.pkcs1Type2Unpad(rawBlock);
            if (!unpadded) {
                throw new Error('Failed PKCS#1 type-2 unpad for SSLv2 ClientMasterKey');
            }
            return unpadded;
        }
    }

    buildSslv2Record(payload) {
        const header = Buffer.alloc(2);
        const length = payload.length;
        header[0] = 0x80 | ((length >> 8) & 0x7f);
        header[1] = length & 0xff;
        return Buffer.concat([header, payload]);
    }

    sslv2SequenceBuffer(sequence) {
        const out = Buffer.alloc(4);
        out.writeUInt32BE((sequence >>> 0), 0);
        return out;
    }

    sslv2Mac(macKey, payload, sequence, paddingData) {
        // SSLv2 MAC: HASH(secret, actual-data, padding-data, sequence-number)
        return crypto.createHash('md5')
            .update(macKey)
            .update(payload)
            .update(paddingData || Buffer.alloc(0))
            .update(this.sslv2SequenceBuffer(sequence))
            .digest();
    }

    buildSslv2EncryptedRecord(state, payload) {
        const mac = this.sslv2Mac(state.serverMacKey, payload, state.serverSequence, Buffer.alloc(0));
        const plain = Buffer.concat([mac, payload]);
        const encrypted = state.serverCipher.update(plain);
        const length = encrypted.length;
        let header;
        if (state.cipherInfo && state.cipherInfo.ivLength === 0) {
            // For stream ciphers (RC4), legacy peers commonly use 2-byte SSLv2 record headers.
            header = Buffer.alloc(2);
            header[0] = 0x80 | ((length >> 8) & 0x7f);
            header[1] = length & 0xff;
        } else {
            header = Buffer.alloc(3);
            header[0] = (length >> 8) & 0x3f;
            header[1] = length & 0xff;
            header[2] = 0x00;
        }
        const verbose = this.sslv2Debug;
        if (verbose && payload.length <= 20) {
            console.log('[WTV-MSNTV2] buildSslv2EncryptedRecord: serverSeq=' + state.serverSequence + ', payloadLen=' + payload.length + ', payload=' + payload.toString('hex') + ', macLen=16');
        }
        state.serverSequence += 1;
        return Buffer.concat([header, encrypted]);
    }

    decodeSslv2EncryptedRecord(state, encryptedRecord, header) {
        const verbose = this.sslv2Debug;
        const decrypted = state.clientCipher.update(encryptedRecord);
        const macLen = state.cipherInfo && state.cipherInfo.macLength ? state.cipherInfo.macLength : 16;
        if (!decrypted || decrypted.length < macLen) {
            return null;
        }
        const receivedMac = decrypted.slice(0, macLen);
        let payload = decrypted.slice(macLen);
        if (header.padding && payload.length >= header.padding) {
            payload = payload.slice(0, payload.length - header.padding);
        }
        const expectedMac = this.sslv2Mac(state.clientMacKey, payload, state.clientSequence, Buffer.alloc(0));
        if (verbose && payload.length <= 20) {
            console.log('[WTV-MSNTV2] decodeSslv2EncryptedRecord: clientSeq=' + state.clientSequence + ', payloadLen=' + payload.length + ', payload=' + payload.toString('hex') + ', receivedMac=' + receivedMac.toString('hex') + ', expectedMac=' + expectedMac.toString('hex'));
        }
        if (!crypto.timingSafeEqual(receivedMac, expectedMac)) {
            if (verbose) {
                console.warn('[WTV-MSNTV2] SSLv2 MAC mismatch on encrypted record seq=', state.clientSequence);
            }
            return null;
        }
        state.clientSequence += 1;
        return payload;
    }

    buildSslv2ServerHello(state) {
        const sessionIdHit = Buffer.from([0x00]);
        const certificateTypeX509 = Buffer.from([0x01]);
        const version = Buffer.from([0x00, 0x02]);
        const certLength = Buffer.alloc(2);
        certLength.writeUInt16BE(state.certBytes.length, 0);
        const cipherSpecLength = Buffer.alloc(2);
        cipherSpecLength.writeUInt16BE(state.cipherSpec.length, 0);
        const sessionIdLength = Buffer.alloc(2);
        sessionIdLength.writeUInt16BE(state.connectionId.length, 0);
        const payload = Buffer.concat([
            Buffer.from([4]),
            sessionIdHit,
            certificateTypeX509,
            version,
            certLength,
            cipherSpecLength,
            sessionIdLength,
            state.certBytes,
            state.cipherSpec,
            state.connectionId
        ]);
        return this.buildSslv2Record(payload);
    }

    setupSslv2Cipher(state, masterKey) {
        if (state.cipherInfo.algorithm === 'rc4') {
            // SSLv2 RC4 key schedule:
            // KM0 = MD5(master_key, '0', challenge, connection_id)
            // KM1 = MD5(master_key, '1', challenge, connection_id)
            // client_write = KM1, server_write = KM0
            const km0 = crypto.createHash('md5')
                .update(masterKey)
                .update(Buffer.from('0', 'ascii'))
                .update(state.clientChallenge)
                .update(state.connectionId)
                .digest();
            const km1 = crypto.createHash('md5')
                .update(masterKey)
                .update(Buffer.from('1', 'ascii'))
                .update(state.clientChallenge)
                .update(state.connectionId)
                .digest();
            const clientWriteKey = km1.slice(0, 16);
            const serverWriteKey = km0.slice(0, 16);

            const clientRc4 = new RC4.RC4(clientWriteKey);
            const serverRc4 = new RC4.RC4(serverWriteKey);
            state.clientCipher = {
                update: (data) => {
                    const out = clientRc4.updateFromBuffer(Buffer.from(data));
                    return Buffer.isBuffer(out) ? out : Buffer.from(out);
                }
            };
            state.serverCipher = {
                update: (data) => {
                    const out = serverRc4.updateFromBuffer(Buffer.from(data));
                    return Buffer.isBuffer(out) ? out : Buffer.from(out);
                }
            };
            // For these SSLv2 MD5 suites, the write keys are also the MAC secrets.
            state.clientMacKey = clientWriteKey;
            state.serverMacKey = serverWriteKey;
        } else {
            const keyLen = state.cipherInfo.keyLength;
            const ivLen = state.cipherInfo.ivLength || 0;
            const seed = Buffer.concat([state.clientChallenge, state.connectionId, state.keyArg || Buffer.alloc(0)]);
            const required = keyLen * 2 + ivLen * 2;
            let data = Buffer.alloc(0);
            let counter = 1;
            while (data.length < required) {
                const pad = Buffer.alloc(counter, counter);
                data = Buffer.concat([data, crypto.createHash('md5').update(masterKey).update(pad).update(seed).digest()]);
                counter += 1;
            }
            const clientKey = data.slice(0, keyLen);
            const serverKey = data.slice(keyLen, keyLen * 2);
            const clientIv = ivLen ? data.slice(keyLen * 2, keyLen * 2 + ivLen) : null;
            const serverIv = ivLen ? data.slice(keyLen * 2 + ivLen, keyLen * 2 + ivLen * 2) : null;
            state.clientCipher = crypto.createDecipheriv(state.cipherInfo.algorithm, clientKey, clientIv || Buffer.alloc(0));
            state.serverCipher = crypto.createCipheriv(state.cipherInfo.algorithm, serverKey, serverIv || Buffer.alloc(0));
            state.clientMacKey = clientKey;
            state.serverMacKey = serverKey;
        }
    }

    handleSslv2Data(socket, chunk) {
        const state = socket.sslv2;
        const verbose = this.sslv2Debug;
        if (!state) return;
        if (verbose) {
            console.log('[WTV-MSNTV2] SSLv2 handleSslv2Data stage=', state.stage, 'incoming chunk=', chunk.length, 'buffer before=', state.buffer.length);
        }
        state.buffer = Buffer.concat([state.buffer, chunk]);
        while (true) {
            const header = this.parseSslv2Header(state.buffer);
            if (!header || state.buffer.length < header.headerLength + header.length) break;
            if (verbose) {
                console.log('[WTV-MSNTV2] SSLv2 parsed record header=', header);
            }
            const record = state.buffer.slice(header.headerLength, header.headerLength + header.length);
            state.buffer = state.buffer.slice(header.headerLength + header.length);
            let plainRecord = record;
            const shouldDecrypt = !!state.clientCipher && state.stage !== 'hello' && state.stage !== 'master_key';
            if (shouldDecrypt) {
                if (!state.clientCipher || !state.clientMacKey) {
                    console.error('[WTV-MSNTV2] SSLv2 received encrypted record before cipher setup');
                    this.writeError(socket, 400, 'Bad SSLv2 Encrypted Record');
                    return;
                }
                plainRecord = this.decodeSslv2EncryptedRecord(state, record, header);
                if (!plainRecord) {
                    console.error('[WTV-MSNTV2] SSLv2 failed to decode encrypted record');
                    this.writeError(socket, 400, 'Bad SSLv2 Encrypted Record');
                    return;
                }
            } else if (header.padding) {
                plainRecord = record.slice(0, record.length - header.padding);
            }
            if (verbose) {
                console.log('[WTV-MSNTV2] SSLv2 record length=', plainRecord.length, 'remaining buffer=', state.buffer.length);
            }

            if (state.stage === 'hello') {
                const hello = this.parseSslv2ClientHello(plainRecord);
                if (!hello) {
                    if (verbose) console.log('[WTV-MSNTV2] SSLv2 failed to parse ClientHello');
                    this.writeError(socket, 400, 'Bad SSLv2 Hello');
                    return;
                }
                state.clientChallenge = hello.challenge;
                state.clientSessionId = hello.sessionId;
                const specsHex = hello.cipherSpecs.map((spec) => spec.toString('hex'));
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 client hello cipher specs:', specsHex);
                }
                state.cipherSpec = hello.cipherSpecs.find((spec) => this.sslv2CipherInfo(spec));
                if (!state.cipherSpec) {
                    console.error('[WTV-MSNTV2] unsupported SSLv2 cipher spec list:', specsHex.join(', '));
                    this.writeError(socket, 502, 'Unsupported Cipher');
                    return;
                }
                state.cipherInfo = this.sslv2CipherInfo(state.cipherSpec);
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 selected cipher spec:', state.cipherSpec.toString('hex'), 'info:', state.cipherInfo);
                }
                const serverHelloRecord = this.buildSslv2ServerHello(state);
                socket.write(serverHelloRecord);
                // Count plaintext ServerHello in each direction's sequence tracking so
                // ServerVerify uses seq=1 for legacy WinCE Schannel behavior.
                state.serverSequence += 1;
                state.clientSequence += 1;
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 wrote ServerHello');
                    console.log('[WTV-MSNTV2] SSLv2 ServerHello bytes (first 96):', serverHelloRecord.slice(0, 96).toString('hex'));
                }
                state.stage = 'master_key';
                continue;
            }

            if (state.stage === 'master_key') {
                const masterKey = this.parseSslv2ClientMasterKey(plainRecord);
                if (!masterKey) {
                    if (verbose) console.log('[WTV-MSNTV2] SSLv2 failed to parse ClientMasterKey');
                    this.writeError(socket, 400, 'Bad SSLv2 MasterKey');
                    return;
                }
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 BEFORE ClientMasterKey: clientSeq=' + state.clientSequence + ', serverSeq=' + state.serverSequence);
                }
                const cipherKindHex = masterKey.cipherKind.toString('hex');
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 ClientMasterKey cipherKind=', cipherKindHex, 'clearKeyLen=', masterKey.clearKey.length, 'encryptedKeyLen=', masterKey.encryptedKey.length, 'keyArgLen=', masterKey.keyArg.length);
                }
                state.keyArg = masterKey.keyArg;
                let secret = masterKey.clearKey;
                if (secret.length === 0 && masterKey.encryptedKey.length > 0) {
                    try {
                        secret = this.decryptSslv2PreMaster(state, masterKey.encryptedKey);
                        if (verbose) {
                            console.log('[WTV-MSNTV2] SSLv2 decrypted pre-master key length=', secret.length);
                        }
                    } catch (err) {
                        console.error('[WTV-MSNTV2] SSLv2 private decrypt failed:', err.message);
                        this.writeError(socket, 502, 'Bad Gateway');
                        return;
                    }
                }
                if (!secret || secret.length === 0) {
                    console.error('[WTV-MSNTV2] SSLv2 missing secret');
                    this.writeError(socket, 502, 'Bad Gateway');
                    return;
                }
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 masterKey=', secret.toString('hex'));
                }
                state.masterSecret = secret;
                this.setupSslv2Cipher(state, secret);
                const serverVerifyRecord = this.buildSslv2ServerVerify(state);
                socket.write(serverVerifyRecord);
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 wrote ServerVerify seq=', state.serverSequence - 1);
                    console.log('[WTV-MSNTV2] SSLv2 ServerVerify bytes (first 64):', serverVerifyRecord.slice(0, 64).toString('hex'));
                }
                // Per OpenSSL s2_srvr.c: server sends ServerVerify AND ServerFinished
                // BEFORE waiting for ClientFinished. WinCE Schannel's state machine
                // expects ServerFinished to arrive before it sends ClientFinished.
                // Sending ServerFinished late (after ClientFinished) causes the client
                // to be in 'open' state already, treating ServerFinished as application
                // data, which fails and triggers a RST.
                const serverFinishedRecord = this.buildSslv2ServerFinished(state);
                socket.write(serverFinishedRecord);
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 wrote ServerFinished seq=', state.serverSequence - 1);
                    console.log('[WTV-MSNTV2] SSLv2 ServerFinished mode=', state.lastServerFinishedMode || 'server', 'clientSessionIdLen=', state.clientSessionId ? state.clientSessionId.length : 0);
                    console.log('[WTV-MSNTV2] SSLv2 ServerFinished payload data:', (state.lastServerFinishedData || Buffer.alloc(0)).toString('hex'));
                    console.log('[WTV-MSNTV2] SSLv2 ServerFinished bytes (first 64):', serverFinishedRecord.slice(0, 64).toString('hex'));
                }
                state.clientSequence += 1;
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 after sending ServerVerify+ServerFinished: clientSeq=' + state.clientSequence + ', serverSeq=' + state.serverSequence);
                }
                state.stage = 'client_finished';
                continue;
            }

            if (state.stage === 'client_finished') {
                const finished = this.parseSslv2ClientFinished(plainRecord);
                if (!finished) {
                    if (verbose) console.log('[WTV-MSNTV2] SSLv2 failed to parse ClientFinished');
                    if (verbose) {
                        console.log('[WTV-MSNTV2] SSLv2 ClientFinished first byte=', plainRecord.length ? plainRecord[0] : null, 'hex(first 48)=', plainRecord.slice(0, 48).toString('hex'));
                    }
                    this.writeError(socket, 400, 'Bad SSLv2 Finished');
                    return;
                }
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 received ClientFinished length=', finished.finished.length, 'clientSeq=', state.clientSequence);
                }
                if (!finished.finished.equals(state.connectionId)) {
                    console.error('[WTV-MSNTV2] SSLv2 ClientFinished mismatch with connection-id');
                    this.writeError(socket, 400, 'Bad SSLv2 Finished');
                    return;
                }
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 handshake complete, transitioning to open');
                }
                state.stage = 'open';
                continue;
            }

            if (state.stage === 'open') {
                if (verbose) {
                    console.log('[WTV-MSNTV2] SSLv2 application record length:', plainRecord.length);
                }
                if (plainRecord && plainRecord.length) {
                    this.handleSslv2ApplicationData(socket, plainRecord);
                }
                continue;
            }

            break;
        }
    }

    sslv2CipherInfo(cipherSpec) {
        const cipherKey = cipherSpec.toString('hex');
        const mapping = {
            '010080': { algorithm: 'rc4', keyLength: 16, ivLength: 0, macLength: 16 },
            '070080': { algorithm: 'des-ede3-cbc', keyLength: 24, ivLength: 8, macLength: 16 },
            '060080': { algorithm: 'des-cbc', keyLength: 8, ivLength: 8, macLength: 16 }
        };
        return mapping[cipherKey] || null;
    }

    buildSslv2ServerVerify(state) {
        // SSLv2 SERVER-VERIFY echoes the client challenge bytes.
        const payload = Buffer.concat([Buffer.from([5]), state.clientChallenge || Buffer.alloc(0)]);
        if (state.serverCipher && state.serverMacKey) {
            return this.buildSslv2EncryptedRecord(state, payload);
        }
        return this.buildSslv2Record(payload);
    }

    buildSslv2ServerFinished(state) {
        // Compatibility selector for WinCE Schannel variants:
        // - default/server: use server-generated session id (spec behavior)
        // - client: echo ClientHello session id (if 16 bytes)
        // - connection/connid: reuse ServerHello connection id
        // - auto: prefer client session id if 16 bytes, else spec behavior
        const configuredMode = String(this.service_config.sslv2_serverfinished_mode || 'server').toLowerCase();
        let selectedMode = configuredMode;
        let finishedData = state.sessionId;

        if (configuredMode === 'client') {
            if (state.clientSessionId && state.clientSessionId.length === 16) {
                finishedData = state.clientSessionId;
            } else {
                selectedMode = 'server-fallback';
            }
        } else if (configuredMode === 'connection' || configuredMode === 'connid') {
            finishedData = state.connectionId;
        } else if (configuredMode === 'auto') {
            if (state.clientSessionId && state.clientSessionId.length === 16) {
                finishedData = state.clientSessionId;
                selectedMode = 'client-auto';
            } else {
                selectedMode = 'server-auto';
            }
        }

        state.lastServerFinishedMode = selectedMode;
        state.lastServerFinishedData = finishedData;
        const payload = Buffer.concat([Buffer.from([6]), finishedData]);
        if (state.serverCipher && state.serverMacKey) {
            return this.buildSslv2EncryptedRecord(state, payload);
        }
        return this.buildSslv2Record(payload);
    }

    _logSslv2RequestHeaders(socket, requestLine, rawHeaders) {
        try {
            console.log(' * MSNTV2(SSLv2) request headers on socket %s', socket.id);
            console.log('   ' + requestLine);
            console.log(rawHeaders);
            const qStart = requestLine.indexOf('?');
            if (qStart !== -1) {
                const qEnd = requestLine.lastIndexOf(' ');
                const qs = requestLine.slice(qStart + 1, qEnd > qStart ? qEnd : undefined);
                if (qs) {
                    const params = {};
                    qs.split('&').forEach(p => {
                        const eq = p.indexOf('=');
                        if (eq > 0) params[decodeURIComponent(p.slice(0, eq))] = decodeURIComponent(p.slice(eq + 1).replace(/\+/g, ' '));
                        else if (p) params[decodeURIComponent(p)] = null;
                    });
                    console.log(' * MSNTV2(SSLv2) query params on socket %s', socket.id, params);
                }
            }
        } catch (_) { /* ignore logging failure */ }
    }

    _logSslv2ResponseHeaders(socket, payload) {
        try {
            const text = Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload);
            if (!text.startsWith('HTTP/')) return;

            const headerEnd = text.indexOf('\r\n\r\n') >= 0
                ? text.indexOf('\r\n\r\n')
                : text.indexOf('\n\n');
            const headerBlock = headerEnd >= 0 ? text.slice(0, headerEnd) : text;
            const lines = headerBlock.replace(/\r/g, '').split('\n').filter(Boolean);
            if (!lines.length) return;

            console.log(' * MSNTV2(SSLv2) response headers on socket %s', socket.id);
            console.log(lines);
        } catch (_) { /* ignore logging failure */ }
    }

    handleSslv2ApplicationData(socket, data) {
        socket.sslv2AppBuffer = Buffer.concat([socket.sslv2AppBuffer || Buffer.alloc(0), data]);
        while (true) {
            const headerEnd = socket.sslv2AppBuffer.indexOf('\r\n\r\n');
            if (headerEnd < 0) return;
            const headerBlock = socket.sslv2AppBuffer.slice(0, headerEnd).toString('utf8');
            const headerLines = headerBlock.split('\r\n');
            const requestLine = headerLines.shift();
            const requestParts = requestLine.split(' ');
            if (requestParts.length < 3) {
                this.writeError(socket, 400, 'Bad Request');
                return;
            }
            const [method, requestUrl, protocol] = requestParts;
            const headers = {};
            const rawHeaders = [];
            headerLines.forEach((line) => {
                const idx = line.indexOf(':');
                if (idx > -1) {
                    const name = line.slice(0, idx).trim();
                    const value = line.slice(idx + 1).trim();
                    headers[name] = value;
                    headers[name.toLowerCase()] = value;
                    rawHeaders.push(`${name}: ${value}`);
                }
            });
            const contentLength = parseInt(headers['content-length'] || '0', 10) || 0;
            const maxRequestBytes = this.maxProxyResponseBytes;
            if (contentLength > 0 && contentLength > maxRequestBytes) {
                this.writeError(socket, 413, 'Request Entity Too Large');
                socket.destroy();
                return;
            }
            const requestLength = headerEnd + 4 + contentLength;
            if (socket.sslv2AppBuffer.length < requestLength) return;
            const body = socket.sslv2AppBuffer.slice(headerEnd + 4, requestLength);
            const remaining = socket.sslv2AppBuffer.slice(requestLength);
            socket.sslv2AppBuffer = remaining;
            const request_headers = {
                request: requestLine,
                request_url: requestUrl,
                raw_headers: `Request: ${requestLine}\r\n${rawHeaders.join('\r\n')}\r\n\r\n`,
                post_data: body.length ? body : null
            };
            this._populateQuery(request_headers);
            Object.assign(request_headers, headers);
            console.log(" * MSNTV2(SSLv2) %s for %s on socket %s", method, requestUrl, socket.id);
            this._logSslv2RequestHeaders(socket, requestLine, rawHeaders);
            const { domainIntercepted: sslDi, filePath: sslFp } = this.interceptRequest(requestUrl, socket.sslv2.connectIntercept);
            if (sslDi) {
                if (sslFp) {
                    this.sendLocalFile(socket, sslFp, request_headers);
                } else {
                    console.warn(" * MSNTV2(SSLv2) 404 for %s on socket %s (intercepted domain, missing local file)", requestUrl, socket.id);
                    this.writeError(socket, 404, 'Not Found', request_headers);
                }
            } else {
                this.proxyRequest(socket, method, requestUrl, request_headers);
            }
        }
    }

    loadTlsContext() {
        try {
            const certCandidates = [
                ['msntv2/msn_domains.crt', 'msntv2/msn_domains.key']
            ];
            let certFile = null;
            let keyFile = null;
            for (const [certPath, keyPath] of certCandidates) {
                const candidateCert = this.wtvshared.getServiceDep(certPath, true);
                const candidateKey = this.wtvshared.getServiceDep(keyPath, true);
                if (candidateCert && candidateKey) {
                    certFile = candidateCert;
                    keyFile = candidateKey;
                    break;
                }
            }
            if (!certFile || !keyFile) return null;
            const certPem = fs.readFileSync(certFile);
            const keyPem = fs.readFileSync(keyFile);
            return tls.createSecureContext({
                cert: certPem,
                key: keyPem,
                ciphers: 'DEFAULT@SECLEVEL=0',
                minVersion: 'TLSv1',
                secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT || 0
            });
        } catch (err) {
            console.error('[WTV-MSNTV2] failed to load TLS cert/key:', err.message);
            return null;
        }
    }

    loadForgeTlsCredentials() {
        try {
            const certCandidates = [
                ['msntv2/msn_domains.crt', 'msntv2/msn_domains.key']
            ];
            let certFile = null;
            let keyFile = null;
            for (const [certPath, keyPath] of certCandidates) {
                const candidateCert = this.wtvshared.getServiceDep(certPath, true);
                const candidateKey = this.wtvshared.getServiceDep(keyPath, true);
                if (candidateCert && candidateKey) {
                    certFile = candidateCert;
                    keyFile = candidateKey;
                    break;
                }
            }
            if (!certFile || !keyFile) return null;
            const certPem = fs.readFileSync(certFile, 'utf8');
            const keyPem = fs.readFileSync(keyFile, 'utf8');
            return {
                certPem,
                keyPem,
                cert: forge.pki.certificateFromPem(certPem),
                key: forge.pki.privateKeyFromPem(keyPem)
            };
        } catch (err) {
            console.error('[WTV-MSNTV2] failed to load forge TLS cert/key:', err.message);
            return null;
        }
    }

    handleTlsData(tlsSocket, chunk) {
        tlsSocket.buffer = Buffer.concat([tlsSocket.buffer || Buffer.alloc(0), chunk]);
        const headerEnd = tlsSocket.buffer.indexOf('\r\n\r\n');
        if (headerEnd < 0) return;

        const headerBlock = tlsSocket.buffer.slice(0, headerEnd).toString('utf8');
        const headerLines = headerBlock.split('\r\n');
        const requestLine = headerLines.shift();
        const requestParts = requestLine.split(' ');
        if (requestParts.length < 3) {
            const verbose = this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3;
            if (verbose) {
                console.warn('[WTV-MSNTV2] TLS invalid request line:', requestLine);
                console.warn('[WTV-MSNTV2] TLS raw header block:', headerBlock);
            }
            this.writeError(tlsSocket, 400, 'Bad Request');
            return;
        }

        const [method, requestUrl, protocol] = requestParts;
        const headers = {};
        const rawHeaders = [];

        headerLines.forEach((line) => {
            const idx = line.indexOf(':');
            if (idx > -1) {
                const name = line.slice(0, idx).trim();
                const value = line.slice(idx + 1).trim();
                headers[name] = value;
                headers[name.toLowerCase()] = value;
                rawHeaders.push(`${name}: ${value}`);
            }
        });

        const contentLength = parseInt(headers['content-length'] || '0', 10) || 0;
        const maxRequestBytes = this.maxProxyResponseBytes;
        if (contentLength > 0 && contentLength > maxRequestBytes) {
            this.writeError(tlsSocket, 413, 'Request Entity Too Large');
            tlsSocket.destroy();
            return;
        }
        const requestLength = headerEnd + 4 + contentLength;
        if (tlsSocket.buffer.length < requestLength) return;

        const body = tlsSocket.buffer.slice(headerEnd + 4, requestLength);
        const remaining = tlsSocket.buffer.slice(requestLength);
        tlsSocket.buffer = remaining;

        const request_headers = {
            request: requestLine,
            request_url: requestUrl,
            raw_headers: `Request: ${requestLine}\r\n${rawHeaders.join('\r\n')}\r\n\r\n`,
            post_data: body.length ? body : null
        };
        Object.assign(request_headers, headers);

        const verbose = this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3;
        if (verbose) {
            console.log('[WTV-MSNTV2] decrypted request:', requestLine);
            console.log('[WTV-MSNTV2] decrypted headers:\n' + rawHeaders.join('\r\n'));
            if (body.length) {
                console.log('[WTV-MSNTV2] decrypted body length:', body.length);
            }
        }

        console.log(" * MSNTV2(TLS) %s for %s on socket %s", method, requestUrl, tlsSocket.id);
        if (requestUrl.includes('?')) {
            try {
                const qs = requestUrl.slice(requestUrl.indexOf('?') + 1);
                const params = {};
                qs.split('&').forEach(p => {
                    const eq = p.indexOf('=');
                    if (eq > 0) params[decodeURIComponent(p.slice(0, eq))] = decodeURIComponent(p.slice(eq + 1).replace(/\+/g, ' '));
                    else if (p) params[decodeURIComponent(p)] = null;
                });
                console.log(' * MSNTV2(TLS) query params on socket %s', tlsSocket.id, params);
            } catch (_) {}
        }
        const { domainIntercepted: tlsDi, filePath: tlsFp } = this.interceptRequest(requestUrl, tlsSocket.connectIntercept);
        if (verbose) {
            console.log('[WTV-MSNTV2] decrypted intercept check for:', requestUrl, '->', tlsDi ? (tlsFp ? 'local file' : 'intercepted/404') : 'proxy');
        }
        if (tlsDi) {
            if (tlsFp) {
                this.sendLocalFile(tlsSocket, tlsFp, request_headers);
            } else {
                console.warn(" * MSNTV2(TLS) 404 for %s on socket %s (intercepted domain, missing local file)", requestUrl, tlsSocket.id);
                this.writeError(tlsSocket, 404, 'Not Found', request_headers);
            }
        } else {
            this.proxyRequest(tlsSocket, method, requestUrl, request_headers);
        }
    }

    getConnectIntercept(host) {
        if (!host) return null;
        const interceptUrls = this.service_config.intercept_urls || [];
        const lowerHost = host.toLowerCase();

        for (const entry of interceptUrls) {
            if (!entry) continue;
            let match;
            let localDir = '';
            if (typeof entry === 'string') {
                match = entry;
            } else if (typeof entry === 'object') {
                match = entry.match;
                localDir = entry.local_dir || entry.localDir || '';
            } else {
                continue;
            }
            if (!match) continue;

            const lowerMatch = match.toLowerCase();
            if (!lowerMatch.includes('://') && !lowerMatch.includes('/')) {
                if (lowerHost === lowerMatch) {
                    return { match, localDir };
                }
            }
        }
        return null;
    }

    // Returns { domainIntercepted: bool, filePath: string|null }.
    // domainIntercepted=true means the host is in intercept_urls; filePath may
    // still be null if the requested file does not exist locally.
    interceptRequest(requestUrl, connectState = null) {
        const interceptUrls = this.service_config.intercept_urls || [];
        const lowerUrl = requestUrl.toLowerCase();
        let parsedUrl = null;
        const defaultLocalDir = connectState?.localDir || '';

        if (connectState && requestUrl.startsWith('/')) {
            // Came through an intercepted CONNECT tunnel — domain always intercepted.
            let localPath = requestUrl.split('?')[0];
            if (!localPath || localPath === '/' || localPath.endsWith('/')) {
                localPath = (defaultLocalDir ? defaultLocalDir.replace(/[\\/]+$/, '') + '/' : '') + 'index.html';
            } else {
                localPath = localPath.replace(/^\/+/, '');
                if (defaultLocalDir) {
                    localPath = defaultLocalDir.replace(/[\\/]+$/, '') + '/' + localPath;
                }
            }
            return { domainIntercepted: true, filePath: this.resolveLocalFile(localPath) };
        }
        try {
            parsedUrl = new url.URL(requestUrl);
        } catch (err) {
            // not all request lines are valid URL objects, so fall back to prefix matching
        }

        for (const entry of interceptUrls) {
            if (!entry) continue;
            let match;
            let localDir = '';
            if (typeof entry === 'string') {
                match = entry;
            } else if (typeof entry === 'object') {
                match = entry.match;
                localDir = entry.local_dir || entry.localDir || '';
            } else {
                continue;
            }
            if (!match) continue;

            const lowerMatch = match.toLowerCase();
            let localPath = null;

            if (parsedUrl) {
                if (lowerMatch.includes('://')) {
                    if (lowerUrl.startsWith(lowerMatch)) {
                        localPath = parsedUrl.pathname;
                    }
                } else if (lowerMatch.includes('/')) {
                    if (lowerUrl.startsWith(lowerMatch)) {
                        localPath = parsedUrl.pathname;
                    }
                } else {
                    if (parsedUrl.host && parsedUrl.host.toLowerCase() === lowerMatch) {
                        localPath = parsedUrl.pathname;
                    }
                }
            } else {
                if (lowerUrl.startsWith(lowerMatch)) {
                    localPath = requestUrl.slice(match.length);
                }
            }

            if (localPath !== null) {
                if (!localPath || localPath === '/' || localPath.endsWith('/')) {
                    localPath = (localDir ? localDir.replace(/[\\/]+$/, '') + '/' : '') + 'index.html';
                } else {
                    localPath = localPath.replace(/^\/+/, '');
                    if (localDir) {
                        localPath = localDir.replace(/[\\/]+$/, '') + '/' + localPath;
                    }
                }
                return { domainIntercepted: true, filePath: this.resolveLocalFile(localPath) };
            }
        }
        return { domainIntercepted: false, filePath: null };
    }

    resolveLocalFile(requestedPath) {
        if (!requestedPath) return null;
        const serviceVaultDir = this.service_config.servicevault_dir || this.service_name;
        const vaults = this.minisrv_config.config.ServiceVaults || [];
        const normalizedPath = requestedPath.replace(/[\\/]+/g, '/').replace(/^\/+/, '');
        // Dynamic handler suffixes to probe in order, matching app.js behaviour
        const dynSuffixes = ['.js', '.php', '.cgi'];

        for (const vault of vaults) {
            const base = this.wtvshared.getAbsolutePath(path.join(serviceVaultDir, normalizedPath), vault);
            const candidate = this.wtvshared.makeSafePath(base, '');
            // Exact match first
            if (candidate && fs.existsSync(candidate) && fs.lstatSync(candidate).isFile()) {
                if (this.service_config.show_verbose_errors) console.log('[WTV-MSNTV2] local intercept:', candidate);
                return candidate;
            }
            // Dynamic suffixes: e.g. kickstart.aspx -> kickstart.aspx.js
            for (const suffix of dynSuffixes) {
                const dynCandidate = this.wtvshared.makeSafePath(base + suffix, '');
                if (dynCandidate && fs.existsSync(dynCandidate) && fs.lstatSync(dynCandidate).isFile()) {
                    if (this.service_config.show_verbose_errors) console.log('[WTV-MSNTV2] local intercept (dynamic):', dynCandidate);
                    return dynCandidate;
                }
            }
        }
        return null;
    }

    // Populate request_headers.query from URL query string + POST body,
    // mirroring what app.js does before running service vault scripts.
    _populateQuery(request_headers) {
        if (request_headers.query) return;
        request_headers.query = {};
        const url = request_headers.request_url || '';
        if (url.includes('?')) {
            const qraw = url.split('?')[1];
            if (qraw) {
                qraw.split('&').forEach(param => {
                    const qraw_split = param.split('=');
                    if (qraw_split.length === 2) {
                        const k = qraw_split[0];
                        const value = decodeURIComponent(qraw_split[1].replace(/\+/g, '%20'));
                        request_headers.query[k] = value;
                    } else if (param.length >= 1) {
                        request_headers.query[param] = null;
                    }
                });
            }
        }
        if (request_headers.post_data) {
            try {
                const post_str = Buffer.isBuffer(request_headers.post_data)
                    ? request_headers.post_data.toString('utf8')
                    : String(request_headers.post_data);
                if (post_str.includes('=')) {
                    post_str.split('&').forEach(pair => {
                        const idx = pair.indexOf('=');
                        if (idx > 0) {
                            const k = pair.slice(0, idx);
                            const v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, '%20'));
                            if (!request_headers.query[k]) request_headers.query[k] = v;
                        }
                    });
                }
            } catch (e) { /* ignore */ }
        }
    }

    sendLocalFile(socket, filepath, request_headers) {
        this._populateQuery(request_headers);
        if (!request_headers.service_file_path) {
            request_headers.service_file_path = filepath;
        }
        try {
            const ext = path.extname(filepath).slice(1).toLowerCase();
            const serviceVaultDir = this.service_config.servicevault_dir || this.service_name;
            const vaults = this.minisrv_config.config.ServiceVaults || [];
            const vaultBase = vaults.length > 0 ? this.wtvshared.getAbsolutePath(serviceVaultDir, vaults[0]) : null;

            // .js — only run through VM when explicitly marked as a minisrv service file.
            // Otherwise, treat it as a normal static JavaScript file and serve raw bytes.
            if (ext === 'js') {
                const scriptData = fs.readFileSync(filepath).toString('utf8');
                const firstLine = scriptData.split(/\r?\n/, 1)[0].replace(/^\uFEFF/, '').trim();
                const isMiniSrvServiceFile = /^(const|let|var)\s+minisrv_service_file\s*=\s*true\s*;?\s*$/.test(firstLine);

                if (!(isMiniSrvServiceFile && this.runScriptInVM)) {
                    // Not a service script marker (or VM unavailable): fall through to static handler.
                } else {
                    // Resolve socket.ssid from query params before running the script.
                    // Priority: BoxID (direct SSID) > SessionID (looked up in ssid_sessions).
                    if (socket.ssid === null && this.ssid_sessions) {
                        const boxId = request_headers.query[this.wtvshared.getCaseInsensitiveKey('boxid', request_headers.query)] || null;
                        const sessionId =  request_headers.query[this.wtvshared.getCaseInsensitiveKey('sessionid', request_headers.query)] || null;
                        if (boxId) {
                            socket.ssid = this.wtvshared.makeSafeSSID(boxId);
                        } else if (sessionId) {
                            // Try direct decode first (reversible UUID v8 encodes BoxID directly)
                            const decoded = WTVMSNTV2.decodeSessionID(sessionId);
                            if (decoded) {
                                socket.ssid = this.wtvshared.makeSafeSSID(decoded);
                            } else {
                                // Fallback: search ssid_sessions for a matching stored session_id
                                const match = Object.keys(this.ssid_sessions).find(
                                    k => this.ssid_sessions[k] && this.ssid_sessions[k].get && this.ssid_sessions[k].get('session_id') === sessionId
                                );
                                if (match) socket.ssid = match;
                            }
                        }
                        if (socket.ssid && !this.ssid_sessions[socket.ssid]) {
                            this.ssid_sessions[socket.ssid] = new this.WTVClientSessionData(this.minisrv_config, socket.ssid);
                            this.ssid_sessions[socket.ssid].switchUserID(0);
                            this.ssid_sessions[socket.ssid].loadSessionData();
                        }
                    }

                    const self = this;
                    const responseCookies = [];
                    const contextObj = {
                        socket,
                        request_headers,
                        service_name: this.service_name,
                        headers: null,
                        data: null,
                        request_is_async: false,
                        session_data: (socket.ssid && this.ssid_sessions) ? this.ssid_sessions[socket.ssid] : null,
                        ssid_sessions: this.ssid_sessions,
                        // Scripts may call sendToClient directly for async mode;
                        // wrap it so the response goes through SSLv2 encryption.
                        sendToClient: (sock, hdrs, dat) => self._sendScriptResult(sock, request_headers, hdrs, dat),
                        minisrv_config: this.minisrv_config,
                        wtvshared: this.wtvshared,
                        encodeSessionID(boxID) {
                            return WTVMSNTV2.encodeSessionID(boxID);
                        },
                        decodeSessionID(sessionID) {
                            return WTVMSNTV2.decodeSessionID(sessionID);
                        },
                        cwd: path.dirname(filepath),
                        // Cookie helpers available to scripts
                        response_cookies: responseCookies,
                        setCookie(name, value, opts) {
                            opts = opts || {};
                            let s = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
                            if (opts.path != null)     s += `; Path=${opts.path}`;
                            if (opts.domain != null)   s += `; Domain=${opts.domain}`;
                            if (opts.maxAge != null)   s += `; Max-Age=${opts.maxAge}`;
                            if (opts.expires != null)  s += `; Expires=${new Date(opts.expires).toUTCString()}`;
                            if (opts.sameSite != null)  s += `; SameSite=${opts.sameSite}`;
                            if (opts.secure)            s += `; Secure`;
                            if (opts.httpOnly)          s += `; HttpOnly`;
                            responseCookies.push(s);
                        },
                        // Remove a cookie by expiring it immediately.
                        // opts may include path/domain to match the original cookie's scope.
                        deleteCookie(name, opts) {
                            opts = opts || {};
                            let s = `${encodeURIComponent(name)}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                            if (opts.path != null)    s += `; Path=${opts.path}`;
                            if (opts.domain != null)  s += `; Domain=${opts.domain}`;
                            if (opts.httpOnly)        s += `; HttpOnly`;
                            responseCookies.push(s);
                        },
                        // Update an existing queued cookie's value (and optionally its opts).
                        // If no matching cookie is queued yet, behaves like setCookie.
                        updateCookie(name, value, opts) {
                            const encoded = encodeURIComponent(name);
                            const idx = responseCookies.findIndex(c => c.startsWith(encoded + '=') || c.startsWith(encoded + ';'));
                            if (idx !== -1) responseCookies.splice(idx, 1);
                            opts = opts || {};
                            let s = `${encoded}=${encodeURIComponent(value)}`;
                            if (opts.path != null)     s += `; Path=${opts.path}`;
                            if (opts.domain != null)   s += `; Domain=${opts.domain}`;
                            if (opts.maxAge != null)   s += `; Max-Age=${opts.maxAge}`;
                            if (opts.expires != null)  s += `; Expires=${new Date(opts.expires).toUTCString()}`;
                            if (opts.sameSite != null)  s += `; SameSite=${opts.sameSite}`;
                            if (opts.secure)            s += `; Secure`;
                            if (opts.httpOnly)          s += `; HttpOnly`;
                            responseCookies.push(s);
                        },
                        // Convenience UUID generator (replaces uuidv4() from C# artifacts)
                        uuidv4() { return crypto.randomUUID(); }
                    };
                    const vmResult = this.runScriptInVM(scriptData, contextObj, true, filepath);
                    // Write session_data back to ssid_sessions (mirrors app.js updateFromVM for non-privileged scripts;
                    // use socket.ssid as set by the script itself via BoxID or header).
                    if (socket.ssid && this.ssid_sessions && vmResult.session_data !== undefined) {
                        this.ssid_sessions[socket.ssid] = vmResult.session_data;
                    }
                    if (!vmResult.request_is_async) {
                        this._sendScriptResult(socket, request_headers, vmResult.headers, vmResult.data, responseCookies);
                    }
                    return;
                }
            }

            // .php — run through PHP CGI (same as normal service vault)
            if (ext === 'php' && this.handlePHP && this.minisrv_config.config.php_enabled && this.minisrv_config.config.php_binpath) {
                this.handlePHP(socket, request_headers, filepath, vaultBase || path.dirname(filepath), this.service_name, null);
                return;
            }

            // .cgi — run through CGI handler
            if (ext === 'cgi' && this.handleCGI) {
                this.handleCGI(filepath, filepath, socket, request_headers, vaultBase || path.dirname(filepath), this.service_name, null);
                return;
            }

            // Static file fallback
            const fileContents = fs.readFileSync(filepath);
            const contentType = this.mimeTypes[ext] || 'application/octet-stream';
            const responseHeaders = [];
            responseHeaders.push('HTTP/1.1 200 OK');
            responseHeaders.push(`Content-Type: ${contentType}`);
            const lastModified = this.wtvshared.getFileLastModifiedUTCString(filepath);
            if (lastModified) {
                responseHeaders.push(`Last-Modified: ${lastModified}`);
            }
            responseHeaders.push(`Content-Length: ${fileContents.length}`);
            const closeClientConnection = this._shouldCloseClientConnection(request_headers);
            responseHeaders.push(`Connection: ${closeClientConnection ? 'close' : 'Keep-Alive'}`);
            responseHeaders.push('');
            responseHeaders.push('');
            this.writeToSocket(socket, responseHeaders.join('\r\n'));
            this.writeToSocket(socket, fileContents, closeClientConnection ? () => {
                this.endSocket(socket);
            } : undefined);
        } catch (err) {
            console.error('[WTV-MSNTV2] local file serve error:', (err && err.stack) ? err.stack : err);
            this.writeError(socket, 404, 'Not Found', request_headers);
        }
    }

    _shouldCloseClientConnection(request_headers, headerLines = []) {
        const existingConnection = headerLines.find(line => line.toLowerCase().startsWith('connection:'));
        if (existingConnection) {
            return existingConnection.split(':').slice(1).join(':').trim().toLowerCase() === 'close';
        }
        const requestConnection = request_headers && request_headers.connection;
        return String(requestConnection || '').toLowerCase() === 'close';
    }

    // Convert script (VM/PHP/CGI) headers+data output to an HTTP response and
    // send it through writeToSocket so SSLv2 encryption is applied.
    // cookies: optional array of pre-formatted Set-Cookie strings from setCookie()
    _sendScriptResult(socket, request_headers, headers, data, cookies) {
        let statusCode = 200;
        let statusMessage = 'OK';
        const headerLines = [];

        if (typeof headers === 'string') {
            // String form: "Content-type: text/html\nStatus: 200 OK\n\n"
            const lines = headers.replace(/\r/g, '').split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                const colonIdx = line.indexOf(':');
                if (colonIdx < 0) continue;
                const name = line.slice(0, colonIdx).trim();
                const value = line.slice(colonIdx + 1).trim();
                if (name.toLowerCase() === 'status') {
                    const parts = value.split(' ');
                    statusCode = parseInt(parts[0], 10) || 200;
                    statusMessage = parts.slice(1).join(' ') || 'OK';
                } else {
                    headerLines.push(`${name}: ${value}`);
                }
            }
        } else if (headers && typeof headers === 'object') {
            const skip = new Set(['request', 'request_url', 'raw_headers', 'post_data']);
            for (const [k, v] of Object.entries(headers)) {
                if (skip.has(k)) continue;
                if (k.toLowerCase() === 'status') {
                    const parts = String(v).split(' ');
                    statusCode = parseInt(parts[0], 10) || 200;
                    statusMessage = parts.slice(1).join(' ') || 'OK';
                } else {
                    headerLines.push(`${k}: ${v}`);
                }
            }
        }

        const body = data
            ? (Buffer.isBuffer(data) ? data : Buffer.from(String(data)))
            : Buffer.alloc(0);

        // Inject Set-Cookie headers from setCookie() calls in scripts
        if (Array.isArray(cookies)) {
            for (const c of cookies) headerLines.push(`Set-Cookie: ${c}`);
        }

        if (!headerLines.some(l => l.toLowerCase().startsWith('content-length'))) {
            headerLines.push(`Content-Length: ${body.length}`);
        }

        if (!headerLines.some(l => l.toLowerCase().startsWith('last-modified')) && !headerLines.some(l => l.toLowerCase().startsWith('minisrv-no-last-modified')) && request_headers.service_file_path) {
            const lastModified = this.wtvshared.getFileLastModifiedUTCString(request_headers.service_file_path);
            if (lastModified) {
                headerLines.push(`Last-Modified: ${lastModified}`);
            }
        }

        const closeClientConnection = this._shouldCloseClientConnection(request_headers, headerLines);
        if (!headerLines.some(l => l.toLowerCase().startsWith('connection:'))) {
            headerLines.push(`Connection: ${closeClientConnection ? 'close' : 'Keep-Alive'}`);
        }

        const responseHeader = [`HTTP/1.1 ${statusCode} ${statusMessage}`, ...headerLines, '', ''].join('\r\n');
        this.writeToSocket(socket, responseHeader);
        if (body.length) {
            this.writeToSocket(socket, body, closeClientConnection ? () => this.endSocket(socket) : undefined);
        } else if (closeClientConnection) {
            this.endSocket(socket);
        }
    }

    proxyRequest(socket, method, requestUrl, request_headers) {
        let target;
        try {
            if (requestUrl.startsWith('/')) {
                const hostHeader = request_headers.host || (socket.connectIntercept && socket.connectIntercept.match);
                if (!hostHeader) throw new Error('Missing host for tunneled request');
                target = new url.URL(`https://${hostHeader}${requestUrl}`);
            } else {
                target = new url.URL(requestUrl);
            }
        } catch (err) {
            if (this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3) {
                console.error('[WTV-MSNTV2] invalid URL:', requestUrl, err.message);
            }
            this.writeError(socket, 400, 'Bad Request', request_headers);
            return;
        }

        const verbose = this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3;
        const isHttps = target.protocol === 'https:';
        const agent = isHttps ? https : http;
        const requestPath = target.pathname + (target.search || '');
        if (verbose) {
            console.log('[WTV-MSNTV2] proxying request:', method.toUpperCase(), requestUrl);
            console.log('[WTV-MSNTV2] proxy target:', target.protocol, target.hostname, 'port', target.port || (isHttps ? 443 : 80), 'path', requestPath);
        }

        const headers = {};
        Object.keys(request_headers).forEach((name) => {
            if (name.toLowerCase() === 'proxy-connection') return;
            if (['request', 'request_url', 'raw_headers', 'post_data'].includes(name)) return;
            if (name.toLowerCase() === 'connection') return;
            headers[name] = request_headers[name];
        });

        headers.Host = target.host;
        headers.Connection = 'close';

        const options = {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || (isHttps ? 443 : 80),
            path: requestPath,
            method: method.toUpperCase(),
            headers,
            followAllRedirects: true,
            maxBodyLength: 1024 * 1024 * 64
        };

        const maxResponseBytes = this.maxProxyResponseBytes;
        const proxyReq = agent.request(options, (res) => {
            const verbose = this.service_config.show_verbose_errors || this.minisrv_config.config.verbosity >= 3;
            if (verbose) {
                console.log('[WTV-MSNTV2] upstream response:', res.statusCode, res.statusMessage);
                console.log('[WTV-MSNTV2] upstream response headers:', JSON.stringify(res.headers));
            }

            const contentLength = parseInt(res.headers['content-length'] || res.headers['Content-Length'] || '0', 10) || 0;
            if (contentLength > 0 && contentLength > maxResponseBytes) {
                console.warn(` * MSNTV2 upstream response exceeds configured max_response_size (${contentLength} bytes > ${maxResponseBytes} bytes), aborting`);
                res.destroy();
                this.writeError(socket, 413, 'Payload Too Large', request_headers);
                return;
            }

            const responseHeaders = [];
            const closeClientConnection = this._shouldCloseClientConnection(request_headers);
            responseHeaders.push(`HTTP/1.1 ${res.statusCode} ${res.statusMessage}`);
            Object.keys(res.headers).forEach((name) => {
                if (name.toLowerCase() === 'connection') return;
                if (name.toLowerCase() === 'transfer-encoding') return;
                responseHeaders.push(`${name}: ${res.headers[name]}`);
            });
            responseHeaders.push(`Connection: ${closeClientConnection ? 'close' : 'Keep-Alive'}`);
            responseHeaders.push('');
            responseHeaders.push('');
            this.writeToSocket(socket, responseHeaders.join('\r\n'));

            let totalResponseBytes = 0;
            res.on('data', (chunk) => {
                totalResponseBytes += chunk.length;
                if (totalResponseBytes > maxResponseBytes) {
                    console.warn(` * MSNTV2 proxy response exceeded ${maxResponseBytes} bytes, cutting off connection.`);
                    res.destroy();
                    socket.destroy();
                    return;
                }
                this.writeToSocket(socket, chunk);
            });

            res.on('end', () => {
                if (!socket.destroyed && closeClientConnection) this.endSocket(socket);
            });
        });

        proxyReq.on('error', (err) => {
            if (verbose) console.error('[WTV-MSNTV2] proxy request error:', err.message, 'for', method.toUpperCase(), requestUrl);
            this.writeError(socket, 502, 'Bad Gateway', request_headers);
        });

        if (request_headers.post_data && request_headers.post_data.length) {
            proxyReq.write(request_headers.post_data);
        }
        proxyReq.end();
    }

    writeError(socket, statusCode, message, request_headers = null) {
        const body = `<html><body><h1>${statusCode} ${message}</h1></body></html>`;
        const headers = [];
        const closeClientConnection = this._shouldCloseClientConnection(request_headers);
        headers.push(`HTTP/1.1 ${statusCode} ${message}`);
        headers.push('Content-Type: text/html');
        headers.push(`Content-Length: ${Buffer.byteLength(body)}`);
        headers.push(`Connection: ${closeClientConnection ? 'close' : 'Keep-Alive'}`);
        headers.push('');
        headers.push('');
        this.writeToSocket(socket, headers.join('\r\n'));
        this.writeToSocket(socket, body, closeClientConnection ? () => {
            this.endSocket(socket);
        } : undefined);
    }

    writeToSocket(socket, data, callback) {
        const verbose = this.sslv2Debug;
        if (socket.sslv2 && socket.sslv2.stage === 'open' && socket.sslv2.serverCipher) {
            // SSLv2 open state: encrypt outbound data
            const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'binary');
            this._logSslv2ResponseHeaders(socket, payload);
            const seqBefore = socket.sslv2.serverSequence;
            if (verbose) {
                const preview = payload.slice(0, 128).toString('utf8').replace(/[^\x20-\x7e\r\n]/g, '.');
                console.log('[WTV-MSNTV2] writeToSocket(sslv2) seq=' + seqBefore + ' len=' + payload.length + ' preview: ' + preview);
            }
            if (payload.length === 0) {
                if (callback) callback();
                return;
            }
            const encrypted = this.buildSslv2EncryptedRecord(socket.sslv2, payload);
            if (verbose) {
                console.log('[WTV-MSNTV2] writeToSocket(sslv2) seq advanced to ' + socket.sslv2.serverSequence);
            }
            socket.write(encrypted, callback);
        } else if (socket.forgeTls) {
            const binary = Buffer.isBuffer(data) ? data.toString('binary') : data;
            if (verbose) {
                const preview = binary.slice(0, 128).replace(/[^\x20-\x7e\r\n]/g, '.');
                console.log('[WTV-MSNTV2] writeToSocket(forgeTls) len=' + binary.length + ' preview: ' + preview);
            }
            socket.forgeTls.prepare(binary);
            if (callback) callback();
        } else {
            const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
            if (verbose) {
                const preview = payload.slice(0, 128).toString('utf8').replace(/[^\x20-\x7e\r\n]/g, '.');
                console.log('[WTV-MSNTV2] writeToSocket(plain) len=' + payload.length + ' preview: ' + preview);
            }
            socket.write(data, callback);
        }
    }

    endSocket(socket) {
        if (socket.forgeTls) {
            try {
                socket.forgeTls.close();
            } catch (_) {}
            if (socket.end && !socket.destroyed) {
                socket.end();
            }
        } else if (socket.destroy && !socket.destroyed) {
            socket.end();
        }
    }
}

module.exports = WTVMSNTV2;
