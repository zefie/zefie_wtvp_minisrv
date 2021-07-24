class WTVClientCapabilities {

    /***********************************\
    |* Special Thanks to:              *|
    |*                      Outatyme   *|
    |* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  *|
    |*   For the binary information    *|
    |*     about capability flags      *|
    \***********************************/

    capabilities = null;
    capabilities_table = null;


    constructor(wtv_capability_flags = null) {
        // [ flag_name, friendly_flag_name ]
        // so far we assume the reversed bit order = the order on wtv-tricks:/info (production service)
        // also speculation that `client-has-relogin-function` is forced true on the service side
        // (this script does not do that, also note that LC2 MiniBrowser does not support client:relog)
        // None of this is 100% for certain yet (except the bitfield stuff), do not trust as verbatim, more testing needed

        var capabilities_table = [
            ["client-can-do-muzac", "Can Do Muzac"],
            ["client-can-do-chat", "Can Chat"],
            ["client-can-do-openISP", "Can do OpenISP"],
            ["client-can-receive-compressed-data", "Can receive compressed data"],
            ["client-can-display-spotads1", "Can show Spotads1"],
            ["client-can-print", "Can Print"],
            ["client-can-do-macromedia-flash1", "Can do Macromedia Flash1"],
            ["client-can-do-javascript", "Can do JavaScript"],
            ["client-can-do-videoflash", "Can do VideoFlash"],
            ["client-can-do-videoads", "Can do VideoAds"],
            ["client-has-disk", "Has Disk"],
            ["client-supports-classical-service", "Supports Classical"],
            ["client-open-isp-settings-valid", "OISP settings valid"],
            ["client-can-tell-valid-open-isp", "Can tell OISP settings valid"],
            ["client-has-tuner", "Has Tuner"],
            ["client-can-data-download", "Can data download"],
            ["client-supports-approx-content-len", "Supports approximate content length"],
            ["client-has-built-in-printer-port", "Has built-in printer port"],
            ["client-has-tv-experience", "Has TV experience"],
            ["client-can-handle-proxy-bypass", "Can handle proxy bypass"],
            ["client-can-handle-download-v2", "Can handle Download protocol 2"],
            ["client-has-relogin-function", "Has Relogin function"],
            ["client-can-display-spotads2", "Can display spotads2"],
            ["client-can-display-30-sec-video-ads", "Can display 30 second video ads"],
            ["client-supports-etude-service", "Supports Etude"],
            ["client-can-do-av-capture", "Can do AV capture"],
            ["client-can-do-disconnected-email", "Can do disconnected email"],
            ["client-can-do-macromedia-flash2", "Can do Macromedia Flash2"],
            ["client-has-memory-size-bit1-set", "Memory size bit1 set"],
            ["client-has-memory-size-bit2-set", "Memory size bit2 set"],
            ["client-has-memory-size-bit3-set", "Memory size bit3 set"],
            ["client-can-do-rmf", "Can do RMF"],
            ["client-can-do-png", "Can do PNG"],
            ["client-does-broadband-data-dowload", "Supports broadband download"],
            ["client-has-softmodem", "Has Softmodem"],
            ["client-can-do-preparsed-epg", "Can do pre-parsed EPG"],
            ["client-supports-funk-e-service", "Supports Funk-e"],
            ["client-wants-dial-script", "Wants dial script"],
            ["client-upgrade-visits-not-needed", "Upgrade visits not needed"],
            ["client-uses-flexible-videoad-paths", "Uses flexible videoad paths"],
            ["client-non-production-build", "Non-production build"],
            ["client-can-download-printer-drivers", "Can download printer drivers"],
            ["client-supports-hiphop-service", "Supports HipHop"],
            ["client-can-use-messenger", "Can use MSN Messenger"],
            ["client-uses-third-party-billing", "Uses 3rd-party billing"],
            ["client-can-do-offlineads", "Can do offline ads"],
            ["client-has-no-dialin-support", "Has no dialin support"],
            ["client-has-ssl-support-for-wtvp", "Has SSL support for WTVP"],
            ["client-can-do-audio-capture", "Can do audio capture"],
            ["client-can-do-metered-pricing", "Can do Metered Pricing"],
            ["client-negotiates-user-agent", "Can Negotiate User-Agent"],
            ["client-can-do-element-logging", "Can do Unsupported Element Logging"],
            ["client-supports-jazz-security", "Supports Jazz security"],
            ["client-supports-MSN-service", "Supports MSN service"],
            ["client-supports-notify-port-header", "Supports notify port header"],
            ["client-supports-messenger-update-light", "Supports MSN Messenger update light"],
            ["client-supports-MSN-chat", "Supports MSN Chat"],
            ["client-supports-MSN-chat-findu", "Supports MSN Chat FindU"],
            ["client-supports-MSN-messenger-CVR", "Supports MSN Messenger CVR"],
            ["client-supports-MSN-messenger-MSNP8", "Supports MSN Messenger MSNP8"],
            ["client-supports-MSN-chat-R9C", "Supports MSN Chat R9C"]
        ];

        this.capabilities_table = capabilities_table;

        var capabilities = new Array();

        // might want to pass without a flag to get the table
        if (wtv_capability_flags != null) {

            // define function to convert hex string to binary string (0s & 1s)
            var hex2bin = function (hex) {
                var binary = "";
                var remainingSize = hex.length;
                for (var p = 0; p < hex.length / 8; p++) {
                    //In case remaining hex length (or initial) is not multiple of 8
                    var blockSize = remainingSize < 8 ? remainingSize : 8;

                    binary += parseInt(hex.substr(p * 8, blockSize), 16).toString(2);

                    remainingSize -= blockSize;
                }
                return binary;
            }

            // Add .reverse() to strings for ease of processing
            if (!String.prototype.reverse) {
                String.prototype.reverse = function () {
                    var splitString = this.split("");
                    var reverseArray = splitString.reverse();
                    var joinArray = reverseArray.join("");
                    return joinArray;
                }
            }

            // convert wtv_capability_flags to binary string, reverse the string, and split into array containing each character;
            var bitfield = hex2bin(wtv_capability_flags).reverse().split("");

            // only add to the capabilities array if the result is true
            var add = function (flag_name, flag) {
                if (flag) capabilities[flag_name] = flag;
            }

            // process bitfield and set capabilities
            Object.keys(bitfield).forEach(function (k) {
                // Convert binary to boolean, 0 to false, 1 to true
                var bitfield_result = (bitfield[k] == "1")

                // set flags based on position of bit
                add(capabilities_table[k][0], bitfield_result);
            });

            this.capabilities = capabilities;
            return capabilities;
        }
    }

    get(key = null) {
        if (typeof (this.capabilities) === 'undefined') return null;
        else if (key === null) return this.capabilities;
        else if (this.capabilities[key]) return this.capabilities[key];
        else return null;
    }

}


module.exports = WTVClientCapabilities;