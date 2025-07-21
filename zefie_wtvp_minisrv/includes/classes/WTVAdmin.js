const WTVClientSessionData = require('./WTVClientSessionData.js');

class WTVAdmin {

    fs = require('fs');
    path = require('path');
    minisrv_config = [];
    wtvr = null;
    wtvshared = null;
    wtvclient = null;
    pcservices = false;
    WTVClientSessionData = require("./WTVClientSessionData.js");
    service_name = "wtv-admin";

    SUCCESS = 0
    FAIL = 1
    INVALID_OP = 2

    REASON_NOSELF = 3
    REASON_EXISTS = 4
    REASON_NONEXIST = 5

    /**
     * Creates an instance of WTVAdmin.
     * @param {Object} minisrv_config 
     * @param {WTVClientSessionData} wtvclient
     * @param {string} service_name 
     */
    constructor(minisrv_config, wtvclient, service_name) {
        this.minisrv_config = minisrv_config;
        var { WTVShared } = require("./WTVShared.js");
        var WTVRegister = require("./WTVRegister.js");
        this.wtvclient = wtvclient;
        this.wtvshared = new WTVShared(minisrv_config);
        this.wtvr = new WTVRegister(minisrv_config);
        if (this.wtvclient.remoteAddress) {
            // is a socket
            this.clientAddress = this.wtvclient.remoteAddress;
            this.pcservices = true;
        } else {
            // is wtvclient class
            this.clientAddress = this.wtvclient.getClientAddress();
        }
        this.service_name = service_name;
    }

