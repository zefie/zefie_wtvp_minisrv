class WTVNews {

    minisrv_config = null;
    newsie = require('newsie').default;
    strftime = require('strftime');
    wtvshared = null;
    service_name = null;
    client = null;
    username = null;
    password = null;
    posting_allowed = true;
    debug = null;

    constructor(minisrv_config, service_name) {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        const { WTVShared } = require("./WTVShared.js");
        this.wtvshared = new WTVShared(minisrv_config);
        this.debug = require('debug')('WTVNews');
    }

    initializeUsenet(host, port = 119, tls_options = null, username = null, password = null) {
        // use local self-signed cert for local server
        var newsie_options = {
            host: host,
            port: port,
            tlsPort: (tls_options !== null) ? true : false,            
        }
        if (newsie_options.tlsPort) newsie_options.tlsOptions = tls_options;
        this.client = new this.newsie(newsie_options);
        if (username && password) {
            this.username = username;
            this.password = password;
        }
    }

    connectUsenet() {
        return new Promise((resolve, reject) => {
            this.client.connect().then((response) => {
                if (response.code == 200 || response.code == 201) {
                    if (response.code == 201) this.posting_allowed = false;
                    if (this.username && this.password) {
                        this.client.authInfoUser(this.username).then((res) => {
                            if (res.code == "381") {
                                res.authInfoPass(this.password).then((res) => {
                                    if (res.code == 281) resolve(true);
                                    else reject(res.description);
                                }).catch((e) => {
                                    console.error(" * WTVNews Error:", "Command: connect", e);
                                    reject("Could not connect to upstream usenet server");
                                });
                            } else {
                                reject(res.description)
                            }
                        }).catch((e) => {
                            console.error(" * WTVNews Error:", "Command: connect", e);
                            reject("Could not connect to upstream usenet server");
                        });
                    } else {
                        resolve(true);
                    }
                }
            }).catch((e) => {
                console.error(" * WTVNews Error:", "Command: connect", e);
                reject("Could not connect to upstream usenet server");
            });
        }); 
    }

    listGroup(group, page = 0, limit = 100, raw_range = null) {
        // list of articles from group
        return new Promise((resolve, reject) => {
            this.selectGroup(group).then((res) => {
                if (!raw_range) {
                    var range = {
                        start: (limit * page) + res.group.low,
                    }
                    range.end = range.start + limit;
                    if (page) range.start++;
                    if (range.end > res.high) delete range.group.end;
                } else {
                    range = raw_range;
                }
                this.client.listGroup(group, range).then((data) => {
                    resolve(data);
                }).catch((e) => {
                    console.error(" * WTVNews Error:", "Command: listGroup", e);
                    reject(`No such group <b>${group}</b>`);
                });
            }).catch((e) => {
                console.error(" * WTVNews Error:", "Command: selectGroup", e);
            });
        })
    }

    processGroupList(list) {
        if (list) return list.newsgroups;
        else return null;
    }

    listGroups(search = null) {
        // list of groups on the server
        return new Promise((resolve, reject) => {
            if (!search) {
                this.client.list().then((data) => {
                    this.debug('listGroups data', data)
                    resolve(this.processGroupList(data));
                }).catch((e) => {
                    console.error(" * WTVNews Error:", "Command: listGroups (all)", e);
                    reject(e);
                });
            } else {
                this.client.listNewsgroups((search === '*') ? '*' : '*' + search + '*').then((data) => {
                    resolve(this.processGroupList(data));
                }).catch((e) => {
                    console.error(" * WTVNews Error:", "Command: listGroups (search)", search, e);
                    reject(e);
                });
            }
        })
    }

    selectGroup(group) {
        return new Promise((resolve, reject) => {
            this.client.group(group).then((response) => {
                if (response.code == 211) resolve(response);
                else reject(`No such group <b>${group}</b>`);
            }).catch((e) => {
                console.error(" * WTVNews Error:", "Command: selectGroup", e);
                reject(`Error selecting group <b>${group}</b>`);
            });
        });
    }

    getArticle(articleID, get_next_last = true) {
        var articleID = parseInt(articleID);
        return new Promise((resolve, reject) => {
            var promises = [];
            this.client.article(articleID).then((data) => {
                if (get_next_last) {
                    // ask server for next article
                    promises.push(new Promise((resolve, reject) => {
                        this.client.next().then((res) => {
                            data.next_article = res.article.articleNumber;
                            resolve(data.next_article);
                        }).catch((e) => {
                            data.next_article = null;
                            resolve(data.next_article);
                        })
                    }));

                    // ask server for previous article
                    promises.push(new Promise((resolve, reject) => {
                        this.client.last().then((res) => {
                            data.prev_article = res.article.articleNumber;
                            if (data.prev_article === articleID) {
                                // do it again, needed this for CodoSoft NNTPd?
                                this.client.article(data.prev_article).then(() => {
                                    this.client.last().then((res) => {
                                        data.prev_article = res.article.articleNumber;
                                        resolve(data.prev_article);
                                    }).catch(() => {
                                        data.prev_article = null;
                                        resolve(data.prev_article);
                                    });
                                }).catch(() => {
                                    data.prev_article = null;
                                    resolve(data.prev_article);
                                });
                            } else {
                                resolve(data.prev_article);
                            }
                        }).catch(() => {
                            data.prev_article = null;
                            resolve(data.prev_article);
                        })
                    }));

                    Promise.all(promises).then(() => {
                        var self = this;
                        if (data.article.headers) Object.keys(data.article.headers).forEach((k) => {
                            data.article.headers[k] = self.decodeCharset(data.article.headers[k])
                        });
                        resolve(data);
                    });
                } else {
                    var self = this;
                    if (data.article.headers) Object.keys(data.article.headers).forEach((k) => {
                        data.article.headers[k] = self.decodeCharset(data.article.headers[k])
                    });
                    resolve(data);
                }
            }).catch((e) => {
                reject(`Error reading article ID ${articleID}`);
                console.error(" * WTVNews Error:", "Command: article", "args:", articleID, "Error:", e);
            });
        });
    }

    decodeCharset(string) {
        var regex = /=\?{1}(.+)\?{1}([B|Q])\?{1}(.+)\?{1}=/;
        var decoded = null;
        var check = string.match(regex);
        if (check) {
            var match = check[0];
            var charset = check[1];
            var encoding = check[2];
            var encoded_text = check[3];
            switch (encoding) {
                case "B":
                    var buffer = new Buffer.from(encoded_text, 'base64')
                    decoded = buffer.toString(charset).replace(/[^\x00-\x7F]/g, "");;
                    break;

                case "Q":
                    // unimplemented
                    return string;
            }
            if (decoded) return string.replace(match, decoded);
        }
        return string;
    }

    getHeader(articleID) {
        return new Promise((resolve, reject) => {
            this.client.head(articleID).then((data) => {
                var self = this;
                if (data.article.headers) Object.keys(data.article.headers).forEach((k) => {
                    data.article.headers[k] = self.decodeCharset(data.article.headers[k])
                });
                resolve(data);
            }).catch((e) => {
                reject(`Error getting header for article ID ${articleID}`);
                console.error(" * WTVNews Error:", "Command: head -", "Article ID: " + articleID, e);
            });
        });
    }

    getHeaderFromMessage(message, header) {
        var response = null;
        if (message.article.headers) {
            Object.keys(message.article.headers).forEach((k) => {
                if (k.toLowerCase() == header.toLowerCase()) {
                    response = message.article.headers[k];
                    return false;
                }
            })
        }
        return response;
    }

    quitUsenet() {
        return new Promise((resolve, reject) => {
            this.client.quit().then((response) => {
                if (response.code == 205) resolve(true);
                else {
                    console.error(" * WTVNews Error:", "Command: quit", e);
                    reject(`Unexpected response code ${response.code}`);
                }
            }).catch((e) => {
                console.error(" * WTVNews Error:", "Command: quit", e);
                reject("Error quitting usenet session");
            })
        });
    }

    postToGroup(group, from_addr, msg_subject, msg_body, article = null, headers = null) {
        return new Promise((resolve, reject) => {
            var promises = [];
            var messageid = null;
            this.connectUsenet()
                .then(() => {
                    if (article) {
                        promises.push(new Promise((resolve, reject) => {
                            this.selectGroup(group).then((res) => {
                                this.getArticleMessageID(article).then((data) => {
                                    messageid = data;
                                    resolve(data);
                                }).catch((e) => {
                                    console.error('Error getting articleID',article, e)
                                    reject(e)
                                });
                            }).catch((e) => {
                                console.error('Error selecting group', e)
                                reject(e)
                            });
                        }));
                    }
                    Promise.all(promises).then(() => {
                        this.client.post()
                            .then((response) => {
                                if (response.code == 340) {
                                    var articleData = {};
                                    articleData.headers = {
                                        'Relay-Version': "version zefie_wtvp_minisrv " + this.minisrv_config.version + "; site " + this.minisrv_config.config.domain_name,
                                        'Posting-Version': "version zefie_wtvp_minisrv " + this.minisrv_config.version + "; site " + this.minisrv_config.config.domain_name,
                                        'Path': "@" + this.minisrv_config.config.domain_name,
                                        'From': from_addr,
                                        'Newsgroups': group,
                                        'Subject': msg_subject || "(No subject)",
                                        'Message-ID': "<" + this.wtvshared.generateString(16) + "@" + this.minisrv_config.config.domain_name + ">",
                                        'Date': this.strftime('%a, %-d %b %Y %H:%M:%S %z', new Date())
                                    }
                                    if (headers) {
                                        Object.keys(headers).forEach((k) => {
                                            articleData.headers[k] = headers[k];
                                        });
                                    }
                                    if (messageid) {
                                        articleData.headers.References = messageid;
                                        articleData.headers['In-Reply-To'] = messageid;
                                    }
                                    if (msg_body) articleData.body = msg_body.split("\n");
                                    else articleData.body = [];

                                    response.send(articleData).then((response) => {
                                        this.client.quit();
                                        if (response.code !== 240) {
                                            reject("Could not send post. Server returned error " + response.code);
                                        } else {
                                            resolve(true);
                                        }
                                    }).catch((e) => {
                                        console.error(e);
                                        this.client.quit();
                                        reject("Could not send post. Server returned error " + response.code);
                                    });
                                } else {
                                    this.client.quit();
                                    console.error('usenet upstream uncaught error', e);
                                    reject("Could not send post. Server returned unknown error");
                                };
                            }).catch((e) => {
                                console.error('could not connect to server', e);
                                reject("could not connect to server");
                            });
                    });
                });
        });
    }

    getArticleMessageID(articleID) {
        return new Promise((resolve, reject) => {
            this.client.article(articleID).then((data) => {
                resolve(data.article.messageId);
            }).catch((e) => {
                console.error("error getting messageID from article", articleID, e)
                reject(e);
            });
        });
    }

    getHeaderObj(NGArticles) {
        return new Promise((resolve, reject) => {
            var messages = [];
            var promises = [];
            for (var article in NGArticles) {
                if (article == "getCaseInsensitiveKey") continue;
                promises.push(new Promise((resolve, reject) => {
                    this.getHeader(NGArticles[article]).then((data) => {
                        if (data.article) messages.push(data.article)
                        resolve();
                    }).catch((e) => {
                        reject(e);
                    });
                }));
            }
            if (promises.length > 0) {
                Promise.all(promises).then(() => {
                    if (messages.length > 0) resolve(messages);
                }).catch((e) => {
                    reject("Could not read message list", e);
                });
            } else {
                resolve(messages);
            }
        });
    }    


    parseAttachments(message) {
        var contype = this.getHeaderFromMessage(message, 'Content-Type');
        if (contype) {
            var regex = /multipart\/mixed\; boundary=\"(.+)\"/i;
            var match = contype.match(regex);
            if (match) {
                var boundary = "--" + match[1];
                var body = message.article.body.join("\n").split(boundary);
                var attachments = [];
                var i = 0;
                var message_body = '';
                var message_type = 'text/plain';
                body.forEach((element) => {
                    var section_type = null;
                    var section = element.split("\n");
                    attachments[i] = {};
                    section.forEach((line) => {
                        this.debug('section_type', section_type, 'line', line);
                        var section_header_match = line.match(/^Content\-/i)
                        if (section_header_match) {
                            var section_match = line.match(/^Content\-Type\: (.+)\;/i)
                            if (section_match) {
                                this.debug('section_match', section_match)
                                section_type = section_match[1];
                                if (section_match[1].match("text/plain")) {
                                    message_type = section_type;
                                } else {
                                    section_type = section_match[1];
                                    attachments[i].content_type = section_match[1]
                                }
                                this.debug('section_type', section_type)
                            }
                            section_match = line.match(/^Content\-Disposition\: (.+)\;/i)
                            if (section_match) {
                                section_match = line.match(/^Content\-Disposition\: (.+)\; filename=\"(.+)\"/i)
                                if (section_match) attachments[i].filename = section_match[2];
                            }
                            section_match = line.match(/^Content-Transfer-Encoding: (.+)/i)
                            if (section_match) attachments[i].content_encoding = section_match[1];
                        } else {
                            if (section_type != null) {
                                if (section_type.match("text/plain")) message_body += line;
                                else {
                                    if (attachments[i].data) attachments[i].data += line;
                                    else attachments[i].data = line;
                                }
                            }
                        }
                    })
                    if (attachments[i].content_type) i++;
                })
                attachments.pop();
                return {
                    text: message_body,
                    text_type: message_type || "text/plain",
                    attachments: attachments
                }
            } else {
                var message_body = '';
                if (message.article.body) message_body = message.article.body.join("\n")

                return { text: message_body }
            }
        } else {
            var message_body = '';
            if (message.article.body) message_body = message.article.body.join("\n")
            
            return { text: message_body }
        }

    }

    sortByResponse(messages) {
        var sorted = [];
        var message_id_roots = [];
        var message_relations = [];
        Object.keys(messages).forEach((k) => {
            var messageId = messages[k].messageId;
            var ref = messages[k].headers.REFERENCES;
            if (ref) {
                var res = message_id_roots.find(e => e.messageId == ref);
                if (res) {
                    // see if its attached to a root post
                    if (message_relations[res.messageId]) message_relations[res.messageId].push({ "messageId": messageId, "index": k });
                    else message_relations[res.messageId] = [{ "messageId": messageId, "index": k }];
                } else {
                    // see if its related to a relation
                    if (Object.keys(message_relations).length > 0) {
                        var found = false;
                        Object.keys(message_relations).forEach((j) => {
                            if (message_relations[j].length > 0) {
                                Object.keys(message_relations[j]).forEach((h) => {
                                    if (found) return;
                                    if (message_relations[j][h].messageId == ref) {
                                        var searchref = messages[message_relations[j][h].index].headers.REFERENCES || null;
                                        var mainref = null;
                                        while (searchref !== null) {
                                            var searchart = messages.find(e => e.messageId == searchref);
                                            var searchref = searchart.headers.REFERENCES || null;
                                        }
                                        mainref = searchart.messageId;
                                        message_relations[mainref].push({ "messageId": messageId, "index": k });
                                        found = true;
                                    } else {
                                        // no relation, missing reference, add as root
                                        message_id_roots.push({ "messageId": messageId, "index": k });
                                    }
                                });
                            }
                        })
                    } else {
                        message_id_roots.push({ "messageId": messageId, "index": k });
                    }
                }
            }
            else {
                message_id_roots.push({ "messageId": messageId, "index": k });
            }
        });

        // sort the relations, putting root articles first, followed by their relations
        var message_roots_sorted = [];
        Object.keys(message_id_roots).forEach((k) => {
            // sort relations by date
            var article = messages[message_id_roots[k].index];
            var article_date = Date.parse(article.headers.DATE);
            message_roots_sorted.push({ "article": article, "relation": null, "date": article_date });
        });
        message_roots_sorted.sort((a, b) => { return (a.date - b.date) });
        Object.keys(message_roots_sorted).forEach((k) => {
            sorted.push(message_roots_sorted[k]);

            if (message_relations[message_id_roots[k].messageId]) {
                var relations = [];
                Object.keys(message_relations[message_id_roots[k].messageId]).forEach((j) => {
                    // sort relations by date
                    var article = messages[message_relations[message_id_roots[k].messageId][j].index];
                    var article_date = Date.parse(article.headers.DATE);
                    relations.push({ "article": article, "relation": message_id_roots[k].messageId || null, "date": article_date })
                });
                relations.sort((a, b) => { return (a.date - b.date) });
                Object.keys(relations).forEach((j) => {
                    sorted.push(relations[j]);
                });
            }
        })
        return sorted;
    }

}

module.exports = WTVNews;