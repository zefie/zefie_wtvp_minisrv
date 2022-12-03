const { lib } = require('crypto-js');
const CryptoJS = require('crypto-js');
const WTVMail = require("./WTVMail.js")
const WTVSec = require("./WTVSec.js");
const WTVFavorites = require("./WTVFavorites.js");

class WTVClientSessionData {

    fs = require('fs');
    path = require('path');

    ssid = null;
    data_store = null;
    session_store = null;
    mailstore = null;
    favstore = null;
    login_security = null;
    capabilities = null;
    session_storage = "";
    minisrv_config = [];
    wtvshared = null;
    wtvmime = null;
    lockdown = null;
    lockdownReason = null;
    lockdownWhitelist = null;
    baddisk = false;
    clientAddress = null;
    user_id = 0;
    cryptoKey = null;
    debug = require('debug')('WTVClientSessionData')

    constructor(minisrv_config, ssid) {
        if (!minisrv_config) throw ("minisrv_config required");
        var WTVShared = require("./WTVShared.js")['WTVShared'];
        var WTVMime = require("./WTVMime.js");
        this.minisrv_config = minisrv_config;
        this.cryptoKey = this.minisrv_config.config.keys.user_data_key;
        this.wtvshared = new WTVShared(minisrv_config);
        this.wtvmime = new WTVMime(minisrv_config);
        this.lockdown = false;
        this.ssid = ssid;
        this.data_store = new Array();
        this.session_store = {};
        this.lockdownWhitelist = minisrv_config.config.lockdownWhitelist;
        this.lockdownWhitelist.push(minisrv_config.config.unauthorized_url);
        this.lockdownWhitelist.push(minisrv_config.config.service_logo);
        this.mailstore = new WTVMail(this.minisrv_config, this)
        this.favstore = new WTVFavorites(this.minisrv_config, this)
        this.loginWhitelist = Object.assign([], this.lockdownWhitelist); // clone lockdown whitelist into login whitelist
        this.loginWhitelist.push("wtv-head-waiter:/choose-user");
        this.loginWhitelist.push("wtv-head-waiter:/password");
    }

    assignMailStore() {
        this.mailstore = new WTVMail(this.minisrv_config, this)
    }

    assignFavoriteStore() {
        this.mailstore = this.favstore = new WTVFavorites(this.minisrv_config, this)
    }

    createWTVSecSession() {
        return new WTVSec(this.minisrv_config)
    }

    getAccountTotalUnreadMessages() {
        if (!this.isRegistered()) return false; // unregistered
        if (this.user_id > 0) return false; // not primary user or pre-login


        var total_unread_messages = 0;
        var accounts = this.listPrimaryAccountUsers();
        var self = this;
        Object.keys(accounts).forEach((k) => {
            var user_id = accounts[k].user_id;
            var subUserSession = new self.constructor(self.minisrv_config, self.ssid);
            subUserSession.switchUserID(user_id, false, false);
            subUserSession.assignMailStore();
            if (subUserSession.mailstore) {
                total_unread_messages += subUserSession.mailstore.countUnreadMessages(0);
            }
        });
        return total_unread_messages;
    }

    clearUserSessionMemory() {
        this.setUserLoggedIn(false);
        this.data_store = new Array();
        this.session_store = {};
        this.assignFavoriteStore();
        this.assignMailStore()
    }

    switchUserID(user_id, update_mail = true, update_ticket = true, update_favorite = true) {
        this.user_id = parseInt(user_id);
        if (user_id != null) {
            this.loadSessionData();
            if (this.isRegistered() && update_mail) this.assignMailStore();
            if (this.isRegistered() && update_favorite) this.assignMailStore();
            if (this.data_store.wtvsec_login && update_ticket) this.setTicketData('user_id', user_id);
        } else {
            this.user_id = 0;
            this.clearUserSessionMemory();
        }
    }

    setTicketData(key, value) {
        if (this.data_store.wtvsec_login) this.data_store.wtvsec_login.setTicketData(key, value);
        else return false;

        return true;
    }

    getTicketData(key) {
        if (this.data_store.wtvsec_login) return this.data_store.wtvsec_login.getTicketData(key);

        return false;
    }

