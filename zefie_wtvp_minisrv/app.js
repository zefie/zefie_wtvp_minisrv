'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const strftime = require('strftime'); // used externally by service scripts
const net = require('net');
const CryptoJS = require('crypto-js');
const mime = require('mime-types');
const { crc16 } = require('easy-crc');
const process = require('process');
var WTVSec = require('./WTVSec.js');
var WTVLzpf = require('./WTVLzpf.js');
var WTVClientCapabilities = require('./WTVClientCapabilities.js');
var WTVClientSessionData = require('./WTVClientSessionData.js');

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

function getServiceString(service, overrides = null) {
    // used externally by service scripts
    if (service === "all") {
        var out = "";
        Object.keys(minisrv_config.services).forEach(function (k) {
            out += minisrv_config.services[k].toString(overrides) + "\n";
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
    console.error("doErrorPage Called:", code, data);
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
            service_vault_file_path = makeSafePath(service_vault_dir,service_path);


            if (fs.existsSync(service_vault_file_path)) {
                // file exists, read it and return it
                service_vault_found = true;
                request_is_async = true;
                if (!zquiet) console.log(" * Found " + service_vault_file_path + " to handle request (Direct File Mode) [Socket " + socket.id + "]");
                var contype = getConType(service_vault_file_path);
                headers = "200 OK\n"
                headers += "Content-Type: " + contype;
                fs.readFile(service_vault_file_path, null, function (err, data) {
                    sendToClient(socket, headers, data);
                });
            } else if (fs.existsSync(service_vault_file_path + ".txt")) {
                // raw text format, entire payload expected (headers and content)
                service_vault_found = true;
                if (!zquiet) console.log(" * Found " + service_vault_file_path + ".txt to handle request (Raw TXT Mode) [Socket " + socket.id + "]");
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
                if (!zquiet) console.log(" * Found " + service_vault_file_path + ".js to handle request (JS Interpreter mode) [Socket " + socket.id + "]");
                // expose var service_dir for script path to the root of the wtv-service
                var service_dir = service_vault_dir + path.sep + service_name;
                socket_sessions[socket.id].starttime = Math.floor(new Date().getTime() / 1000);
                var jscript_eval = fs.readFileSync(service_vault_file_path + ".js").toString();
                eval(jscript_eval);
                if (request_is_async && !zquiet) console.log(" * Script requested Asynchronous mode");
            }
            else if (fs.existsSync(service_vault_file_path + ".html")) {
                // Standard HTML with no headers, WTV Style
                service_vault_found = true;
                if (!zquiet) console.log(" * Found " + service_vault_file_path + ".html to handle request (HTML Mode) [Socket " + socket.id + "]");
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
        console.error(" * Scripting error:",e);
    }
    if (!request_is_async) {
        if (!service_vault_found) {
            console.error(" * Could not find a Service Vault for " + service_name + ":/" + service_path.replace(service_name + path.sep, ""));
            var errpage = doErrorPage(404);
            headers = errpage[0];
            data = errpage[1];
        }
        if (headers == null && !request_is_async) {
            var errpage = doErrorPage(400);
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

function filterSSID(obj) {
    if (minisrv_config.config.hide_ssid_in_logs === true) {
        if (typeof (obj) == "string") {
            if (obj.substr(0, 8) == "MSTVSIMU") {
                return obj.substr(0, 10) + ('*').repeat(10) + obj.substr(20);
            } else if (obj.substr(0, 5) == "1SEGA") {
                return obj.substr(0, 6) + ('*').repeat(6) + obj.substr(13);
            } else {
                return obj.substr(0, 6) + ('*').repeat(9);
            }
        } else {
            if (obj["wtv-client-serial-number"]) {
                var ssid = obj["wtv-client-serial-number"];
                if (ssid.substr(0, 8) == "MSTVSIMU") {
                    obj["wtv-client-serial-number"] = ssid.substr(0, 10) + ('*').repeat(10) + ssid.substr(20);
                } else if (ssid.substr(0, 5) == "1SEGA") {
                    obj["wtv-client-serial-number"] = ssid.substr(0, 6) + ('*').repeat(6) + ssid.substr(13);
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

function makeSafePath(base, target) {
    target.replace(/[\|\&\;\$\%\@\"\<\>\+\,\\]/g, "");
    if (path.sep != "/") target = target.replace(/\//g, path.sep);
    var targetPath = path.posix.normalize(target)
    return base + path.sep + targetPath;
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
            var urlToPath = service_name + path.sep + shortURL.split(':/')[1];
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
    var request_type = (request_headers.request_url.substring(0, 5) == "https") ? "https" : "http";
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

        if (request_headers.post_data) {
            if (request_headers["Content-type"]) options.headers["Content-type"] = request_headers["Content-type"];
            if (request_headers["Content-length"]) options.headers["Content-length"] = request_headers["Content-length"];
        }

        if (minisrv_config.services[request_type].use_external_proxy && minisrv_config.services[request_type].external_proxy_port) {
            if (minisrv_config.services[request_type].external_proxy_is_socks) {
                var ProxyAgent = require('proxy-agent');
                options.agent = new ProxyAgent("socks://" + (minisrv_config.services[request_type].external_proxy_host || "127.0.0.1") + ":" + minisrv_config.services[request_type].external_proxy_port);
            } else {
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
                var headers = new Array();
                headers.http_response = res.statusCode + " " + res.statusMessage;
                headers["wtv-connection-close"] = false;
                if (res.headers.server) headers.Server = res.headers.server;
                if (res.headers.connection) headers.Connection = res.headers.connection == "close" ? "Keep-Alive" : "Close";
                if (res.headers.date) headers.Date = res.headers.date;
                if (res.headers["content-type"]) headers["Content-type"] = res.headers["content-type"];
                if (res.headers.cookie) headers.Cookie = res.headers.cookie;
                if (res.headers.vary) headers.Vary = res.headers.vary;
                if (res.headers.location) headers.Location = res.headers.location;
                if (data_hex.substring(0, 8) == "0d0a0d0a") data_hex = data_hex.substring(8);
                if (data_hex.substring(0, 4) == "0a0a") data_hex = data_hex.substring(4);
                sendToClient(socket, headers, Buffer.from(data_hex,'hex'));
            });
        }).on('error', function (err) {
            var errpage, headers, data = null;
            if (err.code == "ENOTFOUND") errpage = doErrorPage(400, `The publisher ${request_data.host} is unknown.`);
            else if (err.message.indexOf("HostUnreachable") > 0) errpage = doErrorPage(400, `The publisher ${request_data.host} could not be reached.`);
            else {
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

async function sendToClient(socket, headers_obj, data, compress_data = false) {
    var headers = "";
    if (typeof (data) === 'undefined') data = '';
    if (typeof (headers_obj) === 'string') {
        // string to header object
        headers_obj = headerStringToObj(headers_obj, true);
    }
    if (!socket_sessions[socket.id]) {
        socket.destroy();
        return;
    }
    var wtv_connection_close = headers_obj["wtv-connection-close"];
    if (typeof (headers_obj["wtv-connection-close"]) != 'undefined') delete headers_obj["wtv-connection-close"];

    // add Connection header if missing, default to Keep-Alive
    if (!headers_obj.Connection) {
        headers_obj.Connection = "Keep-Alive";
        headers_obj = moveObjectElement('Connection', 'http_response', headers_obj);
    }

    var clen = 0;
    if (typeof data.length !== 'undefined') {
        clen = data.length;
    } else if (typeof data.byteLength !== 'undefined') {
        clen = data.byteLength;
    }


    // If wtv-lzpf is in the header then force compression
    if (headers_obj["wtv-lzpf"]) {
        compress_data = true;
    }

    // fix captialization
    if (headers_obj["Content-type"]) {
        headers_obj["Content-Type"] = headers_obj["Content-type"];
        delete headers_obj["Content-type"];
    }


    // if box can do compression, see if its worth enabling
    if (ssid_sessions[socket.ssid].capabilities) {
        if (ssid_sessions[socket.ssid].capabilities['client-can-receive-compressed-data']) {
            compress_data = shouldWeCompress(headers_obj["Content-Type"]);
        }
    }

    // compress if needed
    if (compress_data && clen > 0) {
        headers_obj["wtv-lzpf"] = 0;

        var wtvcomp = new WTVLzpf();
        data = wtvcomp.Compress(data);

        console.log("data", data)

        wtvcomp = null; // Makes the garbage gods happy so it cleans up our mess
    }

    if (headers_obj['minisrv-already-compressed']) delete headers_obj['minisrv-already-compressed'];


    // encrypt if needed
    if (socket_sessions[socket.id].secure == true) {
        headers_obj["wtv-encrypted"] = 'true';
        headers_obj = moveObjectElement('wtv-encrypted', 'Connection', headers_obj);
        if (clen > 0 && socket_sessions[socket.id].wtvsec) {
            if (!zquiet) console.log(" * Encrypting response to client ...")
            var enc_data = socket_sessions[socket.id].wtvsec.Encrypt(1, data);
            data = enc_data;
        }
    }

    // calculate content length
    // make sure we are using our Content-length and not one set in a script.
    if (headers_obj["Content-Length"]) delete headers_obj["Content-Length"];
    if (headers_obj["Content-length"]) delete headers_obj["Content-length"];

    // On the WNI server this is the length before compression but we're using the length after compression.
    // It matches the HTTP spec anyway so leaving.
    if (typeof data.length !== 'undefined') {
        headers_obj["Content-length"] = data.length;
    } else if (typeof data.byteLength !== 'undefined') {
        headers_obj["Content-length"] = data.byteLength;
    }

    if (ssid_sessions[socket.ssid]) {
        if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
            if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64) {
                if (ssid_sessions[socket.ssid].data_store.update_ticket) {
                    headers_obj["wtv-ticket"] = ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64;
                    headers_obj = moveObjectElement("wtv-ticket", "Connection", headers_obj);
                    ssid_sessions[socket.ssid].data_store.update_ticket = false;
                }
            }
        }
    }

    var end_of_line = "\n";
    if (!headers_obj['minisrv-use-carriage-return'] || headers_obj['minisrv-use-carriage-return'] != "false") end_of_line = "\r\n";
    if (headers_obj['minisrv-use-carriage-return']) delete headers_obj['minisrv-use-carriage-return'];

    if (end_of_line == "\n" && zdebug) console.log(" * Script requested to send headers without carriage return (bf0app hack)");

    // header object to string
    if (zshowheaders) console.log(" * Outgoing headers on socket ID", socket.id, (await filterSSID(headers_obj)));
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


    // send to client
    var toClient = null;
    if (typeof data == 'string') {
        toClient = headers + end_of_line + data;
        socket.write(toClient);
    } else if (typeof data == 'object') {
        if (zquiet) var verbosity_mod = (headers_obj["wtv-encrypted"] == 'true') ? " encrypted response" : "";
        if (socket_sessions[socket.id].secure_headers == true) {
            // encrypt headers
            if (zquiet)verbosity_mod += " with encrypted headers";
            var enc_headers = socket_sessions[socket.id].wtvsec.Encrypt(1, headers + end_of_line);
            socket.write(new Uint8Array(concatArrayBuffer(enc_headers, data)));
        } else {
            socket.write(new Uint8Array(concatArrayBuffer(Buffer.from(headers + end_of_line), data)));
        }
        if (zquiet) console.log(" * Sent" + verbosity_mod + " " + headers_obj.http_response + " to client (Content-Type:", headers_obj['Content-Type'], "~", headers_obj['Content-Length'], "bytes)");
    }

    if (socket_sessions[socket.id].expecting_post_data) delete socket_sessions[socket.id].expecting_post_data;
    if (socket_sessions[socket.id].header_buffer) delete socket_sessions[socket.id].header_buffer;
    if (socket_sessions[socket.id].secure_buffer) delete socket_sessions[socket.id].secure_buffer;
    if (socket_sessions[socket.id].buffer) delete socket_sessions[socket.id].buffer;
    if (socket_sessions[socket.id].headers) delete socket_sessions[socket.id].headers;
    if (socket_sessions[socket.id].post_data) delete socket_sessions[socket.id].post_data;
    if (socket_sessions[socket.id].post_data_length) delete socket_sessions[socket.id].post_data_length;
    if (socket_sessions[socket.id].post_data_percents_shown) delete socket_sessions[socket.id].post_data_percents_shown;
    
    if (socket_sessions[socket.id].close_me) socket.end();
    if (headers_obj["Connection"]) {
        if (headers_obj["Connection"].toLowerCase() == "close" && wtv_connection_close == "true") {
            socket.destroy();
        }
    }
}

function shouldWeCompress(content_type) {
    if (typeof (content_type) != 'undefined') {
        if ((content_type.match(/^text\//) && content_type != "text/tellyscript") ||
            content_type.match(/^application\/(x-?)javascript$/) ||
            content_type.match(/^audio\/(x-)?midi/) ||
            content_type.match(/^audio\/(x-)?wav/) ||
            content_type == "application/json") {
            return true;
        }
    }
    return false;
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
    return /^([A-Za-z0-9\+\/\=\-\.\,\ \"\;\:\?\&\r\n\(\)\%\<\>\_\~\*]{8,})$/.test(string);
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
            if (headersAreStandard(data)) {
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
                    // its not a POST and it failed the headersAreStandard test, so we think this is an encrypted blob
                    if (socket_sessions[socket.id].secure != true) {
                        // first time so reroll sessions
                        if (zdebug) console.log(" # [ UNEXPECTED BINARY BLOCK ] First sign of encryption, re-creating RC4 sessions for socket id", socket.id);
                        socket_sessions[socket.id].wtvsec = new WTVSec(1, zdebug);
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

            if (headers["wtv-client-serial-number"] != null) {
                socket.ssid = headers["wtv-client-serial-number"];
                if (!ssid_sessions[socket.ssid]) {
                    ssid_sessions[socket.ssid] = new WTVClientSessionData();
                }
                if (!ssid_sessions[socket.ssid].data_store.sockets) ssid_sessions[socket.ssid].data_store.sockets = new Set();
                ssid_sessions[socket.ssid].data_store.sockets.add(socket);
            }

            var ip2long = function (ip) {
                var components;

                if (components = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)) {
                    var iplong = 0;
                    var power = 1;
                    for (var i = 4; i >= 1; i -= 1) {
                        iplong += power * parseInt(components[i]);
                        power *= 256;
                    }
                    return iplong;
                }
                else return -1;
            };

            var isInSubnet = function (ip, subnet) {
                var mask, base_ip, long_ip = ip2long(ip);
                if ((mask = subnet.match(/^(.*?)\/(\d{1,2})$/)) && ((base_ip = ip2long(mask[1])) >= 0)) {
                    var freedom = Math.pow(2, 32 - parseInt(mask[2]));
                    return (long_ip > base_ip) && (long_ip < base_ip + freedom - 1);
                }
                else return false;
            };

            var rejectSSIDConnection = function (ssid, blacklist) {
                if (blacklist) console.log(" * Request from SSID", filterSSID(ssid), "(" + socket.remoteAddr + "), but that SSID is in the blacklist, rejecting.");
                else console.log(" * Request from SSID", filterSSID(socket.ssid), "(" + socket.remoteAddress + "), but that SSID is not in the whitelist, rejecting.");

                var errpage = doErrorPage(401, "Access to this service is denied.");
                headers = errpage[0];
                data = errpage[1];
                socket_sessions[socket.id].close_me = true;
            }

            var checkSSIDIPWhitelist = function (ssid, blacklist) {
                var ssid_access_list_ip_override = false;
                if (minisrv_config.config.ssid_ip_allow_list) {
                    if (minisrv_config.config.ssid_ip_allow_list[socket.ssid]) {
                        Object.keys(minisrv_config.config.ssid_ip_allow_list[socket.ssid]).forEach(function (k) {
                            if (minisrv_config.config.ssid_ip_allow_list[socket.ssid][k].indexOf('/') > 0) {
                                if (isInSubnet(socket.remoteAddress, minisrv_config.config.ssid_ip_allow_list[socket.ssid][k])) {
                                    // remoteAddr is in allowed subnet
                                    ssid_access_list_ip_override = true;
                                }
                            } else {
                                if (socket.remoteAddress == minisrv_config.config.ssid_ip_allow_list[socket.ssid][k]) {
                                    // remoteAddr directly matches IP
                                    ssid_access_list_ip_override = true;
                                }
                            }
                        });
                        if (!ssid_access_list_ip_override) rejectSSIDConnection(socket.ssid, blacklist);
                    } else {
                        rejectSSIDConnection(socket.ssid, blacklist);
                    }
                } else {
                    rejectSSIDConnection(socket.ssid, blacklist);
                }
                if (ssid_access_list_ip_override && zdebug) console.log(" * Request from disallowed SSID", filterSSID(ssid), "was allowed due to IP address whitelist");
            }

            // process whitelist first
            if (socket.ssid && minisrv_config.config.ssid_allow_list) {
                var ssid_is_in_whitelist = minisrv_config.config.ssid_allow_list.findIndex(element => element == socket.ssid);
                if (ssid_is_in_whitelist == -1) {
                    // no whitelist match, but lets see if the remoteAddress is allowed
                    checkSSIDIPWhitelist(socket.ssid, false);
                }
            }

            // now check blacklist
            if (socket.ssid && minisrv_config.config.ssid_block_list) {
                var ssid_is_in_blacklist = minisrv_config.config.ssid_block_list.findIndex(element => element == socket.ssid);
                if (ssid_is_in_blacklist != -1) {
                    // blacklist match, but lets see if the remoteAddress is allowed
                    checkSSIDIPWhitelist(socket.ssid, true);
                }
            }

            // Passed Security

            if (headers["wtv-capability-flags"] != null) {
                 if (!ssid_sessions[socket.ssid]) {
                    ssid_sessions[socket.ssid] = new WTVClientSessionData();
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
                        ssid_sessions[socket.ssid].data_store.wtvsec_login = new WTVSec();
                        ssid_sessions[socket.ssid].data_store.wtvsec_login.IssueChallenge();
                        ssid_sessions[socket.ssid].data_store.wtvsec_login.set_incarnation(headers["wtv-incarnation"]);
                        ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 = headers["wtv-ticket"];
                        ssid_sessions[socket.ssid].data_store.wtvsec_login.DecodeTicket(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64);
                    } else {
                        if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 != headers["wtv-ticket"]) {
                            if (zdebug) console.log(" # New ticket from client");
                            ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 = headers["wtv-ticket"];
                            ssid_sessions[socket.ssid].data_store.wtvsec_login.DecodeTicket(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64);
                        }
                    }
                }
            }


            if ((headers.secure === true || headers.encrypted === true) && !skipSecure) {
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
                        if (headersAreStandard(enc_data.toString(CryptoJS.enc.Latin1), (!skipSecure && !encryptedRequest))) {
                            // some builds (like our targeted 3833), send SECURE ON but then unencrypted headers
                            if (zdebug) console.log(" # Psuedo-encrypted Request (SECURE ON)", "on", socket.id);
                            // don't actually encrypt output
                            headers.psuedo_encryption = true;
                            ssid_sessions[socket.ssid].set("box-does-psuedo-encryption", true);
                            socket_sessions[socket.id].secure = false;
                            var secure_headers = await processRequest(socket, enc_data.toString(CryptoJS.enc.Hex), true, true);
                        } else {
                            // SECURE ON and detected encrypted data
                            ssid_sessions[socket.ssid].set("box-does-psuedo-encryption", false);
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
            if (headers['request']) {
                if (headers['request'].substring(0, 4) == "POST") {
                    if (typeof socket_sessions[socket.id].post_data == "undefined") {
                        if (socket_sessions[socket.id].post_data_percents_shown) delete socket_sessions[socket.id].post_data_percents_shown;
                        socket_sessions[socket.id].post_data_length = headers['Content-length'] || headers['Content-Length'] || 0;
                        socket_sessions[socket.id].post_data_length = parseInt(socket_sessions[socket.id].post_data_length);
                        socket_sessions[socket.id].post_data = "";
                        socket_sessions[socket.id].headers = headers;
                        var post_string = "POST";
                        if (socket_sessions[socket.id].secure == true) {
                            post_string = "Encrypted " + post_string;
                        } else {
                            // if the request is not encrypted, the client may have just sent the data with the primary headers, so lets look for that.
                            if (data_hex.indexOf("0d0a0d0a") != -1) socket_sessions[socket.id].post_data = data_hex.substring(data_hex.indexOf("0d0a0d0a") + 8);
                            if (data_hex.indexOf("0a0a") != -1) socket_sessions[socket.id].post_data = data_hex.substring(data_hex.indexOf("0a0a") + 4);
                        }
                        if (socket_sessions[socket.id].post_data.length == (socket_sessions[socket.id].post_data_length * 2)) {
                            // got all expected data
                            if (socket_sessions[socket.id].expecting_post_data) delete socket_sessions[socket.id].expecting_post_data;
                            console.log(" * Incoming", post_string, "request on", socket.id, "from", filterSSID(socket.ssid), "to", headers['request_url'], "(got all expected", socket_sessions[socket.id].post_data_length, "bytes of data from client already)");
                            headers.post_data = CryptoJS.enc.Hex.parse(socket_sessions[socket.id].post_data);
                            if (socket_sessions[socket.id].headers) delete socket_sessions[socket.id].headers;
                            processURL(socket, headers);
                        } else {
                            // expecting more data (see below)
                            socket_sessions[socket.id].expecting_post_data = true;
                            console.log(" * Incoming", post_string, "request on", socket.id, "from", filterSSID(socket.ssid), "to", headers['request_url'], "(expecting", socket_sessions[socket.id].post_data_length, "bytes of data from client...)");
                        }
                        if (socket_sessions[socket.id].post_data.length > (socket_sessions[socket.id].post_data_length * 2)) {
                            // got too much data ? ... should not ever reach this code
                            var errpage = doErrorPage(400, "Received too much data in POST request<br>Got " + (socket_sessions[socket.id].post_data.length / 2) + ", expected " + socket_sessions[socket.id].post_data_length);
                            headers = errpage[0];
                            data = errpage[1];
                            sendToClient(socket, headers, data);
                            return;
                        }
                        return;
                    }
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
            if (typeof socket_sessions[socket.id].post_data != "undefined" && headers) {
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
                        var getPercentage = function (partialValue, totalValue) {
                            return Math.floor((100 * partialValue) / totalValue);
                        }
                        var postPercent = getPercentage(socket_sessions[socket.id].post_data.length, (socket_sessions[socket.id].post_data_length * 2));
                        if (minisrv_config.config.post_percentages) {
                            if (minisrv_config.config.post_percentages.includes(postPercent)) {
                                if (!socket_sessions[socket.id].post_data_percents_shown) socket_sessions[socket.id].post_data_percents_shown = new Array();
                                if (!socket_sessions[socket.id].post_data_percents_shown[postPercent]) {
                                    console.log(" * Received", postPercent, "% of", socket_sessions[socket.id].post_data_length, "bytes on", socket.id, "from", filterSSID(socket.ssid));
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
                    headers.post_data = CryptoJS.enc.Hex.parse(socket_sessions[socket.id].post_data);
                    if (socket_sessions[socket.id].secure == true) {
                        if (zdebug) console.log(" # Encrypted POST Content (SECURE ON)", "on", socket.id, "[", headers.post_data.sigBytes, "bytes ]");
                    } else {
                        if (zdebug) console.log(" # Unencrypted POST Content", "on", socket.id);
                    }
                    delete socket_sessions[socket.id].headers;
                    delete socket_sessions[socket.id].post_data;
                    delete socket_sessions[socket.id].post_data_length;
                    processURL(socket, headers);
                    return;
                }
                if (socket_sessions[socket.id].post_data.length > (socket_sessions[socket.id].post_data_length * 2)) {
                    if (socket_sessions[socket.id].expecting_post_data) delete socket_sessions[socket.id].expecting_post_data;
                    // got too much data ? ... should not ever reach this code
                    var errpage = doErrorPage(400, "Received too much data in POST request<br>Got " + (socket_sessions[socket.id].post_data.length / 2) + ", expected " + socket_sessions[socket.id].post_data_length);
                    headers = errpage[0];
                    data = errpage[1];
                    sendToClient(socket, headers, data);
                    return;
                }

            } else if (!skipSecure) {
                if (!encryptedRequest) {
                    if (socket_sessions[socket.id].secure != true) {
                        socket_sessions[socket.id].wtvsec = new WTVSec(1, zdebug);
                        socket_sessions[socket.id].wtvsec.IssueChallenge();
                        socket_sessions[socket.id].wtvsec.SecureOn();
                        socket_sessions[socket.id].secure = true;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex);
                    if (enc_data.sigBytes > 0) {
                        if (!socket_sessions[socket.id].wtvsec) {
                            var errpage = doErrorPage(400);
                            var headers = errpage[0];
                            headers += "wtv-visit: client:relog\n";
                            data = errpage[1];
                            sendToClient(socket, headers, data);
                            return;
                        }
                        var str_test = enc_data.toString(CryptoJS.enc.Latin1);
                        if (headersAreStandard(str_test)) {
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
            if (!zquiet) console.log(" * Cleaning up disconnected socket", socket.id);
            delete socket_sessions[socket.id];
        }
        if (socket.ssid) {
            ssid_sessions[socket.ssid].data_store.sockets.delete(socket);

            if (ssid_sessions[socket.ssid].currentConnections() === 0) {
                // clean up possible minibrowser session data
                if (ssid_sessions[socket.ssid].get("wtv-needs-upgrade")) ssid_sessions[socket.ssid].delete("wtv-needs-upgrade");
                if (ssid_sessions[socket.ssid].get("wtv-used-8675309")) ssid_sessions[socket.ssid].delete("wtv-used-8675309");

                // set timer to destroy entirety of session data if client does not return in X time
                var timeout = 180000; // timeout is in milliseconds, default 180000 (3 min) .. be sure to allow time for dialup reconnections

                if (!ssid_sessions[socket.ssid].data_store.socket_check) {
                    ssid_sessions[socket.ssid].data_store.socket_check = setTimeout(function (ssid) {
                        if (ssid_sessions[ssid].currentConnections() === 0) {
                            if (!zquiet) console.log(" * WebTV SSID", filterSSID(ssid), " has not been seen in", (timeout / 1000), "seconds, cleaning up session data for this SSID");
                            delete ssid_sessions[ssid];
                        }
                    }, timeout, socket.ssid);
                }
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
    socket_sessions[socket.id] = [];
    socket.setEncoding('hex'); //set data encoding (Text: 'ascii', 'utf8' ~ Binary: 'hex', 'base64' (do not trust 'binary' encoding))
    socket.setTimeout(10800000); // 3 hours
    socket.on('data', function (data_hex) {
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

function integrateConfig(main, user) {
    Object.keys(user).forEach(function (k) {
        if (typeof (user[k]) == 'object' && user[k] != null) {
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

function returnAbsolutePath(check_path) {
    if (check_path.substring(0, 1) != path.sep && check_path.substring(1, 1) != ":") {
        // non-absolute path, so use current directory as base
        check_path = (__dirname + path.sep + check_path);
    } else {
        // already absolute path
    }
    return check_path;
}


function getGitRevision() {
    try {
        const rev = fs.readFileSync(__dirname + path.sep + ".." + path.sep + ".git" + path.sep + "HEAD").toString().trim();
        if (rev.indexOf(':') === -1) {
            return rev;
        } else {
            return fs.readFileSync(__dirname + path.sep + ".." + path.sep + ".git" + path.sep + rev.substring(5)).toString().trim();
        }
    } catch (e) {
        return null;
    }
}

// SERVER START
var git_commit = getGitRevision()
if (git_commit) {
    var z_title = "zefie's wtv minisrv v" + require('./package.json').version + " (git " + git_commit.substring(0,8) + ")";
} else {
    var z_title = "zefie's wtv minisrv v" + require('./package.json').version;
}
console.log("**** Welcome to " + z_title + " ****");
console.log(" *** Reading global configuration...");
try {
    var minisrv_config = JSON.parse(fs.readFileSync(__dirname + "/config.json"));
    if (git_commit) {
        minisrv_config.config.git_commit = git_commit;
        delete this.git_commit;
    }
} catch (e) {
    throw ("ERROR: Could not read config.json", e);
}
var service_vaults = new Array();

try {
    if (fs.lstatSync(__dirname + "/user_config.json")) {
        console.log(" *** Reading user configuration...");
        try {
            var minisrv_user_config = JSON.parse(fs.readFileSync(__dirname + "/user_config.json")); 
        } catch (e) {
            console.error("ERROR: Could not read user_config.json", e);
            var throw_me = true;
        }
        // file exists and we read and parsed it, but the variable is undefined
        // Likely a syntax parser error that did not trip the exception check above
        try {
            minisrv_config = integrateConfig(minisrv_config, minisrv_user_config)
        } catch (e) {
            console.error("ERROR: Could not read user_config.json", e);
        }
    }
} catch (e) {
    if (zdebug) console.error(" * Notice: Could not find user configuration (user_config.json). Using default configuration.");
}

if (throw_me) {
    throw ("An error has occured while reading the configuration files.");
}

if (minisrv_config.config.ServiceVaults) {
    Object.keys(minisrv_config.config.ServiceVaults).forEach(function (k) {
        var service_vault = returnAbsolutePath(minisrv_config.config.ServiceVaults[k]);
        service_vaults.push(service_vault);
        console.log(" * Configured Service Vault at", service_vault, "with priority",(parseInt(k)+1));
    })
} else {
    throw ("ERROR: No Service Vaults defined!");
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
                    self[k] = overrides[k];
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
    var error_log_stream = fs.createWriteStream(returnAbsolutePath(minisrv_config.config.error_log_file), { flags: 'a' });
    var process_stderr = process.stderr.write;
    var writeError = function() {
        process_stderr.apply(process.stderr, arguments);
        if (error_log_stream) error_log_stream.write.apply(error_log_stream, arguments);
    }
    process.stderr.write = writeError
}

process.on('uncaughtException', function (err) {
    console.error((err && err.stack) ? err.stack : err);
});

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
console.log(" * Listening on", listening_ip_string,"~","Service IP:", service_ip);