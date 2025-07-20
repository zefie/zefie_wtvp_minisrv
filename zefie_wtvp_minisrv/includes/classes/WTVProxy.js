const { http, https } = require('follow-redirects');
const CryptoJS = require('crypto-js');
const URL = require('url').URL;
const fs = require('fs').promises;
const path = require('path');

class WTVProxy {
    constructor(minisrv_config, wtvshared) {
        this.minisrv_config = minisrv_config;
        this.wtvshared = wtvshared;
        this.httpAgent = new http.Agent({ keepAlive: false, maxSockets: 5, timeout: 5000 });
        this.httpsAgent = new https.Agent({ keepAlive: false, maxSockets: 5, timeout: 5000 });
        this.whitelistHeaders = new Set(['connection', 'server', 'date', 'content-type', 'cookie', 'location', 'accept-ranges', 'last-modified', 'content-length']);
        this.transformCache = new Map();
        this.requestCount = new Map();
        this.proxyRequest = this.proxyRequest.bind(this);
        this.prepareResponseHeaders = this.prepareResponseHeaders.bind(this);
        this.handleError = this.handleError.bind(this);
        this.sendToClient = this.sendToClient.bind(this);
    }

    formatHeaders(headers) {
        let headerString = '';
        for (const [key, value] of Object.entries(headers)) {
            headerString += key === 'Status' ? `${value}\n` : `${key}: ${value}\n`;
        }
        return headerString + '\n';
    }

