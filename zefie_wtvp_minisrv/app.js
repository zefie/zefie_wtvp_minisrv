'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const strftime = require('strftime'); // used externally by service scripts
const net = require('net');
const CryptoJS = require('crypto-js');
const mime = require('mime-types');
const { crc16 } = require('easy-crc');
var WTVSec = require('./wtvsec.js');
var ClientSessionData = require('./session_data.js');

// Where we store our session information
var ssid_sessions = new Array();
var socket_sessions = new Array();

var ports = [];

// add .reverse() feature to all JavaScript Strings in this application
// works for service vault scripts too.
String.prototype.reverse = function () {
    var splitString = this.split("");
    var reverseArray = splitString.reverse(); 
    var joinArray = reverseArray.join(""); 
    return joinArray;
}

function getServiceString(service) {
    // used externally by service scripts
    if (service === "all") {
        var out = "";
        Object.keys(minisrv_config.services).forEach(function (k) {
            out += minisrv_config.services[k].toString() + "\n";
        });
        return out;
    } else {
        if (!minisrv_config.services[service]) {
            throw ("SERVICE ERROR: Attempted to provision unconfigured service: " + service)
        } else {
            return minisrv_config.services[service].toString();
        }
    }
}

function getFileExt(path) {
    return path.reverse().split(".")[0].reverse();
}

function doErrorPage(code, data = null) {
    var headers = null;
    switch (code) {
        case 404:
            if (data === null) data = "The service could not find the requested page.";
            headers = "404 " + data + "\r\n";
            headers += "Content-Type: text/html\r\n";
            break;
        case 400:
            if (data === null) data = "HackTV ran into a technical problem.";
            headers = "400 " + data + "\r\n";
            headers += "Content-Type: text/html\r\n";
            break;
        default:
            // what we send when we did not detect a wtv-url.
            // e.g. when a pc browser connects
            headers = "HTTP/1.1 200 OK\r\n";
            headers += "Content-Type: text/html\r\n";
            break;
    }
    return new Array(headers, data);
}


function getConType(path) {
    // custom contype for flashrom
    if (path.indexOf("wtv-flashrom") && (getFileExt(path).toLowerCase() == "rom" || getFileExt(path).toLowerCase() == "brom")) {
        return "binary/x-wtv-flashblock";
    } else if (getFileExt(path).toLowerCase() == "rmf") {
        return "audio/x-rmf";
    }
    return mime.lookup(path);
}

