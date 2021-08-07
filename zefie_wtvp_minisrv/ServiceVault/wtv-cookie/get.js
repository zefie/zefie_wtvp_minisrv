if (request_headers.post_data) {
    if (request_headers.query.domain && request_headers.query.path) {
        if (socket.ssid) {
            if (ssid_sessions[socket.ssid]) {
                data = ssid_sessions[socket.ssid].getCookieString(request_headers.query.domain, request_headers.query.path);
                headers = "200 OK\n";
                headers += "Content-Type: text/plain";
            }
        }
    }
}

if (!headers) {
    var errpage = doErrorPage(400)
    headers = errpage[0];
    data = errpage[1];
}