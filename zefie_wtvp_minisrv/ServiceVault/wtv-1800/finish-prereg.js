if (socket.ssid != null) {
	if (!ssid_sessions[socket.ssid].data_store.wtvsec_login) {
		ssid_sessions[socket.ssid].data_store.wtvsec_login = new WTVSec();
		ssid_sessions[socket.ssid].data_store.wtvsec_login.IssueChallenge();
		ssid_sessions[socket.ssid].data_store.wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
	}
} else {
	console.log(" * Something bad happened (we don't know the client ssid???)");
	var errpage = doErrorCode(400)
	headers = errpage[0];
	data = errpage[1];
}

if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
	var prereg_contype = "text/html";

	if (request_headers.query.relogin) { // relogin
		ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 = null; // clear old ticket
	}

	// if relogin and wtv-script-id != 0, skip tellyscript
	var romtype, file_path = null;
	var send_tellyscript = true;
	var wtv_script_id = parseInt(ssid_sessions[socket.ssid].get("wtv-script-id"));
	if (request_headers.query.relogin && wtv_script_id != 0) send_tellyscript = false;
	if (send_tellyscript && minisrv_config.services[service_name].send_tellyscripts) {
		if (minisrv_config.services[service_name].send_tellyscript_ssid_whitelist) {
			var send_telly_to_ssid = (minisrv_config.services[service_name].send_tellyscript_ssid_whitelist.findIndex(element => element == socket.ssid) != -1)
			if (send_telly_to_ssid) romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
		} else {
			romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
		}
	}

	switch (romtype) {
		case "US-LC2-disk-0MB-8MB":
			prereg_contype = "text/tellyscript";
			// if wtv-open-access: true then client expects OpenISP
			if (ssid_sessions[socket.ssid].get("wtv-open-access") == "true") var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/LC2/LC2_OISP_5555732_56k.tok";
			else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/LC2/LC2_WTV_18006138199_56k.tok";
			break;

		default:
			data = '';
			break;
	}

	headers = `200 OK
Connection: Keep-Alive
wtv-initial-key: ` + ssid_sessions[socket.ssid].data_store.wtvsec_login.challenge_key.toString(CryptoJS.enc.Base64) + `
Content-Type: `+ prereg_contype + `
wtv-service: reset
` + getServiceString('wtv-1800') + `
` + getServiceString('wtv-star') + `
` + getServiceString('wtv-head-waiter') + `
` + getServiceString('wtv-flashrom') + `
wtv-boot-url: wtv-1800:/preregister?relogin=true
wtv-visit: wtv-head-waiter:/login?
wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: GMT
wtv-client-date: `+ strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString())) + ` GMT`;

	if (file_path) {
		request_is_async = true;
		fs.readFile(file_path, null, function (err, file_read_data) {
			if (err) {
				var errmsg = doErrorCode(400);
				headers = errmsg[0];
				file_read_data = errmsg[1] + "\n" + err.toString();
			}
			sendToClient(socket, headers, file_read_data);
		});
	}
} else {
	var errpage = doErrorCode(400);
	headers = errpage[0];
	data = errpage[1];
}