'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const http = require('http');
const https = require('https');
const strftime = require('strftime'); // used externally by service scripts
const net = require('net');
const CryptoJS = require('crypto-js');
const { crc16 } = require('easy-crc');
const process = require('process');
const WTVSec = require('./WTVSec.js');
const WTVLzpf = require('./WTVLzpf.js');
const WTVClientCapabilities = require('./WTVClientCapabilities.js');
const WTVClientSessionData = require('./WTVClientSessionData.js');
const WTVMime = require("./WTVMime.js");
const { WTVShared, clientShowAlert } = require("./WTVShared.js");

process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'))
    .on('uncaughtException', shutdown('uncaughtException'));


function shutdown(signal) {
    return (err) => {
        console.log("Received signal", signal);
        if (err) console.error(err.stack || err);
        process.exit(err ? 1 : 0);
    };
}

// Where we store our session information
var ssid_sessions = new Array();
var socket_sessions = new Array();

var ports = [];

// add .reverse() feature to all JavaScript Strings in this application
// works for service vault scripts too.
if (!String.prototype.reverse) {
    String.prototype.reverse = function () {
        var splitString = this.split("");
        var reverseArray = splitString.reverse();
        var joinArray = reverseArray.join("");
        return joinArray;
    }
}

// add .getCaseInsensitiveKey() to all JavaScript Objects in this application {
// works for service vault scripts too.

if (!Object.prototype.getCaseInsensitiveKey) {
    Object.prototype.getCaseInsensitiveKey = function (object_name, key_name) {
        var foundKey = Object.keys(object_name).find(key => key.toLowerCase() === key_name.toLowerCase()) || null;
        if (foundKey) {
            // found a key
            return object_name[foundKey];
        } else return null;
    }
}

function getServiceString(service, overrides = {}) {
    // used externally by service scripts
    if (service === "all") {
        var out = "";
        Object.keys(minisrv_config.services).forEach(function (k) {
            if (overrides.exceptions) {
                Object.keys(overrides.exceptions).forEach(function (j) {
                    if (k != overrides.exceptions[j]) out += minisrv_config.services[k].toString(overrides) + "\n";
                });
            } else {
                out += minisrv_config.services[k].toString(overrides) + "\n";
            }
        });
        return out;
    } else {
        if (!minisrv_config.services[service]) {
            throw ("SERVICE ERROR: Attempted to provision unconfigured service: " + service)
        } else {
            return minisrv_config.services[service].toString(overrides);
        }
    }
}

// passthrough for old scripts
function doErrorPage(code, data = null, pc_mode = false) {
    return wtvshared.doErrorPage(code, data, pc_mode);
}

async function sendRawFile(socket, path) {
    if (!minisrv_config.config.debug_flags.quiet) console.log(" * Found " + path + " to handle request (Direct File Mode) [Socket " + socket.id + "]");
    var contypes = wtvmime.getContentType(path);
    var headers = "200 OK\n"
    headers += "Content-Type: " + contypes[0] + "\n";
    headers += "wtv-modern-content-type" + contypes[1];
    fs.readFile(path, null, function (err, data) {
        sendToClient(socket, headers, data);
    });
}

