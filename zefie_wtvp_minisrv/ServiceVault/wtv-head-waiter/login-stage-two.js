var minisrv_service_file = true;
var gourl = null;

if (!ssid_sessions[socket.ssid].isRegistered() && (!request_headers.query.guest_login || !minisrv_config.config.allow_guests)) gourl = "wtv-register:/splash?";

if (gourl) {
	headers = `200 OK
wtv-open-isp-disabled: false
`;
	if (!ssid_sessions[socket.ssid].isRegistered() && (!request_headers.query.guest_login || !minisrv_config.config.allow_guests)) {
		headers += `wtv-encrypted: true
${getServiceString('wtv-register')}
${getServiceString('wtv-head-waiter')}
${getServiceString('wtv-star')}
wtv-boot-url: wtv-head-waiter:/relogin?
`
	}
	headers += `wtv-visit: ${gourl}
Content-type: text/html`;
	data = '';
}
else {
	if (ssid_sessions[socket.ssid].lockdown) {
		home_url = minisrv_config.config.unauthorized_url;
	}
	else if (request_headers.query.guest_login && minisrv_config.config.allow_guests) {
		var namerand = Math.floor(Math.random() * 100000);
		var nickname = (minisrv_config.config.service_name + '_' + namerand)
		var human_name = nickname;
		var userid = '1' + Math.floor(Math.random() * 1000000000000000000);
		var messenger_enabled = 0;
		var messenger_authorized = 0;
		if (request_headers.query.skip_splash) var home_url = "wtv-home:/home?";
		else var home_url = "wtv-home:/splash?";
	} else if (!ssid_sessions[socket.ssid].getSessionData("registered")) {
		var errpage = wtvshared.doErrorPage(400);
		headers = errpage[0];
		data = errpage[1];
	} else {
		var userid = ssid_sessions[socket.ssid].getSessionData("subscriber_userid")
		var nickname = ssid_sessions[socket.ssid].getSessionData("subscriber_username");
		var human_name = ssid_sessions[socket.ssid].getSessionData("subscriber_name") || nickname;
		var messenger_enabled = ssid_sessions[socket.ssid].getSessionData("messenger_enabled") || 0;
		var messenger_authorized = ssid_sessions[socket.ssid].getSessionData("messenger_authorized") || 0;
		var home_url = "wtv-home:/splash?";
	}
	var limitedLogin = ssid_sessions[socket.ssid].lockdown;
	var limitedLoginRegistered = (limitedLogin || (ssid_sessions[socket.ssid].isRegistered() && !ssid_sessions[socket.ssid].getSessionData('password_valid')));
	var offline_user_list = null;
	if (ssid_sessions[socket.ssid].isRegistered() && ssid_sessions[socket.ssid].user_id == 0) {
		var accounts = ssid_sessions[socket.ssid].listPrimaryAccountUsers();
		var num_accounts = ssid_sessions[socket.ssid].getNumberOfUserAccounts();
		var offline_user_list_str = "<user-list>\n";
		var i = 0;
		Object.keys(accounts).forEach((k) => {
			var account_display_name = (accounts[k].subscriber_name) ? accounts[k].subscriber_name : accounts[k].subscriber_username
			offline_user_list_str += "\t" + '<user userid="' + i + '" user-name="' + accounts[k].subscriber_username + '" first-name="' + account_display_name + '"  last-name="" passsword="" mail-enabled=true />' + "\n";
			i++;
		});
		offline_user_list_str += "</user-list>\n";
		offline_user_list = CryptoJS.enc.Latin1.parse(offline_user_list_str).toString(CryptoJS.enc.Base64);
    }

	if (limitedLoginRegistered) var home_url = "wtv-head-waiter:/password?";

	data = '';

	headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-head-waiter:
`;

	if (!limitedLogin) {
		headers += `wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: GMT
wtv-client-date: `+ strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString())) + ` GMT
wtv-country: US
wtv-language-header: en-US,en
wtv-noback-all: wtv-
wtv-visit: client:closeallpanels
wtv-expire-all: client:closeallpanels
wtv-transition-override: off
wtv-smartcard-inserted-message: Contacting service
wtv-ssl-timeout: 240
wtv-login-timeout: 7200
`;
		if (!limitedLogin) {
			ssid_sessions[socket.ssid].assignMailStore();
			headers += getServiceString('all', { "exceptions": ["wtv-register"] });
			if (offline_user_list) headers += "wtv-offline-user-list: " + offline_user_list + "\n";
			headers += `wtv-messenger-authorized: ${messenger_authorized}
wtv-messenger-enable: ${messenger_enabled}
wtv-messagewatch-checktimeoffset: off
`;
		} else {
			/*
			headers += getServiceString('wtv-1800') + "\n";
			headers += getServiceString('wtv-head-waiter') + "\n";
			headers += getServiceString('wtv-log') + "\n";
			headers += getServiceString('wtv-star') + "\n";
			headers += getServiceString('wtv-flashrom') + "\n";
			*/
			headers += `wtv-messenger-authorized: 0
wtv-messenger-enable: 0
`;
		}

		headers += `wtv-log-url: wtv-log:/log
wtv-ssl-log-url: wtv-log:/log
`;

		if (!limitedLogin) {
			headers += `wtv-bypass-proxy: false
user-id: ${userid}
wtv-human-name: ${human_name}
${ssid_sessions[socket.ssid].setIRCNick(nickname)}
wtv-domain: ${minisrv_config.config.domain_name}
wtv-input-timeout: 14400
wtv-connection-timeout: 1440
wtv-fader-timeout: 1440
wtv-inactive-timeout: 1440
`;
		}
		/*
		else {
			headers += `wtv-bypass-proxy: true
	user-id: 0
	wtv-human-name: Unauthorized User
	wtv-domain: ${minisrv_config.config.domain_name}
	wtv-input-timeout: 30
	wtv-connection-timeout: 60
	wtv-fader-timeout: 60
	wtv-inactive-timeout: 60`;
		}
		*/

		if (!limitedLogin) {
			headers += "\nwtv-relogin-url: wtv-head-waiter:/relogin?relogin=true";
			if (request_headers.query.guest_login) headers += "&guest_login=true";

			headers += "\nwtv-reconnect-url: wtv-head-waiter:/login-stage-two?reconnect=true";
			if (request_headers.query.guest_login) headers += "&guest_login=true";

			headers += "\nwtv-boot-url: wtv-head-waiter:/relogin?relogin=true";
			if (request_headers.query.guest_login) headers += "&guest_login=true";			
			headers += "\nwtv-home-url: " + home_url;
		}

		if (ssid_sessions[socket.ssid].get('wtv-need-upgrade') != 'true' && !request_headers.query.reconnect && !limitedLogin)
			headers += "\nwtv-settings-url: wtv-setup:/get\n";

		if (!limitedLogin) {
			headers += `wtv-force-lightweight-targets: webtv.net:/
wtv-show-time-enabled: true
wtv-allow-dsc: true
wtv-tourist-enabled: true
wtv-open-isp-disabled: false
wtv-offline-mail-enable: false
wtv-demo-mode: 0
wtv-wink-deferrer-retries: 3
wtv-name-server: 8.8.8.8`;
		}
	}
	if (!request_headers.query.reconnect) headers += "\nwtv-visit: " + home_url;
	headers += "\nContent-Type: text/html";
}