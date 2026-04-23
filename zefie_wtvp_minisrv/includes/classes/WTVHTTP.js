const {WTVShared, clientShowAlert} = require('./WTVShared.js');

class WTVHTTP {
    constructor(...[minisrv_config, service_name, http, sendToClient]) {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        this.wtvshared = new WTVShared(minisrv_config);
        this.sendToClient = sendToClient;
        this.http = http;
        this.https = require('follow-redirects').https
        this.proxy_agent = null;
    }

    async doHTTPProxy(socket, request_headers) {
        // detect protocol name
        const idx = request_headers.request_url.indexOf('/') - 1;

        const request_type = request_headers.request_url.slice(0, idx);
        if (this.minisrv_config.config.debug_flags.show_headers) console.debug(request_type.toUpperCase() + " Proxy: Client Request Headers on socket ID", socket.id, (await this.wtvshared.decodePostData(await this.wtvshared.filterRequestLog(await this.wtvshared.filterSSID(request_headers)))));
        else debug(request_type.toUpperCase() + " Proxy: Client Request Headers on socket ID", socket.id, (await this.wtvshared.decodePostData(await this.wtvshared.filterRequestLog(await this.wtvshared.filterSSID(request_headers)))));

        switch (request_type) {
            case "https":
                this.proxy_agent = this.https;
                break;
            default:
                this.proxy_agent = this.http;
                break;
        }

        const request_data = [];
        const data = [];

        request_data.method = request_headers.request.split(' ')[0];
        const request_url_split = request_headers.request.split(' ')[1].split('/');
        request_data.host = request_url_split[2];
        if (request_data.host.indexOf(':') > 0) {
            request_data.port = request_data.host.split(':')[1];
            request_data.host = request_data.host.split(':')[0];
        } else {
            if (request_type === "https") request_data.port = 443;
            else request_data.port = 80;
        }
        for (let i = 0; i < 3; i++) request_url_split.shift();
        request_data.path = "/" + request_url_split.join('/');
        if (request_data.method && request_data.host && request_data.path) {

            const options = {
                host: request_data.host,
                port: request_data.port,
                path: request_data.path,
                method: request_data.method,
                followAllRedirects: true,
                headers: {
                    "User-Agent": request_headers["User-Agent"] || "WebTV",
                    "Connection": "Keep-Alive"
                }
            }

            // RFC7239
            if (socket.remoteAddress !== "127.0.0.1") {
                options.headers["X-Forwarded-For"] = socket.remoteAddress;
            }

            if (request_headers.post_data) {
                if (request_headers["Content-type"]) options.headers["Content-type"] = request_headers["Content-type"];
                if (request_headers["Content-length"]) options.headers["Content-length"] = request_headers["Content-length"];
            }

            if (request_type == "https" && this.minisrv_config.services[request_type].allow_self_signed_ssl) {
                options.rejectUnauthorized = false;
            }

            if (this.minisrv_config.services[request_type].use_external_proxy && minisrv_config.services[request_type].external_proxy_port) {
                // configure connection to an external proxy
                if (this.minisrv_config.services[request_type].external_proxy_is_socks) {
                    // configure connection to remote socks proxy
                    const { SocksProxyAgent }= require('socks-proxy-agent');
                    options.agent = new SocksProxyAgent("socks://" + (minisrv_config.services[request_type].external_proxy_host || "127.0.0.1") + ":" + minisrv_config.services[request_type].external_proxy_port);
                } else {
                    // configure connection to remote http proxy
                    this.proxy_agent = this.http;
                    options.host = this.minisrv_config.services[request_type].external_proxy_host;
                    options.port = this.minisrv_config.services[request_type].external_proxy_port;
                    options.path = request_headers.request.split(' ')[1];
                    options.headers.Host = request_data.host + ":" + request_data.port;
                    if (this.minisrv_config.services[request_type].replace_protocol) {
                        options.path = options.path.replace(request_type, this.minisrv_config.services[request_type].replace_protocol);
                    }
                }
                if (this.minisrv_config.services[request_type].external_proxy_is_http1) {
                    options.insecureHTTPParser = true;
                    options.headers.Connection = 'close'
                }
            }
            if (this.minisrv_config.services[request_type].support_bitdefender_self_signed_proxy) {
                try {
                    const WTVSSL = require('./WTVSSL.js');
                    const ssl = new WTVSSL();
                    const bitdefenderCACert = ssl.getBitdefenderCACert();
                    if (bitdefenderCACert) {
                        options.ca = [bitdefenderCACert];
                        // this sucks, but bitdefender's cert is weird and doesn't seem to work properly with Node's TLS implementation
                        // even when added to the trusted store, so we have to disable rejection of unauthorized certs
                        // when the Bitdefender CA cert is present. At least this way we can still allow it without
                        // completely breaking SSL proxying for Bitdefender users.
                        // This will only trigger on Windows if support_bitdefender_self_signed_proxy is true, and the Bitdefender CA file exists
                        options.rejectUnauthorized = false; 
                    }
                } catch (err) {
                    console.warn(" * Failed to load Bitdefender CA certificate:", err.message);
                }
            }            
            const req = this.proxy_agent.request(options, (res) => {
                let total_data = 0;

                res.on('data', d => {
                    data.push(d);
                    total_data += d.length;
                    if (total_data > 1024 * 1024 * parseFloat(this.minisrv_config.services[request_type].max_response_size || 16)) {
                        console.warn(` * Response data exceeded ${this.minisrv_config.services[request_type].max_response_size || 16}MB limit, destroying...`);
                        res.destroy();
                        const errpage = this.wtvshared.doErrorPage(400, "The item chosen is too large to be used.");
                        this.sendToClient(socket, errpage[0], errpage[1]);
                    }
                })

                res.on('error', (err) => {
                    // hack for Protoweb ECONNRESET
                    if (this.minisrv_config.services[request_type].external_proxy_is_http1 && data.length > 0) {
                        this.handleProxy(socket, request_type, request_headers, res, data);
                    } else {
                        console.error(" * Unhandled Proxy Request Error:", err);
                    }
                });

                res.on('end', () => {
                    // For when http proxies behave correctly
                    if (!this.minisrv_config.services[request_type].external_proxy_is_http1 || data.length > 0) {
                        this.handleProxy(socket, request_type, request_headers, res, data);
                    }
                });
            }).on('error', (err) => {
                    // severe errors, such as unable to connect.
                if (err.code === "ENOTFOUND" || err.message.indexOf("HostUnreachable") > 0) {
                    const errpage = this.wtvshared.doErrorPage(400, `The publisher <b>${request_data.host}</b> is unknown.`);
                    this.sendToClient(socket, errpage[0], errpage[1]);
                } else {
                    console.error(" * Unhandled Proxy Request Error:", err);
                    const errpage = this.wtvshared.doErrorPage(400);
                    this.sendToClient(socket, errpage[0], errpage[1]);
                }
                
            });
            if (request_headers.post_data) {
                req.write(Buffer.from(request_headers.post_data.toString(CryptoJS.enc.Hex), 'hex'), () => {
                    req.end();
                });
            } else {
                req.end();
            }
        }    
    }

