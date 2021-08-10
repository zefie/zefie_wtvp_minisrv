/**
 * Simple class for WebTV Mime Types and overrides
 */


class WTVMimeTypes {

    mime = require('mime-types');
    wtvshared = null;


    constructor() {
        var { WTVShared, clientShowAlert } = require('./WTVShared.js');
        this.wtvshared = new WTVShared();
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
     * Gets the WebTV Content-Type
     * @param {string} path Path to a file
     * @returns {string} Content-Type
     */
    getSimpleContentType(path) {
        return this.getContentType(path)[0];
    }

    /**
     * Gets both the WebTV Content-Type and the Modern Content-Type
     * @param {string} path Path to a file
     * @returns {Array} (WebTV Content-Type, Modern Content-Type)
     */
    getContentType(path) {
        var file_ext = this.wtvshared.getFileExt(path).toLowerCase();
        var wtv_mime_type = "";
        var modern_mime_type = "";
        // process WebTV overrides, fall back to generic mime lookup
        switch (file_ext) {
            case "aif":
                wtv_mime_type = "audio/x-aif";
                break;
            case "aifc":
                wtv_mime_type = "audio/x-aifc";
                break;
            case "aiff":
                wtv_mime_type = "audio/x-aiff";
                break;
            case "ani":
                wtv_mime_type = "x-wtv-animation";
                break;
            case "brom":
                wtv_mime_type = "binary/x-wtv-bootrom";
                break;
            case "cdf":
                wtv_mime_type = "application/netcdf";
                break;
            case "dat":
                wtv_mime_type = "binary/cache-data";
                break;
            case "dl":
                wtv_mime_type = "wtv/download-list";
                break;
            case "gsm":
                wtv_mime_type = "audio/x-gsm";
                break;
            case "gz":
                wtv_mime_type = "application/gzip";
                break;
            case "ini":
                wtv_mime_type = "wtv/jack-configuration";
                break;
            case "mips-code":
                wtv_mime_type = "code/x-wtv-code-mips";
                break;
            case "o":
                wtv_mime_type = "binary/x-wtv-approm";
                break;
            case "ram":
                wtv_mime_type = "audio/x-pn-realaudio";
                break;
            case "rom":
                wtv_mime_type = "binary/x-wtv-flashblock";
                break;
            case "rsp":
                wtv_mime_type = "wtv/jack-response";
                break;
            case "swa":
            case "swf":
                wtv_mime_type = "application/x-shockwave-flash";
                break;
            case "srf":
            case "spl":
                wtv_mime_type = "wtv/jack-data";
                break;
            case "ttf":
                wtv_mime_type = "wtv/jack-fonts";
                break;
            case "tvch":
                wtv_mime_type = "wtv/tv-channels";
                break;
            case "tvl":
                wtv_mime_type = "wtv/tv-listings";
                break;
            case "tvsl":
                wtv_mime_type = "wtv/tv-smartlinks";
                break;
            case "wad":
                wtv_mime_type = "binary/doom-data";
                break;
            case "mp2":
            case "hsb":
            case "rmf":
            case "s3m":
            case "mod":
            case "xm":
                wtv_mime_type = "application/Music";
                break;
        }

        modern_mime_type = this.mime.lookup(path);
        if (wtv_mime_type == "") wtv_mime_type = modern_mime_type;
        return new Array(wtv_mime_type, modern_mime_type);
    }

}

module.exports = WTVMimeTypes;
