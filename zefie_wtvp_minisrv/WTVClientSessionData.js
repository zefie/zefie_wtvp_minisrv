const { lib } = require('crypto-js');

class WTVClientSessionData {

    fs = require('fs');
    path = require('path');
    ssid = null;
    data_store = null;
    session_store = null;
    login_security = null;
    capabilities = null;
    session_storage = "";
    hide_ssid_in_logs = true;

    filterSSID(obj) {
        if (this.hide_ssid_in_logs === true) {
            if (typeof (obj) == "string") {
                if (obj.substr(0, 8) == "MSTVSIMU") {
                    return obj.substr(0, 10) + ('*').repeat(10) + obj.substr(20);
                } else if (obj.substr(0, 5) == "1SEGA") {
                    return obj.substr(0, 6) + ('*').repeat(6) + obj.substr(13);
                } else {
                    return obj.substr(0, 6) + ('*').repeat(9);
                }
            } else {
                if (obj["wtv-client-serial-number"]) {
                    var ssid = obj["wtv-client-serial-number"];
                    if (ssid.substr(0, 8) == "MSTVSIMU") {
                        obj["wtv-client-serial-number"] = ssid.substr(0, 10) + ('*').repeat(10) + ssid.substr(20);
                    } else if (ssid.substr(0, 5) == "1SEGA") {
                        obj["wtv-client-serial-number"] = ssid.substr(0, 6) + ('*').repeat(6) + ssid.substr(13);
                    } else {
                        obj["wtv-client-serial-number"] = ssid.substr(0, 6) + ('*').repeat(9);
                    }
                }
                return obj;
            }
        } else {
            return obj;
        }
    }

    constructor(ssid, hide_ssid_in_logs, session_storage_directory) {
        this.ssid = ssid;
        if (hide_ssid_in_logs) this.hide_ssid_in_logs = hide_ssid_in_logs;
        if (!session_storage_directory) session_storage_directory = __dirname + "/SessionStore";
        this.session_storage = session_storage_directory;
        this.data_store = new Array();
        this.session_store = {};
    }

    getUTCTime(offset = 0) {
        return new Date((new Date).getTime() + offset).toUTCString();
    }

    countCookies() {
        return Object.keys(this.session_store.cookies).length || 0;
    }

    resetCookies() {
        this.session_store.cookies = {};
        // webtv likes to have at least one cookie in the list, set a dummy cookie for zefie's site expiring in 1 year.
        this.addCookie("wtv.zefie.com", "/", this.getUTCTime(365 * 86400000), "cookie_type=chocolatechip");
    }

    addCookie(domain, path = null, expires = null, data = null) {
        if (!this.checkCookies()) this.resetCookies();
        if (!domain) return false;
        else if (typeof (domain) == 'object') {
            // accept array as first argument
            if (domain.domain && domain.path && domain.expires && domain.data) var cookie_data = domain;
            else return false;
        } else {
            if (path && expires && data) {
                var cookie_data = new Array();
                cookie_data['cookie'] = unescape(data);
                cookie_data['expires'] = unescape(expires);
                cookie_data['path'] = unescape(path);
                cookie_data['domain'] = unescape(domain);
            } else {
                return false;
            }
        }

        var self = this;
        var cookie_index = -1;
        // see if we have a cookie for this domain/path
        Object.keys(this.session_store.cookies).forEach(function (k) {
            if (cookie_index >= 0) return;
            if (domain == self.session_store.cookies[k].domain && path == self.session_store.cookies[k].path) cookie_index = k;
        });
        // otherwise add a new one
        if (cookie_index == -1) cookie_index = this.countCookies();

        this.session_store.cookies[cookie_index] = Object.assign({}, cookie_data);

        // do not write file if user is not registered
        if (this.getSessionData('registered')) this.storeSessionData();

        return true;
    }

    getCookie(domain, path) {
        if (!this.checkCookies()) this.resetCookies();
        var self = this;
        var result = false;
        Object.keys(this.session_store['cookies']).forEach(function (k) {
            if (result != false) return;
            if (self.session_store['cookies'][k].domain == domain &&
                self.session_store['cookies'][k].path == path) {

                var current_epoch_utc = Date.parse((new Date()).toUTCString());
                var cookie_expires_epoch_utc = Date.parse(new Date(Date.parse(self.session_store['cookies'][k].expires)).toUTCString());
                if (cookie_expires_epoch_utc <= current_epoch_utc) self.deleteCookie(self.session_store['cookies'][k]);
                else result = self.session_store['cookies'][k];
            }
        });
        return result;
    }

    getCookieString(domain, path) {
        var cookie_data = this.getCookie(domain, path);
        /*
         var outstring = "";
        Object.keys(cookie_data).forEach(function (k) {
            outstring += k + "=" + escape(cookie_data[k]) + "&";
        });
        return outstring.substring(0, outstring.length - 1);
        */
        return cookie_data.cookie;
    }

    deleteCookie(domain, path = null) {
        var result = false;
        if (!this.checkCookies()) {
            this.resetCookies();
            return true;
        }
        if (!domain) return false;
        else if (typeof (domain) == 'object') {
            // accept array as first argument
            if (domain.domain && domain.path) {
                path = domain.path;
                domain = domain.domain;
            }
        } else if (!path) {
            return false;
        }

        var self = this;
        Object.keys(this.session_store['cookies']).forEach(function (k) {
            if (self.session_store['cookies'][k].domain == domain && self.session_store['cookies'][k].path == path) {
                delete self.session_store['cookies'][k];
                self.storeSessionData();
                result = true;
            }
        });

        return result;
    }

