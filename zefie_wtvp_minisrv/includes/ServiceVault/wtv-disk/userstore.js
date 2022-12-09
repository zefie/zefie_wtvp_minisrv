var minisrv_service_file = true;

if (request_headers.post_data) {
    if (request_headers.query.partialPath || request_headers.query.path) {
        if (socket.ssid) {
            if (session_data) {
                if (session_data.isRegistered()) {
                    var result = session_data.storeUserStoreFile(request_headers.query.path || request_headers.query.partialPath, new Buffer.from(request_headers.post_data.toString(CryptoJS.enc.Hex), 'hex'), request_headers.query['last-modified-seconds'] || null, (request_headers.query.no_overwrite) ? false : true);
                    if (result) {
                        headers = "200 OK\n";
                        headers += "Content-Type: text/plain";
                    } 
                }
            }
        }
    }
}

if (!headers) {
    var errpage = wtvshared.doErrorPage(400)
    headers = errpage[0];
    data = errpage[1];
}