    deleteTicketData(key) {
        if (this.data_store.wtvsec_login) this.data_store.wtvsec_login.deleteTicketData(key);
        else return false;

        return true;
    }

    findFreeUserSlot() {
        if (this.user_id != 0) return false; // subscriber only command
        var master_directory = this.getUserStoreDirectory(true);
        if (this.fs.existsSync(master_directory)) {
            for (var i = 0; i < this.minisrv_config.config.user_accounts.max_users_per_account; i++) {
                var test_dir = master_directory + this.path.sep + "user" + i;
                if (!this.fs.existsSync(test_dir)) {
                    return i;
                    break;
                }
            }
        }
        return false;
    }

    getDisplayName() {
        return (this.user_id == 0) ? this.getSessionData("subscriber_name") : this.getSessionData("display_name");
    }

    getNumberOfUserAccounts() {
        if (!this.isRegistered()) return false;
        if (this.user_id != 0) return false; // subscriber only command
        return Object.keys(this.listPrimaryAccountUsers()).length;
    }

    listPrimaryAccountUsers() {
        if (this.user_id != 0) return false; // subscriber only command

        var master_directory = this.getUserStoreDirectory(true);
        var account_data = [];
        var self = this;
        this.fs.readdirSync(master_directory).forEach(f => {
            if (self.fs.lstatSync(master_directory + self.path.sep + f).isDirectory()) {
                if (f.substr(0, 4) == "user") {
                    var user_file = master_directory + self.path.sep + f + self.path.sep + f + ".json";
                    if (self.fs.existsSync(user_file)) {
                        if (f == "user0") {
                            account_data['subscriber'] = JSON.parse(this.fs.readFileSync(user_file));
                            account_data['subscriber'].user_id = 0;
                        }
                        else {
                            account_data[f] = JSON.parse(this.fs.readFileSync(user_file));
                            account_data[f].user_id = parseInt(f.replace("user", ''))
                        }
                    }
                }
            }
        });
        return account_data;
    }


    mkdirRecursive(thedir) {
        thedir.split(this.path.sep).reduce(
            (directories, directory) => {
                directories += directory + this.path.sep;
                if (!this.fs.existsSync(directories)) {
                    this.fs.mkdirSync(directories);
                }
                return directories;
            },
            '',
        );
    }

    getAccountStoreDirectory() {
        return this.minisrv_config.config.SessionStore + this.path.sep + "accounts";
    }

    /**
     * Returns the absolute path to the user's file store, or false if unregistered
     * @param subscriber {boolean} Returns the parent subscriber directory instead of the user's directory
     * @returns {string|boolean} Absolute path to the user's file store, or false if unregistered
     */
    getUserStoreDirectory(subscriber = false, user_id = null) {
        if (user_id == null) user_id = this.user_id;
        var userstore = this.getAccountStoreDirectory() + this.path.sep + this.ssid + this.path.sep;
        if (!subscriber) userstore += "user" + user_id + this.path.sep;
        return userstore;
    }

    removeUser(user_id) {
        if (!this.isRegistered()) return false; // not registered
        if (parseInt(this.user_id) !== 0) return false; // not primary account
        if (user_id === 0) return false; // cannot delete primary account in this fashion

        var userstore = this.getUserStoreDirectory(false, user_id);
        if (this.fs.existsSync(userstore)) {
            this.fs.rmSync(userstore, { recursive: true });
            return true;
        }
        return false;
    }

