/** 
 * Shared functions across all classes and apps
 */


class WTVShared {

    path = require('path');
    fs = require('fs');
    v8 = require('v8');
    CryptoJS = require('crypto-js');
    html_entities = require('html-entities'); // used externally by service scripts
    sanitizeHtml = require('sanitize-html');
    iconv = require('iconv-lite');

    minisrv_config = [];
    
    constructor(minisrv_config) {
        if (minisrv_config == null) this.minisrv_config = this.readMiniSrvConfig();
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

        const clean = this.sanitizeHtml(string, {
            allowedTags: ['a', 'audioscope', 'b', 'bgsound', 'big', 'blackface', 'blockquote', 'bq', 'br', 'caption', 'center', 'cite', 'c', 'dd', 'dfn', 'div', 'dl', 'dt', 'fn', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'html', 'i', 'img', 'label', 'li', 'link', 'listing', 'em', 'marquee', 'nobr', 'note', 'ol', 'p', 'plaintext', 'pre', 's', 'samp', 'small', 'span', 'strike', 'strong', 'style', 'sub', 'sup', 'tbody', 'table', 'td', 'th', 'tr', 'tt', 'u', 'ul'],
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
            allowVulnerableTags: true,
            allowProtocolRelative: false
        })
        // todo: add missing user open tags (eg </i> if user did not close it) (might be done by sanitize-html?)
        // todo: figure out bgcolor and text color voodoo
        return clean;
    }


    isASCII(str) {
        for (var i = 0, strLen = str.length; i < strLen; ++i) {
            if (str.charCodeAt(i) > 127) return false;
        }
        return true;
    }

    isHTML(str) {
        return /<[a-z][\s\S]*>/i.test(str);
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
        if (check_path.substring(0, 1) != this.path.sep && check_path.substring(1, 1) != ":") {
            // non-absolute path, so use current directory as base
            check_path = (__dirname + this.path.sep + check_path);
        } else {
            // already absolute path
        }
        return check_path;
    }

    isMiniBrowser(ssid_session) {
        return (ssid_session.get("wtv-need-upgrade") || ssid_session.get("wtv-used-8675309")) ? true : false;
    }

    isOldBuild(ssid_session) {
        return (this.isMiniBrowser(ssid_session) || parseInt(ssid_session.get("wtv-system-version")) < 3500) ? true : false;
    }

    readMiniSrvConfig(user_config = true, notices = true) {
        if (notices) console.log(" *** Reading global configuration...");
        try {
            var minisrv_config = JSON.parse(this.fs.readFileSync(__dirname + this.path.sep + "config.json"));
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
                if (this.fs.lstatSync(__dirname + "/user_config.json")) {
                    if (notices) console.log(" *** Reading user configuration...");
                    try {
                        var minisrv_user_config = JSON.parse(this.fs.readFileSync(__dirname + this.path.sep + "user_config.json"));
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
                if (minisrv_config.config.debug_flags) {
                    if (minisrv_config.config.debug_flags.debug) console.error(" * Notice: Could not find user configuration (user_config.json). Using default configuration.");
                }
            }
        }

        return minisrv_config;
    }

    getMiniSrvConfig() {
        return this.minisrv_config;
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
                var newobj = this.v8.deserialize(this.v8.serialize(obj));
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
                var newobj = this.v8.deserialize(this.v8.serialize(obj));
                if (obj.post_data) newobj.post_data = obj.post_data;
                Object.keys(newobj.query).forEach(function (k) {
                    var key = k.toLowerCase();
                    switch (true) {
                        case /passw(or)?d/.test(key):
                        case /^pass$/.test(key):
                            newobj.query[key] = ('*').repeat(newobj.query[key].length);
                            break;
                    }
                });
                return newobj;
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
                var post_text = obj.post_data.toString(this.CryptoJS.enc.Utf8);
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
            } else {
                // simple, no filter
                obj.post_data = obj.post_data.toString();
            }
        }
        return obj;
    }

    /**
    * Returns an absolute path
    * @param {string} path 
    * @param {string} directory Root directory
    */
    getAbsolutePath(path, directory = __dirname) {
        if (path.substring(0, 1) != this.path.sep && path.substring(1, 1) != ":") {
            // non-absolute path, so use current directory as base
            path = (directory + this.path.sep + path);
        } else {
            // already absolute path
        }
        return this.fixPathSlashes(path);
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

    doErrorPage(code, data = null, pc_mode = false) {
        var headers = null;
        switch (code) {
            case 404:
                if (data === null) data = "The service could not find the requested page.";
                if (pc_mode) headers = "404 Not Found\n";
                else headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
            case 400:
            case 500:
                if (data === null) data = this.minisrv_config.config.service_name + " ran into a technical problem.";
                if (pc_mode) headers = "500 Internal Server Error\n";
                else headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
            case 401:
                if (data === null) data = "Access Denied.";
                if (pc_mode) headers = "401 Access Denied\n";
                else headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
            default:
                headers = code + " " + data + "\n";
                headers += "Content-Type: text/html\n";
                break;
        }
        console.error(" * doErrorPage Called:", code, data);
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
        if (this.path.sep == '/' && path.indexOf("\\") != -1) path = path.replace(/\\/g, this.path.sep);
        else if (this.path.sep == "\\" && path.indexOf("/") != -1) path = path.replace(/\//g, this.path.sep);
        
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
}

class clientShowAlert {
    message = null;
    buttonlabel1 = null;
    buttonlabel2 = null;
    buttonaction1 = null;
    buttonaction2 = null;
    noback = null;
    image = null;

    constructor(image = null, message = null, buttonlabel1 = null, buttonaction1 = null, buttonlabel2 = null, buttonaction2 = null, noback = null) {
        this.message = message;
        this.buttonlabel1 = buttonlabel1;
        this.buttonlabel2 = buttonlabel2;
        this.buttonaction1 = buttonaction1;
        this.buttonaction2 = buttonaction2;
        this.message = message;
        this.noback = noback;
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
        if (this.noback) url += "noback=true&";
        return url.substring(0, url.length - 1);
    }
}

module.exports.WTVShared = WTVShared;
module.exports.clientShowAlert = clientShowAlert;