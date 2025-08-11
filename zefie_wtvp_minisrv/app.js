'use strict';
const path = require('path');
const classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
require(classPath + "Prototypes.js");
const { WTVShared, clientShowAlert } = require(classPath + "WTVShared.js");
const wtvshared = new WTVShared(); // creates minisrv_config

const fs = require('fs');
const nunjucks = require('nunjucks');
const zlib = require('zlib');
const {serialize, unserialize} = require('php-serialize');
const {spawn} = require('child_process');
const http = require('follow-redirects').http
const https = require('follow-redirects').https
const httpx = require(classPath + "/HTTPX.js");
const { URL } = require('url');
const net = require('net');
const crypto = require('crypto')
const CryptoJS = require('crypto-js');
const sharp = require('sharp')
const process = require('process');
const WTVSec = require(classPath + "/WTVSec.js");
const WTVSSL = require(classPath + "/WTVSSL.js");
const LZPF = require(classPath + "/LZPF.js");
const WTVClientCapabilities = require(classPath + "/WTVClientCapabilities.js");
const WTVClientSessionData = require(classPath + "/WTVClientSessionData.js");
const WTVMime = require(classPath + "/WTVMime.js");
const WTVFlashrom = require(classPath + "/WTVFlashrom.js");
const WTVIRC = require(classPath + "/WTVIRC.js");
const WTVFTP = require(classPath + "/WTVFTP.js");
const vm = require('vm');
const debug = require('debug')('minisrv_main');
const express = require('express');

let wtvirc = null;
let wtvnewsserver = null;
let wtvmime = null;
let minisrv_config = null;

process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'))
    .on('uncaughtException', (e => { console.error(e); }));


function shutdown(signal = 'SIGTERM') {
    return (err) => {
        console.log("Received signal", signal);
        if (err) console.error(err.stack || err);
        process.exit(err ? 1 : 0);
    };
}

function getServiceEnabled(service) {
    if (minisrv_config.services[service]) {
        if (minisrv_config.services[service].disabled) return false;
        else return true;
    }
    return false;
}

function getServiceByPort(port) {
    let service_name;
    Object.keys(minisrv_config.services).forEach((k) => {
        if (service_name) return;
        if (minisrv_config.services[k].port) {
            if (port == parseInt(minisrv_config.services[k].port) && getServiceEnabled(k))
                service_name = k;
        }
    })
    return service_name;
}

function getServiceByVHost(vhost) {
    let service_name;
    Object.keys(minisrv_config.services).forEach((k) => {
        if (service_name) return;
        if (minisrv_config.services[k].vhost) {
            if (vhost.toLowerCase() == minisrv_config.services[k].vhost.toLowerCase())
                service_name = k;
        }
    })
    return service_name;
}

function getPortByService(service) {
    if (minisrv_config.services[service]) return minisrv_config.services[service].port;
    else return null;
}

function getSocketServer(socket) {
    let server;

    if (socket._server) {
        if (socket._server._connectionKey) server = socket._server;
    } else if (socket._parent) {
        if (socket._parent._server) {
            if (socket._parent._server._connectionKey) server = socket._parent._server;
        }
    }
    return server;
}

function getSocketDestinationPort(socket) {
    return getServerDestinationPort(getSocketServer(socket));
}

function getServerDestinationPort(server) {
    return parseInt(server._connectionKey.split(':')[2]);
}

function verifyServicePort(service_name, socket) {
    if (!minisrv_config.config.enable_port_isolation) return service_name;
    const server = getSocketServer(socket);
    if (server) {
        const socketPort = getServerDestinationPort(server);
        if (minisrv_config.services[service_name]) {
            if (minisrv_config.services[service_name].port === socketPort) {
                if (minisrv_config.services[service_name].servicevault_dir)
                    return minisrv_config.services[service_name].servicevault_dir;
                else
                    return service_name;
            }
        }
    }
    return false;
}

function getServiceByVaultDir(vault_dir) {
    let res = vault_dir;
    Object.keys(minisrv_config.services).forEach((k) => {
        if (res != vault_dir) return;
        if (minisrv_config.services[k].servicevault_dir) {   
            if (minisrv_config.services[k].servicevault_dir === vault_dir) {
                res = k;
                return false;
            }
        } else {
            if (k === vault_dir) {
                res = k;
                return false;
            }
        }
    });
    return res;
}

function configureService(service_name, service_obj, initial = false) {
    if (service_obj.disabled) return false;

    service_obj.service_name = service_name;
    if (!service_obj.host) {
        service_obj.host = minisrv_config.config.service_ip;
    }
    if (service_obj.port && !service_obj.nobind && initial) {
        if (service_obj.pc_services) pc_ports.push(service_obj.port);
        else ports.push(service_obj.port);
    }

    // minisrv_config service toString
    service_obj.toString = function (overrides) {
        const self = Object.assign({}, this);
        if (overrides != null) {
            if (typeof (overrides) == 'object') {
                Object.keys(overrides).forEach(function (k) {
                    if (k != "exceptions") self[k] = overrides[k];
                });
            }
        }
        let outstr = '';
        if ((service_name == "wtv-star" && self.no_star_word != true) || service_name != "wtv-star") {
            outstr = `wtv-service: name=${self.service_name} host=${self.host} port=${self.port}`;
            if (self.flags) outstr += ` flags=${self.flags}`;
            if (self.connections) outstr += ` connections=${self.connections}`;
        }
        if (service_name == "wtv-star") {
            outstr += `\nwtv-service: name=wtv-* host=${self.host} port=${self.port}`;
            if (self.flags) outstr += ` flags=${self.flags}`;
            if (self.connections) outstr += ` connections=${self.connections}`;
        }
        return outstr;
    }
    minisrv_config.services[service_name] = service_obj;
    return true;
}

// Where we store our session information
var ssid_sessions = [];
var socket_sessions = [];

var ports = [];
var pc_ports = [];

function moveArrayKey(array, from, to) {
    array.splice(to, 0, array.splice(from, 1)[0]);
    return array;
};

function getServiceString(service, overrides = {}) {
    return wtvshared.getServiceString(service, overrides);
}


async function sendRawFile(socket, path) {
    if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Found " + path + " to handle request (Direct File Mode) [Socket " + socket.id + "]");
    const contypes = wtvmime.getContentType(path);
    let headers = "200 OK\n"
    headers += "Content-Type: " + contypes[0] + "\n";
    headers += "wtv-modern-content-type" + contypes[1];
    fs.readFile(path, null, function (err, data) {
        sendToClient(socket, headers, data);
    });
}

var runScriptInVM = function (script_data, user_contextObj = {}, privileged = false, filename = null, debug_name = null) {
    // Here we define the ServiceVault Script Context Object
    // The ServiceVault scripts will only be allowed to access the following functions/variables.
    // Furthermore, only modifications to variables in `updateFromVM` will be saved.
    // Example: an attempt to change "minisrv_config" from a ServiceVault script would be discarded

    // try to build a name for the script's debug() calls
    if (!debug_name) {
        // try to make the debug name
        let debug_name = (filename) ? filename.split(path.sep) : null;
        if (debug_name) {
            if (wtvshared.isConfiguredService(debug_name[debug_name.length - 2]))
                // service:/filename
                debug_name = debug_name[debug_name.length - 2] + ":/" + debug_name[debug_name.length - 1];
            else
                // filename
                debug_name = debug_name[debug_name.length - 1];
        }
    }

    // create global context object
    const contextObj = {
        // node core variables and functions
        "console": console, // needed for per-script debugging
        "__dirname": __dirname, // needed by services such as wtv-flashrom and wtv-disk
        "__filename": (filename) ? filename : null, // path to the script file

        // Our modules
        "wtvmime": wtvmime,
        "http": http,
        "https": https,
        "sharp": sharp,
        "nunjucks": nunjucks,
        "URL": URL,
        "URLSearchParams": URLSearchParams,
        "wtvshared": wtvshared,
        "zlib": zlib,
        "clientShowAlert": clientShowAlert,
        "WTVClientSessionData": WTVClientSessionData,
        "WTVClientCapabilities": WTVClientCapabilities,
        "strftime": require('strftime'),
        "CryptoJS": CryptoJS,
        "crypto": crypto,
        "fs": fs,
        "path": path,

        // Our variables and functions
        "debug": require('debug')((debug_name) ? debug_name : 'service_script'),
        "minisrv_config": minisrv_config,
        "socket": null,
        "headers": null,
        "data": null,
        "request_is_async": false,
        "minisrv_version_string": z_title,
        "getServiceString": getServiceString,
        "sendToClient": sendToClient,
        "service_vaults": service_vaults,
        "service_deps": service_deps,
        "ssid_sessions": ssid_sessions,
        "moveArrayKey": moveArrayKey,
        "cwd": (filename) ? path.dirname(filename) : __dirname, // current working directory        

        // Our prototype overrides
        "Buffer": Buffer,
        "String": String,
        "Object": Object,
        "Array": Array,

        // add any additional context objects provided with function call
        ...user_contextObj
    }

    // per service overrides
    var modules_loaded = [];
    if (minisrv_config.services[contextObj.service_name]) {
        if (minisrv_config.services[contextObj.service_name].modules) {
            var vm_modules = minisrv_config.services[contextObj.service_name].modules;
            Object.keys(vm_modules).forEach(function (k) {
                var module_file = classPath + path.sep + vm_modules[k] + ".js"
                try {
                    contextObj[vm_modules[k]] = require(module_file);
                    modules_loaded.push(module_file)
                } catch (e) {
                    console.error(" *!* Could not load module", module_file, "requested by service", contextObj.service_name, e)
                }
                if (vm_modules[k] === "WTVNews") contextObj['wtvnewsserver'] = wtvnewsserver;
                if (vm_modules[k] === "WTVIRC") contextObj['wtvirc'] = wtvirc;
            })            
        }
    }
    switch (contextObj.service_name) {
        case "wtv-guide":
            // wtv-guide is a special case due to needing this function
            contextObj.wtvguide = new contextObj["WTVGuide"](minisrv_config, ssid_sessions[contextObj.socket.ssid], contextObj.socket, runScriptInVM);
            break;
        case "wtv-admin":
            // wtv-admin needs util.isArray in validation of certain actions.
            contextObj["util"] = require("util");
        case "wtv-1800":
        case "wtv-flashrom":
            // these are special cases because the primary app already loaded this
            contextObj["WTVFlashrom"] = WTVFlashrom;
            break;
    }


    if (contextObj.socket) {
        if (contextObj.socket.id)
            if (socket_sessions[contextObj.socket.id]) contextObj.wtv_encrypted = (socket_sessions[contextObj.socket.id].secure === true);
    }

    if (privileged) {
        contextObj["privileged"] = true;
        contextObj["require"] = require; // this is dangerous but needed for some scripts at this time
        contextObj["SessionStore"] = SessionStore;
        contextObj["socket_sessions"] = socket_sessions;
        contextObj["reloadConfig"] = reloadConfig;
        contextObj["classPath"] = classPath;
    }

    const options = {};
    if (filename) options["filename"] = filename;
    const eval_ctx = new vm.Script(script_data, options)
    try {
        eval_ctx.runInNewContext(contextObj, {
            "breakOnSigint": true
        });
    } catch (e) {
        throw e;
    }

    // unload any loaded modules for this vm
    modules_loaded = null;
    return contextObj; // updated context object with whatever global varibles the script set
}

