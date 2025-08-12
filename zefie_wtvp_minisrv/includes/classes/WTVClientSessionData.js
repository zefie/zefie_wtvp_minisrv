const { lib } = require('crypto-js');
const CryptoJS = require('crypto-js');
const WTVMail = require("./WTVMail.js")
const WTVSec = require("./WTVSec.js");
const WTVFavorites = require("./WTVFavorites.js");
const WTVAuthor = require("./WTVAuthor.js");

class WTVClientSessionData {

    fs = require('fs');
    path = require('path');

    ssid = null;
    data_store = null;
    session_store = null;
    mailstore = null;
    favstore = null;
    pagestore = null;
    scrapbook_dir = null;
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
        const WTVShared = require("./WTVShared.js")['WTVShared'];
        const WTVMime = require("./WTVMime.js");
        this.minisrv_config = minisrv_config;
        this.cryptoKey = this.minisrv_config.config.keys.user_data_key;
        this.wtvshared = new WTVShared(minisrv_config);
        this.wtvmime = new WTVMime(minisrv_config);
        this.lockdown = false;
        this.ssid = ssid;
        this.data_store = [];
        this.session_store = {};
        this.lockdownWhitelist = minisrv_config.config.lockdownWhitelist;
        this.lockdownWhitelist.push(minisrv_config.config.unauthorized_url);
        this.lockdownWhitelist.push(minisrv_config.config.service_logo);
        this.mailstore = new WTVMail(this.minisrv_config, this)
        this.favstore = new WTVFavorites(this.minisrv_config, this)
        this.pagestore = new WTVAuthor(this.minisrv_config, this);
        this.loginWhitelist = Object.assign([], this.lockdownWhitelist); // clone lockdown whitelist into login whitelist
        this.loginWhitelist.push("wtv-head-waiter:/choose-user");
        this.loginWhitelist.push("wtv-head-waiter:/password");
        this.loginWhitelist.push("wtv-head-waiter:/confirm-transfer");
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


