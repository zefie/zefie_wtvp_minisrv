const CryptoJS = require('crypto-js');
const endianness = require('endianness');
const RC4 = require('rc4-crypto');
const crypto = require('crypto');
const WTVShared = require("./WTVShared.js")['WTVShared'];

/**
 * Javascript implementation of WTVP Security
 *
 * Special Thanks to eMac (Eric MacDonald)
 * For the encryption/decryption information and process 
 * 
 * By: zefie
 */

class WTVSec {
    initial_shared_key = null;
    current_shared_key = null;
    challenge_key = null;
    challenge_signed_key = null;
    challenge_raw = null;
    challenge_response = null;
    ticket_b64 = null;
    incarnation = 0;
    session_key1 = null;
    session_key2 = null;
    hRC4_Key1 = null;
    hRC4_Key2 = null;
    RC4Session = [];
    minisrv_config = [];
    update_ticket = false;
    wtvshared = null;
    ticket_store = {};

    /**
     * 
     * Initialize the WTVSec class.
     * 
     * @param {Number} wtv_incarnation Sets the wtv-incarnation for this instance
     * @param {Boolean} minisrv_config.config.debug_flags.debug Enable debugging
     * 
     */
    constructor(minisrv_config, wtv_incarnation = 1) {
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        this.initial_shared_key = CryptoJS.enc.Base64.parse(this.minisrv_config.config.keys.initial_shared_key);

        if (this.initial_shared_key.sigBytes === 8) {
            this.incarnation = wtv_incarnation;
            this.current_shared_key = this.initial_shared_key;
        } else {
            throw new Error("Invalid initial key length");
        }
    }

    /**
     * Set the wtv-incarnation for this instance
     * @param {Number} wtv_incarnation
     */
    set_incarnation(wtv_incarnation) {
        if (this.incarnation !== wtv_incarnation) {
            this.incarnation = wtv_incarnation;
            this.SecureOn();
        }
    }

    /**
     * Increments the wtv-incaration for this instance by 1
     */
    increment_incarnation() {
        this.set_incarnation(Number(this.incarnation) + 1);
    }

    /**
     * Clones a WordArray to allow modification without referencing its original
     * @param {CryptoJS.lib.WordArray} wordArray
     * @returns {CryptoJS.lib.WordArray}
     */
    DuplicateWordArray(wordArray) {
        return CryptoJS.lib.WordArray.create(this.wtvshared.wordArrayToBuffer(wordArray));
    }