async function handleCGI(executable, cgi_file, socket, request_headers, vault, service_name, session_data = null, extra_path = "")
{
    const SAFE_ROOT = path.resolve(__dirname);
    vault = path.resolve(vault);
    if (!vault.startsWith(SAFE_ROOT)) {
        console.error("Invalid vault path:", vault);
        var errpage = wtvshared.doErrorPage(403);
        sendToClient(socket, errpage[0], errpage[1]);
        return;
    }
    const env = wtvshared.cloneObj(process.env);
    env.QUERY_STRING = "";
    let request_data = [];
    const split_req = request_headers.request.split(' ');
    request_data.method = split_req[0];
    let request_type = (request_headers.request_url.indexOf(":/")) ? request_headers.request_url.split(":/")[0] : 'http';
    if (request_type != "http" && request_type != "https") {
        request_type = "wtvp";
        request_data.host = minisrv_config.config.service_ip;
        request_data.port = minisrv_config.services[service_name].port;
    } else {
        request_data.host = request_headers.host;
        if (request_data.host.indexOf(':') > 0) {
            request_data.port = request_data.host.split(':')[1];
            request_data.host = request_data.host.split(':')[0];        
        } else {
            if (request_type === "https") request_data.port = 443;
            else request_data.port = 80;
        }
    }
    // CGI/1.1 stuff    
    env.SCRIPT_NAME = cgi_file.replace(vault,"");
    env.REQUEST_URI = request_headers.request_url;
    Object.keys(request_headers.query).forEach(function (k) {
        env.QUERY_STRING += k + "=" + request_headers.query[k] + "&";
    });
    env.QUERY_STRING = env.QUERY_STRING.slice(0, -1);
    env.REQUEST_METHOD = request_data.method;
    env.SERVER_PROTOCOL = (split_req.length >= 3) ? request_headers.request.split(' ')[2] : "HTTP/1.0";
    env.GATEWAY_INTERFACE = "CGI/1.1";
    env.REMOTE_PORT = socket.remotePort;
    env.SCRIPT_FILENAME = cgi_file;
    env.SERVER_ADMIN = minisrv_config.config.service_owner_contact;
    env.CONTEXT_DOCUMENT_ROOT = vault;
    env.CONTEXT_PREFIX = "";
    env.REQUEST_SCHEME = request_type;    
    env.DOCUMENT_ROOT = vault;
    env.REMOTE_ADDR = socket.remoteAddress;
    env.SERVER_PORT = request_data.port;
    env.SERVER_ADDR = request_data.host;
    env.SERVER_NAME = request_data.host;
    if (minisrv_config.services[socket.service_name].hide_minisrv_version) {
        env.SERVER_SOFTWARE = "NodeJS; minisrv";
    } else {
        // Full version
        env.SERVER_SOFTWARE = "NodeJS/"+process.version+"; " + z_cgiver;
    }
    env.SERVER_SIGNATURE = env.SERVER_SOFTWARE;
    env.ALL_RAW = request_headers.raw_headers;
    const raw_header_split = env.ALL_RAW.split("\r\n");
    raw_header_split.forEach(function (header) { 
        if (header) {
            header = header.split(": ");
            if (header[0] == "Request") return;
            if (header[1]) {
                env["HTTP_"+header[0].toUpperCase().replaceAll("-","_")] = header[1];
            }
        }
    });
    env.SCRIPT_URI = request_type + "://" + request_data.host;
    if (request_data.port != 80 && request_data.port != 443 ) env.SCRIPT_URI += ":" + request_data.port;
    env.SCRIPT_URI += env.SCRIPT_NAME;
    env.SCRIPT_URL = env.SCRIPT_NAME;
    env.PHP_SELF = env.SCRIPT_NAME;       
    env.REQUEST_TIME_FLOAT = Math.floor(new Date().getTime() / 1000);
    env.REQUEST_TIME = parseInt(env.REQUEST_TIME_FLOAT);

    env.REDIRECT_STATUS = true;
    if (request_headers['content-type']) env.CONTENT_TYPE = request_headers['content-type'];
    else delete env['CONTENT_TYPE'];
    if (request_headers['content-length']) env.CONTENT_LENGTH = request_headers['content-length'];
    else delete env['CONTENT_LENGTH'];

    var post_data = (request_headers['post_data']) ? request_headers['post_data'] : "";
    env.MINISRV_SESSION_STORE = serialize((session_data) ? session_data.getSessionData() : null);
    env.MINISRV_DATA_STORE = serialize((session_data) ? session_data.get() : null);

    if (extra_path) {
        env.PATH_INFO = extra_path;
        env.PATH_TRANSLATED = extra_path ? vault + extra_path : "";
    } else {
        delete env['PATH_INFO'];
        delete env['PATH_TRANSLATED'];
    }


    const options = { 'cwd': vault, 'env': env, 'timeout': 120000, windowsHide: true, 'uid': process.getuid(), 'gid': process.getgid(), 'stdio': 'overlapped' };
    if (!minisrv_config.config.debug_flags.quiet) (executable == cgi_file) ? console.debug(" * Executing CGI:", executable) : console.debug(" * Executing CGI:", executable, cgi_file);
    const cgi = (executable == cgi_file) ? spawn(cgi_file, options=options) : spawn(executable, [cgi_file], options)
    let data = "";
    let error = "";

    if (request_headers['content-length'] && post_data) {
        cgi.stdin.write(post_data);
        cgi.stdin.end();
    }

    cgi.stdout.on('data', function (dat) {
        data += dat;
    });
    cgi.stderr.on('data', function (dat) {
        error += dat;
    });
    cgi.on('close', function (code) {
        if (code == 0) {
            const stdout = data.split("\r\n\r\n", 2);
            let headers = stdout[0];
            data = stdout[1];
            headers = wtvshared.headerStringToObj(headers, true);
            if (!headers.Status) headers.Status = "200 OK";
            headers['Connection'] = 'keep-alive';
            sendToClient(socket, headers, data);
        }
    });
    cgi.on('error', function (err) {
        console.error("CGI exec error", err);
        const errpage = wtvshared.doErrorPage(500);
        sendToClient(socket, errpage[0], errpage[1]);
    });
}

async function handlePHP(socket, request_headers, php_file, vault, service_name, session_data = null, extra_path = "") {
    await handleCGI(minisrv_config.config.php_binpath, php_file, socket, request_headers, vault, service_name, session_data, extra_path);
}

