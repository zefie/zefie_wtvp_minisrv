class WTVSSL {
    wtvshared = null;
    constructor() {
        const WTVShared = require("./WTVShared.js")['WTVShared'];
        this.wtvshared = new WTVShared();
    }

    getCACert() {
        // return the CA cert
        const caCertFile = this.wtvshared.getServiceDep("https/ca.der", true)
        if (!this.wtvshared.fs.existsSync(caCertFile)) {
            throw new Error("CA certificate file not found");
        }
        return this.wtvshared.fs.readFileSync(caCertFile);
    }

    derToPem(derBuffer) {
        const base64 = derBuffer.toString("base64");
        const pem = [
            "-----BEGIN CERTIFICATE-----",
            base64.match(/.{1,64}/g).join("\n"),
            "-----END CERTIFICATE-----"
        ].join("\n");

        return pem;
    }

    wrapBase664ToPem(text) {;
        const pem = [
            "-----BEGIN CERTIFICATE-----",
            text,
            "-----END CERTIFICATE-----"
        ].join("\n");
        return pem;
    }

   normalizeCert(cert) {
        if (Buffer.isBuffer(cert)) {
            // assume DER
            return this.derToPem(cert);
        }
        const text = cert.toString().trim();
        if (text.includes("BEGIN CERTIFICATE")) {
            return text; // already PEM
        } 
        // assume Base64 DER
        return this.wrapBase664ToPem(text);
    }
    
    getBitdefenderCACert() {
        // return the Bitdefender CA cert
        if (process.platform !== 'win32') {
            return false;
        }
        const caCertFile = "C:\\Program Files\\Bitdefender\\Bitdefender Security\\mitm_cache\\fake-ca.crt"
        if (!this.wtvshared.fs.existsSync(caCertFile)) {
            return false;
        }
        return this.normalizeCert(this.wtvshared.fs.readFileSync(caCertFile));
    }
}

module.exports = WTVSSL;