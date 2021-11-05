if (request_headers.query && ssid_sessions[socket.ssid]) {
    ssid_sessions[socket.ssid].setSessionData("subscriber_signature", (request_headers.query.mail_signature) ? request_headers.query.mail_signature : "");
    ssid_sessions[socket.ssid].saveSessionData();
    headers = `200 OK
Content-type: text/html`
} else {
    var outdata = doErrorPage();
    headers = outdata[0];
    data = outdata[1];
}