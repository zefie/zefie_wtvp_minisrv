var challenge_response, challenge_header = '';
var gourl;

if (socket.ssid != null && !ssid_sessions[socket.ssid].get("wtvsec_login")) {
	var wtvsec_login = new WTVSec(1,zdebug);
	wtvsec_login.IssueChallenge();
	wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
	ssid_sessions[socket.ssid].set("wtvsec_login", wtvsec_login);
} else {
	var wtvsec_login = ssid_sessions[socket.ssid].get("wtvsec_login");
}

if (socket.ssid !== null) {
	if (wtvsec_login.ticket_b64 == null) {
		challenge_response = wtvsec_login.challenge_response;
		var client_challenge_response = request_headers["wtv-challenge-response"] || null;
		if (challenge_response && client_challenge_response) {
			if (challenge_response.toString(CryptoJS.enc.Base64) == client_challenge_response) {
				console.log(" * wtv-challenge-response success for " + filterSSID(socket.ssid));
				wtvsec_login.PrepareTicket();

			} else {
				console.log(" * wtv-challenge-response FAILED for " + filterSSID(socket.ssid));
				if (zdebug) console.log("Response Expected:", challenge_response.toString(CryptoJS.enc.Base64));
				if (zdebug) console.log("Response Received:", client_challenge_response)
				gourl = "wtv-head-waiter:/login?reissue_challenge=true";
			}
		} else {
			gourl = "wtv-head-waiter:/login?no_response=true";
		}
	}
}

if (!ssid_sessions[socket.ssid].getSessionData("registered") && (!request_headers.query.guest_login || !minisrv_config.config.allow_guests)) gourl = "wtv-register:/splash";

if (gourl) {
	headers = `200 OK
Connection: Close
wtv-open-isp-disabled: false
`;
	if (!ssid_sessions[socket.ssid].getSessionData("registered") && (!request_headers.query.guest_login || !minisrv_config.config.allow_guests)) {
		headers += `wtv-encrypted: true
wtv-ticket: ${wtvsec_login.ticket_b64}
${getServiceString('wtv-register')}
${getServiceString('wtv-head-waiter')}
${getServiceString('wtv-star')}
wtv-boot-url: wtv-register:/splash
`
	}
	headers += `wtv-visit: ${gourl}
Content-type: text/html`;
	data = '';
}
else {
	if (request_headers.query.guest_login && minisrv_config.config.allow_guests) {
		var namerand = Math.floor(Math.random() * 100000);
		var nickname = (minisrv_config.config.service_name + '_' + namerand)
		var human_name = nickname;
		var userid = '1' + Math.floor(Math.random() * 1000000000000000000);
		var messenger_enabled = 0;
		var messenger_authorized = 0;
		var home_url = "wtv-home:/home?";
	} else if (!ssid_sessions[socket.ssid].getSessionData("registered")) {
		var errpage = doErrorPage(400);
		headers = errpage[0];
		data = errpage[1];
	} else {
		var userid = ssid_sessions[socket.ssid].getSessionData("subscriber_userid")
		var nickname = ssid_sessions[socket.ssid].getSessionData("subscriber_username");
		var human_name = ssid_sessions[socket.ssid].getSessionData("subscriber_name");
		var messenger_enabled = ssid_sessions[socket.ssid].getSessionData("messenger_enabled") || 0;
		var messenger_authorized = ssid_sessions[socket.ssid].getSessionData("messenger_authorized") || 0;
		var home_url = "wtv-home:/splash?";
	}
	var offline_user_list = CryptoJS.enc.Latin1.parse("<user-list>\n\t<user userid=\"" + userid + " user-name=\"" + nickname + "\" first-name=\"" + minisrv_config.config.service_name + "User \" last-name=\\" + namerand + "\" password=\"\" mail-enabled=\"true\" />\n</user-list>").toString(CryptoJS.enc.Base64);
	data = '';
	headers = `200 OK
Connection: Keep-Alive
wtv-encrypted: true
wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: GMT
wtv-client-date: `+ strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString())) + ` GMT
wtv-country: US
wtv-language-header: en-US,en
wtv-visit: client:closeallpanels
wtv-expire-all: client:closeallpanels
wtv-transition-override: off
wtv-force-lightweight-targets: webtv.net:/
wtv-smartcard-inserted-message: Contacting service
wtv-bypass-proxy: false
wtv-offline-user-list: ${offline_user_list}
wtv-messenger-authorized: ${messenger_authorized}
wtv-messenger-enable: ${messenger_enabled}
wtv-noback-all: wtv-
wtv-service: reset
`+ getServiceString('all', { "exceptions": ["wtv-register"] }) + `
user-id: ${userid}
wtv-human-name: ${human_name}
${ssid_sessions[socket.ssid].setIRCNick(nickname)}
wtv-domain: wtv.zefie.com
wtv-input-timeout: 14400
wtv-ticket: ${wtvsec_login.ticket_b64}
wtv-messagewatch-checktimeoffset: off
wtv-input-timeout: 14400
wtv-connection-timeout: 90
wtv-fader-timeout: 900
wtv-smartcard-inserted-message: Contacting service
wtv-inactive-timeout: 0
wtv-connection-timeout: 90
wtv-show-time-enabled: true
wtv-fader-timeout: 900
wtv-tourist-enabled: true`
	headers += "\nwtv-relogin-url: wtv-1800:/preregister?relogin=true";
	if (request_headers.query.guest_login) headers += "&guest_login=true";
	headers += "\nwtv-reconnect-url: wtv-1800:/preregister?reconnect=true";
	if (request_headers.query.guest_login) headers += "&guest_login=true";
	headers += "\nwtv-boot-url: wtv-1800:/preregister?relogin=true";
	if (request_headers.query.guest_login) headers += "&guest_login=true";
	headers += "\nwtv-allow-dsc: true";
	headers += "\nwtv-home-url: wtv-home:/home?";

	if (ssid_sessions[socket.ssid].get('wtv-need-upgrade') != 'true' && !request_headers.query.reconnect) {
		headers += "\nwtv-settings-url: wtv-setup:/get";
	}
	headers += `
wtv-log-url: wtv-log:/log
wtv-ssl-log-url: wtv-log:/log
wtv-ssl-timeout: 240
wtv-login-timeout: 7200
wtv-open-isp-disabled: false
wtv-offline-mail-enable: false
wtv-demo-mode: 0
wtv-wink-deferrer-retries: 3
wtv-visit: ${home_url}
Content-Type: text/html`;
}