const path = require('path');
const classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
require(classPath + "Prototypes.js");
const WTVSec = require(classPath + "WTVSec.js");
const WTVShared = require(classPath + "/WTVShared.js")['WTVShared'];
const LZPF = require(classPath + "/LZPF.js");

const net = require('net');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const zlib = require('zlib');
const AdmZip = require('adm-zip');

/**
 * WebTV Client Simulator
 * 
 * This simulator emulates a WebTV client connecting to a WebTV service
 * using the WTVP protocol with proper authentication and service discovery.
 */
class WebTVClientSimulator {
    constructor(host, port, ssid, url, outputFile = null, maxRedirects = 10, useEncryption = false, request_type_download = false, debug = false, tricks = false, followImages = false, followAll = false, maxDepth = 5, maxRetries = 5) {
        this.host = host;
        this.port = port;
        this.ssid = ssid;
        this.url = url;
        this.request_type_download = request_type_download;
        this.outputFile = outputFile;
        this.followImages = followImages;
        this.followAll = followAll;
        this.maxDepth = maxDepth;
        this.maxRetries = maxRetries;
        this.currentDepth = 0;
        this.downloadedUrls = new Set(); // Track what we've already downloaded
        this.pendingDownloads = []; // Queue of {url, referrer} objects to download
        this.allContent = new Map(); // Store all downloaded content
        this.downloadChecksums = new Map(); // Store expected MD5 checksums for validation
        this.maxRedirects = maxRedirects;
        this.useEncryption = useEncryption;
        this.encryptionEnabled = false;
        this.redirectCount = 0;
        this.useTricksAccess = tricks;
        this.tricksAccessUsed = false; // Track if we've used our "one last time" redirect
        this.userIdDetected = false;
        this.targetUrlFetched = false; // Prevent multiple target URL fetches
        this.services = new Map(); // Store service name -> {host, port} mappings
        this.wtvsec = null;
        this.wtvshared = new WTVShared();
        this.ticket = null;
        this.incarnation = 0; // Start at 0, will be incremented to 1 on first request
        this.lastHost = null; // Track last host for incarnation management
        this.currentSocket = null;
        this.socketPool = new Map(); // Cache sockets by host:port
        this.challengeResponse = null;
        this.initial_key = null; // Store initial key from wtv-initial-key header
        this.hasSeenEncryptedResponse = false; // Track if we've seen an encrypted response
        this.previousUrl = null; // Store previous URL for Referer header
        this.debug = debug;
        this.connectSessionId = Math.random().toString(16).substr(2, 8).padEnd(8, '0');

        // Load minisrv config to get the initial shared key
        this.minisrv_config = this.wtvshared.readMiniSrvConfig(true, false);
        this.debugLog(`WebTV Client Simulator starting...`);
        this.debugLog(`Target: ${host}:${port}`);
        this.debugLog(`SSID: ${ssid}`);
        this.debugLog(`Target URL after auth: ${url}`);
        this.debugLog(`Encryption: ${useEncryption ? 'enabled' : 'disabled'}`);
        if (outputFile) {
            this.debugLog(`Output file: ${outputFile}`);
        }
    }

    debugLog(...args) {
        if (this.debug) {
            console.log(...args);
        }
    }

    /**
     * Decompress response body based on content encoding headers
     */
    decompressBody(body, headers) {
        if (!Buffer.isBuffer(body) || body.length === 0) {
            return body;
        }

        try {
            // Check for LZPF compression first (WebTV specific)
            if (headers['wtv-lzpf'] === '0') {
                this.debugLog('Decompressing LZPF compressed body...');
                const lzpf = new LZPF();
                const decompressed = lzpf.expand(body);
                this.debugLog(`LZPF decompression: ${body.length} bytes -> ${decompressed.length} bytes`);
                
                // Validate decompressed size matches content-length header
                const expectedSize = headers['content-length'] ? parseInt(headers['content-length']) : 0;
                if (expectedSize > 0 && decompressed.length !== expectedSize) {
                    console.warn(`LZPF decompression size mismatch: expected ${expectedSize} bytes, got ${decompressed.length} bytes`);
                    this.debugLog(`LZPF size validation failed - this may indicate incomplete or corrupted data`);
                }
                
                return decompressed;
            }

            // Check for standard gzip/deflate compression
            if (headers['content-encoding']) {
                const encoding = headers['content-encoding'].toLowerCase();
                this.debugLog(`Decompressing ${encoding} compressed body...`);
                
                if (encoding === 'deflate') {
                    const decompressed = zlib.inflateSync(body);
                    this.debugLog(`Deflate decompression: ${body.length} bytes -> ${decompressed.length} bytes`);
                    return decompressed;
                } else if (encoding === 'gzip') {
                    const decompressed = zlib.gunzipSync(body);
                    this.debugLog(`Gzip decompression: ${body.length} bytes -> ${decompressed.length} bytes`);
                    return decompressed;
                }
            }

            // No compression detected, return original body
            return body;
        } catch (error) {
            console.error('Error decompressing response body:', error);
            this.debugLog('Returning original compressed body due to decompression error');
            return body;
        }
    }

    /**
     * Start the simulation by connecting to wtv-1800:/preregister
     */
    async start() {
        try {
            await this.makeRequestWithRetry('wtv-1800', '/preregister');
        } catch (error) {
            console.error('Failed to start simulation:', error);
        }
    }

    /**
     * Make a WTVP request to a service
     */
    async makeRequest(serviceName, path, data = null, skipRedirects = false) {
        return new Promise((resolve, reject) => {
            const currentUrl = `${serviceName}:${path}`;
            
            // Increment incarnation for each new request (like real WebTV client)
            this.incarnation++;
            this.debugLog(`Using incarnation: ${this.incarnation} for ${serviceName}:${path}`);
            
            // Determine host and port for the service
            let targetHost = this.host;
            let targetPort = this.port;
            
            if (this.services.has(serviceName)) {
                const service = this.services.get(serviceName);
                targetHost = service.host;
                targetPort = service.port;
            }

            this.debugLog(`\n--- Making request to ${serviceName}:${path} at ${targetHost}:${targetPort} ---`);

            const socketKey = `${targetHost}:${targetPort}`;
            let socket = this.socketPool.get(socketKey);
            let isNewConnection = false;

            // Check if we can reuse an existing socket
            // For encrypted connections, always create a new socket to avoid encryption state issues
            if (socket && !socket.destroyed && socket.readyState === 'open' && !socket._inUse && !this.encryptionEnabled) {
                this.debugLog(`Reusing existing socket for ${socketKey}`);
                this.currentSocket = socket;
                socket._inUse = true; // Mark socket as in use
            } else {
                this.debugLog(`Creating new socket for ${socketKey}`);
                socket = new net.Socket();
                socket._inUse = true; // Mark socket as in use
                this.socketPool.set(socketKey, socket);
                this.currentSocket = socket;
                isNewConnection = true;
            }

            let responseData = Buffer.alloc(0);
            let requestSent = false;
            let responseHandled = false;

            const cleanupListeners = () => {
                socket.removeListener('data', handleData);
                socket.removeListener('close', handleClose);
                socket.removeListener('error', handleError);
                socket.removeListener('timeout', handleTimeout);
            };

            const sendRequest = () => {
                if (requestSent) return;
                requestSent = true;
                
                let requestData;
                
                if (this.encryptionEnabled && this.wtvsec) {
                    // For encrypted requests, first send SECURE ON, then immediately send the encrypted request
                    // This matches the real WebTV client behavior seen in packet captures
                    this.debugLog('Sending SECURE ON request...');
                    const secureOnBuffer = this.buildSecureOnRequest();
                    socket.write(secureOnBuffer);
                    
                    // Send encrypted request immediately after (as seen in pcap analysis)
                    setImmediate(() => {
                        this.debugLog('Sending encrypted request...');
                        const encryptedRequestData = this.buildEncryptedRequest(serviceName, path, data);
                        socket.write(encryptedRequestData);
                    });
                } else {
                    // Send regular request
                    requestData = this.buildRegularRequest(serviceName, path, data);
                    this.debugLog('Sending request:');
                    this.debugLog(requestData.toString());
                    socket.write(requestData);
                }
            };

            const handleData = (chunk) => {
                responseData = Buffer.concat([responseData, chunk]);
                this.debugLog(`Received chunk: ${chunk.length} bytes (total: ${responseData.length} bytes)`);

                // Clear any existing timeout for LZPF completion detection
                if (this.lzpfTimeoutId) {
                    clearTimeout(this.lzpfTimeoutId);
                    this.lzpfTimeoutId = null;
                }

                // Check if we have a complete response
                if (this.encryptionEnabled) {
                    // For encrypted responses, we need to handle differently
                    if (!responseHandled) {
                        const result = this.handleEncryptedResponse(responseData, resolve, reject);
                        if (result === true) { // If response was handled
                            responseHandled = true;
                            cleanupListeners();
                            socket._inUse = false;
                        }
                    }
                } else {
                    // Regular response handling
                    // Only check for header/body split, do not convert to string
                    // Use both CRLF and LF as in handleResponse
                    const crlfcrlf = Buffer.from('\r\n\r\n');
                    const lflf = Buffer.from('\n\n');
                    let idx = responseData.indexOf(crlfcrlf);
                    if (idx === -1) idx = responseData.indexOf(lflf);
                    if (idx !== -1 && !responseHandled) {
                        responseHandled = true;
                        this.debugLog('Complete response detected, processing...');
                        cleanupListeners();
                        socket._inUse = false;
                        this.handleResponse(responseData, resolve, reject, skipRedirects, currentUrl, socket, socketKey);
                    }
                }
            };

            const handleClose = () => {
                this.debugLog('Connection closed, removing from socket pool');
                this.socketPool.delete(socketKey);
                socket._inUse = false;
                
                if (responseData.length > 0 && !this.encryptionEnabled && !responseHandled) {
                    // Only process if not already processed
                    const crlfcrlf = Buffer.from('\r\n\r\n');
                    const lflf = Buffer.from('\n\n');
                    let idx = responseData.indexOf(crlfcrlf);
                    if (idx === -1) idx = responseData.indexOf(lflf);
                    if (idx === -1) {
                        responseHandled = true;
                        this.debugLog('Processing incomplete response on close...');
                        cleanupListeners();
                        this.handleResponse(responseData, resolve, reject, skipRedirects, currentUrl, socket, socketKey);
                    }
                } 
            };

            const handleError = (error) => {
                console.error('Socket error:', error);
                this.socketPool.delete(socketKey);
                socket._inUse = false;
                cleanupListeners();
                reject(error);
            };

            const handleTimeout = () => {
                console.error('Request timed out');
                socket.destroy();
                this.socketPool.delete(socketKey);
                socket._inUse = false;
                cleanupListeners();
                reject(new Error('Request timeout'));
            };

            // Set up event listeners
            socket.on('data', handleData);
            socket.on('close', handleClose);
            socket.on('error', handleError);
            socket.setTimeout(30000, handleTimeout);

            if (isNewConnection) {
                socket.connect(targetPort, targetHost, () => {
                    this.debugLog(`Connected to ${targetHost}:${targetPort}`);
                    sendRequest();
                });
            } else {
                // Socket is already connected, send request immediately
                sendRequest();
            }
        });
    }