    checkCookies() {
        if (!this.session_store.cookies) return false;
        else if (this.session_store.cookies == []) return false;
        return true;
    }

    listCookies() {
        if (!this.checkCookies()) this.resetCookies();
        var outstring = "";
        var self = this;
        Object.keys(this.session_store.cookies).forEach(function (k) {
            outstring += self.session_store.cookies[k].domain + "\0" + self.session_store.cookies[k].path + "\0";
        });
        return outstring;
    }

    loadSessionData(raw_data = false) {
        try {
            if (this.fs.lstatSync(this.session_storage + this.path.sep + this.ssid + ".json")) {
                var json_data = this.fs.readFileSync(this.session_storage + this.path.sep + this.ssid + ".json", 'Utf8')
                if (raw_data) return json_data;

                var session_data = JSON.parse(json_data);
                this.session_store = session_data;
                return true;
            }
        } catch (e) {
            // Don't log error 'file not found', it just means the client isn't registered yet
            if (e.code != "ENOENT") console.error(" # Error loading session data for", this.filterSSID(this.ssid), e);
            return false;
        }
    }

    saveSessionData() {
        // load data from disk and merge new data
        var temp_store = this.session_store;
        if (this.loadSessionData()) this.session_store = Object.assign(this.session_store, temp_store);
        else this.session_store = temp_store;
        temp_store = null;

        try {
            // only save if file has changed
            var json_save_data = JSON.stringify(this.session_store);
            var json_load_data = this.loadSessionData(true);
            if (json_save_data != json_load_data) this.fs.writeFileSync(this.session_storage + this.path.sep + this.ssid + ".json", JSON.stringify(this.session_store), "Utf8");
            return true;
        } catch (e) {            
            console.error(" # Error saving session data for", this.filterSSID(this.ssid), e);
            return false;
        }
    }

    retrieveSessionData() {
        // alias
        this.loadSessionData();
    }

    storeSessionData() {
        // alias
        return this.saveSessionData();
    }

    SaveIfRegistered() {
        if (this.isRegistered()) this.saveSessionData();
    }

    isRegistered() {
        var self = this;
        var ssid_match = false;
        this.fs.readdirSync(this.session_storage).forEach(file => {
            if (!file.match(/.*\.json/ig)) return;
            if (ssid_match) return;
            if (file.split('.')[0] == self.ssid) ssid_match = true;
        });
        return ssid_match;
    }

    unregisterBox() {
        try {
            if (this.fs.lstatSync(this.session_storage + this.path.sep + this.ssid + ".json")) {
                this.fs.unlinkSync(this.session_storage + this.path.sep + this.ssid + ".json");
                this.session_store = {};
                return true;
            }
        } catch (e) {
            // Don't log error 'file not found', it just means the client isn't registered yet
            console.error(" # Error deleting session data for", this.filterSSID(this.ssid), e);
            return false;
        }
    }

    hasCap(cap) {
        if (this.capabilities) {
            return this.capabilities[cap] || false;
        }
        return false;
    }

    getMaxUsernameLength() {
        if (parseInt(this.data_store['wtv-system-version'] < 4000)) {
            // older builds may crash with nicknames longer than 16 chars.
            // actual build where support started is yet unknown
            return 16;
        } else {
            // newer builds supported up to 32 chars, I think
            return 32;
        }
    }

    setIRCNick(nick) {
        // strip out unsupported chars
        nick = nick.replace(/[^a-zA-Z0-9\-\_\`\^]/g, "");

        // limit nick length based on build support
        nick = nick.substring(0, this.getMaxUsernameLength());

        // returns headers to send to client, while storing the new data in our session data.
        this.data_store['wtv-user-name'] = nick;
        this.data_store['wtv-irc-nick'] = nick;
        this.session_store.subscriber_irc_nick = nick;
        return "wtv-irc-nick: " + nick + "\nwtv-user-nick: " + nick;
    }

    isMiniBrowser() {
        if (this.data_store['wtv-need-upgrade'] || this.data_store['wtv-used-8675309']) return true;
        return false;
    }

    currentConnections() {
        if (this.data_store) {
            if (this.data_store.sockets) {
                return this.data_store.sockets.size;
            }
        }
        return 0;
    }

    getSessionData(key = null) {
        if (typeof (this.data_store) === 'session_store') return null;
        else if (key === null) return this.data_store;
        else if (this.session_store[key]) return this.session_store[key];
        else return null;
    }

    setSessionData(key, value) {
        if (key === null) throw ("ClientSessionData.set(): invalid key provided");
        if (typeof (this.session_store) === 'undefined') this.session_store = new Array();
        this.session_store[key] = value;
    }

    deleteSessionData(key) {
        if (key === null) throw ("ClientSessionData.delete(): invalid key provided");
        delete this.session_store[key];
    }


    get(key = null) {
        if (typeof (this.data_store) === 'undefined') return null;
        else if (key === null) return this.data_store;
        else if (this.data_store[key]) return this.data_store[key];
        else return null;
    }

    set(key, value) {
        if (key === null) throw ("ClientSessionData.set(): invalid key provided");
        if (typeof (this.data_store) === 'undefined') this.data_store = new Array();
        this.data_store[key] = value;
    }

    delete(key) {
        if (key === null) throw ("ClientSessionData.delete(): invalid key provided");
        delete this.data_store[key];
    }
}


module.exports = WTVClientSessionData;