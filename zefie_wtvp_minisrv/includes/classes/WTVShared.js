/** 
 * Shared functions across all classes and apps
 */
const CryptoJS = require('crypto-js');
const WTVShenanigans = require('./WTVShenanigans.js');

class WTVShared {

    path = require('path');
    fs = require('fs');
    readline = require('readline');
    v8 = require('v8');
    zlib = require('zlib');
    html_entities = require('html-entities'); // used externally by service scripts
    sanitizeHtml = require('sanitize-html');
    iconv = require('iconv-lite');
    parentDirectory = process.cwd()
    extend = require('util')._extend;
    debug = require('debug')('WTVShared')
    process = require('process');
    shenanigans = null;
    appdir = this.path.resolve(__dirname + this.path.sep + ".." + this.path.sep + "..");

    minisrv_config = [];
    
    constructor(minisrv_config, quiet = false) {
        if (minisrv_config == null) this.minisrv_config = this.readMiniSrvConfig(true, !quiet);
        else this.minisrv_config = minisrv_config;

        this.shenanigans = new WTVShenanigans(this.minisrv_config);
       
        if (!String.prototype.reverse) {
            String.prototype.reverse = function () {
                var splitString = this.split("");
                var reverseArray = splitString.reverse();
                return reverseArray.join("");
            }
        }
        if (!String.prototype.hexEncode) {
            String.prototype.hexEncode = function () {
                var result = '';
                for (var i = 0; i < this.length; i++) {
                    result += this.charCodeAt(i).toString(16);
                }
                return result;
            }
        }
    }


    getBoxName(client_rom_type) {
        switch (client_rom_type) {
            case "bf0app":
            case "bfeapp":
            case "US-BPS-flashdisk-0MB-8MB-softmodem-CPU5230":
            case "US-BPS-flashdisk-0MB-16MB-softmodem-CPU5230":
                return "WebTV Internet Terminal";

            case "US-DTV-disk-0MB-32MB-softmodem-CPU5230":
            case "US-WEBSTAR-disk-0MB-8MB-softmodem-CPU5230":
            case "US-WEBSTAR-disk-0MB-16MB-softmodem-CPU5230":
                return "WebTV Satellite Receiver";
            
            case "US-LC2-disk-0MB-8MB":
            case "US-LC2-disk-0MB-8MB-softmodem-CPU5230":
            case "US-LC2-flashdisk-0MB-16MB-softmodem-CPU5230":
                return "WebTV Plus Internet Receiver";
            
            default:
                return "WebTV Internet Receiver";
        }
    }

    /**
     * Calculates the CRC of an SSID, WNI Style
     * @param {string} ssid
     * @returns {string} CRC8 result as hex string
     */
    getSSIDCRC(ssid) {
        let crc = 0;

        for (let i = 0; i < 14; i += 2) {
            let inbyte = parseInt(ssid.substring(i, i + 2), 16);
            if (isNaN(inbyte)) return '00';

            for (let ii = 0; ii < 8; ii++) {
                let mix = (crc ^ inbyte) & 1;
                crc >>= 1;
                if (mix) crc ^= 0x8C;
                inbyte >>= 1;
            }
        }

        return crc.toString(16).padStart(2, '0');
    }

    // check if the SSID has a valid checksum
    checkSSID(ssid) {
        if (ssid.slice(-2) == this.getSSIDCRC(ssid))
            return true;
        return false;
    }


    parseConfigVars(s) {
        if (s.indexOf("%ServiceDeps%") >= 0)
            return this.getServiceDep(s.replace("%ServiceDeps%", ""), true);
        else
            return s;
    }

    /**
     * CryptoJS implmentation of Base64 Encoder
     * @param {string} b String to encode
     * @returns {string} Base64 encoded string
     */
    atob(a) {
        const CryptoJS = require('crypto-js');
        const enc = CryptoJS.enc.Utf8.parse(a); // encodedWord Array object
        return CryptoJS.enc.Base64.stringify(enc);
    }

    /**
     * CryptoJS implmentation of Base64 Decoder
     * @param {string} a Base64 String
     * @return {string} Decoded string
     */
    btoa(b) {
        const CryptoJS = require('crypto-js');
        const enc = CryptoJS.enc.Base64.parse(b);
        return CryptoJS.enc.Utf8.stringify(enc)
    }

    /**
     * Clone an object without any reference to the original (why is this so hard in JS)
     * @param {object} src Soruce object
     * @returns {object} Clone object that can be updated without modifing the original
     */
    cloneObj(src) {
        if (src instanceof RegExp) {
            return new RegExp(src);
        } else if (src instanceof Date) {
            return new Date(src.getTime());
        } else if (typeof src === 'object' && src !== null) {
            var clone = null;
            if (Array.isArray(src)) clone = [];
            else clone = {};

            var self = this;
            Object.keys(src).forEach((k) => {
                clone[k] = self.cloneObj(src[k]);
            });
            return clone;
        }
        return src;
    }


    /**
     * Checks if the user has been whitelisted for wtv-admin
     * @param {object} wtvclient the clientSessionData object for the user
     * @param {string} service_name (optional) Service to check
     */
    isAdmin(wtvclient, service_name = "wtv-admin") {
        var  WTVAdmin = require("./WTVAdmin.js");
        var wtva = new WTVAdmin(this.minisrv_config, wtvclient, service_name);
        var result = wtva.isAuthorized(true);
        wtva, WTVAdmin = null;
        return result;
    }

