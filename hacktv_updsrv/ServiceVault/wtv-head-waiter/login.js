var challenge_response, challenge_header = '';

if (socket_session_data[socket.id].ssid !== null) {
	if (initial_headers['wtv-ticket']) {
		if (sec_session[socket_session_data[socket.id].ssid].ticket_b64 == null) {
			if (initial_headers['wtv-ticket'].length > 8) {
				sec_session[socket_session_data[socket.id].ssid].DecodeTicket(initial_headers['wtv-ticket']);
				sec_session[socket_session_data[socket.id].ssid].ticket_b64 = initial_headers['wtv-ticket'];
			}
		}
	} else {
		challenge_response = sec_session[socket_session_data[socket.id].ssid].challenge_response;
		var client_challenge_response = initial_headers['wtv-challenge-response'] || null;
		if (challenge_response && client_challenge_response) {		
			if (challenge_response.toString(CryptoJS.enc.Base64).substring(0,85) == client_challenge_response.substring(0,85)) {
				console.log(" * wtv-challenge-response success for "+socket_session_data[socket.id].ssid);
				sec_session[socket_session_data[socket.id].ssid].PrepareTicket();				
			} else {
				challenge_header = "wtv-challenge: "+issueWTVChallenge(socket);
			}
		} else {
			challenge_header = "wtv-challenge: "+issueWTVChallenge(socket);
		}
	}
}

/*
if (initial_headers) {
	var cookiedata = {};
	Object.keys(initial_headers).forEach(function (k) {
		switch (k) {
			case "wtv-capability-flags":
			case "wtv-system-version":
			case "wtv-client-rom-type":
			case "wtv-client-bootrom-version":
			case "wtv-system-chipversion":
			case "wtv-system-sysconfig":
			case "wtv-system-cpuspeed":
				cookiedata[k] = initial_headers[k];
				break;
		}
	});
}
*/
headers = `200 OK
Connection: Keep-Alive
Expires: Wed, 09 Oct 1991 22:00:00 GMT
wtv-expire-all: wtv-head-waiter:
`+getServiceString('wtv-log')+`
wtv-log-url: wtv-log:/log
`+challenge_header+`
wtv-relogin-url: wtv-1800:/preregister?relogin=true
wtv-reconnect-url: wtv-1800:/preregister?reconnect=true
wtv-visit: wtv-head-waiter:/login-stage-two?
Content-type: text/html`;
data = '';
