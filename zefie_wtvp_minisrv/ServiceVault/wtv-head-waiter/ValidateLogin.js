var minisrv_service_file = true;

var challenge_response, challenge_header = '';
var gourl;
var wtvsec_login = null;

var user_id = (request_headers.query.user_id) ? request_headers.query.user_id : ssid_sessions[socket.ssid].user_id;

if (socket.ssid !== null && user_id !== null) ssid_sessions[socket.ssid].switchUserID(user_id);

if (socket.ssid !== null && !ssid_sessions[socket.ssid].get("wtvsec_login")) {
	wtvsec_login = new WTVSec(minisrv_config);
	wtvsec_login.IssueChallenge();
	wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
	ssid_sessions[socket.ssid].set("wtvsec_login", wtvsec_login);
} else {
	wtvsec_login = ssid_sessions[socket.ssid].get("wtvsec_login");
}

if (socket.ssid !== null) {
	if (wtvsec_login.ticket_b64 == null) {
		challenge_response = wtvsec_login.challenge_response;
		var client_challenge_response = request_headers["wtv-challenge-response"] || null;
		if (challenge_response && client_challenge_response) {
			if (challenge_response.toString(CryptoJS.enc.Base64) == client_challenge_response) {
				console.log(" * wtv-challenge-response success for " + wtvshared.filterSSID(socket.ssid));
				wtvsec_login.PrepareTicket();
				gourl = "wtv-head-waiter:/login-stage-two?";
			} else {
				console.log(" * wtv-challenge-response FAILED for " + wtvshared.filterSSID(socket.ssid));
				if (minisrv_config.config.debug_flags.debug) console.log("Response Expected:", challenge_response.toString(CryptoJS.enc.Base64));
				if (minisrv_config.config.debug_flags.debug) console.log("Response Received:", client_challenge_response)
				gourl = "wtv-head-waiter:/login?reissue_challenge=true";
			}
		} else {
			gourl = "wtv-head-waiter:/login?no_response=true";
		}
	} else {
		gourl = "wtv-head-waiter:/login-stage-two?";
    }
}

if (user_id && !request_headers.query.initial_login && !request_headers.query.user_login) {
	if (request_headers.query.password == "") {
		headers = `500 Please enter your password and try again
minisrv-no-mail-count: true
`;
	} else if (ssid_sessions[socket.ssid].validateUserPassword(request_headers.query.password)) {
		ssid_sessions[socket.ssid].setSessionData('password_valid', true)
		headers = `200 OK
minisrv-no-mail-count: true
Content-Type: text/html
wtv-visit: ${gourl}
`;
	} else {
		headers = `500 The password you entered was incorrect. Please retype it and try again.
minisrv-no-mail-count: true
`;
	}
} else {
	if (ssid_sessions[socket.ssid].getNumberOfUserAccounts() > 1 && user_id === 0 && request_headers.query.initial_login) {
		gourl = "wtv-head-waiter:/choose-user?"
	} else {
		var limitedLogin = (!ssid_sessions[socket.ssid].lockdown && (!ssid_sessions[socket.ssid].getSessionData('password_valid') && ssid_sessions[socket.ssid].getUserPasswordEnabled()));
		var limitedLoginRegistered = (limitedLogin && ssid_sessions[socket.ssid].isRegistered());
	}
	headers = `200 OK
wtv-connection-close: true
Connection: close
minisrv-no-mail-count: true
Content-Type: text/html`;
	if (client_challenge_response) {
		headers += `
wtv-encrypted: true
wtv-ticket: ${wtvsec_login.ticket_b64}
`;
	}
	console.log(ssid_sessions[socket.ssid])
	if (limitedLoginRegistered) gourl = "wtv-head-waiter:/password?";
	headers += `
wtv-visit: ${gourl}`;

}