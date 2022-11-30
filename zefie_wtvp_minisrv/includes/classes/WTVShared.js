/** 
 * Shared functions across all classes and apps
 */
const CryptoJS = require('crypto-js');

class WTVShared {

    path = require('path');
    fs = require('fs');
    v8 = require('v8');
    zlib = require('zlib');
    html_entities = require('html-entities'); // used externally by service scripts
    sanitizeHtml = require('sanitize-html');
    iconv = require('iconv-lite');
    parentDirectory = process.cwd()
    extend = require('util')._extend;
    debug = require('debug')('WTVShared')

    minisrv_config = [];
    
    constructor(minisrv_config, quiet = false) {
        if (minisrv_config == null) this.minisrv_config = this.readMiniSrvConfig(true, !quiet);
        else this.minisrv_config = minisrv_config;
       
        if (!String.prototype.reverse) {
            String.prototype.reverse = function () {
                var splitString = this.split("");
                var reverseArray = splitString.reverse();
                var joinArray = reverseArray.join("");
                return joinArray;
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

    getSSIDCRC(ssid) {
        let crc = 0;
        var ssid = ssid.substr(0, 14);

        for (let i = 0; i < ssid.length; i += 2) {
            let inbyte = parseInt(ssid.substring(i, i + 2), 16);
            for (let ii = 8; ii > 0; ii--) {
                let mix = (crc ^ inbyte) & 0x01;
                crc >>= 1;
                if (mix != 0) crc ^= 0x8C;
                inbyte >>= 1;
            }

            if (isNaN(crc)) crc = 0;
        }

        var out = crc.toString(16);
        if (out.length == 1) return "0" + out;
        else return out;
    }

    parseConfigVars(s) {
        if (s.indexOf("%ServiceDeps%") >= 0) {
            return this.getServiceDep(s.replace("%ServiceDeps%", ""), true);
        } else {
            return s;
        }
    }

    atob(a) {
        const CryptoJS = require('crypto-js');
        const enc = CryptoJS.enc.Base64.parse(a);
        return CryptoJS.enc.Utf8.stringify(enc)
    }

    btoa(b) {
        const CryptoJS = require('crypto-js');
        const enc = CryptoJS.enc.Utf8.parse(b); // encodedWord Array object
        return CryptoJS.enc.Base64.stringify(enc);
    }

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
            Object.keys(src).forEach((k )=> {
                clone[k] = self.cloneObj(src[k]);
            });
            return clone;
        }
        return src;
    }

    isAdmin(wtvclient, service_name = "wtv-admin") {
        var  WTVAdmin = require("./WTVAdmin.js");
        var wtva = new WTVAdmin(this.minisrv_config, wtvclient, service_name);
        var result = wtva.isAuthorized(true);
        wtva, WTVAdmin = null;
        return result;
    }

    parseJSON(json) {
        if (!json) return null;
        if (typeof json !== 'string') json = json.toString();

        // from https://github.com/getify/JSON.minify/blob/javascript/minify.json.js
        var tokenizer = /"|(\/\*)|(\*\/)|(\/\/)|\n|\r/g,
            in_string = false,
            in_multiline_comment = false,
            in_singleline_comment = false,
            tmp, tmp2, new_str = [], ns = 0, from = 0, lc, rc,
            prevFrom
            ;

        tokenizer.lastIndex = 0;

        while (tmp = tokenizer.exec(json)) {
            lc = RegExp.leftContext;
            rc = RegExp.rightContext;
            if (!in_multiline_comment && !in_singleline_comment) {
                tmp2 = lc.substring(from);
                if (!in_string) {
                    tmp2 = tmp2.replace(/(\n|\r|\s)+/g, "");
                }
                new_str[ns++] = tmp2;
            }
            prevFrom = from;
            from = tokenizer.lastIndex;

            // found a " character, and we're not currently in
            // a comment? check for previous `\` escaping immediately
            // leftward adjacent to this match
            if (tmp[0] == "\"" && !in_multiline_comment && !in_singleline_comment) {
                // perform look-behind escaping match, but
                // limit left-context matching to only go back
                // to the position of the last token match
                //
                // see: https://github.com/getify/JSON.minify/issues/64
                tmp2 = lc.substring(prevFrom).match(/\\+$/);

                // start of string with ", or unescaped " character found to end string?
                if (!in_string || !tmp2 || (tmp2[0].length % 2) == 0) {
                    in_string = !in_string;
                }
                from--; // include " character in next catch
                rc = json.substring(from);
            }
            else if (tmp[0] == "/*" && !in_string && !in_multiline_comment && !in_singleline_comment) {
                in_multiline_comment = true;
            }
            else if (tmp[0] == "*/" && !in_string && in_multiline_comment && !in_singleline_comment) {
                in_multiline_comment = false;
            }
            else if (tmp[0] == "//" && !in_string && !in_multiline_comment && !in_singleline_comment) {
                in_singleline_comment = true;
            }
            else if ((tmp[0] == "\n" || tmp[0] == "\r") && !in_string && !in_multiline_comment && in_singleline_comment) {
                in_singleline_comment = false;
            }
            else if (!in_multiline_comment && !in_singleline_comment && !(/\n|\r|\s/.test(tmp[0]))) {
                new_str[ns++] = tmp[0];
            }
        }
        new_str[ns++] = rc;
        return JSON.parse(new_str.join(""));
    }

    isConfiguredService(service) {
        if (this.minisrv_config.services[service]) {
            if (!this.minisrv_config.services[service].disabled) return true;
        }
        return false;
    }

    getServiceString(service, overrides = {}) {
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
            if (!this.minisrv_config.services[service]) {
                throw ("SERVICE ERROR: Attempted to provision unconfigured service: " + service)
            } else {
                return this.minisrv_config.services[service].toString(overrides);
            }
        }
    }

