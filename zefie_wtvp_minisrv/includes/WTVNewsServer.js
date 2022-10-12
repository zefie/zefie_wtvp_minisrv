class WTVNewsServer {
    fs = require('fs');
    path = require('path');
    minisrv_config = null;
    strftime = require('strftime');
    wtvshared = null;
    username = null;
    password = null;
    using_auth = false;
    local_server = null;
    data_path = null;

    constructor(minisrv_config, local_server_port, using_auth = false, username = null, password = null) {
        this.minisrv_config = minisrv_config;
        const { WTVShared } = require("./WTVShared.js");
        this.wtvshared = new WTVShared(minisrv_config);
        const nntp_server = require('nntp-server');
        var nntp_commands = {
            ...nntp_server.commands,
            "LAST": {
                head: 'LAST',
                validate: /^LAST( [^\s]+)$/i,

                // All supported params are defined in separate files
                run() {
                    console.log('hi');
                    throw new Error('method LAST is not implemented');
                }
            },
            "NEXT": {
                head: 'NEXT',
                validate: /^NEXT( [^\s]+)$/i,

                // All supported params are defined in separate files
                run() {
                    console.log('hi');
                    throw new Error('method NEXT is not implemented');
                }
            }
        }

        console.log(nntp_commands);

        this.username == username || null;
        this.password == password || null;
        this.using_auth = using_auth;
        if (using_auth && (!username && !password)) {
            // using auth, but no auth info specified, so randomly generate it
            this.username = this.wtvshared.generatePassword(8);
            this.password = this.wtvshared.generatePassword(16);
        }

        // nntp-server module overrides
        var self = this;

        nntp_server.prototype = {
            ...nntp_server.prototype,
            _authenticate: function (session) {
                // authenticte
                if (session.authinfo_user == self.username && session.authinfo_pass == self.password) return Promise.resolve(true);
                return Promise.resolve(false);
            },

            _selectGroup: function (session, name) {
                // selectGroup
                var res = self.selectGroup(name);
                if (!res.failed) {
                    session.group = res;
                    return true;
                }
                return false;
            },

            _buildHead: function (session, message) {
                var out = "";
                Object.keys(message.headers).forEach((k) => {
                    if (k.length > 0) out += `${k}: ${message.headers[k]}\r\n`;
                });
                out = out.substr(0,out.length - 2);
                return out;
            },

            _buildHeaderField: function (session, message, field) {
                var search = Object.keys(message.headers).find(e => (e.toLowerCase() == field.toLowerCase()));
                if (search) return message.headers[search];
                else return null;
            },

            _getArticle: function (session, message_id) {
                // getArticle
                return new Promise((resolve, reject) => {
                    self.getArticle(session.group.name, message_id).then((res) => {
                        resolve(res);
                    }).catch((e) => {
                        console.log(" * WTVNewsServer Error:", e);
                        reject(e);
                    });
                });
            },

            _buildBody: function (session, message) {
                return message.body;
            },

            _getRange: function (session, first, last) {
                var res = self.listGroup(session.group.name, first, last)
                if (res.failed) return false;
                session.group = res.group_data;
                return res.articleNumbers;
            }

        }

        this.data_path = this.wtvshared.getAbsolutePath(this.minisrv_config.config.SessionStore + '/minisrv_internal_nntp');
        this.createDataStore();

        var tls_path = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + '/wtv-news');
        var tls_options = {
            ca: this.fs.readFileSync(tls_path + this.path.sep + 'localserver_ca.pem'),
            key: this.fs.readFileSync(tls_path + this.path.sep + 'localserver_key.pem'),
            cert: this.fs.readFileSync(tls_path + this.path.sep + 'localserver_cert.pem'),
        }
        this.local_server = new nntp_server({ requireAuth: using_auth, tls: tls_options, secure: true, commands: nntp_commands });
        this.local_server.listen('nntps://localhost:' + local_server_port);
    }

    createDataStore() {
        if (!this.fs.existsSync(this.data_path)) return this.fs.mkdirSync(this.data_path);
        return true;
    }

    getGroupPath(group) {
        return this.data_path + this.path.sep + group;
    }

    getArticlePath(group, article) {
        return this.getGroupPath(group) + this.path.sep + article + ".newz";
    }

    createGroup(group) {
        if (!this.fs.existsSync(getGroupPath(group))) return this.fs.mkdirSync(getGroupPath(group));
        return true;
    }

    getArticle(group, article) {
        return new Promise((resolve, reject) => {
            const g = this.getArticlePath(group, article);
            if (!this.fs.existsSync(g)) return false;
            try {
                var data = JSON.parse(this.fs.readFileSync(g));
                resolve(data);
            } catch (e) {
                console.log(" * WTVNewsServer Error:", e);
                reject(e)
            }
        });
    }

    selectGroup(group) {
        var g = this.getGroupPath(group);
        var out = {
            total: 0,
            min_index: null,
            max_index: 0,
            name: group
        }
        try {
            this.fs.readdirSync(g).forEach(file => {
                var articleNumber = parseInt(file.split('.')[0]);
                if (out.min_index == null) out.min_index = articleNumber;
                else if (articleNumber < out.min_index) out.min_index = articleNumber;

                if (articleNumber > out.max_index) out.max_index = articleNumber;
                out.total++;
            });
        } catch (e) {
            out.failed = e;
        }
        if (out.min_index === null) out.min_index = 0;
        return out;
    }

    listGroup(group, start, end) {
        var g = this.getGroupPath(group);
        var out = {
            total: 0,
            min_index: null,
            max_index: 0,
            name: group
        }
        var articleNumbers = [];
        try {
            this.fs.readdirSync(g).forEach(file => {
                var articleNumber = parseInt(file.split('.')[0]);
                if (articleNumber < start) return;
                if (articleNumber > end) return false;
                if (out.min_index == null) out.min_index = articleNumber;
                else if (articleNumber < out.min_index) out.min_index = articleNumber;

                if (articleNumber > out.max_index) out.max_index = articleNumber;
                articleNumbers.push({ index: articleNumber });
                out.total++;
            });
        } catch (e) {
            console.log(e);
            out.failed = e;
        }
        if (out.min_index === null) out.min_index = 0;
        return {
            articleNumbers: articleNumbers,
            group_data: out
        }
    }
}

module.exports = WTVNewsServer;