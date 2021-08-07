class WTVRegister {

    fs = require('fs');
    path = require('path');

    service_owner = "a minisrv user";
    session_store_dir = null;

    constructor(service_owner, session_store_dir = null) {
        this.service_owner = service_owner;
        if (session_store_dir) this.session_store_dir = session_store_dir
    }

    getServiceOperator(first_letter_lower = false) {
        if (this.service_owner == "a minisrv user") {
            if (first_letter_lower) return "the operator of this service";
            else return "The operator of this service";
        } else {
            return this.service_owner;
        }
    }

    checkUsernameSanity(username) {
        var check1 = /^([A-Za-z0-9\-\_]{5,16})$/.test(username);
        var check2 = /^[A-Za-z]/.test(username);
        return (check1 && check2);
    }

    checkUsernameAvailable(username, ssid_sessions) {
        var username_match = false;
        this.fs.readdirSync(this.session_store_dir).forEach(file => {
            if (!file.match(/.*\.json/ig)) return;
            if (username_match) return;
            try {
                var temp_session_data_file = this.fs.readFileSync(this.session_store_dir + this.path.sep + file, 'Utf8');
                var temp_session_data = JSON.parse(temp_session_data_file);
                if (temp_session_data.subscriber_username == username) username_match = true;
            } catch (e) {
                console.error(" # Error parsing Session Data JSON", file, e);
                username_match = true;
            }
        });
        return !username_match;
    }

}

module.exports = WTVRegister;