    /**
     * Build a regular (unencrypted) WTVP request
     */
    buildRegularRequest(serviceName, path, data = null) {
        const method = data ? 'POST' : 'GET';
        let request = `${method} ${serviceName}:${path}\r\n`;
        
        // Add Referer header if we have a previous URL
        if (this.previousUrl) {
            request += `Referer: ${this.previousUrl}\r\n`;
        }
        
        // Add required headers (matching real WebTV client from PCAP)
        request += `wtv-request-type: ${((this.request_type_download) ? 'download' : 'primary')}\r\n`;
        request += `wtv-client-serial-number: ${this.ssid}\r\n`;
        request += `wtv-client-bootrom-version: 2046\r\n`;
        request += `wtv-client-rom-type: US-LC2-disk-0MB-8MB\r\n`;
        request += `wtv-system-cpuspeed: 166187148\r\n`;
        request += `wtv-system-sysconfig: 4163328\r\n`;
        request += `wtv-disk-size: 8006\r\n`;
        request += `Accept-Language: en\r\n`;
        request += `wtv-incarnation: ${this.incarnation}\r\n`;
        // Generate a random 8 character (4 byte) hex code for wtv-connect-session-id
       
        request += `wtv-connect-session-id: ${this.connectSessionId}\r\n`
        // Add additional headers that real client sends (from PCAP analysis)
        request += `User-Agent: Mozilla/4.0 WebTV/2.2.6.1 (compatible; MSIE 4.0)\r\n`;
        request += `wtv-system-version: 7181\r\n`;
        request += `wtv-capability-flags: 10935ffc8f\r\n`;
        request += `wtv-system-chipversion: 51511296\r\n`;
        if (this.useEncryption) request += `wtv-encryption: true\r\n`;
        if (!this.challengeResponse) request += `wtv-script-id: -1896417432\r\n`;
        if (!this.challengeResponse) request += `wtv-script-mod: 1754789923\r\n`;
        request += `wtv-client-address: 0.0.0.0\r\n`;

        // Add challenge response if we have one
        if (this.challengeResponse) {
            request += `wtv-challenge-response: ${this.challengeResponse}\r\n`;    
            this.debugLog('Added challenge response to request');
            this.challengeResponse = null; // Clear challenge response after adding to request
        }
        
        // Add ticket if we have one
        if (this.ticket) {
            request += `wtv-ticket: ${this.ticket}\r\n`;
        }
        
        // Add content if POST
        if (data) {
            const content = typeof data === 'string' ? data : JSON.stringify(data);
            request += `Content-Length: ${content.length}\r\n`;
            request += `Content-Type: application/x-www-form-urlencoded\r\n`;
            request += `\r\n${content}`;
        } else {
            request += '\r\n';
        }
        
        return Buffer.from(request, 'utf8');
    }

    /**
     * Build a SECURE ON request (sent in plaintext to establish encryption)
     */
    buildSecureOnRequest() {
        // SECURE ON should match real WebTV client exactly - no URL, just the method
        let request = `SECURE ON\r\n`;
        request += `Accept-Language: en-US,en\r\n`;
        if (this.ticket) {
            request += `wtv-ticket: ${this.ticket}\r\n`;
        }
        request += `wtv-connect-session-id: ${Math.random().toString(16).substr(2, 8)}\r\n`;
        request += `wtv-client-serial-number: ${this.ssid}\r\n`;
        request += `wtv-system-version: 7181\r\n`;
        request += `wtv-capability-flags: 10935ffc8f\r\n`;
        request += `wtv-client-bootrom-version: 2046\r\n`;
        request += `wtv-client-rom-type: US-LC2-disk-0MB-8MB\r\n`;
        request += `wtv-system-chipversion: 51511296\r\n`;
        request += `User-Agent: Mozilla/4.0 WebTV/2.2.6.1 (compatible; MSIE 4.0)\r\n`;
        request += `wtv-encryption: true\r\n`;
        request += `wtv-script-id: -154276969\r\n`;
        request += `wtv-script-mod: ${Math.floor(Date.now() / 1000)}\r\n`;
        request += `wtv-incarnation:${this.incarnation}\r\n`;  // Note: no space after colon
        request += '\r\n';
        this.debugLog("Built SECURE ON request:", request);
        return Buffer.from(request, 'utf8');
    }

    /**
     * Build an encrypted WTVP request
     */
    buildEncryptedRequest(serviceName, path, data = null) {
        const method = data ? 'POST' : 'GET';
        let request = `${method} ${serviceName}:${path}\r\n`;

        // Add Referer header if we have a previous URL
        if (this.previousUrl) {
            request += `Referer: ${this.previousUrl}\r\n`;
        }
        // For encrypted requests, only include the minimal necessary headers
        // The SECURE ON already sent the auth and session info

        request += `wtv-request-type: ${(this.request_type_download) ? 'download' : 'primary'}\r\n`;
        request += `wtv-show-time: 0\r\n`;
        request += `wtv-system-cpuspeed: 166187148\r\n`;
        request += `wtv-system-sysconfig: 4163328\r\n`;
        request += `wtv-disk-size: 8006\r\n`;
        request += `wtv-viewer: zefie-minisrv-client_emu\r\n`;  // Note: no space after colon

        // Add content if POST
        if (data) {
            const content = typeof data === 'string' ? data : JSON.stringify(data);
            request += `Content-Length: ${content.length}\r\n`;
            request += `Content-Type: application/x-www-form-urlencoded\r\n`;
            request += `\r\n${content}`;
        } else {
            request += '\r\n';
        }
        
        // Encrypt the request using RC4 with key 0 (server expects Decrypt(0, enc_data))
        try {
            this.debugLog("encrypting request:", request);
            this.wtvsec.set_incarnation(this.incarnation); // Ensure WTVSec has the correct incarnation
            const encryptedBuffer = this.wtvsec.Encrypt(0, request);
            return Buffer.from(encryptedBuffer);
        } catch (error) {
            console.error('Error encrypting request:', error);
            return Buffer.from(request, 'utf8');
        }
    }