async function processPath(socket, service_vault_file_path, request_headers = new Array(), service_name) {
    var headers, data = null;
    var request_is_async = false;
    var service_vault_found = false;
    var service_path = service_vault_file_path;
    try {
        service_vaults.forEach(function (service_vault_dir) {
            if (service_vault_found) return;
            service_vault_file_path = service_vault_dir.path + "/" + service_path.replace(/\\/g, "/");


            if (fs.existsSync(service_vault_file_path)) {
                // file exists, read it and return it
                service_vault_found = true;
                request_is_async = true;
                if (!zquiet) console.log(" * Found " + service_vault_file_path + " in " + service_vault_dir.name +" to handle request (Direct File Mode) [Socket " + socket.id + "]");
                var contype = getConType(service_vault_file_path);
                headers = "200 OK\n"
                headers += "Content-Type: " + contype;
                fs.readFile(service_vault_file_path, null, function (err, data) {
                    sendToClient(socket, headers, data);
                });
            } else if (fs.existsSync(service_vault_file_path + ".txt")) {
                // raw text format, entire payload expected (headers and content)
                service_vault_found = true;
                if (!zquiet) console.log(" * Found " + service_vault_file_path + ".txt in " + service_vault_dir.name +" to handle request (Raw TXT Mode) [Socket " + socket.id + "]");
                request_is_async = true;
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
                if (!zquiet) console.log(" * Found " + service_vault_file_path + ".js in " + service_vault_dir.name + " to handle request (JS Interpreter mode) [Socket " + socket.id + "]");
                // expose var service_dir for script path to the root of the wtv-service
                var service_dir = service_vault_dir.path.replace(/\\/g, "/") + "/" + service_name;
                socket_sessions[socket.id].starttime = Math.floor(new Date().getTime() / 1000);
                var jscript_eval = fs.readFileSync(service_vault_file_path + ".js").toString();
                eval(jscript_eval);
                if (request_is_async && !zquiet) console.log(" * Script requested Asynchronous mode");
            }
            else if (fs.existsSync(service_vault_file_path + ".html")) {
                // Standard HTML with no headers, WTV Style
                service_vault_found = true;
                if (!zquiet) console.log(" * Found " + service_vault_file_path + ".html in " + service_vault_dir.name +" to handle request (HTML Mode) [Socket " + socket.id + "]");
                request_is_async = true;
                headers = "200 OK\n"
                headers += "Content-Type: text/html"
                fs.readFile(service_vault_file_path + ".html", null, function (err, data) {
                    sendToClient(socket, headers, data);
                });
            }
            // either `request_is_async`, or `headers` and `data` MUST be defined by this point!
        });
    } catch (e) {
        var errpage = doErrorPage(400);
        headers = errpage[0];
        data = errpage[1] + "<br><br>The interpreter said:<br><pre>" + e.toString() + "</pre>";
        console.log(" * Scripting error:",e);
    }
    if (!request_is_async) {
        if (!service_vault_found) {
            console.log(" * Could not find a Service Vault for", service_path);
            var errpage = doErrorPage(404);
            headers = errpage[0];
            data = errpage[1];
        }
        if (headers == null && !request_is_async) {
            var errpage = doErrorPage(400);
            headers = errpage[0];
            data = errpage[1];
            console.log(" * Scripting or Data error: Headers were not defined. (headers,data) as follows:")
            console.log(socket.id, headers, data)
        }
        if (data === null) {
            data = '';
        }
        sendToClient(socket, headers, data);
    }
}

function filterSSID(obj) {
    if (minisrv_config.config.hide_ssid_in_logs) {
        if (typeof (obj) == "string") {
            if (obj.substr(0, 8) == "MSTVSIMU") {
                return obj.substr(0, 10) + ('*').repeat(10) + obj.substr(20);
            } else {
                return obj.substr(0, 6) + ('*').repeat(9);
            }
        } else {
            if (obj["wtv-client-serial-number"]) {
                var ssid = obj["wtv-client-serial-number"];
                if (ssid.substr(0, 8) == "MSTVSIMU") {
                    obj["wtv-client-serial-number"] = ssid.substr(0, 10) + ('*').repeat(10) + ssid.substr(20);
                } else {
                    obj["wtv-client-serial-number"] = ssid.substr(0, 6) + ('*').repeat(9);
                }
            }
            return obj;
        }
    } else {
        return obj;
    }
}

