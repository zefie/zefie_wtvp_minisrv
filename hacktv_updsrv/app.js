'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const strftime = require('strftime');
const net = require('net');
const CryptoJS = require('crypto-js');
const mime = require('mime-types');
var WTVNetworkSecurity = require('./wtvsec.js');

var zdebug = true;

var pubip = "192.168.11.8";
var port = 1615;

var sec_session = new Array();

function getWTVIncarnation(headers, ssid = null) {
    var incarnation = null;
    headers.some(function (v) {
        if (v.substring(0, 15) === "wtv-incarnation") {
            incarnation = v.split(': ')[1].replace("\r", "");
            return incarnation != null;
        }
    });
    if (ssid != null && incarnation != null) {
        if (sec_session[ssid] != null) {
            sec_session[ssid].set_incarnation(incarnation);
            if (zdebug) console.log(" * Updated wtv-incarnation for " + ssid + " to " + incarnation + " ...");
        }
    }
    return incarnation;
}

function getWTVROMType(headers, ssid = null) {
    var romtype = null;
    headers.some(function (v) {
        if (v.substring(0, 19) === "wtv-client-rom-type") {
            romtype = v.split(': ')[1].replace("\r", "");
            return romtype != null;
        }
    });
    return romtype;
}




function getPublicIP() {
    var options = {
        host: 'www.planeptune.org',
        path: '/ip.php'
    }
    var request = https.get(options, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            return data;
        });
    });
}

function doErrorPage(code) {
    var headers, data = null;
    switch (code) {
        case 404:
            data = "The resource you requested could not be found.";
            headers = "HTTP/1.1 404 Not Found\r\n";
            headers += "Content-Type: text/html\r\n";
            break;
        case 500:
            data = "An internal server error has occured.";
            headers = "HTTP/1.1 500 HackTV has ran into a technical problem.\r\n";
            headers += "Content-Type: text/html\r\n";
            break;
        default:
            data = "Hello, stranger!";
            headers = "HTTP/1.1 200 OK\r\n";
            headers += "Content-Type: text/html\r\n";
            break;
    }
    return new Array(headers, data);
}

function processPath(path, initial_headers = new Array(), query = new Array()) {
    var headers, data = null;
    var request_is_direct_file = false;
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
            console.log(" * Found " + path + "  to handle request");
            var contype = mime.lookup(path);
            data = fs.readFileSync(path);
            headers = "200 OK\r\n"
            headers += "Content-Type: " + contype;
        } else if (fs.existsSync(path + ".txt")) {
            // raw text format, entire payload expected (headers and content)
            console.log(" * Found " + path + ".txt to handle request");
            var fdat = fs.readFileSync(path + ".txt").toString();
            headers = fdat.split("\r\n\r\n")[0];
            data = fdat.split("\r\n\r\n")[1];
        } else if (fs.existsSync(path + ".js")) {
            // js scripting, process with vars, must set 'headers' and 'data' appropriately.
            // loaded script will have r/w access to any JavaScript vars this function does.
            // any query args are in an array named 'query'
            console.log(" * Found " + path + ".js  to handle request");
            var fdat = fs.readFileSync(path + ".js").toString();
            eval(fdat);
        } else if (fs.existsSync(path + ".html")) {
            // Standard HTML with no headers, WTV Style
            console.log(" * Found " + path + ".html  to handle request");
            data = fs.readFileSync(path + ".html").toString();
            headers = "200 OK\r\n"
            headers += "Content-Type: text/html"
        } else {
            var errpage = doErrorPage(404);
            headers = errpage[0];
            data = errpage[1];
        }

        // 'headers' and 'data' should both be set with content by this point!


        if (headers != null) {
            if (typeof headers !== "string") {
                headers = headers.toString();
            }
            if (headers.indexOf("\r") === -1) {
                headers = headers.replace("\n", "\r\n");
            }
        } else {
            var errpage = doErrorPage(500);
            headers = errpage[0];
            data = errpage[1];
        }
        if (data === null) {
            data = '';
        }
        if (typeof data !== "string") {
            data = data.toString();
        }
    } catch (e) {
        var errpage = doErrorPage(500);
        headers = errpage[0];
        data = errpage[1] + "<br><br><pre>" + e.toString() + "</pre>";
        console.log(e);
    }
    if (headers.toLowerCase().indexOf("content-length") === -1) {
        headers += "\r\nContent-Length: " + data.length;
    }
    return new Array(headers, data);
}

function processURL(initial_headers, socket) {
    var shortURL, headers, data = "";
    var query = new Array();
    if (initial_headers['request_url'].indexOf('?') >= 0) {
        shortURL = initial_headers['request_url'].split('?')[0];
        var qraw = initial_headers['request_url'].split('?')[1];
        if (qraw.length > 0) {
            qraw = qraw.split("&");
            for (let i = 0; i < qraw.length; i++) {
                query[qraw[i].split("=")[0]] = qraw[i].split("=")[1];
            }
            if (zdebug) {
                console.log("URL Request has query arguments:")
                console.log(query);
            }
        }
    } else {
        shortURL = initial_headers['request_url'];
    }

    if (shortURL.indexOf(':/') >= 0) {
        var ssid = initial_headers['wtv-client-serial-number'];
        if (ssid != null) {
            console.log(" * Request for " + initial_headers['request_url'] + " from WebTV SSID " + ssid);
        } else {
            console.log(" * Request for " + initial_headers['request_url']);
        }
        // assume webtv since there is a :/ in the GET
        var urlToPath = __dirname + "/ServiceVault/" + shortURL.split(':/')[0] + "/" + shortURL.split(':/')[1];
        if (zdebug) console.log(initial_headers);
        var result = processPath(urlToPath, initial_headers, query);

        if (result[0] == null) {
            var errpage = doErrorPage(404);
            headers = errpage[0];
            data = errpage[1];
        } else {
            headers = result[0];
            data = result[1];
        }
    } else {
        switch (shortURL) {
            default:
                var errpage = doErrorPage(200);
                headers = errpage[0];
                data = errpage[1];
                break;
        }
    }


    var toClient = headers + "\r\n\r\n" + data;
    console.log(headers);
    socket.write(toClient);
    socket.destroy();
}


var server = net.createServer(function (socket) {
    socket.setEncoding("utf8"); //set data encoding (either 'ascii', 'utf8', or 'base64')

    socket.on('data', function (data) {
        var url = "";
        var headers = new Array();
        if (typeof data === "string") {
            data.split('\n').forEach(function (d) {
                if (d != "") {
                    if (d == "SECURE ON") {
                        headers['secure'] = true;
                    }
                    if (d.indexOf(": ") > 0) {
                        headers[d.split(': ')[0]] = (d.split(': ')[1]).replace("\r","");
                    } else if (/^(GET |PUT |POST)$/.test(d.substring(0, 4))) {
                        headers['request'] = d.replace("\r", "");
                        headers['request_url'] = (d.split(' ')[1]).replace("\r", "");
                    }
                }
            });
            console.log(headers);
            if (headers['secure'] === true) {
                // assume we have an ssid if we are this far
                sec_session[headers['wtv-client-serial-number']].SecureOn();
                if (!headers['request_url']) {
                    headers['request_url'] = "wtv-head-waiter:/login-stage-two?";
                }
            }

            processURL(headers,this);
        }
    });

});

server.listen(port, '0.0.0.0');
process.stdout.write("Looking up public IP address... ");
//pubip = getPublicIP();
console.log(pubip + " ...");

console.log('Listening on port ' + port + ' for WebTV Units in Scriptless Mode');