    /**
     * Handle encrypted response data
     */
    handleEncryptedResponse(responseData, resolve, reject, forceProcess = false) {
        try {
            // Find header/body split using CRLF CRLF (\r\n\r\n) or fallback to LF LF (\n\n)
            let idx = -1;
            let sepLen = 0;
            const crlfcrlf = Buffer.from('\r\n\r\n');
            const lflf = Buffer.from('\n\n');
            idx = responseData.indexOf(crlfcrlf);
            if (idx !== -1) {
                sepLen = 4;
            } else {
                idx = responseData.indexOf(lflf);
                if (idx !== -1) sepLen = 2;
            }
            
            if (idx === -1) {
                // Not a complete response yet
                return false;
            }
            
            // Split headers and body - headers are always plaintext
            const headerSection = responseData.slice(0, idx).toString('utf8');
            const bodyBuffer = responseData.slice(idx + sepLen);
            
            // Parse headers first to check content-length
            const lines = headerSection.split(/\r?\n/);
            const statusLine = lines[0].replace('\r', '');

            const headers = {};
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].replace('\r', '');
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).toLowerCase();
                    const value = line.substring(colonIndex + 1).trim();
                    headers[key] = value;
                }
            }
            
            // Check if we have received the complete body based on content-length
            const contentLength = headers['content-length'] ? parseInt(headers['content-length']) : 0;
            
            // Check if content is LZPF compressed (server sends wtv-lzpf: 0 header)
            const isLZPFCompressed = headers['wtv-lzpf'] === '0';
            const isThisResponseEncrypted = headers['wtv-encrypted'] === 'true';
            
            // For LZPF responses, we can't rely on content-length since it's the uncompressed size
            if (isLZPFCompressed && bodyBuffer.length > 0 && !forceProcess) {
                this.debugLog(`LZPF response detected with ${bodyBuffer.length} bytes (uncompressed size: ${contentLength})`);
                // Process LZPF response after a short delay to collect all data
                if (!this.lzpfTimeoutId) {
                    this.lzpfTimeoutId = setTimeout(() => {
                        this.debugLog(`LZPF timeout - processing response with ${bodyBuffer.length} bytes`);
                        this.lzpfTimeoutId = null;
                        // Force processing by calling again with forceProcess = true
                        this.handleEncryptedResponse(responseData, resolve, reject, true);
                    }, 100);
                    return false;
                }
                // If timeout has expired, fall through to process the response
                this.debugLog(`LZPF response ready - processing with ${bodyBuffer.length} bytes`);
            }
            
            if (contentLength > 0 && bodyBuffer.length < contentLength && !isLZPFCompressed && !forceProcess) {
                if (!isThisResponseEncrypted) {
                    // For non-encrypted, non-LZPF responses, wait for exact content-length
                    this.debugLog(`Waiting for more data: received ${bodyBuffer.length}/${contentLength} bytes`);
                    return false;
                } else {
                    // For encrypted responses that are not LZPF, we need to be more conservative
                    // Encrypted data size might not match content-length exactly
                    this.debugLog(`Waiting for encrypted data: received ${bodyBuffer.length}/${contentLength} bytes`);
                    return false;
                }
            }
            
            this.debugLog('\nReceived encrypted response:');
            this.debugLog('Headers:');
            this.debugLog(headerSection);
            this.debugLog(`Status: ${statusLine}`);
            this.debugLog(`Body buffer size: ${bodyBuffer.length} bytes`);
            
            // Decrypt the body if this specific response is marked as encrypted
            let body = Buffer.alloc(0);
            const isResponseEncrypted = headers['wtv-encrypted'] === 'true';
            if (bodyBuffer.length > 0 && isResponseEncrypted && this.encryptionEnabled && this.wtvsec) {
                try {
                    this.debugLog('Decrypting response body...');
                    const decryptedBuffer = this.wtvsec.Decrypt(1, bodyBuffer);
                    body = Buffer.from(decryptedBuffer);
                    this.debugLog(`Body decrypted successfully: ${body.length} bytes`);
                } catch (error) {
                    console.error('Error decrypting response body:', error);
                    body = bodyBuffer;
                }
            } else {
                body = bodyBuffer;
            }
            
            // Decompress the body if needed
            body = this.decompressBody(body, headers);
            
            // Handle special headers
            this.processHeaders(headers);
            
            // Mark that we've seen an encrypted response
            if (headers['wtv-encrypted'] === 'true') {
                this.hasSeenEncryptedResponse = true;
            }
            
            // Store content if in follow-all mode
            if (this.followAll && body.length > 0) {
                this.storeContent(this.previousUrl || this.url, { headers, body, status: statusLine });
            }
            
            // Don't close the current connection - keep it for reuse
            // The socket will be managed by the socket pool
            
            // Check for redirects (Location header) 
            if ((headers['Location'] || headers['location']) && statusLine.startsWith('302')) {
                const redirectUrl = headers['Location'] || headers['location'];
                this.debugLog(`Following redirect to: ${redirectUrl}`);
                this.redirectCount++;
                setTimeout(() => {
                    this.followVisit(redirectUrl)
                        .then(resolve)
                        .catch(reject);
                }, 100);
                return true; // Redirect is being followed
            }
            
            resolve({ headers, body, status: statusLine });
            return true; // Response was handled
            
        } catch (error) {
            console.error('Error processing encrypted response:', error);
            reject(error);
            return true; // Error occurred, stop trying
        }
    }
    handleResponse(responseData, resolve, reject, skipRedirects = false, currentUrl = null, socket = null, socketKey = null) {
        this.debugLog('\nReceived response:');
        this.debugLog(responseData);
        
        // Update previousUrl for next request's Referer header
        if (currentUrl) {
            this.previousUrl = currentUrl;
        }
        
        try {
            // Find header/body split using CRLF CRLF (\r\n\r\n) or fallback to LF LF (\n\n)
            let idx = -1;
            let sepLen = 0;
            const crlfcrlf = Buffer.from('\r\n\r\n');
            const lflf = Buffer.from('\n\n');
            idx = responseData.indexOf(crlfcrlf);
            if (idx !== -1) {
                sepLen = 4;
            } else {
                idx = responseData.indexOf(lflf);
                if (idx !== -1) sepLen = 2;
            }
            let headerSection, bodyBuf;
            if (idx !== -1) {
                headerSection = responseData.slice(0, idx).toString('utf8');
                bodyBuf = responseData.slice(idx + sepLen);
            } else {
                headerSection = responseData.toString('utf8');
                bodyBuf = Buffer.alloc(0);
            }
            const lines = headerSection.split(/\r?\n/);
            const statusLine = lines[0].replace('\r', '');
            this.debugLog(`Status: ${statusLine}`);
            // Parse headers
            const headers = {};
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].replace('\r', '');
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).toLowerCase();
                    const value = line.substring(colonIndex + 1).trim();
                    if (headers[key]) {
                        if (Array.isArray(headers[key])) {
                            headers[key].push(value);
                        } else {
                            headers[key] = [headers[key], value];
                        }
                    } else {
                        headers[key] = value;
                    }
                }
            }
            this.processHeaders(headers);
            this.debugLog("srv headers:", headers);
            // Decompress the body if needed
            bodyBuf = this.decompressBody(bodyBuf, headers);

            // Mark that we've seen an encrypted response
            if (headers['wtv-encrypted'] === 'true') {
                this.hasSeenEncryptedResponse = true;
            }
            
            // Store content if in follow-all mode
            if (this.followAll && bodyBuf.length > 0) {
                this.storeContent(currentUrl || this.previousUrl || this.url, { headers, body: bodyBuf, status: statusLine });
            }
            
            // Check if server wants to close connection
            if (socket && socketKey) {
                if (headers['connection'] && headers['connection'].toLowerCase() === 'close') {
                    this.debugLog('Server requested connection close, removing socket from pool');
                    this.socketPool.delete(socketKey);
                    socket.destroy();
                } else if (headers['connection'] && headers['connection'].toLowerCase() === 'keep-alive') {
                    this.debugLog('Server supports keep-alive, keeping socket in pool');
                    // Keep socket in pool for reuse
                } else {
                    // Default behavior - close connection if no explicit keep-alive
                    this.debugLog('No explicit keep-alive, removing socket from pool');
                    this.socketPool.delete(socketKey);
                    socket.destroy();
                }
            }
            
            if (this.userIdDetected && !this.targetUrlFetched) {
                this.targetUrlFetched = true;
                this.debugLog(`\n*** Authentication complete! Now fetching target URL: ${this.url} ***`);
                setTimeout(() => {
                    this.fetchTargetUrl()
                        .then(resolve)
                        .catch(reject);
                }, 100);
                return;
            }
            if ((headers['wtv-visit'] || headers['Location']) && !skipRedirects) {
                if (this.redirectCount >= this.maxRedirects) {
                    // Check if we can use tricks access for one last redirect
                    if (this.useTricksAccess && !this.tricksAccessUsed) {
                        this.debugLog(`Maximum redirects (${this.maxRedirects}) reached, but using tricks access for one last redirect`);
                        this.tricksAccessUsed = true;
                        this.redirectCount++;
                        setTimeout(() => {
                            this.followVisit(headers['wtv-visit'] || headers['Location'])
                                .then(resolve)
                                .catch(reject);
                        }, 100);
                        return;
                    } else {
                        this.debugLog(`Maximum redirects (${this.maxRedirects}) reached, stopping`);
                        resolve({ headers, body: bodyBuf, status: statusLine, stopped: true });
                        return;
                    }
                }
                this.redirectCount++;
                setTimeout(() => {
                    this.followVisit(headers['wtv-visit'] || headers['Location'])
                        .then(resolve)
                        .catch(reject);
                }, 100);
            } else if (headers['wtv-phone-log-url'] && headers['wtv-phone-log-url'].includes("post")) {
                this.debugLog(`Following wtv-phone-log-url: ${headers['wtv-phone-log-url']}`);
                setTimeout(() => {
                    this.followVisit(headers['wtv-phone-log-url'], true)
                        .then(resolve)
                        .catch(reject);
                }, 100);
            } else {
                if (skipRedirects && headers['wtv-visit']) {
                    // Check if we can use tricks access for one last redirect
                    if (this.useTricksAccess && !this.tricksAccessUsed) {
                        this.debugLog(`Would skip wtv-visit redirect, but using tricks access for one last redirect: ${headers['wtv-visit']}`);
                        this.tricksAccessUsed = true;
                        this.redirectCount++;
                        setTimeout(() => {
                            this.followVisit(headers['wtv-visit'])
                                .then(resolve)
                                .catch(reject);
                        }, 100);
                        return;
                    } else {
                        this.debugLog(`Skipping wtv-visit redirect: ${headers['wtv-visit']}`);
                    }
                } else {
                    this.debugLog('No wtv-visit header found, resolving...');
                }
                resolve({ headers, body: bodyBuf, status: statusLine });
            }
        } catch (error) {
            console.error('Error processing response:', error);
            reject(error);
        }
    }

    /**
     * Process special WTVP headers
     */
    processHeaders(headers) {
        // Handle wtv-service headers (can be multiple)
        const wtvServices = headers['wtv-service'];
        if (wtvServices) {
            const serviceValues = Array.isArray(wtvServices) ? wtvServices : [wtvServices];
            
            for (const serviceValue of serviceValues) {
                if (serviceValue === 'reset') {
                    this.debugLog('Clearing service mappings');
                    this.services.clear();
                } else {
                    // Parse service definition: "name=service-name host=host port=port flags=0x00000001 connections=1"
                    const nameMatch = serviceValue.match(/name=([^\s]+)/);
                    const hostMatch = serviceValue.match(/host=([^\s]+)/);
                    const portMatch = serviceValue.match(/port=([^\s]+)/);
                    
                    if (nameMatch && hostMatch && portMatch) {
                        const serviceName = nameMatch[1];
                        const host = hostMatch[1];
                        const port = parseInt(portMatch[1]);
                        
                        this.services.set(serviceName, { host, port });
                        this.debugLog(`Registered service: ${serviceName} -> ${host}:${port}`);
                    }
                }
            }
        }

        // Handle wtv-initial-key
        if (headers['wtv-initial-key']) {
            this.initial_key = headers['wtv-initial-key'];
        }

        // Handle wtv-challenge
        if (headers['wtv-challenge']) {
            this.debugLog('Received wtv-challenge, processing...');
            this.debugLog(`Challenge: ${headers['wtv-challenge']}`);
            this.debugLog(`Initial key from server: ${this.initial_key}`);
            
            if (!this.wtvsec) {
                this.debugLog('No WTVSec instance, initializing...');
                this.wtvsec = new WTVSec(this.minisrv_config, this.incarnation);
                
                // Override the initial shared key with the one provided by the server
                if (this.initial_key) {
                    this.debugLog('Overriding WTVSec initial shared key with server-provided key');
                    this.wtvsec.initial_shared_key = CryptoJS.enc.Base64.parse(this.initial_key);
                    this.wtvsec.current_shared_key = this.wtvsec.initial_shared_key;
                }
            }
            
            try {
                // Ensure WTVSec has the correct incarnation
                this.wtvsec.set_incarnation(this.incarnation);
                
                // Set incarnation from server if provided
                if (headers["wtv-incarnation"]) {
                    this.debugLog(`Setting incarnation from server: ${headers["wtv-incarnation"]}`);
                    this.wtvsec.set_incarnation(parseInt(headers["wtv-incarnation"]));
                    this.incarnation = parseInt(headers["wtv-incarnation"]);
                }
                
                // Use the server's initial key for challenge processing
                const keyToUse = this.initial_key ? CryptoJS.enc.Base64.parse(this.initial_key) : this.wtvsec.current_shared_key;
                this.debugLog(`Using key for challenge: ${keyToUse.toString(CryptoJS.enc.Base64)}`);

                const challengeResponse = this.wtvsec.ProcessChallenge(headers['wtv-challenge'], keyToUse);
                if (challengeResponse && challengeResponse.toString(CryptoJS.enc.Base64)) {
                    this.debugLog('Challenge processed successfully, preparing response');
                    this.debugLog(`Challenge response: ${challengeResponse.toString(CryptoJS.enc.Base64)}`);
                    // We'll send the challenge response in the next request
                    this.challengeResponse = challengeResponse.toString(CryptoJS.enc.Base64);
                    this.debugLog('Setting wtv-challenge-response header for next request');
                } else {
                    console.error('Failed to process challenge - no response generated');
                }
            } catch (error) {
                console.error('Error processing challenge:', error.message);
                console.error('Stack trace:', error.stack);
            }
        }

        // Handle wtv-ticket
        if (headers['wtv-ticket']) {
            this.debugLog('Received wtv-ticket');
            this.ticket = headers['wtv-ticket'];
        }

        // Handle user-id header - indicates successful authentication
        if (headers['user-id']) {
            this.debugLog(`*** Authentication successful! user-id detected: ${headers['user-id']} ***`);
            this.userIdDetected = true;
            
            // Enable encryption if requested and we have WTVSec
            if (this.useEncryption) {
                this.debugLog('*** Enabling encryption after successful authentication ***');
                if (!this.wtvsec) {
                    // Initialize with current incarnation (which was incremented when we got wtv-encrypted: true)
                    this.wtvsec = new WTVSec(this.minisrv_config, this.incarnation);
                }

                this.wtvsec.SecureOn(); // Initialize RC4 sessions
             
                this.encryptionEnabled = true;
            }            
            return; // Stop processing other headers since we're authenticated
        }
    }

    /**
     * Follow a wtv-visit directive
     */
    async followVisit(visitUrl, post = false) {
        this.debugLog(`Parsing wtv-visit URL: ${visitUrl}`);

        // Parse the visit URL: service:/path or service:path
        const match = visitUrl.match(/^([\w-]+):\/?(.*)/);
        if (match) {
            const serviceName = match[1];
            const path = '/' + (match[2] || '');
            this.debugLog(`Parsed service: ${serviceName}, path: ${path}`);
            return await this.makeRequestWithRetry(serviceName, path, (post) ? '1' : null, null);
        } else {
            throw new Error(`Invalid wtv-visit URL: ${visitUrl}`);
        }
    }

    /**
     * Fetch the target URL after authentication is complete
     */
    async fetchTargetUrl() {
        console.log(`Fetching target URL: ${this.url}`);
        if (this.useTricksAccess) {
            this.debugLog('Using tricks access for target URL');
            this.url = `wtv-tricks:/access?url=${encodeURIComponent(this.url)}`;
        }
        // Parse the target URL
        const match = this.url.match(/^([\w-]+):\/?(.*)/);
        if (match) {
            const serviceName = match[1];
            const path = '/' + (match[2] || '');
            this.debugLog(`Parsed target service: ${serviceName}, path: ${path}`);

            try {
                const result = await this.makeRequestWithRetry(serviceName, path, null, false);

                
                // Handle the response
                if (result.body) {
                    this.debugLog('\n*** Target URL Response Body ***');
                    if (this.outputFile) {
                        if (this.followAll) {
                            // Store the main content first
                            this.storeContent(this.url, result);
                            
                            // Process all pending downloads
                            await this.processAllDownloads();
                            
                            // Create comprehensive archive
                            await this.createComprehensiveArchive();
                        } else if (this.followImages) {
                            await this.saveToFile(result.body, result.headers);
                        } else {
                            await this.saveToFile(result.body, result.headers);
                        }
                        console.log(`Content saved to: ${this.outputFile}`);
                    } else {
                        // Detect text content for CLI output
                        const contentType = result.headers['content-type'] || '';
                        if (/^text\//.test(contentType) || /json|xml|javascript|download-list/.test(contentType)) {
                            console.log(result.body.toString('utf8'));
                        } else if (result.body.length === 0) {
                            console.log('<empty response>');
                        } else {
                            console.log('<binary data>');
                        }
                    }
                } else {
                    this.debugLog('No body content received from target URL');
                }

                this.debugLog('\n*** Request completed successfully ***');
                this.cleanup();
                process.exit(0);
                
                return result;
            } catch (error) {
                console.error('Error fetching target URL:', error);
                throw error;
            }
        } else {
            throw new Error(`Invalid target URL: ${this.url}`);
        }
    }

    /**
     * Process the content response without following redirects
     */
    processContentResponse(responseData, resolve, reject) {
        try {
            // Find header/body split using CRLF CRLF (\r\n\r\n) or fallback to LF LF (\n\n)
            let idx = -1;
            let sepLen = 0;
            const crlfcrlf = Buffer.from('\r\n\r\n');
            const lflf = Buffer.from('\n\n');
            idx = responseData.indexOf(crlfcrlf);
            if (idx !== -1) {
                sepLen = 4;
            } else {
                idx = responseData.indexOf(lflf);
                if (idx !== -1) sepLen = 2;
            }
            let headerSection, bodyBuf;
            if (idx !== -1) {
                headerSection = responseData.slice(0, idx).toString('utf8');
                bodyBuf = responseData.slice(idx + sepLen);
            } else {
                headerSection = responseData.toString('utf8');
                bodyBuf = Buffer.alloc(0);
            }
            const lines = headerSection.split(/\r?\n/);
            const statusLine = lines[0].replace('\r', '');
            this.debugLog(`Content Status: ${statusLine}`);
            // Parse headers
            const headers = {};
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].replace('\r', '');
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).toLowerCase();
                    const value = line.substring(colonIndex + 1).trim();
                    headers[key] = value;
                }
            }
            
            // Decompress the body if needed
            bodyBuf = this.decompressBody(bodyBuf, headers);
            
            // Don't close the current connection - keep it for reuse
            // The socket will be managed by the socket pool
            
            resolve({ headers, body: bodyBuf, status: statusLine });
        } catch (error) {
            console.error('Error processing content response:', error);
            reject(error);
        }
    }

    /**
     * Save content to file - with optional HTML image following
     */
    async saveToFile(content, headers = {}) {
        const fs = require('fs').promises;
        
        try {
            // Check content type for --follow processing
            const contentType = headers['content-type'] || '';
            const normalizedContentType = contentType.split(';')[0].trim().toLowerCase();
            
            const isHtml = /text\/html/i.test(contentType) || 
                           (typeof content === 'string' && /<html/i.test(content)) ||
                           (Buffer.isBuffer(content) && /<html/i.test(content.toString('utf8')));
            
            const isDownloadList = normalizedContentType === 'wtv/download-list';
            
            if (this.followImages && isHtml) {
                this.debugLog('HTML content detected with --follow enabled, creating archive...');
                await this.createHtmlArchive(content, headers);
            } else if (this.followImages && isDownloadList) {
                this.debugLog('Download-list content detected with --follow enabled, creating archive...');
                await this.createDownloadListArchive(content, headers);
            } else {
                // Regular file save
                await fs.writeFile(this.outputFile, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
            }
        } catch (error) {
            console.error('Error saving to file:', error);
            throw error;
        }
    }

    /**
     * Create a zip archive containing HTML and all referenced images
     */
    async createHtmlArchive(htmlContent, headers = {}) {
        const fs = require('fs').promises;
        const htmlString = Buffer.isBuffer(htmlContent) ? htmlContent.toString('utf8') : htmlContent;
        
        this.debugLog('Creating HTML archive with images...');
        
        // Parse HTML to find image references
        const imageUrls = this.extractImageUrls(htmlString);
        this.debugLog(`Found ${imageUrls.length} image references:`, imageUrls);
        
        // Determine output filename - change extension to .zip if needed
        let archivePath = this.outputFile;
        if (!archivePath.endsWith('.zip')) {
            const ext = path.extname(archivePath);
            archivePath = archivePath.replace(ext, '.zip');
        }
        
        // Create zip archive
        const zip = new AdmZip();
        
        // Add the main HTML file with service/path structure
        const htmlPath = this.getServicePath(this.url, headers);
        zip.addFile(htmlPath, Buffer.from(htmlString, 'utf8'));
        this.debugLog(`Added HTML file: ${htmlPath}`);
        
        // Download and add images
        const downloadedImages = new Set();
        for (const imageUrl of imageUrls) {
            try {
                const imageResult = await this.downloadImage(imageUrl);
                if (imageResult && imageResult.body && !downloadedImages.has(imageUrl)) {
                    const imagePath = this.getServicePath(imageUrl, imageResult.headers || {});
                    zip.addFile(imagePath, imageResult.body);
                    downloadedImages.add(imageUrl);
                    this.debugLog(`Added image: ${imagePath} (from ${imageUrl})`);
                }
            } catch (error) {
                console.warn(`Failed to download image ${imageUrl}:`, error.message);
            }
        }
        
        // Write the zip file
        zip.writeZip(archivePath);
        
        console.log(`HTML archive created: ${archivePath}`);
        console.log(`Archive contains: ${htmlPath} + ${downloadedImages.size} images`);
    }

    /**
     * Create a zip archive containing download-list and all referenced files
     */
    async createDownloadListArchive(downloadListContent, headers = {}) {
        const fs = require('fs').promises;
        const downloadListString = Buffer.isBuffer(downloadListContent) ? downloadListContent.toString('utf8') : downloadListContent;
        
        this.debugLog('Creating download-list archive with referenced files...');
        
        // Extract URLs from the download-list
        const downloadUrls = this.extractUrlsFromDownloadList(downloadListString);
        this.debugLog(`Found ${downloadUrls.length} file references in download-list`);
        
        // Determine output filename - change extension to .zip if needed
        let archivePath = this.outputFile;
        if (!archivePath.endsWith('.zip')) {
            const ext = path.extname(archivePath);
            archivePath = archivePath.replace(ext, '.zip');
        }
        
        // Create zip archive
        const zip = new AdmZip();
        
        // Add the main download-list file with service/path structure
        const downloadListPath = this.getServicePath(this.url, headers);
        zip.addFile(downloadListPath, Buffer.from(downloadListString, 'utf8'));
        this.debugLog(`Added download-list file: ${downloadListPath}`);
        
        // Download and add referenced files
        const downloadedFiles = new Set();
        for (const fileUrl of downloadUrls) {
            try {
                this.debugLog(`Downloading referenced file: ${fileUrl}`);
                const match = fileUrl.match(/^([\w-]+):\/?(.*)/);
                if (match) {
                    const serviceName = match[1];
                    const path = '/' + (match[2] || '');
                    const fileResult = await this.makeRequestWithRetry(serviceName, path, null, true);
                    
                    if (fileResult && fileResult.body && !downloadedFiles.has(fileUrl)) {
                        // Validate checksum if we have one
                        this.validateDownloadChecksum(fileUrl, fileResult.body);
                        
                        const filePath = this.getServicePath(fileUrl, fileResult.headers || {});
                        zip.addFile(filePath, fileResult.body);
                        downloadedFiles.add(fileUrl);
                        this.debugLog(`Added referenced file: ${filePath}`);
                    }
                }
                
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.warn(`Failed to download referenced file ${fileUrl}: ${error.message}`);
            }
        }
        
        // Write the zip file
        zip.writeZip(archivePath);
        
        console.log(`Download-list archive created: ${archivePath}`);
        console.log(`Archive contains: ${downloadListPath} + ${downloadedFiles.size} referenced files`);
    }

    /**
     * Extract image URLs from HTML content
     */
    extractImageUrls(html) {
        const imageUrls = [];
        
        // Match img tags with src attributes
        const imgTagRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
        let match;
        
        while ((match = imgTagRegex.exec(html)) !== null) {
            const src = match[1];
            if (src && !src.startsWith('data:')) { // Skip data URLs
                imageUrls.push(src);
            }
        }
        
        // Also look for CSS background images
        const cssBackgroundRegex = /background-image\s*:\s*url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
        while ((match = cssBackgroundRegex.exec(html)) !== null) {
            const src = match[1];
            if (src && !src.startsWith('data:')) {
                imageUrls.push(src);
            }
        }
        
        // Look for WebTV-specific image references like <image src="...">
        const wtvImageRegex = /<image[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
        while ((match = wtvImageRegex.exec(html)) !== null) {
            const src = match[1];
            if (src && !src.startsWith('data:')) {
                imageUrls.push(src);
            }
        }
        
        // Remove duplicates and normalize URLs
        return [...new Set(imageUrls.map(url => this.normalizeImageUrl(url)))];
    }

    /**
     * Normalize image URL (convert relative URLs to absolute WebTV service URLs)
     */
    normalizeImageUrl(url) {
        // If it's already a full WebTV service URL, return as-is
        if (url.match(/^[\w-]+:/)) {
            return url;
        }
        
        // If it starts with /, it's relative to the service root
        if (url.startsWith('/')) {
            // Extract service name from current URL
            const currentMatch = this.url.match(/^([\w-]+):/);
            if (currentMatch) {
                return `${currentMatch[1]}:${url}`;
            }
        }
        
        // If it's a relative path, resolve it relative to current path
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            const currentMatch = this.url.match(/^([\w-]+):(.*)$/);
            if (currentMatch) {
                const serviceName = currentMatch[1];
                const currentPath = currentMatch[2];
                const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                return `${serviceName}:${basePath}${url}`;
            }
        }
        
        return url;
    }

    /**
     * Download an image from a WebTV service URL
     */
    async downloadImage(imageUrl) {
        this.debugLog(`Downloading image: ${imageUrl}`);
        
        try {
            // Parse the image URL
            const match = imageUrl.match(/^([\w-]+):\/?(.*)/);
            if (!match) {
                throw new Error(`Invalid image URL format: ${imageUrl}`);
            }
            
            const serviceName = match[1];
            const path = '/' + (match[2] || '');
            
            // Make request to download the image
            const result = await this.makeRequestWithRetry(serviceName, path, null, true); // Skip redirects for images
            
            if (result.body && result.body.length > 0) {
                this.debugLog(`Downloaded image: ${imageUrl} (${result.body.length} bytes)`);
                return { body: result.body, headers: result.headers };
            } else {
                throw new Error('Empty response');
            }
        } catch (error) {
            this.debugLog(`Failed to download image ${imageUrl}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Store content and extract links for follow-all mode
     */
    storeContent(url, response) {
        if (!url || this.downloadedUrls.has(url)) {
            return;
        }
        
        // Validate MD5 checksum if we have one for this URL
        this.validateDownloadChecksum(url, response.body);
        
        this.downloadedUrls.add(url);
        this.allContent.set(url, response);
        this.debugLog(`Stored content for: ${url} (${response.body.length} bytes)`);
        
        // Extract and queue new URLs if we haven't reached max depth
        if (this.currentDepth < this.maxDepth) {
            const newUrls = this.extractAllUrls(response.body, response.headers, url);
            for (const newUrl of newUrls) {
                if (!this.downloadedUrls.has(newUrl) && !this.pendingDownloads.includes(newUrl)) {
                    this.pendingDownloads.push(newUrl);
                    this.debugLog(`Queued for download: ${newUrl}`);
                }
            }
        }
    }

    /**
     * Validate MD5 checksum for downloaded content
     */
    validateDownloadChecksum(url, bodyData) {
        if (!this.downloadChecksums || !this.downloadChecksums.has(url)) {
            return; // No checksum to validate
        }
        
        const expectedChecksum = this.downloadChecksums.get(url);
        
        try {
            // Calculate MD5 hash of the downloaded content
            const actualChecksum = crypto.createHash('md5').update(bodyData).digest('hex');
            
            if (actualChecksum === expectedChecksum) {
                this.debugLog(`✓ MD5 checksum validated for ${url}: ${actualChecksum}`);
            } else {
                console.warn(`✗ MD5 checksum mismatch for ${url}:`);
                console.warn(`  Expected: ${expectedChecksum}`);
                console.warn(`  Actual:   ${actualChecksum}`);
                console.warn(`  This may indicate corrupted or modified content`);
            }
        } catch (error) {
            console.warn(`Failed to validate checksum for ${url}: ${error.message}`);
        }
    }

    /**
     * Extract all URLs from content (links, images, scripts, etc.)
     */
    extractAllUrls(body, headers, baseUrl) {
        const urls = [];
        
        try {
            // First, check headers for navigation URLs
            const headerUrls = this.extractUrlsFromHeaders(headers, baseUrl);
            urls.push(...headerUrls);
            
            // Check for wtv/download-list content type
            const contentType = headers['content-type'] || '';
            const normalizedContentType = contentType.split(';')[0].trim().toLowerCase();
            
            if (normalizedContentType === 'wtv/download-list') {
                const content = Buffer.isBuffer(body) ? body.toString('utf8') : body;
                const downloadListUrls = this.extractUrlsFromDownloadList(content);
                urls.push(...downloadListUrls);
                return urls; // Download lists are special, don't process as HTML
            }
            
            // Only process text content for HTML extraction
            if (!/text\/html|text\/plain|application\/.*javascript|text\/css/i.test(contentType)) {
                return urls;
            }
            
            const content = Buffer.isBuffer(body) ? body.toString('utf8') : body;
            
            // Extract various types of URLs
            const patterns = [
                // HTML links and form actions
                /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi,
                /<form[^>]+action\s*=\s*["']([^"']+)["'][^>]*>/gi,
                /<frame[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
                /<iframe[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
                
                // Images and media
                /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
                /<image[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
                /<video[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
                /<audio[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
                /<source[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
                
                // Scripts and stylesheets
                /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
                /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi,
                
                // CSS background images
                /background-image\s*:\s*url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
                
                // Meta redirects
                /<meta[^>]+content\s*=\s*["'][^"']*url=([^"';]+)[^"']*["'][^>]*>/gi,
                
                // WebTV specific patterns
                /wtv-[a-zA-Z0-9-]+:[^\s"'<>]+/gi,
                
                // WebTV upgradeblock tags
                /<upgradeblock[^>]+blockurl\s*=\s*["']([^"']+)["'][^>]*>/gi,
            ];
            
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const url = match[1] || match[0]; // Some patterns capture the whole match
                    if (url && !url.startsWith('data:') && !url.startsWith('javascript:') && 
                        !url.startsWith('mailto:') && !url.startsWith('http://') && 
                        !url.startsWith('https://') && !url.startsWith('client:')) {
                        const normalizedUrl = this.normalizeUrl(url, baseUrl);
                        if (normalizedUrl && this.isValidWebTVUrl(normalizedUrl)) {
                            urls.push(normalizedUrl);
                        }
                    }
                }
            }
            
            // Look for table-based navigation (common in WebTV)
            const tablePattern = /<td[^>]*>.*?<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>.*?<\/td>/gi;
            let match;
            while ((match = tablePattern.exec(content)) !== null) {
                const url = match[1];
                if (url && !url.startsWith('data:') && !url.startsWith('javascript:') && 
                    !url.startsWith('mailto:') && !url.startsWith('http://') && 
                    !url.startsWith('https://') && !url.startsWith('client:')) {
                    const normalizedUrl = this.normalizeUrl(url, baseUrl);
                    if (normalizedUrl && this.isValidWebTVUrl(normalizedUrl)) {
                        urls.push(normalizedUrl);
                    }
                }
            }
            
        } catch (error) {
            this.debugLog(`Error extracting URLs from ${baseUrl}: ${error.message}`);
        }
        
        // Remove duplicates
        return [...new Set(urls)];
    }

    /**
     * Extract URLs from wtv/download-list content
     * Parses "location:" lines within GET blocks (separated by double line breaks)
     * Also extracts wtv-checksum values for validation
     */
    extractUrlsFromDownloadList(content) {
        const urls = [];
        
        // Split content into blocks separated by double line breaks
        const blocks = content.split(/\r?\n\r?\n/);
        
        for (const block of blocks) {
            const trimmedBlock = block.trim();
            
            // Only process blocks that start with "GET"
            if (trimmedBlock.startsWith('GET ')) {
                const lines = trimmedBlock.split(/\r?\n/);
                let currentUrl = null;
                let currentChecksum = null;
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    
                    // Look for "location:" lines within GET blocks
                    if (trimmed.startsWith('location:')) {
                        currentUrl = trimmed.substring(9).trim(); // Remove "location:" prefix
                    }
                    
                    // Look for "wtv-checksum:" lines within GET blocks
                    if (trimmed.startsWith('wtv-checksum:')) {
                        currentChecksum = trimmed.substring(13).trim(); // Remove "wtv-checksum:" prefix
                    }
                }
                
                // If we found a valid URL, add it (with checksum if available)
                if (currentUrl && this.isValidWebTVUrl(currentUrl)) {
                    urls.push(currentUrl);
                    this.debugLog(`Found download-list location URL: ${currentUrl}`);
                    
                    // Store checksum for later validation if present
                    if (currentChecksum && currentChecksum !== '00000000000000000000000000000000') {
                        if (!this.downloadChecksums) {
                            this.downloadChecksums = new Map();
                        }
                        this.downloadChecksums.set(currentUrl, currentChecksum);
                        this.debugLog(`  -> Expected MD5 checksum: ${currentChecksum}`);
                    }
                }
            }
            
            // Also check for standalone "list" commands (not in GET blocks)
            if (trimmedBlock.startsWith('list ')) {
                // Extract URL from "list" command (format varies, look for URLs)
                const match = trimmedBlock.match(/wtv-[^:\s]+:[^\s]+/);
                if (match && this.isValidWebTVUrl(match[0])) {
                    urls.push(match[0]);
                    this.debugLog(`Found download-list command URL: ${match[0]}`);
                }
            }
        }
        
        return urls;
    }

    /**
     * Extract URLs from response headers (wtv-visit, Location, etc.)
     */
    extractUrlsFromHeaders(headers, baseUrl) {
        const urls = [];
        
        try {
            // Check for wtv-visit header
            if (headers['wtv-visit']) {
                const visitUrl = headers['wtv-visit'];
                if (visitUrl && !visitUrl.startsWith('client:')) {
                    const normalizedUrl = this.normalizeUrl(visitUrl, baseUrl);
                    if (normalizedUrl && this.isValidWebTVUrl(normalizedUrl)) {
                        urls.push(normalizedUrl);
                        this.debugLog(`Found wtv-visit URL: ${normalizedUrl}`);
                    }
                }
            }
            
            // Check for Location header (redirects)
            if (headers['Location'] || headers['location']) {
                const locationUrl = headers['Location'] || headers['location'];
                if (locationUrl && !locationUrl.startsWith('client:')) {
                    const normalizedUrl = this.normalizeUrl(locationUrl, baseUrl);
                    if (normalizedUrl && this.isValidWebTVUrl(normalizedUrl)) {
                        urls.push(normalizedUrl);
                        this.debugLog(`Found Location URL: ${normalizedUrl}`);
                    }
                }
            }
            
            // Check for other WebTV-specific headers that might contain URLs
            const urlHeaders = [
                'wtv-boot-url',
                'wtv-favorite-url', 
                'wtv-home-url',
                'wtv-mail-url',
                'wtv-log-url',
                'wtv-phone-log-url',
                'wtv-relogin-url',
                'wtv-reconnect-url',
                'wtv-datadownload-url',
                'wtv-datadownload-login-url',
                'wtv-ssl-certs-download-url',
                'wtv-offline-mail-connect-url',
                'wtv-messenger-login-url',
                'wtv-notifications-url',
                'wtv-addresses-url',
                'wtv-settings-url',
                'wtv-search-url',
                'wtv-explore-url'
            ];
            
            for (const headerName of urlHeaders) {
                if (headers[headerName]) {
                    const headerUrl = headers[headerName];
                    if (headerUrl && !headerUrl.startsWith('client:')) {
                        const normalizedUrl = this.normalizeUrl(headerUrl, baseUrl);
                        if (normalizedUrl && this.isValidWebTVUrl(normalizedUrl)) {
                            urls.push(normalizedUrl);
                            this.debugLog(`Found ${headerName} URL: ${normalizedUrl}`);
                        }
                    }
                }
            }
            
        } catch (error) {
            this.debugLog(`Error extracting URLs from headers: ${error.message}`);
        }
        
        return urls;
    }

    /**
     * Check if URL should be followed by the spider
     */
    shouldFollowUrl(url) {
        // Normalize the URL first
        const normalized = this.normalizeUrl(url, 'wtv-disk:/');
        return normalized && this.isValidWebTVUrl(normalized);
    }

    /**
     * Check if URL is a valid WebTV service URL that should be followed
     */
    isValidWebTVUrl(url) {
        // Don't follow HTTP/HTTPS URLs or client URLs
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('client:')) {
            return false;
        }
        
        // Only follow WebTV service URLs
        return /^wtv-[a-zA-Z0-9-]+:/i.test(url);
    }

    /**
     * Normalize URL (convert relative URLs to absolute WebTV service URLs)
     */
    normalizeUrl(url, baseUrl) {
        try {
            // Skip URLs we don't want to follow
            if (url.startsWith('http://') || url.startsWith('https://') || 
                url.startsWith('ftp://') || url.startsWith('client:')) {
                return null;
            }
            
            // If it's already a full WebTV service URL, return as-is
            if (this.isValidWebTVUrl(url)) {
                return url;
            }
            
            // If it starts with /, it's relative to the service root
            if (url.startsWith('/')) {
                const currentMatch = baseUrl.match(/^([\w-]+):/);
                if (currentMatch) {
                    return `${currentMatch[1]}:${url}`;
                }
            }
            
            // If it's a relative path, resolve it relative to current path
            if (!url.includes('://')) {
                const currentMatch = baseUrl.match(/^([\w-]+):(.*)$/);
                if (currentMatch) {
                    const serviceName = currentMatch[1];
                    const currentPath = currentMatch[2];
                    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                    return `${serviceName}:${basePath}${url}`;
                }
            }
            
            return null;
        } catch (error) {
            this.debugLog(`Error normalizing URL ${url}: ${error.message}`);
            return null;
        }
    }

    /**
     * Make request with retry logic for ECONNREFUSED errors
     */
    async makeRequestWithRetry(serviceName, path, postData = null, downloadMode = false, retryCount = 0) {
        try {
            return await this.makeRequest(serviceName, path, postData, downloadMode);
        } catch (error) {
            if (error.code === 'ECONNREFUSED' && retryCount < this.maxRetries) {
                const retryDelay = 5000; // 5 seconds
                this.debugLog(`Connection refused, retrying in ${retryDelay/1000}s (attempt ${retryCount + 1}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.makeRequestWithRetry(serviceName, path, postData, downloadMode, retryCount + 1);
            }
            throw error; // Re-throw if not ECONNREFUSED or max retries exceeded
        }
    }

    /**
     * Process all pending downloads
     */
    async processAllDownloads() {
        this.debugLog(`\n*** Starting aggressive crawl mode - depth ${this.maxDepth} ***`);
        
        while (this.pendingDownloads.length > 0 && this.currentDepth < this.maxDepth) {
            const currentBatch = [...this.pendingDownloads];
            this.pendingDownloads = [];
            this.currentDepth++;
            
            this.debugLog(`\n--- Processing depth ${this.currentDepth} (${currentBatch.length} URLs) ---`);
            
            for (const url of currentBatch) {
                if (this.downloadedUrls.has(url)) {
                    continue; // Skip if already downloaded
                }
                
                try {
                    this.debugLog(`Downloading: ${url}`);
                    const match = url.match(/^([\w-]+):\/?(.*)/);
                    if (match) {
                        const serviceName = match[1];
                        const path = '/' + (match[2] || '');
                        const result = await this.makeRequestWithRetry(serviceName, path, null, true);
                        this.storeContent(url, result);
                    }
                } catch (error) {
                    console.warn(`Failed to download ${url}: ${error.message}`);
                }
                
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        this.debugLog(`\n*** Crawl complete - downloaded ${this.downloadedUrls.size} URLs ***`);
    }

    /**
     * Create comprehensive archive with all downloaded content
     */
    async createComprehensiveArchive() {
        const fs = require('fs').promises;
        
        this.debugLog('Creating comprehensive archive with all downloaded content...');
        
        // Determine output filename - change extension to .zip if needed
        let archivePath = this.outputFile;
        if (!archivePath.endsWith('.zip')) {
            const ext = path.extname(archivePath);
            archivePath = archivePath.replace(ext, '.zip');
        }
        
        // Create zip archive
        const zip = new AdmZip();
        
        // Add all downloaded content
        let addedFiles = 0;
        for (const [url, response] of this.allContent) {
            try {
                const servicePath = this.getServicePath(url, response.headers || {});
                zip.addFile(servicePath, response.body);
                addedFiles++;
                this.debugLog(`Added to archive: ${servicePath} (from ${url})`);
                
                // Log content type for debugging
                const contentType = response.headers ? response.headers['content-type'] : 'unknown';
                if (contentType === 'text/tellyscript' || contentType === 'text/dialscript') {
                    this.debugLog(`  -> TellyScript/DialScript content detected, saved as .tok file`);
                }
            } catch (error) {
                console.warn(`Failed to add ${url} to archive: ${error.message}`);
            }
        }
        
        // Write the zip file
        zip.writeZip(archivePath);
        
        console.log(`Comprehensive archive created: ${archivePath}`);
        console.log(`Archive contains ${addedFiles} files from ${this.downloadedUrls.size} URLs`);
        
        // Print summary by service
        const serviceStats = {};
        for (const url of this.downloadedUrls) {
            const serviceName = url.match(/^([\w-]+):/)?.[1] || 'unknown';
            serviceStats[serviceName] = (serviceStats[serviceName] || 0) + 1;
        }
        
        console.log('\nContent by service:');
        for (const [service, count] of Object.entries(serviceStats)) {
            console.log(`  ${service}: ${count} files`);
        }
    }

    /**
     * Get file extension based on content-type header
     */
    getExtensionFromContentType(contentType) {
        if (!contentType) return null;
        
        const type = contentType.toLowerCase().split(';')[0].trim();
        
        // Map content types to file extensions
        const typeMap = {
            // WebTV specific
            'text/tellyscript': '.tok',
            'text/dialscript': '.tok',
            'wtv/download-list': '.txt',
            
            // Images
            'image/gif': '.gif',
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/bmp': '.bmp',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'image/x-icon': '.ico',
            'image/tiff': '.tiff',
            
            // Text/HTML
            'text/html': '.html',
            'text/plain': '.txt',
            'text/css': '.css',
            'text/javascript': '.js',
            'application/javascript': '.js',
            'application/x-javascript': '.js',
            
            // Audio/Video
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'video/mpeg': '.mpg',
            'video/quicktime': '.mov',
            
            // Other
            'application/pdf': '.pdf',
            'application/zip': '.zip',
            'application/x-shockwave-flash': '.swf'
        };
        
        return typeMap[type] || null;
    }

    /**
     * Convert WebTV service URL to service/path format for zip structure
     */
    getServicePath(url, headers = {}) {
        try {
            // Parse WebTV service URL: wtv-service:/path or wtv-service:path
            const match = url.match(/^([\w-]+):\/?(.*)/);
            if (match) {
                const serviceName = match[1];
                let pathPart = match[2] || '';
                
                // Remove query string and fragment
                pathPart = pathPart.split('?')[0].split('#')[0];
                
                // Remove leading slash if present
                pathPart = pathPart.replace(/^\/+/, '');
                
                // Check content type for extension determination
                const contentType = headers['content-type'] || '';
                const contentTypeExt = this.getExtensionFromContentType(contentType);
                
                // If path is empty or ends with /, add appropriate filename
                if (!pathPart || pathPart.endsWith('/')) {
                    // Determine file extension based on content type first, then fallback to URL patterns
                    const ext = contentTypeExt ||
                               (serviceName.includes('image') || url.includes('image') ? '.jpg' :
                               serviceName === 'wtv-home' || serviceName === 'wtv-guide' ? '.html' :
                               serviceName === 'wtv-content' ? '.html' :
                               url.includes('.html') || url.includes('.htm') ? '.html' :
                               url.includes('.jpg') || url.includes('.jpeg') ? '.jpg' :
                               url.includes('.png') ? '.png' :
                               url.includes('.gif') ? '.gif' :
                               url.includes('.css') ? '.css' :
                               url.includes('.js') ? '.js' : '.html');
                    
                    const filename = pathPart ? 'index' + ext : serviceName.replace('wtv-', '') + ext;
                    pathPart = pathPart + filename;
                }
                
                // Ensure the path has a file extension if it doesn't already
                if (!pathPart.includes('.')) {
                    // Determine extension based on content type first, then context
                    const ext = contentTypeExt ||
                               (serviceName.includes('image') || pathPart.includes('image') || 
                               pathPart.match(/\.(jpe?g|png|gif|bmp|webp|svg|ico|tiff)$/i) ? '.jpg' :
                               serviceName.includes('style') || pathPart.includes('style') || pathPart.includes('css') ? '.css' :
                               serviceName.includes('script') || pathPart.includes('script') || pathPart.includes('js') ? '.js' : '.html');
                    pathPart += ext;
                }
                
                // Override extension if content type provides a more specific one
                if (contentTypeExt && !pathPart.endsWith(contentTypeExt)) {
                    pathPart = pathPart.replace(/\.[^.]*$/, contentTypeExt);
                }
                
                // Clean up path separators and ensure valid filename
                pathPart = pathPart.replace(/\/+/g, '/').replace(/\/$/, '');
                
                return `${serviceName}/${pathPart}`;
            }
        } catch (error) {
            this.debugLog(`Error creating service path from ${url}: ${error.message}`);
        }
        
        // Fallback: create a reasonable path structure
        const serviceName = url.match(/^([\w-]+):/)?.[1] || 'unknown-service';
        const filename = this.getFilenameFromUrl(url, headers);
        return `${serviceName}/${filename}`;
    }

    /**
     * Extract filename from URL
     */
    getFilenameFromUrl(url, headers = {}) {
        try {
            // Check content type first for extension determination
            const contentType = headers['content-type'] || '';
            const contentTypeExt = this.getExtensionFromContentType(contentType);
            
            // Remove WebTV service prefix and extract path
            const match = url.match(/^(?:[\w-]+:\/?)?(.*?)(?:\?.*)?$/);
            if (match) {
                const pathPart = match[1];
                const filename = pathPart.split('/').pop();
                
                // If no filename or just path, generate one based on content
                if (!filename || filename === pathPart || filename === '') {
                    // Determine extension based on content type first, then URL patterns
                    const ext = contentTypeExt ||
                               (url.includes('.html') || url.includes('.htm') ? '.html' : 
                               url.includes('.jpg') || url.includes('.jpeg') ? '.jpg' :
                               url.includes('.png') ? '.png' :
                               url.includes('.gif') ? '.gif' :
                               url.includes('.bmp') ? '.bmp' :
                               url.includes('.webp') ? '.webp' :
                               url.includes('.svg') ? '.svg' :
                               url.includes('.ico') ? '.ico' :
                               url.includes('.tiff') ? '.tiff' :
                               url.includes('.js') ? '.js' :
                               url.includes('.css') ? '.css' : '');
                    
                    // Generate filename based on service and path
                    const serviceName = url.match(/^([\w-]+):/)?.[1] || 'content';
                    const pathHash = require('crypto').createHash('md5').update(pathPart).digest('hex').substring(0, 8);
                    return `${serviceName}_${pathHash}${ext}`;
                }
                
                // Ensure filename has appropriate extension if missing
                if (!filename.includes('.')) {
                    const ext = contentTypeExt ||
                               (url.includes('image') || /\.(jpe?g|png|gif|bmp|webp|svg|ico|tiff)$/i.test(url) ? '.jpg' : 
                               url.includes('style') || url.includes('css') ? '.css' :
                               url.includes('script') || url.includes('js') ? '.js' : '');
                    return filename + ext;
                }
                
                // Override extension if content type provides a more specific one
                if (contentTypeExt && !filename.endsWith(contentTypeExt)) {
                    return filename.replace(/\.[^.]*$/, contentTypeExt);
                }
                
                return filename;
            }
        } catch (error) {
            this.debugLog(`Error extracting filename from ${url}: ${error.message}`);
        }
        
        // Fallback to generic filename with hash
        const hash = require('crypto').createHash('md5').update(url).digest('hex').substring(0, 8);
        const contentType = headers['content-type'] || '';
        const contentTypeExt = this.getExtensionFromContentType(contentType);
        const ext = contentTypeExt || '';
        return `content_${hash}${ext}`;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Close all pooled sockets
        for (const [key, socket] of this.socketPool) {
            if (socket && !socket.destroyed) {
                this.debugLog(`Closing pooled socket: ${key}`);
                socket.destroy();
            }
        }
        this.socketPool.clear();
        
        if (this.currentSocket && !this.currentSocket.destroyed) {
            this.currentSocket.destroy();
        }
    }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        host: '127.0.0.1',
        port: 1615,
        ssid: '8100000000000001',
        url: 'wtv-home:/home',
        outputFile: null,
        maxRedirects: 10,
        useEncryption: false,
        request_type_download: false,
        followImages: false,
        followAll: false,
        maxDepth: 3,
        maxRetries: 5,
        debug: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--host':
                if (i + 1 < args.length) {
                    config.host = args[++i];
                }
                break;
            case '--port':
                if (i + 1 < args.length) {
                    config.port = parseInt(args[++i]);
                }
                break;
            case '--ssid':
                if (i + 1 < args.length) {
                    config.ssid = args[++i];
                }
                break;
            case '--max-redirects':
                if (i + 1 < args.length) {
                    config.maxRedirects = parseInt(args[++i]);
                }
                break;
            case '--url':
                if (i + 1 < args.length) {
                    config.url = args[++i];
                }
                break;
            case '--file':
            case '--output':
                if (i + 1 < args.length) {
                    config.outputFile = args[++i];
                }
                break;
            case '--dl-mode':
                config.request_type_download = true;
                break;
            case '--tricks':
                config.useTricksAccess = true;
                break;
            case '--encryption':
                config.useEncryption = true;
                break;
            case '--debug':
                config.debug = true;
                break;
            case '--follow':
                config.followImages = true;
                break;
            case '--follow-all':
                config.followAll = true;
                config.followImages = true; // follow-all implies follow
                break;
            case '--depth':
                if (i + 1 < args.length) {
                    config.maxDepth = parseInt(args[++i]);
                }
                break;
            case '--retries':
                if (i + 1 < args.length) {
                    config.maxRetries = parseInt(args[++i]);
                }
                break;
            case '--help':
                console.log(`
WebTV Client Simulator

Usage: node client_emu.js [options]

Options:
  --host <ip>             Target server IP address (default: 127.0.0.1)
  --port <port>           Target server port (default: 1615)
  --ssid <ssid>           WebTV client SSID (default: 8100000000000001)
  --url <url>             Target URL to fetch after authentication (default: wtv-home:/home)
  --file <filename>       Save response body to file instead of echoing to CLI
  --max-redirects <num>   Maximum number of wtv-visit redirects (default: 10)
  --dl-mode               Enable 'wtv-request-type: download' for diskmap testing on minisrv
  --encryption            Enable RC4 encryption after authentication
  --tricks-access         Enable tricks access for the target URL (requires wtv-tricks:/access?url= on server)
  --follow                Download HTML and all referenced images into a zip archive
  --follow-all            Aggressively download everything encountered (spider mode)
  --depth <num>           Maximum crawl depth for --follow-all mode (default: 5)
  --retries <num>         Maximum number of retries for ECONNREFUSED errors (default: 5)
  --debug                 Enable debug logging
  --help                  Show this help message

Example:
  node client_emu.js --host 192.168.1.100 --port 1615 --ssid 8100000000000001 --url wtv-home:/home --file output.html
  node client_emu.js --host 127.0.0.1 --url wtv-home:/home --file archive.zip --follow --debug
  node client_emu.js --host 127.0.0.1 --url wtv-home:/home --file complete.zip --follow-all --depth 2 --debug
                `);
                process.exit(0);
        }
    }

    return config;
}

/**
 * Main execution
 */
async function main() {
    const config = parseArgs();
    const simulator = new WebTVClientSimulator(config.host, config.port, config.ssid, config.url, config.outputFile, config.maxRedirects, config.useEncryption, config.request_type_download, config.debug, config.useTricksAccess, config.followImages, config.followAll, config.maxDepth, config.maxRetries);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        simulator.cleanup();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\nShutting down...');
        simulator.cleanup();
        process.exit(0);
    });

    try {
        await simulator.start();
    } catch (error) {
        console.error('Simulation failed:', error);
        simulator.cleanup();
        process.exit(1);
    }
}

// Run the simulator if this file is executed directly
if (require.main === module) {
    main();
}