    parseJSON(json) {
        if (typeof json !== 'string') json = json ? json.toString() : '';
        let result = '';
        let i = 0;
        let isString = false;
        let isEscape = false;
        let isBlockComment = false;
        let isLineComment = false;

        while (i < json.length) {
            const char = json[i];
            const nextChar = json[i + 1];

            if (!isString && !isEscape && char === '/' && nextChar === '*') {
                isBlockComment = true;
                i++;
            } else if (isBlockComment && char === '*' && nextChar === '/') {
                isBlockComment = false;
                i++;
            } else if (!isString && !isEscape && char === '/' && nextChar === '/') {
                isLineComment = true;
                i++;
            } else if (isLineComment && (char === '\n' || char === '\r')) {
                isLineComment = false;
            } else if (!isBlockComment && !isLineComment) {
                if (char === '"' && !isEscape) {
                    isString = !isString;
                }
                isEscape = char === '\\' && !isEscape;
                result += char;
            }
            i++;
        }

        return JSON.parse(result);
    }


    /**
     * Attempts to convert val into a boolean
     * @param {string,int,boolean} val 
     * @returns {boolean}
     */
    parseBool(val) {
        return !!(val && /^(true|1|on|yes)$/i.test(val.toString().trim()));
    }

    getQueryString(query) {
        // for easy retrofitting old code to work with the webtvism of allowing multiple of the same query name
        // pass it the query, and it will return a string regardless. if its a string it just sends it back
        // if its an array we just pull the last object
        if (typeof (query) === "object")
            return query[(Object.keys(query).length - 1)];
        else
            return query
    }

    /**
     * Encodes a string, replacing < and > with &lt; and &gt;
     * @param {string} string The string to entitize
     * @param {boolean} process_newline If true, replaces ASCII newline with <br>
     * @returns {string} Entitized string
     */
    htmlEntitize(string, process_newline = false) {
        // Assuming checkShenanigan returns a boolean
        if (this.shenanigans && this.shenanigans.checkShenanigan(this.shenanigans.shenanigans.DISABLE_HTML_ENTITIZER)) {
            return string;
        }

        // Directly replace &, <, >, ", and ' characters
        let entitized = string.replace(/[&<>"]/g, function (match) {
            switch (match) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                // &apos; is not needed to be replaced since it is valid in HTML5 and XHTML
                default: return match;
            }
        });

        if (process_newline) {
            entitized = entitized.replace(/\n/g, "<br>").replace(/\r/g, "");
        }

