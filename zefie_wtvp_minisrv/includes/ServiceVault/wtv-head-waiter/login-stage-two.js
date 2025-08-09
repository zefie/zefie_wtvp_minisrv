var minisrv_service_file = true;
var gourl = null;

var bootrom = parseInt(session_data.get("wtv-client-bootrom-version"));

if (!session_data.isRegistered() && (!request_headers.query.guest_login || !minisrv_config.config.allow_guests)) gourl = "wtv-register:/splash?";
var home_url = "wtv-home:/home?";

if (gourl) {
	headers = "200 OK\n";
	if (bootrom !== 0) headers += "wtv-open-isp-disabled: false\n";

	if (!session_data.isRegistered() && (!request_headers.query.guest_login || !minisrv_config.config.allow_guests)) {
		// fake logged in for reg
		session_data.setUserLoggedIn(true);
		headers += `wtv-encrypted: ${(request_headers['wtv-encrypted']) ? wtvshared.parseBool(request_headers['wtv-encrypted']) : true}
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
	if (session_data.lockdown) {
		home_url = minisrv_config.config.unauthorized_url;
	}
	else if (request_headers.query.guest_login && minisrv_config.config.allow_guests) {
		var namerand = Math.floor(Math.random() * 100000);
		var nickname = (minisrv_config.config.service_name + '_' + namerand)
		var human_name = nickname;
		var userid = '1' + Math.floor(Math.random() * 1000000000000000000);
		var messenger_enabled = 0;
		var messenger_authorized = 0;		
		var timezone = "-0000";
		if (request_headers.query.skip_splash) gourl = "wtv-home:/home?";
		else gourl = "wtv-home:/splash?";
	} else if (!session_data.getSessionData("registered")) {
		var errpage = wtvshared.doErrorPage(400);
		headers = errpage[0];
		data = errpage[1];
	} else {
		var userid = session_data.getSessionData("subscriber_userid")
		if (userid === null) {
			userid = '1' + Math.floor(Math.random() * 1000000000000000000);
			session_data.setSessionData("subscriber_userid", userid);
		}
		var nickname = session_data.getSessionData("subscriber_username");
		var human_name = session_data.getSessionData("subscriber_name") || nickname;
		var messenger_enabled = session_data.getSessionData("messenger_enabled") || 0;
		var messenger_authorized = session_data.getSessionData("messenger_authorized") || 0;
		var messenger_email = session_data.getSessionData("messenger_email");
		var timezone = session_data.getSessionData("timezone") || "-0000";
		var gourl = "wtv-home:/splash?";
	}
	var limitedLogin = session_data.lockdown;
	var limitedLoginRegistered = (limitedLogin || (session_data.isRegistered() && !session_data.isUserLoggedIn()) && session_data.getUserPasswordEnabled());
	if (!session_data.getUserPasswordEnabled()) session_data.setUserLoggedIn(true);
	var offline_user_list = null;
	if (session_data.isRegistered()) {
		// check for SMTP Password
		if (session_data.getSessionData("subscriber_smtp_password") === null) {
			session_data.setUserSMTPPassword(wtvshared.generatePassword(16));
        }
		if (session_data.user_id == 0) {
			var accounts = session_data.listPrimaryAccountUsers();
			var num_accounts = session_data.getNumberOfUserAccounts();
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
    }

	if (limitedLoginRegistered) {
		home_url = "wtv-head-waiter:/password?";
		gourl = home_url;
	}

	data = '';

	headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-head-waiter:
`;

	if (!limitedLogin && !limitedLoginRegistered) {
		strf = strftime.timezone(timezone);
		headers += `wtv-country: US
wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: GMT
wtv-client-date: ${strf("%a, %d %b %Y %H:%M:%S", new Date(new Date().setUTCSeconds(new Date().getUTCSeconds())))}
wtv-language-header: en-US,en
wtv-noback-all: wtv-
wtv-transition-override: off
wtv-smartcard-inserted-message: Contacting service
wtv-addresses-url: wtv-mail:/addresslist
wtv-ssl-timeout: 240
wtv-login-timeout: 7200
`;
		if (bootrom !== 0) {
			headers += `wtv-visit: client:closeallpanels
wtv-expire-all: client:closeallpanels
`;
        }
		if (!limitedLogin && !limitedLoginRegistered) {
			session_data.assignMailStore();
			headers += "wtv-service: reset\n";
			headers += getServiceString('all', { "exceptions": ["wtv-register"] });
			if (offline_user_list) headers += "wtv-offline-user-list: " + offline_user_list + "\n";
			headers += `wtv-messenger-authorized: ${messenger_authorized}
wtv-messenger-enable: ${messenger_enabled}
wtv-messagewatch-checktimeoffset: off
wtv-messenger-server: msnmsgr.escargot.chat
wtv-user-name: ${session_data.getSessionData("messenger_email")}
wtv-messenger-login-url: wtv-passport:/messengerlogin
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
wtv-ssl-certs-download-url: wtv-head-waiter:/download-ssl-certs
wtv-ssl-certs-checksum: 9BD865819765B66A2756F98FB4EEFBD4
`;

		if (!limitedLogin && !limitedLoginRegistered) {
			headers += `wtv-bypass-proxy: false
user-id: ${userid}
wtv-human-name: ${human_name}
${session_data.setIRCNick(nickname)}
wtv-domain: ${session_data.getSessionData("messenger_domain")}
passport-domain: ${session_data.getSessionData("messenger_domain")}
wtv-mail-url: wtv-mail:/listmail
wtv-favorite-url: wtv-favorite:/favorite
wtv-favorites-folders-url: wtv-favorite:/list-folders
wtv-favorite-index-url: wtv-favorite:/favorite-index?
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

		if (!limitedLogin && !limitedLoginRegistered) {
			headers += "wtv-relogin-url: wtv-head-waiter:/relogin?relogin=true\n";
			if (request_headers.query.guest_login) headers += "&guest_login=true\n";

			headers += "wtv-reconnect-url: wtv-head-waiter:/login-stage-two?reconnect=true\n";
			if (request_headers.query.guest_login) headers += "&guest_login=true\n";

			headers += "wtv-boot-url: wtv-head-waiter:/relogin?relogin=true\n";
			if (request_headers.query.guest_login) headers += "&guest_login=true\n ";			
			headers += "wtv-home-url: " + home_url + "\n";
		}

		if (session_data.get('wtv-need-upgrade') != 'true' && !request_headers.query.reconnect && !limitedLogin && !limitedLoginRegistered)
			headers += "wtv-settings-url: wtv-setup:/get\n";

		if (!limitedLogin && !limitedLoginRegistered) {
			headers += `wtv-force-lightweight-targets: webtv.net:/
wtv-show-time-enabled: true
wtv-allow-dsc: true
wtv-tourist-enabled: false
wtv-offline-mail-enable: false
wtv-demo-mode: 0
wtv-wink-deferrer-retries: 3
wtv-name-server: 8.8.8.8`;
			if (bootrom !== 0) { headers += "\nwtv-open-isp-disabled: false" }
		}
	}
	if (!request_headers.query.reconnect) headers += "\nwtv-visit: " + gourl;
	headers += "\nContent-Type: text/html";
}