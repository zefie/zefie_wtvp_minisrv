if (socket_session_data[socket.id].ssid != null && !getSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login')) {
	var wtvsec_login = new WTVSec();
	wtvsec_login.IssueChallenge();
	wtvsec_login.set_incarnation(request_headers['wtv-incarnation']);
	setSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login', wtvsec_login)
} else {
	var wtvsec_login = getSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login')
}

var contype = "text/tellyscript";

var skip_tellyscript = false;

// if relogin, skip tellyscript
if (query['relogin']) {
	contype = "text/html"; // skip tellyscript
	wtvsec_login.ticket_b64 = null; // clear old ticket
}

headers = `200 OK
Connection: Keep-Alive
wtv-initial-key: ` + wtvsec_login.challenge_key.toString(CryptoJS.enc.Base64) + `
Content-Type: `+ contype + `
wtv-service: reset
` + getServiceString('wtv-1800') + `
` + getServiceString('wtv-star') + `
` + getServiceString('wtv-head-waiter') + `
` + getServiceString('wtv-flashrom') + `
wtv-boot-url: wtv-1800:/preregister?relogin=true
wtv-visit: wtv-head-waiter:/login?
wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: GMT
wtv-client-date: `+strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString()))+` GMT`;

// if relogin, skip tellyscript
var romtype = null;
if (!query['relogin'] && skip_tellyscript == false) {
	var romtype = getSessionData(socket_session_data[socket.id].ssid, 'wtv-client-rom-type');
}

switch (romtype) {
	case "US-LC2-disk-0MB-8MB":
		data = getFile("LC2/LC2_OISP_5555732_56k.tok", true);
		break;

	default:
		data = '';
		break;
}