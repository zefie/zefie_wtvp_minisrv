const CryptoJS = require('crypto-js');
const endianness = require('endianness');
var crypto = require('crypto');

class WTVSec {
    //initial_shared_key = CryptoJS.lib.WordArray.random(8);
    initial_shared_key_b64 = "CC5rWmRUE0o="; // You can change this but it doesn't mean much for security. Just make sure its static. 8 bytes base64 encoded.
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
    RC4Session = new Array();
    zdebug = false;

    constructor(wtv_incarnation = 1, zdebug = false) {   
        this.zdebug = zdebug;
        this.initial_shared_key = CryptoJS.enc.Base64.parse(this.initial_shared_key_b64);

        if (this.initial_shared_key.sigBytes === 8) {
            this.incarnation = wtv_incarnation;
            this.current_shared_key = this.initial_shared_key;
        } else {
            throw ("Invalid initial key length");
        }
    }

    set_incarnation(wtv_incarnation) {
        if (this.incarnation != wtv_incarnation) {
            this.incarnation = wtv_incarnation;
            this.SecureOn();
        }
    }

    increment_incarnation() {
        this.set_incarnation(parseInt(this.incarnation) + 1);
    }

    DuplicateWordArray(wa) {
        return CryptoJS.lib.WordArray.create(this.wordArrayToUint8Array(wa).buffer);
    }