    /**
     * Bans a specific SSID.
     * @param {string} ssid The SSID to ban
     * @param {string} admin_ssid The SSID of the admin requesting the ban
     * @returns {number} The result of the ban operation
     */
    banSSID(ssid, admin_ssid = null) {
        if (ssid == admin_ssid) {
            return this.REASON_NOSELF;
        } else {
            var fake_config = this.wtvshared.getUserConfig();
            if (!fake_config.config) fake_config.config = {};
            if (!fake_config.config.ssid_block_list) fake_config.config.ssid_block_list = [];
            var entry_exists = false;
            var self = this;
            Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                if (fake_config.config.ssid_block_list[k] == ssid) {
                    return self.REASON_EXISTS;
                }
            });
            if (!entry_exists) {
                fake_config.config.ssid_block_list.push(ssid);
                this.wtvshared.writeToUserConfig(fake_config);
                return this.SUCCESS;
            }
        }
    }

    /**
     * Unbans a specific SSID.
     * @param {string} ssid The SSID to unban
     * @returns {number} The result of the unban operation
     */
    unbanSSID(ssid) {
        var config_changed = false;
        var fake_config = this.wtvshared.getUserConfig();
        if (!fake_config.config) fake_config.config = {};
        if (!fake_config.config.ssid_block_list) fake_config.config.ssid_block_list = [];
        if (typeof ssid === 'string') {
            Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                if (fake_config.config.ssid_block_list[k].toLowerCase() == ssid.toLowerCase()) {
                    fake_config.config.ssid_block_list.splice(k, 1);
                    config_changed = true
                }
            });
        } else {
            Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                Object.keys(ssid).forEach(function (j) {
                    if (fake_config.config.ssid_block_list[k].toLowerCase() == ssid[j].toLowerCase()) {
                        fake_config.config.ssid_block_list.splice(k, 1);
                        config_changed = true
                    }
                });
            });
        }
        if (config_changed) {
            wtvshared.writeToUserConfig(fake_config);
            minisrv_config = reloadConfig();
            return this.SUCCESS
        } else {
            return this.REASON_NONEXIST;
        }
    }

    /**
     * Rejects a connection attempt based on the client's address or SSID.
     * @param {boolean} reason_is_ssid If true, the rejection is based on SSID, otherwise on IP address
     * @returns {string} The reason for rejecting the connection
     */
    rejectConnection(reason_is_ssid) {
        var rejectReason;
        if (this.pcservices) {
            rejectReason = this.clientAddress + " is not in the whitelist for PC Services Admin.";
            console.log(" * Request from IP (" + this.clientAddress + ") for PC Services Admin, but that IP is not authorized.");
        } else {
            if (reason_is_ssid) {
                rejectReason = this.wtvclient.ssid + " is not in the whitelist.";
                console.log(" * Request from SSID", this.wtvshared.filterSSID(this.wtvclient.ssid), "(" + this.clientAddress + ") for wtv-admin, but that SSID is not in the admin whitelist.");
            } else {
                rejectReason = this.clientAddress + " is not in the whitelist for SSID " + this.wtvclient.ssid + ".";
                console.log(" * Request from SSID", this.wtvshared.filterSSID(this.wtvclient.ssid), "(" + this.clientAddress + ") for wtv-admin, but that IP is not authorized for that SSID.");
            }
        }
        return rejectReason;
    }

    /**
     * Checks if the provided password matches the service's password.
     * @param {string} password The password to check
     * @returns {boolean} True if the password matches, false otherwise
     */
    checkPassword(password) {
        if (this.pcservices) {
            if (this.minisrv_config.config.pc_admin.password) {
                return (password == this.minisrv_config.config.pc_admin.password);
            } else {
                // no password set
                return true;
            }
        } else {
            if (this.minisrv_config.services[this.service_name].password) {
                return (password == this.minisrv_config.services[this.service_name].password);
            } else {
                // no password set
                return true;
            }
        }
    }

    /**
     * Lists all registered SSIDs.
     * @returns {Array} An array of arrays, each containing the SSID and its associated account information
     */
    listRegisteredSSIDs() {
        var search_dir = this.wtvshared.getAbsolutePath(this.minisrv_config.config.SessionStore + this.path.sep + "accounts");
        var self = this;
        var out = [];
        this.fs.readdirSync(search_dir).forEach(file => {
            if (self.fs.lstatSync(search_dir + self.path.sep + file).isDirectory()) {
                var user = self.getAccountInfoBySSID(file);
                out.push([file, user]);
            }
        });
        return out;
    }

    /**
     * Checks if the current client is authorized to access the service.
     * @param {boolean} justchecking If true, only checks authorization without rejecting the connection
     * @return {boolean} True if authorized, false otherwise
     */
    isAuthorized(justchecking = false) {
        var allowed_ssid = false;
        var allowed_ip = false;
        var use_ssid = (this.wtvclient.ssid && !this.pcservices) ? true : false
        if (use_ssid) {
            if (this.minisrv_config.services[this.service_name].authorized_ssids) {
                var self = this;
                Object.keys(self.minisrv_config.services[this.service_name].authorized_ssids).forEach(function (k) {
                    if (typeof self.minisrv_config.services[self.service_name].authorized_ssids[k] == "string") {
                        var ssid = self.minisrv_config.services[self.service_name].authorized_ssids[k]
                        if (ssid == self.wtvclient.ssid) allowed_ssid = true;
                        allowed_ip = true; // no ip block defined
                    } else {
                        var ssid = k;
                        if (ssid == self.wtvclient.ssid) {
                            allowed_ssid = true;
                            Object.keys(self.minisrv_config.services[self.service_name].authorized_ssids[k]).forEach(function (j) {
                                if (self.wtvshared.isInSubnet(self.clientAddress, self.minisrv_config.services[self.service_name].authorized_ssids[k][j])) {
                                    if (allowed_ip) return;
                                    allowed_ip = true;
                                }
                            });
                        }
                    }
                });
            }
        } else {
            if (this.pcservices) {
                if (!this.minisrv_config.config.pc_admin.enabled) {
                    if (justchecking) return false;
                    else return this.rejectConnection(false);
                }

                if (this.minisrv_config.config.pc_admin.ip_whitelist) {
                    var self = this;
                    Object.keys(this.minisrv_config.config.pc_admin.ip_whitelist).forEach(function (k) {
                        if (allowed_ip) return;
                        allowed_ip = self.wtvshared.isInSubnet(self.clientAddress, self.minisrv_config.config.pc_admin.ip_whitelist[k]);
                    });
                }
            }
            allowed_ssid = true;
        }
        if (justchecking) {
            return (allowed_ssid && allowed_ip) ? true : false;
        } else {
            return (allowed_ssid && allowed_ip) ? true : this.rejectConnection(!allowed_ssid);
        }
    }

    /**
     * Gets the account information for a specific username.
     * @param {string} username The username to get the account information for
     * @param {string|null} directory The directory to search for user accounts, defaults to the session store directory
     * @returns {Object|null} An object containing account information if the username is found, null otherwise
     */
    getAccountInfo(username, directory = null) {
        var search_dir = this.wtvshared.getAbsolutePath(this.minisrv_config.config.SessionStore + this.path.sep + "accounts");
        var account_data = null;
        var self = this;
        if (directory) search_dir = directory;
        this.fs.readdirSync(search_dir).forEach(file => {
            if (self.fs.lstatSync(search_dir + self.path.sep + file).isDirectory() && account_data === null) {
                account_data = self.getAccountInfo(username, search_dir + self.path.sep + file);
            }
            if (account_data !== null) return;
            if (!file.match(/.*\.json/ig)) return;
            try {
                var temp_session_data_file = self.fs.readFileSync(search_dir + self.path.sep + file, 'Utf8');
                var temp_session_data = JSON.parse(temp_session_data_file);

                if (temp_session_data.subscriber_username.toLowerCase() == username.toLowerCase()) {
                    account_data = [temp_session_data, (search_dir + self.path.sep + file).replace(this.wtvshared.getAbsolutePath(this.minisrv_config.config.SessionStore + this.path.sep + "accounts"), "").split(this.path.sep)[1]];
                }
            } catch (e) {
                console.error(" # Error parsing Session Data JSON", search_dir + self.path.sep + file, e);
            }
        });
        if (account_data !== null) {
            if (account_data.ssid) return account_data;
            var account_info = {};
            account_info.ssid = account_data[1];
            account_info.username = account_data[0].subscriber_username;
            account_info.user_id = account_data[0].subscriber_userid;
            var userSession = new this.WTVClientSessionData(this.minisrv_config, account_info.ssid);
            userSession.user_id = 0;
            account_info.account_users = userSession.listPrimaryAccountUsers();
            return account_info;
        }
        return null;
    }

    /**
     * Gets the account information for a specific SSID.
     * @param {string} ssid The SSID to get the account information for
     * @returns {Object|boolean} An object containing account information if the SSID is registered, false otherwise
     */
    getAccountInfoBySSID(ssid) {
        var account_info = {};
        var userSession = new this.WTVClientSessionData(this.minisrv_config, ssid);
        userSession.user_id = 0;
        if (userSession.isRegistered(false)) {
            account_info.ssid = ssid;
            account_info.account_users = userSession.listPrimaryAccountUsers();
            if (account_info.account_users) {
                if (account_info.account_users['subscriber']) {
                    account_info.username = account_info.account_users['subscriber'].subscriber_username;
                } else {
                    account_info.username = account_info.account_users[0];
                }
            } else {
                account_info.username = account_info.account_users[0];
            }

            account_info.user_id = 0;
            return account_info;
        }
        else return false;
    }

    /**
     * Gets the account session data for a specific SSID.
     * @param {string} ssid The SSID to get the account data for
     * @returns {WTVClientSessionData} The session data object for the account
     */
    getAccountBySSID(ssid) {
        var userSession = new this.WTVClientSessionData(this.minisrv_config, ssid);
        userSession.user_id = 0;
        return userSession;
    }

    /**
     * Checks if a specific SSID is banned.
     * @param {string} ssid The SSID to check
     * @returns {boolean} True if the SSID is banned, false otherwise
     */
    isBanned(ssid) {
        var self = this;
        var isBanned = false;
        if (this.minisrv_config.config.ssid_block_list) {
            Object.keys(this.minisrv_config.config.ssid_block_list).forEach(function (k) {
                if (self.minisrv_config.config.ssid_block_list[k] == ssid) {
                    isBanned = true;
                }
            });
        }
        return isBanned;
    }
}

module.exports = WTVAdmin;
