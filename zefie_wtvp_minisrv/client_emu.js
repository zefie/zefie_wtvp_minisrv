const net = require('net');
const CryptoJS = require('crypto-js');
const WTVSec = require('./includes/classes/WTVSec.js');
const WTVShared = require('./includes/classes/WTVShared.js')['WTVShared'];

/**
 * WebTV Client Simulator
 * 
 * This simulator emulates a WebTV client connecting to a WebTV service
 * using the WTVP protocol with proper authentication and service discovery.
 */
class WebTVClientSimulator {
    constructor(host, port, ssid, url, outputFile = null, maxRedirects = 10, useEncryption = false, request_type_download = false, debug = false) {
        this.host = host;
        this.port = port;
        this.ssid = ssid;
        this.url = url;
        this.request_type_download = request_type_download;
        this.outputFile = outputFile;
        this.maxRedirects = maxRedirects;
        this.useEncryption = useEncryption;
        this.encryptionEnabled = false;
        this.redirectCount = 0;
        this.userIdDetected = false;
        this.targetUrlFetched = false; // Prevent multiple target URL fetches
        this.services = new Map(); // Store service name -> {host, port} mappings
        this.wtvsec = null;
        this.wtvshared = new WTVShared();
        this.ticket = null;
        this.incarnation = 1;
        this.currentSocket = null;
        this.challengeResponse = null;
        this.initial_key = null; // Store initial key from wtv-initial-key header
        this.debug = debug;
        
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
     * Start the simulation by connecting to wtv-1800:/preregister
     */
    async start() {
        try {
            await this.makeRequest('wtv-1800', '/preregister');
        } catch (error) {
            console.error('Failed to start simulation:', error);
        }
    }

    /**
     * Make a WTVP request to a service
     */
    async makeRequest(serviceName, path, data = null, skipRedirects = false) {
        return new Promise((resolve, reject) => {
            // Determine host and port for the service
            let targetHost = this.host;
            let targetPort = this.port;
            
            if (this.services.has(serviceName)) {
                const service = this.services.get(serviceName);
                targetHost = service.host;
                targetPort = service.port;
            }

            this.debugLog(`\n--- Making request to ${serviceName}:${path} at ${targetHost}:${targetPort} ---`);

            const socket = new net.Socket();
            this.currentSocket = socket;
            let responseData = Buffer.alloc(0);

            socket.connect(targetPort, targetHost, () => {
                this.debugLog(`Connected to ${targetHost}:${targetPort}`);
                
                let requestData;
                
                if (this.encryptionEnabled && this.wtvsec) {
                    // Send encrypted request
                    requestData = this.buildEncryptedRequest(serviceName, path, data);
                } else {
                    // Send regular request
                    requestData = this.buildRegularRequest(serviceName, path, data);
                }
                
                this.debugLog('Sending request:');
                if (this.encryptionEnabled) {
                    this.debugLog('[ENCRYPTED REQUEST]');
                    this.debugLog(`Length: ${requestData.length} bytes`);
                } else {
                    this.debugLog(requestData.toString());
                }
                
                socket.write(requestData);
            });

            socket.on('data', (chunk) => {
                responseData = Buffer.concat([responseData, chunk]);
                this.debugLog(`Received chunk: ${chunk.length} bytes`);

                // Check if we have a complete response
                if (this.encryptionEnabled) {
                    // For encrypted responses, we need to handle differently
                    this.handleEncryptedResponse(responseData, resolve, reject);
                } else {
                    // Regular response handling
                    // Only check for header/body split, do not convert to string
                    // Use both CRLF and LF as in handleResponse
                    const crlfcrlf = Buffer.from('\r\n\r\n');
                    const lflf = Buffer.from('\n\n');
                    let idx = responseData.indexOf(crlfcrlf);
                    if (idx === -1) idx = responseData.indexOf(lflf);
                    if (idx !== -1) {
                        this.debugLog('Complete response detected, processing...');
                        this.handleResponse(responseData, resolve, reject, skipRedirects);
                    }
                }
            });

            socket.on('close', () => {
                this.debugLog('Connection closed');
                if (responseData.length > 0 && !this.encryptionEnabled) {
                    // Only process if not already processed
                    const crlfcrlf = Buffer.from('\r\n\r\n');
                    const lflf = Buffer.from('\n\n');
                    let idx = responseData.indexOf(crlfcrlf);
                    if (idx === -1) idx = responseData.indexOf(lflf);
                    if (idx === -1) {
                        this.debugLog('Processing incomplete response on close...');
                        this.handleResponse(responseData, resolve, reject, skipRedirects);
                    }
                } else if (responseData.length > 0 && this.encryptionEnabled) {
                    this.debugLog('Processing encrypted response on close...');
                    this.handleEncryptedResponse(responseData, resolve, reject);
                }
            });

            socket.on('error', (error) => {
                console.error('Socket error:', error);
                reject(error);
            });

            // Set timeout
            socket.setTimeout(30000, () => {
                console.error('Request timed out');
                socket.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Build a regular (unencrypted) WTVP request
     */
    buildRegularRequest(serviceName, path, data = null) {
        const method = data ? 'POST' : 'GET';
        let request = `${method} ${serviceName}:${path}\r\n`;
        
        // Add required headers
        request += `wtv-client-serial-number: ${this.ssid}\r\n`;
        request += `wtv-client-bootrom-version: 105\r\n`;
        request += `wtv-client-rom-type: US-LC2-disk-0MB-8MB\r\n`;
        request += `wtv-incarnation: ${this.incarnation}\r\n`;
        request += `wtv-show-time: 0\r\n`;
        request += `wtv-request-type: ${((this.request_type_download) ? 'download' : 'primary')}\r\n`;
        request += `wtv-system-cpuspeed: 166187148\r\n`;
        request += `wtv-system-sysconfig: 4163328\r\n`;
        request += `wtv-disk-size: 8006\r\n`;

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
     * Build an encrypted WTVP request
     */
    buildEncryptedRequest(serviceName, path, data = null) {
        // First, check if this is the SECURE ON request
        if (serviceName === 'SECURE' && path === 'ON') {
            return Buffer.from('SECURE ON\r\n', 'utf8');
        }
        
        const method = data ? 'POST' : 'GET';
        let request = `${method} ${serviceName}:${path}\r\n`;
        
        // Add headers for encrypted requests
        request += `Accept-Language: en-US,en\r\n`;
        if (this.ticket) {
            request += `wtv-ticket: ${this.ticket}\r\n`;
        }
        request += `wtv-connect-session-id: ${Math.floor(Math.random() * 0xFFFFFFFF).toString(16)}\r\n`;
        request += `wtv-client-serial-number: ${this.ssid}\r\n`;
        request += `wtv-system-version: 7181\r\n`;
        request += `wtv-capability-flags: 10935ffc8f\r\n`;
        request += `wtv-client-bootrom-version: 2046\r\n`;
        request += `wtv-client-rom-type: US-LC2-disk-0MB-8MB\r\n`;
        request += `wtv-system-chipversion: 51511296\r\n`;
        request += `User-Agent: Mozilla/4.0 WebTV/2.2.6.1 (compatible; MSIE 4.0)\r\n`;
        request += `wtv-encryption: true\r\n`;
        request += `wtv-script-id: ${Math.floor(Math.random() * 0x7FFFFFFF) - 0x40000000}\r\n`;
        request += `wtv-script-mod: ${Math.floor(Math.random() * 0xFFFFFFFF)}\r\n`;
        request += `wtv-incarnation: ${this.incarnation}\r\n`;
        
        if (this.request_type_download) request += 'wtv-request-type: download\r\n';
        
        // Add content if POST
        if (data) {
            const content = typeof data === 'string' ? data : JSON.stringify(data);
            request += `Content-Length: ${content.length}\r\n`;
            request += `Content-Type: application/x-www-form-urlencoded\r\n`;
            request += `\r\n${content}`;
        } else {
            request += '\r\n';
        }
        
        // Encrypt the request using RC4 with key 0
        try {
            const requestBuffer = Buffer.from(request, 'utf8');
            const encryptedBuffer = this.wtvsec.Encrypt(0, requestBuffer);
            return Buffer.from(encryptedBuffer);
        } catch (error) {
            console.error('Error encrypting request:', error);
            return Buffer.from(request, 'utf8');
        }
    }

    /**
     * Handle encrypted response data
     */
    handleEncryptedResponse(responseData, resolve, reject) {
        try {
            // Look for the double newline that separates headers from body
            const responseStr = responseData.toString('binary');
            const headerEndIndex = responseStr.indexOf('\n\n');
            
            if (headerEndIndex === -1) {
                // Not a complete response yet
                return;
            }
            
            // Split headers and body
            const headerSection = responseStr.substring(0, headerEndIndex);
            const bodyStart = headerEndIndex + 2;
            const bodyBuffer = responseData.slice(bodyStart);
            
            this.debugLog('\nReceived encrypted response:');
            this.debugLog('Headers:');
            this.debugLog(headerSection);
            
            // Parse headers
            const lines = headerSection.split('\n');
            const statusLine = lines[0].replace('\r', '');

            this.debugLog(`Status: ${statusLine}`);

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
            
            // Decrypt the body if we have encryption enabled
            let body = Buffer.alloc(0);
            if (bodyBuffer.length > 0 && headers['wtv-encrypted'] === 'true' && this.wtvsec) {
                try {
                    this.debugLog('Decrypting response body...');
                    const decryptedBuffer = this.wtvsec.Decrypt(1, bodyBuffer);
                    body = Buffer.from(decryptedBuffer);
                    this.debugLog('Body decrypted successfully');
                } catch (error) {
                    console.error('Error decrypting response body:', error);
                    body = bodyBuffer;
                }
            } else {
                body = bodyBuffer;
            }
            
            // Handle special headers
            this.processHeaders(headers);
            
            // Close current connection
            if (this.currentSocket) {
                this.currentSocket.destroy();
                this.currentSocket = null;
            }
            
            resolve({ headers, body, status: statusLine });
            
        } catch (error) {
            console.error('Error processing encrypted response:', error);
            reject(error);
        }
    }
    handleResponse(responseData, resolve, reject, skipRedirects = false) {
        this.debugLog('\nReceived response:');
        this.debugLog(responseData);
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
            if (this.currentSocket) {
                this.currentSocket.destroy();
                this.currentSocket = null;
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
            if (headers['wtv-visit'] && !skipRedirects) {
                if (this.redirectCount >= this.maxRedirects) {
                    this.debugLog(`Maximum redirects (${this.maxRedirects}) reached, stopping`);
                    resolve({ headers, body: bodyBuf, status: statusLine, stopped: true });
                    return;
                }
                this.redirectCount++;
                this.debugLog(`Following wtv-visit (${this.redirectCount}/${this.maxRedirects}): ${headers['wtv-visit']}`);
                setTimeout(() => {
                    this.followVisit(headers['wtv-visit'])
                        .then(resolve)
                        .catch(reject);
                }, 100);
            } else {
                if (skipRedirects && headers['wtv-visit']) {
                    this.debugLog(`Skipping wtv-visit redirect: ${headers['wtv-visit']}`);
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
            if (!this.wtvsec) {
                this.debugLog('No WTVSec instance, initializing with default key...');
                this.wtvsec = new WTVSec(this.minisrv_config, this.incarnation);
            }
            
            try {
                this.wtvsec.IssueChallenge();
			    this.wtvsec.set_incarnation(headers["wtv-incarnation"]);
                const challengeResponse = this.wtvsec.ProcessChallenge(headers['wtv-challenge'], CryptoJS.enc.Base64.parse(this.initial_key));
                if (challengeResponse && challengeResponse.toString(CryptoJS.enc.Base64)) {
                    this.debugLog('Challenge processed successfully, preparing response');
                    // We'll send the challenge response in the next request
                    this.challengeResponse = challengeResponse.toString(CryptoJS.enc.Base64);
                    //this.incarnation = this.wtvsec.incarnation;
                    this.debugLog('Setting wtv-challenge-response header for next request');
                } else {
                    console.error('Failed to process challenge - no response generated');
                }
            } catch (error) {
                console.error('Error processing challenge:', error.message);
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
            if (this.useEncryption && this.wtvsec && !this.encryptionEnabled) {
                this.debugLog('*** Enabling encryption after successful authentication ***');
                this.wtvsec.SecureOn(); // Initialize RC4 sessions
                this.encryptionEnabled = true;
            }
            
            return; // Stop processing other headers since we're authenticated
        }
    }

    /**
     * Follow a wtv-visit directive
     */
    async followVisit(visitUrl) {
        this.debugLog(`Parsing wtv-visit URL: ${visitUrl}`);

        // Parse the visit URL: service:/path or service:path
        const match = visitUrl.match(/^([\w-]+):\/?(.*)/);
        if (match) {
            const serviceName = match[1];
            const path = '/' + (match[2] || '');
            this.debugLog(`Parsed service: ${serviceName}, path: ${path}`);
            return await this.makeRequest(serviceName, path);
        } else {
            throw new Error(`Invalid wtv-visit URL: ${visitUrl}`);
        }
    }

    /**
     * Fetch the target URL after authentication is complete
     */
    async fetchTargetUrl() {
        console.log(`Fetching target URL: ${this.url}`);

        // If encryption is enabled, send SECURE ON first
        if (this.encryptionEnabled) {
            this.debugLog('Sending SECURE ON command...');
            try {
                await this.makeRequest('SECURE ON', '', '', {});
                this.debugLog('Encryption successfully enabled');
            } catch (error) {
                console.error('Failed to enable encryption:', error.message);
                throw error;
            }
        }
        
        // Parse the target URL
        const match = this.url.match(/^([\w-]+):\/?(.*)/);
        if (match) {
            const serviceName = match[1];
            const path = '/' + (match[2] || '');
            this.debugLog(`Parsed target service: ${serviceName}, path: ${path}`);

            try {
                const result = await this.makeRequest(serviceName, path, null, true); // Skip redirects for target URL
                
                // Handle the response
                if (result.body) {
                    this.debugLog('\n*** Target URL Response Body ***');
                    if (this.outputFile) {
                        await this.saveToFile(result.body);
                        console.log(`Content saved to: ${this.outputFile}`);
                    } else {
                        // Detect text content for CLI output
                        const contentType = result.headers['content-type'] || '';
                        if (/^text\//.test(contentType) || /json|xml|javascript/.test(contentType)) {
                            console.log(result.body.toString('utf8'));
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
            if (this.currentSocket) {
                this.currentSocket.destroy();
                this.currentSocket = null;
            }
            resolve({ headers, body: bodyBuf, status: statusLine });
        } catch (error) {
            console.error('Error processing content response:', error);
            reject(error);
        }
    }

    /**
     * Save content to file
     */
    async saveToFile(content) {
        const fs = require('fs').promises;
        try {
            await fs.writeFile(this.outputFile, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
        } catch (error) {
            console.error('Error saving to file:', error);
            throw error;
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.currentSocket) {
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
                if (i + 1 < args.length) {
                    config.outputFile = args[++i];
                }
                break;
            case '--download':
                config.request_type_download = true;
                break;
            case '--encryption':
                config.useEncryption = true;
                break;
            case '--debug':
                config.debug = true;
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
  --download              Enable 'wtv-request-type: download' for diskmap testing)
  --encryption            Enable RC4 encryption after authentication
  --debug                 Enable debug logging
  --help                  Show this help message

Example:
  node client_emu.js --host 192.168.1.100 --port 1615 --ssid 8100000000000001 --url wtv-home:/home --file output.html
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
    const simulator = new WebTVClientSimulator(config.host, config.port, config.ssid, config.url, config.outputFile, config.maxRedirects, config.useEncryption, config.request_type_download, config.debug);
    
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