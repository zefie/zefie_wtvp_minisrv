var minisrv_service_file = true;

ssid_sessions[socket.ssid].loadSessionData();

var user_id = (request_headers.query.user_id) ? request_headers.query.user_id : ssid_sessions[socket.ssid].user_id;

// security
if (ssid_sessions[socket.ssid].user_id != 0 && ssid_sessions[socket.ssid].user_id != request_headers.query.user_id) {
    user_id = null; // force unset
    var errpage = wtvshared.doErrorPage(400, "You are not authorized to change the selected user's password.");
    headers = errpage[0];
    data = errpage[1];
}

if (user_id != null) {
    var userSession;
    if (ssid_sessions[socket.ssid].user_id == request_headers.query.user_id) userSession = ssid_sessions[socket.ssid];
    else {
        userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
        userSession.user_id = user_id;
    }

    if (!userSession.loadSessionData()) {
        var errpage = wtvshared.doErrorPage(400, "Invalid user ID.");
        headers = errpage[0];
        data = errpage[1];
    }
    else {
        var user_name = userSession.getSessionData('subscriber_username');
        userSession.setSessionData('subscriber_name', (request_headers.query.display_name) ? request_headers.query.display_name : user_name);
        userSession.saveSessionData();
        headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/edit-user-begin?user_id=${user_id}
wtv-expire: wtv-setup:/edit-user-name?user_id=${user_id}
Location: wtv-setup:/edit-user-begin?user_id=${user_id}`;
    }
}
if (userSession) userSession = null;