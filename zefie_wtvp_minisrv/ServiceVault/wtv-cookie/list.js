if (socket.ssid) {
    if (ssid_sessions[socket.ssid]) {

        data = ssid_sessions[socket.ssid].listCookies();
        headers = "200 OK\n";
        headers += "Content-Type: text/plain";
    }
}

if (!headers) {
    var errpage = doErrorPage(400)
    headers = errpage[0];
    data = errpage[1];
}