        let total_unread_messages = 0;
        const accounts = this.listPrimaryAccountUsers();
        const self = this;
        Object.keys(accounts).forEach((k) => {
            const user_id = accounts[k].user_id;
            const subUserSession = new self.constructor(self.minisrv_config, self.ssid);
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
        this.data_store = [];
        this.session_store = {};
        this.assignFavoriteStore();
        this.assignMailStore()
    }

    switchUserID(user_id, update_mail = true, update_ticket = true, update_favorite = true) {
        this.user_id = parseInt(user_id);
        if (user_id !== null) {
            this.loadSessionData();
            if (this.isRegistered() && update_mail) this.assignMailStore();
            if (this.isRegistered() && update_favorite) this.assignMailStore();
            if (this.data_store.wtvsec_login && update_ticket) this.setTicketData('user_id', user_id);
        } else {
            this.user_id = 0;
            this.clearUserSessionMemory();
        }
    }

    /**
     * Sets a ticket data value.
     * @param {string} key The key of the ticket data
     * @param {*} value The value to set
     * @returns {boolean} True if the value was set successfully, false otherwise
     */
    setTicketData(key, value) {
        if (this.data_store.wtvsec_login) this.data_store.wtvsec_login.setTicketData(key, value);
        else return false;

        return true;
    }

    /**
     * Retrieves ticket data by key.
     * @param {string} key The key of the ticket data
     * @return {*} The value associated with the key, or false if not found
     */
    getTicketData(key) {
        if (this.data_store.wtvsec_login) return this.data_store.wtvsec_login.getTicketData(key);
        return false;
    }

    /**
     * Deletes ticket data by key.
     * @param {string} key The key of the ticket data to delete
     * @return {boolean} True if the data was deleted successfully, false otherwise
     */
    deleteTicketData(key) {
        if (this.data_store.wtvsec_login) this.data_store.wtvsec_login.deleteTicketData(key);
        else return false;
        return true;
    }

    isAddressInAddressBook(addr) {
        const addresses = this.getSessionData("address_book");
        if (addresses) {
            for (let i = 0; i < addresses.length; i++) {
                console.log(addr.toLowerCase(), addresses[i].address.toLowerCase())
                if (addr.toLowerCase() == addresses[i].address.toLowerCase()) {
                    return true;
                }
            }
        }
        return false;
    }

    findFreeUserSlot() {
        if (this.user_id != 0) return false; // subscriber only command
        let master_directory = this.getUserStoreDirectory(true);
        if (this.fs.existsSync(master_directory)) {
            for (let i = 0; i < this.minisrv_config.config.user_accounts.max_users_per_account; i++) {
                const test_dir = master_directory + this.path.sep + "user" + i;
                if (!this.fs.existsSync(test_dir)) {
                    return i;
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

        const master_directory = this.getUserStoreDirectory(true);
        let account_data = [];
        const self = this;
        this.fs.readdirSync(master_directory).forEach(f => {
            if (self.fs.lstatSync(master_directory + self.path.sep + f).isDirectory()) {
                if (f.startsWith("user")) {
                    const user_file = this.path.resolve(master_directory + this.path.sep + f + this.path.sep + f + ".json");
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
        return this.wtvshared.getAbsolutePath(this.minisrv_config.config.SessionStore + this.path.sep + "accounts");
    }

    /**
     * Returns the absolute path to the user's file store, or false if unregistered
     * @param subscriber {boolean} Returns the parent subscriber directory instead of the user's directory
     * @returns {string|boolean} Absolute path to the user's file store, or false if unregistered
     */
    getUserStoreDirectory(subscriber = false, user_id = null) {
        if (user_id === null) user_id = this.user_id;
        let userstore = this.getAccountStoreDirectory() + this.path.sep + this.ssid + this.path.sep;
        if (!subscriber) userstore += "user" + user_id + this.path.sep;
        // getAccountStoreDirectory() already returns an absolute path, so we don't need getAbsolutePath again
        return userstore + this.path.sep;
    }

    removeUser(user_id) {
        if (!this.isRegistered()) return false; // not registered
        if (parseInt(this.user_id) !== 0) return false; // not primary account
        if (user_id === 0) return false; // cannot delete primary account in this fashion

        const userstore = this.getUserStoreDirectory(false, user_id);
        if (this.fs.existsSync(userstore)) {
            this.fs.rmSync(userstore, { recursive: true });
            return true;
        }
        return false;
    }

    setPendingTransfer(ssid) {
        const pending_file = this.getUserStoreDirectory(true) + this.path.sep + "pending_transfer.json";
        let ssidobj = { "ssid": ssid, "type": "source" };
        this.fs.writeFileSync(pending_file, JSON.stringify(ssidobj));
       
        const new_userstore = this.getAccountStoreDirectory() + this.path.sep + ssidobj.ssid;
        if (!this.fs.existsSync(new_userstore)) this.fs.mkdirSync(new_userstore);
        const dest_pending_file = new_userstore + this.path.sep + "pending_transfer.json";
        ssidobj = { "ssid": this.ssid, "type": "target" };
        this.fs.writeFileSync(dest_pending_file, JSON.stringify(ssidobj));
    }

    cancelPendingTransfer() {
        const pending_file = this.getUserStoreDirectory(true) + this.path.sep + "pending_transfer.json";
        if (this.fs.existsSync(pending_file)) {
            const file = this.fs.readFileSync(pending_file)
            const ssidobj = JSON.parse(file);
            const new_userstore = this.getAccountStoreDirectory() + this.path.sep + ssidobj.ssid;
            const dest_pending_file = new_userstore + this.path.sep + "pending_transfer.json";
            if (this.fs.existsSync(dest_pending_file)) this.fs.unlinkSync(dest_pending_file);
            this.fs.unlinkSync(pending_file);
            if (this.fs.existsSync(new_userstore)) this.fs.rmdirSync(new_userstore);
            return ssidobj.ssid
        }
        return null;
    }

    finalizePendingTransfer() {
        const pending_file = this.getUserStoreDirectory(true) + this.path.sep + "pending_transfer.json";
        const file = this.fs.readFileSync(pending_file)
        const ssidobj = JSON.parse(file);
        if (ssidobj.type != "target") return false; // Only allow completion from target
        const source_ssid = ssidobj.ssid
        const old_account = this.getAccountStoreDirectory() + this.path.sep + source_ssid
        const new_account = this.getUserStoreDirectory(true);
        this.fs.cpSync(old_account, new_account, {
            filter: (source, _destination) => {
                return source != "pending_transfer.json";
            }, 
            recursive: true
        });
        this.fs.rmSync(old_account, { recursive: true })
        this.fs.rmSync(pending_file);
        return true;
    }

    hasPendingTransfer(dtype = null) {
        const pending_file = this.getUserStoreDirectory(true) + this.path.sep + "pending_transfer.json";
        if (this.fs.existsSync(pending_file)) {
            const ssidobj = JSON.parse(this.fs.readFileSync(pending_file));
            console.log(ssidobj)
            if (dtype) {
                (ssidobj.type == dtype) ? ssidobj.ssid : false;
            }
            else {
                return ssidobj;
            }
        } else {
            return false
        }
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
        let store_dir = this.getUserStoreDirectory();
        if (!store_dir) return false; // unregistered
        // FileStore
        store_dir += "FileStore" + this.path.sep;
        let result = false;
        const path_split = path.split('/');
        const file_name = path_split.pop();
        const store_dir_path = this.wtvshared.makeSafePath(store_dir, path_split.join('/').replace('/', this.path.sep));
        const store_full_path = this.wtvshared.makeSafePath(store_dir_path, file_name);

        try {
            if (!this.fs.existsSync(store_dir_path)) this.fs.mkdirSync(store_dir_path, { recursive: true });
            const file_exists = this.fs.existsSync(store_full_path);
            if (!file_exists || (file_exists && overwrite)) result = this.fs.writeFileSync(store_full_path, data);
            if (result !== false && last_modified) {
                const file_timestamp = new Date(last_modified * 1000);
                fs.utimesSync(store_full_path, Date.now(), file_timestamp)
            }
        } catch (e) {
            console.error(" # User File Store failed", e);
        }
        return result !== false;
    }

    scrapbookExists() {
        if (this.scrapbook_dir === null) {
            const userstore_dir = this.getUserStoreDirectory();
            const store_dir = "Scrapbook" + this.path.sep;
            this.scrapbook_dir = userstore_dir + store_dir;
        }
		return this.fs.existsSync(this.scrapbook_dir);
	}
    
    createScrapbook() {
		if (!this.scrapbookExists()) {
			try {
				if (!this.fs.existsSync(this.scrapbook_dir)) this.fs.mkdirSync(this.scrapbook_dir, { recursive: true });
				return true;
			} catch { }
		}
		return false
	}

	scrapbookDir() {
		if (!this.scrapbookExists()) {
			this.createScrapbook();
		}
		return this.scrapbook_dir;
	}

	listScrapbook() {
		if (!this.scrapbookExists()) {
			this.createScrapbook();
		}
		const files = this.fs.readdirSync(this.scrapbook_dir);
		const filteredFiles = files.sort((a, b) => {
            return a.localeCompare(b, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        }).filter(file => !file.endsWith('.meta'));
		return filteredFiles;
	}

	getFreeScrapbookID() {
		if (!this.scrapbookExists()) {
			this.createScrapbook();
		}
		let id = 1;
		let files = this.fs.readdirSync(this.scrapbook_dir);
		if (files.length === 0) {
			return id;
		}
		files = files.map(file => parseInt(file.slice(0, file.indexOf('.'))));
		while (files.includes(id)) {
			id++;
		}
		return id;
	}

    getScrapbookUsage() {
        if (!this.scrapbookExists()) {
            this.createScrapbook();
        }
        let total_size = 0;
        let files = this.fs.readdirSync(this.scrapbook_dir);
        files.forEach(file => {
            if (!file.endsWith('.meta')) {
                const file_path = this.scrapbook_dir + file;
                if (this.fs.existsSync(file_path)) {
                    total_size += this.fs.statSync(file_path).size;
                }
            }
        });
        return total_size;
    }

    getScrapbookUsagePercent() {
        if (!this.scrapbookExists()) {
            this.createScrapbook();
        }
        const total_size = this.getScrapbookUsage();
        const max_size = this.minisrv_config.config.user_accounts.scrapbook_storage * 1024 * 1024; // convert to bytes
        if (max_size <= 0) return 0; // no storage limit set
        const usage_percent = (total_size / max_size) * 100;
        return Math.round(usage_percent, 2);
    }

	getScrapbookImage(id) {
		if (!this.scrapbookExists()) {
			this.createScrapbook();
		}
		const file = this.scrapbook_dir + id;
		if (this.fs.existsSync(file)) {
			return this.fs.readFileSync(file);
		}
		return null;
	}

	getScrapbookImageType(id) {
		if (!this.scrapbookExists()) {
			this.createScrapbook();
		}
		const file = this.scrapbook_dir + id + ".meta";
		if (this.fs.existsSync(file)) {
			const meta = this.fs.readFileSync(file, 'utf8');
			try {
				const metaData = JSON.parse(meta);
				return metaData.contentType;
			} catch (e) {
				this.debug("getScrapbookImageType", "Error parsing metadata for image ID", id, e);
			}
		}
		return null;
	}

	addToScrapbook(filename, contentType, data) {
		try {
			if (!this.scrapbookExists()) {
				this.createScrapbook();
			}
			const fileout = this.scrapbook_dir + filename;
			const fileout_meta = this.scrapbook_dir + filename + ".meta";
			this.fs.writeFileSync(fileout, data);
			this.fs.writeFileSync(fileout_meta, JSON.stringify({
				"contentType": contentType
			}));
			return true;
		} catch (e) {
			console.error("Error in addToScrapbook:", e);
		}
		return false;
	}    

    /**
     * Retrieves a file from the user store
     * @param {string} path Path relative to the User File Store
     * @returns {Buffer|false} Buffer data, or false if could not open file
     */
    getUserStoreFile(path) {
        let store_dir = this.getUserStoreDirectory();
        if (!store_dir) return false; // unregistered
        // FileStore
        store_dir += "FileStore" + this.path.sep;
        const store_dir_path = this.wtvshared.getAbsolutePath(this.wtvshared.makeSafePath(store_dir, path.replace('/', this.path.sep)));
        if (this.fs.existsSync(store_dir_path)) return this.fs.readFileSync(store_dir_path);
        else return false;
    }

    /**
     * Retrieves a file from the user store with a file://Disk/ url
     * @param {string} url file://Disk/ base url
     * @returns {Buffer|false} Buffer data, or false if could not open file
     */
    getUserStoreFileByURL(url) {
        let path_split = url.split('/');
        path_split.shift();
        path_split.shift();
        const store_dir_path = path_split.join('/').replace('/', this.path.sep);
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

    /**
     * Resets the user cookies
     */    
    resetCookies() {
        this.session_store.cookies = {};
        // webtv likes to have at least one cookie in the list, set a dummy cookie for zefie's site expiring in 1 year.
        this.addCookie("wtv.zefie.com", "/", this.wtvshared.getUTCTime(365 * 86400000), "cookie_type=chocolatechip");
    }

    /**
     * Adds a cookie to the user's session store
     * @param {string|object} domain Domain for the cookie, or an object with cookie data
     * @param {string|null} path Path for the cookie, defaults to null
     * @param {string|null} expires Expiration date for the cookie, defaults to null
     * @param {string|null} data Data for the cookie, defaults to null
     * @return {boolean} True if the cookie was added successfully, false otherwise
     */
    addCookie(domain, path = null, expires = null, data = null) {
        let cookie_data;
        if (!this.checkCookies()) this.resetCookies();
        if (!domain) return false;
        else if (typeof (domain) == 'object') {
            // accept array as first argument
            if (domain.domain && domain.path && domain.expires && domain.data) cookie_data = domain;
            else return false;
        } else {
            if (path && expires && data) {
                cookie_data = {};
                cookie_data['cookie'] = decodeURIComponent(data);
                cookie_data['expires'] = decodeURIComponent(expires);
                cookie_data['path'] = decodeURIComponent(path);
                cookie_data['domain'] = decodeURIComponent(domain);
            } else {
                return false;
            }
        }

        const self = this;
        let cookie_index = -1;
        // see if we have a cookie for this domain/path
        Object.keys(this.session_store.cookies).forEach(function (k) {
            if (cookie_index >= 0) return;
            if (domain == self.session_store.cookies[k].domain && path == self.session_store.cookies[k].path) cookie_index = k;
        });
        // otherwise add a new one
        if (cookie_index === -1) cookie_index = this.countCookies();

        this.session_store.cookies[cookie_index] = Object.assign({}, cookie_data);

        return true;
    }

    /**
     * Retrieves a cookie from the user's session store
     * @param {string} domain Domain of the cookie
     * @param {string} path Path of the cookie
     * @return {object|false} Cookie data if found, false otherwise
     */
    getCookie(domain, path) {
        if (!this.checkCookies()) this.resetCookies();
        const self = this;
        let result = false;
        Object.keys(this.session_store['cookies']).forEach(function (k) {
            if (result !== false) return;
            if (self.session_store['cookies'][k].domain == domain &&
                self.session_store['cookies'][k].path == path) {

                const current_epoch_utc = Date.parse((new Date()).toUTCString());
                const cookie_expires_epoch_utc = Date.parse(new Date(Date.parse(self.session_store['cookies'][k].expires)).toUTCString());
                if (cookie_expires_epoch_utc <= current_epoch_utc) self.deleteCookie(self.session_store['cookies'][k]);
                else result = self.session_store['cookies'][k];
            }
        });
        return result;
    }

    /**
     * Retrieves a cookie string from the user's session store
     * @param {string} domain Domain of the cookie
     * @param {string} path Path of the cookie
     * @return {string|false} Cookie string if found, false otherwise
     */
    getCookieString(domain, path) {
        return this.getCookie(domain, path);
    }

    /**
     * Deletes a cookie from the user's session store
     * @param {string|object} domain Domain of the cookie, or an object with cookie data
     * @param {string|null} path Path of the cookie, defaults to null
     * @return {boolean} True if the cookie was deleted successfully, false otherwise
     */
    deleteCookie(domain, path = null) {
        let result = false;
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

        const self = this;
        Object.keys(this.session_store['cookies']).forEach(function (k) {
            if (self.session_store['cookies'][k].domain == domain && self.session_store['cookies'][k].path == path) {
                delete self.session_store['cookies'][k];
                self.storeSessionData();
                result = true;
            }
        });

        return result;
    }

    /**
     * Checks if there are any cookies stored in the session
     * @return {boolean} True if there are cookies, false otherwise
     */
    checkCookies() {
        if (!this.session_store.cookies) return false;
        else if (this.session_store.cookies == []) return false;
        return true;
    }

    /**
     * Lists all cookies in the user's session store
     * @return {string} String representation of all cookies, each cookie separated by a null character
     */
    listCookies() {
        if (!this.checkCookies()) this.resetCookies();
        let outstring = "";
        const self = this;
        Object.keys(this.session_store.cookies).forEach(function (k) {
            outstring += self.session_store.cookies[k].domain + "\0" + self.session_store.cookies[k].path + "\0";
        });
        return outstring;
    }

    loadSessionData(raw_data = false) {
        try {
            if (this.fs.lstatSync(this.getUserStoreDirectory() + "user" + this.user_id + ".json")) {
                const json_data = this.fs.readFileSync(this.getUserStoreDirectory() + "user" + this.user_id + ".json", 'Utf8')
                if (raw_data) return JSON.parse(json_data);
                this.session_store = JSON.parse(json_data);
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
        return CryptoJS.SHA512(passwd).toString(CryptoJS.enc.Base64);
    }

    setUserPassword(passwd) {
        this.setSessionData("subscriber_password", this.encodePassword(passwd));
        this.saveSessionData();
    }

    setUserSMTPPassword(passwd) {
        this.setSessionData("subscriber_smtp_password", this.encryptPassword(passwd));
        this.saveSessionData();
    }

    getUserSMTPPassword() {
        return this.decryptPassword(this.getSessionData("subscriber_smtp_password"))
    }

    disableUserPassword() {
        this.setSessionData("subscriber_password", null);
        this.saveSessionData();
    }

    getUserPasswordEnabled() {
        if (!this.minisrv_config.config.passwords.enabled) return false; // master config override
        const enabled = this.getSessionData("subscriber_password");
        return (enabled !== null && typeof enabled !== 'undefined'); // true if set, false if null/disabled
    }

    validateUserPassword(passwd) {
        if (!this.getUserPasswordEnabled()) return true; // no password is set so always validate
        return (this.encodePassword(passwd) == this.getSessionData("subscriber_password"));
    }

    isUserLoggedIn() {
        return (this.get("password_valid") || false);
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
                const temp_data = this.loadSessionData(true);                
                if (temp_data) this.session_store = Object.assign(temp_data, this.session_store);
            }
        } else {
            // do not write file if user is not registered, return true because this is not an error
            // force write needed to set the initial reg
            if (!force_write) return true;
        }
        
        try {
            // only save if file has changed
            const sessionToStore = this.session_store;
            const json_save_data = JSON.stringify(sessionToStore);
            const json_load_data = (skip_merge) ? {} : this.loadSessionData(true);

            const storeDir = this.getUserStoreDirectory();
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
        const user_store_base = this.wtvshared.makeSafePath(this.wtvshared.getAbsolutePath(this.getAccountStoreDirectory()), this.path.sep + this.ssid);
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
            return this.capabilities.get(cap) || false;
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
        nick = nick.slice(0, this.getMaxUsernameLength());

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
        if (typeof (this.session_store) === 'session_store') return null;
        else if (key === null) return this.session_store;
        else if (this.session_store[key]) return this.session_store[key];
        else return null;
    }

    setSessionData(key, value) {
        if (key === null) throw ("ClientSessionData.setSessionData(): invalid key provided");
        if (typeof (this.session_store) === 'undefined') this.session_store = {};
        this.session_store[key] = value;
        this.SaveIfRegistered();
    }

    deleteSessionData(key) {
        if (key === null) throw ("ClientSessionData.deleteSessionData(): invalid key provided");
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
        if (typeof (this.data_store) === 'undefined') this.data_store = [];
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
        const self = this;
        const rejectReason = null;
        const ip2long = function (ip) {
            let components;

            if (components = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)) {
                let iplong = 0;
                let power = 1;
                for (let i = 4; i >= 1; i -= 1) {
                    iplong += power * parseInt(components[i]);
                    power *= 256;
                }
                return iplong;
            }
            else return -1;
        };

        const rejectSSIDConnection = function (blacklist) {
            if (blacklist) {
                rejectReason = self.ssid + " is in the blacklist.";
                console.log(" * Request from SSID", self.wtvshared.filterSSID(self.ssid), "(" + self.clientAddress + "), but that SSID is in the blacklist.");
            } else {
                rejectReason = self.ssid + " is not in the whitelist.";
                console.log(" * Request from SSID", self.wtvshared.filterSSID(self.ssid), "(" + self.clientAddress + "), but that SSID is not in the whitelist.");
            }
        }

        const checkSSIDIPWhitelist = function (ssid, blacklist) {
            let ssid_access_list_ip_override = false;
            if (self.minisrv_config.config.ssid_ip_allow_list) {
                if (self.minisrv_config.config.ssid_ip_allow_list[self.ssid]) {
                    Object.keys(self.minisrv_config.config.ssid_ip_allow_list[self.ssid]).forEach(function (k) {
                        if (self.minisrv_config.config.ssid_ip_allow_list[self.ssid][k].includes('/')) {
                            if (this.wtvshared.isInSubnet(self.clientAddress, self.minisrv_config.config.ssid_ip_allow_list[self.ssid][k])) {
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
            const ssid_is_in_whitelist = self.minisrv_config.config.ssid_allow_list.findIndex(element => element == self.ssid);
            if (ssid_is_in_whitelist === -1) {
                // no whitelist match, but lets see if the remoteAddress is allowed
                checkSSIDIPWhitelist(self.ssid, false);
            }
        }

        // now check blacklist
        if (self.ssid && self.minisrv_config.config.ssid_block_list) {
            const ssid_is_in_blacklist = self.minisrv_config.config.ssid_block_list.findIndex(element => element == self.ssid);
            if (ssid_is_in_blacklist !== -1) {
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
        const self = this;
        let authorized = false;
        switch (whitelist) {
            case "lockdown":
                Object.keys(this.lockdownWhitelist).forEach(function (k) {
                    if (self.lockdownWhitelist[k].endsWith('*')) {
                        const prefix = self.lockdownWhitelist[k].slice(0, -1);
                        if (url.startsWith(prefix)) authorized = true;
                    } else {
                        if (url.startsWith(self.lockdownWhitelist[k])) authorized = true;
                    }
                });
                break;
            case "login":
                Object.keys(this.loginWhitelist).forEach(function (k) {
                    if (self.loginWhitelist[k].endsWith('*')) {
                        const prefix = self.loginWhitelist[k].slice(0, -1);
                        if (url.startsWith(prefix)) authorized = true;
                    } else {
                        if (url.startsWith(self.loginWhitelist[k])) authorized = true;
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
        const isPlus = this.hasCap("client-has-tv-experience")
        const romtype = this.get("wtv-client-rom-type");
        const brandId = this.ssid.charAt(8)

        if (brandId == 0)
            if (url && romtype == "US-DTV-disk-0MB-32MB-softmodem-CPU5230")
                return "Sony/DirecTV";
            else
                return "Sony";
        else if (brandId == 1)
            if (url && isPlus === true)
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