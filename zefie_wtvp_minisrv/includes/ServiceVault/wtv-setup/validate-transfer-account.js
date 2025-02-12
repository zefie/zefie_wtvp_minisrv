var minisrv_service_file = true;

var wtvr = new WTVRegister(minisrv_config);

// security
if (session_data.user_id != 0 && session_data.user_id != request_headers.query.user_id) {
    var errpage = wtvshared.doErrorPage(400, "You are not authorized to transfer this account. Please log in as the primary user.");
    headers = errpage[0];
    data = errpage[1];
}

if (!request_headers.query.ssid || !request_headers.query.password) {
    var errpage = wtvshared.doErrorPage(400, "Invalid Parameter");
    headers = errpage[0];
    data = errpage[1];
}

if (!session_data.getUserPasswordEnabled()) {
    var passwordRequired = new clientShowAlert({
        'image': minisrv_config.config.service_logo,
        'message': "For security, you must first set a password on your account before you can transfer it.",
        'buttonlabel1': "Set Password",
        'buttonaction1': "wtv-setup:/edit-password",
        'buttonlabel2': "Cancel",
        'buttonaction2': "client:donothing",
        'noback': true,
    }).getURL();

    var errpage = wtvshared.doRedirect(passwordRequired);
    headers = errpage[0];
    data = errpage[1];
} else if (session_data.getUserPasswordEnabled() && session_data.user_id === 0 && request_headers.query.ssid && request_headers.query.password) {
    validPassword = session_data.validateUserPassword(request_headers.query.password);
    if (!validPassword) {
        var errpage = wtvshared.doErrorPage(400, "Incorrect Password");
        headers = errpage[0];
        data = errpage[1];
    }
    else if (!wtvshared.checkSSID(request_headers.query.ssid)) {
        var errpage = wtvshared.doErrorPage(400, "The provided SSID is not valid. Only valid CRC validated SSIDs are available as a destination. Please check your input and try again.");
        headers = errpage[0];
        data = errpage[1];
    }
    else if (!wtvr.checkSSIDAvailable(request_headers.query.ssid)) {
        var errpage = wtvshared.doErrorPage(400, "The destination already has an account registered, or a transfer is already in progress. Please delete the account associated with the target SSID, or cancel the pending transfer, then try again.");
        headers = errpage[0];
        data = errpage[1];
    } else {
        var transferInitiated = new clientShowAlert({
            'image': minisrv_config.config.service_logo,
            'message': "Your account transfer is pending. Please connect to this server with the destination box. A prompt should appear instead of registration. To cancel the transfer, select <b>Cancel Transfer</b>, or simply reconnect with this box.",
            'buttonlabel1': "Cancel Transfer",
            'buttonaction1': "wtv-head-waiter:/cancel-account-transfer",
            'buttonlabel2': "Power Off",
            'buttonaction2': "client:poweroff",
            'noback': true,
        }).getURL();

        session_data.setPendingTransfer(request_headers.query.ssid);
        session_data.setUserLoggedIn(false);
        var errpage = wtvshared.doRedirect(transferInitiated);
        headers = errpage[0];
        data = errpage[1];
    }
} else {
    var errpage = wtvshared.doErrorPage(400, "Invalid Parameter");
    headers = errpage[0];
    data = errpage[1];
}