async function processPath(socket, service_vault_file_path, request_headers = new Array(), service_name, shared_romcache = null) {
    var headers, data = null;
    var request_is_async = false;
    var service_vault_found = false;
    var service_path = unescape(service_vault_file_path);
    var usingSharedROMCache = false;
    try {
        service_vaults.forEach(function (service_vault_dir) {
            if (service_vault_found) return;
            if (!usingSharedROMCache) {
                if (minisrv_config.config.SharedROMCache && shared_romcache) {
                    if (shared_romcache.indexOf(minisrv_config.config.SharedROMCache) != -1) {
                        var service_path_presplit = shared_romcache.split(path.sep);
                        service_path_presplit.splice(service_path_presplit.findIndex((element) => element === 'ROMCache'), 1);
                        var service_path_romcache = service_path_presplit.join(path.sep);
                        var service_vault_file_path_romcache = wtvshared.returnAbsolutePath(wtvshared.makeSafePath(service_path_romcache));
                        if (fs.existsSync(service_vault_file_path_romcache)) {

                            service_path = service_path.replace(wtvshared.fixPathSlashes(minisrv_config.config.SharedROMCache), 'ROMCache');
                            service_vault_file_path = service_vault_file_path_romcache;
                            usingSharedROMCache = true;
                        } else {
                            service_vault_file_path = wtvshared.makeSafePath(service_vault_dir, service_path);
                        }
                    } else {
                        service_vault_file_path = wtvshared.makeSafePath(service_vault_dir, service_path);
                    }
                } else {
                    service_vault_file_path = wtvshared.makeSafePath(service_vault_dir, service_path);
                }
                // deny access to catchall file name directly
                var service_path_split = service_path.split("/");
                var service_path_request_file = service_path_split[service_path_split.length - 1];
                if (minisrv_config.config.catchall_file_name) {
                    var minisrv_catchall = null;
                    if (minisrv_config.services[service_name]) minisrv_catchall = minisrv_config.services[service_name].catchall_file_name || minisrv_config.config.catchall_file_name || null;
                    else minisrv_catchall = minisrv_config.config.catchall_file_name || null;
                    if (minisrv_catchall) {
                        if (service_path_request_file == minisrv_catchall) {
                            request_is_async = true;
                            var errpage = wtvshared.doErrorPage(401, "Access Denied");
                            sendToClient(socket, errpage[0], errpage[1]);
                            return;
                        }
                    }
                }
                var is_dir = false;
                var file_exists = false;
                minisrv_catchall, service_path_split, service_path_request_file = null;
                if (fs.existsSync(service_vault_file_path)) {
                    file_exists = true;
                    is_dir = fs.lstatSync(service_vault_file_path).isDirectory()
                }

                if (file_exists && !is_dir) {
                    // file exists, read it and return it 
                    service_vault_found = true;
                    request_is_async = true;
                    request_headers.service_file_path = service_vault_file_path;
                    request_headers.raw_file = true;

                    // service parsed files, we might not want to expose our service source files so we can protect them with a flag on the first line
                    if (wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "js" || wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "txt") {
                        if (wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "js") {
                            wtvshared.getLineFromFile(service_vault_file_path, 0, function (status, line) {
                                if (!status) {
                                    if (line.match(/minisrv\_service\_file.*true/i)) {
                                        var errpage = wtvshared.doErrorPage(403, "Access Denied");
                                        sendToClient(socket, errpage[0], errpage[1]);
                                    } else {
                                        sendRawFile(socket, service_vault_file_path);
                                    }
                                } else {
                                    var errpage = wtvshared.doErrorPage(400);
                                    sendToClient(socket, errpage[0], errpage[1]);
                                }
                            });
                        }

                        if (wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "txt") {
                            wtvshared.getLineFromFile(service_vault_file_path, 0, function (status, line) {
                                if (!status) {
                                    if (line.match(/^#!minisrv/i)) {
                                        var errpage = wtvshared.doErrorPage(403, "Access Denied");
                                        sendToClient(socket, errpage[0], errpage[1]);
                                    } else {
                                        sendRawFile(socket, service_vault_file_path);
                                    }
                                } else {
                                    var errpage = wtvshared.doErrorPage(400);
                                    sendToClient(socket, errpage[0], errpage[1]);
                                }
                            });
                        }
                    } else {
                        // not a potential service file, so save to send
                        sendRawFile(socket, service_vault_file_path);
                    }

                } else if (fs.existsSync(service_vault_file_path + ".txt")) {
                    // raw text format, entire payload expected (headers and content)
                    service_vault_found = true;
                    request_is_async = true;
                    if (!minisrv_config.config.debug_flags.quiet) console.log(" * Found " + service_vault_file_path + ".txt to handle request (Raw TXT Mode) [Socket " + socket.id + "]");
                    request_headers.service_file_path = service_vault_file_path + ".txt";
                    fs.readFile(service_vault_file_path + ".txt", 'Utf-8', function (err, file_raw) {
                        if (file_raw.indexOf("\n\n") > 0) {
                            // split headers and data by newline (unix format)
                            var file_raw_split = file_raw.split("\n\n");
                            headers = file_raw_split[0];
                            file_raw_split.shift();
                            data = file_raw_split.join("\n");
                        } else if (file_raw.indexOf("\r\n\r\n") > 0) {
                            // split headers and data by carrage return + newline (windows format)
                            var file_raw_split = file_raw.split("\r\n\r\n");
                            headers = file_raw_split[0].replace(/\r/g, "");
                            file_raw_split.shift();
                            data = file_raw_split.join("\r\n");
                        } else {
                            // couldn't find two line breaks, assume entire file is just headers
                            headers = file_raw;
                            data = '';
                        }
                        sendToClient(socket, headers, data);
                    });
                } else if (fs.existsSync(service_vault_file_path + ".js")) {
                    // synchronous js scripting, process with vars, must set 'headers' and 'data' appropriately.
                    // loaded script will have r/w access to any JavaScript vars this function does.
                    // request headers are in an array named `request_headers`. 
                    // Query arguments in `request_headers.query`
                    // Can upgrade to asynchronous by setting `request_is_async` to `true`
                    // In Asynchronous mode, you are expected to call sendToClient(socket,headers,data) by the end of your script
                    // `socket` is already defined and should be passed-through.
                    service_vault_found = true;
                    if (!minisrv_config.config.debug_flags.quiet) console.log(" * Found " + service_vault_file_path + ".js to handle request (JS Interpreter mode) [Socket " + socket.id + "]");
                    request_headers.service_file_path = service_vault_file_path + ".js";
                    // expose var service_dir for script path to the root of the wtv-service
                    var service_dir = service_vault_dir + path.sep + service_name;
                    socket_sessions[socket.id].starttime = Math.floor(new Date().getTime() / 1000);
                    var jscript_eval = fs.readFileSync(service_vault_file_path + ".js").toString();
                    eval(jscript_eval);
                    if (request_is_async && !minisrv_config.config.debug_flags.quiet) console.log(" * Script requested Asynchronous mode");
                }
                else if (fs.existsSync(service_vault_file_path + ".html")) {
                    // Standard HTML with no headers, WTV Style
                    service_vault_found = true;
                    if (!minisrv_config.config.debug_flags.quiet) console.log(" * Found " + service_vault_file_path + ".html to handle request (HTML Mode) [Socket " + socket.id + "]");
                    request_headers.service_file_path = service_vault_file_path + ".html";
                    request_is_async = true;
                    headers = "200 OK\n"
                    headers += "Content-Type: text/html"
                    fs.readFile(service_vault_file_path + ".html", null, function (err, data) {
                        sendToClient(socket, headers, data);
                    });
                } else {
                    // look for a catchallin the current path and all parent paths up until the service root
                    if (minisrv_config.config.catchall_file_name) {
                        var minisrv_catchall_file_name = null;
                        if (minisrv_config.services[service_name]) minisrv_catchall_file_name = minisrv_config.services[service_name].catchall_file_name || minisrv_config.config.catchall_file_name || null;
                        else minisrv_catchall_file_name = minisrv_config.config.catchall_file_name || null;
                        if (minisrv_catchall_file_name) {
                            var service_check_dir = service_vault_file_path.split(path.sep);
                            service_check_dir.pop(); // pop filename

                            while (service_check_dir.join(path.sep) != service_vault_dir && service_check_dir.length > 0) {
                                var catchall_file = service_check_dir.join(path.sep) + path.sep + minisrv_catchall_file_name;
                                if (fs.existsSync(catchall_file)) {
                                    service_vault_found = true;
                                    if (!minisrv_config.config.debug_flags.quiet) console.log(" * Found catchall at " + catchall_file + " to handle request (JS Interpreter Mode) [Socket " + socket.id + "]");
                                    request_headers.service_file_path = catchall_file;
                                    var jscript_eval = fs.readFileSync(catchall_file).toString();
                                    // don't pass these vars to the script
                                    var service_check_dir, minisrv_catchall_file_name = null;
                                    eval(jscript_eval);
                                    if (request_is_async && !minisrv_config.config.debug_flags.quiet) console.log(" * Script requested Asynchronous mode");
                                } else {
                                    service_check_dir.pop();
                                }
                            }
                        }
                    }
                }
            }
            // either `request_is_async`, or `headers` and `data` MUST be defined by this point!
        });
    } catch (e) {
        var errpage = wtvshared.doErrorPage(400);
        headers = errpage[0];
        data = errpage[1] + "<br><br>The interpreter said:<br><pre>" + e.toString() + "</pre>";
        console.error(" * Scripting error:", e);
    }
    if (!request_is_async) {
        if (!service_vault_found) {
            console.error(" * Could not find a Service Vault for " + service_name + ":/" + service_path.replace(service_name + path.sep, "").replace(path.sep, '/'));
            var errpage = wtvshared.doErrorPage(404, null, socket.minisrv_pc_mode);
            headers = errpage[0];
            data = errpage[1];
        }
        if (headers == null && !request_is_async) {
            var errpage = wtvshared.doErrorPage(400, null, socket.minisrv_pc_mode);
            headers = errpage[0];
            data = errpage[1];
            console.error(" * Scripting or Data error: Headers were not defined. (headers,data) as follows:")
            console.error(socket.id, headers, data)
        }
        if (data === null) {
            data = '';
        }
        sendToClient(socket, headers, data);
    }
}

async function processURL(socket, request_headers) {
    var shortURL, headers, data = "";
    request_headers.query = new Array();
    if (request_headers.request_url) {
        if (request_headers.request_url.indexOf('?') >= 0) {
            shortURL = request_headers.request_url.split('?')[0];
            var qraw = request_headers.request_url.split('?')[1];
            if (qraw.length > 0) {
                qraw = qraw.split("&");
                for (let i = 0; i < qraw.length; i++) {
                    var qraw_split = qraw[i].split("=");
                    if (qraw_split.length == 2) {
                        var k = qraw_split[0];
                        request_headers.query[k] = unescape(qraw[i].split("=")[1].replace(/\+/g, "%20"));
                    }
                }
            }
        } else {
            shortURL = unescape(request_headers.request_url);
        }

        if (request_headers['wtv-request-type']) socket_sessions[socket.id].wtv_request_type = request_headers['wtv-request-type'];

        if (request_headers.post_data) {
            var post_data_string = null;
            try {
                post_data_string = request_headers.post_data.toString(CryptoJS.enc.Utf8); // if not text this will probably throw an exception
                if (post_data_string) {
                    if (post_data_string.indexOf('=')) {
                        if (post_data_string.indexOf('&')) {
                            var qraw = post_data_string.split('&');
                            if (qraw.length > 0) {
                                for (let i = 0; i < qraw.length; i++) {
                                    var qraw_split = qraw[i].split("=");
                                    if (qraw_split.length == 2) {
                                        var k = qraw_split[0];
                                        var data = unescape(qraw[i].split("=")[1].replace(/\+/g, "%20"));
                                        if (wtvshared.isASCII(data)) request_headers.query[k] = data;
                                        else request_headers.query[k] = wtvshared.urlDecodeBytes(qraw[i].split("=")[1].replace(/\+/g, "%20"));
                                    }
                                }
                            }
                        } else {
                            var qraw_split = post_data_string.split("=");
                            if (qraw_split.length == 2) {
                                var k = qraw_split[0];
                                var data = unescape(qraw_split[1].replace(/\+/g, "%20"));
                                if (wtvshared.isASCII(data)) request_headers.query[k] = data;
                                else request_headers.query[k] = wtvshared.urlDecodeBytes(qraw_split[1].replace(/\+/g, "%20"));
                            }
                        }
                    }
                }
            } catch (e) {
               console.log("error:",e)
            }
        }

        if ((shortURL.indexOf("http") != 0 && shortURL.indexOf("ftp") != 0 && shortURL.indexOf(":") > 0 && shortURL.indexOf(":/") == -1)) {
            // Apparently it is within WTVP spec to accept urls without a slash (eg wtv-home:home)
            // Here, we just reassemble the request URL as if it was a proper URL (eg wtv-home:/home)
            // we will allow this on any service except http(s) and ftp
            var shortURL_split = shortURL.split(':');
            var shortURL_service_name = shortURL_split[0];
            shortURL_split.shift();
            var shortURL_service_path = shortURL_split.join(":");
            shortURL = shortURL_service_name + ":/" + shortURL_service_path;
        } else if (shortURL.indexOf(":") == -1 && request_headers.request.indexOf("HTTP/1") > 0 && socket.ssid == null) {
            if (request_headers.Host) {
                if (minisrv_config.config.pc_server_hidden_service_enabled) {
                    // browsers typically send a Host header
                    service_name = minisrv_config.config.pc_server_hidden_service;
                    socket.minisrv_pc_mode = true;
                    shortURL = service_name + ":" + shortURL;

                    // if a directory, request index
                    if (shortURL.substring(shortURL.length - 1) == "/") shortURL += "index";
                } else {
                    // minimal pc mode to send error
                    socket.minisrv_pc_mode = true;
                    var errpage = wtvshared.doErrorPage(401, "PC services are disabled on this server", socket.minisrv_pc_mode);
                    headers = errpage[0];
                    data = errpage[1]
                    socket_sessions[socket.id].close_me = true;
                    sendToClient(socket, headers, data);
                    return;
                }
            }
        }
        // check security
        if (!ssid_sessions[socket.ssid].isAuthorized(shortURL)) {
            // lockdown mode and URL not authorized
            headers = "300 Unauthorized\n";
            headers += "Location: " + minisrv_config.config.unauthorized_url + "\n";
            data = "";
            sendToClient(socket, headers, data);
            console.log(" * Lockdown rejected request for " + shortURL + " on socket ID", socket.id);
            return;
        }

        if (ssid_sessions[socket.ssid].get("wtv-my-disk-sucks-sucks-sucks")) {
            if (!ssid_sessions[socket.ssid].baddisk) {
                // psuedo lockdown, will unlock on the disk warning page, but prevents minisrv access until they read the error
                ssid_sessions[socket.ssid].lockdown = true;
                ssid_sessions[socket.ssid].baddisk = true;
            }
        }

        if (!ssid_sessions[socket.ssid].isUserLoggedIn() && !ssid_sessions[socket.ssid].isAuthorized(shortURL, 'login')) {
            // lockdown mode and URL not authorized
            headers = `300 Unauthorized
Location: " + minisrv_config.config.unauthorized_url`;
            data = "";
            sendToClient(socket, headers, data);
            console.log(" * Rejected login bypass request for " + shortURL + " on socket ID", socket.id);
            return;
        }

        // Check URL for :/, but not :// (to differentiate wtv urls)
        if (shortURL.indexOf(':/') >= 0 && shortURL.indexOf('://') == -1) {
            var ssid = socket.ssid;
            if (ssid == null) {
                // prevent possible injection attacks via malformed SSID and filesystem SessionStore
                ssid = wtvshared.makeSafeSSID(request_headers["wtv-client-serial-number"]);
                if (ssid == "") ssid = null;
            }

            var reqverb = "Request";
            if (request_headers.encrypted || request_headers.secure) reqverb = "Encrypted " + reqverb;
            if (ssid != null) {
                console.log(" * " + reqverb + " for " + request_headers.request_url + " from WebTV SSID " + (await wtvshared.filterSSID(ssid)), 'on', socket.id);
            } else {
                console.log(" * " + reqverb + " for " + request_headers.request_url, 'on', socket.id);
            }
            // assume webtv since there is a :/ in the GET
            var service_name = shortURL.split(':/')[0];
            var urlToPath = wtvshared.fixPathSlashes(service_name + path.sep + shortURL.split(':/')[1]);
            var shared_romcache = null;
            if (shortURL.indexOf(":/ROMCache/") != -1 && minisrv_config.config.enable_shared_romcache) {
                shared_romcache = wtvshared.fixPathSlashes(minisrv_config.config.SharedROMCache + path.sep + shortURL.split(':/')[1]);
            }
            if (minisrv_config.config.debug_flags.show_headers) console.log(" * Incoming headers on socket ID", socket.id, (await wtvshared.decodePostData(wtvshared.filterSSID(Object.assign({}, request_headers)))));
            socket_sessions[socket.id].request_headers = request_headers;
            processPath(socket, urlToPath, request_headers, service_name, shared_romcache);
        } else if (shortURL.indexOf('http://') >= 0 || shortURL.indexOf('https://') >= 0) {
            doHTTPProxy(socket, request_headers);
        } else {
            // error reading headers (no request_url provided)
            var errpage = wtvshared.doErrorPage(400);
            headers = errpage[0];
            data = errpage[1]
            socket_sessions[socket.id].close_me = true;
            sendToClient(socket, headers, data);
        }
    }
}

async function doHTTPProxy(socket, request_headers) {
    var request_type = (request_headers.request_url.substring(0, 5) == "https") ? "https" : "http";
    if (minisrv_config.config.debug_flags.show_headers) console.log(request_type.toUpperCase() + " Proxy: Client Request Headers on socket ID", socket.id, (await wtvshared.decodePostData(wtvshared.filterSSID(Object.assign({}, request_headers)))));
    switch (request_type) {
        case "https":
            var proxy_agent = https;
            break;
        case "http":
            var proxy_agent = http;
            break;
    }

    var request_data = new Array();
    request_data.method = request_headers.request.split(' ')[0];
    var request_url_split = request_headers.request.split(' ')[1].split('/');
    request_data.host = request_url_split[2];
    if (request_data.host.indexOf(':') > 0) {
        request_data.port = request_data.host.split(':')[1];
        request_data.host = request_data.host.split(':')[0];
    } else {
        if (request_type === "https") request_data.port = 443;
        else request_data.port = 80;
    }
    for (var i = 0; i < 3; i++) request_url_split.shift();
    request_data.path = "/" + request_url_split.join('/');

    if (request_data.method && request_data.host && request_data.path) {

        var options = {
            host: request_data.host,
            port: request_data.port,
            path: request_data.path,
            method: request_data.method,
            headers: {
                "User-Agent": request_headers["User-Agent"] || "WebTV"
            }
        }

        // RFC7239
        if (socket.remoteAddress != "127.0.0.1") {
            options.headers["X-Forwarded-For"] = socket.remoteAddress;
        }

        if (request_headers.post_data) {
            if (request_headers["Content-type"]) options.headers["Content-type"] = request_headers["Content-type"];
            if (request_headers["Content-length"]) options.headers["Content-length"] = request_headers["Content-length"];
        }

        if (minisrv_config.services[request_type].use_external_proxy && minisrv_config.services[request_type].external_proxy_port) {
            // configure connection to an external proxy
            if (minisrv_config.services[request_type].external_proxy_is_socks) {
                // configure connection to remote socks proxy
                var ProxyAgent = require('proxy-agent');
                options.agent = new ProxyAgent("socks://" + (minisrv_config.services[request_type].external_proxy_host || "127.0.0.1") + ":" + minisrv_config.services[request_type].external_proxy_port);
            } else {
                // configure connection to remote http proxy
                var proxy_agent = http;
                options.host = minisrv_config.services[request_type].external_proxy_host;
                options.port = minisrv_config.services[request_type].external_proxy_port;
                options.path = request_headers.request.split(' ')[1];
                options.headers.Host = request_data.host + ":" + request_data.port;
            }
        }
        const req = proxy_agent.request(options, function (res) {
            var data = [];

            res.on('data', d => {
                data.push(d);
            })

            res.on('error', function (err) {
                console.log(" * Unhandled Proxy Request Error:", err);
            });

            res.on('end', function () {
                var data_hex = Buffer.concat(data).toString('hex');

                console.log(` * Proxy Request ${request_type.toUpperCase()} ${res.statusCode} for ${request_headers.request}`)
                // an http response error is not a request error, and will come here under the 'end' event rather than an 'error' event.
                switch (res.statusCode) {
                    case 404:
                        res.headers.http_response = res.statusCode + " The publisher can&#146;t find the page requested.";
                        break;

                    case 401:
                    case 403:
                        res.headers.http_response = res.statusCode + " The publisher of that page has not authorized you to use it.";
                        break;

                    case 500:
                        res.headers.http_response = res.statusCode + " The publisher of that page can&#146;t be reached.";
                        break;

                    default:
                        res.headers.http_response = res.statusCode + " " + res.statusMessage;
                        break;
                }

                // header pass-through whitelist, case insensitive comparsion to server, however, you should
                // specify the header case as you intend for the client
                var headers = stripHeaders(res.headers, [
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

                // if Connection: close header, set our internal variable to close the socket
                if (headers['Connection']) {
                    if (headers['Connection'].toLowerCase().indexOf('close') !== -1) {
                        headers["wtv-connection-close"] = true;
                    }
                }

                // if a wtv-explaination is defined for an error code (except 200), define the header here to
                // show the 'Explain' button on the client error ShowAlert
                if (minisrv_config.services['http']['wtv-explanation']) {
                    if (minisrv_config.services['http']['wtv-explanation'][res.statusCode]) {
                        headers['wtv-explanation-url'] = minisrv_config.services['http']['wtv-explanation'][res.statusCode];
                    }
                }

                if (data_hex.substring(0, 8) == "0d0a0d0a") data_hex = data_hex.substring(8);
                if (data_hex.substring(0, 4) == "0a0a") data_hex = data_hex.substring(4);
                sendToClient(socket, headers, Buffer.from(data_hex, 'hex'));
            });
        }).on('error', function (err) {
            // severe errors, such as unable to connect.
            var errpage, headers, data = null;
            if (err.code == "ENOTFOUND" || err.message.indexOf("HostUnreachable") > 0) {
                errpage = wtvshared.doErrorPage(400, `The publisher <b>${request_data.host}</b> is unknown.`);
            }
            else {
                console.log(" * Unhandled Proxy Request Error:", err);
                errpage = wtvshared.doErrorPage(400);
            }
            headers = errpage[0];
            data = errpage[1];
            sendToClient(socket, headers, data);
        });;
        if (request_headers.post_data) {
            req.write(Buffer.from(request_headers.post_data.toString(CryptoJS.enc.Hex), 'hex'), function () {
                req.end();
            });
        } else {
            req.end();
        }
    }
}

function stripHeaders(headers_obj, whitelist) {
    var whitelisted_headers = new Array();
    var out_headers = new Array();
    out_headers.http_response = headers_obj.http_response;
    out_headers['wtv-connection-close'] = headers_obj['wtv-connection-close'];

    // compare regardless of case
    Object.keys(whitelist).forEach(function (k) {
        Object.keys(headers_obj).forEach(function (j) {
            if (whitelist[k].toLowerCase() == j.toLowerCase()) {
                // if header = connection, strip 'upgrade'
                if (j.toLowerCase() == "connection") {
                    headers_obj[j] = headers_obj[j].replace("Upgrade", "").replace(",", "").trim();
                }
                whitelisted_headers[j.toLowerCase()] = [whitelist[k], j, headers_obj[j]];
            }
        });
    });

    // restore original header order
    Object.keys(headers_obj).forEach(function (k) {
        if (whitelisted_headers[k.toLowerCase()]) {
            if (whitelisted_headers[k.toLowerCase()][1] == k) out_headers[whitelisted_headers[k.toLowerCase()][0]] = whitelisted_headers[k.toLowerCase()][2];
        }
    });

    // return
    return out_headers;
}

function headerStringToObj(headers, response = false) {
    var inc_headers = 0;
    var headers_obj = new Array();
    var headers_obj_pre = headers.split("\n");
    headers_obj_pre.forEach(function (d) {
        if (/^SECURE ON/.test(d) && !response) {
            headers_obj.secure = true;
        } else if (/^([0-9]{3}) $/.test(d.substring(0, 4)) && response) {
            headers_obj.http_response = d.replace("\r", "");
        } else if (/^(GET |PUT |POST)$/.test(d.substring(0, 4)) && !response) {
            headers_obj.request = d.replace("\r", "");
            var request_url = d.split(' ');
            if (request_url.length > 2) {
                request_url.shift();
                request_url = request_url.join(" ");
                if (request_url.indexOf("HTTP/") > 0) {
                    var index = request_url.indexOf(" HTTP/");
                    request_url = request_url.substring(0, index);
                }
            } else {
                request_url = request_url[1];
            }
            headers_obj.request_url = decodeURI(request_url).replace("\r", "");
        } else if (d.indexOf(":") > 0) {
            var d_split = d.split(':');
            var header_name = d_split[0];
            if (headers_obj[header_name] != null) {
                header_name = header_name + "_" + inc_headers;
                inc_headers++;
            }
            d_split.shift();
            d = d_split.join(':');
            headers_obj[header_name] = (d).replace("\r", "");
            if (headers_obj[header_name].substring(0, 1) == " ") {
                headers_obj[header_name] = headers_obj[header_name].substring(1);
            }
        }
    });
    return headers_obj;
}

async function sendToClient(socket, headers_obj, data) {
    var headers = "";
    var content_length = 0;
    if (typeof (data) === 'undefined') data = '';
    if (typeof (headers_obj) === 'string') {
        // string to header object
        headers_obj = headerStringToObj(headers_obj, true);
    }
    if (!socket_sessions[socket.id]) {
        socket.destroy();
        return;
    }
    var wtv_connection_close = (headers_obj["wtv-connection-close"]) ? true : false;
    if (typeof (headers_obj["wtv-connection-close"]) != 'undefined') delete headers_obj["wtv-connection-close"];

    if (!headers_obj['minisrv-no-mail-count']) {
        if (ssid_sessions[socket.ssid]) {
            if (ssid_sessions[socket.ssid].mailstore) {
                headers_obj['wtv-mail-count'] = ssid_sessions[socket.ssid].mailstore.countUnreadMessages(0);
            }
        }
    } else {
        if (headers_obj['wtv-mail-count']) delete headers_obj['wtv-mail-count'];
        delete headers_obj['minisrv-no-mail-count'];
    }

    // add Connection header if missing, default to Keep-Alive
    if (!headers_obj.Connection) {
        headers_obj.Connection = "Keep-Alive";
        headers_obj = moveObjectElement('Connection', 'http_response', headers_obj);
    }

    var content_length = 0;
    if (typeof data.length !== 'undefined') {
        content_length = data.length;
    } else if (typeof data.byteLength !== 'undefined') {
        content_length = data.byteLength;
    }

    // fix captialization
    if (headers_obj["Content-type"]) {
        headers_obj["Content-Type"] = headers_obj["Content-type"];
        delete headers_obj["Content-type"];
    }

    // Add last modified if not a dynamic script
    if (socket_sessions[socket.id]) {
        if (socket_sessions[socket.id].request_headers) {
            if (socket_sessions[socket.id].request_headers.service_file_path) {
                if (wtvshared.getFileExt(socket_sessions[socket.id].request_headers.service_file_path).toLowerCase() !== "js" || socket_sessions[socket.id].request_headers.raw_file === true) {
                    var last_modified = wtvshared.getFileLastModifiedUTCString(socket_sessions[socket.id].request_headers.service_file_path);
                    if (last_modified) headers_obj["Last-Modified"] = last_modified;
                }
            }
        }
    }


    // if box can do compression, see if its worth enabling
    // small files actually get larger, so don't compress them
    var compression_type = 0;
    if (content_length >= 256) compression_type = wtvmime.shouldWeCompress(ssid_sessions[socket.ssid], headers_obj);
    if (socket_sessions[socket.id].request_headers) {
        if (socket_sessions[socket.id].request_headers.query) {
            if (socket_sessions[socket.id].wtv_request_type == "download") {
                if (socket_sessions[socket.id].request_headers.query.dont_compress) {
                    compression_type = 0;
                }
            }
        }
    }

    // compress if needed
    if (compression_type > 0 && content_length > 0 && headers_obj['http_response'].substring(0, 3) == "200") {
        var uncompressed_content_length = content_length;
        switch (compression_type) {
            case 1:
                // wtv-lzpf implementation
                headers_obj["wtv-lzpf"] = 0;
                var wtvcomp = new WTVLzpf();
                data = wtvcomp.Compress(data);
                wtvcomp = null; // Makes the garbage gods happy so it cleans up our mess
                break;

            case 2:
                // zlib DEFLATE implementation
                var zlib_options = { 'level': 9 };
                if (uncompressed_content_length > 4194304) zlib_options.strategy = 2;
                headers_obj['Content-Encoding'] = 'deflate';
                data = zlib.deflateSync(data, zlib_options);
                break;
        }

        var compressed_content_length = 0;
        if (content_length == 0 || compression_type != 1) {
            // ultimately send compressed content length
            compressed_content_length = data.byteLength;
            content_length = compressed_content_length;
        } else {
            // ultimately send original content length if lzpf
            compressed_content_length = data.byteLength;
        }
        var compression_ratio = (uncompressed_content_length / compressed_content_length).toFixed(2);
        var compression_percentage = ((1 - (compressed_content_length / uncompressed_content_length)) * 100).toFixed(1);
        if (uncompressed_content_length != compressed_content_length) if (minisrv_config.config.debug_flags.debug) console.log(" # Compression stats: Orig Size:", uncompressed_content_length, "~ Comp Size:", compressed_content_length, "~ Ratio:", compression_ratio, "~ Saved:", compression_percentage.toString() + "%");
    }

    // encrypt if needed
    if (socket_sessions[socket.id].secure == true && !socket_sessions[socket.id].do_not_encrypt) {
        headers_obj["wtv-encrypted"] = 'true';
        headers_obj = moveObjectElement('wtv-encrypted', 'Connection', headers_obj);
        if (content_length > 0 && socket_sessions[socket.id].wtvsec) {
            if (!minisrv_config.config.debug_flags.quiet) console.log(" * Encrypting response to client ...")
            var enc_data = socket_sessions[socket.id].wtvsec.Encrypt(1, data);
            data = enc_data;
        }
    }

    if (socket_sessions[socket.id].do_not_encrypt) {
        if (headers_obj["wtv-encrypted"]) delete headers_obj["wtv-encrypted"];
        if (headers_obj["secure"]) delete headers_obj["secure"];
    }


    // calculate content length
    // make sure we are using our Content-length and not one set in a script.
    if (headers_obj["Content-Length"]) delete headers_obj["Content-Length"];
    if (headers_obj["Content-length"]) delete headers_obj["Content-length"];

    headers_obj["Content-length"] = content_length;

    // Send wtv-ticket if it has been flagged as updated
    if (ssid_sessions[socket.ssid]) {
        if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
            if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64) {
                if (ssid_sessions[socket.ssid].data_store.wtvsec_login.update_ticket) {
                    headers_obj["wtv-ticket"] = ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64;
                    headers_obj = moveObjectElement("wtv-ticket", "Connection", headers_obj);
                    ssid_sessions[socket.ssid].data_store.wtvsec_login.update_ticket = false;
                }
            }
        }
    }

    var end_of_line = "\n";
    if (socket.minisrv_pc_mode) {
        end_of_line = "\r\n";
        headers_obj['http_response'] = "HTTP/1.0 " + headers_obj['http_response'];
    }

    /*    // wtv-request-type download wants minimal headers?
        if (data.byteLength > 0) {
            if (socket_sessions[socket.id].wtv_request_type == "download") {
                if (headers_obj['Content-Type'] != "wtv/download-list") {
                    // minimalize headers
                    var new_headers = { "http_response": headers_obj['http_response'].split(" ")[0] + " " }
                    if (headers_obj['wtv-encrypted']) new_headers['wtv-encrypted'] = headers_obj['wtv-encrypted'];
                    new_headers["content-type"] = headers_obj['Content-Type'];
                    new_headers["content-length"] = headers_obj['Content-length'];
                    
                    headers_obj = new_headers;
                }
            }
        }    
    */
    // header object to string
    if (minisrv_config.config.debug_flags.show_headers) console.log(" * Outgoing headers on socket ID", socket.id, (await wtvshared.filterSSID(headers_obj)));
    Object.keys(headers_obj).forEach(function (k) {
        if (k == "http_response") {
            headers += headers_obj[k] + end_of_line;
        } else {
            if (k.indexOf('_') >= 0) {
                var j = k.split('_')[0];
                headers += j + ": " + headers_obj[k] + end_of_line;
            } else {
                headers += k + ": " + headers_obj[k] + end_of_line;
            }
        }
    });

    if (headers_obj["Connection"]) {
        if (headers_obj["Connection"].toLowerCase() == "close" && wtv_connection_close) {
            socket_sessions[socket.id].destroy_me = true;
        }
    }

    // send to client
    var toClient = null;
    if (typeof data == 'string') {
        toClient = headers + end_of_line + data;
        sendToSocket(socket, Buffer.from(toClient));
    } else if (typeof data == 'object') {
        if (minisrv_config.config.debug_flags.quiet) var verbosity_mod = (headers_obj["wtv-encrypted"] == 'true') ? " encrypted response" : "";
        if (socket_sessions[socket.id].secure_headers == true) {
            // encrypt headers
            if (minisrv_config.config.debug_flags.quiet) verbosity_mod += " with encrypted headers";
            var enc_headers = socket_sessions[socket.id].wtvsec.Encrypt(1, headers + end_of_line);
            sendToSocket(socket, new Buffer.from(concatArrayBuffer(enc_headers, data)));
        } else {
            sendToSocket(socket, new Buffer.from(concatArrayBuffer(Buffer.from(headers + end_of_line), data)));
        }
        if (minisrv_config.config.debug_flags.quiet) console.log(" * Sent" + verbosity_mod + " " + headers_obj.http_response + " to client (Content-Type:", headers_obj['Content-Type'], "~", headers_obj['Content-length'], "bytes)");
    }
}

async function sendToSocket(socket, data) {
    var chunk_size = 16384;
    var can_write = true;
    var close_socket = false;
    var expected_data_out = 0;
    while ((socket.bytesWritten == 0 || socket.bytesWritten != expected_data_out) && can_write) {
        if (expected_data_out === 0) expected_data_out = data.byteLength + (socket_sessions[socket.id].socket_total_written || 0);
        if (socket.bytesWritten == expected_data_out) break;

        var data_left = (expected_data_out - socket.bytesWritten);
        // buffer size = lesser of chunk_size or size remaining
        var buffer_size = (data_left >= chunk_size) ? chunk_size : data_left;
        if (buffer_size < 0) {
            socket.destroy();
            close_socket = true;
            break;
        }
        var offset = (data.byteLength - data_left);
        var chunk = new Buffer.alloc(buffer_size);
        data.copy(chunk, 0, offset, (offset + buffer_size));
        can_write = socket.write(chunk);
        if (!can_write) {
            socket.once('drain', function () {
                sendToSocket(socket, data);
            });
            break;
        }
    }
    if (socket.bytesWritten == expected_data_out || close_socket) {
        socket_sessions[socket.id].socket_total_written = socket.bytesWritten;
        if (socket_sessions[socket.id].expecting_post_data) delete socket_sessions[socket.id].expecting_post_data;
        if (socket_sessions[socket.id].header_buffer) delete socket_sessions[socket.id].header_buffer;
        if (socket_sessions[socket.id].secure_buffer) delete socket_sessions[socket.id].secure_buffer;
        if (socket_sessions[socket.id].buffer) delete socket_sessions[socket.id].buffer;
        if (socket_sessions[socket.id].headers) delete socket_sessions[socket.id].headers;
        if (socket_sessions[socket.id].post_data) delete socket_sessions[socket.id].post_data;
        if (socket_sessions[socket.id].post_data_length) delete socket_sessions[socket.id].post_data_length;
        if (socket_sessions[socket.id].post_data_percents_shown) delete socket_sessions[socket.id].post_data_percents_shown;
        socket.setTimeout(minisrv_config.config.socket_timeout * 1000);
        if (socket_sessions[socket.id].close_me) socket.end();
        if (socket_sessions[socket.id].destroy_me) socket.destroy();
    }
}

function concatArrayBuffer(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
}

function moveObjectElement(currentKey, afterKey, obj) {
    var result = {};
    var val = obj[currentKey];
    delete obj[currentKey];
    var next = -1;
    var i = 0;
    if (typeof afterKey == 'undefined' || afterKey == null) afterKey = '';
    Object.keys(obj).forEach(function (k) {
        var v = obj[k];
        if ((afterKey == '' && i == 0) || next == 1) {
            result[currentKey] = val;
            next = 0;
        }
        if (k == afterKey) { next = 1; }
        result[k] = v;
        ++i;
    });
    if (next == 1) {
        result[currentKey] = val;
    }
    if (next !== -1) return result; else return obj;
}


function isUnencryptedString(string) {
    // a generic "isAscii" check is not sufficient, as the test will see the binary 
    // compressed / encrypted data as ASCII. This function checks for characters expected 
    // in unencrypted headers, and returns true only if every character in the string matches
    // the regex. Once we know the string is binary, we can better process it with the
    // raw base64 or hex data in processRequest() below.
    return /^([A-Za-z0-9\+\/\=\-\.\,\ \"\;\:\?\&\r\n\(\)\%\<\>\_\~\*\@\#\\\!]{8,})$/.test(string);
}

async function processRequest(socket, data_hex, skipSecure = false, encryptedRequest = false) {

    // This function sucks and needs to be rewritten

    var headers = new Array();
    if (socket_sessions[socket.id]) {
        if (socket_sessions[socket.id].headers) {
            headers = socket_sessions[socket.id].headers;
            delete socket_sessions[socket.id].headers;
        }
    }
    var data = Buffer.from(data_hex, 'hex').toString('ascii');
    if (typeof data === "string") {
        if ((data.indexOf("\r\n\r\n") != -1 || data.indexOf("\n\n") != -1) && typeof socket_sessions[socket.id].post_data == "undefined") {
            if (data.indexOf("\r\n\r\n") != -1) {
                data = data.split("\r\n\r\n")[0];
            } else {
                data = data.split("\n\n")[0];
            }
            if (isUnencryptedString(data)) {
                if (headers.length != 0) {
                    var new_header_obj = headerStringToObj(data);
                    Object.keys(new_header_obj).forEach(function (k, v) {
                        headers[k] = new_header_obj[k];
                    });
                    new_header_obj = null;
                } else {
                    headers = headerStringToObj(data);
                }
            } else if (!skipSecure) {
                // if its a POST request, assume its a binary blob and not encrypted (dangerous)
                if (!encryptedRequest) {
                    // its not a POST and it failed the isUnencryptedString test, so we think this is an encrypted blob
                    if (socket_sessions[socket.id].secure != true) {
                        // first time so reroll sessions
                        //                        if (minisrv_config.config.debug_flags.debug) console.log(" # [ UNEXPECTED BINARY BLOCK ] First sign of encryption, re-creating RC4 sessions for socket id", socket.id);
                        socket_sessions[socket.id].wtvsec = new WTVSec(minisrv_config);
                        socket_sessions[socket.id].wtvsec.IssueChallenge();
                        socket_sessions[socket.id].wtvsec.SecureOn();
                        socket_sessions[socket.id].secure = true;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex.substring(header_length * 2));
                    if (enc_data.sigBytes > 0) {
                        if (!socket_sessions[socket.id].wtvsec) {
                            var errpage = wtvshared.doErrorPage(400);
                            headers = errpage[0];
                            headers += "wtv-visit: client:relog\n";
                            data = errpage[1];
                            sendToClient(socket, headers, data);
                            return;
                        }
                        var dec_data = CryptoJS.lib.WordArray.create(socket_sessions[socket.id].wtvsec.Decrypt(0, enc_data));
                        var secure_headers = await processRequest(socket, dec_data.toString(CryptoJS.enc.Hex), true, true);
                        if (secure_headers) {
                            var headers = new Array();
                            headers.encrypted = true;
                            Object.keys(secure_headers).forEach(function (k, v) {
                                headers[k] = secure_headers[k];
                            });
                        }
                    }
                }
            } 

            if (!headers) return;

            if (headers["wtv-client-serial-number"] != null && socket.ssid == null) {
                socket.ssid = wtvshared.makeSafeSSID(headers["wtv-client-serial-number"]);
                if (socket.ssid != null) {
                    if (!ssid_sessions[socket.ssid]) {
                        ssid_sessions[socket.ssid] = new WTVClientSessionData(minisrv_config, socket.ssid);
                        ssid_sessions[socket.ssid].SaveIfRegistered();
                    }
                    if (!ssid_sessions[socket.ssid].data_store.sockets) ssid_sessions[socket.ssid].data_store.sockets = new Set();
                    ssid_sessions[socket.ssid].data_store.sockets.add(socket);
                }
            }

            if (!ssid_sessions[socket.ssid] || !socket.ssid) return headers;
            if (!ssid_sessions[socket.ssid].getClientAddress()) ssid_sessions[socket.ssid].setClientAddress(socket.remoteAddress);
            ssid_sessions[socket.ssid].checkSecurity();

            if (headers["wtv-capability-flags"] != null) {
                if (!ssid_sessions[socket.ssid]) {
                    ssid_sessions[socket.ssid] = new WTVClientSessionData(minisrv_config, socket.ssid);
                    ssid_sessions[socket.ssid].SaveIfRegistered();
                }
                if (!ssid_sessions[socket.ssid].capabilities) ssid_sessions[socket.ssid].capabilities = new WTVClientCapabilities(headers["wtv-capability-flags"]);
            }

            // log all client wtv- headers to the SessionData for that SSID
            // this way we can pull up client info such as wtv-client-rom-type or wtv-system-sysconfig
            if (socket.ssid) {
                Object.keys(headers).forEach(function (k) {
                    if (k.substr(0, 4) === "wtv-") {
                        if (k === "wtv-incarnation" && socket_sessions[socket.id].wtvsec) {
                            socket_sessions[socket.id].wtvsec.set_incarnation(headers[k]);
                        }
                        ssid_sessions[socket.ssid].set(k, headers[k]);
                    }
                });
            }

            if (ssid_sessions[socket.ssid]) {
                if (headers["wtv-ticket"]) {
                    if (!ssid_sessions[socket.ssid].data_store.wtvsec_login) {
                        ssid_sessions[socket.ssid].data_store.wtvsec_login = new WTVSec(minisrv_config);
                        ssid_sessions[socket.ssid].data_store.wtvsec_login.IssueChallenge();
                        if (headers["wtv-incarnation"]) ssid_sessions[socket.ssid].data_store.wtvsec_login.set_incarnation(headers["wtv-incarnation"]);
                        ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 = headers["wtv-ticket"];
                        ssid_sessions[socket.ssid].data_store.wtvsec_login.DecodeTicket(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64);
                        if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id) {
                            if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id > 0)
                                ssid_sessions[socket.ssid].switchUserID(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id, true, false);
                        }
                    } else {
                        if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 != headers["wtv-ticket"])
                            if (!ssid_sessions[socket.ssid].data_store.wtvsec_login.update_ticket) {
                                if (minisrv_config.config.debug_flags.debug) console.log(" # New ticket from client");
                                ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 = headers["wtv-ticket"];
                                ssid_sessions[socket.ssid].data_store.wtvsec_login.DecodeTicket(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64);
                                if (headers["wtv-incarnation"]) ssid_sessions[socket.ssid].data_store.wtvsec_login.set_incarnation(headers["wtv-incarnation"]);
                                if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id > 0) {
                                    if (ssid_sessions[socket.ssid].user_id != ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id)
                                        switchUserID(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id, true, false);
                                }
                            }
                    }
                }
            }


            if ((headers.secure === true || headers.encrypted === true) && !skipSecure) {
                if (!socket_sessions[socket.id].wtvsec) {
                    if (!minisrv_config.config.debug_flags.quiet) console.log(" * Starting new WTVSec instance on socket", socket.id);
                    if (ssid_sessions[socket.ssid].get("wtv-incarnation")) {
                        socket_sessions[socket.id].wtvsec = new WTVSec(minisrv_config, ssid_sessions[socket.ssid].get("wtv-incarnation"));
                    } else {
                        socket_sessions[socket.id].wtvsec = new WTVSec(minisrv_config);
                    }
                    socket_sessions[socket.id].wtvsec.DecodeTicket(headers["wtv-ticket"]);
                    socket_sessions[socket.id].wtvsec.ticket_b64 = headers["wtv-ticket"];
                    socket_sessions[socket.id].wtvsec.SecureOn();
                }
                if (socket_sessions[socket.id].secure != true) {
                    // first time so reroll sessions
                    if (minisrv_config.config.debug_flags.debug) console.log(" # [ SECURE ON BLOCK (" + socket.id + ") ]");
                    socket_sessions[socket.id].secure = true;
                }
                if (!headers.request_url) {
                    var header_length = 0;
                    if (data_hex.indexOf("0d0a0d0a")) {
                        // \r\n\r\n
                        header_length = data.length + 4;
                    } else if (data_hex.indexOf("0a0a")) {
                        // \n\n
                        header_length = data.length + 2;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex.substring(header_length * 2));
                    if (enc_data.sigBytes > 0) {

                        // SECURE ON and detected encrypted data
                        var dec_data = CryptoJS.lib.WordArray.create(socket_sessions[socket.id].wtvsec.Decrypt(0, enc_data))
                        if (!socket_sessions[socket.id].secure_buffer) socket_sessions[socket.id].secure_buffer = "";
                        socket_sessions[socket.id].secure_buffer += dec_data.toString(CryptoJS.enc.Hex);
                        var secure_headers = null;
                        if (headers['request']) {
                            if (headers['request'] == "GET") {
                                if (socket_sessions[socket.id].secure_buffer.indexOf("0d0a0d0a") || socket_sessions[socket.id].secure_buffer.indexOf("0a0a")) {
                                    secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
                                }
                            } else {
                                secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
                            }
                        } else {
                            secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
                        }
                        if (!secure_headers) return;

                        delete socket_sessions[socket.id].secure_buffer;
                        if (minisrv_config.config.debug_flags.debug) console.log(" # Encrypted Request (SECURE ON)", "on", socket.id);
                        if (minisrv_config.config.debug_flags.show_headers) console.log(secure_headers);
                        if (!secure_headers.request) {
                            socket_sessions[socket.id].secure = false;
                            var errpage = wtvshared.doErrorPage(400);
                            headers = errpage[0];
                            data = errpage[1];
                            sendToClient(socket, headers, data);
                            return;
                        }

                        // Merge new headers into existing headers object
                        Object.keys(secure_headers).forEach(function (k) {
                            headers[k] = secure_headers[k];
                        });
                    } else {
                        socket_sessions[socket.id].headers = headers;
                        return;
                    }
                }
            } else if (skipSecure) {
                if (headers) {
                    if (headers['request']) {
                        if (headers['request'].substring(0, 4) == "POST") {
                            if (socket_sessions[socket.id].secure_buffer) delete socket_sessions[socket.id].secure_buffer;
                        } else {
                            return headers;
                        }
                    } else {
                        return headers;
                    }
                } else {
                    return;
                }
            }

            // handle POST
            if (headers['request'] && !socket_sessions[socket.id].expecting_post_data) {
                if (headers['request'].substring(0, 4) == "POST") {
                    socket.setTimeout(minisrv_config.config.post_data_socket_timeout * 1000);
                    if (typeof socket_sessions[socket.id].post_data == "undefined") {
                        if (socket_sessions[socket.id].post_data_percents_shown) delete socket_sessions[socket.id].post_data_percents_shown;
                        socket_sessions[socket.id].post_data_length = headers['Content-length'] || headers['Content-Length'] || 0;
                        socket_sessions[socket.id].post_data_length = parseInt(socket_sessions[socket.id].post_data_length);
                        socket_sessions[socket.id].post_data = "";
                        socket_sessions[socket.id].headers = headers;
                        var post_string = "POST";
                        if (socket_sessions[socket.id].secure) post_string = "Encrypted " + post_string;

                        // the client may have just sent the data with the primary headers, so lets look for that.
                        if (data_hex.indexOf("0d0a0d0a") != -1) socket_sessions[socket.id].post_data = data_hex.substring(data_hex.indexOf("0d0a0d0a") + 8);
                        if (data_hex.indexOf("0a0a") != -1) socket_sessions[socket.id].post_data = data_hex.substring(data_hex.indexOf("0a0a") + 4);
                    }

                    if (socket_sessions[socket.id].post_data.length == (socket_sessions[socket.id].post_data_length * 2)) {
                        // got all expected data
                        if (socket_sessions[socket.id].expecting_post_data) delete socket_sessions[socket.id].expecting_post_data;
                        console.log(" * Incoming", post_string, "request on", socket.id, "from", wtvshared.filterSSID(socket.ssid), "to", headers['request_url'], "(got all expected", socket_sessions[socket.id].post_data_length, "bytes of data from client already)");
                        headers.post_data = CryptoJS.enc.Hex.parse(socket_sessions[socket.id].post_data);
                        delete socket_sessions[socket.id].headers;
                        delete socket_sessions[socket.id].post_data;
                        delete socket_sessions[socket.id].post_data_length;
                        processURL(socket, headers);
                    } else if (socket_sessions[socket.id].post_data.length > (socket_sessions[socket.id].post_data_length * 2)) {
                        // got too much data ? ... should not ever reach this code (section 2)
                        var errpage = wtvshared.doErrorPage(400, "Received too much data in POST request<br>Got " + (socket_sessions[socket.id].post_data.length / 2) + ", expected " + socket_sessions[socket.id].post_data_length) + " (2)";
                        headers = errpage[0];
                        data = errpage[1];
                        sendToClient(socket, headers, data);
                        return;
                    } else {
                        // expecting more data (see below)
                        socket_sessions[socket.id].expecting_post_data = true;
                        if (!socket_sessions[socket.id].post_data) socket_sessions[socket.id].post_data = '';
                        socket_sessions[socket.id].post_data += CryptoJS.enc.Hex.parse(socket_sessions[socket.id].post_data);
                        console.log(" * Incoming", post_string, "request on", socket.id, "from", wtvshared.filterSSID(socket.ssid), "to", headers['request_url'], "(expecting", socket_sessions[socket.id].post_data_length, "bytes of data from client...)");
                    }
                    return;
                } else {
                    delete socket_sessions[socket.id].headers;
                    delete socket_sessions[socket.id].post_data;
                    delete socket_sessions[socket.id].post_data_length;
                    processURL(socket, headers);
                    return;
                }
            } else {
                socket_sessions[socket.id].headers = headers;
            }
        } else {
            // handle streaming POST
            if (socket_sessions[socket.id].expecting_post_data && headers) {
                socket_sessions[socket.id].headers = headers;
                if (socket_sessions[socket.id].post_data.length < (socket_sessions[socket.id].post_data_length * 2)) {
                    new_header_obj = null;
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex);
                    if (socket_sessions[socket.id].secure) {
                        // decrypt if encrypted
                        var dec_data = CryptoJS.lib.WordArray.create(socket_sessions[socket.id].wtvsec.Decrypt(0, enc_data))
                    } else {
                        // just pass it over
                        var dec_data = enc_data;
                    }

                    socket_sessions[socket.id].post_data += dec_data.toString(CryptoJS.enc.Hex);

                    var post_string = "POST";
                    if (socket_sessions[socket.id].secure == true) post_string = "Encrypted " + post_string;

                    if (minisrv_config.config.post_debug) {
                        // `post_debug` logging of every chunk
                        console.log(" * ", Math.floor(new Date().getTime() / 1000), "Receiving", post_string, "data on", socket.id, "[", socket_sessions[socket.id].post_data.length / 2, "of", socket_sessions[socket.id].post_data_length, "bytes ]");
                    } else {
                        // calculate and display percentage of data received
                        var postPercent = wtvshared.getPercentage(socket_sessions[socket.id].post_data.length, (socket_sessions[socket.id].post_data_length * 2));
                        if (minisrv_config.config.post_percentages) {
                            if (minisrv_config.config.post_percentages.includes(postPercent)) {
                                if (!socket_sessions[socket.id].post_data_percents_shown) socket_sessions[socket.id].post_data_percents_shown = new Array();
                                if (!socket_sessions[socket.id].post_data_percents_shown[postPercent]) {
                                    console.log(" * Received", postPercent, "% of", socket_sessions[socket.id].post_data_length, "bytes on", socket.id, "from", wtvshared.filterSSID(socket.ssid));
                                    socket_sessions[socket.id].post_data_percents_shown[postPercent] = true;
                                }
                                if (postPercent == 100) delete socket_sessions[socket.id].post_data_percents_shown;
                            }
                        }
                    }
                }
                if (socket_sessions[socket.id].post_data.length == (socket_sessions[socket.id].post_data_length * 2)) {
                    // got all expected data
                    if (socket_sessions[socket.id].expecting_post_data) delete socket_sessions[socket.id].expecting_post_data;
                    socket.setTimeout(minisrv_config.config.socket_timeout * 1000);
                    headers.post_data = CryptoJS.enc.Hex.parse(socket_sessions[socket.id].post_data);
                    if (socket_sessions[socket.id].secure == true) {
                        if (minisrv_config.config.debug_flags.debug) console.log(" # Encrypted POST Content (SECURE ON)", "on", socket.id, "[", headers.post_data.sigBytes, "bytes ]");
                    } else {
                        if (minisrv_config.config.debug_flags.debug) console.log(" # Unencrypted POST Content", "on", socket.id);
                    }
                    socket_sessions[socket.id].expecting_post_data = false;
                    delete socket_sessions[socket.id].headers;
                    delete socket_sessions[socket.id].post_data;
                    delete socket_sessions[socket.id].post_data_length;
                    processURL(socket, headers);
                    return;
                } else if (socket_sessions[socket.id].post_data.length > (socket_sessions[socket.id].post_data_length * 2)) {
                    socket_sessions[socket.id].expecting_post_data = false;
                    if (socket_sessions[socket.id].expecting_post_data) delete socket_sessions[socket.id].expecting_post_data;
                    socket.setTimeout(minisrv_config.config.socket_timeout * 1000);
                    // got too much data ? ... should not ever reach this code
                    var errpage = wtvshared.doErrorPage(400, "Received too much data in POST request<br>Got " + (socket_sessions[socket.id].post_data.length / 2) + ", expected " + socket_sessions[socket.id].post_data_length);
                    headers = errpage[0];
                    data = errpage[1];
                    sendToClient(socket, headers, data);
                    return;
                }

            } else if (!skipSecure) {
                if (!encryptedRequest) {
                    if (socket_sessions[socket.id].secure != true) {
                        socket_sessions[socket.id].wtvsec = new WTVSec(minisrv_config);
                        socket_sessions[socket.id].wtvsec.IssueChallenge();
                        socket_sessions[socket.id].wtvsec.SecureOn();
                        socket_sessions[socket.id].secure = true;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex);
                    if (enc_data.sigBytes > 0) {
                        if (!socket_sessions[socket.id].wtvsec) {
                            var errpage = wtvshared.doErrorPage(400);
                            var headers = errpage[0];
                            headers += "wtv-visit: client:relog\n";
                            data = errpage[1];
                            sendToClient(socket, headers, data);
                            return;
                        }
                        var str_test = enc_data.toString(CryptoJS.enc.Latin1);
                        if (isUnencryptedString(str_test)) {
                            var dec_data = enc_data;
                        } else {
                            var dec_data = CryptoJS.lib.WordArray.create(socket_sessions[socket.id].wtvsec.Decrypt(0, enc_data));
                        }
                        if (!socket_sessions[socket.id].secure_buffer) socket_sessions[socket.id].secure_buffer = "";
                        socket_sessions[socket.id].secure_buffer += dec_data.toString(CryptoJS.enc.Hex);
                        var secure_headers = null;
                        if (headers['request']) {
                            if (headers['request'] == "GET") {
                                if (socket_sessions[socket.id].secure_buffer.indexOf("0d0a0d0a") || socket_sessions[socket.id].secure_buffer.indexOf("0a0a")) {
                                    secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
                                }
                            } else {
                                var secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
                            }
                        } else {
                            var secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
                        }
                        if (secure_headers) {
                            delete socket_sessions[socket.id].secure_buffer;
                            if (!headers) headers = new Array();
                            headers.encrypted = true;
                            Object.keys(secure_headers).forEach(function (k, v) {
                                headers[k] = secure_headers[k];
                            });
                            if (headers['request']) {
                                if (headers['request'].substring(0, 4) == "POST") {
                                    if (!socket_sessions[socket.id].post_data) {
                                        socket_sessions[socket.id].post_data_length = headers['Content-length'] || headers['Content-Length'] || 0;
                                        socket_sessions[socket.id].post_data = "";
                                    }
                                    processRequest(socket, dec_data.toString(CryptoJS.enc.Hex));
                                } else {
                                    processURL(socket, headers);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

async function cleanupSocket(socket) {
    try {
        if (socket_sessions[socket.id]) {
            if (!minisrv_config.config.debug_flags.quiet) console.log(" * Cleaning up disconnected socket", socket.id);
            delete socket_sessions[socket.id];
        }
        if (socket.ssid) {
            ssid_sessions[socket.ssid].data_store.sockets.delete(socket);

            if (ssid_sessions[socket.ssid].currentConnections() === 0) {
                // clean up possible minibrowser session data
                if (ssid_sessions[socket.ssid].get("wtv-need-upgrade")) ssid_sessions[socket.ssid].delete("wtv-need-upgrade");
                if (ssid_sessions[socket.ssid].get("wtv-used-8675309")) ssid_sessions[socket.ssid].delete("wtv-used-8675309");

                // set timer to destroy entirety of session data if client does not return in X time
                var timeout = 180000; // timeout is in milliseconds, default 180000 (3 min) .. be sure to allow time for dialup reconnections

                // clear any existing timeout check
                if (ssid_sessions[socket.ssid].data_store.socket_check) clearTimeout(ssid_sessions[socket.ssid].data_store.socket_check);

                // set timeout to check 
                ssid_sessions[socket.ssid].data_store.socket_check = setTimeout(function (ssid) {
                    if (ssid_sessions[ssid].currentConnections() === 0) {
                        if (!minisrv_config.config.debug_flags.quiet) console.log(" * WebTV SSID", wtvshared.filterSSID(ssid), " has not been seen in", (timeout / 1000), "seconds, cleaning up session data for this SSID");
                        delete ssid_sessions[ssid];
                    }
                }, timeout, socket.ssid);
            }
        }
        socket.end();
    } catch (e) {
        console.error(" # Could not clean up socket data for socket ID", socket.id, e);
    }
}


async function handleSocket(socket) {
    // create unique socket id with client address and port
    socket.id = parseInt(crc16('CCITT-FALSE', Buffer.from(String(socket.remoteAddress) + String(socket.remotePort), "utf8")).toString(16), 16);
    socket.ssid = null;
    socket_sessions[socket.id] = [];
    socket.minisrv_pc_mode = false;
    socket.setEncoding('hex'); //set data encoding (Text: 'ascii', 'utf8' ~ Binary: 'hex', 'base64' (do not trust 'binary' encoding))
    socket.setTimeout(minisrv_config.config.socket_timeout * 1000);
    socket.on('data', function (data_hex) {
        if (socket_sessions[socket.id]) {
            if (!socket_sessions[socket.id].secure && !socket_sessions[socket.id].expecting_post_data) {
                // buffer unencrypted data until we see the classic double-newline, or get blank
                if (!socket_sessions[socket.id].header_buffer) socket_sessions[socket.id].header_buffer = "";
                socket_sessions[socket.id].header_buffer += data_hex;
                if (socket_sessions[socket.id].header_buffer.indexOf("0d0a0d0a") != -1 || socket_sessions[socket.id].header_buffer.indexOf("0a0a") != -1) {
                    data_hex = socket_sessions[socket.id].header_buffer;
                    delete socket_sessions[socket.id].header_buffer;
                    processRequest(this, data_hex);
                }
            } else {
                // stream encrypted requests through the processor
                if (socket_sessions[socket.id].header_buffer) delete socket_sessions[socket.id].header_buffer;
                processRequest(this, data_hex);
            }
        } else {
            cleanupSocket(socket);
        }
    });

    socket.on('timeout', function () {
        cleanupSocket(socket);
    });

    socket.on('error', (err) => {
        cleanupSocket(socket);
    });

    socket.on('end', function () {
        // Attempt to clean up all of our WTVSec instances
        cleanupSocket(socket);
    });

    socket.on('close', function () {
        // Attempt to clean up all of our WTVSec instances
        cleanupSocket(socket);
    });
}

function getGitRevision() {
    try {
        const rev = fs.readFileSync(__dirname + path.sep + ".." + path.sep + ".git" + path.sep + "HEAD").toString().trim();
        if (rev.indexOf(':') === -1) {
            return rev;
        } else {
            return fs.readFileSync(__dirname + path.sep + ".." + path.sep + ".git" + path.sep + rev.substring(5)).toString().trim().substring(0, 8) + "-" + rev.split('/').pop();
        }
    } catch (e) {
        return null;
    }
}

// SERVER START
var git_commit = getGitRevision()
var z_title = "zefie's wtv minisrv v" + require('./package.json').version;
if (git_commit) console.log("**** Welcome to " + z_title + " (git " + git_commit + ") ****");
else console.log("**** Welcome to " + z_title + " ****");

const wtvshared = new WTVShared(); // creates minisrv_config
var minisrv_config = wtvshared.getMiniSrvConfig(); // snatches minisrv_config
const wtvmime = new WTVMime(minisrv_config);

if (git_commit) {
    minisrv_config.config.git_commit = git_commit;
    delete this.git_commit;
}

if (!minisrv_config) {
    throw ("An error has occured while reading the configuration files.");
}

var service_vaults = new Array();
if (minisrv_config.config.ServiceVaults) {
    Object.keys(minisrv_config.config.ServiceVaults).forEach(function (k) {
        var service_vault = wtvshared.returnAbsolutePath(minisrv_config.config.ServiceVaults[k]);
        service_vaults.push(service_vault);
        console.log(" * Configured Service Vault at", service_vault, "with priority", (parseInt(k) + 1));
    })
} else {
    throw ("ERROR: No Service Vaults defined!");
}

if (minisrv_config.config.SessionStore) {
    var SessionStore = wtvshared.returnAbsolutePath(minisrv_config.config.SessionStore);
    console.log(" * Configured Session Storage at", SessionStore);
} else {
    throw ("ERROR: No Session Storage Directory (SessionStore) defined!");
}

var service_ip = minisrv_config.config.service_ip;
Object.keys(minisrv_config.services).forEach(function (k) {
    if (minisrv_config.services[k].disabled) return;

    minisrv_config.services[k].name = k;
    if (!minisrv_config.services[k].host) {
        minisrv_config.services[k].host = service_ip;
    }
    if (minisrv_config.services[k].port && !minisrv_config.services[k].nobind) {
        ports.push(minisrv_config.services[k].port);
    }
    // minisrv_config service toString
    minisrv_config.services[k].toString = function (overrides) {
        var self = Object.assign({}, this);
        if (overrides != null) {
            if (typeof (overrides) == 'object') {
                Object.keys(overrides).forEach(function (k) {
                    if (k != "exceptions") self[k] = overrides[k];
                });
            }
        }
        if ((k == "wtv-star" && self.no_star_word != true) || k != "wtv-star") {
            var outstr = "wtv-service: name=" + self.name + " host=" + self.host + " port=" + self.port;
            if (self.flags) outstr += " flags=" + self.flags;
            if (self.connections) outstr += " connections=" + self.connections;
        }
        if (k == "wtv-star") {
            outstr += "\nwtv-service: name=wtv-* host=" + self.host + " port=" + self.port;
            if (self.flags) outstr += " flags=" + self.flags;
            if (self.connections) outstr += " connections=" + self.connections;
        }
        return outstr;
    }
    console.log(" * Configured Service", k, "on Port", minisrv_config.services[k].port, "- Host", minisrv_config.services[k].host, "- Bind Port:", !minisrv_config.services[k].nobind);
})
if (minisrv_config.config.hide_ssid_in_logs) console.log(" * Masking SSIDs in console logs for security");
else console.log(" * Full SSIDs will be shown in console logs");

if (minisrv_config.config.service_logo.indexOf(':') == -1) minisrv_config.config.service_logo = "wtv-star:/ROMCache/" + minisrv_config.config.service_logo;
if (minisrv_config.config.service_splash_logo.indexOf(':') == -1) minisrv_config.config.service_splash_logo = "wtv-star:/ROMCache/" + minisrv_config.config.service_splash_logo;

minisrv_config.version = require('./package.json').version;
if (minisrv_config.config.error_log_file) {
    var error_log_stream = fs.createWriteStream(wtvshared.returnAbsolutePath(minisrv_config.config.error_log_file), { flags: 'a' });
    var process_stderr = process.stderr.write;
    var writeError = function () {
        process_stderr.apply(process.stderr, arguments);
        if (error_log_stream) error_log_stream.write.apply(error_log_stream, arguments);
    }
    process.stderr.write = writeError
}

// sanity
if (minisrv_config.config.user_accounts.max_users_per_account < 1) {
    console.log(" * WARNING: user_accounts.max_users_per_account should be at least 1, we have set it to 1.");
    minisrv_config.config.user_accounts.max_users_per_account = 1;
}
if (minisrv_config.config.user_accounts.max_users_per_account > 99) {
    console.log(" * WARNING: user_accounts.max_users_per_account should be less than 99, we have set it to 99.");
    minisrv_config.config.user_accounts.max_users_per_account = 99;
}

process.on('uncaughtException', function (err) {
    console.error((err && err.stack) ? err.stack : err);
});

// defaults
minisrv_config.config.debug_flags = [];
minisrv_config.config.debug_flags.debug = false;
minisrv_config.config.debug_flags.quiet = true; // will squash minisrv_config.config.debug_flags.debug even if its true
minisrv_config.config.debug_flags.show_headers = false;

if (minisrv_config.config.verbosity) {
    switch (minisrv_config.config.verbosity) {
        case 0:
            minisrv_config.config.debug_flags.debug = false;
            minisrv_config.config.debug_flags.quiet = true;
            minisrv_config.config.debug_flags.show_headers = false;
            console.log(" * Console Verbosity level 0 (quietest)")
            break;
        case 1:
            minisrv_config.config.debug_flags.debug = false;
            minisrv_config.config.debug_flags.quiet = true;
            minisrv_config.config.debug_flags.show_headers = true;
            console.log(" * Console Verbosity level 1 (headers shown)")
            break;
        case 2:
            minisrv_config.config.debug_flags.debug = true;
            minisrv_config.config.debug_flags.quiet = true;
            minisrv_config.config.debug_flags.show_headers = false;
            console.log(" * Console Verbosity level 2 (verbose without headers)")
            break;
        case 3:
            minisrv_config.config.debug_flags.debug = true;
            minisrv_config.config.debug_flags.quiet = true;
            minisrv_config.config.debug_flags.show_headers = true;
            console.log(" * Console Verbosity level 3 (verbose with headers)")
            break;
        default:
            minisrv_config.config.debug_flags.debug = true;
            minisrv_config.config.debug_flags.quiet = false;
            minisrv_config.config.debug_flags.show_headers = true;
            console.log(" * Console Verbosity level 4 (debug verbosity)")
            break;
    }
}

var initstring = '';
ports.sort();

// de-duplicate ports in case user configured multiple services on same port
const bind_ports = [...new Set(ports)]
if (!minisrv_config.config.bind_ip) minisrv_config.config.bind_ip = "0.0.0.0";
bind_ports.forEach(function (v) {
    try {
        var server = net.createServer(handleSocket);
        server.listen(v, minisrv_config.config.bind_ip);
        initstring += v + ", ";
    } catch (e) {
        throw ("Could not bind to port", v, "on", minisrv_config.config.bind_ip, e.toString());
    }
});
initstring = initstring.substring(0, initstring.length - 2);


console.log(" * Started server on ports " + initstring + "...")
var listening_ip_string = (minisrv_config.config.bind_ip != "0.0.0.0") ? "IP: " + minisrv_config.config.bind_ip : "all interfaces";
console.log(" * Listening on", listening_ip_string, "~", "Service IP:", service_ip);