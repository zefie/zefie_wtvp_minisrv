var minisrv_service_file = true;

var challenge_response, challenge_header = '';
var gourl;
var wtvsec_login = null;

if (request_headers.query.hangup) {
	headers = `300 OK
Location: client:gototvhome
wtv-visit: client:hangupphone`
} else {
	var user_id = (request_headers.query.user_id) ? request_headers.query.user_id : session_data.user_id;

	if (socket.ssid !== null && user_id !== null) session_data.switchUserID(user_id);

	if (socket.ssid !== null && !session_data.get("wtvsec_login")) {
		wtvsec_login = session_data.createWTVSecSession();
		wtvsec_login.IssueChallenge();
		wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
		session_data.set("wtvsec_login", wtvsec_login);
	} else {
		wtvsec_login = session_data.get("wtvsec_login");
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

	if (request_headers.query.guest_login) {
		if (request_headers.query.relogin || request_headers.query.reconnect) gourl += "&";
		gourl += "guest_login=true";
		if (request_headers.query.skip_splash) gourl += "&skip_splash=true";
	}

	if (user_id != null && !request_headers.query.initial_login && !request_headers.query.user_login && !request_headers.query.relogin) {
		if (request_headers.query.password == "") {
			headers = `403 Please enter your password and try again
minisrv-no-mail-count: true
`;
		} else if (session_data.validateUserPassword(request_headers.query.password)) {
			session_data.setUserLoggedIn(true);
			headers = `200 OK
minisrv-no-mail-count: true
Content-Type: text/html
wtv-visit: ${gourl}
`;
		} else {
			headers = `403 The password you entered was incorrect. Please retype it and try again.
minisrv-no-mail-count: true
`;
		}
	} else {
		if (session_data.baddisk === true) {
			gourl = "wtv-head-waiter:/bad-disk?"
		}
		else if (session_data.getNumberOfUserAccounts() > 1 && user_id === 0 && (request_headers.query.initial_login || request_headers.query.relogin)) {
			gourl = "wtv-head-waiter:/choose-user?"
		} else {
			if (!session_data.getUserPasswordEnabled() && request_headers.query.user_login) session_data.setUserLoggedIn(true);
			var limitedLogin = (!session_data.lockdown && (!session_data.get('password_valid') && session_data.getUserPasswordEnabled()));
			var limitedLoginRegistered = (limitedLogin && session_data.isRegistered());
		}
		headers = `200 OK
wtv-connection-close: true
Connection: close
minisrv-no-mail-count: true
Content-Type: text/html`;
		if (client_challenge_response) {
			headers += `
wtv-encrypted: ${(request_headers['wtv-encrypted']) ? wtvshared.parseBool(request_headers['wtv-encrypted']) : true}`;
			if (wtvsec_login) session_data.data_store.wtvsec_login.update_ticket = true;
		}
		if (limitedLoginRegistered && session_data.getUserPasswordEnabled()) gourl = "wtv-head-waiter:/password?";
		headers += `
wtv-visit: ${gourl}`;

	}
}