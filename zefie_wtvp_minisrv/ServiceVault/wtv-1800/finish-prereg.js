if (socket_session_data[socket.id].ssid != null && !getSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login')) {
	var wtvsec_login = new WTVSec();
	wtvsec_login.IssueChallenge();
	wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
	setSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login', wtvsec_login)
} else {
	var wtvsec_login = getSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login')
}

var prereg_contype = "text/html";

// if relogin, skip tellyscript
if (request_headers.query.relogin) { // skip tellyscript
	wtvsec_login.ticket_b64 = null; // clear old ticket
}

// if relogin, skip tellyscript
var romtype, file_path = null;
if (!request_headers.query.relogin && services_configured.config.send_tellyscripts) {
	var romtype = getSessionData(socket_session_data[socket.id].ssid, 'wtv-client-rom-type');
}

switch (romtype) {
	case "US-LC2-disk-0MB-8MB":
		prereg_contype = "text/tellyscript";
		var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/LC2/LC2_OISP_5555732_56k.tok";
		break;

	default:
		data = '';
		break;
}

headers = `200 OK
Connection: Keep-Alive
wtv-initial-key: ` + wtvsec_login.challenge_key.toString(CryptoJS.enc.Base64) + `
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