async function processURL(socket, request_headers) {
    if (request_headers === null) {
        return;
    }
    var shortURL, headers, data = "";
    request_headers.query = new Array();
    if (request_headers.request_url) {
        if (request_headers.request_url.indexOf('?') >= 0) {
            shortURL = request_headers.request_url.split('?')[0];
            var qraw = request_headers.request_url.split('?')[1];
            if (qraw.length > 0) {
                qraw = qraw.split("&");
                for (let i = 0; i < qraw.length; i++) {
                    var k = qraw[i].split("=")[0];
                    if (k) {
                        request_headers.query[k] = qraw[i].split("=")[1];
                    }
                }
            }
        } else {
            shortURL = unescape(request_headers.request_url);
        }

        if (shortURL.indexOf(':/') >= 0 && shortURL.indexOf('://') < 0) {
            var ssid = socket.ssid;
            if (ssid == null) {
                ssid = request_headers["wtv-client-serial-number"];
            }
            var reqverb = "Request";
            if (request_headers.encrypted || request_headers.secure) {
                reqverb = "Encrypted " + reqverb;
            }
            if (request_headers.psuedo_encryption) {
                reqverb = "Psuedo-encrypted " + reqverb;
            }
            if (ssid != null) {
                console.log(" * " + reqverb + " for " + request_headers.request_url + " from WebTV SSID " + (await filterSSID(ssid)), 'on', socket.id);
            } else {
                console.log(" * " + reqverb + " for " + request_headers.request_url, 'on', socket.id);
            }
            // assume webtv since there is a :/ in the GET
            var service_name = shortURL.split(':/')[0];
            var urlToPath = service_name + "/" + shortURL.split(':/')[1];
            if (zshowheaders) console.log(" * Incoming headers on socket ID", socket.id, (await filterSSID(request_headers)));
            processPath(socket, urlToPath, request_headers, service_name);
        } else if (shortURL.indexOf('http://') >= 0 || shortURL.indexOf('https://') >= 0) {
            doHTTPProxy(socket, request_headers);
        } else {
            // error reading headers (no request_url provided)
            var errpage = doErrorPage(400);
            headers = errpage[0];
            data = errpage[1]
            socket_sessions[socket.id].close_me = true;
            sendToClient(socket, headers, data);
        }
    }
}