    handleProxy(socket, request_type, request_headers, res, data) {
        console.log(` * Proxy Request ${request_type.toUpperCase()} ${res.statusCode} for ${request_headers.request}`)
        // an http response error is not a request error, and will come here under the 'end' event rather than an 'error' event.
        switch (res.statusCode) {
            case 404:
                res.headers.Status = res.statusCode + " The publisher can&#146;t find the page requested.";
                break;

            case 401:
            case 403:
                res.headers.Status = res.statusCode + " The publisher of that page has not authorized you to use it.";
                break;

            case 500:
                res.headers.Status = res.statusCode + " The publisher of that page can&#146;t be reached.";
                break;

            default:
                res.headers.Status = res.statusCode + " " + res.statusMessage;
                break;
        }

        if (res.headers['Content-type']) {
            res.headers['Content-Type'] = res.headers['Content-type'];
            delete (res.headers['Content-type'])
        }

        if (res.headers['content-type']) {
            res.headers['Content-Type'] = res.headers['content-type'];
            delete (res.headers['content-type'])
        }
    
        // header pass-through whitelist, case insensitive comparsion to server, however, you should
        // specify the header case as you intend for the client
        const headers = this.wtvshared.stripHeaders(res.headers, [
            'Connection',
            'Server',
            'Date',
            'Content-Type',
            'Cookie',
            'Location',
            'Accept-Ranges',
            'Last-Modified'
        ]);
        headers["wtv-http-proxy"] = true;
        headers["wtv-trusted"] = false;

        if (typeof res.headers['Content-Type'] === 'string' && res.headers['Content-Type'].startsWith("text")) {
            // Get the original URL for relative link fixing
            const originalUrl = request_headers.request.split(' ')[1];
            
            // Transform HTML content for WebTV compatibility
            if (res.headers['Content-Type'].includes('html') && 
                this.minisrv_config.services[request_type]?.use_minifying_proxy === true) {
                try {
                    const WTVMinifyingProxy = require('./WTVMinifyingProxy.js');
                    const proxy = new WTVMinifyingProxy(this.minisrv_config);
                    
                    let htmlContent = Buffer.concat(data).toString();
                    
                    // Apply WebTV-specific transformations
                    const transformOptions = {
                        removeImages: this.minisrv_config.services[request_type]?.remove_images || false,
                        maxImageWidth: this.minisrv_config.services[request_type]?.max_image_width || 400,
                        simplifyTables: this.minisrv_config.services[request_type]?.simplify_tables !== false,
                        maxWidth: this.minisrv_config.services[request_type]?.max_width || 544,
                        preserveJellyScript: this.minisrv_config.services[request_type]?.preserve_jellyscript !== false,
                        jellyScriptMaxSize: this.minisrv_config.services[request_type]?.jellyscript_max_size || 8192
                    };
                    
                    htmlContent = proxy.transformForWebTV(htmlContent, originalUrl, transformOptions);
                    data = [Buffer.from(htmlContent)];
                    
                    if (this.minisrv_config.config.verbosity >= 3) {
                        console.log(` * HTML transformed for WebTV compatibility (${originalUrl})`);
                    }
                } catch (err) {
                    console.warn(` * HTML transformation failed: ${err.message}`);
                }
            }

            if (request_type !== "http" && request_type !== "https") {
                // replace http and https links on non http/https protocol (for proto:// for example)
                const data_t = Buffer.concat(data).toString().replaceAll("http://", request_type + "://").replaceAll("https://", request_type + "://");
                data = [Buffer.from(data_t)]
            }
        }

        // if Connection: close header, set our internal variable to close the socket
        if (headers['Connection']) {
            if (headers['Connection'].toLowerCase().includes('close')) {
                headers["wtv-connection-close"] = true;
            }
        }

        // if a wtv-explaination is defined for an error code (except 200), define the header here to
        // show the 'Explain' button on the client error ShowAlert
        if (this.minisrv_config.services[request_type]['wtv-explanation']) {
            if (this.minisrv_config.services[request_type]['wtv-explanation'][res.statusCode]) {
                headers['wtv-explanation-url'] = this.minisrv_config.services[request_type]['wtv-explanation'][res.statusCode];
            }
        } else if (this.minisrv_config.services['http']['wtv-explanation']) {
            if (this.minisrv_config.services['http']['wtv-explanation'][res.statusCode]) {
                headers['wtv-explanation-url'] = this.minisrv_config.services['http']['wtv-explanation'][res.statusCode];
            }            
        }
        let data_hex = Buffer.concat(data).toString('hex');
        if (data_hex.startsWith("0d0a0d0a")) data_hex = data_hex.slice(8);
        if (data_hex.startsWith("0a0d0a")) data_hex = data_hex.slice(6);
        if (data_hex.startsWith("0a0a")) data_hex = data_hex.slice(4);
        this.sendToClient(socket, headers, Buffer.from(data_hex, 'hex'));
    }

}

module.exports = WTVHTTP;