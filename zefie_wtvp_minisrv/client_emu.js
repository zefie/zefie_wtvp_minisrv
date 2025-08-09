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
    constructor(host, port, ssid, url, outputFile = null, maxRedirects = 10) {
        this.host = host;
        this.port = port;
        this.ssid = ssid;
        this.url = url;
        this.outputFile = outputFile;
        this.maxRedirects = maxRedirects;
        this.redirectCount = 0;
        this.userIdDetected = false;
        this.services = new Map(); // Store service name -> {host, port} mappings
        this.wtvsec = null;
        this.wtvshared = new WTVShared();
        this.ticket = null;
        this.incarnation = 1;
        this.currentSocket = null;
        this.challengeResponse = null;
        this.initial_key = null; // Store initial key from wtv-initial-key header
        
        // Load minisrv config to get the initial shared key
        this.minisrv_config = this.wtvshared.readMiniSrvConfig(true, false);
        console.log(`WebTV Client Simulator starting...`);
        console.log(`Target: ${host}:${port}`);
        console.log(`SSID: ${ssid}`);
        console.log(`Target URL after auth: ${url}`);
        if (outputFile) {
            console.log(`Output file: ${outputFile}`);
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
    async makeRequest(serviceName, path, data = null, secure = false) {
        return new Promise((resolve, reject) => {
            // Determine host and port for the service
            let targetHost = this.host;
            let targetPort = this.port;
            
            if (this.services.has(serviceName)) {
                const service = this.services.get(serviceName);
                targetHost = service.host;
                targetPort = service.port;
            }

            console.log(`\n--- Making request to ${serviceName}:${path} at ${targetHost}:${targetPort} ---`);

            const socket = new net.Socket();
            this.currentSocket = socket;
            let responseData = '';

            socket.connect(targetPort, targetHost, () => {
                console.log(`Connected to ${targetHost}:${targetPort}`);
                
                // Build WTVP request
                const method = data ? 'POST' : 'GET';
                let request = `${method} ${serviceName}:${path}\r\n`;
                
                // Add required headers
                request += `wtv-client-serial-number: ${this.ssid}\r\n`;
                request += `wtv-client-bootrom-version: 105\r\n`;
                request += `wtv-client-rom-type: US-LC2-disk-0MB-8MB\r\n`;
                request += `wtv-incarnation: ${this.incarnation}\r\n`;
                request += `wtv-show-time: 0\r\n`;
                request += `wtv-request-type: primary\r\n`;
                request += `wtv-system-cpuspeed: 166187148\r\n`;
                request += `wtv-system-sysconfig: 4163328\r\n`;
                request += `wtv-disk-size: 8006\r\n`;

                
                // Add challenge response if we have one
                if (this.challengeResponse) {
                    request += `wtv-challenge-response: ${this.challengeResponse}\r\n`;
                    console.log('Added challenge response to request');
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
                
                console.log('Sending request:');
                console.log(request);
                socket.write(request);
            });

            socket.on('data', (chunk) => {
                responseData += chunk.toString();
                console.log(`Received chunk: ${chunk.toString().length} bytes`);
                
                // Check if we have a complete response (WTVP uses \n\n for header separation)
                if (responseData.includes('\n\n')) {
                    console.log('Complete response detected, processing...');
                    this.handleResponse(responseData, resolve, reject);
                }
            });

            socket.on('close', () => {
                console.log('Connection closed');
                if (responseData && !responseData.includes('\n\n')) {
                    console.log('Processing incomplete response on close...');
                    this.handleResponse(responseData, resolve, reject);
                }
            });

            socket.on('error', (error) => {
                console.error('Socket error:', error);
                reject(error);
            });

            // Set timeout
            socket.setTimeout(30000, () => {
                console.log('Request timed out');
                socket.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Handle the response from the server
     */
    handleResponse(responseData, resolve, reject) {
        console.log('\nReceived response:');
        console.log(responseData);
        
        try {
            // WTVP uses \n\n for header separation, not \r\n\r\n
            const [headerSection, body] = responseData.split('\n\n', 2);
            const lines = headerSection.split('\n');
            const statusLine = lines[0].replace('\r', ''); // Remove any \r characters
            
            console.log(`Status: ${statusLine}`);
            
            // Parse headers
            const headers = {};
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].replace('\r', ''); // Remove any \r characters
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).toLowerCase();
                    const value = line.substring(colonIndex + 1).trim();
                    
                    // Handle multiple headers with the same name (like wtv-service)
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
            
            // Handle special headers
            this.processHeaders(headers);
            
            // Close current connection before following wtv-visit
            if (this.currentSocket) {
                this.currentSocket.destroy();
                this.currentSocket = null;
            }
            
            // Check if user-id was detected (authentication successful)
            if (this.userIdDetected) {
                console.log(`\n*** Authentication complete! Now fetching target URL: ${this.url} ***`);
                setTimeout(() => {
                    this.fetchTargetUrl()
                        .then(resolve)
                        .catch(reject);
                }, 100);
                return;
            }
            
            // Follow wtv-visit if present and not authenticated yet
            if (headers['wtv-visit']) {
                if (this.redirectCount >= this.maxRedirects) {
                    console.log(`Maximum redirects (${this.maxRedirects}) reached, stopping`);
                    resolve({ headers, body, status: statusLine, stopped: true });
                    return;
                }
                
                this.redirectCount++;
                console.log(`Following wtv-visit (${this.redirectCount}/${this.maxRedirects}): ${headers['wtv-visit']}`);
                setTimeout(() => {
                    this.followVisit(headers['wtv-visit'])
                        .then(resolve)
                        .catch(reject);
                }, 100); // Reduced timeout for faster response
            } else {
                console.log('No wtv-visit header found, resolving...');
                resolve({ headers, body, status: statusLine });
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
                    console.log('Clearing service mappings');
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
                        console.log(`Registered service: ${serviceName} -> ${host}:${port}`);
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
            console.log('Received wtv-challenge, processing...');
            if (!this.wtvsec) {
                console.log('No WTVSec instance, initializing with default key...');
                this.wtvsec = new WTVSec(this.minisrv_config, this.incarnation);
            }
            
            try {
                this.wtvsec.IssueChallenge();
			    this.wtvsec.set_incarnation(headers["wtv-incarnation"]);
                const challengeResponse = this.wtvsec.ProcessChallenge(headers['wtv-challenge'], CryptoJS.enc.Base64.parse(this.initial_key));
                if (challengeResponse && challengeResponse.toString(CryptoJS.enc.Base64)) {
                    console.log('Challenge processed successfully, preparing response');
                    // We'll send the challenge response in the next request
                    this.challengeResponse = challengeResponse.toString(CryptoJS.enc.Base64);
                    //this.incarnation = this.wtvsec.incarnation;
                    console.log('Setting wtv-challenge-response header for next request');
                } else {
                    console.error('Failed to process challenge - no response generated');
                }
            } catch (error) {
                console.error('Error processing challenge:', error.message);
            }
        }

        // Handle wtv-ticket
        if (headers['wtv-ticket']) {
            console.log('Received wtv-ticket');
            this.ticket = headers['wtv-ticket'];
        }

        // Handle user-id header - indicates successful authentication
        if (headers['user-id']) {
            console.log(`*** Authentication successful! user-id detected: ${headers['user-id']} ***`);
            this.userIdDetected = true;
            return; // Stop processing other headers since we're authenticated
        }
    }

    /**
     * Follow a wtv-visit directive
     */
    async followVisit(visitUrl) {
        console.log(`Parsing wtv-visit URL: ${visitUrl}`);
        
        // Parse the visit URL: service:/path or service:path
        const match = visitUrl.match(/^([\w-]+):\/?(.*)/);
        if (match) {
            const serviceName = match[1];
            const path = '/' + (match[2] || '');
            console.log(`Parsed service: ${serviceName}, path: ${path}`);
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
        
        // Parse the target URL
        const match = this.url.match(/^([\w-]+):\/?(.*)/);
        if (match) {
            const serviceName = match[1];
            const path = '/' + (match[2] || '');
            console.log(`Parsed target service: ${serviceName}, path: ${path}`);
            
            try {
                const result = await this.makeRequestForContent(serviceName, path);
                
                // Handle the response
                if (result.body) {
                    console.log('\n*** Target URL Response Body ***');
                    if (this.outputFile) {
                        await this.saveToFile(result.body);
                        console.log(`Content saved to: ${this.outputFile}`);
                    } else {
                        console.log(result.body);
                    }
                } else {
                    console.log('No body content received from target URL');
                }
                
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
     * Make a WTVP request specifically for content (doesn't follow redirects)
     */
    async makeRequestForContent(serviceName, path, data = null, secure = false) {
        return new Promise((resolve, reject) => {
            // Determine host and port for the service
            let targetHost = this.host;
            let targetPort = this.port;
            
            if (this.services.has(serviceName)) {
                const service = this.services.get(serviceName);
                targetHost = service.host;
                targetPort = service.port;
            }

            console.log(`\n--- Making content request to ${serviceName}:${path} at ${targetHost}:${targetPort} ---`);

            const socket = new net.Socket();
            this.currentSocket = socket;
            let responseData = '';

            socket.connect(targetPort, targetHost, () => {
                console.log(`Connected to ${targetHost}:${targetPort}`);
                
                // Build WTVP request
                const method = data ? 'POST' : 'GET';
                let headers = "";
                let request = `${method} ${serviceName}:${path}\r\n`;
                
                // Add required headers
                headers += `wtv-client-serial-number: ${this.ssid}\r\n`;
                headers += `wtv-client-bootrom-version: 2046\r\n`;
                headers += `wtv-client-rom-type: US-LC2-disk-0MB-8MB\r\n`;
                headers += `wtv-incarnation: ${this.incarnation}\r\n`;
                headers += `wtv-show-time: 0\r\n`;
                headers += `wtv-request-type: primary\r\n`;
                headers += `wtv-system-cpuspeed: 166187148\r\n`;
                headers += `wtv-system-sysconfig: 4163328\r\n`;
                headers += `wtv-disk-size: 8006\r\n`;
                if (secure) headers += `wtv-encryption: true\r\n`;

                // Add challenge response if we have one
                if (this.challengeResponse) {
                    headers += `wtv-challenge-response: ${this.challengeResponse}\r\n`;
                }
                
                // Add ticket if we have one
                if (this.ticket) {
                    headers += `wtv-ticket: ${this.ticket}\r\n`;
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
                
                console.log('Sending content request:');
                if (secure) {
                    let secure_request = `SECURE ON\r\n`;
                    secure_request += headers;
                    secure_request += `\r\n`
                    this.wtvsec.set_incarnation(this.incarnation);
                    let sec = this.wtvsec.Encrypt(1, request);
                    console.log(secure_request + sec);
                    socket.write(secure_request + sec);
                } else {
                    console.log(request + headers);
                    socket.write(request + headers);
                }
            });

            socket.on('data', (chunk) => {
                responseData += chunk.toString();
                console.log(`Received content chunk: ${chunk.toString().length} bytes`);
                
                // Check if we have a complete response
                if (responseData.includes('\n\n')) {
                    console.log('Complete content response detected, processing...');
                    this.processContentResponse(responseData, resolve, reject);
                }
            });

            socket.on('close', () => {
                console.log('Content connection closed');
                if (responseData && !responseData.includes('\n\n')) {
                    console.log('Processing incomplete content response on close...');
                    this.processContentResponse(responseData, resolve, reject);
                }
            });

            socket.on('error', (error) => {
                console.error('Content socket error:', error);
                reject(error);
            });

            // Set timeout
            socket.setTimeout(30000, () => {
                console.log('Content request timed out');
                socket.destroy();
                reject(new Error('Content request timeout'));
            });
        });
    }

    /**
     * Process the content response without following redirects
     */
    processContentResponse(responseData, resolve, reject) {
        try {
            // WTVP uses \n\n for header separation
            const [headerSection, body] = responseData.split('\n\n', 2);
            const lines = headerSection.split('\n');
            const statusLine = lines[0].replace('\r', '');
            
            console.log(`Content Status: ${statusLine}`);
            
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
            
            // Close current connection
            if (this.currentSocket) {
                this.currentSocket.destroy();
                this.currentSocket = null;
            }
            
            resolve({ headers, body: body || '', status: statusLine });
            
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
            await fs.writeFile(this.outputFile, content, 'utf8');
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
        maxRedirects: 10
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
    const simulator = new WebTVClientSimulator(config.host, config.port, config.ssid, config.url, config.outputFile, config.maxRedirects);
    
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