const minisrv_service_file = true;

if (socket.ssid) {
    if (session_data) {

        data = session_data.listCookies();
        headers = "200 OK\n";
        headers += "Content-Type: text/plain";
    }
}

if (!headers) {
    const errpage = wtvshared.doErrorPage(400)
    headers = errpage[0];
    data = errpage[1];
}