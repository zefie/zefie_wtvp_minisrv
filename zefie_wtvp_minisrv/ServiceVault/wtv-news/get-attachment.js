var minisrv_service_file = true;

var request_is_async = true;
var errpage = null;
var group = request_headers.query.group;
var article = request_headers.query.article;
var attachment_id = parseInt(request_headers.query.attachment_id);
if ((!attachment_id && attachment_id != 0) || !group || !article) {
    errpage = wtvshared.doErrorPage(400, "Attachment ID required.");
    sendToClient(socket, errpage[0], errpage[1]);
} else {
    const wtvnews = new WTVNews(minisrv_config, service_name);
    var service_config = minisrv_config.services[service_name];
    if (service_config.local_nntp_port && wtvnewsserver) {
        var tls_path = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + '/wtv-news');
        var tls_options = {
            ca: this.fs.readFileSync(tls_path + '/localserver_ca.pem'),
            key: this.fs.readFileSync(tls_path + '/localserver_key.pem'),
            cert: this.fs.readFileSync(tls_path + '/localserver_cert.pem'),
            checkServerIdentity: () => { return null; }
        }
        if (wtvnewsserver.username)
            wtvnews.initializeUsenet("127.0.0.1", service_config.local_nntp_port, tls_options, wtvnewsserver.username, wtvnewsserver.password);
        else
            wtvnews.initializeUsenet("127.0.0.1", service_config.local_nntp_port, tls_options);
    } else {
        if (service_config.upstream_auth)
            wtvnews.initializeUsenet(service_config.upstream_address, service_config.upstream_port, service_config.upstream_tls || null, service_config.upstream_auth.username || null, service_config.upstream_auth.password || null);
        else
            wtvnews.initializeUsenet(service_config.upstream_address, service_config.upstream_port, service_config.upstream_tls || null);
    }
    var article = parseInt(article);
    wtvnews.connectUsenet().then(() => {
        wtvnews.selectGroup(group).then((response) => {
            wtvnews.getArticle(article).then((response) => {
                wtvnews.quitUsenet();
                if (response.code == 220) {
                    var message_data = wtvnews.parseAttachments(response);
                    if (message_data.attachments) {
                        if (attachment_id < message_data.attachments.length) {
                            var attachment = message_data.attachments[attachment_id];
                            console.log(attachment);
                            var encoding = attachment.content_encoding.toLowerCase()
                            if (encoding == 'base64') {
                                data = Buffer.from(attachment.data, encoding);
                                headers = "200 OK\n"
                                headers += "Content-Type: " + attachment.content_type + "\n";
                                if (attachment.filename) headers += "Content-Disposition: attachment; filename=\"" + attachment.filename + "\"\n";
                                sendToClient(socket, headers, data);
                            } else {
                                errpage = wtvshared.doErrorPage(400, "Unimplemented encoding type:", encoding);
                                sendToClient(socket, errpage[0], errpage[1]);
                            }

                        } else {
                            errpage = wtvshared.doErrorPage(400, "Attachment ID exceeds available attachments");
                            sendToClient(socket, errpage[0], errpage[1]);
                        }
                    } else {
                        errpage = wtvshared.doErrorPage(400, "Article does not contain attachments.");
                        sendToClient(socket, errpage[0], errpage[1]);
                    }
                } else {
                    errpage = wtvshared.doErrorPage(400);
                    sendToClient(socket, errpage[0], errpage[1]);
                }
            });
        });
    });
}