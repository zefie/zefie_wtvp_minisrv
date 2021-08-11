	var gourl = "wtv-head-waiter:/login?";

	if (socket.ssid) {
		if (ssid_sessions[socket.ssid].loadSessionData() == true) {
			console.log(" * Loaded session data from disk for", wtvshared.filterSSID(socket.ssid))
			ssid_sessions[socket.ssid].setSessionData("registered", (ssid_sessions[socket.ssid].getSessionData("registered") == true) ? true : false);
		} else {
			ssid_sessions[socket.ssid].session_data = {};
			ssid_sessions[socket.ssid].setSessionData("registered", false);
		}
		if (ssid_sessions[socket.ssid].data_store) {
			if (ssid_sessions[socket.ssid].data_store.sockets) {
				var i = 0;
				ssid_sessions[socket.ssid].data_store.sockets.forEach(function (k) {
					if (typeof k != "undefined") {
						if (k != socket) {
							k.destroy();
							ssid_sessions[socket.ssid].data_store.sockets.delete(k);
							i++;
						}
					}
				});
				if (i > 0 && minisrv_config.config.debug_flags.debug) console.log(" # Closed", i, "previous sockets for", wtvshared.filterSSID(socket.ssid));
			}
		}
		if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
			if (minisrv_config.config.debug_flags.debug) console.log(" # Recreating primary WTVSec login instance for", wtvshared.filterSSID(socket.ssid));
			delete ssid_sessions[socket.ssid].data_store.wtvsec_login;
		}

		ssid_sessions[socket.ssid].data_store.wtvsec_login = new WTVSec(minisrv_config);
		ssid_sessions[socket.ssid].data_store.wtvsec_login.IssueChallenge();
		ssid_sessions[socket.ssid].data_store.wtvsec_login.set_incarnation(request_headers["wtv-incarnation"] || 1);
	} else {
		console.log(" * Something bad happened (we don't know the client ssid???)");
		var errpage = doErrorPage(400)
		headers = errpage[0];
		data = errpage[1];
	}

	if (request_headers.query.relogin && ssid_sessions[socket.ssid].getSessionData("registered")) gourl += "relogin=true";
	if (request_headers.query.reconnect && ssid_sessions[socket.ssid].getSessionData("registered")) gourl += "reconnect=true";