async function processPath(socket, service_vault_file_path, request_headers = [], service_name, shared_romcache = null, pc_services = false) {
    var headers, data = null;
    let request_is_async = false;
    let service_vault_found = false;
    let service_path = decodeURIComponent(service_vault_file_path);
    let pc_service_name = null;
	const vaults_to_scan = service_vaults;
    let usingSharedROMCache = false;
    const contextObj = {
        "privileged": false,
        "socket": socket,
        "session_data": ssid_sessions[socket.ssid],
        "request_headers": request_headers,
        "service_name": service_name,
        "cwd": __dirname // current working directory, updated below in function
    }

    // Define the variables that we want to assign from the evaluated script.
    // Normally any changes in the VM are discarded, but the rest of this function
    // requires reading some of the data back into the main application.
    // Here we define which ones to read back.
    const updateFromVM = [
        // format: [ ourvarname, scriptsvarname ]
        ["headers", "headers"],                     // we need to be able to read the script's response headers
        ["data", "data"],                           // we need to be able to read the script's response data
        ["request_is_async", "request_is_async"]   // we need to know if the script is async or not
    ]

    if (pc_services) {
        pc_service_name = getServiceByVaultDir(service_name)
        contextObj.pc_service_name = pc_service_name;
        if (minisrv_config.services[pc_service_name].service_vaults) {
            vaults_to_scan = vaults_to_scan.concat(minisrv_config.services[pc_service_name].service_vaults);
        }
    } else {
        updateFromVM.push([`ssid_sessions['${socket.ssid}']`, "session_data"]); // user-specific session data from unprivileged scripts
    }
    let privileged = false;
    if (minisrv_config.services[service_name]) privileged = (minisrv_config.services[service_name].privileged) ? true : false;
    else if (pc_services) privileged = (minisrv_config.services[pc_service_name].privileged) ? true : false;

    if (privileged) {
        updateFromVM.push(["ssid_sessions", "ssid_sessions"]);             // global ssid_sessions object for privileged service scripts, such as wtv-setup, wtv-head-waiter, etc
        updateFromVM.push(["socket_sessions", "socket_sessions"]);         // global socket_sessions object for privileged service scripts, such as wtv-1800, etc
    }

    try {
        vaults_to_scan.forEach(function (service_vault_dir) {
            if (service_vault_found) return;
            if (!usingSharedROMCache) {
                if (minisrv_config.config.SharedROMCache && shared_romcache) {
                    if (shared_romcache.includes(minisrv_config.config.SharedROMCache)) {
                        const service_path_presplit = shared_romcache.split(path.sep);
                        service_path_presplit.splice(service_path_presplit.findIndex((element) => element === 'ROMCache'), 1);
                        const service_path_romcache = service_vault_dir + path.sep + service_path_presplit.join(path.sep);
                        const service_vault_file_path_romcache = wtvshared.returnAbsolutePath(wtvshared.makeSafePath(service_path_romcache));
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
                const service_path_split = service_path.split("/");
                const service_path_request_file = service_path_split[service_path_split.length - 1];
                if (minisrv_config.config.catchall_file_name) {
                    let minisrv_catchall = null;
                    if (minisrv_config.services[service_name]) minisrv_catchall = minisrv_config.services[service_name].catchall_file_name || minisrv_config.config.catchall_file_name || null;
                    else minisrv_catchall = minisrv_config.config.catchall_file_name || null;
                    if (minisrv_catchall) {
                        if (service_path_request_file == minisrv_catchall) {
                            request_is_async = true;
                            var errpage = wtvshared.doErrorPage(401, null, null, pc_services);
                            sendToClient(socket, errpage[0], errpage[1]);
                            return;
                        }
                    }
                }
                if (service_vault_file_path.endsWith("/index")) {
                    service_vault_file_path = getDirectoryIndex(service_vault_file_path.slice(0, -6));
                }
                let is_dir = false;
                let file_exists = false;
    
                if (fs.existsSync(service_vault_file_path)) {
                    file_exists = true;
                    is_dir = fs.lstatSync(service_vault_file_path).isDirectory()
                    contextObj.cwd = service_vault_file_path
                } else {
                    contextObj.cwd = service_vault_file_path.slice(0, service_vault_file_path.lastIndexOf(path.sep));
                }

                if (fs.existsSync(service_vault_file_path + ".txt")) {
                    // raw text format, entire payload expected (headers and content)
                    service_vault_found = true;
                    request_is_async = true;
                    if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Found " + service_vault_file_path + ".txt to handle request (Raw TXT Mode) [Socket " + socket.id + "]");
                    request_headers.service_file_path = service_vault_file_path + ".txt";
                    fs.readFile(service_vault_file_path + ".txt", 'Utf-8', function (err, file_raw) {
                        if (file_raw.indexOf("\n\n") > 0) {
                            // split headers and data by newline (unix format)
                            const file_raw_split = file_raw.split("\n\n");
                            headers = file_raw_split[0];
                            file_raw_split.shift();
                            data = file_raw_split.join("\n");
                        } else if (file_raw.indexOf("\r\n\r\n") > 0) {
                            // split headers and data by carrage return + newline (windows format)
                            const file_raw_split = file_raw.split("\r\n\r\n");
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
                    if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Found " + service_vault_file_path + ".js to handle request (JS Interpreter mode) [Socket " + socket.id + "]");
                    request_headers.service_file_path = service_vault_file_path + ".js";
                    // expose var service_dir for script path to the root of the wtv-service                    
                    socket_sessions[socket.id].starttime = Math.floor(new Date().getTime() / 1000);
                    const script_data = fs.readFileSync(service_vault_file_path + ".js").toString();

                    const vmResults = runScriptInVM(script_data, contextObj, privileged, service_vault_file_path + ".js");
                    // Here we read back certain data from the ServiceVault Script Context Object
                    updateFromVM.forEach((item) => {
                        try {
                            if (typeof vmResults[item[1]] !== "undefined") {
                                // Safely assign without eval
                                if (item[0] === `ssid_sessions['${socket.ssid}']` && privileged) {
                                    ssid_sessions[socket.ssid] = vmResults[item[1]];
                                } else if (item[0] === 'headers') {
                                    headers = vmResults[item[1]];
                                } else if (item[0] === 'data') {
                                    data = vmResults[item[1]];
                                } else if (item[0] === 'request_is_async') {
                                    request_is_async = vmResults[item[1]];
                                } else if (item[0] === 'socket_sessions' && privileged) {
                                    socket_sessions = vmResults[item[1]];
                                }
                            }
                        } catch (e) {
                            console.error("vm readback error", e, item[0] + ' = vmResults[' + item[1] + ']');
                        }
                    })

                    if (request_is_async && !minisrv_config.config.debug_flags.quiet) console.debug(" * Script requested Asynchronous mode");
                } else if (fs.existsSync(service_vault_file_path + ".php") || (service_vault_file_path.endsWith(".php") && fs.existsSync(service_vault_file_path)) || service_vault_file_path.indexOf(".php") > 0) {
                    request_is_async = true;
                    if (minisrv_config.config.php_enabled && minisrv_config.config.php_binpath) {
                        if (fs.existsSync(service_vault_file_path + ".php") || fs.existsSync(service_vault_file_path)) {
                            if (fs.existsSync(service_vault_file_path + ".php")) service_vault_file_path += ".php";
                            service_vault_found = true;
                            handlePHP(socket, request_headers, service_vault_file_path, service_vault_dir + path.sep + service_name, (pc_services) ? pc_service_name : service_name, (pc_services) ? null : ssid_sessions[socket.ssid])
                            return;
                        } else {
                            const extra_path = service_vault_file_path.includes(".php") ? service_vault_file_path.slice(service_vault_file_path.lastIndexOf(".php") + 4) : "";
                            service_vault_file_path = service_vault_file_path.slice(0, service_vault_file_path.indexOf(".php") + 4);
                            if (fs.existsSync(service_vault_file_path)) {
                                service_vault_found = true;
                                handlePHP(socket, request_headers, service_vault_file_path, service_vault_dir + path.sep + service_name, (pc_services) ? pc_service_name : service_name, (pc_services) ? null : ssid_sessions[socket.ssid], extra_path)
                                return;
                            } else if (service_vault_dir == vaults_to_scan[vaults_to_scan.length - 1]) {
                                const errpage = wtvshared.doErrorPage(404, null, null, pc_services);
                                sendToClient(socket, errpage[0], errpage[1]);
                                return;    
                            }
                        }
                    } else {
                        // php is not enabled, don't expose source code
                        service_vault_found = true;
                        const errpage = wtvshared.doErrorPage(403, null, null, pc_services);
                        sendToClient(socket, errpage[0], errpage[1]);
                        return;
                    }
                } else if (fs.existsSync(service_vault_file_path + ".cgi") || (service_vault_file_path.endsWith(".cgi") && fs.existsSync(service_vault_file_path)) || service_vault_file_path.indexOf(".cgi") > 0) {
                    request_is_async = true;
                    if (minisrv_config.config.php_enabled && minisrv_config.config.php_binpath) {
                        if (fs.existsSync(service_vault_file_path + ".cgi") || fs.existsSync(service_vault_file_path)) {
                            if (fs.existsSync(service_vault_file_path + ".cgi")) service_vault_file_path += ".cgi";
                            service_vault_found = true;
                            handleCGI(service_vault_file_path, service_vault_file_path, socket, request_headers, service_vault_dir + path.sep + service_name, (pc_services) ? pc_service_name : service_name, (pc_services) ? null : ssid_sessions[socket.ssid])
                            return;
                        } else {
                            const extra_path = service_vault_file_path.includes(".cgi") ? service_vault_file_path.slice(service_vault_file_path.lastIndexOf(".cgi") + 4) : "";
                            service_vault_file_path = service_vault_file_path.slice(0, service_vault_file_path.indexOf(".cgi") + 4);
                            if (fs.existsSync(service_vault_file_path)) {
                                service_vault_found = true;
                                handleCGI(service_vault_file_path, service_vault_file_path, socket, request_headers, service_vault_dir + path.sep + service_name, (pc_services) ? pc_service_name : service_name, (pc_services) ? null : ssid_sessions[socket.ssid], extra_path)
                                return;
                            } else if (service_vault_dir == vaults_to_scan[vaults_to_scan.length - 1]) {
                                const errpage = wtvshared.doErrorPage(404, null, null, pc_services);
                                sendToClient(socket, errpage[0], errpage[1]);
                                return;    
                            }
                        }
                    } else {
                        // php is not enabled, don't expose source code
                        service_vault_found = true;
                        const errpage = wtvshared.doErrorPage(403, null, null, pc_services);
                        sendToClient(socket, errpage[0], errpage[1]);
                        return;
                    }
                } else if (fs.existsSync(service_vault_file_path + ".html")) {
                    // Standard HTML with no headers, WTV Style
                    service_vault_found = true;
                    if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Found " + service_vault_file_path + ".html to handle request (HTML Mode) [Socket " + socket.id + "]");
                    request_headers.service_file_path = service_vault_file_path + ".html";
                    request_is_async = true;
                    headers = "200 OK\n"
                    headers += "Content-Type: text/html"
                    fs.readFile(service_vault_file_path + ".html", null, function (err, data) {
                        sendToClient(socket, headers, data);
                    });
                } else if (file_exists && !is_dir) {
                    // file exists, read it and return it 
                    service_vault_found = true;
                    request_is_async = true;
                    request_headers.service_file_path = service_vault_file_path;
                    request_headers.raw_file = true;
                    // process flashroms
                    if (wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "rom" || wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "brom") {
                        let bf0app_update = false;
                        const request_path = request_headers.request_url.replace(service_name + ":/", "");
                        const romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
                        const bootver = ssid_sessions[socket.ssid].get("wtv-client-bootrom-version")

                        if ((romtype == "bf0app" || !romtype) && (bootver == "105" || !bootver)) {
                            // assume old classic in flash mode, override user setting and send tellyscript
                            // because it is required to proceed in flash mode
                            bf0app_update = true;
                            ssid_sessions[socket.ssid].set("bf0app_update", bf0app_update);
                        }

                        if (!ssid_sessions[socket.ssid].data_store.WTVFlashrom) {
                            ssid_sessions[socket.ssid].data_store.WTVFlashrom = new WTVFlashrom(minisrv_config, vaults_to_scan, service_name, minisrv_config.services[service_name].use_zefie_server, bf0app_update);
                        }

                        ssid_sessions[socket.ssid].data_store.WTVFlashrom.getFlashRom(request_path, function (data, headers) {
                            sendToClient(socket, headers, data);
                        });

                        // service parsed files, we might not want to expose our service source files so we can protect them with a flag on the first line
                    } else if (wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "js" || wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "txt") {
                        if (wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "js") {
                            wtvshared.getLineFromFile(service_vault_file_path, 0, function (status, line) {
                                if (!status) {
                                    if (line.match(/minisrv\_service\_file.*true/i)) {
                                        request_is_async = true;
                                        var errpage = wtvshared.doErrorPage(403, null, null, pc_services);
                                        sendToClient(socket, errpage[0], errpage[1]);
                                        return;
                                    } else {
                                        sendRawFile(socket, service_vault_file_path);
                                    }
                                } else {
                                    request_is_async = true;
                                    var errpage = wtvshared.doErrorPage(400, null, null, pc_services);
                                    sendToClient(socket, errpage[0], errpage[1]);
                                    return;
                                }
                            });
                        }

                        if (wtvshared.getFileExt(service_vault_file_path).toLowerCase() == "txt") {
                            wtvshared.getLineFromFile(service_vault_file_path, 0, function (status, line) {
                                if (!status) {
                                    if (line.match(/^#!minisrv/i)) {
                                        request_is_async = true;
                                        var errpage = wtvshared.doErrorPage(403, null, null, pc_services);
                                        sendToClient(socket, errpage[0], errpage[1]);
                                        return;
                                    } else {
                                        sendRawFile(socket, service_vault_file_path);
                                    }
                                } else {
                                    request_is_async = true;
                                    var errpage = wtvshared.doErrorPage(400, null, null, pc_services);
                                    sendToClient(socket, errpage[0], errpage[1]);
                                    return;
                                }
                            });
                        }
                    } else {
                        // not a potential service file, so safe to send
                        sendRawFile(socket, service_vault_file_path);
                    }
                } else {
                    // look for a catchall in the current path and all parent paths up until the service root
                    const service_config = ((pc_services) ? minisrv_config.services[pc_service_name] : minisrv_config.services[service_name]) || {};
                    if (minisrv_config.config.catchall_file_name || service_config['catchall_file_name']) {
                        const minisrv_catchall_file_name = service_config['catchall_file_name'] || minisrv_config.config.catchall_file_name || null;
                        if (minisrv_catchall_file_name) {
                            const service_check_dir = service_vault_file_path.split(path.sep);
                            service_check_dir.pop(); // pop filename

                            while (service_check_dir.join(path.sep) != service_vault_dir && service_check_dir.length > 0) {
                                const catchall_file = service_check_dir.join(path.sep) + path.sep + minisrv_catchall_file_name;
                                if (fs.existsSync(catchall_file)) {

                                    service_vault_found = true;
                                    if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Found catchall at " + catchall_file + " to handle request (JS Interpreter Mode) [Socket " + socket.id + "]");
                                    request_headers.service_file_path = catchall_file;
                                    if (catchall_file.endsWith(".js")) {
                                        const script_data = fs.readFileSync(catchall_file).toString();
                                        const vmResults = runScriptInVM(script_data, contextObj, privileged, catchall_file);
                                        updateFromVM.forEach((item) => {
                                            // Here we read back certain data from the ServiceVault Script Context Object
                                            try {
                                                if (typeof vmResults[item[1]] !== "undefined") {
                                                    // Safely assign without eval
                                                    if (item[0] === `ssid_sessions['${socket.ssid}']` && privileged) {
                                                        ssid_sessions[socket.ssid] = vmResults[item[1]];
                                                    } else if (item[0] === 'headers') {
                                                        headers = vmResults[item[1]];
                                                    } else if (item[0] === 'data') {
                                                        data = vmResults[item[1]];
                                                    } else if (item[0] === 'request_is_async') {
                                                        request_is_async = vmResults[item[1]];
                                                    } else if (item[0] === 'socket_sessions' && privileged) {
                                                        socket_sessions = vmResults[item[1]];
                                                    }
                                                }
                                            } catch (e) {
                                                console.error("vm readback error", e, item[0] + ' = vmResults[' + item[1] + ']');
                                            }
                                        });
                                    } else if (catchall_file.endsWith(".php")) {
                                        if (minisrv_config.config.php_enabled && minisrv_config.config.php_binpath) {
                                            request_is_async = true;
                                            const extra_path = service_check_dir.join(path.sep) + path.sep + request_headers.request_url.replace(service_name + ":/", "");
                                            if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Found catchall at " + catchall_file + " to handle request (CGI Interpreter Mode) [Socket " + socket.id + "]");
                                            handlePHP(socket, request_headers, catchall_file, service_vault_dir + path.sep + service_name, (pc_services) ? pc_service_name : service_name, (pc_services) ? null : ssid_sessions[socket.ssid], extra_path)
                                        } else {
                                            // php is not enabled, don't expose source code
                                            const errpage = wtvshared.doErrorPage(403, null, null, pc_services);
                                            sendToClient(socket, errpage[0], errpage[1]);
                                            return;
                                        }
                                    } else if (catchall_file.endsWith(".cgi")) {
                                        if (minisrv_config.config.cgi_enabled) {
                                            request_is_async = true;
                                            const extra_path = service_check_dir.join(path.sep) + path.sep + request_headers.request_url.replace(service_name + ":/", "");
                                            if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Found catchall at " + catchall_file + " to handle request (CGI Interpreter Mode) [Socket " + socket.id + "]");
                                            handleCGI(catchall_file, catchall_file, socket, request_headers, service_vault_dir + path.sep + service_name, (pc_services) ? pc_service_name : service_name, (pc_services) ? null : ssid_sessions[socket.ssid], extra_path)
                                        } else {
                                            // cgi is not enabled, don't expose source code
                                            const errpage = wtvshared.doErrorPage(403, null, null, pc_services);
                                            sendToClient(socket, errpage[0], errpage[1]);
                                            return;
                                        }
                                    }

                                    if (request_is_async && !minisrv_config.config.debug_flags.quiet) console.debug(" * Script requested Asynchronous mode");
                                    break;
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
        const errpage = wtvshared.doErrorPage(400, null, null, pc_services);
        headers = errpage[0];
        data = errpage[1];
        if (pc_services) {
            if (minisrv_config.services[pc_service_name].show_verbose_errors)
                data += "<br><br>The interpreter said:<br><pre>" + e.stack + "</pre>";
        }
        console.error(" * Scripting error:", e);
    }
    if (!request_is_async) {
        if (!service_vault_found) {
            console.error(" * Could not find a Service Vault for " + service_name + ":/" + service_path.replace(service_name + path.sep, "").replace(path.sep, '/'));
            const errpage = wtvshared.doErrorPage(404, null, null, pc_services);
            headers = errpage[0];
            data = errpage[1];
        }
        if (headers == null && !request_is_async) {
            const errpage = wtvshared.doErrorPage(400, null, null, pc_services);
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

function getDirectoryIndex(svpath) {
    if (fs.existsSync(svpath + path.sep + "index.js")) return svpath + path.sep + "index";
    else if (fs.existsSync(svpath + path.sep + "index.html")) return svpath + path.sep + "index.html";
    else if (fs.existsSync(svpath + path.sep + "index.htm")) return svpath + path.sep + "index.htm";
    else if (fs.existsSync(svpath + path.sep + "index.txt")) return svpath + path.sep + "index.txt";  
    else if (fs.existsSync(svpath + path.sep + "index.php")) return svpath + path.sep + "index.php";
    else if (fs.existsSync(svpath + path.sep + "index.cgi")) return svpath + path.sep + "index.cgi";
    else return svpath;
}

async function processURL(socket, request_headers, pc_services = false) {
    let shortURL, headers, data, service_name;
    let original_service_name = "";
    let allow_double_slash = false, enable_multi_query = false, use_external_proxy = false;
    request_headers.query = {};

    if (request_headers.request_url) {
        service_name = socket.service_name || verifyServicePort(unescape(request_headers.request_url).split(':/')[0], socket);
        if (minisrv_config.services[service_name]) {
            allow_double_slash = minisrv_config.services[service_name].allow_double_slash || false;
            enable_multi_query = minisrv_config.services[service_name].enable_multi_query || false;
            use_external_proxy = minisrv_config.services[service_name].use_external_proxy || false;
        }
        if (pc_services) {           
            original_service_name = socket.service_name; // store service name
            service_name = verifyServicePort(socket.service_name, socket); // get the actual ServiceVault path
        }
        if (request_headers.request_url.includes('?')) {
            shortURL = request_headers.request_url.split('?')[0];
            const qraw = request_headers.request_url.split('?')[1];
            if (qraw) {
                qraw.split("&").forEach(param => {
                    const qraw_split = param.split("=");
                    if (qraw_split.length === 2) {
                        const k = qraw_split[0];
                        const value = unescape(qraw_split[1].replace(/\+/g, "%20"));
                        if (request_headers.query[k] && enable_multi_query) {
                            console.log("yes")
                            if (typeof request_headers.query[k] === 'string') {
                                request_headers.query[k] = [request_headers.query[k]];
                            }
                            request_headers.query[k].push(value);
                        } else {
                            request_headers.query[k] = value;
                        }
                    } else if (param.length === 1) {
                        request_headers.query[param] = null;
                    }
                });
            }
        } else {
            shortURL = unescape(request_headers.request_url);
        }

        if (request_headers['wtv-request-type']) socket_sessions[socket.id].wtv_request_type = request_headers['wtv-request-type'];

        if (request_headers.post_data) {
            let post_data_string = null;
            try {
                post_data_string = request_headers.post_data.toString(CryptoJS.enc.Utf8); // if not text this will probably throw an exception
                if (post_data_string) {
                    if (post_data_string.indexOf('=')) {
                        if (post_data_string.indexOf('&')) {
                            const qraw = post_data_string.split('&');
                            if (qraw.length) {
                                for (let i = 0; i < qraw.length; i++) {
                                    const qraw_split = qraw[i].split("=");
                                    if (qraw_split.length === 2) {
                                        const k = qraw_split[0];
                                        data = decodeURIComponent(qraw[i].split("=")[1].replace(/\+/g, "%20"));
                                        if (request_headers.query[k]) {
                                            if (typeof request_headers.query[k] === 'string') {
                                                const keyarray = [request_headers.query[k]];
                                                request_headers.query[k] = keyarray;
                                            }
                                            if (wtvshared.isASCII(data)) request_headers.query[k].push(data);
                                            else request_headers.query[k].push(wtvshared.urlDecodeBytes(qraw[i].split("=")[1].replace(/\+/g, "%20")));
                                        } else {
                                            if (wtvshared.isASCII(data)) request_headers.query[k] = data;
                                            else request_headers.query[k] = wtvshared.urlDecodeBytes(qraw[i].split("=")[1].replace(/\+/g, "%20"));
                                        }
                                    }
                                }
                            }
                        } else {
                            const qraw_split = post_data_string.split("=");
                            if (qraw_split.length == 2) {
                                const k = qraw_split[0];
                                data = decodeURIComponent(qraw_split[1].replace(/\+/g, "%20"));
                                if (request_headers.query[k]) {
                                    if (typeof request_headers.query[k] === 'string') {
                                        const keyarray = [request_headers.query[k]];
                                        request_headers.query[k] = keyarray;
                                    }
                                    if (wtvshared.isASCII(data)) request_headers.query[k].push(data);
                                    else request_headers.query[k].push(wtvshared.urlDecodeBytes(qraw_split[1].replace(/\+/g, "%20")));
                                } else {
                                    if (wtvshared.isASCII(data)) request_headers.query[k] = data;
                                    else request_headers.query[k] = wtvshared.urlDecodeBytes(qraw_split[1].replace(/\+/g, "%20"));
                                }
                            }
                        }
                    }
                }
            } catch (e) {
               
            }
        }
        if ((!shortURL.startsWith("http") && !shortURL.startsWith("ftp") && shortURL.includes(":") && !shortURL.includes(":/"))) {
            // Apparently it is within WTVP spec to accept urls without a slash (eg wtv-home:home)
            // Here, we just reassemble the request URL as if it was a proper URL (eg wtv-home:/home)
            // we will allow this on any service except http(s) and ftp
            const shortURL_split = shortURL.split(':');
            const shortURL_service_name = shortURL_split[0];
            shortURL_split.shift();
            const shortURL_service_path = shortURL_split.join(":");
            shortURL = shortURL_service_name + ":/" + shortURL_service_path;
        } 

        if (socket.ssid) {
            // skip box auth tests for pc mode

            // check security
            if (!ssid_sessions[socket.ssid].isAuthorized(shortURL)) {
                // lockdown mode and URL not authorized
                headers = "300 Unauthorized\n";
                headers += "Location: " + minisrv_config.config.unauthorized_url + "\n";
                headers += "minisrv-no-mail-count: true\n";
                data = "";
                sendToClient(socket, headers, data);
                console.warn(" * Lockdown rejected request for " + shortURL + " on socket ID", socket.id);
                return;
            }

            if (ssid_sessions[socket.ssid].isRegistered() && !ssid_sessions[socket.ssid].isUserLoggedIn()) {
                if (!ssid_sessions[socket.ssid].isAuthorized(shortURL, 'login')) {
                    // user is not fully logged in, and URL not authorized
                    headers = "300 Unauthorized\n";
                    headers += "Location: client:relogin\n";
                    headers += "minisrv-no-mail-count: true\n";
                    data = "";
                    sendToClient(socket, headers, data);
                    console.warn(" * Incomplete login rejected request for " + shortURL + " on socket ID", socket.id);
                    return;
                }
            }

            if (ssid_sessions[socket.ssid].get("wtv-my-disk-sucks-sucks-sucks") && !ssid_sessions[socket.ssid].get("bad_disk_shown")) {
                if (!ssid_sessions[socket.ssid].baddisk) {
                    // psuedo lockdown, will unlock on the disk warning page, but prevents minisrv access until they read the error
                    ssid_sessions[socket.ssid].lockdown = true;
                    ssid_sessions[socket.ssid].baddisk = true;
                }
            }

            if (!ssid_sessions[socket.ssid].isUserLoggedIn() && !ssid_sessions[socket.ssid].isAuthorized(shortURL, 'login')) {
                // lockdown mode and URL not authorized
                headers = `300 Unauthorized
Location: ${minisrv_config.config.unauthorized_url}
minisrv-no-mail-count: true`;
                data = "";
                sendToClient(socket, headers, data);
                console.warn(" * Rejected login bypass request for " + shortURL + " on socket ID", socket.id);
                return;
            }
        }

        if (pc_services) {
            const ssl = (socket.ssl) ? true : false;
            if (original_service_name == service_name) console.log(" * " + ((ssl) ? "SSL " : "") + "PC request on service " + service_name + " for " + request_headers.request_url, 'on', socket.id);
            else console.log(" * " + ((ssl) ? "SSL " : "") + "PC request on service " + original_service_name + " (Service Vault " + service_name + ") for " + request_headers.request_url, 'on', socket.id);
        } 

        if ((shortURL.includes(':/')) && (!shortURL.includes('://') || (shortURL.includes('://') && allow_double_slash))) {
            let ssid = socket.ssid;
            if (ssid == null) {
                // prevent possible injection attacks via malformed SSID and filesystem SessionStore
                ssid = wtvshared.makeSafeSSID(request_headers["wtv-client-serial-number"]);
                if (ssid == "") ssid = null;
            }
            if (!pc_services) {
                let reqverb = "Request";
                if (request_headers.encrypted || request_headers.secure) reqverb = "Encrypted " + reqverb;
                if (ssid != null) {
                    console.log(" * " + reqverb + " for " + request_headers.request_url + " from WebTV SSID " + (await wtvshared.filterSSID(ssid)), 'on', socket.id);
                } else {
                    console.log(" * " + reqverb + " for " + request_headers.request_url, 'on', socket.id);
                }
                
                if (!service_name) {
                    // detect if client is trying to load wtv-star due to client-perceived error
                    if (getSocketDestinationPort(socket) == getPortByService("wtv-star")) {
                        // is wtv-star
                        if (minisrv_config.config.debug_flags.debug) console.debug(" * client requested", shortURL, "on wtv-star port", getSocketDestinationPort(socket))
                        shortURL = "wtv-star:/star";
                        service_name = "wtv-star";
                    } else {
                        // is actually a request on then wrong port
                        const errpage = wtvshared.doErrorPage(500, null, null, pc_services);
                        socket_sessions[socket.id].close_me = true;
                        sendToClient(socket, errpage[0], errpage[1]);
                        return
                    }
                }
            }
            const urlToPath = wtvshared.fixPathSlashes(service_name + path.sep + shortURL.split(':/')[1]);
            let shared_romcache = null;
            if ((shortURL.includes(":/ROMCache/") || shortURL.includes("://ROMCache/")) && minisrv_config.config.enable_shared_romcache) {
                shared_romcache = wtvshared.fixPathSlashes(minisrv_config.config.SharedROMCache + path.sep + shortURL.split(':/')[1]);
            } 
            if (minisrv_config.config.debug_flags.show_headers) console.debug(" * Incoming", (pc_services) ? "HTTP" : "WTVP", "headers on", (pc_services) ? "HTTP" : "WTVP", "socket ID", socket.id, await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers))));
            else debug(" * Incoming", (pc_services) ? "HTTP" : "WTVP", "headers on", (pc_services) ? "HTTP" : "WTVP", "socket ID", socket.id, await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers))));

            socket_sessions[socket.id].request_headers = request_headers;
            processPath(socket, urlToPath, request_headers, service_name, shared_romcache, pc_services);
        } else if (shortURL.includes('http://') || shortURL.includes('https://') || (use_external_proxy === true && shortURL.includes(service_name + "://")) && !pc_services) {
            doHTTPProxy(socket, request_headers);
        } else if (shortURL.startsWith('ftp://')) {
            if (minisrv_config.config.debug_flags.show_headers) console.debug(" * Incoming FTP request on WTVP socket ID", socket.id, await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers))));
            const wtvftp = new WTVFTP(wtvshared, sendToClient);
            wtvftp.handleFTPRequest(socket, request_headers);
        } else if (shortURL.indexOf('file://') >= 0) {
            shortURL = shortURL.replace("file://",'').replace("romcache", "ROMCache");
            service_name = "wtv-star";
            const urlToPath = wtvshared.fixPathSlashes(service_name + path.sep + shortURL);
            processPath(socket, urlToPath, request_headers, service_name, shared_romcache, pc_services);
        } else if (pc_services) {
            // if a directory, request index
            if (shortURL.indexOf("/ROMCache/") == 0 && minisrv_config.config.enable_shared_romcache) {
                shared_romcache = wtvshared.fixPathSlashes(minisrv_config.config.SharedROMCache + path.sep + shortURL.split('/')[1] + '/' + shortURL.split('/')[2]);
            }
            if (shortURL.endsWith("/")) shortURL += "index";
            const urlToPath = wtvshared.fixPathSlashes(service_name + path.sep + shortURL);
            processPath(socket, urlToPath, request_headers, service_name, shared_romcache, pc_services);
        } else {
            if (request_headers.request.indexOf("HTTP/1.0") > 0) {
                // webtv in HTTP/1.0 mode, try to kick it back to WTVP
                if (minisrv_config.config.debug_flags.show_headers) console.debug(" * Incoming HTTP/1.0 headers on WTVP socket ID", socket.id, await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers))));
                else debug(" * Incoming HTTP/1.0 headers on WTVP socket ID", socket.id, await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers))));

                const errpage = wtvshared.doErrorPage(500, null, null, false, true);
                headers = errpage[0];
                data = ''
                socket_sessions[socket.id].close_me = true;
                sendToClient(socket, headers, data);
            } else {
                // error reading headers (no request_url provided, or PC on WTVP port)
                if (minisrv_config.config.debug_flags.show_headers) console.debug(" * Incoming Invalid headers on WTVP socket ID", socket.id, await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers))));
                else debug(" * Incoming Invalid headers on WTVP socket ID", socket.id, await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers))));

                const errpage = wtvshared.doErrorPage(500, null, null, true, false);
                headers = errpage[0];
                data = ''
                socket_sessions[socket.id].close_me = true;
                sendToClient(socket, headers, data);
            }
        }
    }
}