    PrepareTicket() {
        // store last challenge response in ticket
        var ticket_data = this.challenge_raw;
        try {
            var ticket_data_enc = CryptoJS.DES.encrypt(ticket_data, this.initial_shared_key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.NoPadding
            });
            // create a copy of WordArray since concat modifies the original
            var challenge_signed_key = this.DuplicateWordArray(this.challenge_signed_key);
            this.ticket_b64 = challenge_signed_key.concat(ticket_data_enc.ciphertext).toString(CryptoJS.enc.Base64);
        } catch (e) {
            console.log("Error encrypting ticket: " + e.toString());
            return null;
        }
        return this.ticket_b64;
    }

    DecodeTicket(ticket_b64) {
        var ticket_hex = CryptoJS.enc.Base64.parse(ticket_b64).toString(CryptoJS.enc.Hex);
        var challenge_key = CryptoJS.enc.Hex.parse(ticket_hex.substring(0, 16));
        var challenge_enc = CryptoJS.enc.Hex.parse(ticket_hex.substring(16));
        var ticket_dec = CryptoJS.DES.decrypt(
            {
                ciphertext: challenge_enc
            },
            this.initial_shared_key,
            {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.NoPadding
            }
        );
        this.ProcessChallenge(ticket_dec.toString(CryptoJS.enc.Base64), challenge_key);
        console.log(" * Decoded session from wtv-ticket");
    }

    ProcessChallenge(wtv_challenge, key = this.current_shared_key) {
        var challenge_raw = CryptoJS.enc.Base64.parse(wtv_challenge);

        if (challenge_raw.sigBytes > 8) {
            var challenge_raw_hex = challenge_raw.toString(CryptoJS.enc.Hex);
            var challenge_id_hex = challenge_raw_hex.substring(0, (8 * 2));
            var challenge_enc_hex = challenge_raw_hex.substring((8*2));
            var challenge_enc = CryptoJS.enc.Hex.parse(challenge_enc_hex);

            var challenge_decrypted = CryptoJS.DES.decrypt(
                {
                    ciphertext: challenge_enc
                },
                key,
                {
                    mode: CryptoJS.mode.ECB,
                    padding: CryptoJS.pad.NoPadding
                }
            );


            var challenge_dec_hex = challenge_decrypted.toString(CryptoJS.enc.Hex);
            var challenge_md5_challenge = CryptoJS.MD5(CryptoJS.enc.Hex.parse(challenge_dec_hex.substring(0, (80 * 2))));
            var test = challenge_dec_hex.substring((80 * 2), (96 * 2));
            var test2 = challenge_md5_challenge.toString(CryptoJS.enc.Hex);
            if (test == test2) {
                this.current_shared_key = CryptoJS.enc.Hex.parse(challenge_dec_hex.substring((72*2), (80*2)));
                var challenge_echo = CryptoJS.enc.Hex.parse(challenge_dec_hex.substr(0, (40*2)));

                // RC4 encryption keys.Stored in the wtv-ticket on the server side.
                this.session_key1 = CryptoJS.enc.Hex.parse(challenge_dec_hex.substring((40*2), (56*2)));
                this.session_key2 = CryptoJS.enc.Hex.parse(challenge_dec_hex.substring((56*2), (72*2)));

                var echo_encrypted = CryptoJS.DES.encrypt(CryptoJS.MD5(challenge_echo).concat(challenge_echo).concat(CryptoJS.enc.Utf8.parse("\x08".repeat(8))), this.current_shared_key, {
                    mode: CryptoJS.mode.ECB,
                    padding: CryptoJS.pad.NoPadding
                });

                // Last bytes is just extra padding
                this.challenge_raw = challenge_raw;
                this.challenge_key = this.current_shared_key;
                var challenge_response = CryptoJS.enc.Hex.parse(challenge_raw_hex.substr(0, (8 * 2))).concat(echo_encrypted.ciphertext);                
                return challenge_response;
            } else {
                throw ("Couldn't solve challenge");
                return "";
            }
        } else {
            throw ("Invalid challenge length");
        }
    }

    IssueChallenge() {
        /*
         *  bytes 0-8: Random id? Just echoed in the response
         *  bytes 8 - XX: DES encrypted block.Encrypted with the initial key or subsequent keys from the challenge.
         *	bytes 8 - 48: hidden random data we echo back in the response
         *	bytes 48 - 64: session key 1 used in RC4 encryption triggered by SECURE ON
         *	bytes 64 - 80: session key 2 used in RC4 encryption triggered by SECURE ON
         *	bytes 80 - 88: new key for future challenges
         *	bytes 88 - 104: MD5 of 8 - 88
         *	bytes 104 - 112: padding.not important
         */


        var challenge_id = CryptoJS.lib.WordArray.random(8);

        var echo_me = CryptoJS.lib.WordArray.random(40);
        this.session_key1 = CryptoJS.lib.WordArray.random(16);
        this.session_key2 = CryptoJS.lib.WordArray.random(16);
        var new_shared_key = CryptoJS.lib.WordArray.random(8);

        var session_key1 = this.DuplicateWordArray(this.session_key1);
        var session_key2 = this.DuplicateWordArray(this.session_key2);

        var challenge_puzzle = echo_me.concat(session_key1.concat(session_key2.concat(new_shared_key)));
        var challenge_secret = challenge_puzzle.concat(CryptoJS.MD5(challenge_puzzle).concat(CryptoJS.enc.Hex.parse("\x08".repeat(8))));
        
        // Shhhh!!
        var challenge_secreted = CryptoJS.DES.encrypt(challenge_secret, this.current_shared_key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });
       

        var challenge = challenge_id.concat(challenge_secreted.ciphertext);
        var challenge_b64 = challenge.toString(CryptoJS.enc.Base64);
        // get the expected response for when client sends it
        this.challenge_signed_key = this.current_shared_key;
        this.challenge_response = this.ProcessChallenge(challenge_b64);
        return challenge_b64;
    }

    wordToByteArray(word, length) {
        var ba = [],
            i,
            xFF = 0xFF;
        if (length > 0)
            ba.push(word >>> 24);
        if (length > 1)
            ba.push((word >>> 16) & xFF);
        if (length > 2)
            ba.push((word >>> 8) & xFF);
        if (length > 3)
            ba.push(word & xFF);

        return ba;
    }

    wordArrayToUint8Array(wordArray, length = 0) {
        if (wordArray.hasOwnProperty("sigBytes") && wordArray.hasOwnProperty("words")) {
            length = wordArray.sigBytes;
            wordArray = wordArray.words;
        }

        var result = [],
            bytes,
            i = 0;
        while (length > 0) {
            bytes = this.wordToByteArray(wordArray[i], Math.min(4, length));
            length -= bytes.length;
            result.push(bytes);
            i++;
        }
        return new Uint8Array([].concat.apply([], result));
    }


    SecureOn(rc4session = null) {
        if (this.zdebug) console.log(" # Generating RC4 sessions with wtv-incarnation: " + this.incarnation);
       
        var buf = new Uint8Array([0xff & this.incarnation, 0xff & (this.incarnation >> 8), 0xff & (this.incarnation >> 16), 0xff & (this.incarnation >> 24)]);
        endianness(buf, 4);
        this.hRC4_Key1 = CryptoJS.MD5(this.DuplicateWordArray(this.session_key1).concat(CryptoJS.lib.WordArray.create(buf).concat(this.DuplicateWordArray(this.session_key1))));
        this.hRC4_Key2 = CryptoJS.MD5(this.DuplicateWordArray(this.session_key2).concat(CryptoJS.lib.WordArray.create(buf).concat(this.DuplicateWordArray(this.session_key2))));
        switch (rc4session) {
            case 0:
                this.RC4Session[0] = crypto.createCipheriv('rc4', Buffer.from(this.wordArrayToUint8Array(this.hRC4_Key1)),'');
                break;
            case 1:
                this.RC4Session[1] = crypto.createDecipheriv('rc4', Buffer.from(this.wordArrayToUint8Array(this.hRC4_Key1)),'');
                break;
            case 2:
                this.RC4Session[2] = crypto.createCipheriv('rc4', Buffer.from(this.wordArrayToUint8Array(this.hRC4_Key2)),'');
                break;
            case 3:
                this.RC4Session[3] = crypto.createDecipheriv('rc4', Buffer.from(this.wordArrayToUint8Array(this.hRC4_Key2)),'');
                break;
            default:
                this.RC4Session[0] = crypto.createCipheriv('rc4', Buffer.from(this.wordArrayToUint8Array(this.hRC4_Key1)), '');
                this.RC4Session[1] = crypto.createDecipheriv('rc4', Buffer.from(this.wordArrayToUint8Array(this.hRC4_Key1)), '');
                this.RC4Session[2] = crypto.createCipheriv('rc4', Buffer.from(this.wordArrayToUint8Array(this.hRC4_Key2)), '');
                this.RC4Session[3] = crypto.createDecipheriv('rc4', Buffer.from(this.wordArrayToUint8Array(this.hRC4_Key2)), '');
                break;
        }
    }


    NewRC4Session(num) {
        this.SecureOn(num);
    }

    Encrypt(keynum, data) {
        var session_id;
        switch (keynum) {
            case 0:
                session_id = 0;
                break;
            case 1:
                session_id = 2
                break;
            default:
                throw ("Invalid key option (0 or 1 only)");
                break;
        }
        if (!this.RC4Session[session_id]) {
            this.NewRC4Session(session_id);
        }
        if (data.words) {
            data = new Buffer.from(this.wordArrayToUint8Array(data));
        } else if (data.constructor === ArrayBuffer) {
            data = new Buffer.from(data);
        }
        return this.RC4Session[session_id].update(data);
    }

    Decrypt(keynum, data) {
        var session_id;
        switch (keynum) {
            case 0:
                session_id = 1;
                break;
            case 1:
                session_id = 3;
                break;
            default:
                throw ("Invalid key option (0 or 1 only)");
                break;
        }
        if (!this.RC4Session[session_id]) {
            this.NewRC4Session(session_id);
        }
        if (data.words) {
            data = new Buffer.from(this.wordArrayToUint8Array(data));
        } else if (data.constructor === ArrayBuffer) {
            data = new Buffer.from(data);
        }
        return this.RC4Session[session_id].update(data);
    }
}

module.exports = WTVSec;