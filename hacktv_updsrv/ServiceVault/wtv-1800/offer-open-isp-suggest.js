if (socket_session_data[socket.id].ssid != null && !sec_session[socket_session_data[socket.id].ssid]) {
	sec_session[socket_session_data[socket.id].ssid] = new WTVNetworkSecurity();
	sec_session[socket_session_data[socket.id].ssid].IssueChallenge();
	sec_session[socket_session_data[socket.id].ssid].set_incarnation(initial_headers['wtv-incarnation']);
}

headers = `200 OK
Connection: Close
wtv-initial-key: ` + issueWTVInitialKey(socket) + `
Content-Type: text/html
wtv-service: reset
wtv-service: name=wtv-* host=` + pubip + ` port=`+port+` flags=0x00000007
wtv-service: name=wtv-head-waiter host=` + pubip + ` port=`+port+` flags=0x04 flags=0x00000001 connections=1
wtv-service: name=wtv-flashrom host=` + pubip + ` port=`+port+` flags=0x00000040
wtv-service: name=htv-update host=` + pubip + ` port=`+port+` flags=0x04
wtv-boot-url: wtv-head-waiter:/login?
wtv-visit: wtv-head-waiter:/login?
wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: GMT
wtv-client-date: `+strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString()))+` GMT`;


/*
var romtype = socket_session_data[socket.id].romtype;

switch (romtype) {
	case "US-LC2-disk-0MB-8MB":
		data = getFile("LC2/artemis_18004653537.tok",true);
		break;
		
	default:
		data = '';
		break;
}

*/
data='';