function handleProxy(socket, request_type, request_headers, res, data) {
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
    const headers = wtvshared.stripHeaders(res.headers, [
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
            minisrv_config.services[request_type]?.use_minifying_proxy === true) {
            try {
                const WTVMinifyingProxy = require('./includes/classes/WTVMinifyingProxy.js');
                const proxy = new WTVMinifyingProxy(minisrv_config);
                
                let htmlContent = Buffer.concat(data).toString();
                
                // Apply WebTV-specific transformations
                const transformOptions = {
                    removeImages: minisrv_config.services[request_type]?.remove_images || false,
                    maxImageWidth: minisrv_config.services[request_type]?.max_image_width || 400,
                    simplifyTables: minisrv_config.services[request_type]?.simplify_tables !== false,
                    maxWidth: minisrv_config.services[request_type]?.max_width || 544,
                    preserveJellyScript: minisrv_config.services[request_type]?.preserve_jellyscript !== false,
                    jellyScriptMaxSize: minisrv_config.services[request_type]?.jellyscript_max_size || 8192
                };
                
                htmlContent = proxy.transformForWebTV(htmlContent, originalUrl, transformOptions);
                data = [Buffer.from(htmlContent)];
                
                if (minisrv_config.config.verbosity >= 3) {
                    console.log(` * HTML transformed for WebTV compatibility (${originalUrl})`);
                }
            } catch (err) {
                console.warn(` * HTML transformation failed: ${err.message}`);
            }
        }
        
        if (request_type != "http" && request_type != "https") {
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
    if (minisrv_config.services['http']['wtv-explanation']) {
        if (minisrv_config.services['http']['wtv-explanation'][res.statusCode]) {
            headers['wtv-explanation-url'] = minisrv_config.services['http']['wtv-explanation'][res.statusCode];
        }
    }
    const data_hex = Buffer.concat(data).toString('hex');
    if (data_hex.startsWith("0d0a0d0a")) data_hex = data_hex.slice(8);
    if (data_hex.startsWith("0a0d0a")) data_hex = data_hex.slice(6);
    if (data_hex.startsWith("0a0a")) data_hex = data_hex.slice(4);
    sendToClient(socket, headers, Buffer.from(data_hex, 'hex'));
}

async function doHTTPProxy(socket, request_headers) {
    // detect protocol name
    const idx = request_headers.request_url.indexOf('/') - 1;

    const request_type = request_headers.request_url.slice(0, idx);
    if (minisrv_config.config.debug_flags.show_headers) console.debug(request_type.toUpperCase() + " Proxy: Client Request Headers on socket ID", socket.id, (await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers)))));
    else debug(request_type.toUpperCase() + " Proxy: Client Request Headers on socket ID", socket.id, (await wtvshared.decodePostData(await wtvshared.filterRequestLog(await wtvshared.filterSSID(request_headers)))));
    let proxy_agent;

    switch (request_type) {
        case "https":
            proxy_agent = https;
            break;
        case "http":
        case "proto":
            proxy_agent = http;
            break;
    }

    let request_data = [];
    let data = [];

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
    for (var i = 0; i < 3; i++) request_url_split.shift();
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
                const { SocksProxyAgent }= require('socks-proxy-agent');
                options.agent = new SocksProxyAgent("socks://" + (minisrv_config.services[request_type].external_proxy_host || "127.0.0.1") + ":" + minisrv_config.services[request_type].external_proxy_port);
                options.agents = {
                    "http": options.agent,
                    "https": options.agent
                }
            } else {
                // configure connection to remote http proxy
                proxy_agent = http;
                options.host = minisrv_config.services[request_type].external_proxy_host;
                options.port = minisrv_config.services[request_type].external_proxy_port;
                options.path = request_headers.request.split(' ')[1];
                options.headers.Host = request_data.host + ":" + request_data.port;
                if (minisrv_config.services[request_type].replace_protocol) {
                    options.path = options.path.replace(request_type, minisrv_config.services[request_type].replace_protocol);
                }
            }
            if (minisrv_config.services[request_type].external_proxy_is_http1) {
                options.insecureHTTPParser = true;
                options.headers.Connection = 'close'
            }
        }
        const req = proxy_agent.request(options, function (res) {
            let total_data = 0;

            res.on('data', d => {
                data.push(d);
                total_data += d.length;
                if (total_data > 1024 * 1024 * parseFloat(minisrv_config.services[request_type].max_response_size || 16)) {
                    console.warn(` * Response data exceeded ${minisrv_config.services[request_type].max_response_size || 16}MB limit, destroying...`);
                    res.destroy();
                    const errpage = wtvshared.doErrorPage(400, "The item chosen is too large to be used.");
                    sendToClient(socket, errpage[0], errpage[1]);
                }
            })

            res.on('error', function (err) {
                // hack for Protoweb ECONNRESET
                if (minisrv_config.services[request_type].external_proxy_is_http1 && data.length > 0) {
                    handleProxy(socket, request_type, request_headers, res, data);
                } else {
                    console.error(" * Unhandled Proxy Request Error:", err);
                }
            });

            res.on('end', function () {
                // For when http proxies behave correctly
                if (!minisrv_config.services[request_type].external_proxy_is_http1 || data.length > 0) {
                    handleProxy(socket, request_type, request_headers, res, data);
                }
            });
        }).on('error', function (err) {
                // severe errors, such as unable to connect.
            if (err.code == "ENOTFOUND" || err.message.indexOf("HostUnreachable") > 0) {
                const errpage = wtvshared.doErrorPage(400, `The publisher <b>${request_data.host}</b> is unknown.`);
                sendToClient(socket, errpage[0], errpage[1]);
            } else {
                if (minisrv_config.services[request_type].external_proxy_is_http1) {
                    handleProxy(socket, request_type, request_headers, res, data);
                } else {
                    console.error(" * Unhandled Proxy Request Error:", err);
                    const errpage = wtvshared.doErrorPage(400);
                    sendToClient(socket, errpage[0], errpage[1]);
                }
            }
           
        });
        if (request_headers.post_data) {
            req.write(Buffer.from(request_headers.post_data.toString(CryptoJS.enc.Hex), 'hex'), function () {
                req.end();
            });
        } else {
            req.end();
        }
    }
}

