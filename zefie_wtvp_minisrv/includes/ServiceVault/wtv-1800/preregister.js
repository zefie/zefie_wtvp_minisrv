var minisrv_service_file = true;

var gourl = "wtv-head-waiter:/login?";


if (session_data) {
	if (session_data.loadSessionData() == true) {
		console.log(" * Loaded session data from disk for", wtvshared.filterSSID(socket.ssid))
		session_data.setSessionData("registered", (session_data.getSessionData("registered") == true) ? true : false);
	} else {
		session_data.session_data = {};
		session_data.setSessionData("registered", false);
	}
	if (session_data.data_store) {
		if (session_data.data_store.sockets) {
			var i = 0;
			session_data.data_store.sockets.forEach(function (k) {
				if (typeof k != "undefined") {
					if (k != socket) {
						k.destroy();
						session_data.data_store.sockets.delete(k);
						i++;
					}
				}
			});
			if (i > 0 && minisrv_config.config.debug_flags.debug) console.log(" # Closed", i, "previous sockets for", wtvshared.filterSSID(socket.ssid));
		}
	}
	if (session_data.data_store.wtvsec_login) {
		if (minisrv_config.config.debug_flags.debug) console.log(" # Recreating primary WTVSec login instance for", wtvshared.filterSSID(socket.ssid));
		delete session_data.data_store.wtvsec_login;
	}

	session_data.data_store.wtvsec_login = session_data.createWTVSecSession();
	session_data.data_store.wtvsec_login.IssueChallenge();
	if (request_headers["wtv-incarnation"]) session_data.data_store.wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
} else {
	console.log(" * Something bad happened (we don't know the client ssid???)");
	var errpage = wtvshared.doErrorPage(400)
	headers = errpage[0];
	data = errpage[1];
}

if (request_headers.query.relogin && session_data.getSessionData("registered")) {
	gourl += "relogin=true";
	session_data.setUserLoggedIn(false);
}
if (request_headers.query.reconnect && session_data.getSessionData("registered")) gourl += "reconnect=true";

