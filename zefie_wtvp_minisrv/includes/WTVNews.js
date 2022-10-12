class WTVNews {

    minisrv_config = null;
    newsie = require('newsie').default;
    strftime = require('strftime');
    wtvshared = null;
    service_name = null;
    client = null;
    username = null;
    password = null;

    constructor(minisrv_config, service_name) {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        const { WTVShared } = require("./WTVShared.js");
        this.wtvshared = new WTVShared(minisrv_config);
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

    getArticle(articleID) {
        var articleID = parseInt(articleID);
        return new Promise((resolve, reject) => {
            var promises = [];
            this.client.article(articleID).then((data) => {
                // ask server for next article
                promises.push(new Promise((resolve, reject) => {
                    this.client.next().then((res) => {
                        data.next_article = res.article.articleNumber;
                        resolve(data.next_article);
                    }).catch((e) => {
                        console.log(e);
                        data.next_article = null;
                        resolve(data.next_article);
                    })
                }));

                // ask server for previous article
                promises.push(new Promise((resolve, reject) => {
                    this.client.last().then((res) => {
                        data.prev_article = res.article.articleNumber;
                        // do it again
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
                    }).catch(() => {
                        data.prev_article = null;
                        resolve(data.prev_article);
                    })
                }));

                Promise.all(promises).then(() => {
                    resolve(data);
                });
            }).catch((e) => {
                reject(`Error reading article ID ${articleID}`);
                console.error(" * WTVNews Error:", "Command: article", "args:", articleID, "Error:", e);
            });
        });
    }

    getHeader(articleID) {
        return new Promise((resolve, reject) => {
            this.client.head(articleID).then((data) => {
                resolve(data);
            }).catch((e) => {
                reject(`Error getting header for article ID ${articleID}`);
                console.error(" * WTVNews Error:", "Command: head -", "Article ID: " + articleID, e);
            });
        });
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

    postToGroup(group, from_addr, msg_subject, msg_body, article = null) {
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
                                    reject(e)
                                });
                            }).catch((e) => {
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
                                        'Message-ID': "<" + this.wtvshared.generatePassword(16) + "@" + this.minisrv_config.config.domain_name + ">",
                                        'Date': this.strftime('%A, %d-%b-%y %k:%M:%S %z', new Date())
                                    }
                                    if (messageid) articleData.headers.References = messageid;

                                    if (msg_body) {
                                        articleData.body = msg_body.split("\n");
                                    } else {
                                        articleData.body = [];
                                    }
                                    response.send(articleData).then((response) => {
                                        this.client.quit();
                                        if (response.code !== 240) {
                                            reject("Could not send post. Server returned error " + response.code);
                                        } else {
                                            resolve(true);
                                        }
                                    }).catch((e) => {
                                        this.client.quit();
                                        reject("Could not send post. Server returned error " + response.code);
                                    });
                                }
                                else {
                                    this.client.quit();
                                    console.log('usenet upstream uncaught error', e);
                                    reject("Could not send post. Server returned unknown error");
                                };
                            }).catch((e) => {
                                console.log('could not connect to server', e);
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
                    relations.push({ "article": article, "relation": message_id_roots[k].messageId, "date": article_date })
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