async function sendToClient(socket, headers_obj, data = null) {
    let headers = "";
    let content_length = 0;
    const eol = "\n";
    let timezone = "-0000";
    let wtv_connection_close = false;

    if (typeof (data) === 'undefined' || data === null) data = '';
    if (typeof (headers_obj) === 'string') {
        // string to header object
        headers_obj = wtvshared.headerStringToObj(headers_obj, true);
    }
    if (!socket_sessions[socket.id]) {
        if (socket.destroy) socket.destroy();
        return;
    }
    if (!socket.res) {
        wtv_connection_close = (headers_obj["wtv-connection-close"]) ? true : false;
        if (typeof (headers_obj["wtv-connection-close"]) != 'undefined') delete headers_obj["wtv-connection-close"];

        if (!headers_obj['minisrv-no-mail-count']) {
            if (ssid_sessions[socket.ssid]) {
                if (ssid_sessions[socket.ssid].isRegistered()) {
                    if (!ssid_sessions[socket.ssid].isUserLoggedIn()) {
                        // not logged in probe all users
                        headers_obj['wtv-mail-count'] = ssid_sessions[socket.ssid].getAccountTotalUnreadMessages();
                    } else if (ssid_sessions[socket.ssid].mailstore) {
                        // logged in
                        headers_obj['wtv-mail-count'] = ssid_sessions[socket.ssid].mailstore.countUnreadMessages(0);
                    }
                    timezone = ssid_sessions[socket.ssid].getSessionData("timezone") || "-0000"
                }
            }
        } else {
            if (headers_obj['wtv-mail-count']) delete headers_obj['wtv-mail-count'];
            delete headers_obj['minisrv-no-mail-count'];
        }
    }

    // add Connection header if missing, default to Keep-Alive
    if (!headers_obj.Connection) {
        headers_obj.Connection = "Keep-Alive";
        headers_obj = wtvshared.moveObjectKey('Connection', 'Status', headers_obj);
    }

    if (typeof data.length !== 'undefined') {
        content_length = data.length;
    } else if (typeof data.byteLength !== 'undefined') {
        content_length = data.byteLength;
    }

    // fix captialization
    if (headers_obj["raw_headers"]) {
        delete headers_obj["raw_headers"];
    }
    const contype_key = wtvshared.getCaseInsensitiveKey('content-type', headers_obj);
    if (contype_key) {
        if (socket.ssid && headers_obj[contype_key].indexOf(";") > 0) {
            // WebTV client
            headers_obj[contype_key] = headers_obj[contype_key].split(";")[0];
        }
        if (contype_key != "Content-type") {        
            headers_obj["Content-type"] = headers_obj[contype_key];
            delete headers_obj[contype_key];
        }
    }

    // Add last modified if not a dynamic script
    if (socket_sessions[socket.id]) {
        if (socket_sessions[socket.id].request_headers) {
            if (socket_sessions[socket.id].request_headers.service_file_path) {
                // Don't change Last-modified header if provided already
                if (!headers['Last-Modified']) {
                    // Only add the header if not a js, php, or cgi file                    
                    if (wtvshared.getFileExt(socket_sessions[socket.id].request_headers.service_file_path).toLowerCase() !== "js" || 
                        wtvshared.getFileExt(socket_sessions[socket.id].request_headers.service_file_path).toLowerCase() !== "php" ||
                        wtvshared.getFileExt(socket_sessions[socket.id].request_headers.service_file_path).toLowerCase() !== "cgi" ||
                        socket_sessions[socket.id].request_headers.raw_file === true) {
                            if (socket.res) {
                                var last_modified_formatted = wtvshared.getFileLastModifiedUTCString(socket_sessions[socket.id].request_headers.service_file_path);
                            } else {
                                var last_modified = wtvshared.getFileLastModifiedUTCObj(socket_sessions[socket.id].request_headers.service_file_path);
                                var strftime = require('strftime');
                                var strf = strftime.timezone(timezone);
                                var last_modified_formatted = strf("%a, %d %b %Y %H:%M:%S", last_modified);                             
                            }
                        if (last_modified_formatted) headers_obj["Last-Modified"] = last_modified_formatted;
                    }
                }
            }
        }
    }


    // if client can do compression, see if its worth enabling
    // small files actually get larger, so don't compress them
    let compression_type = 0;
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

    // webtvism
    if (headers_obj["minisrv-force-compression"]) {
        compression_type = parseInt(headers_obj["minisrv-force-compression"]);
        delete headers_obj["minisrv-force-compression"];
    }

    if (socket.res) { // pc mode with response object available
        if (compression_type == 1) compression_type = 2; // wtv-lzpf not supported in pc mode
    }

    // compress if needed
    if (compression_type > 0 && content_length > 0 && headers_obj['Status'].startsWith("200")) {
        const uncompressed_content_length = content_length;
        switch (compression_type) {
            case 1:
                // wtv-lzpf implementation
                headers_obj["wtv-lzpf"] = 0;
                const wtvcomp = new LZPF();
                data = wtvcomp.compress(data);
                wtvcomp = null; // Makes the garbage gods happy so it cleans up our mess
                break;

            case 2:
                // zlib DEFLATE implementation
                const zlib_options = { 'level': 9 };
                if (uncompressed_content_length > 4194304) zlib_options.strategy = 2;
                headers_obj['Content-Encoding'] = 'deflate';
                data = zlib.deflateSync(data, zlib_options);
                break;
        }

        let compressed_content_length = 0;
        if (content_length == 0 || compression_type != 1) {
            // ultimately send compressed content length
            compressed_content_length = data.byteLength;
            content_length = compressed_content_length;
        } else {
            // ultimately send original content length if lzpf
            compressed_content_length = data.byteLength;
        }
        const compression_ratio = (uncompressed_content_length / compressed_content_length).toFixed(2);
        const compression_percentage = ((1 - (compressed_content_length / uncompressed_content_length)) * 100).toFixed(1);
        if (uncompressed_content_length != compressed_content_length) if (minisrv_config.config.debug_flags.debug) console.debug(" # Compression stats: Orig Size:", uncompressed_content_length, "~ Comp Size:", compressed_content_length, "~ Ratio:", compression_ratio, "~ Saved:", compression_percentage.toString() + "%");
    }

    if (!socket.res) {
        // encrypt if needed
        if (socket_sessions[socket.id].secure == true && !socket_sessions[socket.id].do_not_encrypt) {
            headers_obj["wtv-encrypted"] = 'true';
            headers_obj = wtvshared.moveObjectKey('wtv-encrypted', 'Connection', headers_obj);
            if (content_length > 0 && socket_sessions[socket.id].wtvsec) {
                if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Encrypting response to client ...")
                var enc_data = socket_sessions[socket.id].wtvsec.Encrypt(1, data);
                data = enc_data;
            }
        }

        if (socket_sessions[socket.id].do_not_encrypt) {
            if (headers_obj["wtv-encrypted"]) delete headers_obj["wtv-encrypted"];
            if (headers_obj["secure"]) delete headers_obj["secure"];
        }
    }


    // calculate content length
    // make sure we are using our Content-length and not one set in a script.
    if (headers_obj["Content-Length"]) delete headers_obj["Content-Length"];
    if (headers_obj["Content-length"]) delete headers_obj["Content-length"];


    headers_obj["Content-length"] = content_length;

    // if force-content-length is defined, use it for webtvisms
    if (headers_obj["minisrv-force-content-length"]) {
        headers_obj["Content-length"] = headers_obj["minisrv-force-content-length"];
        delete headers_obj["minisrv-force-content-length"];
    }

    if (!socket.res) {
        // Send wtv-ticket if it has been flagged as updated
        if (ssid_sessions[socket.ssid]) {
            if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
                if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64) {
                    if (ssid_sessions[socket.ssid].data_store.wtvsec_login.update_ticket) {
                        headers_obj["wtv-ticket"] = ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64;
                        headers_obj = wtvshared.moveObjectKey("wtv-ticket", "Connection", headers_obj);
                        ssid_sessions[socket.ssid].data_store.wtvsec_login.update_ticket = false;
                    }
                }
            }
        }
    }

    // rearranges headers for WebTV (and zefie's OCD)
    headers_obj = wtvshared.moveObjectKey("Status", 0, headers_obj); // move Status to top
    headers_obj = wtvshared.moveObjectKey("Connection", 1, headers_obj); // move Connection to second
    headers_obj = wtvshared.moveObjectKey("Content-type", -1, headers_obj); // move Content-type to last
    headers_obj = wtvshared.moveObjectKey("Content-length", "Content-type", headers_obj); // move Content-length to before Content-type

    // remove x-powered-by header if client is WebTV
    let xpower = wtvshared.getCaseInsensitiveKey("x-powered-by", headers_obj);
    if (!xpower && socket.service_name) {
        // add X-Powered-By header if not WebTV and not already set
        xpower = 'X-Powered-By';
        if (minisrv_config.services[socket.service_name].hide_minisrv_version) {   
            // Don't report version         
            if (!socket.ssid) headers_obj[xpower] = "NodeJS; minisrv";
        } else {
            // Full version
            if (!socket.ssid) headers_obj[xpower] = "NodeJS/"+process.version+"; " + z_cgiver;
        }
    } else {
        // delete if webtv
        if (socket.ssid) delete headers_obj[xpower];
        if (socket.service_name) {
            if (minisrv_config.services[socket.service_name].hide_minisrv_version) {   
                // Don't report version         
                if (!socket.ssid) headers_obj[xpower] = headers_obj[xpower] + "; NodeJS; minisrv";
            } else {
                // Full version
                if (!socket.ssid) headers_obj[xpower] = headers_obj[xpower] + "; NodeJS/"+process.version+"; " + z_cgiver;
            }
        }
    }

    if (headers_obj[xpower]) headers_obj = wtvshared.moveObjectKey(xpower, -2, headers_obj, true) // move x-powered-by before Content-type

    if (!socket.res) {
        // header object to string
        if (minisrv_config.config.debug_flags.show_headers) console.debug(" * Outgoing headers on socket ID", socket.id, headers_obj);
        else debug(" * Outgoing headers on socket ID", socket.id, headers_obj);

        Object.keys(headers_obj).forEach(function (k) {
            if (k == "Status") {
                headers += headers_obj[k] + eol;
            } else {
                if (k.indexOf('_') >= 0) {
                    var j = k.split('_')[0];
                    headers += j + ": " + headers_obj[k] + eol;
                } else {
                    headers += k + ": " + headers_obj[k] + eol;
                }
            }
        });

        if (headers_obj["Connection"]) {
            if (headers_obj["Connection"].toLowerCase() == "close" && wtv_connection_close) {
                socket_sessions[socket.id].destroy_me = true;
            }
        }
    }

    // Delete any other stray minisrv headers (we process them all before this)
    Object.keys(headers_obj).forEach(function (k) {
        if (k.indexOf("minisrv-") == 0) {
            delete headers_obj[k];
        }
    });

    // send to client
    if (socket.res) {
        const resCode = parseInt(headers_obj.Status.slice(0, 3)) || 500;
        socket.res.writeHead(resCode, headers_obj);
        socket.res.end(data);
        if (minisrv_config.config.debug_flags.show_headers) console.debug(" * Outgoing PC headers on " + socket.service_name + " socket ID", socket.id, headers_obj);
        else debug(" * Outgoing PC headers on " + socket.service_name + " socket ID", socket.id, headers_obj);

        if (minisrv_config.config.debug_flags.quiet) console.debug(" * Sent response " + headers_obj.Status + " to PC client (Content-Type:", headers_obj['Content-type'], "~", headers_obj['Content-length'], "bytes)");
    } else {
        let toClient = null;
        if (typeof data == 'string') {
            toClient = headers + eol + data;
            sendToSocket(socket, Buffer.from(toClient));
        } else if (typeof data === 'object') {
            if (minisrv_config.config.debug_flags.quiet) var verbosity_mod = (headers_obj["wtv-encrypted"] == 'true') ? " encrypted response" : "";
            if (socket_sessions[socket.id].secure_headers == true) {
                // encrypt headers
                if (minisrv_config.config.debug_flags.quiet) verbosity_mod += " with encrypted headers";
                var enc_headers = socket_sessions[socket.id].wtvsec.Encrypt(1, headers + eol);
                sendToSocket(socket, new Buffer.from(concatArrayBuffer(enc_headers, data)));
            } else {
                sendToSocket(socket, new Buffer.from(concatArrayBuffer(Buffer.from(headers + eol), data)));
            }
            if (minisrv_config.config.debug_flags.quiet) console.debug(" * Sent" + verbosity_mod + " " + headers_obj.Status + " to client (Content-Type:", headers_obj['Content-type'], "~", headers_obj['Content-length'], "bytes)");
        }
    }
}

