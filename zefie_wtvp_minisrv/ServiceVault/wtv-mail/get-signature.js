var minisrv_service_file = true;

var errpage = null;

var messageid = request_headers.query.message_id || null;
if (!messageid) {
    // get user signature
    data = ssid_sessions[socket.ssid].getSessionData("subscriber_signature");
} else {
    // get message signature
    var message = ssid_sessions[socket.ssid].mailstore.getMessageByID(messageid);
    if (!message) errpage = wtvshared.doErrorPage(400, "Invalid Message ID");
    data = message.signature
}
if (!errpage) {
    headers = `200 OK
wtv-trusted: false
Content-Type: text/html`
} 