    /**
     * Store a file in the user's file store
     * @param {string} path Relative path to User's file store
     * @param {Buffer} data File data
     * @param {number|null} last_modified Unix timestamp to set last modified date to
     * @param {boolean} overwrite Overwrite if file exists
     * @returns {boolean} Whether or not the file was written
     */
    storeUserStoreFile(path, data, last_modified = null, overwrite = true) {
        var store_dir = this.getUserStoreDirectory();
        if (!store_dir) return false; // unregistered
        // FileStore
        store_dir += "FileStore" + this.path.sep;
        var result = false;        
        var path_split = path.split('/');
        var file_name = path_split.pop();
        var store_dir_path = this.wtvshared.makeSafePath(store_dir, path_split.join('/').replace('/', this.path.sep));
        var store_full_path = this.wtvshared.makeSafePath(store_dir_path, file_name);

        try {
            if (!this.fs.existsSync(store_dir_path)) this.fs.mkdirSync(store_dir_path, { recursive: true });
            var file_exists = this.fs.existsSync(store_full_path);
            if (!file_exists || (file_exists && overwrite)) result = this.fs.writeFileSync(store_full_path, data);
            if (result !== false && last_modified) {
                var file_timestamp = new Date(last_modified * 1000);
                fs.utimesSync(store_full_path, Date.now(), file_timestamp)
            }
        } catch (e) {
            console.error(" # User File Store failed", e);
        }
        return (result === false) ? false : true;
    }

    /**
     * Retrieves a file from the user store
     * @param {string} path Path relative to the User File Store
     * @returns {Buffer|false} Buffer data, or false if could not open file
     */
    getUserStoreFile(path) {
        var store_dir = this.getUserStoreDirectory();
        if (!store_dir) return false; // unregistered
        // FileStore
        store_dir += "FileStore" + this.path.sep;
        var store_dir_path = this.wtvshared.makeSafePath(store_dir, path.replace('/', this.path.sep));
        if (this.fs.existsSync(store_dir_path)) return this.fs.readFileSync(store_dir_path);
        else return false;
    }

    /**
     * Retrieves a file from the user store with a file://Disk/ url
     * @param {string} url file://Disk/ base url
     * @returns {Buffer|false} Buffer data, or false if could not open file
     */
    getUserStoreFileByURL(url) {
        var path_split = url.split('/');
        path_split.shift();
        path_split.shift();
        var store_dir_path = path_split.join('/').replace('/', this.path.sep);
        return this.getUserStoreFile(store_dir_path);
    }

    /**
    * Retrieves the Content-Type of a User Store File
    * @param {string} path Path relative to the User File Store
    * @returns {string|false} Content-Type, or false if could not open file
    */
    getUserStoreContentType(path) {
        return this.wtvmime.getSimpleContentType(path);
    }

    /**
     * Returns the number of user cookies
     * @returns {number} Number of cookies
     */
    countCookies() {
        return Object.keys(this.session_store.cookies).length || 0;
    }