    /**
     * Prepares the wtv-ticket for this instance
     * @returns {Base64} wtv-ticket
     */
    PrepareTicket() {
        // store last challenge response in ticket
        if (this.minisrv_config.config.debug_flags.debug) console.log(" * Preparing a new ticket with ticket_store:", this.ticket_store);
        let ticket_data_raw = this.challenge_raw;
        try {
            const ticket_data = ticket_data_raw.toString(CryptoJS.enc.Hex) + CryptoJS.enc.Utf8.parse(JSON.stringify(this.ticket_store)).toString(CryptoJS.enc.Hex);

            ticket_data_raw = CryptoJS.enc.Hex.parse(ticket_data);
            const ticket_data_enc = CryptoJS.DES.encrypt(ticket_data_raw, this.initial_shared_key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            // create a copy of WordArray since concat modifies the original
            const challenge_signed_key = this.DuplicateWordArray(this.challenge_signed_key);
            this.ticket_b64 = challenge_signed_key.concat(ticket_data_enc.ciphertext).toString(CryptoJS.enc.Base64);
        } catch (e) {
            console.log(`Error encrypting ticket: ${e}`);
            return null;
        }
        return this.ticket_b64;
    }

    /**
     * Decodes a wtv-ticket to set up this instance
     * @param {Base64} ticket_b64
     */
    DecodeTicket(ticket_b64) {
        const ticket_hex = CryptoJS.enc.Base64.parse(ticket_b64).toString(CryptoJS.enc.Hex);
        const challenge_key = CryptoJS.enc.Hex.parse(ticket_hex.slice(0, 16));
        const challenge_enc = CryptoJS.enc.Hex.parse(ticket_hex.slice(16));

        const ticket_dec = CryptoJS.DES.decrypt(
            {
                ciphertext: challenge_enc
            },
            this.initial_shared_key,
            {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        const data_offset = 216; // (108 * 2);
        const challenge_code = ticket_dec.toString().slice(0, data_offset);
        const challenge_code_b64 = CryptoJS.enc.Hex.parse(challenge_code).toString(CryptoJS.enc.Base64);
        if ((ticket_dec.sigBytes * 2) >= challenge_code.length) {
            const ticket_data_dec = CryptoJS.enc.Hex.parse(ticket_dec.toString().slice(data_offset)).toString(CryptoJS.enc.Utf8);
            this.ticket_store = this.wtvshared.tryDecodeJSON(ticket_data_dec);
        } else {
            this.ticket_store = {};
        }

        this.ProcessChallenge(challenge_code_b64, challenge_key);
        if (this.minisrv_config.config.debug_flags.debug) console.log(" * Decoded session from wtv-ticket with ticket_store:", this.ticket_store);
    }

    /**
     * Gets the ticket data for this instance
     * @param {string} key The key of the ticket data to retrieve
     * @returns {any} The ticket data for the specified key, or null if not found
     */
    getTicketData(key = null) {
        if (typeof this.ticket_store === 'session_store') return null;
        else if (key === null) return this.ticket_store;
        else if (key in this.ticket_store) return this.ticket_store[key];
        else return null;
    }

    /**
     * Sets the ticket data for this instance
     * @param {string} key The key of the ticket data to set
     * @param {any} value The value to set for the specified key
     */
    setTicketData(key, value) {
        if (!key) throw new Error("WTVSec.setTicketData(): invalid key provided");
        if (!this.ticket_store) this.ticket_store = {};
        this.ticket_store[key] = value;
        if (this.ticket_b64) this.PrepareTicket();
        this.update_ticket = true;
    }

    /**
     * Deletes the ticket data for this instance
     * @param {string} key The key of the ticket data to delete
     */
    deleteTicketData(key) {
        if (!key) throw new Error("WTVSec.deleteTicketData(): invalid key provided");
        if (!this.ticket_store) {
            this.ticket_store = {};
            return;
        }
        delete this.ticket_store[key];
        if (this.ticket_b64) this.PrepareTicket();
        this.update_ticket = true;
    }

    /**
     * Processes a wtv-challenge to get the expected response
     * @param {Base64} wtv_challenge
     * @param {any} key
     * 
     * @returns {CryptoJS.lib.WordArray} wtv-challenge-response (or blank if failed)
     */
    ProcessChallenge(wtv_challenge, key = this.current_shared_key) {
        const challenge_raw = CryptoJS.enc.Base64.parse(wtv_challenge);

        if (challenge_raw.sigBytes <= 8) {
            throw new Error("Invalid challenge length");
        }

        const challenge_raw_hex = challenge_raw.toString(CryptoJS.enc.Hex);
        const challenge_id_hex = challenge_raw_hex.slice(0, 16); // 8 bytes * 2
        const challenge_enc = CryptoJS.enc.Hex.parse(challenge_raw_hex.slice(16));

        const challenge_decrypted = CryptoJS.DES.decrypt(
            { ciphertext: challenge_enc },
            key,
            { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
        );

        const challenge_dec_hex = challenge_decrypted.toString(CryptoJS.enc.Hex);
        const challenge_md5_challenge = CryptoJS.MD5(CryptoJS.enc.Hex.parse(challenge_dec_hex.slice(0, 160))).toString(CryptoJS.enc.Hex); // 80 bytes * 2

        if (challenge_dec_hex.slice(160, 192) !== challenge_md5_challenge) { // 96 bytes * 2
            console.log("Failed to process challenge (invalid key?)")
            return "";
        }

        this.current_shared_key = CryptoJS.enc.Hex.parse(challenge_dec_hex.slice(144, 160)); // 72 bytes * 2, 80 bytes * 2
        const challenge_echo = CryptoJS.enc.Hex.parse(challenge_dec_hex.slice(0, 80)); // 40 bytes * 2

        // RC4 encryption keys. Stored in the wtv-ticket on the server side.
        this.session_key1 = CryptoJS.enc.Hex.parse(challenge_dec_hex.slice(80, 112)); // 40 bytes * 2, 56 bytes * 2
        this.session_key2 = CryptoJS.enc.Hex.parse(challenge_dec_hex.slice(112, 144)); // 56 bytes * 2, 72 bytes * 2

        const echo_encrypted = CryptoJS.DES.encrypt(
            CryptoJS.MD5(challenge_echo).concat(challenge_echo).concat(CryptoJS.enc.Utf8.parse("\x08".repeat(8))),
            this.current_shared_key,
            { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
        );

        this.challenge_raw = challenge_raw;
        this.challenge_key = this.current_shared_key;

        return CryptoJS.enc.Hex.parse(challenge_id_hex).concat(echo_encrypted.ciphertext);
    }


    /**
     * Generates a wtv-challenge for this instance
     * @returns {Base64} wtv-challenge
     */
    IssueChallenge() {
        /*
         *  bytes 0-8: Random id? Just echoed in the response
         *  bytes 8 - XX: DES encrypted block.Encrypted with the initial key or subsequent keys from the challenge.
         *	bytes 8 - 48: hidden random data we echo back in the response
         *	bytes 48 - 64: session key 1 used in RC4 encryption triggered by SECURE ON
         *	bytes 64 - 80: session key 2 used in RC4 encryption triggered by SECURE ON
         *	bytes 80 - 88: new key for future challenges
         *	bytes 88 - 104: MD5 of 8 - 88
         *	bytes 104 - 112: padding. seemingly not important, but by default is 8 bytes of 0x08
         */
        const challenge_id = CryptoJS.lib.WordArray.random(8);
        const echo_me = CryptoJS.lib.WordArray.random(40);
        this.session_key1 = CryptoJS.lib.WordArray.random(16);
        this.session_key2 = CryptoJS.lib.WordArray.random(16);
        const new_shared_key = CryptoJS.lib.WordArray.random(8);

        const challenge_puzzle = echo_me
            .concat(this.session_key1)
            .concat(this.session_key2)
            .concat(new_shared_key);

        const md5Hash = CryptoJS.MD5(challenge_puzzle);
        const padding = CryptoJS.enc.Hex.parse("\x08".repeat(8));
        const challenge_secret = challenge_puzzle.concat(md5Hash).concat(padding);

        const challenge_secreted = CryptoJS.DES.encrypt(challenge_secret, this.current_shared_key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });

        const challenge = challenge_id.concat(challenge_secreted.ciphertext);
        const challenge_b64 = challenge.toString(CryptoJS.enc.Base64);

        this.challenge_signed_key = this.current_shared_key;
        this.challenge_response = this.ProcessChallenge(challenge_b64);

        return challenge_b64;
    }

    /**
     * Starts an encryption session
     * @param {Number} rc4session Session Type (0 = enc k1, 1 = dec k1, 2 = enc k2, 3 = dec k2, default: all)
     */
    SecureOn(rc4session = null) {
        if (this.minisrv_config.config.debug_flags.debug) console.log(` # Generating RC4 sessions with wtv-incarnation: ${this.incarnation}`);
       
        const buf = new Uint8Array([0xff & this.incarnation, 0xff & (this.incarnation >> 8), 0xff & (this.incarnation >> 16), 0xff & (this.incarnation >> 24)]);
        endianness(buf, 4);
        this.hRC4_Key1 = CryptoJS.MD5(this.DuplicateWordArray(this.session_key1).concat(CryptoJS.lib.WordArray.create(buf).concat(this.DuplicateWordArray(this.session_key1))));
        this.hRC4_Key2 = CryptoJS.MD5(this.DuplicateWordArray(this.session_key2).concat(CryptoJS.lib.WordArray.create(buf).concat(this.DuplicateWordArray(this.session_key2))));
        const key1 = this.wtvshared.wordArrayToBuffer(this.hRC4_Key1);
        const key2 = this.wtvshared.wordArrayToBuffer(this.hRC4_Key2);
        const setRC4Session = (sessionIndex, key) => {
            this.RC4Session[sessionIndex] = new RC4.RC4(key);
        };

        switch (rc4session) {
            case 0:
            case 1:
                setRC4Session(rc4session, key1);
                break;
            case 2:
            case 3:
                setRC4Session(rc4session, key2);
                break;
            default:
                [0, 1].forEach(index => setRC4Session(index, key1));
                [2, 3].forEach(index => setRC4Session(index, key2));
                break;
        }
    }

    /**
     * RC4 Encrypt data
     * @param {Number} keynum Which key to use (0 = k1, 1 = k2)
     * @param {CryptoJS.lib.WordArray|ArrayBuffer|Buffer} data Data to encrypt
     * @returns {ArrayBuffer} Encrypted data
     */
    Encrypt(keynum, data) {
        let session_id;
        if (keynum === 0) {
            session_id = 0;
        } else if (keynum === 1) {
            session_id = 2;
        } else {
            throw new Error("Invalid key option (0 or 1 only)");
        }

        if (!this.RC4Session[session_id]) {
            this.SecureOn(session_id);
        }

        if (data.words) {
            data = this.wtvshared.wordArrayToBuffer(data);
        } else if (data instanceof ArrayBuffer || typeof data === 'string') {
            data = Buffer.from(data);
        }

        return this.RC4Session[session_id].updateFromBuffer(data);
    }


    /**
     * RC4 Decrypt data
     * @param {Number} keynum Which key to use (0 = k1, 1 = k2)
     * @param {CryptoJS.lib.WordArray|ArrayBuffer|Buffer} data Data to decrypt
     * @returns {ArrayBuffer} Decrypted data
     * @notice This function is an alias for Encrypt, as WTVSec uses the same method for both encryption and decryption.
     */
    Decrypt(keynum, data) {
        // Decryption must use the paired RC4 session for the opposite direction
        // Sessions:
        //   0 = encrypt with key1, 1 = decrypt with key1
        //   2 = encrypt with key2, 3 = decrypt with key2
        let session_id;
        if (keynum === 0) {
            session_id = 1;
        } else if (keynum === 1) {
            session_id = 3;
        } else {
            throw new Error("Invalid key option (0 or 1 only)");
        }

        if (!this.RC4Session[session_id]) {
            this.SecureOn(session_id);
        }

        if (data.words) {
            data = this.wtvshared.wordArrayToBuffer(data);
        } else if (data instanceof ArrayBuffer || typeof data === 'string') {
            data = Buffer.from(data);
        }

        return this.RC4Session[session_id].updateFromBuffer(data);
    }
}

module.exports = WTVSec;