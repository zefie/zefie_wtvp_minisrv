class WTVSSL {
    wtvshared = null;
    constructor() {
        const WTVShared = require("./WTVShared.js")['WTVShared'];
        this.wtvshared = new WTVShared();
    }

    getCACert() {
        // return the CA cert
        const caCertFile = this.wtvshared.getServiceDep("https/ca.der")
        if (!this.wtvshared.fs.existsSync(caCertFile)) {
            throw new Error("CA certificate file not found");
        }
        return this.wtvshared.fs.readFileSync(caCertFile);
    }
}

module.exports = WTVSSL;