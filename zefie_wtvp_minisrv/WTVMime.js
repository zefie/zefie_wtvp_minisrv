/**
 * Simple class for WebTV Mime Types and overrides
 */


class WTVMime {

    mime = require('mime-types');
    wtvshared = null;
    minisrv_config = [];


    constructor(minisrv_config) {
        var WTVShared = require('./WTVShared.js')['WTVShared'];
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        if (!String.prototype.reverse) {
            String.prototype.reverse = function () {
                var splitString = this.split("");
                var reverseArray = splitString.reverse();
                var joinArray = reverseArray.join("");
                return joinArray;
            }
        }
    }

    shouldWeCompress(ssid_session, headers_obj) {
        var compress_data = false;
        var compression_type = 0; // no compression
        if (ssid_session) {
            if (ssid_session.capabilities) {
                if (ssid_session.capabilities['client-can-receive-compressed-data']) {

                    if (this.minisrv_config.config.enable_lzpf_compression || this.minisrv_config.config.force_compression_type) {
                        compression_type = 1; // lzpf
                    }

                    if (ssid_session) {
                        // if gzip is enabled...
                        if (this.minisrv_config.config.enable_gzip_compression || this.minisrv_config.config.force_compression_type) {
                            var is_bf0app = ssid_session.get("wtv-client-rom-type") == "bf0app";
                            var isOldBuild = this.wtvshared.isOldBuild(ssid_session);
                            var is_softmodem = false;
                            if (ssid_session.get("wtv-client-rom-type")) is_softmodem = ssid_session.get("wtv-client-rom-type").match(/softmodem/);
                            if (!is_bf0app && ((!is_softmodem && !isOldBuild) || (is_softmodem && !isOldBuild))) {
                                // softmodem boxes do not appear to support gzip in the minibrowser
                                // LC2 appears to support gzip even in the MiniBrowser
                                // LC2 and newer approms appear to support gzip
                                // bf0app does not appear to support gzip
                                compression_type = 2; // gzip
                            }
                        }
                    }



                    // mostly for debugging
                    if (this.minisrv_config.config.force_compression_type == "lzpf") compression_type = 1;
                    if (this.minisrv_config.config.force_compression_type == "gzip") compression_type = 2;

                    // do not compress if already encoded
                    if (headers_obj["Content-Encoding"]) return 0;

                    // should we bother to compress?
                    var content_type = "";
                    if (typeof (headers_obj) == 'string') content_type = headers_obj;
                    else content_type = (typeof (headers_obj["wtv-modern-content-type"]) != 'undefined') ? headers_obj["wtv-modern-content-type"] : headers_obj["Content-Type"];

                    if (content_type) {
                        // both lzpf and gzip
                        if (content_type.match(/^text\//) && content_type != "text/tellyscript") compress_data = true;
                        else if (content_type.match(/^application\/(x-?)javascript$/)) compress_data = true;
                        else if (content_type == "application/json") compress_data = true;
                        if (compression_type == 2) {
                            // gzip only
                            if (content_type.match(/^audio\/(x-)?(s3m|mod|xm|midi|wav|wave|aif(f)?))$/)) compress_data = true; // s3m, mod, xm, midi & wav
                            if (content_type.match(/^application\/karaoke$/)) compress_data = true; // midi karaoke
                            if (content_type.match(/^binary\/(x-wtv-approm|doom-data)/)) compress_data = true; // approms and DOOM WADs
                            if (content_type.match(/^wtv\/download-list$/)) compress_data = true; // WebTV Download List                            
                        }
                    }
                }
            }
        }

        // return compression_type if compress_data = true
        return (compress_data) ? compression_type : 0;
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
            case "kar":
                wtv_mime_type = "application/karaoke";
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
        if (modern_mime_type === false) modern_mime_type = "application/octet-stream";
        if (wtv_mime_type == "") wtv_mime_type = modern_mime_type;
        return new Array(wtv_mime_type, modern_mime_type);
    }

}

module.exports = WTVMime;