    resetCookies() {
        this.session_store.cookies = {};
        // webtv likes to have at least one cookie in the list, set a dummy cookie for zefie's site expiring in 1 year.
        this.addCookie("wtv.zefie.com", "/", this.wtvshared.getUTCTime(365 * 86400000), "cookie_type=chocolatechip");
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
            if (this.fs.lstatSync(this.getUserStoreDirectory() + "user" + this.user_id + ".json")) {
                var json_data = this.fs.readFileSync(this.getUserStoreDirectory() + "user" + this.user_id + ".json", 'Utf8')
                if (raw_data) return JSON.parse(json_data);

                var session_data = JSON.parse(json_data);
                this.session_store = session_data;
                return true;
            }
        } catch (e) {
            // Don't log error 'file not found', it just means the client isn't registered yet
            if (e.code != "ENOENT") console.error(" # Error loading session data for", this.wtvshared.filterSSID(this.ssid), e);
            // also wipe any existing session_store
            this.session_store = {};
            return false;
        }
    }

    encryptPassword(passwd) {
        return CryptoJS.AES.encrypt(passwd, this.cryptoKey).toString();
    }

    decryptPassword(crypt) {
        return CryptoJS.AES.decrypt(crypt, this.cryptoKey).toString(CryptoJS.enc.Utf8);
    }

    encodePassword(passwd) {
        var encoded_passwd = CryptoJS.SHA512(passwd);
        return encoded_passwd.toString(CryptoJS.enc.Base64);
    }

    setUserPassword(passwd) {
        var encoded_passwd = this.encodePassword(passwd);
        this.setSessionData("subscriber_password", encoded_passwd);
        this.saveSessionData();
    }

    setUserSMTPPassword(passwd) {
        var encoded_passwd = this.encryptPassword(passwd);
        this.setSessionData("subscriber_smtp_password", encoded_passwd);
        this.saveSessionData();
    }

    getUserSMTPPassword() {
        return this.decryptPassword(this.setSessionData("subscriber_smtp_password"))
    }

    disableUserPassword() {
        this.setSessionData("subscriber_password", null);
        this.saveSessionData();
    }

    getUserPasswordEnabled() {
        if (!this.minisrv_config.config.passwords.enabled) return false; // master config override
        var enabled = this.getSessionData("subscriber_password");
        return (enabled != null && typeof enabled != undefined); // true if set, false if null/disabled
    }

    validateUserPassword(passwd) {
        if (!this.getUserPasswordEnabled()) return true; // no password is set so always validate

        var encoded_passwd = this.encodePassword(passwd);
        return (encoded_passwd == this.getSessionData("subscriber_password"));
    }

    isUserLoggedIn() {
        var password_valid = this.get("password_valid");
        return (password_valid);
    }

    setUserLoggedIn(value) {
        if (value) return this.set("password_valid", value);
        else {
            this.delete("password_valid");
            return false;
        }
    }

    saveSessionData(force_write = false, skip_merge = false) {
        if (this.isRegistered()) {
            if (!skip_merge) {
                // load data from disk and merge new data
                var temp_data = this.loadSessionData(true);                
                if (temp_data) this.session_store = Object.assign(temp_data, this.session_store);
                temp_data = null;
            }
        } else {
            // do not write file if user is not registered, return true because this is not an error
            // force write needed to set the initial reg
            if (!force_write) return true;
        }
        
        try {
            // only save if file has changed
            var sessionToStore = this.session_store;
            var json_save_data = JSON.stringify(sessionToStore);
            var json_load_data = (skip_merge) ? {} : this.loadSessionData(true);

            var storeDir = this.getUserStoreDirectory();
            if (!this.fs.existsSync(storeDir)) this.mkdirRecursive(storeDir);

            if (sessionToStore.password_valid) delete sessionToStore.password_valid; // do not save validity state of password login, resets when session expires
            if (json_save_data != json_load_data) this.fs.writeFileSync(storeDir + "user" + this.user_id + ".json", JSON.stringify(sessionToStore), "Utf8");
            return true;
        } catch (e) {            
            console.error(" # Error saving session data for", this.wtvshared.filterSSID(this.ssid), e);
            return false;
        }
    }

    retrieveSessionData() {
        // alias
        return this.loadSessionData();
    }

    storeSessionData(force_write = false) {
        // alias
        return this.saveSessionData(force_write);
    }

    SaveIfRegistered(skip_merge = false) {
        if (this.isRegistered()) return this.saveSessionData(false, skip_merge);
        return false;
    }

    isRegistered(session_mode = true) {
        if (session_mode)
            return (this.getSessionData("registered") && this.fs.existsSync(this.getUserStoreDirectory()));
        else
            return this.fs.existsSync(this.getUserStoreDirectory());
    }

    unregisterBox() {
        var user_store_base = this.wtvshared.makeSafePath(this.wtvshared.getAbsolutePath(this.getAccountStoreDirectory()), this.path.sep + this.ssid);
        try {
            if (this.fs.existsSync(user_store_base + ".json")) {
                this.fs.unlinkSync(user_store_base + ".json");
                this.session_store = {};
            }
            if (this.fs.existsSync(user_store_base)) {
                this.fs.rmSync(user_store_base, { recursive: true });
            }
            return true;
        } catch (e) {
            // Don't log error 'file not found', it just means the client isn't registered yet
            console.error(" # Error deleting session data for", this.wtvshared.filterSSID(this.ssid), e);
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
        return (this.data_store['wtv-need-upgrade'] || this.data_store['wtv-used-8675309']) ? true : false;
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
        this.SaveIfRegistered();
    }

    deleteSessionData(key) {
        if (key === null) throw ("ClientSessionData.delete(): invalid key provided");
        delete this.session_store[key];
        this.SaveIfRegistered(true);
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
        this.SaveIfRegistered();
    }

    delete(key) {
        if (key === null) throw ("ClientSessionData.delete(): invalid key provided");
        delete this.data_store[key];
        this.SaveIfRegistered(true);
    }

    getBoxName() {
        switch (this.get("wtv-client-rom-type")) {
            case "US-DTV-disk-0MB-16MB-softmodem-CPU5230":
            case "US-DTV-disk-0MB-32MB-softmodem-CPU5230":
                return "UltimateTV Satellite receiver";

            case "US-WEBSTAR-disk-0MB-8MB-softmodem-CPU5230":
            case "US-WEBSTAR-disk-0MB-16MB-softmodem-CPU5230":
                return "WebTV Satellite receiver";

            case "US-LC2-flashdisk-0MB-16MB-softmodem-CPU5230":
            case "US-LC2-disk-0MB-8MB":
            case "US-LC2-flash-2MB-8MB":
            case "JP-LC2-disk-0MB-8MB":
            case "JP-LC2-flash-2MB-8MB":
            case "US-LC2-disk-0MB-8MB-softmodem-CPU5230":
            case "US-LC2-flash-2MB-8MB-softmodem-CPU5230 ":
            case "US-LC2-disk-0MB-8MB-CPU5230":
            case "US-LC2-flash-2MB-8MB-CPU5230":
            case "JP-LC2-disk-0MB-8MB-CPU5230":
            case "JP-LC2-disk-0MB-16MB-CPU5230":
            case "JP-LC2-flash-2MB-8MB-CPU5230":
                return "WebTV Plus receiver";

            default:
                return "WebTV Internet receiver";
        }
    }

    checkSecurity() {
        var self = this;
        var rejectReason = null;
        var ip2long = function (ip) {
            var components;

            if (components = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)) {
                var iplong = 0;
                var power = 1;
                for (var i = 4; i >= 1; i -= 1) {
                    iplong += power * parseInt(components[i]);
                    power *= 256;
                }
                return iplong;
            }
            else return -1;
        };

        var isInSubnet = function (ip, subnet) {
            if (subnet.indexOf('/') == -1) {
                var mask, base_ip, long_ip = this.ip2long(ip);
                var mask2, base_ip2, long_ip2 = this.ip2long(ip);
                return (long_ip == long_ip2);
            } else {
                var mask, base_ip, long_ip = this.ip2long(ip);
                if ((mask = subnet.match(/^(.*?)\/(\d{1,2})$/)) && ((base_ip = this.ip2long(mask[1])) >= 0)) {
                    var freedom = Math.pow(2, 32 - parseInt(mask[2]));
                    return (long_ip > base_ip) && (long_ip < base_ip + freedom - 1);
                }
            }
            return false;
        };

        var rejectSSIDConnection = function (blacklist) {
            if (blacklist) {
                rejectReason = self.ssid + " is in the blacklist.";
                console.log(" * Request from SSID", self.wtvshared.filterSSID(self.ssid), "(" + self.clientAddress + "), but that SSID is in the blacklist.");
            } else {
                rejectReason = self.ssid + " is not in the whitelist.";
                console.log(" * Request from SSID", self.wtvshared.filterSSID(self.ssid), "(" + self.clientAddress + "), but that SSID is not in the whitelist.");
            }
        }

        var checkSSIDIPWhitelist = function (ssid, blacklist) {
            var ssid_access_list_ip_override = false;
            if (self.minisrv_config.config.ssid_ip_allow_list) {
                if (self.minisrv_config.config.ssid_ip_allow_list[self.ssid]) {
                    Object.keys(self.minisrv_config.config.ssid_ip_allow_list[self.ssid]).forEach(function (k) {
                        if (self.minisrv_config.config.ssid_ip_allow_list[self.ssid][k].indexOf('/') > 0) {
                            if (isInSubnet(self.clientAddress, self.minisrv_config.config.ssid_ip_allow_list[self.ssid][k])) {
                                // remoteAddr is in allowed subnet
                                ssid_access_list_ip_override = true;
                            }
                        } else {
                            if (self.clientAddress == self.minisrv_config.config.ssid_ip_allow_list[self.ssid][k]) {
                                // remoteAddr directly matches IP
                                ssid_access_list_ip_override = true;
                            }
                        }
                    });
                    if (!ssid_access_list_ip_override) rejectSSIDConnection(self.ssid, blacklist);
                } else {
                    rejectSSIDConnection(blacklist);
                }
            } else {
                rejectSSIDConnection(blacklist);
            }
            if (ssid_access_list_ip_override && self.minisrv_config.config.debug_flags.debug) console.log(" * Request from disallowed SSID", wtvshared.filterSSID(ssid), "was allowed due to IP address whitelist");
        }

        // process whitelist first
        if (self.ssid && self.minisrv_config.config.ssid_allow_list) {
            var ssid_is_in_whitelist = self.minisrv_config.config.ssid_allow_list.findIndex(element => element == self.ssid);
            if (ssid_is_in_whitelist == -1) {
                // no whitelist match, but lets see if the remoteAddress is allowed
                checkSSIDIPWhitelist(self.ssid, false);
            }
        }

        // now check blacklist
        if (self.ssid && self.minisrv_config.config.ssid_block_list) {
            var ssid_is_in_blacklist = self.minisrv_config.config.ssid_block_list.findIndex(element => element == self.ssid);
            if (ssid_is_in_blacklist != -1) {
                // blacklist match, but lets see if the remoteAddress is allowed
                checkSSIDIPWhitelist(self.ssid, true);
            }
        }
        if (rejectReason === null) {
            // Passed Security
            return true;
        } else {
            // Failed security
            this.enableLockdown(rejectReason);
            return false;
        }
    }


    isAuthorized(url, whitelist = 'lockdown', ignore_lockdown = false) {
        // not in lockdown so just return true
        if (whitelist == 'lockdown' && !this.lockdown && !ignore_lockdown) return true;

        // in lockdown, check whitelisted urls
        var self = this;
        var authorized = false;
        switch (whitelist) {
            case "lockdown":
                Object.keys(this.lockdownWhitelist).forEach(function (k) {
                    if (self.lockdownWhitelist[k].charAt(self.lockdownWhitelist[k].length - 1) == '*') {
                        if (self.lockdownWhitelist[k].substring(0, self.lockdownWhitelist[k].length - 1) == url.substring(0, self.lockdownWhitelist[k].length - 1)) authorized = true;
                    } else {
                        if (self.lockdownWhitelist[k].substring(0, url.length) == url) authorized = true;
                    }
                });
                break;
            case "login":
                Object.keys(this.loginWhitelist).forEach(function (k) {
                    if (self.loginWhitelist[k].charAt(self.loginWhitelist[k].length - 1) == '*') {
                        if (self.loginWhitelist[k].substring(0, self.loginWhitelist[k].length - 1) == url.substring(0, self.loginWhitelist[k].length - 1)) authorized = true;
                    } else {
                        if (self.loginWhitelist[k].substring(0, url.length) == url) authorized = true;
                    }
                });
                break;
        }
        return authorized;
    }

    enableLockdown(reason) {
        this.lockdown = true;
        this.lockdownReason = reason;
    }

    disableLockdown() {
        this.lockdown = false;
        this.lockdownReason = null;
    }

    setClientAddress(addr) {
        this.clientAddress = addr;
    }

    getClientAddress() {
        return this.clientAddress;
    }

    setMailstore(mailstore) {
        this.mailstore = mailstore;
    }

    getManufacturer(url = false) {
        var isPlus = this.hasCap("client-has-tv-experience")
        var romtype = this.get("wtv-client-rom-type");
        var brandId = this.ssid.charAt(8)

        if (brandId == 0)
            if (url && romtype == "US-DTV-disk-0MB-32MB-softmodem-CPU5230")
                return "Sony/DirecTV";
            else
                return "Sony";
        else if (brandId == 1)
            if (url && isPlus == true)
                return "Philips-Plus";
            else
                return "Philips";
        else if (brandId == 4)
            return "Mitsubishi";
        else if (brandId == 5)
            return "Philips-Mont";
        else if (brandId == 7)
            return "Samsung";
        else if (brandId == 9)
            if (url)
                if (romtype == "US-DTV-disk-0MB-32MB-softmodem-CPU5230")
                    return "Thomson/DirecTV";
                else
                    return "Thomson";
            else
                return "RCA";
        else
            return "WebTV";
    }

}

module.exports = WTVClientSessionData;