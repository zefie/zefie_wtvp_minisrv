var gourl = "wtv-head-waiter:/login?";
if (request_headers.query.relogin) gourl += "relogin=true";
var send_initial_key = true;

if (socket.ssid) {
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
            if (i > 0 && zdebug) console.log(" # Closed", i, "previous sockets for", filterSSID(socket.ssid));
        }
    }
    if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
        delete ssid_sessions[socket.ssid].data_store.wtvsec_login;
    }

	ssid_sessions[socket.ssid].data_store.wtvsec_login = new WTVSec();
	ssid_sessions[socket.ssid].data_store.wtvsec_login.IssueChallenge();
	ssid_sessions[socket.ssid].data_store.wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
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
	var file_path = null;
	var bf0app_update = false;
	var romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
	var send_tellyscripts = (minisrv_config.services[service_name].send_tellyscripts && !request_headers.query.relogin);
	var wtv_script_id = parseInt(ssid_sessions[socket.ssid].get("wtv-script-id"));
	var	bootrom = ssid_sessions[socket.ssid].get("wtv-client-bootrom-version");
	if (request_headers.query.relogin && wtv_script_id != 0) send_tellyscript = false;
	if (send_tellyscripts) {
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
			prereg_contype = "text/tellyscript";
			// if wtv-open-access: true then client expects OpenISP
			if (ssid_sessions[socket.ssid].get("wtv-open-access") == "true") var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/LC2/LC2_OISP_5555732_56k.tok";
			else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/LC2/lc2_production_normal.tok";
			break;

		case "US-LC2-disk-0MB-8MB-softmodem-CPU5230":
			prereg_contype = "text/tellyscript";
			// if wtv-open-access: true then client expects OpenISP
			if (ssid_sessions[socket.ssid].get("wtv-open-access") == "true") var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/DERBY/derby_production_normal.tok";
			else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/DERBY/derby_production_normal.tok";
			break;

		case "US-WEBSTAR-disk-0MB-16MB-softmodem-CPU5230":
			prereg_contype = "text/tellyscript";
			// if wtv-open-access: true then client expects OpenISP
			if (ssid_sessions[socket.ssid].get("wtv-open-access") == "true") var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/WEBSTAR/dishplayer_production_normal.tok";
			else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/WEBSTAR/dishplayer_production_normal.tok";
			break;

		case "JP-Fiji":
			prereg_contype = "text/tellyscript";
			// if wtv-open-access: true then client expects OpenISP
			if (ssid_sessions[socket.ssid].get("wtv-open-access") == "true") var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/DC/dc_production_normal.tok";
			else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/DC/dc_production_normal.tok";
			break;

		case "bf0app":
			prereg_contype = "text/tellyscript";
			// if wtv-open-access: true then client expects OpenISP
			if (ssid_sessions[socket.ssid].get("wtv-open-access") == "true") var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/BF0APP/bf0app_production_braindead.tok";
			else var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/BF0APP/bf0app_production_braindead.tok";
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
		var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/bf0app/bf0app_production_braindead.tok";
		bf0app_update = true;
	}
	
	if (request_headers["wtv-ticket"]) {
		gourl = "wtv-head-waiter:/login-stage-two?relogin=true";
		send_initial_key = false;
	}	

	headers = "200 OK\n"
	headers += "Connection: Keep-Alive\n";
	if (send_initial_key) headers += "wtv-initial-key: " + ssid_sessions[socket.ssid].data_store.wtvsec_login.challenge_key.toString(CryptoJS.enc.Base64) + "\n";
	headers += "Content-Type: " + prereg_contype + "\n";
	headers += "wtv-service: reset\n";
	headers += getServiceString('wtv-1800') + "\n";
	headers += getServiceString('wtv-star') + "\n";
	if (!bf0app_update) headers += getServiceString('wtv-head-waiter') + "\n";
	headers += getServiceString('wtv-flashrom') + "\n";
	if (!bf0app_update) headers += "wtv-boot-url: wtv-1800:/preregister?relogin=true\n"
	if (!bf0app_update) headers += "wtv-open-isp-disabled: false\n";
	if (!bf0app_update) headers += "wtv-visit: "+gourl+"\n";
	if (!bf0app_update) headers += "wtv-client-time-zone: GMT -0000\n";
	if (!bf0app_update) headers += "wtv-client-time-dst-rule: GMT\n"
	if (!bf0app_update) headers += "wtv-client-date: " + strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString())) + " GMT";

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