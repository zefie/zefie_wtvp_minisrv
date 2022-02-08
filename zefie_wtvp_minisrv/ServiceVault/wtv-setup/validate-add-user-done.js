var minisrv_service_file = true;
var userSession = null;
var errpage = null;

if (ssid_sessions[socket.ssid].user_id != 0) errpage = wtvshared.doErrorPage(400, "You are not authorized to add users to this account.");

// seperate if statements as to not overwrite the first error if multiple occur

if (!errpage) {
    if (request_headers.query.user_password) {
        if (request_headers.query.user_password.length < minisrv_config.config.passwords.min_length) errpage = wtvshared.doErrorPage(400, "Your password must contain at least " + minisrv_config.config.passwords.min_length + " characters.");
    }
    else {
        if (request_headers.query.user_password.length > minisrv_config.config.passwords.max_length) errpage = wtvshared.doErrorPage(400, "Your password must contain no more than than " + minisrv_config.config.passwords.max_length + " characters.");
        else if (request_headers.query.user_password !== request_headers.query.user_password2) errpage = wtvshared.doErrorPage(400, "The passwords you entered did not match. Please check them and try again.");
    }
}

if (!errpage) {
    if (ssid_sessions[socket.ssid].getNumberOfUserAccounts() > minisrv_config.config.user_accounts.max_users_per_account) errpage = wtvshared.doErrorPage(400, "You are not authorized to add more than " + minisrv_config.config.user_accounts.max_users_per_account + ` account${minisrv_config.config.user_accounts.max_users_per_account > 1 ? 's' : ''}.`);
    else if (!request_headers.query.user_name) errpage = wtvshared.doErrorPage(400, "Please enter a username.");
}

if (errpage) {
    headers = errpage[0];
    data = errpage[1];
} else {
    if (!request_headers.query.display_name) request_headers.query.display_name = request_headers.query.username;
    userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
    var freeUserId = ssid_sessions[socket.ssid].findFreeUserSlot(ssid_sessions[socket.ssid]);
    if (freeUserId) {
        userSession.user_id = freeUserId;
        userSession.setSessionData("subscriber_name", request_headers.query.display_name);
        userSession.setSessionData("subscriber_username", request_headers.query.user_name);
        userSession.setSessionData("registered", true);
        var mailstore_exists = userSession.mailstore.mailstoreExists();
        if (!mailstore_exists) mailstore_exists = userSession.mailstore.createMailstore();
        if (mailstore_exists) {
            if (!userSession.mailstore.mailboxExists(0)) {
                // mailbox does not yet exist, create it
                var mailbox_exists = userSession.mailstore.createMailbox(0);
                if (mailbox_exists) {
                    // Just created Inbox for the first time, so create the welcome message
                    userSession.mailstore.createWelcomeMessage();
                }
            }
        }
        if (!userSession.saveSessionData(true)) {
            var errpage = wtvshared.doErrorPage(400);
            headers = errpage[0];
            data = errpage[1];
        } else {
            if (request_headers.query.user_password)
                userSession.setUserPassword(request_headers.query.user_password);

            headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/accounts
Location: wtv-setup:/accounts`;
        }
    }    
}

if (userSession) userSession = null;