'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const strftime = require('strftime');
const net = require('net');
const CryptoJS = require('crypto-js');
const mime = require('mime-types');
const { crc16 } = require('easy-crc');
var WTVSec = require('./wtvsec.js');

var ports = [];

var service_vault_dir = __dirname + "/ServiceVault";

String.prototype.reverse = function () {
    var splitString = this.split("");
    var reverseArray = splitString.reverse(); 
    var joinArray = reverseArray.join(""); 
    return joinArray;
}


function getServiceString(service) {
    if (service === "all") {
        var out = "";
        Object.keys(services_configured.services).forEach(function (k) {
            out += services_configured.services[k].toString() + "\n";
        });
        return out;
    } else {
        if (!services_configured.services[service]) {
            throw ("SERVICE ERROR: Attempted to provision unconfigured service: " + service)
        } else {
            return services_configured.services[service].toString();
        }
    }
}

var ssid_data = new Array();
var socket_buffer = new Array();
var socket_session_data = new Array();

var script_processing_timeout = 10; // seconds

function getSessionData(ssid, key = null) {
    if (typeof (ssid_data[ssid]) === 'undefined') return null;
    if (key == null) return ssid_data[ssid];
    else if (ssid_data[ssid][key]) return ssid_data[ssid][key];
    else return null;
}