    headerStringToObj(headers, response = false) {
        const headersObj = {};
        let inc_headers = 0;
        headers.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (/^SECURE ON/i.test(trimmed) && !response) {
                headersObj.secure = true;
            } else if (response && /^HTTP\/\d\.\d\s+(\d{3})/.test(trimmed)) {
                headersObj.Status = trimmed;
            } else if (!response && /^(GET|POST|PUT)\s/i.test(trimmed)) {
                headersObj.request = trimmed;
                let url = trimmed.split(' ')[1];
                if (url.includes(' HTTP/')) url = url.split(' HTTP/')[0];
                headersObj.request_url = decodeURI(url);
            } else if (trimmed.includes(':')) {
                let [key, ...value] = trimmed.split(':');
                key = key.trim();
                value = value.join(':').trim();
                if (headersObj[key]) {
                    key = `${key}_${inc_headers++}`;
                }
                headersObj[key] = value;
            }
        });
        return headersObj;
    }

    stripHeaders(headersObj) {
        const filtered = { Status: headersObj.Status };
        if (headersObj['wtv-connection-close']) filtered['wtv-connection-close'] = headersObj['wtv-connection-close'];
        for (const [key, value] of Object.entries(headersObj)) {
            if (this.whitelistHeaders.has(key.toLowerCase())) {
                filtered[key] = key.toLowerCase() === 'connection' ? 'close' : value;
            }
        }
        return filtered;
    }

    async proxyRequest(socket, requestHeaders, retryCount = 0) {
        const startTime = Date.now();
        const requestUrl = requestHeaders.request_url;
        const debug = this.minisrv_config.config.debug_flags?.debug || false;
        const showHeaders = this.minisrv_config.config.debug_flags?.show_headers || false;

        if (showHeaders) {
            const debugMsg = `HTTP Proxy: Client Request Headers on socket ID ${socket.id}`;
            const filteredHeaders = this.wtvshared.filterSSID(requestHeaders);
            const logData = this.wtvshared.filterRequestLog(filteredHeaders);
            const decodedData = this.wtvshared.decodePostData(logData);
            console.debug(debugMsg, decodedData);
        }

        const requestKey = `${requestHeaders['wtv-ticket'] || requestHeaders['wtv-client-serial-number'] || requestHeaders['wtv-script-id'] || socket.id}:${requestUrl}`;
        const requestAttempts = (this.requestCount.get(requestKey) || 0) + 1;
        this.requestCount.set(requestKey, requestAttempts);
        if (debug) this.wtvshared.debug(` * Request count for ${requestKey}: ${requestAttempts}`);

        try {
            const protocol = requestUrl.startsWith('https://') ? 'https' : 'http';
            const proxyAgent = protocol === 'https' ? https : http;
            const urlObj = new URL(requestUrl);
            const hostname = urlObj.hostname;
            const port = urlObj.port || (protocol === 'https' ? 443 : 80);
            const path = urlObj.pathname + urlObj.search;
            const isBinary = requestUrl.match(/\.(jpg|jpeg|png|gif|mid|midi)$/i);

            if (debug) {
                this.wtvshared.debug(` * Proxy Request ${protocol.toUpperCase()} to ${hostname}:${port}${path}`);
                this.wtvshared.debug(` * Socket state: destroyed=${socket.destroyed}, writable=${socket.writable}, bufferSize=${socket.writableLength}`);
            }

            socket.requestUrl = requestUrl;
            socket.requestHeaders = requestHeaders;

            const options = {
                hostname,
                port,
                path,
                method: requestHeaders.request.split(' ')[0],
                agent: protocol === 'https' ? this.httpsagent : this.httpAgent,
                headers: {
                    'User-Agent': requestHeaders['User-Agent'] || 'WebTV/2.2.6.1 (compatible; MSIE 4.0)',
                    'Connection': 'close',
                    'Accept': 'text/html,image/*,audio/midi,text/plain',
                    'Accept-Encoding': 'identity'
                },
                timeout: isBinary ? 20000 : 20000,
                rejectUnauthorized: false
            };

            if (socket.remoteAddress !== '127.0.0.1') {
                options.headers['X-Forwarded-For'] = socket.remoteAddress;
                if (debug) this.wtvshared.debug(` * Added X-Forwarded-For: ${socket.remoteAddress}`);
            }

            if (requestHeaders.post_data) {
                const postBuffer = Buffer.from(requestHeaders.post_data.toString(CryptoJS.enc.Hex), 'hex');
                options.headers['Content-Length'] = postBuffer.length;
                if (Headers['Content-Type']) {
                    options.headers['Content-Type'] = requestHeaders['Content-Type'];
                    if (debug) this.wtvshared.debug(` * Set Content-Type: ${requestHeaders['Content-Type']}`);
                }
                if (debug) this.wtvshared.debug(` * POST data size: ${postBuffer.length} bytes`);
            }

            const serviceConfig = this.minisrv_config.services[protocol] || {};
            if (serviceConfig.use_external_proxy && serviceConfig.external_proxy_port) {
                if (serviceConfig.external_proxy_is_socks) {
                    const { SocksProxyAgent } = require('socks-proxy-agent');
                    options.agent = new SocksProxyAgent({
                        host: serviceConfig.external_proxy_host || '127.0.0.1',
                        port: serviceConfig.external_proxy_port,
                        timeout: 3000
                    });
                    if (debug) this.wtvshared.debug(` * Using SOCKS proxy: ${serviceConfig.external_proxy_host}:${serviceConfig.external_proxy_port}`);
                } else {
                    options.hostname = serviceConfig.external_proxy_host || '127.0.0.1';
                    options.port = serviceConfig.external_proxy_port;
                    options.path = requestUrl;
                    options.headers.Host = `${hostname}:${port}`;
                    if (serviceConfig.replace_protocol) {
                        options.path = options.path.replace(`${protocol}:`, `${serviceConfig.replace_protocol}:`);
                        if (debug) this.wtvshared.debug(` * Replaced protocol ${protocol} with ${serviceConfig.replace_protocol}`);
                    }
                    if (serviceConfig.external_proxy_is_http1) {
                        options.insecureHTTPParser = true;
                        options.headers.Connection = 'close';
                        if (debug) this.wtvshared.debug(` * Using HTTP/1.0 proxy`);
                    }
                    if (debug) this.wtvshared.debug(` * Using HTTP proxy: ${options.hostname}:${options.port}`);
                }
            }

            const req = proxyAgent.request(options);
            socket.setTimeout(isBinary ? 20000 : 20000);
            socket.once('timeout', () => {
                if (!socket.destroyed) {
                    socket.destroy();
                    if (debug) this.wtvshared.debug(` * Socket ID ${socket.id} timed out`);
                }
            });
            socket.once('close', () => {
                if (!req.destroyed) {
                    req.destroy();
                    if (debug) this.wtvshared.debug(` * Socket ID ${socket.id} closed, destroyed request`);
                }
            });
            socket.once('error', (err) => {
                if (!req.destroyed) {
                    req.destroy();
                    console.log(` * Socket error on ID ${socket.id}: ${err.message}`);
                }
            });

            req.on('response', (res) => {
                const proxyStartTime = Date.now();
                if (socket.destroyed) {
                    if (debug) this.wtvshared.debug(` * Socket ID ${socket.id} destroyed, aborting response`);
                    res.destroy();
                    return;
                }

                try {
                    const contentType = (res.headers['content-type'] || '').toLowerCase();
                    const isHtml = contentType.includes('text/html');
                    const isBinary = contentType.startsWith('image/') || contentType.startsWith('audio/');
                    const contentLength = res.headers['content-length'] ? parseInt(res.headers['content-length'], 10) : null;
                    const maxSize = parseFloat(serviceConfig?.max_response_size || 16) * 1024 * 1024;
                    let totalData = 0;
                    const chunks = [];

                    console.log(` * Response ${protocol.toUpperCase()} ${res.statusCode} for ${requestHeaders.request} in ${Date.now() - startTime}ms`);
                    if (debug) {
                        this.wtvshared.debug(` * Content-Type: ${isBinary ? 'binary' : isHtml ? 'html' : 'other'}`);
                        if (contentLength) this.wtvshared.debug(` * Expected Content-Length: ${contentLength} bytes`);
                        if (requestHeaders['wtv-encryption']) this.wtvshared.debug(` * Encryption: enabled`);
                    }

                    const processedHeaders = this.prepareResponseHeaders(res, requestHeaders, protocol);
                    processedHeaders['wtv-noback'] = 'true';
                    processedHeaders['wtv-reload'] = 'false';
                    socket.write(this.formatHeaders(processedHeaders));

                    res.on('data', (chunk) => {
                        if (socket.destroyed) {
                            if (debug) this.wtvshared.debug(` * Socket ID ${socket.id} destroyed, aborting data`);
                            res.destroy();
                            return;
                        }

                        totalData += chunk.length;
                        if (totalData > maxSize) {
                            console.warn(` * Response data exceeded 16MB (${maxSize} bytes) for ${protocol.toUpperCase()} request to ${hostname}${path}`);
                            res.destroy();
                            socket.end();
                            return;
                        }

                        chunks.push(chunk);
                    });

                    res.on('end', () => {
                        if (socket.destroyed) {
                            if (debug) this.wtvshared.debug(` * Socket ID ${socket.id} destroyed, skipping end`);
                            return;
                        }

                        const data = Buffer.concat(chunks);
                        const writeStart = Date.now();
                        if (isHtml && serviceConfig.transform_html !== false) {
                            const cacheKey = data.length < 512 ? data.toString('utf-8') : null;
                            let filtered;
                            if (cacheKey && this.transformCache.has(cacheKey)) {
                                filtered = this.transformCache.get(cacheKey);
                            } else {
                                filtered = this.transformHtml(data.toString('utf-8'));
                                if (cacheKey) this.transformCache.set(cacheKey, filtered);
                            }
                            this.sendToSocket(socket, filtered, isBinary, requestHeaders);
                        } else {
                            this.sendToSocket(socket, data, isBinary, requestHeaders);
                        }

                        console.log(` * Response ended for ${requestHeaders.request}, total: ${totalData} bytes, completed in ${Date.now() - startTime}ms`);
                        if (debug && contentLength) {
                            this.wtvshared.debug(` * Content-Length check: expected ${contentLength}, received ${totalData}`);
                        }
                    });

                    res.on('error', (err) => {
                        if (!socket.destroyed) this.handleError(socket, err, { host: hostname, port, path });
                    });
                } catch (err) {
                    this.handleError(socket, err, { host: hostname, port, path });
                }
            });

            req.on('timeout', () => {
                if (!req.destroyed) {
                    req.destroy(new Error('Request timed out'));
                    console.log(` * Request timeout for ${protocol.toUpperCase()} to ${hostname}${path}`);
                }
            });

            req.on('error', (err) => {
                if (!socket.destroyed) this.handleError(socket, err, { host: hostname, port, path });
            });

            if (requestHeaders.post_data) {
                req.write(Buffer.from(requestHeaders.post_data.toString(CryptoJS.enc.Hex), 'hex'));
            }
            req.end();
        } catch (error) {
            if (!socket.destroyed) this.handleError(socket, error, { host: 'unknown', port: 0, path: requestUrl });
        }
    }

    transformHtml(html) {
        try {
            // Apply existing transformations
            let transformed = html
                .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-ASCII
                .replace(/\s+/g, ' ') // Collapse whitespace
                .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
                .replace(/<meta\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove meta tags
                .replace(/<img\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove images
                .replace(/<input\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove input tags
                .replace(/<link\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove link tags
                .replace(/<embed\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove embed tags
                .replace(/<a\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove links
                .replace(/<\/a>/gi, '') // Remove closing links
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
                .replace(/style\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
                .replace(/class\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
                .replace(/id\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
                .replace(/<(div|span|section|article|aside|header|footer|nav)\b/gi, '')
                .replace(/<\/(div|span|section|article|aside|header|footer|nav)>/gi, '')
                .replace(/FP_preloadImgs\s*\(.*?\)/gi, '');

            // Normalize for processing
            transformed = transformed
                .replace(/>\s+</g, '><') // Remove accidental whitespace between tags
                .replace(/</g, '\n<')    // Add newline before each tag
                .replace(/>/g, '>\n')    // Add newline after each tag
                .replace(/\n\s*\n/g, '\n'); // Collapse multiple newlines

            // Format with indentation
            const lines = transformed.split('\n');
            let indentLevel = 0;
            const indentSize = 2;

            const formatted = lines.map((line) => {
                const trimmed = line.trim();
                if (trimmed === '') return '';

                const isClosing = /^<\/.+?>/.test(trimmed);
                const isSelfClosing = /^<.+?\/>$/.test(trimmed) ||
                                      /^<hr/i.test(trimmed) || /^<br/i.test(trimmed) ||
                                      /^<meta/i.test(trimmed) || /^<img/i.test(trimmed) ||
                                      /^<input/i.test(trimmed) || /^<audioscope/i.test(trimmed);
                const isOpening = /^<([a-zA-Z0-9]+)(?!.*\/>).*?>/.test(trimmed) && !isClosing;

                if (isClosing) indentLevel = Math.max(indentLevel - 1, 0);

                const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;

                if (isOpening && !isSelfClosing) indentLevel++;

                return indentedLine;
            });

            transformed = formatted.join('\n').trim();

            // Wrap in DOCTYPE and HTML structure
            transformed = `<!DOCTYPE html>\n<html>\n  <head>\n    <meta http-equiv="content-type" content="text/html; charset=iso-8859-1">\n  </head>\n  <body>\n${transformed}\n  </body>\n</html>`;

            // Truncate if necessary
            if (transformed.length > 512) {
                transformed = transformed.substring(0, 512);
                transformed = transformed.substring(0, transformed.lastIndexOf('<')) + '\n  </body>\n</html>';
            }

            return Buffer.from(transformed, 'utf-8');
        } catch (err) {
            throw new Error(`HTML transformation failed: ${err.message}`);
        }
    }

    prepareResponseHeaders(res, requestHeaders, protocol) {
        try {
            const headers = this.stripHeaders(res.headers);
            const statusMessages = {
                400: 'Bad Request',
                401: 'Unauthorized',
                403: 'Forbidden',
                404: 'The publisher can\'t find the page requested',
                500: 'Internal Server Error',
                503: 'Service Unavailable'
            };
            headers.Status = `${res.statusCode} ${statusMessages[res.statusCode] || res.statusMessage || 'OK'}`;
            headers['wtv-http-proxy'] = 'true';
            headers['wtv-trusted'] = 'false';
            headers['wtv-noback'] = 'true';
            headers['wtv-reload'] = 'false';
            headers.Connection = 'close';
            headers['Content-Type'] = res.headers['content-type'] || 'application/octet-stream';

            if (this.minisrv_config.services[protocol]?.['wtv-explanation']?.[res.statusCode]) {
                headers['wtv-explanation-url'] = this.minisrv_config.services[protocol]['wtv-explanation'][res.statusCode];
                if (this.minisrv_config.config.debug_flags?.debug) {
                    this.wtvshared.debug(` * Added wtv-explanation-url: ${headers['wtv-explanation-url']}`);
                }
            }

            if (this.minisrv_config.config.debug_flags?.show_headers) {
                console.debug(` * Response Headers for ${protocol.toUpperCase()} request:`, headers);
            }
            return headers;
        } catch (err) {
            throw new Error(`Header preparation failed: ${err.message}`);
        }
    }

    handleError(socket, err, requestData) {
        if (socket.destroyed) {
            if (this.minisrv_config.config.debug_flags?.debug) {
                this.wtvshared.debug(` * Socket ID ${socket.id} destroyed, ignoring error: ${err.message}`);
            }
            return;
        }

        console.error(` * Error for ${requestData.host}${requestData.path}: ${err.message}`);
        let errorPage;
        if (err.code === 'ENOTFOUND' || err.message.includes('HostUnreachable')) {
            errorPage = this.wtvshared.doErrorPage(404, `The publisher <b>${requestData.host}</b> is unavailable`);
        } else if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
            errorPage = this.wtvshared.doErrorPage(503, 'The publisher is not responding Try again later');
        } else {
            errorPage = this.wtvshared.doErrorPage(500, `minisrv ran into a technical problem Please try again`);
            if (this.minisrv_config.config.debug_flags?.debug) {
                this.wtvshared.debug(` * Unhandled error: ${err.message}`);
            }
        }
        const headers = this.headerStringToObj(errorPage[0], true);
        headers['wtv-noback'] = 'true';
        headers['wtv-reload'] = 'false';
        this.sendToClient(socket, headers, errorPage[1]);
    }

    sendToClient(socket, headers, data = '') {
        if (socket.destroyed || !socket.writable) {
            if (this.minisrv_config.config.debug_flags?.debug) {
                this.wtvshared.debug(` * Socket ID ${socket.id} destroyed or unwritable, skipping send`);
            }
            return;
        }

        try {
            const headersObj = typeof headers === 'string' ? this.headerStringToObj(headers, true) : headers;
            let contentLength = 0;

            if (typeof data === 'string') {
                contentLength = Buffer.from(data).length;
            } else if (data?.byteLength) {
                contentLength = data.byteLength;
            }

            headersObj['Content-Length'] = contentLength;
            headersObj.Connection = 'close';
            if (socket.requestHeaders?.['wtv-encryption']) headersObj['wtv-encrypted'] = 'true';
            headersObj['wtv-noback'] = 'true';
            headersObj['wtv-reload'] = 'false';

            for (const key of Object.keys(headersObj)) {
                if (key.startsWith('minisrv-')) {
                    delete headersObj[key];
                }
            }

            if (socket.ssid && ssid_sessions[socket.ssid]) {
                if (!headersObj['minisrv-no-mail-count'] && ssid_sessions[socket.ssid].isRegistered()) {
                    if (!ssid_sessions[socket.ssid].isUserLoggedIn()) {
                        headersObj['wtv-mail-count'] = ssid_sessions[socket.ssid].getAccountTotalUnreadMessages();
                    } else if (ssid_sessions[socket.ssid].mailstore) {
                        headersObj['wtv-mail-count'] = ssid_sessions[socket.ssid].mailstore.countUnreadMessages(0);
                    }
                }
                if (headersObj['minisrv-no-mail-count']) {
                    delete headersObj['wtv-mail-count'];
                    delete headersObj['minisrv-no-mail-count'];
                }
            }

            if (socket.ssid && ssid_sessions[socket.ssid]?.data_store.wtvsec_login?.ticket_b64) {
                if (ssid_sessions[socket.ssid].data_store.wtvsec_login.update_ticket) {
                    headersObj['wtv-ticket'] = ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64;
                    ssid_sessions[socket.ssid].data_store.wtvsec_login.update_ticket = false;
                }
            }

            const headerString = this.formatHeaders(headersObj);
            const toClient = typeof data === 'string' ? Buffer.from(headerString + data) : Buffer.concat([Buffer.from(headerString), data]);

            this.sendToSocket(socket, toClient, headersObj['Content-Type']?.startsWith('image/') || headersObj['Content-Type']?.startsWith('audio/'), socket.requestHeaders || {});
        } catch (error) {
            if (this.minisrv_config.config.debug_flags?.debug) {
                this.wtvshared.debug(` * Failed to send to client: ${error.message}`);
            }
        }
    }

    sendToSocket(socket, data, isBinary = false, requestHeaders = {}) {
        const chunkSize = 64;
        let offset = 0;
        const expectedDataOut = data.byteLength;
        let bytesWritten = 0;

        const writeChunk = () => {
            if (socket.destroyed || !socket.writable) {
                if (this.minisrv_config.config.debug_flags?.debug) {
                    this.wtvshared.debug(` * Socket ${socket.id} destroyed or unwritable, aborting write, ${bytesWritten} bytes written`);
                }
                return;
            }

            const remaining = expectedDataOut - offset;
            if (remaining <= 0) {
                if (this.minisrv_config.config.debug_flags?.debug) {
                    this.wtvshared.debug(` * Completed writing ${expectedDataOut} bytes to socket ${socket.id}`);
                }
                socket.end();
                return;
            }

            const bufferSize = Math.min(chunkSize, remaining);
            const chunk = data.slice(offset, offset + bufferSize);

            if (socket.writableLength > 512) {
                socket.once('drain', () => setTimeout(writeChunk, 10));
            }

            const canWrite = socket.write(chunk);
            socket._handle?.flush?.();
            offset += bufferSize;
            bytesWritten += bufferSize;

            if (this.minisrv_config.config.debug_flags?.debug) {
                this.wtvshared.debug(` * Wrote ${bufferSize} bytes to socket ${socket.id}, ${remaining - bufferSize} bytes remaining`);
            }

            if (!canWrite) {
                socket.once('drain', () => setTimeout(writeChunk, 10));
            } else {
                setTimeout(writeChunk, 10);
            }
        };

        writeChunk();
    }

    shutdown() {
        this.httpAgent.destroy();
        this.httpsAgent.destroy();
        this.transformCache.clear();
        this.requestCount.clear();
    }
}

module.exports = WTVProxy;