async function sendToSocket(socket, data) {
    const chunk_size = 16384;
    let can_write = true;
    let close_socket = false;
    let expected_data_out = 0;
    while ((socket.bytesWritten == 0 || socket.bytesWritten != expected_data_out) && can_write) {
        if (expected_data_out === 0) expected_data_out = data.byteLength + (socket_sessions[socket.id].socket_total_written || 0);
        if (socket.bytesWritten == expected_data_out) break;

        let data_left = (expected_data_out - socket.bytesWritten);
        // buffer size = lesser of chunk_size or size remaining
        const buffer_size = (data_left >= chunk_size) ? chunk_size : data_left;
        if (buffer_size < 0) {
            socket.destroy();
            close_socket = true;
            break;
        }
        const offset = (data.byteLength - data_left);
        const chunk = new Buffer.alloc(buffer_size);
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
        if (socket_sessions[socket.id] && socket_sessions[socket.id].close_me) socket.end();
        if (socket_sessions[socket.id].destroy_me) socket.destroy();
    }
}

function concatArrayBuffer(buffer1, buffer2) {
    if (!buffer1) return buffer2;
    if (!buffer2) return buffer1;
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
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

    let headers = [];
    if (socket_sessions[socket.id]) {
        if (socket_sessions[socket.id].headers) {
            headers = socket_sessions[socket.id].headers;
            delete socket_sessions[socket.id].headers;
        }
    }
    var data = Buffer.from(data_hex, 'hex').toString('ascii');
    if (typeof data === "string") {
        if ((data.includes("\r\n\r\n") || data.includes("\n\n") || data.includes("\n\r\n")) && typeof socket_sessions[socket.id].post_data == "undefined") {
            if (data.includes("\r\n\r\n")) {
                data = data.split("\r\n\r\n")[0];
            } else if (data.includes("\n\r\n")) {
                // early builds
                data = data.split("\n\r\n")[0];
            } else {
                data = data.split("\n\n")[0];
            }
            if (isUnencryptedString(data)) {
                if (headers.length != 0) {
                    var new_header_obj = wtvshared.headerStringToObj(data);
                    Object.keys(new_header_obj).forEach(function (k, v) {
                        headers[k] = new_header_obj[k];
                    });
                    new_header_obj = null;
                } else {
                    headers = wtvshared.headerStringToObj(data);
                }
            } else if (!skipSecure) {
                // if its a POST request, assume its a binary blob and not encrypted (dangerous)
                if (!encryptedRequest) {
                    // its not a POST and it failed the isUnencryptedString test, so we think this is an encrypted blob
                    if (socket_sessions[socket.id].secure != true) {
                        // first time so reroll sessions
                        socket_sessions[socket.id].wtvsec = new WTVSec(minisrv_config);
                        socket_sessions[socket.id].wtvsec.IssueChallenge();
                        socket_sessions[socket.id].wtvsec.SecureOn();
                        socket_sessions[socket.id].secure = true;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex.slice(header_length * 2));
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
                            headers = [];
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
                if (minisrv_config.config.require_valid_ssid) {
                    if (!wtvshared.checkSSID(socket.ssid)) {
                        if (!socket.ssid.startsWith("1SEGA") && !socket.ssid.startsWith("MSTVSIMU")) {
                            // reject invalid SSIDs, but let Dreamcast and MSTV Sim through for now until we figure out their checksumming method.
                            var errpage = wtvshared.doErrorPage(400, "minisrv ran into a technical problem. Reason: Your SSID is not valid.");
                            headers = errpage[0];
                            data = errpage[1];
                            socket.close_me = true;
                            sendToClient(socket, headers, data);
                            return;
                        }
                    }
                }
                if (socket.ssid != null) {
                    if (!ssid_sessions[socket.ssid]) {
                        ssid_sessions[socket.ssid] = new WTVClientSessionData(minisrv_config, socket.ssid);
                        ssid_sessions[socket.ssid].SaveIfRegistered();
                    }
                    if (!ssid_sessions[socket.ssid].data_store.sockets) ssid_sessions[socket.ssid].data_store.sockets = new Set();
                    ssid_sessions[socket.ssid].data_store.sockets.add(socket);
                }
            }

            if (socket.ssid) {
                if (!ssid_sessions[socket.ssid] || !socket.ssid) return headers;
                if (!ssid_sessions[socket.ssid].getClientAddress()) ssid_sessions[socket.ssid].setClientAddress(socket.remoteAddress);
                if (ssid_sessions[socket.ssid]) ssid_sessions[socket.ssid].checkSecurity();

                if (headers["wtv-capability-flags"] != null) {
                    if (!ssid_sessions[socket.ssid]) {
                        ssid_sessions[socket.ssid] = new WTVClientSessionData(minisrv_config, socket.ssid);
                        ssid_sessions[socket.ssid].SaveIfRegistered();
                    }
                    if (!ssid_sessions[socket.ssid].capabilities) ssid_sessions[socket.ssid].capabilities = new WTVClientCapabilities(headers["wtv-capability-flags"]);
                }
                // log all client wtv- headers to the SessionData for that SSID
                // this way we can pull up client info such as wtv-client-rom-type or wtv-system-sysconfig
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
                        if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id != null) {
                            if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id >= 0) {
                                ssid_sessions[socket.ssid].switchUserID(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id, true, false);
                                ssid_sessions[socket.ssid].setUserLoggedIn(true);
                            }
                        }
                    } else {
                        if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 != headers["wtv-ticket"]) {
                            if (!ssid_sessions[socket.ssid].data_store.wtvsec_login.update_ticket) {
                                if (minisrv_config.config.debug_flags.debug) console.debug(" # New ticket from client");
                                ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 = headers["wtv-ticket"];
                                ssid_sessions[socket.ssid].data_store.wtvsec_login.DecodeTicket(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64);
                                if (headers["wtv-incarnation"]) ssid_sessions[socket.ssid].data_store.wtvsec_login.set_incarnation(headers["wtv-incarnation"]);
                                if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id >= 0) {
                                    if (ssid_sessions[socket.ssid].user_id != ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id) {
                                        ssid_sessions[socket.ssid].switchUserID(ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id, true, false);
                                        ssid_sessions[socket.ssid].setUserLoggedIn(true);
                                    }
                                }
                            }
                        }
                    }
                }
            }


            if ((headers.secure === true || headers.encrypted === true) && !skipSecure) {
                if (!socket_sessions[socket.id].wtvsec) {
                    if (!minisrv_config.config.debug_flags.quiet) console.debug(" * Starting new WTVSec instance on socket", socket.id);
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
                    socket_sessions[socket.id].secure = true;
                }
                if (!headers.request_url) {
                    var header_length = 0;
                    if (data_hex.includes("0d0a0d0a")) {
                        // \r\n\r\n
                        header_length = data.length + 4;
                    } else if (data_hex.includes("0a0a")) {
                        // \n\n
                        header_length = data.length + 2;
                    }
                    var enc_data = CryptoJS.enc.Hex.parse(data_hex.slice(header_length * 2));
                    if (enc_data.sigBytes > 0) {

                        // SECURE ON and detected encrypted data
                        var dec_data = CryptoJS.lib.WordArray.create(socket_sessions[socket.id].wtvsec.Decrypt(0, enc_data))
                        if (!socket_sessions[socket.id].secure_buffer) socket_sessions[socket.id].secure_buffer = "";
                        socket_sessions[socket.id].secure_buffer += dec_data.toString(CryptoJS.enc.Hex);
                        let secure_headers = null;
                        if (headers['request']) {
                            if (headers['request'] == "GET") {
                                if (socket_sessions[socket.id].secure_buffer.indexOf("0d0a0d0a") || socket_sessions[socket.id].secure_buffer.indexOf("0a0d0a")  ||socket_sessions[socket.id].secure_buffer.indexOf("0a0a")) {
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
                        if (minisrv_config.config.debug_flags.debug) console.debug(" # Encrypted Request (SECURE ON)", "on", socket.id);
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
                        socket_sessions[socket.id].post_data_length = parseInt(headers['Content-length'] || headers['Content-Length'] || 0);
                        socket_sessions[socket.id].post_data = "";
                        socket_sessions[socket.id].headers = headers;
                        var post_string = "POST";
                        if (socket_sessions[socket.id].secure) post_string = "Encrypted " + post_string;

                        // the client may have just sent the data with the primary headers, so lets look for that.
                        if (data_hex.includes("0d0a0d0a")) {
                            socket_sessions[socket.id].post_data = data_hex.slice(data_hex.indexOf("0d0a0d0a") + 8);
                        } else if (data_hex.includes("0a0d0a")) {
                            socket_sessions[socket.id].post_data = data_hex.slice(data_hex.indexOf("0a0d0a") + 6);
                        } else if (data_hex.includes("0a0a")) {
                            socket_sessions[socket.id].post_data = data_hex.slice(data_hex.indexOf("0a0a") + 4);
                        }
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
                        var errpage = wtvshared.doErrorPage(400, null, "Received too much data in POST request<br>Got " + (socket_sessions[socket.id].post_data.length / 2) + ", expected " + socket_sessions[socket.id].post_data_length) + " (2)";
                        headers = errpage[0];
                        data = errpage[1];
                        sendToClient(socket, headers, data);
                        return;
                    } else {
                        // expecting more data (see below)
                        socket_sessions[socket.id].expecting_post_data = true;
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
                if (headers.length > 0) {
                    socket_sessions[socket.id].headers = headers;
                }
            }
        } else if (socket.ssid) {
            try {
                // handle streaming POST
                if (socket_sessions[socket.id].expecting_post_data) {
                    if (socket_sessions[socket.id].post_data_length > (minisrv_config.config.max_post_length * 1024 * 1024)) {
                        closeSocket(socket);
                    } else {
                        if (headers.length == 0) {
                            headers = socket_sessions[socket.id].headers;
                        } else {
                            socket_sessions[socket.id].headers = headers;
                        }
                        if (socket_sessions[socket.id].post_data.length < (socket_sessions[socket.id].post_data_length * 2)) {
                            new_header_obj = null;
                            const enc_data = CryptoJS.enc.Hex.parse(data_hex);
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
                                console.debug(" * ", Math.floor(new Date().getTime() / 1000), "Receiving", post_string, "data on", socket.id, "[", socket_sessions[socket.id].post_data.length / 2, "of", socket_sessions[socket.id].post_data_length, "bytes ]");
                            } else {
                                // calculate and display percentage of data received
                                var postPercent = wtvshared.getPercentage(socket_sessions[socket.id].post_data.length, (socket_sessions[socket.id].post_data_length * 2));
                                if (minisrv_config.config.post_percentages) {
                                    if (minisrv_config.config.post_percentages.includes(postPercent)) {
                                        if (!socket_sessions[socket.id].post_data_percents_shown) socket_sessions[socket.id].post_data_percents_shown = new Array();
                                        if (!socket_sessions[socket.id].post_data_percents_shown[postPercent]) {
                                            console.debug(" * Received", postPercent, "% of", socket_sessions[socket.id].post_data_length, "bytes on", socket.id, "from", wtvshared.filterSSID(socket.ssid));
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
                            if (headers.length == 0) {
                                var errpage = wtvshared.doErrorPage(400, `${minisrv_config.config.service_name} ran into a technical problem, please try again.`);
                                headers = errpage[0];
                                data = errpage[1];
                                sendToClient(socket, headers, data);
                                return;
                            }
                            headers.post_data = CryptoJS.enc.Hex.parse(socket_sessions[socket.id].post_data);
                            if (socket_sessions[socket.id].secure == true) {
                                if (minisrv_config.config.debug_flags.debug) console.debug(" # Encrypted POST Content (SECURE ON)", "on", socket.id, "[", headers.post_data.sigBytes, "bytes ]");
                            } else {
                                if (minisrv_config.config.debug_flags.debug) console.debug(" # Unencrypted POST Content", "on", socket.id);
                            }
                            delete socket_sessions[socket.id].headers;
                            delete socket_sessions[socket.id].post_data;
                            delete socket_sessions[socket.id].post_data_length;
                            processURL(socket, headers);
                            return;
                        } else if (socket_sessions[socket.id].post_data.length > (socket_sessions[socket.id].post_data_length * 2)) {
                            if (socket_sessions[socket.id].expecting_post_data) delete socket_sessions[socket.id].expecting_post_data;
                            socket.setTimeout(minisrv_config.config.socket_timeout * 1000);
                            // got too much data ? ... should not ever reach this code
                            var errmsg = "Received too much data in POST request<br>Got " + (socket_sessions[socket.id].post_data.length / 2) + ", expected " + socket_sessions[socket.id].post_data_length;
                            console.error(errmsg);
                            var errpage = wtvshared.doErrorPage(400, null, errmsg);
                            headers = errpage[0];
                            data = errpage[1];
                            sendToClient(socket, headers, data);
                            return;
                        }
                    }
                } else if (!skipSecure) {
                    if (!encryptedRequest) {
                        if (socket_sessions[socket.id].secure != true) {
                            socket_sessions[socket.id].wtvsec = new WTVSec(minisrv_config);
                            socket_sessions[socket.id].wtvsec.IssueChallenge();
                            socket_sessions[socket.id].wtvsec.SecureOn();
                            socket_sessions[socket.id].secure = true;
                        }
                        const enc_data = CryptoJS.enc.Hex.parse(data_hex);
                        let dec_data;
                        if (enc_data.sigBytes > 0) {
                            if (!socket_sessions[socket.id].wtvsec) {
                                const errpage = wtvshared.doErrorPage(400);
                                const head = errpage[0] + "wtv-visit: client:relog\n";
                                sendToClient(socket, head, errpage[1]);
                                return;
                            }
                            const str_test = enc_data.toString(CryptoJS.enc.Latin1);
                            if (isUnencryptedString(str_test)) {
                                dec_data = enc_data;
                            } else {
                                dec_data = CryptoJS.lib.WordArray.create(socket_sessions[socket.id].wtvsec.Decrypt(0, enc_data));
                            }
                            if (!socket_sessions[socket.id].secure_buffer) socket_sessions[socket.id].secure_buffer = "";
                            socket_sessions[socket.id].secure_buffer += dec_data.toString(CryptoJS.enc.Hex);
                            let secure_headers = null;
                            if (headers['request']) {
                                if (headers['request'] == "GET") {
                                    if (socket_sessions[socket.id].secure_buffer.indexOf("0d0a0d0a") || socket_sessions[socket.id].secure_buffer.indexOf("0a0d0a")  || socket_sessions[socket.id].secure_buffer.indexOf("0a0a")) {
                                        secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
                                    }
                                } else {
                                    secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
                                }
                            } else {
                                secure_headers = await processRequest(socket, socket_sessions[socket.id].secure_buffer, true, true);
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
            } catch (e) {
                const errpage = wtvshared.doErrorPage(400);
                socket.close_me = true;
                sendToClient(socket, errpage[0], errpage[1]);
            }
        } else {
            const errpage = wtvshared.doErrorPage(400);
            socket.close_me = true;
            sendToClient(socket, errpage[0], errpage[1]);
        }
    } else {
        const errpage = wtvshared.doErrorPage(400);
        socket.close_me = true;
        sendToClient(socket, errpage[0], errpage[1]);
    }
}

async function cleanupSocket(socket) {
    try {
        if (socket_sessions[socket.id]) {
            if (!minisrv_config.config.debug_flags.quiet) console.debug(' * Cleaning up disconnected socket', socket.id, `(${socket_sessions[socket.id].socket_total_read || 0} bytes read, ${socket_sessions[socket.id].socket_total_written || 0} bytes written)`);
            delete socket_sessions[socket.id];
        }
        if (socket.ssid) {
            ssid_sessions[socket.ssid].data_store.sockets.delete(socket);

            if (ssid_sessions[socket.ssid].currentConnections() === 0) {
                // clean up possible minibrowser session data
                if (ssid_sessions[socket.ssid].get("wtv-need-upgrade")) ssid_sessions[socket.ssid].delete("wtv-need-upgrade");
                if (ssid_sessions[socket.ssid].get("wtv-used-8675309")) ssid_sessions[socket.ssid].delete("wtv-used-8675309");

                // set timer to destroy entirety of session data if client does not return in X time
                const timeout = 180000; // timeout is in milliseconds, default 180000 (3 min) .. be sure to allow time for dialup reconnections

                // clear any existing timeout check
                if (ssid_sessions[socket.ssid].data_store.socket_check) clearTimeout(ssid_sessions[socket.ssid].data_store.socket_check);

                // set timeout to check 
                ssid_sessions[socket.ssid].data_store.socket_check = setTimeout(function (ssid) {
                    if (ssid_sessions[ssid].currentConnections() === 0) {
                        if (!minisrv_config.config.debug_flags.quiet) console.debug(" * WebTV SSID", wtvshared.filterSSID(ssid), "has not been seen in", (timeout / 1000), "seconds, cleaning up session data for this SSID");
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

function getSocketRandomID(socket) {
    //return parseInt(crc16('CCITT-FALSE', Buffer.from(String(req.socket.remoteAddress) + String(req.socket.remotePort), "utf8")).toString(16), 16);
    return parseInt(
        crypto.createHash('sha256')
            .update(String(socket.remoteAddress) + String(socket.remotePort))
            .digest('hex')
            .substring(0, 8), 16
    ) % 100000000;
}

async function handleSocket(socket) {
    // create unique socket id with client address and port
    socket.id = getSocketRandomID(socket);
    socket.ssid = null;
    socket_sessions[socket.id] = [];
    socket_sessions[socket.id].socket_total_read = 0;
    socket.minisrv_pc_mode = false;
    socket.setEncoding('hex'); //set data encoding (Text: 'ascii', 'utf8' ~ Binary: 'hex', 'base64' (do not trust 'binary' encoding))
    socket.setTimeout(minisrv_config.config.socket_timeout * 1000);
    socket.on('data', function (data_hex) {
        if (socket_sessions[socket.id]) {
            socket_sessions[socket.id].socket_total_read += data_hex.length / 2; // hex encoding, so divide by 2
            if (!socket_sessions[socket.id].secure && !socket_sessions[socket.id].expecting_post_data) {
                // buffer unencrypted data until we see the classic double-newline, or get blank
                if (!socket_sessions[socket.id].header_buffer) socket_sessions[socket.id].header_buffer = "";
                socket_sessions[socket.id].header_buffer += data_hex;
                if (socket_sessions[socket.id].header_buffer.includes("0d0a0d0a") || socket_sessions[socket.id].header_buffer.includes("0a0d0a") || socket_sessions[socket.id].header_buffer.includes("0a0a")) {
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
        if (!rev.includes(':')) {
            return rev;
        } else {
            return fs.readFileSync(__dirname + path.sep + ".." + path.sep + ".git" + path.sep + rev.substring(5)).toString().trim().substring(0, 8) + "-" + rev.split('/').pop();
        }
    } catch (e) {
        return null;
    }
}

function reloadConfig() {
    const temp = { "version": minisrv_config.version }
    if (minisrv_config.config.git_commit) temp.git_commit = minisrv_config.config.git_commit;

    minisrv_config = wtvshared.readMiniSrvConfig(true, false, true); // snatches minisrv_config
    minisrv_config.version = temp.version
    if (temp.git_commit) minisrv_config.config.git_commit = temp.git_commit;
    if (!minisrv_config.config.service_logo.includes(':')) {
        minisrv_config.config.service_logo_pc = "/ROMCache/" + minisrv_config.config.service_logo;
        minisrv_config.config.service_logo = "wtv-star:/ROMCache/" + minisrv_config.config.service_logo;
    }
    if (!minisrv_config.config.service_splash_logo.includes(':')) minisrv_config.config.service_splash_logo = "wtv-star:/ROMCache/" + minisrv_config.config.service_splash_logo;
    Object.keys(minisrv_config.services).forEach((k) => {
        configureService(k, minisrv_config.services[k])
    });
   
    return minisrv_config;
}

// SERVER START
const git_commit = getGitRevision()
let z_title = "zefie's wtv minisrv v" + require('./package.json').version;
const z_cgiver = "minisrv/" + require('./package.json').version;
if (git_commit) z_title += " (git " + git_commit + ")";
console.log("**** Welcome to " + z_title + "  ****");
console.log("**** Detected nodejs v" + process.versions.node + " ****")
const application_root = wtvshared.getAbsolutePath('', __dirname)
console.log("**** Application Root Path:", application_root, "****")



minisrv_config = wtvshared.getMiniSrvConfig(); // snatches minisrv_config
wtvmime = new WTVMime(minisrv_config);

if (git_commit) {
    minisrv_config.config.git_commit = git_commit;
    delete this.git_commit;
}

if (!minisrv_config) {
    throw ("An error has occured while reading the configuration files.");
}

const service_vaults = [];
if (minisrv_config.config.ServiceVaults) {
    Object.keys(minisrv_config.config.ServiceVaults).forEach(function (k) {
        const service_vault = wtvshared.getAbsolutePath(minisrv_config.config.ServiceVaults[k]);
        service_vaults.push(service_vault);
        console.log(" * Configured Service Vault at", service_vault, "with priority", (parseInt(k) + 1));
    })
} else {
    throw ("ERROR: No Service Vaults defined!");
}

const service_deps = [];
if (minisrv_config.config.ServiceDeps) {
    Object.keys(minisrv_config.config.ServiceDeps).forEach(function (k) {
        const service_dep = wtvshared.getAbsolutePath(minisrv_config.config.ServiceDeps[k]);
        service_deps.push(service_dep);
        console.log(" * Configured Service Dependencies at", service_dep, "with priority", (parseInt(k) + 1));
    })
} else {
    throw ("ERROR: No Service Dependancies Directory (SessionDeps) defined!");
}

let SessionStore = null;
if (minisrv_config.config.SessionStore) {
    SessionStore = wtvshared.getAbsolutePath(minisrv_config.config.SessionStore);
    console.log(" * Configured Session Storage at", SessionStore);
} else {
    throw ("ERROR: No Session Storage Directory (SessionStore) defined!");
}


const service_ip = minisrv_config.config.service_ip;
Object.keys(minisrv_config.services).forEach(function (k) {
    if (typeof(minisrv_config.services[k]) === 'function') return;
    if (configureService(k, minisrv_config.services[k], true)) {
        const using_tls = (minisrv_config.services[k].pc_services && minisrv_config.services[k].https_cert && minisrv_config.services[k].use_https) ? true : false;
        console.log(" * Configured Service:", k, "on Port", minisrv_config.services[k].port, "- Service Host:", minisrv_config.services[k].host + ((using_tls) ? " (TLS)" : ""), "- Mode:", (minisrv_config.services[k].pc_services) ? "HTTP" : "WTVP");

        if (minisrv_config.services[k].local_nntp_port) {
            if (!wtvnewsserver) {
                const WTVNewsServer = require(classPath + "/WTVNewsServer.js");
                let local_nntp_using_auth = false;
                if (minisrv_config.services[k].local_nntp_requires_auth) {
                    local_nntp_using_auth = true;
                    if (minisrv_config.services[k].local_auth) {
                        // auth required, and info defined in config
                        wtvnewsserver = new WTVNewsServer(minisrv_config, minisrv_config.services[k].local_nntp_port, true, minisrv_config.services[k].local_auth.username, minisrv_config.services[k].local_auth.password);
                        console.log(" * Configured Service: Local NNTP", "on 127.0.0.1:" + minisrv_config.services[k].local_nntp_port, "(TLS) - Auth required:", local_nntp_using_auth, "- Auth: As Configured");
                    } else {
                        // auth required, but randomly generated
                        wtvnewsserver = new WTVNewsServer(minisrv_config, minisrv_config.services[k].local_nntp_port, true);
                        console.log(" * Configured Service: Local NNTP", "on 127.0.0.1:" + minisrv_config.services[k].local_nntp_port, "(TLS) - Auth required:", local_nntp_using_auth, "- Auth (randgen): User:", wtvnewsserver.username, "Pass:", wtvnewsserver.password);
                    }
                } else {
                    // no auth required on local server
                    wtvnewsserver = new WTVNewsServer(minisrv_config, minisrv_config.services[k].local_nntp_port);
                    console.log(" * Configured Service: Local NNTP", "on 127.0.0.1:" + minisrv_config.services[k].local_nntp_port, "(TLS) - Auth required:", local_nntp_using_auth, "- Auth: None");
                }
                if (minisrv_config.services[k].featuredGroups) {
                    Object.keys(minisrv_config.services[k].featuredGroups).forEach((j) => {
                        wtvnewsserver.createGroup(minisrv_config.services[k].featuredGroups[j].group, minisrv_config.services[k].featuredGroups[j].description || null);
                    })
                }
            }
        }
    }

})

if (minisrv_config.config.irc) {
    if (minisrv_config.config.irc.enabled && minisrv_config.config.irc.port > 0) {
        if (!wtvirc) {
            wtvirc = new WTVIRC(minisrv_config, minisrv_config.config.bind_ip, minisrv_config.config.irc.port, minisrv_config.config.irc.debug || false);
            wtvirc.start();
            console.log(" * Configured Service: IRC Server on", minisrv_config.config.bind_ip + ":" + minisrv_config.config.irc.port);
        }
    }
}
if (minisrv_config.config.hide_ssid_in_logs) console.log(" * Masking SSIDs in console logs for security");
else console.log(" * Full SSIDs will be shown in console logs");

if (minisrv_config.config.filter_passwords_in_logs) console.log(" * Will attempt to filter passwords in browser queries")
else console.log(" * Passwords in browser queries will not be filtered")

if (!minisrv_config.config.service_logo.includes(':')) {
    minisrv_config.config.service_logo_pc = "/ROMCache/" + minisrv_config.config.service_logo;
    minisrv_config.config.service_logo = "wtv-star:/ROMCache/" + minisrv_config.config.service_logo;
}
if (!minisrv_config.config.service_splash_logo.includes(':')) minisrv_config.config.service_splash_logo = "wtv-star:/ROMCache/" + minisrv_config.config.service_splash_logo;

minisrv_config.version = require('./package.json').version;
if (minisrv_config.config.error_log_file) {
    const error_log_stream = fs.createWriteStream(wtvshared.returnAbsolutePath(minisrv_config.config.error_log_file), { flags: 'a' });
    const process_stderr = process.stderr.write;
    const writeError = function () {
        process_stderr.apply(process.stderr, arguments);
        if (error_log_stream) error_log_stream.write.apply(error_log_stream, arguments);
    }
    process.stderr.write = writeError
}

// sanity
if (minisrv_config.config.user_accounts.max_users_per_account < 1) {
    console.log(" * WARNING: user_accounts.max_users_per_account should be >= 1, we have set it to 1.");
    minisrv_config.config.user_accounts.max_users_per_account = 1;
}
if (minisrv_config.config.user_accounts.max_users_per_account > 99) {
    console.log(" * WARNING: user_accounts.max_users_per_account should be <= 99, we have set it to 99.");
    minisrv_config.config.user_accounts.max_users_per_account = 99;
}

// shenanigans
if (minisrv_config.config.shenanigans) console.log(" * WARNING: Shenanigans level", minisrv_config.config.shenanigans, "enabled");
else console.log(" * Shenanigans disabled");

process.on('uncaughtException', function (err) {
    console.error((err && err.stack) ? err.stack : err);
});

ports.sort();
pc_ports.sort();

// de-duplicate ports in case user configured multiple services on same port
const bind_ports = [...new Set(ports)]
if (!minisrv_config.config.bind_ip) minisrv_config.config.bind_ip = "0.0.0.0";
bind_ports.every(function (v) {
    try {
        var server = net.createServer(handleSocket);
        server.listen(v, minisrv_config.config.bind_ip);
        return true;
    } catch (e) {
        throw ("Could not bind to port", v, "on", minisrv_config.config.bind_ip, e.toString());
    }
    return false;
});

// PC Services via express
// de-duplicate ports in case user configured multiple services on same port
const pc_bind_ports = [...new Set(pc_ports)]
if (!minisrv_config.config.bind_ip) minisrv_config.config.bind_ip = "0.0.0.0";
pc_bind_ports.every(function (v) {
    try {
        var server = express();
        server.use(express.raw({ type: '*/*' }))
        var service_name = getServiceByPort(v);
        var service_handler = http;
        var server_opts = {};
        var using_tls = (minisrv_config.services[service_name].https_cert && minisrv_config.services[service_name].use_https) ? true : false;

        if (using_tls) {
            service_handler = httpx;
            server_opts =
            {
                key: fs.readFileSync(wtvshared.parseConfigVars(minisrv_config.services[service_name].https_cert.key)),
                cert: fs.readFileSync(wtvshared.parseConfigVars(minisrv_config.services[service_name].https_cert.cert)),
            };
        }
        //service_handler.createServer(server_opts, server).listen(v, minisrv_config.config.bind_ip);

        if (using_tls && !minisrv_config.services[service_name].force_https) {
            service_handler = httpx; // HTTP and HTTPS on the same port
        }

        service_handler.createServer(server_opts, server).listen(v, minisrv_config.config.bind_ip);
        
        server.get('*', (req, res) => {
            var ssl = (req.socket.ssl) ? true : false;
            var service_name = getServiceByPort(v);
            var request_headers = {};
            
            request_headers['request'] = "GET " + req.originalUrl + " HTTP/1.1";
            request_headers.request_url = req.originalUrl;
            request_headers.raw_headers = "Request: " + request_headers['request'] + "\r\n";
            Object.keys(req.headers).forEach(function (k) {
                request_headers[k] = req.headers[k];
                request_headers.raw_headers += k + ": " + req.headers[k] + "\r\n";
            });
            request_headers.query = req.query;

            var host_name = (request_headers['host']) ? request_headers['host'] : null;

            if (host_name) {
                if (host_name.includes(":")) host_name = host_name.slice(0, host_name.indexOf(":"));
                service_name = (getServiceByVHost(host_name)) ? getServiceByVHost(host_name) : service_name
            }

            req.socket.minisrv_pc_mode = true;
            req.socket.res = res;
            req.socket.service_name = service_name;            
            req.socket.id = getSocketRandomID(req.socket);
            socket_sessions[req.socket.id] = []; 

            if (getServiceEnabled(service_name)) {
                if (minisrv_config.config.debug_flags.show_headers) console.debug(" * Incoming " + ((ssl) ? "HTTPS" : "HTTP") + " PC GET Headers on", service_name, "socket ID", req.socket.id, wtvshared.filterRequestLog(request_headers));                
                else debug(" * Incoming " + ((ssl) ? "HTTPS" : "HTTP") + " PC GET Headers on", service_name, "socket ID", req.socket.id, wtvshared.filterRequestLog(request_headers));

                if (!ssl && minisrv_config.services[service_name].force_https && minisrv_config.services[service_name].https_cert) {
                    var headers = `302 Moved
Location: https://${(minisrv_config.services[service_name].https_cert.domain) ? minisrv_config.services[service_name].https_cert.domain : minisrv_config.services[service_name].host}:${minisrv_config.services[service_name].port}${req.originalUrl}
Content-type: text/html`;
                    sendToClient(req.socket, headers);
                } else {
                    processURL(req.socket, request_headers, true)
                }
            } else {
                var errpage = wtvshared.doErrorPage(404, "Service Not Found ("+service_name+")", null, true);
                sendToClient(req.socket, errpage[0], errpage[1]);
            }
        })

        server.post('*', (req, res) => {
            let errpage = null;
            const ssl = (req.socket.ssl) ? true : false;
            const service_name = getServiceByPort(v);

            let request_headers = {};           
            request_headers['request'] = "POST " + req.originalUrl + " HTTP/1.1";
            request_headers.request_url = req.originalUrl;
            request_headers.raw_headers = "Request: "+request_headers['request']+"\r\n";
            Object.keys(req.headers).forEach(function (k) {
                request_headers[k] = req.headers[k];
                request_headers.raw_headers += k+": "+req.headers[k] + "\r\n";
            });
            request_headers.query = req.query;

            const host_name = (request_headers['host']) ? request_headers['host'] : null;

            if (host_name) {
                if (host_name.includes(":")) host_name = host_name.slice(0, host_name.indexOf(":"));
                service_name = (getServiceByVHost(host_name)) ? getServiceByVHost(host_name) : service_name
            }

            req.socket.minisrv_pc_mode = true;
            req.socket.res = res;
            req.socket.service_name = service_name;
            req.socket.id = getSocketRandomID(req.socket);
            socket_sessions[req.socket.id] = [];

            if (getServiceEnabled(service_name)) {
                if (req.body) {
                    if (typeof (req.body) == "string") {
                        request_headers.post_data = req.body;
                    } else if (req.body.length) {
                        if (req.body.length > (minisrv_config.config.max_post_length * 1024 * 1024)) {
                            errpage = wtvshared.doErrorPage("400", "POST size too large", null, true);
                        } else {
                            var data = "";
                            for (var i = 0; i < req.body.length; i++) {
                                data += String.fromCharCode(req.body[i]);
                            }
                            request_headers.post_data = data;
                        }
                    } else {
                        request_headers.post_data = "";
                    }
                }

                if (minisrv_config.config.debug_flags.show_headers) console.debug(" * Incoming " + ((ssl) ? "HTTPS" : "HTTP") + " PC POST Headers on", service_name, "socket ID", req.socket.id, wtvshared.filterRequestLog(request_headers));
                else debug(" * Incoming " + ((ssl) ? "HTTPS" : "HTTP") + " PC POST Headers on", service_name, "socket ID", req.socket.id, wtvshared.filterRequestLog(request_headers));
           
                if (!ssl && minisrv_config.services[service_name].force_https && minisrv_config.services[service_name].https_cert) {
                    const headers = `302 Moved
Location: https://${(minisrv_config.services[service_name].https_cert.domain) ? minisrv_config.services[service_name].https_cert.domain : minisrv_config.services[service_name].host}:${minisrv_config.services[service_name].port}${req.originalUrl}
Content-type: text/html`;
                    sendToClient(req.socket, headers);
                } else if (errpage) {
                    sendToClient(req.socket, errpage[0], errpage[1]);
                } else {
                    processURL(req.socket, request_headers, true)
                }
            } else {
                const errpage = wtvshared.doErrorPage(404, "Service Not Found (" + service_name +")", null, true);
                sendToClient(req.socket, errpage[0], errpage[1]);
            }
        })
        return true;
    } catch (e) {
        throw ("Could not bind to port", v, "on", minisrv_config.config.bind_ip, e.toString());
    }
    return false;
});

if (bind_ports.length > 0) console.log(` * Started WTVP Server on port${bind_ports.length != 1 ? "s" : ""} ` + bind_ports.join(", ") + "...");
if (pc_bind_ports.length > 0) console.log(` * Started HTTP Server on port${pc_bind_ports.length != 1 ? "s" : ""} ` + pc_bind_ports.join(", ") + "...");

const listening_ip_string = (minisrv_config.config.bind_ip != "0.0.0.0") ? "IP: " + minisrv_config.config.bind_ip : "all interfaces";
console.log(" * Listening on", listening_ip_string, "~", "Service IP:", service_ip);