function setSessionData(ssid, key, value) {
    if (typeof (ssid_data[ssid]) === 'undefined') ssid_data[ssid] = new Array();
    ssid_data[ssid][key] = value;
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

async function processPath(socket, path, request_headers = new Array(), service_name) {
    var headers, data = null;
    var request_is_direct_file = false;
    var request_is_async = false;
    path = path.replace(/\\/g, "/");
    try {
        try {
            // try to see if the exact request exists
            if (fs.lstatSync(path).isFile()) {
                request_is_direct_file = true;
            }
        } catch (e) {
            // do nothing its fine
        }

        if (request_is_direct_file) {
            // file exists, read it and return it
            if (!zquiet) console.log(" * Found " + path + " to handle request (Direct File Mode) [Socket " + socket.id +"]");
            var contype = getConType(path);
            request_is_async = true;
            headers = "200 OK\n"
            headers += "Content-Type: " + contype;
            fs.readFile(path, null, function (err, data) {
                sendToClient(socket, headers, data);
            });
        } else if (fs.existsSync(path + ".txt")) {
            // raw text format, entire payload expected (headers and content)
            if (!zquiet) console.log(" * Found " + path + ".txt to handle request (Raw TXT Mode) [Socket " + socket.id + "]");
            request_is_async = true;
            fs.readFile(path + ".txt", 'Utf-8', function (err, file_raw) {
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
        } else if (fs.existsSync(path + ".js")) {
            // synchronous js scripting, process with vars, must set 'headers' and 'data' appropriately.
            // loaded script will have r/w access to any JavaScript vars this function does.
            // request headers are in an array named `request_headers`. 
            // Query arguments in `request_headers.query`
            if (!zquiet) console.log(" * Found " + path + ".js to handle request (JS Interpreter mode) [Socket " + socket.id + "]");
            // expose var service_dir for script path to the root of the wtv-service
            var service_dir = service_vault_dir.replace(/\\/g, "/") + "/" + service_name;
            socket_session_data[socket.id].starttime = Math.floor(new Date().getTime() / 1000);
            var jscript_eval = fs.readFileSync(path + ".js").toString();
            eval(jscript_eval);
            if (request_is_async && !zquiet) console.log(" * Script requested Asynchronous mode");
        }
        else if (fs.existsSync(path + ".html")) {
            // Standard HTML with no headers, WTV Style
            if (!zquiet) console.log(" * Found " + path + ".html  to handle request (HTML Mode) [Socket " + socket.id +"]");
            request_is_async = true;
            headers = "200 OK\n"
            headers += "Content-Type: text/html"
            fs.readFile(path + ".html", null, function (err, data) {
                sendToClient(socket, headers, data);
            });
        } else {
            var errpage = doErrorPage(404);
            headers = errpage[0];
            data = errpage[1];
        }

        // 'headers' and 'data' should both be set with content by this point!


        if (headers == null && !request_is_async) {
            var errpage = doErrorPage(400);
            headers = errpage[0];
            data = errpage[1];
            console.log(" * Scripting or Data error: Headers were not defined. (headers,data) as follows:")
            console.log(socket.id,headers,data)
        }
        if (data === null) {
            data = '';
        }
    } catch (e) {
        var errpage = doErrorPage(400);
        headers = errpage[0];
        data = errpage[1] + "<br><br>The interpreter said:<br><pre>" + e.toString() + "</pre>";
        console.log(" * Scripting error:",e);
    }
    if (!request_is_async) {
        sendToClient(socket, headers, data);
    }
}

function processSSID(obj) {
    if (services_configured.config.hide_ssid_in_logs) {
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
            var ssid = socket_session_data[socket.id].ssid;
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
                console.log(" * " + reqverb + " for " + request_headers.request_url + " from WebTV SSID " + (await processSSID(ssid)), 'on', socket.id);
            } else {
                console.log(" * " + reqverb + " for " + request_headers.request_url, 'on', socket.id);
            }
            // assume webtv since there is a :/ in the GET
            var service_name = shortURL.split(':/')[0];
            var urlToPath = service_vault_dir.replace(/\\/g, "/") + "/" + service_name + "/" + shortURL.split(':/')[1];
            if (zshowheaders) console.log(" * Incoming headers on socket ID", socket.id, (await processSSID(request_headers)));
            processPath(socket, urlToPath, request_headers, service_name);
        } else if (shortURL.indexOf('http://') >= 0 || shortURL.indexOf('https://') >= 0) {
            doHTTPProxy(socket, request_headers);
        } else {
            // error reading headers (no request_url provided)
            var errpage = doErrorPage(400);
            headers = errpage[0];
            data = errpage[1]
            socket_session_data[socket.id].close_me = true;
            sendToClient(socket, headers, data);
        }
    }
}

async function doHTTPProxy(socket, request_headers) {
    if (zshowheaders) console.log("HTTP Proxy: Client Request Headers on socket ID", socket.id, (await processSSID(request_headers)));
    var request_type = request_headers.request.indexOf('https://') ? 'http' : 'https'
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

        if (services_configured.services[request_type].use_external_proxy && services_configured.services[request_type].external_proxy_port) {
            options.host = services_configured.services[request_type].external_proxy_host;
            options.port = services_configured.services[request_type].external_proxy_port;
            options.path = request_headers.request.split(' ')[1];
            options.headers.Host = request_data.host;
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

async function headerStringToObj(headers, response = false) {
    var inc_headers = 0;
    var headers_obj = new Array();
    var headers_obj_pre = headers.split("\n");
    headers_obj_pre.forEach(function (d) {
        if (/^SECURE ON/.test(d) && !response) {
            headers_obj.secure = true;
            //socket_session_data[socket.id].secure_headers = true;
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
        headers_obj = await headerStringToObj(headers_obj, true);
    }

    // add Connection header if missing, default to Keep-Alive
    if (!headers_obj.Connection) {
        headers_obj.Connection = "Keep-Alive";
        headers_obj = moveObjectElement('Connection', 'http_response', headers_obj);
    }

    // encrypt if needed
    if (socket_session_data[socket.id].secure == true) {
        var clen = null;
        if (typeof data.length !== 'undefined') {
            clen = data.length;
        } else if (typeof data.byteLength !== 'undefined') {
            clen = data.byteLength;
        }
        headers_obj["wtv-encrypted"] = 'true';
        headers_obj = moveObjectElement('wtv-encrypted', 'Connection', headers_obj);
        if (clen > 0 && socket_session_data[socket.id].wtvsec) {
            if (!zquiet) console.log(" * Encrypting response to client ...")
            var enc_data = socket_session_data[socket.id].wtvsec.Encrypt(1, data);
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
    if (zshowheaders) console.log(" * Outgoing headers on socket ID", socket.id, (await processSSID(headers_obj)));
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
        if (socket_session_data[socket.id].secure_headers == true) {
            // encrypt headers
            if (zquiet)verbosity_mod += " with encrypted headers";
            var enc_headers = socket_session_data[socket.id].wtvsec.Encrypt(1, headers + "\n");
            socket.write(new Uint8Array(concatArrayBuffer(enc_headers, data)));
        } else {
            socket.write(new Uint8Array(concatArrayBuffer(Buffer.from(headers + "\n"), data)));
        }
        if (zquiet) console.log(" * Sent" + verbosity_mod + " " + headers_obj.http_response + " to client (Content-Type:", headers_obj['Content-Type'], "~", headers_obj['Content-Length'], "bytes)");
    }
    socket_session_data[socket.id].buffer = null;
    if (socket_session_data[socket.id].close_me) socket.end();
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
    // the test will see the binary compressed/enrypted data as ASCII, so a generic "isAscii"
    // is not suffuicent. This checks for characters expected in unecrypted headers, and returns
    // true only if every character in the string matches the regex. Once we know the string is binary
    // we can better process it with the raw base64 data in processRequest() below.
    return /^([A-Za-z0-9\+\/\=\-\.\,\ \"\;\:\?\&\r\n\(\)\%\<\>\_]{8,})$/.test(string);
}

async function processRequest(socket, data_hex, returnHeadersBeforeSecure = false, encryptedRequest = false) {
    var url = "";
    var data = CryptoJS.enc.Latin1.stringify(CryptoJS.enc.Hex.parse(data_hex));

    var headers = new Array();
    if (typeof data === "string") {
        if (data.length > 1) {
            if (data.indexOf("\r\n\r\n") != -1) {
                data = data.split("\r\n\r\n")[0];
            } else {
                data = data.split("\n\n")[0];
            }
            if (headersAreStandard(data)) {
                headers = await headerStringToObj(data);
            } else if (!returnHeadersBeforeSecure) {
                // if its a POST request, assume its a binary blob and not encrypted (dangerous)
                if (!encryptedRequest) {
                    // its not a POST and it 1failed the headersAreStandard test, so we think this is an encrypted blob
                    if (socket_session_data[socket.id].secure != true) {
                        // first time so reroll sessions
                        if (zdebug) console.log(" # [ UNEXPECTED BINARY BLOCK ] First sign of encryption, re-creating RC4 sessions for socket id", socket.id);
                        socket_session_data[socket.id].wtvsec = new WTVSec(1,zdebug);
                        socket_session_data[socket.id].wtvsec.IssueChallenge();
                        socket_session_data[socket.id].wtvsec.SecureOn();
                        socket_session_data[socket.id].secure = true;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex.substring(header_length * 2));
                    if (enc_data.sigBytes > 0) {
                        var dec_data = CryptoJS.lib.WordArray.create(socket_session_data[socket.id].wtvsec.Decrypt(0, enc_data));
                        var secure_headers = await processRequest(socket, dec_data.toString(CryptoJS.enc.Hex), true, true);
                        headers.encrypted = true;
                        Object.keys(secure_headers).forEach(function (k, v) {
                            headers[k] = secure_headers[k];
                        });
                    }
                }
            }

            if (headers["wtv-client-serial-number"] != null) {
                socket_session_data[socket.id].ssid = headers["wtv-client-serial-number"];
            }
            if (headers["wtv-client-rom-type"] != null) {
                if (socket_session_data[socket.id].ssid) {
                    setSessionData(socket_session_data[socket.id].ssid, "wtv-client-rom-type", headers["wtv-client-rom-type"]);
                }
            }
            if (headers["wtv-incarnation"] != null) {
                if (socket_session_data[socket.id].wtvsec) {
                    socket_session_data[socket.id].wtvsec.set_incarnation(headers["wtv-incarnation"]);
                } else {
                    setSessionData(socket_session_data[socket.id].ssid, "incarnation", headers["wtv-incarnation"])
                }
            }

            if (returnHeadersBeforeSecure) {
                headers = await checkForPostData(socket, headers, data, data_hex);
                return headers;
            }

            if (headers.secure === true) {
                if (!socket_session_data[socket.id].wtvsec) {
                    if (!zquiet) console.log(" * Starting new WTVSec instance on socket", socket.id);
                    if (getSessionData(socket_session_data[socket.id].ssid, "incarnation")) {
                        socket_session_data[socket.id].wtvsec = new WTVSec(getSessionData(socket_session_data[socket.id].ssid, "incarnation"), zdebug);
                    } else {
                        socket_session_data[socket.id].wtvsec = new WTVSec(1, zdebug);
                    }
                    socket_session_data[socket.id].wtvsec.DecodeTicket(headers["wtv-ticket"]);
                    socket_session_data[socket.id].wtvsec.ticket_b64 = headers["wtv-ticket"];
                    socket_session_data[socket.id].wtvsec.SecureOn();
                }
                if (socket_session_data[socket.id].secure != true) {
                    // first time so reroll sessions
                    if (zdebug) console.log(" # [ SECURE ON BLOCK (" + socket.id + ")]");
                    socket_session_data[socket.id].secure = true;
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
                            setSessionData(socket_session_data[socket.id].ssid, 'box-does-psuedo-encryption', true);
                            socket_session_data[socket.id].secure = false;
                            var secure_headers = await processRequest(socket, enc_data.toString(CryptoJS.enc.Hex), true);
                        } else {
                            // SECURE ON and detected encrypted data
                            setSessionData(socket_session_data[socket.id].ssid, 'box-does-psuedo-encryption', false);
                            var dec_data = CryptoJS.lib.WordArray.create(socket_session_data[socket.id].wtvsec.Decrypt(0, enc_data))
                            var secure_headers = await processRequest(socket, dec_data.toString(CryptoJS.enc.Hex), true);
                            if (zdebug) console.log(" # Encrypted Request (SECURE ON)", "on", socket.id);
                        }
                        // Merge new headers into existing headers object
                        Object.keys(secure_headers).forEach(function (k, v) {
                            headers[k] = secure_headers[k];
                        });
                    }
                }
            }
            headers = await checkForPostData(socket, headers, data, data_hex);
            if (!headers.request_url) {
                // still no url, likely lost encryption stream, tell client to relog
/*
                socket_session_data[socket.id].secure = false;                
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
                delete socket_session_data[socket.id].wtvsec;
                socket_session_data[socket.id].close_me = true;
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
            if (socket_session_data[socket.id].secure == true) {
                var enc_data = CryptoJS.enc.Hex.parse(socket_session_data[socket.id].buffer.toString(CryptoJS.enc.Hex).substring(header_length * 2));
                if (enc_data.sigBytes > 0) {
                    if (headersAreStandard(enc_data.toString(CryptoJS.enc.Latin1))) {
                        // some builds (like our targeted 3833), send SECURE ON but then unencrypted headers
                        if (zdebug) console.log(" # Psuedo-encrypted POST Content (SECURE ON)", "on", socket.id);
                        // don't actually encrypt output
                        headers.psuedo_encryption = true;
                        setSessionData(socket_session_data[socket.id].ssid, 'box-does-psuedo-encryption', true);
                        socket_session_data[socket.id].secure = false;
                        headers.post_data = await processRequest(socket, enc_data.toString(CryptoJS.enc.Hex), true);
                    } else {
                        // SECURE ON and detected encrypted data
                        setSessionData(socket_session_data[socket.id].ssid, 'box-does-psuedo-encryption', false);
                        headers.post_data = CryptoJS.lib.WordArray.create(socket_session_data[socket.id].wtvsec.Decrypt(0, enc_data))
                        if (zdebug) console.log(" # Encrypted POST Content (SECURE ON)", "on", socket.id);
                    }
                }
            } else {
                if (zdebug) console.log(" # Unencrypted POST Content", "on", socket.id);
                headers.post_data = CryptoJS.enc.Hex.parse(socket_session_data[socket.id].buffer.toString(CryptoJS.enc.Hex).substring(header_length * 2));
            }
        }
    }
    return headers;
}

async function cleanupSocket(socket) {
    try {
        if (!zquiet) console.log(" * Destroying old WTVSec instance on disconnected socket", socket.id);
        delete socket_session_data[socket.id].buffer;

        delete socket_session_data[socket.id].wtvsec;
        delete socket_session_data[socket.id];
        socket.end();
    } catch (e) {
        console.log(" # Could not clean up socket data for socket ID", socket.id, e);
    }
}


async function handleSocket(socket) {
    // create unique socket id with client address and port

    socket.id = parseInt(crc16('CCITT-FALSE', Buffer.from(String(socket.remoteAddress) + String(socket.remotePort), "utf8")).toString(16), 16);
    socket_session_data[socket.id] = [];
    socket.setEncoding('hex'); //set data encoding (either 'ascii', 'utf8', or 'base64')
    socket.on('data', function (data_hex) {
        socket.setTimeout(300);
        if (socket_session_data[socket.id].buffer) {
            socket_session_data[socket.id].buffer.concat(CryptoJS.enc.Hex.parse(data_hex));
        } else {
            socket_session_data[socket.id].buffer = CryptoJS.enc.Hex.parse(data_hex);
        }
    });

    socket.on('timeout', async function () {
        // start the async chain
        if (socket_session_data[socket.id].buffer) {
            processRequest(this, socket_session_data[socket.id].buffer.toString(CryptoJS.enc.Hex));
        }
    });

    socket.on('error', (err) => {
        socket.end();
    });

    socket.on('end', function () {
        cleanupSocket(socket);
    });
}

var z_title = "zefie's wtv minisrv v" + require('./package.json').version;
console.log("**** Welcome to " + z_title + " ****");
console.log(" *** Reading service configuration...");
try {
    var services_configured = JSON.parse(fs.readFileSync(__dirname + "/services.json"));
} catch (e) {
    throw("ERROR: Could not read services.json", e);
}
var service_ip = services_configured.config.service_ip;
Object.keys(services_configured.services).forEach(function (k) {
    services_configured.services[k].name = k;
    if (!services_configured.services[k].host) {
        services_configured.services[k].host = service_ip;
    }
    if (services_configured.services[k].port && !services_configured.services[k].nobind) {
        ports.push(services_configured.services[k].port);
    }

    services_configured.services[k].toString = function () {
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
    console.log(" * Configured Service", k, "on Port", services_configured.services[k].port, "- Host", services_configured.services[k].host, "- Bind Port:", !services_configured.services[k].nobind);
})
if (services_configured.config.hide_ssid_in_logs) console.log(" * Masking SSIDs in the console for security");

// defaults
var zdebug = false;
var zquiet = true; // will squash zdebug even if its true
var zshowheaders = false;

if (services_configured.config.verbosity) {
    switch (services_configured.config.verbosity) {
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

