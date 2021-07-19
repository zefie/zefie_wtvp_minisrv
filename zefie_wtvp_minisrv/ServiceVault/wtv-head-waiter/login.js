var challenge_response, challenge_header = '';

if (socket.ssid !== null) {
	var wtvsec_login = ssid_sessions[socket.ssid].get("wtvsec_login");
	if (request_headers["wtv-ticket"]) {
		if (wtvsec_login.ticket_b64 == null) {
			if (request_headers["wtv-ticket"].length > 8) {
				wtvsec_login.DecodeTicket(request_headers["wtv-ticket"]);
				wtvsec_login.ticket_b64 = request_headers["wtv-ticket"];
			}
		}
	} else {
		if (wtvsec_login) {
			challenge_response = wtvsec_login.challenge_response;
			var client_challenge_response = request_headers["wtv-challenge-response"] || null;
			if (challenge_response && client_challenge_response) {
				if (challenge_response.toString(CryptoJS.enc.Base64).substring(0, 85) == client_challenge_response.substring(0, 85)) {
					console.log(" * wtv-challenge-response success for " + socket.ssid);
					wtvsec_login.PrepareTicket();
				} else {
					challenge_header = "wtv-challenge: " + wtvsec_login.IssueChallenge();
				}
			} else {
				challenge_header = "wtv-challenge: " + wtvsec_login.IssueChallenge();
			}
		} else {
			wtvsec_login = new WTVSec();

        }
	}
}

/*
if (request_headers) {
	var cookiedata = {};
	Object.keys(request_headers).forEach(function (k) {
		switch (k) {
			case "wtv-capability-flags":
			case "wtv-system-version":
			case "wtv-client-rom-type":
			case "wtv-client-bootrom-version":
			case "wtv-system-chipversion":
			case "wtv-system-sysconfig":
			case "wtv-system-cpuspeed":
				cookiedata[k] = request_headers[k];
				break;
		}
	});
}
*/

if (challenge_header != '') {
	headers = `200 OK
Connection: Keep-Alive
Expires: Wed, 09 Oct 1991 22:00:00 GMT
wtv-expire-all: wtv-head-waiter:
`+ getServiceString('wtv-log') + `
wtv-log-url: wtv-log:/log
`+ challenge_header + `
wtv-relogin-url: wtv-1800:/preregister?relogin=true
wtv-reconnect-url: wtv-1800:/preregister?reconnect=true
wtv-visit: wtv-head-waiter:/login-stage-two?
Content-type: text/html`;
	data = '';
} else {
	headers = `200 OK
Connection: Keep-Alive
Expires: Wed, 09 Oct 1991 22:00:00 GMT
wtv-expire-all: wtv-head-waiter:
wtv-expire-all: wtv-1800:
wtv-visit: wtv-1800:/preregister?relogin=true
Content-type: text/html`;

}