if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
	var prereg_contype = "text/html";

	if (request_headers.query.relogin) { // relogin
		ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 = null; // clear old ticket
	}

	// if relogin and wtv-script-id != 0, skip tellyscript
	ssid_sessions[socket.ssid].set("wtv-open-access", (request_headers['wtv-open-access'] == "true") ? true : false);
	var file_path = null;
	var bf0app_update = false;
	var romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
	var send_tellyscript = (minisrv_config.services[service_name].send_tellyscripts && !request_headers.query.relogin);
	var wtv_script_id = parseInt(ssid_sessions[socket.ssid].get("wtv-script-id"));
	var bootrom = ssid_sessions[socket.ssid].get("wtv-client-bootrom-version");
	if ((request_headers.query.reconnect || request_headers.query.relogin) && wtv_script_id != 0) send_tellyscript = false;
	if (send_tellyscript) {
		if (minisrv_config.services[service_name].send_tellyscript_ssid_whitelist) {
			var send_telly_to_ssid = (minisrv_config.services[service_name].send_tellyscript_ssid_whitelist.findIndex(element => element == socket.ssid) != -1)
			if (send_telly_to_ssid) {
				romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
			}
		} else {
			romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
		}

		switch (romtype) {
			case "US-LC2-disk-0MB-8MB":
			case "US-LC2-disk-0MB-8MB-softmodem-CPU5230":
			case "US-BPS-flashdisk-0MB-8MB-softmodem-CPU5230":
			case "US-LC2-flashdisk-0MB-16MB-softmodem-CPU5230":
			case "US-WEBSTAR-disk-0MB-16MB-softmodem-CPU5230":
				prereg_contype = "text/tellyscript";
				// if wtv-open-access: true then client expects OpenISP
				if (ssid_sessions[socket.ssid].get("wtv-open-access")) var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/LC2/LC2_OpenISP_56k.tok";
				else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/LC2/LC2_WTV_18006138199.tok";
				break;

			case "bf0app":
				prereg_contype = "text/tellyscript";
				// if wtv-open-access: true then client expects OpenISP
				if (ssid_sessions[socket.ssid].get("wtv-open-access")) var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/bf0app/bf0app_OISP.tok";
				else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/bf0app/bf0app_WTV_18006138199.tok";
				break;

			// the following are not yet zefie generated and may have an unknown username/password attached

			case "JP-Fiji":
				prereg_contype = "text/tellyscript";
				// if wtv-open-access: true then client expects OpenISP
				if (ssid_sessions[socket.ssid].get("wtv-open-access")) var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/FIJI/dc_production_normal.tok";
				else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/FIJI/dc_production_normal.tok";
				break;

			default:
				data = '';
				break;
		}
	}


	if (!request_headers['wtv-client-rom-type'] && bootrom == "105") {
		// assume old classic in flash mode, override user setting and send tellyscript
		// because it is required to proceed in flash mode
		prereg_contype = "text/tellyscript";
		var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/bf0app/bf0app_WTV_18006138199.tok";
		var bf0app_update = true;
		ssid_sessions[socket.ssid].set("bf0app_update", bf0app_update);
	}

	if (request_headers["wtv-ticket"] && !request_headers.query.reconnect) {
		gourl = "wtv-head-waiter:/login-stage-two?relogin=true";
	}

	if (request_headers.query.reconnect) gourl = null;

	if (!file_path != null && !minisrv_config.config.debug_flags.quiet) console.log(" * Sending TellyScript", file_path, "on socket", socket.id);

	if (request_headers.query.guest_login) {
		send_tellyscript = false;
		if (gourl != null) gourl += "&guest_login=true"
		if (request_headers.query.skip_splash) gourl += "&skip_splash=true";
	}

	headers = "200 OK\n"
	if (bf0app_update) headers += "minisrv-use-carriage-return: false\n";
	headers += "Connection: Keep-Alive\n";
	headers += "wtv-initial-key: " + ssid_sessions[socket.ssid].data_store.wtvsec_login.challenge_key.toString(CryptoJS.enc.Base64) + "\n";
	headers += "Content-Type: " + prereg_contype + "\n";
	if (!request_headers.query.reconnect) headers += "wtv-service: reset\n";
	if (!bf0app_update) headers += getServiceString('wtv-1800') + "\n";

	if (bf0app_update) headers += getServiceString('wtv-head-waiter', { "flags": "0x00000001" }) + "\n";
	else headers += getServiceString('wtv-head-waiter') + "\n";

	if (bf0app_update) headers += getServiceString('wtv-star', { "no_star_word": true }) + "\n";
	else headers += getServiceString('wtv-star') + "\n";
	if (request_headers.query.reconnect && !ssid_sessions[socket.ssid].getSessionData("registered")) headers += getServiceString('wtv-register') + "\n";
	headers += getServiceString('wtv-flashrom') + "\n";
	if (bf0app_update) headers += "wtv-boot-url: " + gourl + "\n";
	else {
		headers += "wtv-boot-url: wtv-head-waiter:/relogin?relogin=true";
		if (request_headers.query.guest_login) headers += "&guest_login=true";
		headers += "\n";
	}
	if (gourl != null) headers += "wtv-visit: " + gourl + "\n";
	if (!bf0app_update && ssid_sessions[socket.ssid].get("wtv-open-access")) headers += "wtv-open-isp-disabled: false\n";
	headers += "wtv-client-time-zone: GMT -0000\n";
	headers += "wtv-client-time-dst-rule: GMT\n"
	headers += "wtv-client-date: " + strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString())) + " GMT";

	if (file_path) {
		request_is_async = true;
		fs.readFile(file_path, null, function (err, file_read_data) {
			if (err) {
				var errmsg = doErrorPage(400);
				headers = errmsg[0];
				file_read_data = errmsg[1] + "\n" + err.toString();
			}
			sendToClient(socket, headers, file_read_data);
		});
	}
} else {
	var errpage = doErrorPage(400);
	headers = errpage[0];
	data = errpage[1];
}