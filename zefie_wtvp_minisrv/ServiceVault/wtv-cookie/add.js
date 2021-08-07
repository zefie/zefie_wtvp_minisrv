if (socket.ssid) {
    if (request_headers.post_data) {
        if (ssid_sessions[socket.ssid]) {
            ssid_sessions[socket.ssid].addCookie(request_headers.query.domain,request_headers.query.path,request_headers.query.expires,request_headers.query.cookie);
            headers = "200 OK\n";
            headers += "Content-Type: text/html";            
        }
    }
} 

if (!headers) {
    var errpage = doErrorPage(400)
    headers = errpage[0];
    data = errpage[1];
}