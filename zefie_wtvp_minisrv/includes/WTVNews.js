class WTVNews {

    minisrv_config = null;
    newsie = require('newsie').default;
    service_name = null;
    client = null;

    constructor(minisrv_config, service_name) {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        this.client = new this.newsie({
            host: this.minisrv_config.services[service_name].upstream_address,
            port: this.minisrv_config.services[service_name].upstream_port
        })
    }

    connectUsenet() {
        return new Promise((resolve, reject) => {
            this.client.connect().then((response) => {
                if (response.code == 200) {
                    resolve(true);
                }
            }).catch((e) => {
                console.error(" * WTVNews Error:", "Command: connect", e);
                reject("Could not connect to upstream usenet server");
            });
        }); 
    }

    listGroup(group) {
        return new Promise((resolve, reject) => {
            this.client.listGroup(group).then((data) => {
                resolve(data);
            }).catch((e) => {
                console.error(" * WTVNews Error:", "Command: listGroup", e);
                reject(`No such group <b>${group}</b>`);
            });
        })
    }

    selectGroup(group) {
        return new Promise((resolve, reject) => {
            this.client.group(group).then((response) => {
                if (response.code == 211) resolve(true);
                else reject(`No such group <b>${group}</b>`);
            }).catch((e) => {
                console.error(" * WTVNews Error:", "Command: selectGroup", e);
                reject(`Error selecting group <b>${group}</b>`);
            });
        });
    }

    getArticle(articleID) {
        return new Promise((resolve, reject) => {
            this.client.article(articleID).then((data) => {
                resolve(data)
            }).catch((e) => {
                reject(`Error reading article ID ${articleID}`);
                console.error(" * WTVNews Error:", "Command: article", e);
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

    getHeaderObj(NGArticles) {
        return new Promise((resolve, reject) => {
            var messages = [];
            var failed = false;
            for (var article in NGArticles) {
                if (failed) continue;
                if (article == "getCaseInsensitiveKey") continue;
                this.getHeader(NGArticles[article]).then((data) => {
                    if (data.article) messages.push(data.article)
                }).catch((e) => {
                    console.log(e, article);
                    failed = e;
                });
            }
            if (!failed) resolve(messages);
            else reject("Could not read message list", failed);
        });
    }
}

module.exports = WTVNews;