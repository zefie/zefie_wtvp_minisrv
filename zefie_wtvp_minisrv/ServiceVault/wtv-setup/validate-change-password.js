var minisrv_service_file = true;
var userSession = null;

ssid_sessions[socket.ssid].loadSessionData();

var user_id = null;
if (request_headers.query.user_id) {
    user_id = request_headers.query.user_id;
} else {
    var errpage = doErrorPage(400, "User was not specified.");
    headers = errpage[0];
    data = errpage[1];
}

if (ssid_sessions[socket.ssid].user_id != 0 && ssid_sessions[socket.ssid].user_id != request_headers.query.user_id) {
    user_id = null; // force unset
    var errpage = doErrorPage(400, "You are not authorized to edit the selected user.");
    headers = errpage[0];
    data = errpage[1];
}

if (user_id && !errpage) {
    headers = `200 OK
Connection: Keep-Alive
wtv-mail-count: ${ssid_sessions[socket.ssid].mailstore.countUnreadMessages(0)}
Content-Type: text/html`
    var userSession = null;
    if (ssid_sessions[socket.ssid].user_id == request_headers.query.user_id) userSession = ssid_sessions[socket.ssid];
    else {
        userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
        userSession.user_id = user_id;
    }

    if (!userSession.loadSessionData()) {
        var errpage = doErrorPage(400, "Invalid user ID.");
        headers = errpage[0];
        data = errpage[1];
    }
    else {
        if (request_headers.query.password.length == 0 && request_headers.query.verify.length == 0) {
            userSession.disableUserPassword();
            headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/setup
`;
            if (request_headers.query.return_to) {
                headers += `wtv-expire: ${request_headers.query.return_to}
Location: ${request_headers.query.return_to}`;
            }
            else headers += "Location: " + (ssid_sessions[socket.ssid].user_id === user_id) ? 'wtv-setup:/setup' : 'wtv-setup:/accounts';
        }
        else if (request_headers.query.password.length < minisrv_config.config.passwords.min_length) errpage = wtvshared.doErrorPage(400, "Your password must contain at least " + minisrv_config.config.passwords.min_length + " characters.");
        else if (request_headers.query.password.length > minisrv_config.config.passwords.max_length) errpage = wtvshared.doErrorPage(400, "Your password must contain no more than than " + minisrv_config.config.passwords.max_length + " characters.");
        else if (request_headers.query.password !== request_headers.query.verify) errpage = wtvshared.doErrorPage(400, "The passwords you entered did not match. Please check them and try again.");
        else {
            if (errpage) {
                headers = errpage[0];
                data = errpage[1];
            } else {
                userSession.setUserPassword(request_headers.query.password);
                userSession.setUserLoggedIn(true);
                headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/setup
`;
                if (request_headers.query.return_to) {
                    headers += `wtv-expire: ${request_headers.query.return_to}
Location: ${request_headers.query.return_to}`;
                }
                else headers += "Location: "+ (ssid_sessions[socket.ssid].user_id === user_id) ? 'wtv-setup:/setup' : 'wtv-setup:/accounts';
            }
        }
    }
}

if (errpage) {
    headers = errpage[0];
    data = errpage[1];
}

if (userSession) userSession = null;