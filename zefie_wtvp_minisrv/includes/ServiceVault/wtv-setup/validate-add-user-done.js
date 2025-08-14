const minisrv_service_file = true;
let userSession = null;
let errpage = null;

if (session_data.user_id !== 0) errpage = wtvshared.doErrorPage(400, "You are not authorized to add users to this account.");

// seperate if statements as to not overwrite the first error if multiple occur

if (!errpage) {
    if (request_headers.query.user_password) {
        if (request_headers.query.user_password.length < minisrv_config.config.passwords.min_length) errpage = wtvshared.doErrorPage(400, "Your password must contain at least " + minisrv_config.config.passwords.min_length + " characters.");
        else if (request_headers.query.user_password.length > minisrv_config.config.passwords.max_length) errpage = wtvshared.doErrorPage(400, "Your password must contain no more than than " + minisrv_config.config.passwords.max_length + " characters.");
        else if (request_headers.query.user_password !== request_headers.query.user_password2) errpage = wtvshared.doErrorPage(400, "The passwords you entered did not match. Please check them and try again.");
    }
    else if (!request_headers.query.user_name) errpage = wtvshared.doErrorPage(400, "Please enter a username.");
}

if (!errpage) {
    const wtvr = new WTVRegister(minisrv_config, SessionStore);

    if (session_data.getNumberOfUserAccounts() > minisrv_config.config.user_accounts.max_users_per_account) errpage = wtvshared.doErrorPage(400, "You are not authorized to add more than " + minisrv_config.config.user_accounts.max_users_per_account + ` account${minisrv_config.config.user_accounts.max_users_per_account > 1 ? 's' : ''}.`);

    if (!request_headers.query.user_name) errpage = wtvshared.doErrorPage(400, "Please enter a username.");
    else if (request_headers.query.user_name.length < minisrv_config.config.user_accounts.min_username_length) errpage = wtvshared.doErrorPage(400, "Please choose a username with <b>" + minisrv_config.config.user_accounts.min_username_length + "</b> or more characters.");
    else if (request_headers.query.user_name.length > minisrv_config.config.user_accounts.max_username_length) errpage = wtvshared.doErrorPage(400, "Please choose a username with <b>" + minisrv_config.config.user_accounts.max_username_length + "</b> or less characters.");
    else if (!wtvr.checkUsernameSanity(request_headers.query.user_name)) errpage = wtvshared.doErrorPage(400, "The username you have chosen contains invalid characters. Please choose a username with only <b>letters</b>, <b>numbers</b>, <b>_</b> or <b>-</b>. Also, please be sure your username begins with a letter.");
    else if (!wtvr.checkUsernameAvailable(request_headers.query.user_name)) errpage = wtvshared.doErrorPage(400, "The username you have selected is already in use. Please select another username.");
}


if (errpage) {
    headers = errpage[0];
    data = errpage[1];
} else {
    if (!request_headers.query.display_name) request_headers.query.display_name = request_headers.query.username;
    userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
    const freeUserId = session_data.findFreeUserSlot();
    if (freeUserId) {
        userSession.user_id = freeUserId;
        userSession.setSessionData("subscriber_userid", freeUserId);
        userSession.setSessionData("subscriber_name", request_headers.query.display_name);
        userSession.setSessionData("subscriber_username", request_headers.query.user_name);
        userSession.setSessionData("registered", true);
        let mailstore_exists = userSession.mailstore.mailstoreExists();
        let mailbox_exists = false;
        if (!mailstore_exists) mailstore_exists = userSession.mailstore.createMailstore();
        if (mailstore_exists) {
            if (!userSession.mailstore.mailboxExists(0)) {
                // mailbox does not yet exist, create it
                mailbox_exists = userSession.mailstore.createMailbox(0);
            }
            if (mailbox_exists) {
                // Just created Inbox for the first time, so create the welcome message
                userSession.mailstore.createWelcomeMessage();
            }
        }
        if (!userSession.saveSessionData(true, true)) {
            errpage = wtvshared.doErrorPage(400);
            headers = errpage[0];
            data = errpage[1];
        } else {
            if (request_headers.query.user_password) {
                userSession.setUserPassword(request_headers.query.user_password);
                userSession.setUserLoggedIn(true);
            }
            

            headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/accounts
Location: wtv-setup:/accounts`;
        }
    }    
}