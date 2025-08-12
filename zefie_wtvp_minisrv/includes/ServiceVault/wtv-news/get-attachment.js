const minisrv_service_file = true;
request_is_async = true;

let errpage = null;
const group = request_headers.query.group;
const attachment_id = parseInt(request_headers.query.attachment_id);
if ((!attachment_id && attachment_id != 0) || !group || !request_headers.query.article) {
    errpage = wtvshared.doErrorPage(400, "Attachment ID required.");
    sendToClient(socket, errpage[0], errpage[1]);
} else {
    const wtvnews = new WTVNews(minisrv_config, service_name);
    const service_config = minisrv_config.services[service_name];
    if (service_config.local_nntp_port && wtvnewsserver) {
        const tls_options = {
            ca: this.wtvshared.getServiceDep('wtv-news/localserver_ca.pem'),
            key: this.wtvshared.getServiceDep('wtv-news/localserver_key.pem'),
            cert: this.wtvshared.getServiceDep('wtv-news/localserver_cert.pem'),
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
    const article = parseInt(request_headers.query.article);
    wtvnews.connectUsenet().then(() => {
        wtvnews.selectGroup(group).then((response) => {
            wtvnews.getArticle(article).then((response) => {
                wtvnews.quitUsenet();
                if (response.code == 220) {
                    const message_data = wtvnews.parseAttachments(response);
                    if (message_data.attachments) {
                        if (attachment_id < message_data.attachments.length) {
                            const attachment = message_data.attachments[attachment_id];
                            const encoding = attachment.content_encoding.toLowerCase()
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