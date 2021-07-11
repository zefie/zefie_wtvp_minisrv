const CryptoJS = require('crypto-js');
const rc4 = require('arc4');

class WTVNetworkSecurity {
    initial_shared_key = null;
    current_shared_key = null;
    challenge_key = null;
    challenge_response = null;
    challenge_b64 = null;
    ticket_b64 = null;
    incarnation = 1;
    session_key1 = null;
    session_key2 = null;
    hRC4_Key1 = null;
    hRC4_Key2 = null;
    zdebug = false;

    constructor(wtv_initial_key = CryptoJS.lib.WordArray.random(8), wtv_incarnation = 1) {
        var initial_key = wtv_initial_key;

        this.zdebug = true;

        if (initial_key.sigBytes === 8) {
            this.incarnation = wtv_incarnation;
            this.initial_shared_key = initial_key;
            this.current_shared_key = initial_key;            
        } else {
            throw ("Invalid initial key length");
        }
    }

    set_incarnation(wtv_incarnation) {
        this.incarnation = wtv_incarnation;
    }

    increment_incarnation() {
        this.incarnation = this.incarnation + 1;
    }

    PrepareTicket() {
        // store last challenge response in ticket
        var ticket_data = this.challenge_response;
        try {
            var ticket_data_enc = CryptoJS.DES.encrypt(ticket_data, this.current_shared_key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.NoPadding
            });
            this.ticket_b64 = this.current_shared_key.concat(ticket_data_enc.ciphertext.toString(CryptoJS.enc.Base64));
        } catch (e) {
            console.log("Error encrypting ticket: " + e.toString());
            return null;
        }
    }

    DecodeTicket(ticket_b64) {
        var ticket_hex = CryptoJS.enc.Base64.parse(ticket_b64);
        var ticket_key = CryptoJS.enc.Hex.parse(ticket_hex.substring(0, this.current_shared_key.sigBytes));
        var ticket_dec = CryptoJS.DES.decrypt(
            {
                ciphertext: challenge_enc
            },
            ticket_key,
            {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.ZeroPadding
            }
        );
        this.ProcessChallenge(ticket_dec);
    }

    ProcessChallenge(wtv_challenge) {
        var challenge_raw = CryptoJS.enc.Base64.parse(wtv_challenge);

        if (challenge_raw.sigBytes > 8) {
            var challenge_raw_hex = challenge_raw.toString(CryptoJS.enc.Hex);
            var challenge_enc_hex = challenge_raw_hex.substring((8*2));
            var challenge_enc = CryptoJS.enc.Hex.parse(challenge_enc_hex);



            var challenge_decrypted = CryptoJS.DES.decrypt(
                {
                    ciphertext: challenge_enc
                },
                this.current_shared_key,
                {
                    mode: CryptoJS.mode.ECB,
                    padding: CryptoJS.pad.ZeroPadding
                }
            );


            var challenge_dec_hex = challenge_decrypted.toString(CryptoJS.enc.Hex);
            var challenge_md5_challenge = CryptoJS.MD5(CryptoJS.enc.Hex.parse(challenge_dec_hex.substring(0, (80 * 2))));

            if (challenge_dec_hex.substring((80 * 2), (96 * 2)) == challenge_md5_challenge.toString(CryptoJS.enc.Hex)) {
                this.current_shared_key = CryptoJS.enc.Hex.parse(challenge_dec_hex.substring((72*2), (80*2)));
                var challenge_echo = CryptoJS.enc.Hex.parse(challenge_dec_hex.substr(0, (40*2)));

                // RC4 encryption keys.Stored in the wtv-ticket on the server side.
                this.session_key1 = CryptoJS.enc.Hex.parse(challenge_dec_hex.substring((40*2), (56*2)));
                this.session_key2 = CryptoJS.enc.Hex.parse(challenge_dec_hex.substring((56*2), (72*2)));

                var echo_encrypted = CryptoJS.DES.encrypt(CryptoJS.MD5(challenge_echo).concat(challenge_echo), this.current_shared_key, {
                    mode: CryptoJS.mode.ECB,
                    padding: CryptoJS.pad.NoPadding
                });

                // Last bytes is just extra padding
                var challenge_response = CryptoJS.enc.Hex.parse(challenge_raw_hex.substr(0, (8 * 2))).concat(echo_encrypted.ciphertext.concat(CryptoJS.enc.Utf8.parse("\x00".repeat(8))));


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


        var random_id_question_mark = CryptoJS.lib.WordArray.random(8);

        var echo_me = CryptoJS.lib.WordArray.random(40);
        this.session_key1 = CryptoJS.lib.WordArray.random(16);
        this.session_key2 = CryptoJS.lib.WordArray.random(16);
        var new_shared_key = CryptoJS.lib.WordArray.random(8);
        
        var challenge_puzzle = echo_me.concat(this.session_key1.concat(this.session_key2.concat(new_shared_key)));
        var challenge_secret = challenge_puzzle.concat(CryptoJS.MD5(challenge_puzzle).concat(CryptoJS.enc.Hex.parse("\x00".repeat(8))));

        // Shhhh!!
        var challenge_secreted = CryptoJS.DES.encrypt(challenge_secret, this.current_shared_key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });
       

        var challenge = random_id_question_mark.concat(challenge_secreted.ciphertext);
        var challenge_b64 = challenge.toString(CryptoJS.enc.Base64);

        // get the expected response for when client sends it
        this.challenge_response = this.ProcessChallenge(challenge_b64);
        this.challenge_key = this.current_shared_key;
        this.challenge_b64 = challenge_b64;

        this.current_shared_key = new_shared_key;
        return challenge_b64;
    }

    SecureOn() {
        var buf = Buffer.allocUnsafe(4);
        buf.writeUIntLE(this.incarnation, 0, 4);
        var bigbuf = buf.readUIntBE(0, 4);
        var md5_digest_key1 = CryptoJS.MD5(this.session_key1.concat(CryptoJS.lib.WordArray.create(bigbuf).concat(this.session_key1)));

        buf = Buffer.allocUnsafe(4);
        buf.writeUIntLE(this.incarnation, 0, 4);
        bigbuf = buf.readUIntBE(0, 4);
        var md5_digest_key2 = CryptoJS.MD5(this.session_key2.concat(CryptoJS.lib.WordArray.create(bigbuf).concat(this.session_key2)));


        this.hRC4_Key1 = md5_digest_key1;
        this.hRC4_Key2 = md5_digest_key2;
    }

    EncryptKey1(data) {
        return this.Encrypt(this.hRC4_Key1, data);
    }

    EncryptKey2(data) {
        return this.Encrypt(this.hRC4_Key2, data);
    }

    Encrypt(context, data) {
        if (key != null) {
            return CryptoJS.RC4.encrypt(data, key);
        } else {
            throw ("Invalid RC4 encryption key");
        }
    }

    DecryptKey1(data) {
        return this.Decrypt(this.hRC4_Key1, data);
    }

    DecryptKey2(data) {
        return this.Decrypt(this.hRC4_Key2, data);
    }

    Decrypt(key, data) {
        if (key != null) {
            return CryptoJS.RC4.decrypt(data, key);
        } else {
            throw ("Invalid RC4 encryption key");
        }
    }

    Test() {
        console.log("TEST RUN");
        console.log("Test python challenge");
        this.current_shared_key = CryptoJS.enc.Base64.parse("CC5rWmRUE0o=");
        var current_challenge = "0kjyqIYAu0ziFBbSERN6DGaZ6S0fT+DBUCtpHCJ4lpuM7CbXdAm+x83BIDoJYztd1Z+5KFZ7ghmb3LJCT/6mhWUYkqqKOyfPRW8ZIdbICK/CV+Kxm8EUjRXZSk/97tsmFpH3hcCJ7C2TBw+TX38uQQ==";
        var expected_result = "0kjyqIYAu0zI5QrLhSuEUFgKkoVSxI3zBlUMfhnIYoMy0ExfIX4s/mHvILseDFx+17trk7YO+xG9D2qSY6v9XVUS1OP1m8ee";
        console.log("Expected: " + expected_result);
        console.log("Got: " + this.ProcessChallenge(current_challenge));
    }
}

module.exports = WTVNetworkSecurity;