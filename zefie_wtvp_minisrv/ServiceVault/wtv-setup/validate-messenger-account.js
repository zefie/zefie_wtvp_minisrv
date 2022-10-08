var minisrv_service_file = true;
var errpage;
if (request_headers.query.email.length < 2) errpage = wtvshared.doErrorPage(400, "Your User Name includes at least 2 characters.");
else if (request_headers.query.email.length > 16) errpage = wtvshared.doErrorPage(400, "Your User Name includes less than 17 characters.");
else if (request_headers.query.password.length < 8) errpage = wtvshared.doErrorPage(400, "Your password includes at least 8 characters.");
else if (request_headers.query.password.length > 20) errpage = wtvshared.doErrorPage(400, "Your password includes less than 21 characters.");
else if (request_headers.query.password !== request_headers.query.password_verify) errpage = wtvshared.doErrorPage(400, "The passwords you entered did not match. Please check them any try again.");

if (errpage) {
    headers = errpage[0];
    data = errpage[1];
} else {
    var encryptedpass = ssid_sessions[socket.ssid].encryptPassword(request_headers.query.password);

    ssid_sessions[socket.ssid].setSessionData("messenger_password", encryptedpass);
    ssid_sessions[socket.ssid].setSessionData("messenger_email", request_headers.query.email);
    ssid_sessions[socket.ssid].setSessionData("messenger_domain", request_headers.query.domain);
    ssid_sessions[socket.ssid].saveSessionData();

    headers = `300 OK
wtv-expire-all: wtv-setup:/messenger-account
wtv-expire-all: wtv-setup:/validate-messenger-account
Location: wtv-setup:/messenger`
}