        return entitized;
    }


    /**
     * Attempts to sanitize HTML code to remove possible exploits when embedded in a WebTV Service
     * @param {string} string The string to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeSignature(string) {
        var allowedSchemes = ['http', 'https', 'ftp', 'mailto'];
        var self = this;
         // allow links to services flagged as "wideopen"
        Object.keys(this.minisrv_config.services).forEach((k) => {
            var flag = parseInt(this.minisrv_config.services[k].flags, 16);
            if (flag === 4 || flag === 7) {
                if (!allowedSchemes.includes(k)) allowedSchemes.push(k);
            }
        });
        self.debug("sanitizeSignature", "allowed protocols:", allowedSchemes);

        if (this.shenanigans.checkShenanigan(this.shenanigans.shenanigans.DISABLE_HTML_SANITIZER)) {
            // shenanigans level matches, don't filter
            return string;
        }

        const clean = this.sanitizeHtml(string, {
            allowedTags: ['a', 'audioscope', 'b', 'bgsound', 'big', 'blackface', 'blockquote', 'bq', 'br', 'caption', 'center', 'cite', 'c', 'dd', 'dfn', 'div', 'dl', 'dt', 'em', 'fn', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'html', 'i', 'img', 'label', 'li', 'listing', 'marquee', 'nobr', 'ol', 'p', 'plaintext', 'pre', 's', 'samp', 'small', 'shadow', 'span', 'strike', 'strong', 'sub', 'sup', 'tbody', 'table', 'td', 'th', 'tr', 'tt', 'u', 'ul'],
            disallowedTagsMode: 'discard',
            allowedAttributes: {
                a: ['href', 'name', 'target'],
                audioscope: ['align', 'bgcolor', 'border', 'gain', 'height', 'leftcolor', 'leftoffset', 'maxlevel', 'rightcolor', 'rightoffset', 'width' ],
                bgsound: ['src', 'loop'],
                img: ['src', 'alt', 'title', 'width', 'height', 'loading'], // ?? What is 'loading'?
                font: ['size', 'name', 'color'],
                marquee: ['aign', 'behavior', 'direction', 'height', 'hspace', 'loop', 'scrollamount', 'scrolldelay', 'transparency', 'vspace', 'width'],
            },
            allowedSchemes: allowedSchemes,
            allowedSchemesByTag: {},
            allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
            exclusiveFilter: function (frame) {
                var allowed = true;
                Object.keys(frame.attribs).forEach((k) => {
                    if (k == "href" || k == "background" || k == "src") {
                        allowed = false;    
                        var value = frame.attribs[k];

                        if (frame.tag !== "a") {
                            // check everything except normal links
                            if (value.startsWith("wtvchat") || value.startsWith("irc")) {
                                // don't allow irc embeds
                                return false;
                            }
                        }                  
                        Object.keys(allowedSchemes).forEach((j) => {
                            if (value.startsWith(allowedSchemes[j])) {
                                allowed = true;
                                return false;
                            }
                        })                        
                    }
                });
                self.debug("sanitizeSignature", "filter result:", frame, "allowed:", allowed);
                return !allowed;
            },
            allowVulnerableTags: false,
            allowProtocolRelative: false
        }, true)
        // todo: add missing user open tags (eg </i> if user did not close it) (might be done by sanitize-html?)
        return clean;
    }

    /**
     * Converts a header string into an object
     * @param {string} headers Header string to convert
     * @param {boolean} response If true, the headers are a response, otherwise they are a request
     * @return {object} Headers object
     * */
    headerStringToObj(headers, response = false) {
        var inc_headers = 0;
        var headers_obj = {};
        headers_obj.raw_headers = headers;
        var headers_obj_pre = headers.split("\n");
        headers_obj_pre.forEach(function (d) {
            if (/^SECURE ON/.test(d) && !response) {
                headers_obj.secure = true;
            } else if (/^([0-9]{3}) $/.test(d.substring(0, 4)) && response && !headers_obj.Status) {
                d.s
                headers_obj.Status = d.trim("\r");
            } else if (/^(GET |PUT |POST)$/.test(d.substring(0, 4)) && !response) {
                headers_obj.request = d.trim("\r");
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
                headers_obj.request_url = decodeURI(request_url).trim("\r");
            } else if (d.indexOf(":") > 0) {
                var d_split = d.split(':');
                var header_name = d_split[0];
                if (headers_obj[header_name] != null) {
                    header_name = header_name + "_" + inc_headers;
                    inc_headers++;
                }
                d_split.shift();
                d = d_split.join(':');
                headers_obj[header_name] = (d).trim("\r");
                if (headers_obj[header_name].substring(0, 1) == " ") {
                    headers_obj[header_name] = headers_obj[header_name].substring(1);
                }
            }
        });
        return headers_obj;
    }

    /**
     * Strips headers not in the whitelist
     * @param {object} headers_obj // Headers object to strip
     * @param {Array<string>} whitelist // Array of header names to keep, case insensitive
     * @returns {object} // Headers object with only whitelisted headers
     */
    stripHeaders(headers_obj, whitelist) {
        var whitelisted_headers = new Array();
        var out_headers = new Array();
        out_headers.Status = headers_obj.Status;
        if (headers_obj['wtv-connection-close']) out_headers['wtv-connection-close'] = headers_obj['wtv-connection-close'];

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

    /**
     * Attempts to determine if the string is ASCII
     * @param {string} str
     * @returns {boolean} true if ASCII only, otherwise false
     */
    isASCII(str) {
        return typeof str === 'string' && /^[\x00-\x7F]*$/.test(str);
    }


    /**
     * Attempts to determine if the string contains HTML
     * @param {string} str
     * @returns {boolean} true if HTML detected, otherwise false
     */
    isHTML(str) {
        const pattern = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*>(.*?)<\/\1>/;
        return typeof str === 'string' && pattern.test(str);
    }


    /**
     * Attempts to determine if the string is Base64 or not
     * @param {string} str String to check
     * @param {object} opts
     * @return {boolean} true if Base64, otherwise false
     */
    isBase64(str, opts = {}) {
        if (typeof str !== 'string' || (opts.allowEmpty === false && str === '')) {
            return false;
        }

        // Create a regex string based on the provided options
        const regexBase = '[A-Za-z0-9+\\/]';
        const regexPadding = opts.paddingRequired === false ? '=?' : '=';
        const regexMime = opts.mimeRequired ? 'data:\\w+\\/[-+.\\w]+;base64,' : '';

        // Construct the final regex with the appropriate groups
        const regex = `^${regexMime}(?:${regexBase}{4})*${opts.allowMime ? '?' : ''}(?:${regexBase}{2}${regexPadding}{2}|${regexBase}{3}${regexPadding})?$`;

        return new RegExp(regex, 'gi').test(str);
    }


    utf8Decode(utf8String) {
        if (typeof utf8String !== 'string') {
            throw new TypeError("parameter 'utf8String' is not a string");
        }
        const textDecoder = new TextDecoder('utf-8');
        const bytes = new Uint8Array(utf8String.split('').map(c => c.charCodeAt(0)));
        return textDecoder.decode(bytes);
    }


    decodeBufferText(buf) {
        var out = "";
        out = this.utf8Decode(this.iconv.decode(Buffer.from(buf),'ISO-8859-1'));
        return out;
    }

    /**
     * Attempts to convert a relative path into an absolute path
     * @param {string} check_path The path to convert
     * @return {string} The absolute path
     */
    returnAbsolutePath(check_path) {
        // Assuming this.path.sep is a slash (/ or \) and this.parentDirectory is set correctly
        if (!/^(?:[a-zA-Z]:)?[\\/]/.test(check_path)) {
            // It's a relative path
            check_path = this.path.resolve(this.parentDirectory + this.path.sep + check_path);
        }
        // Use the fixPathSlashes method to normalize the slashes
        return this.fixPathSlashes(check_path);
    }


    /**
     * Detects if the client is in MiniBrowser mode
     * @param {object} ssid_session
     * @returns {boolean} true if yes, false it no
     */
    isMiniBrowser(ssid_session) {
        return (ssid_session.get("wtv-need-upgrade") || ssid_session.get("wtv-used-8675309")) ? true : false;
    }

    /**
     * Checks if the build is older than the supplied value
     * @param {object} ssid_session
     * @param {int} minBuild Minimum build number to check againse
     * @returns {boolean} true if the client build is less than minBuild, otherwise false
     */
    isOldBuild(ssid_session, minBuild = 3500) {
        return (this.isMiniBrowser(ssid_session) || parseInt(ssid_session.get("wtv-system-version")) < minBuild) ? true : false;
    }

    getUserConfig() {
        try {
            var user_config_filename = this.getAbsolutePath("user_config.json", this.appdir);
            if (this.fs.lstatSync(user_config_filename)) {
                try {
                    var minisrv_user_config = this.parseJSON(this.fs.readFileSync(user_config_filename));
                } catch (f) {
                    console.error("ERROR: Could not read user_config.json", "\n\nReason:\n\n", f);
                    this.process.exit(1);
                }
            } else {
                var minisrv_user_config = {}
            }
            return minisrv_user_config;
        } catch (e) {
            if (!this.fs.existsSync(user_config_filename)) {
                console.error(" * Notice: Could not find user configuration (user_config.json). Using default configuration.");
            } else {
                console.error("ERROR: Could not read user_config.json", e);
                this.process.exit(1);
            }
        }
    }


    /**
     * Parses an SSID and attempts to decode its bits
     * @param {string} ssid
     * @returns {object} ssid info object
     */
    parseSSID(ssid) {
        const boxTypeMapping = {
            "01": "Internal",
            "71": "MAME",
            "81": "Retail",
            "91": "Viewer"
        };

        const regionMapping = {
            "B002": "US/Canada",
            "B102": "Japan"
        };

        const manufacturerMapping = {
            "00": "Sony", // Default to Sony if the region is not Japan
            "10": "Philips",
            "50": "Philips",
            "40": "Mitsubishi",
            "70": "Samsung",
            "80": "EchoStar",
            "90": "RCA",
            "AE": "zefie & MattMan69"
        };

        const ssid_obj = {
            boxType: boxTypeMapping[ssid.substring(0, 2)],
            unique_id: ssid.substring(2, 8),
            region: regionMapping[ssid.substring(10, 14).toUpperCase()],
            manufacturer: manufacturerMapping[ssid.substring(8, 10).toUpperCase()],
            crc: ssid.substring(14)
        };

        // Special case for manufacturer based on region
        if (ssid_obj.region === "Japan" && ssid.substring(8, 10).toUpperCase() === "00") {
            ssid_obj.manufacturer = "Panasonic";
        }

        return ssid_obj;
    }


    /**
     * Alias for parseSSID, but just the manufacture info
     * @param {string} ssid
     * @param {boolean} bit If true, just return the manufacture portion of the SSID
     * @return {string}
     */
    getManufacturer(ssid, bit = false) {
        if (bit) return ssid.substring(8, 10).toUpperCase();
        else return this.parseSSID(ssid).manufacturer || null;
    }

    readMiniSrvConfig(user_config = true, notices = true, reload_notice = false) {
        const log = (msg) => {
            if (notices || reload_notice) console.log(msg);
        };
        const logError = (msg, e) => {
            console.error(msg, e);
            if (this.minisrv_config.config) {
				if (this.minisrv_config.config.debug_flags && this.minisrv_config.config.debug_flags.debug) {
					console.error(" * Notice: Using default configuration.");
				}
            }
        };

        log(" *** Reading global configuration...");
        try {            
            var minisrv_config = this.parseJSON(this.fs.readFileSync(this.getAbsolutePath("includes" + this.path.sep + "config.json", this.appdir)));
        } catch (e) {
            throw new Error("ERROR: Could not read config.json", e);
        }

        if (user_config) {
            log(" *** Reading user configuration...");
            try {
                let minisrv_user_config = this.getUserConfig();
                minisrv_config = this.integrateConfig(minisrv_config, minisrv_user_config);
            } catch (e) {
                logError("ERROR: Could not integrate user_config.json", e);
                this.process.exit(1);
            }
        }

        // Set debug flags based on verbosity
        const debugFlags = {
            debug: false,
            quiet: true, // will squash debug even if its true
            show_headers: false
        };

        if (minisrv_config.config.verbosity >= 0 && minisrv_config.config.verbosity <= 3) {
            debugFlags.quiet = minisrv_config.config.verbosity < 2;
            debugFlags.show_headers = minisrv_config.config.verbosity === 2
            debugFlags.debug = minisrv_config.config.verbosity === 3;
            log(` *** Console Verbosity level ${minisrv_config.config.verbosity}`);
        } else {
            Object.assign(debugFlags, { debug: true, quiet: false, show_headers: true });
            log(" *** Console Verbosity level 4 (debug verbosity)");
        }

        minisrv_config.config.debug_flags = debugFlags;

        log(" *** Configuration successfully read.");
        this.minisrv_config = minisrv_config;
        return this.minisrv_config;
}

    integrateConfig(main, user) {
        for (const key in user) {
            if (typeof user[key] === 'object' && user[key] !== null && !Array.isArray(user[key])) {
                main[key] = this.integrateConfig(main[key] || {}, user[key]);
            } else {
                main[key] = user[key];
            }
        }
        return main;
    }


    writeToUserConfig(config) {
        if (config) {
            try {
                var minisrv_user_config = this.getUserConfig();

                // write back
                try {
                    var new_user_config = {};
                    Object.assign(new_user_config, minisrv_user_config, config);
                    if (this.minisrv_config.config.debug_flags.debug) console.log(" * Writing new user configuration...");
                    this.fs.writeFileSync(this.getAbsolutePath("user_config.json", this.appdir), JSON.stringify(new_user_config, null, "\t"));
                    return true;
                }
                catch (e) {
                    if (this.minisrv_config.config.debug_flags) {
                        if (this.minisrv_config.config.debug_flags.debug) console.error(" * WARNING: Could not update user config. Data may have been lost.", e);
                    }
                }

            } catch (e) {
                if (this.minisrv_config.config.debug_flags) {
                    if (this.minisrv_config.config.debug_flags.debug) console.error(" * Notice: Could not find user configuration (user_config.json). Using default configuration.");
                }
            }
        }
        return false;
    }


    /**
     * Generates a random string
     * @param {int} len desired generated string length
     * @param {string} extra_chars String of extra characters outside A-Z a-z 0-9 to include
     * @returns {string} Random string
     */
    generateString(len, extra_chars = '') {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' + extra_chars;
        const charactersLength = characters.length;
        let result = '';
        let randomByte;
        let value;

        // If in Node.js environment, use crypto for better performance and randomness
        if (typeof require === 'function' && typeof process === 'object') {
            const { randomBytes } = require('crypto');
            for (let i = 0; i < len; i++) {
                randomByte = randomBytes(1);
                result += characters.charAt(randomByte[0] % charactersLength);
            }
        } else {
            // Cache the Math functions outside of the loop
            const randomFunc = Math.random;
            const floorFunc = Math.floor;
            for (let i = 0; i < len; i++) {
                value = floorFunc(randomFunc() * charactersLength);
                result += characters.charAt(value);
            }
        }

        return result;
    }


    /**
     * Any alias of generateString with optional special characters enabled as well
     * @param {string} len desired generated string length
     * @param {any} simple If false, generates a password with special chars
     * @returns {string} Random string
     */
    generatePassword(len, simple = false) {
        return this.generateString(len, (simple) ? '' : '!@#$%&()[]-_+=?.');
    }

    /**
     * Returns the configuration object 
     * @returns {object} minisrv config
     */
    getMiniSrvConfig() {
        return this.minisrv_config;
    }

    lineWrap(string, len = 72, join = "\n") {
        if (string.length <= len) return string;

        // Create the regex outside of the loop to avoid recompilation
        const wordWrapRegex = new RegExp(`(.{1,${len}})(\\s|$)|(.{${len}})`, 'g');
        const matches = [];
        let match;

        while ((match = wordWrapRegex.exec(string)) !== null) {
            // Add the matched group that is not undefined
            matches.push(match[1] || match[3]);
        }

        return matches.join(join).trim();
    }

    /**
     * Returns the Last-Modified date in Unix Timestamp format
     * @param {string} file Path to a file
     */
    getFileLastModified(file) {
        var stats = this.fs.lstatSync(file);
        if (stats) return new Date(stats.mtimeMs);
        return false;
    }

    /**
     * Returns the Last-Modified date in a RFC7231 compliant UTC Date String
     * @param {string} file Path to a file
     */
    getFileLastModifiedUTCString(file) {
        return this.getFileLastModified(file).toUTCString();
    }

    getFileLastModifiedUTCObj(file) {
        return new Date(new Date().setUTCSeconds(this.getFileLastModified(file).getUTCSeconds()));
    }

    /**
     * Returns a RFC7231 compliant UTC Date String from the current time
     * @param {Number} offset Offset from current time (+/-)
     * @returns {string} A RFC7231 compliant UTC Date String from the current time
     */
    getUTCTime(offset = 0) {
        return new Date((new Date).getTime() + offset).toUTCString();
    }

    /**
     * Converts a binary buffer to a urlencoded string
     * @param {ArrayBuffer} buf byte data array
     */
    urlEncodeBytes(buf) {
        if (!(buf instanceof Uint8Array)) {
            buf = new Uint8Array(buf);
        }

        const urlSafeChars = /[A-Za-z0-9_.~-]/;
        let encoded = '';
        let hex;

        for (let i = 0; i < buf.length; i++) {
            const byte = buf[i];
            // Check if the byte maps to a URL-safe character
            if (urlSafeChars.test(String.fromCharCode(byte))) {
                encoded += String.fromCharCode(byte);
            } else {
                // Convert byte to a two-character hexadecimal code
                hex = byte.toString(16);
                encoded += `%${hex.length === 1 ? '0' + hex : hex}`;
            }
        }

        return encoded.toUpperCase();
    }

    /**
     * Decodes a urlencoded string into a binary buffer
     * @param {string} encoded urlencoded string
     */
    urlDecodeBytes(encoded) {
        // Calculate the length of the decoded buffer
        let bufferLength = encoded.length;
        for (let i = 0; i < encoded.length; i++) {
            if (encoded[i] === '%') {
                bufferLength -= 2; // Each encoded sequence is three characters but represents one byte
                i += 2; // Skip the next two characters
            }
        }

        // Allocate a buffer of the correct size
        let decoded = Buffer.alloc(bufferLength);
        let bufferIndex = 0;

        for (let i = 0; i < encoded.length; i++) {
            if (encoded[i] === '%') {
                decoded[bufferIndex++] = parseInt(encoded.substr(i + 1, 2), 16);
                i += 2; // Skip the next two characters
            } else {
                decoded[bufferIndex++] = encoded.charCodeAt(i);
            }
        }

        return decoded;
    }

    censorSSID(ssid) {
        if (ssid) {
            if (ssid.slice(0, 8) === "MSTVSIMU") {
                return ssid.slice(0, 10) + ('*').repeat(10) + ssid.slice(20);
            } else if (ssid.slice(0, 5) === "1SEGA") {
                return ssid.slice(0, 6) + ('*').repeat(6) + ssid.slice(12);
            }
            return ssid.slice(0, 4) + ('*').repeat(9) + ssid.slice(-2);
        } else {
            return "????????????????";
        }
    }

    /**
    * Returns a censored SSID
    * @param {string|Array} obj SSID String or Headers Object
    */
    filterSSID(obj) {
        var new_obj = false;
        if (this.minisrv_config.config.hide_ssid_in_logs) {
            if (typeof obj === "string") {
                return this.censorSSID(obj);
            } else if (typeof obj === "object" && obj !== null) {
                if ("wtv-client-serial-number" in obj) {
                    new_obj = this.cloneObj(obj)
                    new_obj["wtv-client-serial-number"] = this.censorSSID(new_obj["wtv-client-serial-number"]);
                }
                return (new_obj != false) ? new_obj : obj;
            }
        }
        return obj;
    }


    filterRequestLog(obj) {
        const passwordRegex = /(^pass$|passw(or)?d)/i;
        var newobj = this.cloneObj(obj); // Clone the object once at the beginning

        if (newobj.query) {
            Object.keys(newobj.query).forEach((k) => {
                if (passwordRegex.test(k)) {
                    newobj.query[k] = '*'.repeat(newobj.query[k].length);
                }
            });
        }
        delete newobj.raw_headers;
        return newobj;
    }



    decodePostData(obj) {
        if (obj.post_data) {
            const filterPasswords = this.minisrv_config.config.filter_passwords_in_logs === true;
            try {
                // Assuming CryptoJS.enc.Utf8 exists and has a stringify method
                let post_text = CryptoJS.enc.Utf8.stringify(obj.post_data);
                let params = new URLSearchParams(post_text);

                if (filterPasswords) {
                    for (let [key, value] of params) {
                        const lowerKey = key.toLowerCase();
                        if (/passw(or)?d|^pass$/.test(lowerKey)) {
                            params.set(key, '*'.repeat(value.length));
                        }
                    }
                }

                // Assuming hexEncode method exists on the string prototype
                obj.post_data = filterPasswords ? params.toString().hexEncode() : params.toString();
            } catch (e) {
                // Fallback in case of an error
                if (!this.minisrv_config.config.debug_flags.quiet) {
                    console.error(' *** error decoding post data', e);
                }
                // Assuming CryptoJS.enc.Hex exists and has a stringify method
                obj.post_data = CryptoJS.enc.Hex.stringify(obj.post_data);
            }
        }
        return obj;
    }


    // DON'T USE THIS
    // Saved for reference until I come up with a better way
    // If used, this will exceed the stack limit over time
    unloadModule(moduleName) {
        // Search for the module in the require cache
        let resolvedPath = require.resolve(moduleName);

        // Remove the module from the cache
        if (require.cache[resolvedPath]) {
            delete require.cache[resolvedPath];
        }
    }

    /**
    * Returns an absolute path without an trailing path seperator
    * @param {string} path 
    * @param {string} directory Root directory
    */
    getAbsolutePath(path = '', directory = '.') {
        if (directory[0] == "/" || directory.substr(1, 2) == ":" + this.path.sep) {
            return this.path.resolve(directory + this.path.sep + path);
        }
        try {
            // start with our absolute path (of app.js)
            const appdir = this.path.resolve(__dirname + this.path.sep + '..' + this.path.sep + '..')

            if (path == '' && directory == '.') {
                return appdir;
            }
            // If the directory is a valid directory, prepend it to the path
            directory = this.path.resolve(appdir + this.path.sep + directory);
            if (!path) {
                return directory;
            }
            if (directory && !path.startsWith(directory)) {
                if (!directory.endsWith(this.path.sep)) {
                    directory += this.path.sep;
                }
                path = directory + path;
            }
        } catch (e) {
            // If there's an error accessing the directory, log it or handle as needed
            console.error('Error resolving directory:', e);
        }
        // The path.resolve method will take care of normalizing slashes
        return this.path.resolve(path);
    }



    /**
     * Returns a percentage
     * @param {number} partialValue
     * @param {number} totalValue
     * @returns {number} percentage
     */
    getPercentage = function (partialValue, totalValue) {
        return Math.floor((100 * partialValue) / totalValue);
    }

    /**
     * If the file ends with .gz, remove it
     * @param {string} path
     * @return {string} path without gz, or unmodified path if it isnt a gz
     */
    getFilePath(path) {
        var path_split = path.split(this.path.sep);
        path_split.pop();
        return path_split.join(this.path.sep);
    }

    /**
     * Gets the file extension from a path
     * @param {string} path
     * @returns {String} File Extension (without dot)
     */
    getFileExt(path) {
        return path.reverse().split(".")[0].reverse();
    }

    getLineFromFile(filename, lineNo, callback) {
        let lineCount = 0;
        const lineReader = this.readline.createInterface({
            input: this.fs.createReadStream(filename, {
                flags: 'r',
                encoding: 'utf-8'
            }),
            crlfDelay: Infinity
        });

        lineReader.on('line', (line) => {
            if (lineCount === lineNo) {
                lineReader.close();
                callback(null, line);
            }
            lineCount++;
        });

        lineReader.on('close', () => {
            if (lineCount < lineNo) {
                callback(new Error('File end reached without finding line'), null);
            }
        });

        lineReader.on('error', (err) => {
            callback(err, null);
        });
    }



    /**
     * Checks if service is enabled or disabled in the config
     * @param {string} service Service Name
     * @returns {boolean} true if enabled, false if disabled
     */
    isConfiguredService(service) {
        if (this.minisrv_config.services[service]) {
            if (!this.minisrv_config.services[service].disabled) return true;
        }
        return false;
    }

    /**
     * Create a wtv-service string for WebTV Headers
     * @param {string} service A single service name, or the string "all"
     * @param {object} overrides An object of overrides, used to exclude certain services when service is "all"
     * @returns {string} wtv-service string formatted for WebTV Headers
     */
    getServiceString(service, overrides = {}) {
        // used externally by service scripts
        if (service === "all") {
            var self = this;
            var out = "";
            Object.keys(this.minisrv_config.services).sort().forEach(function (k) {
                if (!self.isConfiguredService(k)) return true;
                if (self.minisrv_config.services[k].pc_services) return true;

                if (overrides.exceptions) {
                    Object.keys(overrides.exceptions).forEach(function (j) {
                        if (k != overrides.exceptions[j]) out += self.minisrv_config.services[k].toString(overrides) + "\n";
                    });
                } else {
                    out += self.minisrv_config.services[k].toString(overrides) + "\n";
                }
            });
            return out;
        } else {
            if (!this.minisrv_config.services[service]) {
                throw ("SERVICE ERROR: Attempted to provision unconfigured service: " + service)
            } else {
                return this.minisrv_config.services[service].toString(overrides);
            }
        }
    }

    /**
     * Creates a 302 redirect and returns the headers/data
     * @param {any} url
     * @returns [headers, data]
     */
    doRedirect(url) {
        var headers = []
        headers['Status'] = "302 Moved";
        headers["Location"] = url;
        headers["wtv-visit"] = url;
        var data = ''
        return [headers, data]
    }

    /**
     * Creates an error message and returns the headers/data
     * @param {number} code HTTP Error Code
     * @param {string} data Optinal Custom Error Message
     * @param {string} details Optional extra error information
     * @param {boolean} pc_mode If true, sends response formatted for PCs instead of WebTV
     * @param {boolean} wtv_reset if true, tells the WebTV box to reset the service list and reconnect
     */
    doErrorPage(code, data = null, details = null, pc_mode = false, wtv_reset = false) {
        const minisrv_config = this.minisrv_config;
        const errorMessage = minisrv_config.config.errorMessages[code] || "";
        const message = data || errorMessage.replace(/\$\{(\w+)\}/g, (match, p1) => minisrv_config.config[p1] || '');

        if (details && [400, 500].includes(code)) {
            data += "<br>Details:<br>" + details;
        }

        let headers = `Status: ${(pc_mode) ? 'HTTP/1.1' : ''} ${code} ${message}\n`;
        headers += "Content-Type: text/html\n";

        if (wtv_reset && !pc_mode) {
            headers += "wtv-service: reset\n";
            headers += this.getServiceString('wtv-1800') + "\n";
            headers += "wtv-visit: wtv-1800:/preregister?scriptless-visit-reason=999\n";
            console.error(" * doErrorPage Called (sent wtv-reset):", code, message);
        } else {
            console.error(" * doErrorPage Called:", code, message);
        }

        return [headers, message];
    }


    /**
     * Strips bad things from paths
     * @param {string} base Base path
     * @param {string} target Sub path
     */
    makeSafePath(base, target = null, force_forward_slash = false) {
        if (target) {
            target.replace(/[\|\&\;\$\%\@\"\<\>\+\,\\]/g, "");
            var targetPath = this.path.posix.normalize(target)
            var output = this.fixPathSlashes(base + this.path.sep + targetPath);
        } else {
            base.replace(/[\|\&\;\$\%\@\"\<\>\+\,\\]/g, "");
            var targetPath = this.path.posix.normalize(base)
            var output = this.fixPathSlashes(targetPath);
        }
        return (force_forward_slash) ? output.replace(this.path.sep, '/') : output;
    }

    /**
     * Returns a string with certain characters stripped out
     * @param {string} username String to filter
     */
    makeSafeUsername(username) {
        return username.replace(/^([A-Za-z0-9\-\_])$/g, '');
    }

    /**
     * Corrects any / or \ differences, if any for file paths
     * @param {string} path
     * @returns {string} corrected path
     */
    fixPathSlashes(path) {
        const pathModule = require('path');

        // Normalize the slashes to the current environment's default.
        const normalizedPath = path.replace(/[\\/]+/g, pathModule.sep);

        // The path.normalize will also resolve any '..' and '.' segments.
        return pathModule.normalize(normalizedPath);
    }


    /**
     * Makes sure an SSID is clean, and doesn't contain any exploitable characters
     * @param {string} ssid
     * @returns {string} Sanitized SSID
     */
    makeSafeSSID(ssid = "") {
        ssid = ssid.replace(/[^a-zA-Z0-9]/g, "");
        if (ssid.length == 0) ssid = null;
        return ssid;
    }

    makeSafeStringPath(path = "") {
        path = path.replace(/[^\w]/g, "").replace(/\.\./g, "");
        if (path.length == 0) path = null;
        return path;
    }

    unpackCompressedB64(data) {        
        var data_buf = (typeof data === 'object') ? Buffer.from(data.toString('ascii'), 'base64') : Buffer.from(data, 'base64');
        return this.zlib.inflateSync(data_buf, { finishFlush: this.zlib.Z_SYNC_FLUSH }).toString('ascii');
    }

    /**
     * Compresses data and converts it to a base64 string
     * @param {any} data
     * @returns {string} base64 string
     */
    packCompressedB64(data) {
        return this.zlib.deflateSync(data, { 'level': 9 }).toString('base64');
    }

    /**
     * Gets a Service Dependency from the first available Vault.
     * @param {string} file The Path to the file
     * @param {boolean} path_only If true, return the path, not the file contents
     * @param {boolean} template If true, looks under templates subdir.
     */
    getServiceDep(file, path_only = false, template = false) {
        var self = this;
        var outdata = null;
        var found = false
        this.minisrv_config.config.ServiceDeps.forEach(function (dep_vault_dir) {
            if (found) return;
            if (template) dep_vault_dir += self.path.sep + "templates";

            var search = self.getAbsolutePath(file, dep_vault_dir);
            if (self.fs.existsSync(search)) {
                if (path_only) outdata = search;
                else outdata = self.fs.readFileSync(search);
                found = true;
                return false;
            }
        });
        return outdata;
    }

    /**
     * A convenience alias for getServiceDep
     * @param {string} service_name Service Name
     * @param {string} path Path to the template under the service directory
     * @param {boolean} path_only  If true, return the path, not the file contents
     */
    getTemplate(service_name, path, path_only = false) {
        return this.getServiceDep(service_name + this.path.sep + path, path_only, true);
    }


    /**
     * Finds a key in an object
     * @param {string} key The key to find
     * @param {object} obj The object to search
     * @param {boolean} case_insensitive Search case insensitive
     * @returns 
     */
    findObjectKeyIndex(key, obj, case_insensitive = false) {
        const keys = Object.keys(obj);
        if (case_insensitive) {
            key = key.toLowerCase();
            return keys.findIndex(k => k.toLowerCase() === key);
        }
        return keys.indexOf(key);
    }
    /**
     * Moves an object to the desired location in the object (reorder)
     * @param {string|int} currentKey Name of the object Key to move or the index to move
     * @param {string|int} destKey Name of the object key to place currentKey after or the index to place it at
     * @param {object} obj The object to work on
     * @param {boolean} case_insensitive Search case insensitive
     * @returns {object} The modified object
     */
    moveObjectKey(currentKey, destKey, obj, case_insensitive = false) {
        let keys = Object.keys(obj);
        let values = Object.values(obj);

        const currentIndex = typeof currentKey === 'string' ? this.findObjectKeyIndex(currentKey, obj, case_insensitive) : parseInt(currentKey);
        if (currentIndex === -1) return obj;

        var destIndex = typeof destKey === 'string' ? this.findObjectKeyIndex(destKey, obj, case_insensitive) : parseInt(destKey);

        // Bump by one if the destKey is a string (put after the key)
        if (typeof destKey === 'string' && destIndex !== -1) destIndex++;

        // If destKey is not found or not defined, don't move the element
        if (isNaN(destIndex)) return obj;

        // Remove the current element from keys and values
        const [currentKeyValue] = values.splice(currentIndex, 1);
        const [currentKeyName] = keys.splice(currentIndex, 1);

        // Insert the current element after the destKey position
        keys.splice(destIndex, 0, currentKeyName);
        values.splice(destIndex, 0, currentKeyValue);

        // Reconstruct the object with the new order
        const result = {};
        keys.forEach((key, index) => {
            result[key] = values[index];
        });

        return result;
    }

    /**
     * Find a key in an object regardless of its case
     * @param {string} key Key to find
     * @param {obj} obj Object to search
     * @returns {string|null} The found key or null if not found
     */
    getCaseInsensitiveKey(key, obj) {
        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
        return foundKey || null;
    }
}

class clientShowAlert {
    message = null;
    buttonlabel1 = null;
    buttonlabel2 = null;
    buttonaction1 = null;
    buttonaction2 = null;
    noback = null;
    image = null;

    /**
     * User-friendly client:showalert generation
     * @param {string} image Image URL
     * @param {string} message Alert Message (HTML Allowed)
     * @param {string} buttonlabel1 Button 1 Label
     * @param {string} buttonaction1 Button 1 Action
     * @param {string} buttonlabel2 Button 2 Label
     * @param {string} buttonaction2 Button 2 Action
     * @param {string} noback If true, disables the back button
     * @param {string} sound Sound to play
     */
    constructor(image = null, message = null, buttonlabel1 = null, buttonaction1 = null, buttonlabel2 = null, buttonaction2 = null, noback = null, sound = null) {
        this.message = message;
        this.buttonlabel1 = buttonlabel1;
        this.buttonlabel2 = buttonlabel2;
        this.buttonaction1 = buttonaction1;
        this.buttonaction2 = buttonaction2;
        this.message = message;
        this.noback = noback;
        this.sound = sound;
        if (this.sound === false) this.sound = "none";

        if (typeof image === 'object') {
            this.image = null;
            Object.keys(image).forEach(function (k) {
                if (this[k] === null) this[k] = image[k];
            }, this);
        } else {
            this.image = image;
        }
    }

    /**
     * Get the client:showalert URL from the helper class
     * @returns {string} client:showalert URL
     */
    getURL() {
        var url = "client:ShowAlert?";
        if (this.message) url += "message=" + escape(this.message) + "&";
        if (this.buttonlabel1) url += "buttonlabel1=" + escape(this.buttonlabel1) + "&";
        if (this.buttonaction1) url += "buttonaction1=" + escape(this.buttonaction1) + "&";
        if (this.buttonlabel2) url += "buttonlabel2=" + escape(this.buttonlabel2) + "&";
        if (this.buttonaction2) url += "buttonaction2=" + escape(this.buttonaction2) + "&";
        if (this.image) url += "image=" + escape(this.image) + "&";
        if (this.sound) url += "sound=" + escape(this.sound) + "&";
        if (this.noback) url += "noback=true&";
        return url.substring(0, url.length - 1);
    }
}

module.exports.WTVShared = WTVShared;
module.exports.clientShowAlert = clientShowAlert;
