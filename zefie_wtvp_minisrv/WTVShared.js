/**
 * Shared functions across all classes and apps
 */

class WTVShared {

    path = require('path');
    fs = require('fs');
    minisrv_config = [];

    constructor(minisrv_config) {
        this.minisrv_config = minisrv_config;
        if (!String.prototype.reverse) {
            String.prototype.reverse = function () {
                var splitString = this.split("");
                var reverseArray = splitString.reverse();
                var joinArray = reverseArray.join("");
                return joinArray;
            }
        }
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
        return path;
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
    stripGzipFromPath(path) {
        var path_split = path.split('.');
        if (path_split[path_split.length - 1].toLowerCase() == "gz") {
            path_split.pop();
            path = path_split.join(".");
        }
        return path;
    }

    /**
     * Gets the file extension from a path
     * @param {string} path
     * @returns {String} File Extension (without dot)
     */
    getFileExt(path) {
        return path.reverse().split(".")[0].reverse();
    }

    /**
     * Strips bad things from paths
     * @param {string} base Base path
     * @param {string} target Sub path
     */
    makeSafePath(base, target) {
        target.replace(/[\|\&\;\$\%\@\"\<\>\+\,\\]/g, "");
        if (this.path.sep != "/") target = target.replace(/\//g, this.path.sep);
        var targetPath = this.path.posix.normalize(target)
        return base + this.path.sep + targetPath;
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