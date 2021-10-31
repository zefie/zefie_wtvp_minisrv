/** 
 * Shared functions across all classes and apps
 */

class WTVShared {

    path = require('path');
    fs = require('fs');
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
        return (ssid_session.get("wtv-need-upgrade") || ssid_session.get("wtv-used-8675309"));
    }

    isOldBuild(ssid_session) {
        if (this.isMiniBrowser(ssid_session) || parseInt(ssid_session.get("wtv-system-version")) < 3500) return true;
        return false;
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
                if (data === null) data = "HackTV ran into a technical problem.";
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
    makeSafePath(base, target) {
        target.replace(/[\|\&\;\$\%\@\"\<\>\+\,\\]/g, "");
        var targetPath = this.path.posix.normalize(target)
        return this.fixPathSlashes(base + this.path.sep + targetPath);
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