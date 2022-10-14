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
    featuredGroups = null

    constructor(minisrv_config, local_server_port, using_auth = false, username = null, password = null, run_server = true) {
        this.minisrv_config = minisrv_config;
        const { WTVShared } = require("./WTVShared.js");
        this.wtvshared = new WTVShared(minisrv_config);
        this.featuredGroups = minisrv_config.services['wtv-news'].featuredGroups;
        const nntp_server = require('nntp-server');
        var nntp_statuses = require('nntp-server/lib/status');

        this.username = username || null;
        this.password = password || null;
        this.using_auth = using_auth;
        this.data_path = this.wtvshared.getAbsolutePath(this.minisrv_config.config.SessionStore + '/minisrv_internal_nntp');
        this.createDataStore();

        if (using_auth && (!username && !password)) {
            // using auth, but no auth info specified, so randomly generate it
            this.username = this.wtvshared.generateString(8);
            this.password = this.wtvshared.generatePassword(16);
        }

        if (run_server) {
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
                        console.error(e)
                        return false;
                    }
                },

                _getGroups: function (session, time = 0, wildmat = null) {
                    if (time > 0) return false // unimplemented
                    return self.getGroups(wildmat);
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
                    out = out.substr(0, out.length - 2);
                    return out;
                },

                _buildHeaderField: function (session, message, field) {
                    if (field.indexOf(':') > 0) field = field.replace(/\:/g, '');
                    var search = self.getHeader(message, field);
                    if (search) return search;
                    else return null;
                },

                _getOverviewFmt: function (session) {
                    var headers = [
                        "Subject:",
                        "From:",
                        "Date:",
                        "Message-ID:",
                        "References:",
                        ":bytes",
                        ":lines"
                    ]
                    return headers;
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
                    return res.articles;
                }

            }

            var tls_path = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + '/wtv-news');
            var tls_options = {
                ca: this.fs.readFileSync(tls_path + this.path.sep + 'localserver_ca.pem'),
                key: this.fs.readFileSync(tls_path + this.path.sep + 'localserver_key.pem'),
                cert: this.fs.readFileSync(tls_path + this.path.sep + 'localserver_cert.pem'),
            }
            this.local_server = new nntp_server({ requireAuth: using_auth, tls: tls_options, secure: true, allow_posting: true });
            this.local_server.listen('nntps://localhost:' + local_server_port);
        }
    }

    getMetaFilename(group) {
        var g = this.getGroupPath(group);
        if (g) return g + this.path.sep + "meta.json";
        else return null;
    }

    getHeader(message, header) {
        if (message.headers) {
            var search = Object.keys(message.headers).find(e => (e.toLowerCase() == header.toLowerCase()));
            if (search) return message.headers[search];
        }
        return null;
    }

    createDataStore() {
        if (!this.fs.existsSync(this.data_path)) return this.fs.mkdirSync(this.data_path);
        return true;
    }


    createMetaFile(group, description = null) {
        const g = this.getMetaFilename(group);
        if (this.fs.existsSync(g)) return false;
        var metadata = {};
        metadata.group = group;
        metadata.last_article_id = this.selectGroup(group).max_index;
        if (description) metadata.description = description;
        this.saveMetadata(group, metadata, true);
        return metadata;
    }

    saveMetadata(group, metadata, creating = false) {
        const g = this.getMetaFilename(group);
        if (g) {
            if (!this.fs.existsSync(g) && !creating) this.createMetaFile(group);
            else this.fs.writeFileSync(g, JSON.stringify(metadata));
        } else return false;
    }

    getMetadata(group) {
        const g = this.getMetaFilename(group);
        if (g) {
            if (this.fs.existsSync(g)) return JSON.parse(this.fs.readFileSync(g));
            else return this.createMetaFile(group);
        } else return false;
    }

    incrementArticleIdMeta(group) {
        var metadata = this.getMetadata(group);
        metadata.last_article_id = metadata.last_article_id + 1;
        this.saveMetadata(group, metadata)
    }

    findHeaderCaseInsensitive(headers, header) {
        // returns the key with the found case
        var response = null;
        if (headers) {
            Object.keys(headers).forEach((k) => {
                if (k.toLowerCase() == header.toLowerCase()) {
                    response = k;
                    return false;
                }
            })
        }
        return response;
    }

    postArticle(group, post_data) {
        var articleNumber = this.getMetadata(group).last_article_id + 1;
        if (!articleNumber) return false;
        try {
            post_data.articleNumber = articleNumber;
            post_data.messageId = this.getHeader(post_data, "message-id");
            if (!post_data.messageId) {
                var messageId = "<" + this.wtvshared.generateString(16) + "@" + this.minisrv_config.config.domain_name + ">";
                post_data.messageId = post_data.headers['Message-ID'] = messageId;
            }

            if (!post_data.headers.Path) post_data.headers.Path = "@" + this.minisrv_config.config.domain_name;
            if (!post_data.headers.Subject) post_data.headers.Subject = "(No subject)";

            post_data.headers.Date = this.strftime("%a, %-d %b %Y %H:%M:%S %z", Date.parse(post_data.headers.date))

            // server added Injection-Date
            post_data.headers['Injection-Date'] = this.strftime("%a, %-d %b %Y %H:%M:%S %z", Date.parse(Date.now()))

            // Reorder headers per examples in RFC3977 sect 6.2.1.3, not sure if needed
            post_data.headers = this.wtvshared.moveObjectElement('Path', null, post_data.headers, true);
            post_data.headers = this.wtvshared.moveObjectElement('From', 'Path', post_data.headers, true);
            post_data.headers = this.wtvshared.moveObjectElement('Newsgroups', 'From', post_data.headers, true);
            post_data.headers = this.wtvshared.moveObjectElement('Subject', 'Newsgroups', post_data.headers, true);
            post_data.headers = this.wtvshared.moveObjectElement('Date', 'Subject', post_data.headers, true);
            post_data.headers = this.wtvshared.moveObjectElement('Organization', 'Date', post_data.headers, true);
            post_data.headers = this.wtvshared.moveObjectElement('Message-ID', 'Organization', post_data.headers, true);
            // end reordering of headers

            if (this.articleExists(group, post_data.articleNumber)) return false // should not occur, but just in case
            return this.createArticle(group, post_data.articleNumber, post_data);
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
            this.incrementArticleIdMeta(group);
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

    createGroup(group, description = null) {
        var g = this.getGroupPath(group);
        if (!this.fs.existsSync(g)) {
            this.fs.mkdirSync(g);
            this.createMetaFile(group, description)
            return this.fs.existsSync(g);
        }
        return false
    }

    getArticle(group, article) {
        const g = this.getArticlePath(group, article);
        if (!this.fs.existsSync(g)) return false;
        try {
            var data = JSON.parse(this.fs.readFileSync(g));
            if (data.article) data = data.article;
            data.index = data.articleNumber;
            if (!data.body) data.body = [''];
            if (!this.findHeaderCaseInsensitive(data.headers,'subject')) data.headers.Subject = "(No subject)";
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
        if (this.featuredGroups) {
            Object.keys(this.featuredGroups).forEach((k) => {
                if (group == this.featuredGroups[k].group) {
                    out.wildmat = 'y';
                    return false;
                }
            })
        }
        try {
            this.fs.readdirSync(g).forEach(file => {
                if (file == "meta.json") return;
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

    getGroups(wildmat = null) {
        var groups = [];
        this.fs.readdirSync(this.data_path).forEach(file => {
            if (this.fs.lstatSync(this.data_path + this.path.sep + file).isDirectory()) {
                if (wildmat) {
                    if (file.match(wildmat)) groups.push(this.selectGroup(file));
                } else groups.push(this.selectGroup(file));
            }
        });
        return groups;
    }

    getLastArticle(group, current) {
        var g = this.getGroupPath(group);
        var res = null;
        try {
            var articleNumbers = [];
            this.fs.readdirSync(g).forEach(file => {
                if (file == "meta.json") return;
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
                if (file == "meta.json") return;
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
        var articles = [];
        try {
            this.fs.readdirSync(g).forEach(file => {
                if (file == "meta.json") return;
                var articleNumber = parseInt(file.split('.')[0]);
                if (articleNumber < start) return;
                if (articleNumber > end) return false;
                if (out.min_index == null) out.min_index = articleNumber;
                else if (articleNumber < out.min_index) out.min_index = articleNumber;

                if (articleNumber > out.max_index) out.max_index = articleNumber;
                articles.push(this.getArticle(group, articleNumber));
                out.total++;
            });
        } catch (e) {
            console.error(" * WTVNewsServer Error: listGroup: ", e);
            out.failed = e;
        }
        articles.sort((a, b) => a.index - b.index)
        if (out.min_index === null) out.min_index = 0;
        return {
            articles: articles,
            group_data: out
        }
    }
}

module.exports = WTVNewsServer;