var challenge_response, challenge_header = "";

var gourl = "wtv-head-waiter:/login-stage-two?";
if (request_headers.query.relogin) gourl += "relogin=true";
else if (request_headers.query.reconnect) gourl += "reconnect=true";

if (request_headers.query.guest_login) {
	if (request_headers.query.relogin || request_headers.query.reconnect) gourl += "&";
	gourl += "guest_login=true";
	if (request_headers.query.skip_splash) gourl += "&skip_splash=true";
}

var send_to_relogin = true;

if (socket.ssid) {
	if (ssid_sessions[socket.ssid]) {
		if (request_headers["wtv-ticket"]) {
			if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 == null) {
				if (request_headers["wtv-ticket"].length > 8) {
					ssid_sessions[socket.ssid].data_store.wtvsec_login.DecodeTicket(request_headers["wtv-ticket"]);
					ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_b64 = request_headers["wtv-ticket"];
					send_to_relogin = false;
				}
			}
		} else {
			if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
				var client_challenge_response = request_headers["wtv-challenge-response"] || null;
				if (challenge_response && client_challenge_response) {
					if (challenge_response.toString(CryptoJS.enc.Base64).substring(0, 85) == client_challenge_response.substring(0, 85)) {
						console.log(" * wtv-challenge-response success for " + socket.ssid);
						ssid_sessions[socket.ssid].data_store.wtvsec_login.PrepareTicket();
						send_to_relogin = false;
					} else {
						challenge_header = "wtv-challenge: " + ssid_sessions[socket.ssid].data_store.wtvsec_login.IssueChallenge();
						send_to_relogin = false;
					}
				} else {
					challenge_header = "wtv-challenge: " + ssid_sessions[socket.ssid].data_store.wtvsec_login.IssueChallenge();
					send_to_relogin = false;
				}
			}
		}
	}
}

if (!send_to_relogin) {

	headers = `200 OK
Connection: Keep-Alive
Expires: Wed, 09 Oct 1991 22:00:00 GMT
wtv-expire-all: wtv-head-waiter:
`+ getServiceString('wtv-log') + `
wtv-log-url: wtv-log:/log`;
	if (challenge_header != "") headers += "\n" + challenge_header;
	headers += `
wtv-relogin-url: wtv-head-waiter:/relogin?relogin=true
wtv-reconnect-url: wwtv-head-waiter:/relogin?reconnect=true
wtv-visit: ${gourl}
Content-type: text/html`;
	data = '';

} else {

	headers = `200 OK
Connection: Keep-Alive
Expires: Wed, 09 Oct 1991 22:00:00 GMT
wtv-expire-all: wtv-head-waiter:
wtv-expire-all: wtv-1800:
wtv-visit: wtv-head-waiter:/relogin?relogin=true
Content-type: text/html`;
	data = '';
}