async function doHTTPProxy(socket, request_headers) {
    var request_type = (request_headers.request_url.substring(0,5) == 'https') ? 'https' : 'http'
    if (zshowheaders) console.log(request_type.toUpperCase() +" Proxy: Client Request Headers on socket ID", socket.id, (await filterSSID(request_headers)));
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
        if (request_type === 'https') request_data.port = 443;
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

        if (request_headers.post_data) {
            if (request_headers["Content-type"]) options.headers["Content-type"] = request_headers["Content-type"];
            if (request_headers["Content-length"]) options.headers["Content-length"] = request_headers["Content-length"];
        }

        if (minisrv_config.services[request_type].use_external_proxy && minisrv_config.services[request_type].external_proxy_port) {
            if (minisrv_config.services[request_type].external_proxy_is_socks) {
                var ProxyAgent = require('proxy-agent');
                options.agent = new ProxyAgent("socks://" + (minisrv_config.services[request_type].external_proxy_host || "127.0.0.1") + ":" + minisrv_config.services[request_type].external_proxy_port);
            } else {
                options.host = minisrv_config.services[request_type].external_proxy_host;
                options.port = minisrv_config.services[request_type].external_proxy_port;
                options.path = request_headers.request.split(' ')[1];
                options.headers.Host = request_data.host;
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
                var headers = new Array();
                headers.http_response = res.statusCode + " " + res.statusMessage;
                headers["wtv-connection-close"] = false;
                if (res.headers.server) headers.Server = res.headers.server;
                if (res.headers.connection) headers.Connection = res.headers.connection == "close" ? "Keep-Alive" : "Close";
                if (res.headers.date) headers.Date = res.headers.date;
                if (res.headers["content-type"]) headers["Content-type"] = res.headers["content-type"];
                if (res.headers.cookie) headers.Cookie = res.headers.cookie;
                // content-length is best auto-calculated
                //if (res.headers["content-length"]) headers["Content-Length"] = res.headers["content-length"];
                if (res.headers.vary) headers.Vary = res.headers.vary;
                if (res.headers.location) headers.Location = res.headers.location;
                if (data_hex.substring(0, 8) == "0d0a0d0a") data_hex = data_hex.substring(8);
                if (data_hex.substring(0, 4) == "0a0a") data_hex = data_hex.substring(4);
                sendToClient(socket, headers, Buffer.from(data_hex,'hex'));
            });
        }).on('error', function (err) {
            var errpage, headers, data = null;
            if (err.code == "ENOTFOUND") {
                errpage = doErrorPage(400,`The publisher ${err.hostname} is unknown.`);
            } else {
                console.log(" * Unhandled Proxy Request Error:", err);
                errpage = doErrorPage(400);
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

function headerStringToObj(headers, response = false) {
    var inc_headers = 0;
    var headers_obj = new Array();
    var headers_obj_pre = headers.split("\n");
    headers_obj_pre.forEach(function (d) {
        if (/^SECURE ON/.test(d) && !response) {
            headers_obj.secure = true;
            //socket_sessions[socket.id].secure_headers = true;
        } else if (/^([0-9]{3}) $/.test(d.substring(0, 4)) && response) {
            headers_obj.http_response = d.replace("\r", "");
        } else if (/^(GET |PUT |POST)$/.test(d.substring(0, 4)) && !response) {
            headers_obj.request = d.replace("\r", "");
            headers_obj.request_url = decodeURI(d.split(' ')[1]).replace("\r", "");
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
    if (typeof (data) === 'undefined') data = '';
    if (typeof (headers_obj) === 'string') {
        // string to header object
        headers_obj = headerStringToObj(headers_obj, true);
    }

    // add Connection header if missing, default to Keep-Alive
    if (!headers_obj.Connection) {
        headers_obj.Connection = "Keep-Alive";
        headers_obj = moveObjectElement('Connection', 'http_response', headers_obj);
    }

    // encrypt if needed
    if (socket_sessions[socket.id].secure == true) {
        var clen = null;
        if (typeof data.length !== 'undefined') {
            clen = data.length;
        } else if (typeof data.byteLength !== 'undefined') {
            clen = data.byteLength;
        }
        headers_obj["wtv-encrypted"] = 'true';
        headers_obj = moveObjectElement('wtv-encrypted', 'Connection', headers_obj);
        if (clen > 0 && socket_sessions[socket.id].wtvsec) {
            if (!zquiet) console.log(" * Encrypting response to client ...")
            var enc_data = socket_sessions[socket.id].wtvsec.Encrypt(1, data);
            data = enc_data;
        }
    }

    // fix captialization
    if (headers_obj["Content-length"]) {
        delete headers_obj["Content-length"];
    }

    if (headers_obj["Content-type"]) {
        headers_obj["Content-Type"] = headers_obj["Content-type"];
        delete headers_obj["Content-type"];
    }

    // calculate content length
    if (typeof data.length !== 'undefined') {
        headers_obj["Content-Length"] = data.length;
    } else if (typeof data.byteLength !== 'undefined') {
        headers_obj["Content-Length"] = data.byteLength;
    }


    // header object to string
    if (zshowheaders) console.log(" * Outgoing headers on socket ID", socket.id, (await filterSSID(headers_obj)));
    Object.keys(headers_obj).forEach(function (k) {
        if (k == "http_response") {
            headers += headers_obj[k] + "\r\n";
        } else {
            if (k.indexOf('_') >= 0) {
                var j = k.split('_')[0];
                headers += j + ": " + headers_obj[k] + "\n";
            } else {
                headers += k + ": " + headers_obj[k] + "\n";
            }
        }
    });


    // send to client
    var toClient = null;
    if (typeof data == 'string') {
        toClient = headers + "\n" + data;
        socket.write(toClient);
    } else if (typeof data == 'object') {
        if (zquiet) var verbosity_mod = (headers_obj["wtv-encrypted"] == 'true') ? " encrypted response" : "";
        if (socket_sessions[socket.id].secure_headers == true) {
            // encrypt headers
            if (zquiet)verbosity_mod += " with encrypted headers";
            var enc_headers = socket_sessions[socket.id].wtvsec.Encrypt(1, headers + "\n");
            socket.write(new Uint8Array(concatArrayBuffer(enc_headers, data)));
        } else {
            socket.write(new Uint8Array(concatArrayBuffer(Buffer.from(headers + "\n"), data)));
        }
        if (zquiet) console.log(" * Sent" + verbosity_mod + " " + headers_obj.http_response + " to client (Content-Type:", headers_obj['Content-Type'], "~", headers_obj['Content-Length'], "bytes)");
    }
    socket_sessions[socket.id].buffer = null;
    if (socket_sessions[socket.id].close_me) socket.end();
    if (headers_obj["Connection"]) {
        if (headers_obj["Connection"].toLowerCase() == "close" && !headers["wtv-connection-close"] == "false") {
            socket.destroy();
        }
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

function headersAreStandard(string, verbose = false) {
    // a generic "isAscii" check is not sufficient, as the test will see the binary 
    // compressed / encrypted data as ASCII. This function checks for characters expected 
    // in unencrypted headers, and returns true only if every character in the string matches
    // the regex. Once we know the string is binary, we can better process it with the
    // raw base64 or hex data in processRequest() below.
    return /^([A-Za-z0-9\+\/\=\-\.\,\ \"\;\:\?\&\r\n\(\)\%\<\>\_]{8,})$/.test(string);
}

async function processRequest(socket, data_hex, returnHeadersBeforeSecure = false, encryptedRequest = false) {
    var url = "";
    var data = Buffer.from(data_hex,'hex').toString('ascii');

    var headers = new Array();
    if (typeof data === "string") {
        if (data.length > 1) {
            if (data.indexOf("\r\n\r\n") != -1) {
                data = data.split("\r\n\r\n")[0];
            } else {
                data = data.split("\n\n")[0];
            }
            if (headersAreStandard(data)) {
                headers = headerStringToObj(data);
            } else if (!returnHeadersBeforeSecure) {
                // if its a POST request, assume its a binary blob and not encrypted (dangerous)
                if (!encryptedRequest) {
                    // its not a POST and it 1failed the headersAreStandard test, so we think this is an encrypted blob
                    if (socket_sessions[socket.id].secure != true) {
                        // first time so reroll sessions
                        if (zdebug) console.log(" # [ UNEXPECTED BINARY BLOCK ] First sign of encryption, re-creating RC4 sessions for socket id", socket.id);
                        socket_sessions[socket.id].wtvsec = new WTVSec(1,zdebug);
                        socket_sessions[socket.id].wtvsec.IssueChallenge();
                        socket_sessions[socket.id].wtvsec.SecureOn();
                        socket_sessions[socket.id].secure = true;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex.substring(header_length * 2));
                    if (enc_data.sigBytes > 0) {
                        if (!socket_sessions[socket.id].wtvsec) {
                            var errpage = doErrorPage(400);
                            headers = errpage[0];
                            headers += "wtv-visit: client:relog\n";
                            data = errpage[1];
                            sendToClient(socket, headers, data);
                            return;
                        }
                        var dec_data = CryptoJS.lib.WordArray.create(socket_sessions[socket.id].wtvsec.Decrypt(0, enc_data));
                        var secure_headers = await processRequest(socket, dec_data.toString(CryptoJS.enc.Hex), true, true);
                        headers.encrypted = true;
                        Object.keys(secure_headers).forEach(function (k, v) {
                            headers[k] = secure_headers[k];
                        });
                    }
                }
            }

            if (headers["wtv-client-serial-number"] != null) {
                socket.ssid = headers["wtv-client-serial-number"];
                if (!ssid_sessions[socket.ssid]) {
                    ssid_sessions[socket.ssid] = new ClientSessionData();
                    ssid_sessions[socket.ssid].sockets = new Array();
                    ssid_sessions[socket.ssid].sockets.push(socket.id);
                }
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

            if (returnHeadersBeforeSecure) {
                headers = await checkForPostData(socket, headers, data, data_hex);
                return headers;
            }

            if (headers.secure === true || headers.encrypted === true) {
                if (!socket_sessions[socket.id].wtvsec) {
                    if (!zquiet) console.log(" * Starting new WTVSec instance on socket", socket.id);
                    if (ssid_sessions[socket.ssid].get("wtv-incarnation")) {
                        socket_sessions[socket.id].wtvsec = new WTVSec(ssid_sessions[socket.ssid].get("wtv-incarnation"), zdebug);
                    } else {
                        socket_sessions[socket.id].wtvsec = new WTVSec(1, zdebug);
                    }
                    socket_sessions[socket.id].wtvsec.DecodeTicket(headers["wtv-ticket"]);
                    socket_sessions[socket.id].wtvsec.ticket_b64 = headers["wtv-ticket"];
                    socket_sessions[socket.id].wtvsec.SecureOn();
                }
                if (socket_sessions[socket.id].secure != true) {
                    // first time so reroll sessions
                    if (zdebug) console.log(" # [ SECURE ON BLOCK (" + socket.id + ") ]");
                    socket_sessions[socket.id].secure = true;
                }
                if (!headers.request_url) {

                    if (data_hex.indexOf("0d0a0d0a")) {
                        // \r\n\r\n
                        var header_length = data.length + 4;
                    } else if (data_hex.indexOf("0a0a")) {
                        // \n\n
                        var header_length = data.length + 2;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex.substring(header_length * 2));
                    if (enc_data.sigBytes > 0) {
                        if (headersAreStandard(enc_data.toString(CryptoJS.enc.Latin1), (!returnHeadersBeforeSecure && !encryptedRequest))) {
                            // some builds (like our targeted 3833), send SECURE ON but then unencrypted headers
                            if (zdebug) console.log(" # Psuedo-encrypted Request (SECURE ON)", "on", socket.id);
                            // don't actually encrypt output
                            headers.psuedo_encryption = true;
                            ssid_sessions[socket.ssid].set("box-does-psuedo-encryption", true);
                            socket_sessions[socket.id].secure = false;
                            var secure_headers = await processRequest(socket, enc_data.toString(CryptoJS.enc.Hex), true);
                        } else {
                            // SECURE ON and detected encrypted data
                            ssid_sessions[socket.ssid].set("box-does-psuedo-encryption", false);
                            var dec_data = CryptoJS.lib.WordArray.create(socket_sessions[socket.id].wtvsec.Decrypt(0, enc_data))
                            var secure_headers = await processRequest(socket, dec_data.toString(CryptoJS.enc.Hex), true);
                            if (zdebug) console.log(" # Encrypted Request (SECURE ON)", "on", socket.id);
                            if (zshowheaders) console.log(secure_headers);
                            if (!secure_headers.request) {
                                socket_sessions[socket.id].secure = false;
                                var errpage = doErrorPage(400);
                                headers = errpage[0];
                                data = errpage[1];
                                sendToClient(socket, headers, data);
                                return;
                            }
                        }
                        // Merge new headers into existing headers object
                        Object.keys(secure_headers).forEach(function (k, v) {
                            headers[k] = secure_headers[k];
                        });
                    }
                }
            } else {
                headers = await checkForPostData(socket, headers, data, data_hex);
            }
            if (!headers.request_url) {
                // still no url, likely lost encryption stream, tell client to relog
/*
                socket_sessions[socket.id].secure = false;                
                headers = `300 OK
Connection: Keep-Alive
Expires: Wed, 09 Oct 1991 22:00:00 GMT
wtv-expire-all: wtv-head-waiter:
wtv-expire-all: wtv-1800:
Location: client:relog
wtv-visit: client:relog
Content-type: text/html`;
                data = '';
                */
                socket_sessions[socket.id].secure = false
                socket_sessions[socket.id].close_me = true;
                delete socket_sessions[socket.id].wtvsec;
                sendToClient(socket, headers, data);
            } else {
                processURL(socket, headers);
            }
        } else {
            // socket error, terminate it.
            socket.destroy();
        }
    }
}

async function checkForPostData(socket, headers, data, data_hex) {
    if (headers.request) {
        if (headers.request.substring(0, 4) == "POST") {
            if (data_hex.indexOf("0d0a0d0a") != -1) {
                // \r\n\r\n
                var header_length = data.length + 4;
            } else if (data_hex.indexOf("0a0a") != -1) {
                // \n\n
                var header_length = data.length + 2;
            }
            var post_data = CryptoJS.enc.Hex.parse(data_hex.substring(header_length * 2));
            if (socket_sessions[socket.id].secure == true) {
                if (zdebug) console.log(" # Encrypted POST Content (SECURE ON)", "on", socket.id, "[", post_data.sigBytes, "bytes ]");
            } else {
                if (zdebug) console.log(" # Unencrypted POST Content", "on", socket.id);
            }
            headers.post_data = post_data;
        }
    }
    return headers;
}

async function cleanupSocket(socket) {
    try {
        if (!zquiet) console.log(" * Destroying old WTVSec instance on disconnected socket", socket.id);
        delete socket_sessions[socket.id].buffer;
        delete socket_sessions[socket.id].wtvsec;
        delete socket_sessions[socket.id];
        if (socket.ssid) {
            if (ssid_sessions[socket.ssid].sockets.findIndex(element => element = socket.id) != -1) {
                ssid_sessions[socket.ssid].sockets.splice(ssid_sessions[socket.ssid].sockets.findIndex(element => element = socket.id));
            }
            var fuckyou = ssid_sessions[socket.ssid].sockets;
            if (ssid_sessions[socket.ssid].sockets.length === 0 && ssid_sessions[socket.ssid].get("wtvsec_login")) {
                // if last socket for SSID disconnected, destroy login session
                if (!zquiet) console.log(" * Last socket from WebTV SSID", filterSSID(socket.ssid),"disconnected, destroying initial WTVSec instance");
                ssid_sessions[socket.ssid].delete("wtvsec_login");
            }
        }
        socket.end();
    } catch (e) {
        console.log(" # Could not clean up socket data for socket ID", socket.id, e);
    }
}


async function handleSocket(socket) {
    // create unique socket id with client address and port
    socket.id = parseInt(crc16('CCITT-FALSE', Buffer.from(String(socket.remoteAddress) + String(socket.remotePort), "utf8")).toString(16), 16);
    socket_sessions[socket.id] = [];
    socket.setEncoding('hex'); //set data encoding (Text: 'ascii', 'utf8' ~ Binary: 'hex', 'base64' (do not trust 'binary' encoding))

    // NOTE: As it stands we use a 'timeout' to start processing data when we have not recieved any data
    // from the client in X time (defined in config, in milliseconds). The problem with this is in the case of
    // a modem retrain during a request. 

    // TODO: Properly know when client is done sending data, by parsing headers.
    // Caveat of this is that sometimes the Content-length header does not exist, or will be encrypted.
    
    socket.on('data', function (data_hex) {
        socket.setTimeout(minisrv_config.config.socket_timeout); // the timeout mentioned above

        // Store all received data into a buffer. Kind of misleading as its not a true JS Buffer
        // but instead a CryptoJS WordArray
        if (socket_sessions[socket.id].buffer) {
            socket_sessions[socket.id].buffer.concat(CryptoJS.enc.Hex.parse(data_hex));
        } else {
            socket_sessions[socket.id].buffer = CryptoJS.enc.Hex.parse(data_hex);
        }
    });

    socket.on('timeout', async function () {
        // start the async chain
        if (socket_sessions[socket.id].buffer) {
            // process the request if the buffer exists
            processRequest(this, socket_sessions[socket.id].buffer.toString(CryptoJS.enc.Hex));
        }
    });

    socket.on('error', (err) => {
        socket.end();
    });

    socket.on('end', function () {
        // Attempt to clean up all of our WTVSec instances
        cleanupSocket(socket);
    });
}

function integrateConfig(main, user) {
    Object.keys(user).forEach(function (k) {
        if (typeof (user[k]) == 'object') {
            // new entry
            if (!main[k]) main[k] = new Array();

            // go down the rabbit hole
            main[k] = integrateConfig(main[k], user[k]);
        } else {
            // update main config
            main[k] = user[k];
        }
    });
    return main;
}

function returnAbsolsutePath(path) {
    if (path.substring(0, 1) != "/" && path.substring(1, 1) != ":") {
        // non-absolute path, so use current directory as base
        path = (__dirname + "/" + path).replace(/\\/g, "/");
    } else {
        // already absolute path
        path = path.replace(/\\/g, "/");
    }
    return path;
}


// SERVER START

var z_title = "zefie's wtv minisrv v" + require('./package.json').version;
console.log("**** Welcome to " + z_title + " ****");
var read_config = false;

if (fs.existsSync(__dirname + "/user_config.json")) {
    try {
        var minisrv_config = JSON.parse(fs.readFileSync(__dirname + "/user_config.json"));
        console.log(" *** Reading user configuration...");
        read_config = true;
    }
    catch (e) {
        console.log("Error reading user_config.json, failling back to global config", e);
    }
}

if (fs.existsSync(__dirname + "/config.json") && !read_config) {
    try {
        console.log(" *** Reading global configuration...");
        var minisrv_config = JSON.parse(fs.readFileSync(__dirname + "/config.json"));
        read_config = true;
    } catch (e) {
        console.log ("ERROR: Could not read config.json", e);
    }
}

var service_vaults = new Array();


if (!read_config) {
    throw ("An error has occured while reading the configuration files.");
}

if (minisrv_config.config.UserServiceVault) service_vaults.push({ "path": returnAbsolsutePath(minisrv_config.config.UserServiceVault), "name": "User Service Vault" });
service_vaults.push({ "path": returnAbsolsutePath(minisrv_config.config.ServiceVault), "name": "Service Vault" });
Object.keys(service_vaults).forEach(function (k) {
    console.log(" * Using", service_vaults[k].name, "at", service_vaults[k].path);
});

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

    minisrv_config.services[k].toString = function () {
        var outstr = "wtv-service: name=" + this.name + " host=" + this.host + " port=" + this.port;
        if (this.flags) outstr += " flags=" + this.flags;
        if (this.connections) outstr += " flags=" + this.connections;
        if (k == "wtv-star") {
            outstr += "\nwtv-service: name=wtv-* host=" + this.host + " port=" + this.port;
            if (this.flags) outstr += " flags=" + this.flags;
            if (this.connections) outstr += " flags=" + this.connections;
        }
        return outstr;
    }
    console.log(" * Configured Service", k, "on Port", minisrv_config.services[k].port, "- Host", minisrv_config.services[k].host, "- Bind Port:", !minisrv_config.services[k].nobind);
})
if (minisrv_config.config.hide_ssid_in_logs) console.log(" * Masking SSIDs in the console for security");

// defaults
var zdebug = false;
var zquiet = true; // will squash zdebug even if its true
var zshowheaders = false;

if (minisrv_config.config.verbosity) {
    switch (minisrv_config.config.verbosity) {
        case 0:
            zdebug = false;
            zquiet = true;
            zshowheaders = false;
            console.log(" * Console Verbosity level 0 (quietest)")
            break;
        case 1:
            zdebug = false;
            zquiet = true;
            zshowheaders = true;
            console.log(" * Console Verbosity level 1 (headers shown)")
            break;
        case 2:
            zdebug = true;
            zquiet = true;
            zshowheaders = false;
            console.log(" * Console Verbosity level 2 (verbose without headers)")
            break;
        case 3:
            zdebug = true;
            zquiet = true;
            zshowheaders = true;
            console.log(" * Console Verbosity level 3 (verbose with headers)")
            break;
        default:
            zdebug = true;
            zquiet = false;
            zshowheaders = true;
            console.log(" * Console Verbosity level 4 (debug verbosity)")
            break;
    }
}

var initstring = '';
ports.sort();

// de-duplicate ports in case user configured multiple services on same port
const bind_ports = [...new Set(ports)]

bind_ports.forEach(function (v) {
    try {
        var server = net.createServer(handleSocket);
        server.listen(v, '0.0.0.0');
        initstring += v + ", ";
    } catch (e) {
        throw ("Could not bind to port", v, e.toString());
    }
});
initstring = initstring.substring(0, initstring.length - 2);

console.log(" * Started server on ports " + initstring + "... Service IP is " + service_ip);