if (session_data.data_store.wtvsec_login) {
	var prereg_contype = "text/html";

	if (request_headers.query.relogin || request_headers.query.guest_login) { // relogin
		session_data.data_store.wtvsec_login.ticket_b64 = null; // clear old ticket
	}

	// if relogin and wtv-script-id != 0, skip tellyscript
	session_data.set("wtv-open-access", (request_headers['wtv-open-access'] == "true") ? true : false);
	var file_path = null;
	var bf0app_update = false;
	var romtype = session_data.get("wtv-client-rom-type");
	var bootrom = parseInt(session_data.get("wtv-client-bootrom-version"));
	var send_tellyscript = (minisrv_config.services[service_name].send_tellyscripts && !request_headers.query.relogin && !request_headers.query.guest_login && !bootrom !== 0);
	var wtv_script_id = parseInt(session_data.get("wtv-script-id"));
	var wtv_script_mod = parseInt(session_data.get("wtv-script-mod"));
	if ((request_headers.query.reconnect || request_headers.query.relogin) && wtv_script_id != 0) send_tellyscript = false;
	if (wtv_script_id !== 0 && wtv_script_mod !== 0) send_tellyscript = false;
	if (!minisrv_config.services[service_name].send_tellyscript_to_mame) {
		if (wtvshared.parseSSID(socket.ssid).boxType == "MAME") {
			send_tellyscript = false;
		}
	}	
	if (send_tellyscript) {
		if (minisrv_config.services[service_name].send_tellyscript_ssid_whitelist) {
			var send_telly_to_ssid = (minisrv_config.services[service_name].send_tellyscript_ssid_whitelist.findIndex(element => element == socket.ssid) != -1)
			if (send_telly_to_ssid) {
				romtype = session_data.get("wtv-client-rom-type");
			}
		} else {
			romtype = session_data.get("wtv-client-rom-type");
		}
		switch (romtype) {
			case "US-LC2-disk-0MB-8MB":
			case "US-LC2-disk-0MB-8MB-softmodem-CPU5230":
			case "US-BPS-flashdisk-0MB-8MB-softmodem-CPU5230":
			case "US-LC2-flashdisk-0MB-16MB-softmodem-CPU5230":
			case "US-WEBSTAR-disk-0MB-16MB-softmodem-CPU5230":
				prereg_contype = "text/tellyscript";
				// if wtv-open-access: true then client expects OpenISP
				if (session_data.get("wtv-open-access")) file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/LC2/LC2_OpenISP_56k.tok", true);
				else file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/LC2/LC2_WTV_18006138199.tok", true);
				break;

			case "US-DTV-disk-0MB-32MB-softmodem-CPU5230":
				if (wtvshared.isMiniBrowser(session_data)) {
					prereg_contype = "text/tellyscript";
					if (session_data.get("wtv-open-access")) file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/LC2/LC2_OpenISP_56k.tok", true);
					else file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/LC2/LC2_WTV_18006138199.tok", true);
				} else {
					prereg_contype = "text/dialscript";
					if (session_data.get("wtv-lan") == "true") {
						file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/UTV/utv_hsd.tok", true);
					} else {
						// todo OpenISP telly
						file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/UTV/utv_normal.tok", true);
					}
				}
				break;

			case "bf0app":
				prereg_contype = "text/tellyscript";
				// if wtv-open-access: true then client expects OpenISP
				if (session_data.get("wtv-open-access")) file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/bf0app/bf0app_OISP.tok", true);
				else file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/bf0app/bf0app_WTV_18006138199.tok", true);
				break;

			// the following are not yet zefie generated and may have an unknown username/password attached

			case "JP-Fiji":
				prereg_contype = "text/tellyscript";
				// if wtv-open-access: true then client expects OpenISP
				if (session_data.get("wtv-open-access")) var file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/FIJI/dc_production_normal.tok", true);
				else var file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/FIJI/dc_production_normal.tok", true);
				break;

			default:
				data = '';
				break;
		}

		if (socket.ssid.substr(0, 8) == "MSTVSIMU") {
			prereg_contype = "text/dialscript";
			var file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/UTV/utv_hsd.tok", true);
		}
	}


	if (!request_headers['wtv-client-rom-type'] && bootrom == "105") {
		// assume old classic in flash mode, override user setting and send tellyscript
		// because it is required to proceed in flash mode
		prereg_contype = "text/tellyscript";
		var file_path = wtvshared.getServiceDep("/wtv-1800/tellyscripts/bf0app/bf0app_WTV_18006138199.tok", true);
		var bf0app_update = true;
		session_data.set("bf0app_update", bf0app_update);
	}

	if (request_headers["wtv-ticket"] && !request_headers.query.reconnect) {
		gourl = "wtv-head-waiter:/login-stage-two?relogin=true";
	}

	if (request_headers.query.reconnect) gourl = null;

	if (request_headers.query.guest_login) {
		send_tellyscript = false;
		if (gourl != null) gourl += "&guest_login=true"
		if (request_headers.query.skip_splash) gourl += "&skip_splash=true";
	}

	if (!file_path != null && send_tellyscript && !minisrv_config.config.debug_flags.quiet) console.log(" * Sending TellyScript", file_path, "on socket", socket.id);


	headers = "200 OK\n"
	headers += "minisrv-no-mail-count: true\n";
	if (bf0app_update) headers += "minisrv-use-carriage-return: false\n";
	headers += "Connection: Keep-Alive\n";
	headers += "wtv-initial-key: " + session_data.data_store.wtvsec_login.challenge_key.toString(CryptoJS.enc.Base64) + "\n";
	headers += "Content-Type: " + prereg_contype + "\n";
	if (!request_headers.query.reconnect) headers += "wtv-service: reset\n";
	if (!bf0app_update) headers += getServiceString('wtv-1800') + "\n";

	if (bf0app_update) headers += getServiceString('wtv-head-waiter', { "flags": "0x00000001" }) + "\n";
	else headers += getServiceString('wtv-head-waiter') + "\n";

	if (bf0app_update) headers += getServiceString('wtv-star', { "no_star_word": true }) + "\n";
	else headers += getServiceString('wtv-star') + "\n";
	if (request_headers.query.reconnect && !session_data.isRegistered() && !session_data.lockdown) headers += getServiceString('wtv-register') + "\n";
	if (!session_data.lockdown) headers += getServiceString('wtv-flashrom') + "\n";
	if (bf0app_update) headers += "wtv-boot-url: " + gourl + "\n";
	else {
		headers += "wtv-boot-url: wtv-head-waiter:/relogin?relogin=true";
		if (request_headers.query.guest_login) headers += "&guest_login=true";
		headers += "\n";
	}
	if (gourl != null) headers += "wtv-visit: " + gourl + "\n";
	if (!bf0app_update && session_data.get("wtv-open-access")) headers += "wtv-open-isp-disabled: false\n";
	headers += "wtv-client-time-zone: GMT -0000\n";
	headers += "wtv-client-time-dst-rule: GMT\n"
	const now = new Date();
	const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
	headers += "wtv-client-date: " + strftime("%a, %d %b %Y %H:%M:%S GMT", utcTime);

	if (file_path) {
		request_is_async = true;
		fs.readFile(file_path, null, function (err, file_read_data) {
			if (err) {
				var errmsg = wtvshared.doErrorPage(400);
				headers = errmsg[0];
				file_read_data = errmsg[1] + "\n" + err.toString();
			}
			sendToClient(socket, headers, file_read_data);
		});
	}
} else {
	var errpage = wtvshared.doErrorPage(400);
	headers = errpage[0];
	data = errpage[1];
}