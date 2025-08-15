const minisrv_service_file = true;

let challenge_response, gourl, wtvsec_login;


const hasPendingTransfer = session_data.hasPendingTransfer()
if (hasPendingTransfer) {
	if (hasPendingTransfer.type === "target") {
		const xferSession = new WTVClientSessionData(minisrv_config, hasPendingTransfer.ssid);
		xferSession.user_id = 0
		const primary_username = xferSession.listPrimaryAccountUsers()['subscriber']['subscriber_username'];
		const transferPendingDest = new clientShowAlert({
			'image': minisrv_config.config.service_logo,
			'message': "There is a pending transfer of the account <b>" + primary_username + "</b>, would you like to complete the transfer, or cancel it?",
			'buttonlabel1': "Complete Transfer",
			'buttonaction1': "wtv-head-waiter:/complete-account-transfer",
			'buttonlabel2': "Cancel Transfer",
			'buttonaction2': "wtv-head-waiter:/cancel-account-transfer",
			'noback': true,
		}).getURL();
		const errpage = wtvshared.doRedirect(transferPendingDest);
		headers = errpage[0];
		data = errpage[1];
	} else if (hasPendingTransfer.type === "source") {
		const transferPendingSrc = new clientShowAlert({
			'image': minisrv_config.config.service_logo,
			'message': "There is a pending transfer of this account to <b>" + hasPendingTransfer.ssid + "</b>. In order to use this box, you need to complete or cancel the transfer.",
			'buttonlabel1': "Power Off",
			'buttonaction1': "client:poweroff",
			'buttonlabel2': "Cancel Transfer",
			'buttonaction2': "wtv-head-waiter:/cancel-account-transfer",
			'noback': true,
		}).getURL();
		const errpage = wtvshared.doRedirect(transferPendingSrc);
		headers = errpage[0];
		data = errpage[1];
	} else {
		console.log(hasPendingTransfer);
	}
} else {

	if (request_headers.query.hangup) {
		headers = `300 OK
Location: client:gototvhome
wtv-visit: client:hangupphone`
	} else {
		const user_id = (request_headers.query.user_id) ? request_headers.query.user_id : session_data.user_id;
		let limitedLoginRegistered, client_challenge_response;
		if (socket.ssid !== null && user_id !== null) session_data.switchUserID(user_id);

		if (socket.ssid !== null && !session_data.get("wtvsec_login")) {
			wtvsec_login = session_data.createWTVSecSession();
			wtvsec_login.IssueChallenge();
			wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
			session_data.set("wtvsec_login", wtvsec_login);
		} else {
			wtvsec_login = session_data.get("wtvsec_login");
		}
		let errpage;
		if (socket.ssid !== null) {
			if (wtvsec_login.ticket_b64 === null) {
				challenge_response = wtvsec_login.challenge_response;
				client_challenge_response = request_headers["wtv-challenge-response"] || null;
				if (challenge_response && client_challenge_response) {
					if (challenge_response.toString(CryptoJS.enc.Base64) === client_challenge_response) {
						console.log(" * wtv-challenge-response success for " + wtvshared.filterSSID(socket.ssid));
						wtvsec_login.PrepareTicket();
						gourl = "wtv-head-waiter:/login-stage-two?";
					} else {
						console.log(" * wtv-challenge-response FAILED for " + wtvshared.filterSSID(socket.ssid));
						if (minisrv_config.config.debug_flags.debug) console.log("Response Expected:", challenge_response.toString(CryptoJS.enc.Base64));
						if (minisrv_config.config.debug_flags.debug) console.log("Response Received:", client_challenge_response);
						errpage = wtvshared.doErrorPage(500, "Invalid challenge response received");
						headers = errpage[0];
						data = errpage[1];
					}
				} else {
					if (socket_sessions[socket.id].prealpha) {
						gourl = "wtv-head-waiter:/login-stage-two?";
					} else {
						errpage = wtvshared.doErrorPage(500, "No challenge response received");
						headers = errpage[0];
						data = errpage[1];						
					}
				}
			} else {
				gourl = "wtv-head-waiter:/login-stage-two?";
			}
		}
		if (!errpage) {
			if (user_id !== null && !request_headers.query.initial_login && !request_headers.query.user_login && !request_headers.query.relogin && !request_headers.query.reconnect) {
				if (request_headers.query.password === "") {
					headers = `403 Please enter your password and try again
minisrv-no-mail-count: true`;
				} else if (session_data.validateUserPassword(request_headers.query.password)) {
					session_data.setUserLoggedIn(true);
					headers = `200 OK
minisrv-no-mail-count: true
Content-Type: text/html
wtv-visit: ${gourl}`;
				} else {
					headers = `403 The password you entered was incorrect. Please retype it and try again.
minisrv-no-mail-count: true`;
				}
			} else {
				if (session_data.baddisk === true && !ssid_sessions[socket.ssid].get("bad_disk_shown")) {
					gourl = "wtv-head-waiter:/bad-disk?"
				}
				else if (session_data.getNumberOfUserAccounts() > 1 && user_id === 0 && (!session_data.isUserLoggedIn() || request_headers.query.initial_login || request_headers.query.relogin)) {
					gourl = "wtv-head-waiter:/choose-user?"
				} else {
					if (!session_data.getUserPasswordEnabled() && request_headers.query.user_login) session_data.setUserLoggedIn(true);
					const limitedLogin = (!session_data.lockdown && (!session_data.get('password_valid') && session_data.getUserPasswordEnabled()));
					limitedLoginRegistered = (limitedLogin && session_data.isRegistered());
				}
				headers = `200 OK
minisrv-no-mail-count: true
Content-Type: text/html`;
				if (!socket_sessions[socket.id].prealpha) {
					headers += "\nwtv-connection-close: true\nConnection: close";
				}

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
	}
}