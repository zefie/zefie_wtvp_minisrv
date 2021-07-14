if (socket_session_data[socket.id].ssid != null && !sec_session[socket_session_data[socket.id].ssid]) {
	sec_session[socket_session_data[socket.id].ssid] = new WTVSec();
	sec_session[socket_session_data[socket.id].ssid].IssueChallenge();
	sec_session[socket_session_data[socket.id].ssid].set_incarnation(request_headers['wtv-incarnation']);
}

var contype = "text/tellyscript";

// skip telly for now
var notelly = true;

// if relogin, skip tellyscript
if (query['relogin']) {
	contype = "text/html"; // skip tellyscript
	sec_session[socket_session_data[socket.id].ssid].ticket_b64 = null; // clear old ticket
}

headers = `200 OK
Connection: Keep-Alive
wtv-initial-key: ` + issueWTVInitialKey(socket) + `
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
if (query['relogin'] == false || notelly == false) {
	var romtype = getSessionData(socket_session_data[socket.id].ssid, 'wtv-client-rom-type');

	switch (romtype) {
		case "US-LC2-disk-0MB-8MB":
			data = getFile("LC2/LC2_OISP_5555732_56k.tok", true);
			break;

		default:
			data = '';
			break;
	}
}