    parseBool(val) {
        if (typeof val === 'string')
            val = val.toLowerCase();

        return (val === true || val == "on" || val === "true" || val === 1);
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

    htmlEntitize(string, process_newline = false) {
        string = this.html_entities.encode(string).replace(/&apos;/g, "'");

        if (process_newline) string = string.replace(/\n/gi, "<br>").replace(/\r/gi, "");
        return string;
    }

    sanitizeSignature(string) {
        var allowedSchemes = ['http', 'https', 'ftp', 'mailto'];
        var self = this;
        Object.keys(this.minisrv_config.services).forEach(function (k) {
            var flags = self.minisrv_config.services[k].flags;
            if (flags) {
                if (flags == "0x00000004" || flags == "0x00000007") {
                    allowedSchemes.push(self.minisrv_config.services[k].name);
                }
            }
        });

        var allowedProtocols = allowedSchemes;
        // allow links to services flagged as "wideopen"
        Object.keys(this.minisrv_config.services).forEach((k) => {
            var flag = parseInt(this.minisrv_config.services[k].flags, 16);
            if (flag === 4 || flag === 7) {
                if (!allowedProtocols.includes(k)) allowedProtocols.push(k);
            }
        });
        self.debug("sanitizeSignature", "allowed protocols:", allowedProtocols);

        const clean = this.sanitizeHtml(string, {
            allowedTags: ['a', 'audioscope', 'b', 'bgsound', 'big', 'blackface', 'blockquote', 'bq', 'br', 'caption', 'center', 'cite', 'c', 'dd', 'dfn', 'div', 'dl', 'dt', 'fn', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'html', 'i', 'img', 'label', 'li', 'link', 'listing', 'em', 'marquee', 'nobr', 'note', 'ol', 'p', 'plaintext', 'pre', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'tbody', 'table', 'td', 'th', 'tr', 'tt', 'u', 'ul'],
            disallowedTagsMode: 'discard',
            allowedAttributes: {
                a: ['href', 'name', 'target'],
                img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
                bgsound: ['src', 'loop'],
                font: ['size', 'name', 'color'],
                marquee: ['speed'],
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
                        Object.keys(allowedProtocols).forEach((j) => {
                            if (value.startsWith(allowedProtocols[j])) {
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


    isASCII(str) {
        if (typeof str !== 'string') return false;
        for (var i = 0, strLen = str.length; i < strLen; ++i) {
            if (str.charCodeAt(i) > 127) return false;
        }
        return true;
    }

    isHTML(str) {
        return /<\/?[a-z][\s\S]*>/i.test()
    }

    isBase64(str, opts) {
        // from https://github.com/miguelmota/is-base64/blob/master/is-base64.js
        if (str instanceof Boolean || typeof str === 'boolean') {
            return false
        }

        if (!(opts instanceof Object)) {
            opts = {}
        }

        if (opts.allowEmpty === false && str === '') {
            return false
        }

        var regex = '(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}==|[A-Za-z0-9+\/]{3}=)?'
        var mimeRegex = '(data:\\w+\\/[a-zA-Z\\+\\-\\.]+;base64,)'

        if (opts.mimeRequired === true) {
            regex = mimeRegex + regex
        } else if (opts.allowMime === true) {
            regex = mimeRegex + '?' + regex
        }

        if (opts.paddingRequired === false) {
            regex = '(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}(==)?|[A-Za-z0-9+\\/]{3}=?)?'
        }

        return (new RegExp('^' + regex + '$', 'gi')).test(str)
    }

    utf8Decode(utf8String) {
        if (typeof utf8String != 'string') throw new TypeError('parameter ‘utf8String’ is not a string');
        // note: decode 3-byte chars first as decoded 2-byte strings could appear to be 3-byte char!
        const unicodeString = utf8String.replace(
            /[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g,  // 3-byte chars
            function (c) {  // (note parentheses for precedence)
                var cc = ((c.charCodeAt(0) & 0x0f) << 12) | ((c.charCodeAt(1) & 0x3f) << 6) | (c.charCodeAt(2) & 0x3f);
                return String.fromCharCode(cc);
            }
        ).replace(
            /[\u00c0-\u00df][\u0080-\u00bf]/g,                 // 2-byte chars
            function (c) {  // (note parentheses for precedence)
                var cc = (c.charCodeAt(0) & 0x1f) << 6 | c.charCodeAt(1) & 0x3f;
                return String.fromCharCode(cc);
            }
        );
        return unicodeString;
    }

    decodeBufferText(buf) {
        var out = "";
        out = this.utf8Decode(this.iconv.decode(Buffer.from(buf),'ISO-8859-1'));
        return out;
    }

    returnAbsolutePath(check_path) {
        if (check_path.substring(0, 1) != this.path.sep && check_path.substring(1, 2) != ":") {
            // non-absolute path, so use current directory as base
            check_path = this.parentDirectory + this.path.sep + check_path;
        } else {
            // already absolute path
        }
        return this.fixPathSlashes(check_path);
    }

    isMiniBrowser(ssid_session) {
        return (ssid_session.get("wtv-need-upgrade") || ssid_session.get("wtv-used-8675309")) ? true : false;
    }

    isOldBuild(ssid_session) {
        return (this.isMiniBrowser(ssid_session) || parseInt(ssid_session.get("wtv-system-version")) < 3500) ? true : false;
    }

    getUserConfig() {
        try {
            var user_config_filename = this.getAbsolutePath("user_config.json", this.parentDirectory);

            if (this.fs.lstatSync(user_config_filename)) {
                try {
                    var minisrv_user_config = this.parseJSON(this.fs.readFileSync(user_config_filename));
                } catch (e) {
                    throw ("ERROR: Could not read user_config.json", e);
                }
            } else {
                var minisrv_user_config = {}
            }
            return minisrv_user_config;
        } catch (e) {
            if (minisrv_config.config.debug_flags) {
                if (minisrv_config.config.debug_flags.debug) console.error(" * Notice: Could not find user configuration (user_config.json). Using default configuration.");
            }
        }
    }

    parseSSID(ssid) {
        var ssid_obj = {};
        switch (ssid.substring(0, 2)) {
            case "01":
                ssid_obj.boxType = "Internal";
                break;
            case "81":
                ssid_obj.boxType = "Retail";
                break;
            case "91":
                // not a definitive way to detect a viewer
                ssid_obj.boxType = "Viewer";
                break;
        }
        ssid_obj.unique_id = ssid.substring(2, 8);
        switch (ssid.substring(10, 14).toUpperCase()) {
            case "B002":                
                ssid_obj.region = "US/Canada";
                break;
            case "B102":
                ssid_obj.region = "Japan";
                break;
        }

        switch (ssid.substring(8, 10).toUpperCase()) {
            case "00":
                if (ssid_obj.region == "Japan") ssid_obj.manufacturer = "Panasonic";
                else ssid_obj.manufacturer = "Sony";
                break;
            case "10":
            case "50":
                ssid_obj.manufacturer = "Philips";
                break;
            case "40":
                ssid_obj.manufacturer = "Mitsubishi";
                break;
            case "70":
                ssid_obj.manufacturer = "Samsung";
                break;
            case "80":
                ssid_obj.manufacturer = "EchoStar";
                break;
            case "90":
                ssid_obj.manufacturer = "RCA";
                break;
            case "AE":
                ssid_obj.manufacturer = "zefie & MattMan69";
                break;
        }
        ssid_obj.crc = ssid.substring(14)
        return ssid_obj;
    }

    getManufacturer(ssid) {
        return parseSSID(ssid).manufacturer || null;
    }


    moveObjectElement(currentKey, afterKey, obj, caseInsensitive = false) {
        var result = {};
        if (caseInsensitive) {
            Object.keys(obj).forEach((k) => {
                if (k.toLowerCase() == currentKey.toLowerCase()) {
                    currentKey = k;
                    return false;
                }
            })
        }       
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
            if (k == afterKey || (caseInsensitive && k.toLowerCase() == afterKey.toLowerCase())) { next = 1; }
            result[k] = v;
            ++i;
        });
        if (next == 1) {
            result[currentKey] = val;
        }
        if (next !== -1) return result; else return obj;
    }

    readMiniSrvConfig(user_config = true, notices = true, reload_notice = false) {
        if (notices || reload_notice) console.log(" *** Reading global configuration...");
        try {
            var minisrv_config = this.parseJSON(this.fs.readFileSync(this.getAbsolutePath(".." + this.path.sep + "config.json", __dirname)));
        } catch (e) {
            throw ("ERROR: Could not read config.json", e);
        }

        var integrateConfig = function(main, user) {
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

        if (user_config) {
            try {
                if (notices || reload_notice) console.log(" *** Reading user configuration...");
                var minisrv_user_config = this.getUserConfig()
                if (!minisrv_user_config) throw "ERROR: Could not read user_config.json";
                try {
                    minisrv_config = integrateConfig(minisrv_config, minisrv_user_config)
                } catch (e) {
                    console.error("ERROR: Could not read user_config.json", e);
                }
            } catch (e) {
                if (minisrv_config.config.debug_flags) {
                    if (minisrv_config.config.debug_flags.debug) console.error(" * Notice: Could not find user configuration (user_config.json). Using default configuration.");
                }
            }
        }

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
                    if (notices) console.log(" * Console Verbosity level 0 (quietest)")
                    break;
                case 1:
                    minisrv_config.config.debug_flags.debug = false;
                    minisrv_config.config.debug_flags.quiet = true;
                    minisrv_config.config.debug_flags.show_headers = true;
                    if (notices) console.log(" * Console Verbosity level 1 (headers shown)")
                    break;
                case 2:
                    minisrv_config.config.debug_flags.debug = true;
                    minisrv_config.config.debug_flags.quiet = true;
                    minisrv_config.config.debug_flags.show_headers = false;
                    if (notices) console.log(" * Console Verbosity level 2 (verbose without headers)")
                    break;
                case 3:
                    minisrv_config.config.debug_flags.debug = true;
                    minisrv_config.config.debug_flags.quiet = true;
                    minisrv_config.config.debug_flags.show_headers = true;
                    if (notices) console.log(" * Console Verbosity level 3 (verbose with headers)")
                    break;
                default:
                    minisrv_config.config.debug_flags.debug = true;
                    minisrv_config.config.debug_flags.quiet = false;
                    minisrv_config.config.debug_flags.show_headers = true;
                    if (notices) console.log(" * Console Verbosity level 4 (debug verbosity)")
                    break;
            }
        }

        if (notices || reload_notice) console.log(" *** Configuration successfully read.");
        this.minisrv_config = minisrv_config;
        return this.minisrv_config;
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
                    this.fs.writeFileSync(this.getAbsolutePath("user_config.json", this.parentDirectory), JSON.stringify(new_user_config, null, "\t"));
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

    generateString(len, extra_chars = null) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        if (extra_chars) characters += extra_chars;
        var charactersLength = characters.length;
        for (var i = 0; i < len; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }

    generatePassword(len, simple = false) {
        return this.generateString(len, (simple) ? null : '!@#$%&()[]-_+=?.');
    }

    getMiniSrvConfig() {
        return this.minisrv_config;
    }

    lineWrap(string, len = 72, join = "\n") {
        if (string.length <= len) return string;
        var split;

        if (string.match(" ")) {
            // split if text with space, respecting words
            split = string.match(new RegExp('([\\s\\S]){1,' + len + '}?!\\S', "g"));
        }
        if (!split) {
            // fallback if above failed, or if its just a really long word (eg base64)
            split = string.match(new RegExp('.{1,' + len + '}', "g"));
        } else Object.keys(split).forEach((k) => {
            if (split[k].substr(0, 1) == ' ') split[k] = split[k].trim(' ');
        });

        if (split) return split.join(join);
        else return null;            
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

    /**
     * Returns a RFC7231 compliant UTC Date String from the current time
     * @param {Number} offset Offset from current time (+/-)
     * @returns {string} A RFC7231 compliant UTC Date String from the current time
     */
    getUTCTime(offset = 0) {
        return new Date((new Date).getTime() + offset).toUTCString();
    }

    urlEncodeBytes = (buf) => {
        let encoded = ''
        for (let i = 0; i < buf.length; i++) {
            const charBuf = Buffer.from('00', 'hex')
            charBuf.writeUInt8(buf[i])
            const char = charBuf.toString()
            // if the character is safe, then just print it, otherwise encode
            if (isUrlSafe(char)) {
                encoded += char
            } else {
                encoded += `%${charBuf.toString('hex').toUpperCase()}`
            }
        }
        return encoded
    }

    urlDecodeBytes = (encoded) => {
        let decoded = Buffer.from('')
        for (let i = 0; i < encoded.length; i++) {
            if (encoded[i] === '%') {
                const charBuf = Buffer.from(`${encoded[i + 1]}${encoded[i + 2]}`, 'hex')
                decoded = Buffer.concat([decoded, charBuf])
                i += 2
            } else {
                const charBuf = Buffer.from(encoded[i])
                decoded = Buffer.concat([decoded, charBuf])
            }
            
        }
        return decoded
    }

    /**
    * Returns a censored SSID
    * @param {string|Array} obj SSID String or Headers Object
    */
    filterSSID(obj) {
        if (this.minisrv_config.config.hide_ssid_in_logs === true) {
            if (typeof (obj) == "string") {
                if (obj.substr(0, 8) == "MSTVSIMU") {
                    return obj.substr(0, 10) + ('*').repeat(10) + obj.substr(20);
                } else if (obj.substr(0, 5) == "1SEGA") {
                    return obj.substr(0, 6) + ('*').repeat(6) + obj.substr(13);
                } else {
                    return obj.substr(0, 6) + ('*').repeat(9);
                }
            } else {
                var newobj = this.cloneObj(obj);
                if (obj.post_data) newobj.post_data = obj.post_data;
                if (newobj["wtv-client-serial-number"]) {
                    var ssid = newobj["wtv-client-serial-number"];
                    if (ssid.substr(0, 8) == "MSTVSIMU") {
                        newobj["wtv-client-serial-number"] = ssid.substr(0, 10) + ('*').repeat(10) + ssid.substr(20);
                    } else if (ssid.substr(0, 5) == "1SEGA") {
                        newobj["wtv-client-serial-number"] = ssid.substr(0, 6) + ('*').repeat(6) + ssid.substr(13);
                    } else {
                        newobj["wtv-client-serial-number"] = ssid.substr(0, 6) + ('*').repeat(9);
                    }
                }
                return newobj;
            }
        } else {
            return obj;
        }
    }

    filterRequestLog(obj) {
        if (this.minisrv_config.config.filter_passwords_in_logs === true) {
            if (obj.query) {
                var newobj = this.cloneObj(obj);
                try {
                    Object.keys(obj.query).forEach(function (k) {
                        var key = k.toLowerCase();
                        switch (true) {
                            case /passw(or)?d/.test(key):
                            case /^pass$/.test(key):
                                newobj.query[key] = ('*').repeat(newobj.query[key].length);
                                break;
                        }
                    });
                    return newobj;
                } catch (e) {
                    if (!this.minisrv_config.config.debug_flags.quiet) console.error(' *** error filtering logs', e);
                    return obj;
                }
            }
        }
        return obj;
    }

    decodePostData(obj) {
        if (obj.post_data) {
            if (this.minisrv_config.config.filter_passwords_in_logs === true) {
                // complex, to filter
                var post_obj = {};
                post_obj.query = [];
                try {
                    var post_text = obj.post_data.toString(CryptoJS.enc.Utf8);
                    if (post_text.length > 0) {
                        post_text = post_text.split("&");
                        for (let i = 0; i < post_text.length; i++) {
                            var qraw_split = post_text[i].split("=");
                            if (qraw_split.length == 2) {
                                var k = qraw_split[0];
                                post_obj.query[k] = unescape(post_text[i].split("=")[1].replace(/\+/g, "%20"));
                            }
                        }
                    }
                var post_obj = this.filterRequestLog(post_obj);
                post_text = "";
                Object.keys(post_obj.query).forEach(function (k) {
                    post_text += k + "=" + post_obj.query[k] + "&";
                });
                post_text = post_text.substring(0, post_text.length - 1);
                obj.post_data = post_text.hexEncode();
                } catch (e) {
                    obj.post_data = obj.post_data.toString(CryptoJS.enc.Hex);
                }
            } else {
                // simple, no filter
                obj.post_data = obj.post_data.toString();
            }
        }
        return obj;
    }

    unloadModule(moduleName) {
        // for handling template classes
        var solvedName = require.resolve(moduleName),
            nodeModule = require.cache[solvedName];
        if (nodeModule) {
            for (var i = 0; i < nodeModule.children.length; i++) {
                var child = nodeModule.children[i];
                this.unloadModule(child.filename);
            }
            delete require.cache[solvedName];
        }
    }

    /**
    * Returns an absolute path
    * @param {string} path 
    * @param {string} directory Root directory
    */
    getAbsolutePath(path, directory = null) {
        if (directory) {
            if (path.indexOf(directory) == -1) {
                directory = this.getAbsolutePath(directory);
                try {
                    if (this.fs.lstatSync(directory).isDirectory()) directory = directory + this.path.sep;
                } catch (e) { }
                path = directory + path;
            }
        }
        return this.fixPathSlashes(this.path.resolve(path));
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
        var path_split = path.split('/');
        path_split.pop();
        return path_split.join('/');
    }

    /**
     * Gets the file extension from a path
     * @param {string} path
     * @returns {String} File Extension (without dot)
     */
    getFileExt(path) {
        return path.reverse().split(".")[0].reverse();
    }

    getLineFromFile(filename, line_no, callback) {
        var stream = this.fs.createReadStream(filename, {
            flags: 'r',
            encoding: 'utf-8',
            fd: null,
            bufferSize: 64 * 1024
        });


        var fileData = '';
        stream.on('data', function (data) {
            fileData += data;

            // The next lines should be improved
            var lines = fileData.split("\n");

            if (lines.length >= +line_no) {
                stream.destroy();
                callback(null, lines[+line_no]);
            }
        });

        stream.on('error', function () {
            callback('Error', null);
        });

        stream.on('end', function () {
            callback('File end reached without finding line', null);
        });
    }

    doErrorPage(code, data = null, details = null,  pc_mode = false, wtv_reset = false) {
        var headers = null;
        var minisrv_config = this.minisrv_config;
        switch (code) {
            case 401:
                if (data === null) data = minisrv_config.config.errorMessages[code].replace(/\$\{(\w{1,})\}/g, function (x) { return minisrv_config.config[x.replace("${", '').replace('}', '')] });
                if (pc_mode) headers = "401 Unauthorized\n";
                else headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
            case 403:
                if (data === null) data = minisrv_config.config.errorMessages[code].replace(/\$\{(\w{1,})\}/g, function (x) { return minisrv_config.config[x.replace("${", '').replace('}', '')] });
                if (pc_mode) headers = "403 Forbidden\n";
                else headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
            case 404:
                if (data === null) data = minisrv_config.config.errorMessages[code].replace(/\$\{(\w{1,})\}/g, function (x) { return minisrv_config.config[x.replace("${", '').replace('}', '')] });
                if (pc_mode) headers = "404 Not Found\n";
                else headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
            case 400:
            case 500:
                if (data === null) data = minisrv_config.config.errorMessages[code].replace(/\$\{(\w{1,})\}/g, function (x) { return minisrv_config.config[x.replace("${", '').replace('}', '')] });
                if (details) data += "<br>Details:<br>" + details;
                if (pc_mode) headers = "500 Internal Server Error\n";
                else headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
            default:
                if (data === null && this.minisrv_config.config.errorMessages[code]) data = minisrv_config.config.errorMessages[code].replace(/\$\{(.+)\}/g, function (x) { return minisrv_config.config[x.replace("${",'').replace('}','')] });
                headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
        }
        if (wtv_reset && !pc_mode) {
            headers += "wtv-service: reset\n";
            headers += this.getServiceString('wtv-1800') + "\n";
            headers += "wtv-visit: wtv-1800:/preregister?scriptless-visit-reason=999\n";
            console.error(" * doErrorPage Called (sent wtv-reset):", code, data);
        } else console.error(" * doErrorPage Called:", code, data);
        return new Array(headers, data);
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

    makeSafeUsername(username) {
        return username.replace(/^([A-Za-z0-9\-\_]{5,16})$/, '');
    }

    /**
     * Corrects any / or \ differences, if any for file paths
     * @param {string} path
     * @returns {string} corrected path
     */
    fixPathSlashes(path) {
        // fix slashes
        if (this.path.sep === "/" && path.indexOf("\\") != -1) path = path.replace(/\\/g, this.path.sep);
        else if (this.path.sep === "\\" && path.indexOf("/") != -1) path = path.replace(/\//g, this.path.sep);
        
        // remove double slashes
        while (path.indexOf(this.path.sep + this.path.sep) != -1) path = path.replace(this.path.sep + this.path.sep, this.path.sep);

        return path;
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

    packCompressedB64(data) {
        return this.zlib.deflateSync(data, { 'level': 9 }).toString('base64');
    }

    getServiceDep(file, path_only = false, template = false) {
        var self = this;
        var outdata = null;
        var found = false
        this.minisrv_config.config.ServiceDeps.forEach(function (dep_vault_dir) {
            if (found) return;
            if (template) dep_vault_dir += self.path.sep + "templates";

            var search = self.getAbsolutePath(dep_vault_dir + self.path.sep + file);
            if (self.fs.existsSync(search)) {
                if (path_only) outdata = search;
                else outdata = self.fs.readFileSync(search);
                found = true;
                return false;
            }
        });
        return outdata;
    }

    getTemplate(service_name, path, path_only = false) {
        return this.getServiceDep(service_name + this.path.sep + path, path_only, true);
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