class WTVAdmin {

    fs = require('fs');
    path = require('path');
    minisrv_config = [];
    wtvr = null;
    wtvshared = null;
    wtvclient = null;
    WTVClientSessionData = require('./WTVClientSessionData.js');
    service_name = "wtv-admin";

    constructor(minisrv_config, wtvclient, service_name) {
        this.minisrv_config = minisrv_config;
        var { WTVShared } = require('./WTVShared.js');
        var WTVRegister = require('./WTVRegister.js');
        this.wtvclient = wtvclient;
        this.wtvshared = new WTVShared(minisrv_config);
        this.wtvr = new WTVRegister(minisrv_config);
        this.clientAddress = wtvclient.getClientAddress();
        this.service_name = service_name;
    }


    ip2long(ip) {
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
    }

    isInSubnet(ip, subnet) {
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
    }

    rejectConnection(reason_is_ssid) {
        var rejectReason;
        if (reason_is_ssid) {
            rejectReason = this.wtvclient.ssid + " is not in the whitelist.";
            console.log(" * Request from SSID", this.wtvshared.filterSSID(this.wtvclient.ssid), "(" + this.clientAddress + ") for wtv-admin, but that SSID is not in the admin whitelist.");
        } else {
            rejectReason = this.clientAddress + " is not in the whitelist for SSID " + this.wtvclient.ssid + ".";
            console.log(" * Request from SSID", this.wtvshared.filterSSID(this.wtvclient.ssid), "(" + this.clientAddress + ") for wtv-admin, but that IP is not authorized for that SSID.");
        }
        return rejectReason;
    }

    checkPassword(password) {
        if (this.minisrv_config.services[this.service_name].password) {
            return (password == this.minisrv_config.services[this.service_name].password);
        } else {
            // no password set
            return true;
        }
    }   

    isAuthorized() {
        var allowed_ssid = false;
        var allowed_ip = false;
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
                            if (self.isInSubnet(self.clientAddress, self.minisrv_config.services[self.service_name].authorized_ssids[k][j])) {
                                allowed_ip = true;
                            }
                        });
                    }
                }
            });
        }
        return (allowed_ssid && allowed_ip) ? true : this.rejectConnection(!allowed_ssid);
    }

    getAccountInfo(username, directory = null) {
        var search_dir = this.minisrv_config.config.SessionStore;
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
                    account_data = [temp_session_data, (search_dir + self.path.sep + file).replace(this.minisrv_config.config.SessionStore + this.path.sep, "").split(this.path.sep)[0]];
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

    getAccountInfoBySSID(ssid) {
        var account_info = {};
        var userSession = new this.WTVClientSessionData(this.minisrv_config, ssid);
        userSession.user_id = 0;
        if (userSession.isRegistered(false)) {
            account_info.ssid = ssid;
            account_info.account_users = userSession.listPrimaryAccountUsers();
            account_info.username = account_info.account_users['subscriber'].subscriber_username;
            account_info.user_id = 0;
            return account_info;
        }
        else return false;
    }


    getAccountBySSID(ssid) {
        var userSession = new this.WTVClientSessionData(this.minisrv_config, ssid);
        userSession.user_id = 0;
        return userSession;
    }

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
