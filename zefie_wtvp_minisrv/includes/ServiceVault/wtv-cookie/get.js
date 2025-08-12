const minisrv_service_file = true;

if (request_headers.post_data) {
    if (request_headers.query.domain && request_headers.query.path) {
        if (socket.ssid) {
            if (session_data) {
                data = session_data.getCookieString(request_headers.query.domain, request_headers.query.path);
                headers = "200 OK\n";
                headers += "Content-Type: text/plain";
            }
        }
    }
}

if (!headers) {
    const errpage = wtvshared.doErrorPage(400)
    headers = errpage[0];
    data = errpage[1];
}