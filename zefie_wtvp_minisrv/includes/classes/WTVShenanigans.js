class WTVShenanigans {
    minisrv_config = null;
    shenanigans = {
        // PLEASE NOTE: anything that is broken with any shenanigan level besides "false" is NOT a bug!!!! 

        "NO_SHENANIGANS": false, // no shenanigans, minisrv as intended, most secure option
        "ENABLE_TRICKS_URLACCESS": 1, // allows users to use wtv-tricks:/access?url=
        "DISABLE_HTML_ENTITIZER": 4, // disables HTML Entitizer, allowing things such as HTML in email/usenet subjects
        "DISABLE_HTML_SANITIZER": 5 // disables HTML Sanitizer, allowing all sorts of chaos in email/usenet posts and signatures
    }

    /**
     * Creates an instance of WTVShenanigans.
     * @param {Object} minisrv_config - The minisrv configuration object.
     */
    constructor(minisrv_config) {
        this.minisrv_config = minisrv_config;
    }

    /**
     * Returns the current shenanigans level set in the minisrv configuration.
     * @returns {boolean|number} The shenanigans level, or false if shenanigans are disabled.
     */
    getShenanigansLevel() {
        return this.minisrv_config.config.shenanigans;
    }

    /**
     * Checks if a specific shenanigan is enabled based on the current shenanigans level.
     * @param {number} value - The shenanigan level to check against.
     * @returns {boolean} True if the shenanigan is enabled, false otherwise.
     */
    checkShenanigan(value) {
        const level = this.getShenanigansLevel();

        // shenanigans are disabled, don't iterate
        if (level === false) return false;

        let retval = false;
        const shenanigans = this.shenanigans;

        // shenanigans are enabled, so check if the requested shenanigan is within the level enabled
        Object.keys(shenanigans).forEach((k) => {
            if (shenanigans[k] === value) {
                if (level >= shenanigans[k]) {
                    retval = true;
                    return false;
                }
            }
        });

        return retval;
    }
}
module.exports = WTVShenanigans;