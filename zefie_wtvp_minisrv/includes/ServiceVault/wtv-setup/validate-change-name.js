const minisrv_service_file = true;
let userSession;
session_data.loadSessionData();

let user_id = (request_headers.query.user_id) ? parseInt(request_headers.query.user_id) : session_data.user_id;

// security
if (session_data.user_id !== 0 && session_data.user_id !== parseInt(request_headers.query.user_id)) {
    user_id = null; // force unset
    const errpage = wtvshared.doErrorPage(400, "You are not authorized to change the selected user's password.");
    headers = errpage[0];
    data = errpage[1];
}

if (user_id !== null) {
    
    if (session_data.user_id === parseInt(request_headers.query.user_id)) userSession = session_data;
    else {
        userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
        userSession.user_id = user_id;
    }

    if (!userSession.loadSessionData()) {
        const errpage = wtvshared.doErrorPage(400, "Invalid user ID.");
        headers = errpage[0];
        data = errpage[1];
    }
    else {
        const user_name = userSession.getSessionData('subscriber_username');
        userSession.setSessionData('subscriber_name', (request_headers.query.display_name) ? request_headers.query.display_name : user_name);
        userSession.saveSessionData();
        headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/edit-user-begin?user_id=${user_id}
wtv-expire: wtv-setup:/edit-user-name?user_id=${user_id}
Location: wtv-setup:/edit-user-begin?user_id=${user_id}`;
    }
}