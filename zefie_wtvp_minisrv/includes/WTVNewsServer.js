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
        var nntp_statuses = require('nntp-server/lib/status');

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
                // authenticate
                if (session.authinfo_user == self.username && session.authinfo_pass == self.password) {
                    session.posting_allowed = true;
                    return Promise.resolve(true);
                }
                return Promise.resolve(false);
            },
            _postArticle: function (session) {
                try {
                    session.group.name = self.getHeader(session.post_data, "newsgroups");
                    if (session.group.name.indexOf(',') >= 0) return false; // cross post not implemented
                    return self.postArticle(session.group.name, session.post_data)
                } catch (e) {
                    console.log(e)
                    return false;
                }
            },
            _getLast: function (session) {
                if (!session.group.name) return nntp_statuses._412_GRP_NOT_SLCTD;
                if (!session.group.current_article) return nntp_statuses._420_ARTICLE_NOT_SLCTD;
                if (!self.articleExists(session.group.name, session.group.current_article)) return nntp_statuses._420_ARTICLE_NOT_SLCTD;
                var res = self.getLastArticle(session.group.name, session.group.current_article);
                if (!res) return nntp_statuses._422_NO_LAST_ARTICLE;
                return res;
            },

            _getNext: function (session) {
                if (!session.group.name) return nntp_statuses._412_GRP_NOT_SLCTD;
                if (!session.group.current_article) return nntp_statuses._420_ARTICLE_NOT_SLCTD;
                if (!self.articleExists(session.group.name, session.group.current_article)) return nntp_statuses._420_ARTICLE_NOT_SLCTD;
                var res = self.getNextArticle(session.group.name, session.group.current_article);
                if (!res) return nntp_statuses._421_NO_NEXT_ARTICLE;
                return res;
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
                var search = self.getHeader(message, field);
                if (search) return message.headers[search];
                else return null;
            },

            _getArticle: function (session, message_id) {
                // getArticle
                return new Promise((resolve, reject) => {
                    var res = self.getArticle(session.group.name, message_id);
                    if (!res.messageId) reject(res);
                    else resolve(res)
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
        this.local_server = new nntp_server({ requireAuth: using_auth, tls: tls_options, secure: true, allow_posting: true });
        this.local_server.listen('nntps://localhost:' + local_server_port);
    }

    getHeader(message, header) {
        var search = Object.keys(message.headers).find(e => (e.toLowerCase() == header.toLowerCase()));
        if (search) return message.headers[search];
        return null;
    }

    createDataStore() {
        if (!this.fs.existsSync(this.data_path)) return this.fs.mkdirSync(this.data_path);
        return true;
    }

    getNextAvailableArticleID(group) {
        return this.selectGroup(group).max_index + 1;
    }

    postArticle(group, post_data) {
        var articleNumber = this.getNextAvailableArticleID(group);
        if (!articleNumber) return false;
        try {
            post_data.articleNumber = articleNumber;
            post_data.messageId = this.getHeader(post_data, "message-id");
            //Tue, 11 Oct 2022 17:25:16 -0400
            post_data.headers.date = this.strftime("%a, %-d %b %Y %H:%M:%S %z", Date.parse(post_data.headers.date))
            post_data.headers['INJECTION-DATE'] = this.strftime("%a, %-d %b %Y %H:%M:%S %z", Date.parse(Date.now()))
            if (this.articleExists(group, articleNumber)) return false // should not occur, but just in case
            return this.createArticle(group, articleNumber, post_data);
        } catch (e) {
            console.error(" * WTVNewsServer Error: postArticle: ", e);
        }
        return false;
    }

    createArticle(group, articleNumber, article) {
        var g = this.getGroupPath(group);
        var file = g + this.path.sep + articleNumber + ".newz";
        try {
            this.fs.writeFileSync(file, JSON.stringify(article));
            return true;
        } catch (e) {
            console.error(" * WTVNewsServer Error: createArticle: ", e);
            return false;
        }
    }

    getGroupPath(group) {
        return this.data_path + this.path.sep + group;
    }

    getArticlePath(group, article) {
        return this.getGroupPath(group) + this.path.sep + article + ".newz";
    }

    articleExists(group, article) {
        const g = this.getArticlePath(group, article);
        if (this.fs.existsSync(g)) return true;
        return false;
    }

    createGroup(group) {
        var g = this.getGroupPath(group);
        if (!this.fs.existsSync(g)) return this.fs.mkdirSync(g);
        return true;
    }

    getArticle(group, article) {
        const g = this.getArticlePath(group, article);
        if (!this.fs.existsSync(g)) return false;
        try {
            var data = JSON.parse(this.fs.readFileSync(g));
            data.index = data.articleNumber;
            return data
        } catch (e) {
            console.error(" * WTVNewsServer Error: getArticle: ", e);
        }
        return null;
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

    getLastArticle(group, current) {
        var g = this.getGroupPath(group);
        var res = null;
        try {
            var articleNumbers = [];
            this.fs.readdirSync(g).forEach(file => {
                var articleNumber = parseInt(file.split('.')[0]);
                articleNumbers.push(articleNumber);
            });
            articleNumbers.sort((a, b) => a - b)
            var index = articleNumbers.findIndex((e) => e == current) - 1;
            if (index >= 0) res = articleNumbers[index];
        } catch (e) {
            return e;
        }
        if (res) {
            if (res == current) return null;
            var message = this.getArticle(group, res);
            if (message.messageId) {
                res = { "articleNumber": res, "message_id": message.messageId };
            }
        }
        return res;
    }

    getNextArticle(group, current) {
        var g = this.getGroupPath(group);
        var res = null;
        try {
            var articleNumbers = [];
            this.fs.readdirSync(g).forEach(file => {
                var articleNumber = parseInt(file.split('.')[0]);
                articleNumbers.push(articleNumber);
            });
            articleNumbers.sort((a, b) => a - b)
            var index = articleNumbers.findIndex((e) => e == current) + 1;
            if (index < articleNumbers.length) res = articleNumbers[index];
        } catch (e) {
            return e;
        }
        if (res) {
            var message = this.getArticle(group, res);
            if (message.messageId) {
                res = { "articleNumber": res, "message_id": message.messageId };
            }
        }
        return res;
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
            out.failed = e;
        }
        articleNumbers.sort((a, b) => a.index - b.index)
        if (out.min_index === null) out.min_index = 0;
        return {
            articleNumbers: articleNumbers,
            group_data: out
        }
    }
}

module.exports = WTVNewsServer;