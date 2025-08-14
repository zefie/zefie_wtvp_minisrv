/**
 * Class for WebTV Mime Types and overrides
 */

class WTVMime {

    mime = require('mime-types');
    wtvshared = null;
    minisrv_config = [];
    constructor(minisrv_config) {
        const { WTVShared }  = require("./WTVShared.js");
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        if (!String.prototype.reverse) {
            String.prototype.reverse = function () {
                const splitString = this.split("");
                const reverseArray = splitString.reverse();
                const joinArray = reverseArray.join("");
                return joinArray;
            }
        }
    }

    shouldWeCompress(ssid_session, headers_obj) {
        let compress_data = false;
        let compression_type = 0; // no compression
        if (ssid_session) {
            if (ssid_session.capabilities) {
                if (ssid_session.capabilities.get('client-can-receive-compressed-data')) {

                    if (this.minisrv_config.config.enable_lzpf_compression || this.minisrv_config.config.force_compression_type) {
                        compression_type = 1; // lzpf
                    }

                    if (ssid_session) {
                        // if gzip is enabled...
                        if (this.minisrv_config.config.enable_gzip_compression || this.minisrv_config.config.force_compression_type) {
                            const is_bf0app = ssid_session.get("wtv-client-rom-type") === "bf0app";
                            const isOldBuild = this.wtvshared.isOldBuild(ssid_session);
                            let is_softmodem = false;
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
                    if (this.minisrv_config.config.force_compression_type === "lzpf") compression_type = 1;
                    if (this.minisrv_config.config.force_compression_type === "gzip") compression_type = 2;

                    // do not compress if already encoded
                    if (headers_obj["Content-Encoding"]) return 0;

                    // should we bother to compress?
                    let content_type = "";
                    if (typeof (headers_obj) === 'string') content_type = headers_obj;
                    else content_type = (typeof (headers_obj["wtv-modern-content-type"]) !== 'undefined') ? headers_obj["wtv-modern-content-type"] : headers_obj["Content-type"];

                    if (content_type) {
                        // both lzpf and gzip
                        if (content_type.match(/^text\//) && content_type !== "text/tellyscript") compress_data = true;
                        else if (content_type.match(/^application\/(x-?)javascript$/)) compress_data = true;
                        else if (content_type === "application/json") compress_data = true;
                        if (compression_type === 2) {
                            // gzip only
                            if (content_type.match(/^audio\/(x-)?(s3m|mod|xm|midi|wav|wave|aif(f)?)$/)) compress_data = true; // s3m, mod, xm, midi & wav
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
        const file_ext = this.wtvshared.getFileExt(path).toLowerCase();
        let wtv_mime_type, modern_mime_type;
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
            case "kar":
                wtv_mime_type = "audio/midi";
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
        if (typeof wtv_mime_type === 'undefined') wtv_mime_type = modern_mime_type;
        return new Array(wtv_mime_type, modern_mime_type);
    }

    /**
     * Attempts to detect the MIME type from a data buffer using magic numbers.
     * Falls back to 'application/octet-stream' if unknown.
     * @param {Buffer} buffer
     * @returns {string} Detected MIME type
     */
    detectMimeTypeFromBuffer(buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
            return 'application/octet-stream';
        }

        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'image/jpeg';
        }
        // PNG
        if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
            return 'image/png';
        }
        // GIF
        if (buffer.slice(0, 6).toString() === 'GIF87a' || buffer.slice(0, 6).toString() === 'GIF89a') {
            return 'image/gif';
        }
        // PDF
        if (buffer.slice(0, 4).toString() === '%PDF') {
            return 'application/pdf';
        }
        // ZIP
        if (buffer[0] === 0x50 && buffer[1] === 0x4B && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) && (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)) {
            return 'application/zip';
        }
        // GZIP
        if (buffer[0] === 0x1F && buffer[1] === 0x8B) {
            return 'application/gzip';
        }
        // MP3
        if ((buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0)) {
            return 'audio/mpeg';
        }
        // WAV
        if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WAVE') {
            return 'audio/wav';
        }
        // WebP
        if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
            return 'image/webp';
        }
        // BMP
        if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
            return 'image/bmp';
        }
        // OGG
        if (buffer.slice(0, 4).toString() === 'OggS') {
            return 'application/ogg';
        }
        // MIDI
        if (buffer.slice(0, 4).toString() === 'MThd') {
            return 'audio/midi';
        }
        // TAR
        if (buffer.length > 257 && buffer.slice(257, 262).toString() === 'ustar') {
            return 'application/x-tar';
        }
        // TEXT (plain)
        if (
            buffer.length >= 4 &&
            (
            buffer.slice(0, 5).toString().toLowerCase() === '<?xml' ||
            buffer.slice(0, 6).toString().toLowerCase() === '<html>' ||
            buffer.slice(0, 6).toString().toLowerCase() === '<!doc' ||
            buffer.slice(0, 6).toString().toLowerCase() === '<head>' ||
            buffer.slice(0, 6).toString().toLowerCase() === '<body>' ||
            buffer.slice(0, 6).toString().toLowerCase() === '<meta>' ||
            buffer.slice(0, 6).toString().toLowerCase() === '<titl>' ||
            buffer.slice(0, 6).toString().toLowerCase() === '<scri>' ||
            buffer.slice(0, 6).toString().toLowerCase() === '<styl>'
            )
        ) {
            return 'text/html';
        }
        // Try to detect plain text (no null bytes, mostly printable)
        if (
            buffer.length > 0 &&
            buffer.slice(0, 512).every(b => (b === 0x09 || b === 0x0A || b === 0x0D || (b >= 0x20 && b <= 0x7E)))
        ) {
            return 'text/plain';
        }

        // Default fallback
        return 'application/octet-stream';
    }

    // modified from https://github.com/sergi/mime-multipart/blob/master/index.js

    generateMultipartMIME(tuples, options) {
        // modified for creating usenet compliant headers/content from an attachment
        const CRLF = '\n';
        if (tuples.length === 0) {
            // according to rfc1341 there should be at least one encapsulation
            throw new Error('Missing argument. At least one part to generate is required');
        }

        options = options || {};
        const preamble = options.preamble || "This is a multi-part message in MIME format.";
        const epilogue = options.epilogue;
        const boundary = options.boundary || "------------" + this.wtvshared.generateString(24);

        if (boundary.length < 1 || boundary.length > 70) {
            throw new Error('Boundary should be between 1 and 70 characters long');
        }

        const boundary_header = 'multipart/mixed; boundary="' + boundary + '"';

        const delimiter = CRLF + '--' + boundary;
        const closeDelimiter = delimiter + '--';

        const encapsulations = tuples.map(function (tuple, i) {
            const mimetype = tuple.mime || 'text/plain';
            const encoding = tuple.encoding || 'utf-8';
            const use_base64 = tuple.use_base64 || !this.wtvshared.isASCII(tuple.content);
            const is_base64 = tuple.is_base64 || this.wtvshared.isBase64(tuple.content);
            const filename = (tuple.filename) ? tuple.filename : (use_base64) ? ('file' + i) : null;

            const headers = [
                `Content-Type: ${mimetype}; ${(use_base64) ? `name="${filename}"` : `charset=${encoding.toUpperCase()}; format=flowed`}`,
            ];

            if (filename) headers.push(`Content-Disposition: attachment; filename="${filename}"`);
            headers.push(`Content-Transfer-Encoding: ${(use_base64) ? 'base64' : '7bit'}`);

            let bodyPart = headers.join(CRLF) + CRLF + CRLF;
            if (use_base64 && !is_base64) bodyPart += this.wtvshared.lineWrap(Buffer.from(tuple.content).toString('base64'),72) + CRLF;
            else bodyPart += this.wtvshared.lineWrap(tuple.content,72);

            return delimiter + CRLF + bodyPart;
        });

        const multipartBody = [
            preamble ? preamble : undefined,
            encapsulations.join(''),
            closeDelimiter,
            epilogue ? CRLF + epilogue : undefined,
        ].filter(function (element) { return !!element; });

        return {
            "mime_version": "1.0",
            "content_type": boundary_header,
            "content": multipartBody.join('')
        };
    }

}

module.exports = WTVMime;
