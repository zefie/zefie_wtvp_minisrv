var initialChallenge, challenge_response, challenge_header = '';
var gourl = "wtv-head-waiter:/login-stage-two?";

if (socket_session_data[socket.id].ssid !== null) {
	if (sec_session[socket_session_data[socket.id].ssid].ticket_b64 == null) {
		if (initial_headers['wtv-ticket']) {
			if (initial_headers['wtv-ticket'].length > 8) {
				DecodeTicket(initial_headers['wtv-ticket']);
				sec_session[socket_session_data[socket.id].ssid].ticket_b64 = initial_headers['wtv-ticket'];
			}
		} else {
			challenge_response = sec_session[socket_session_data[socket.id].ssid].challenge_response;
			var client_challenge_response = initial_headers['wtv-challenge-response'] || null;
			if (challenge_response && client_challenge_response) {		
				if (challenge_response.toString(CryptoJS.enc.Base64).substring(0,85) == client_challenge_response.substring(0,85)) {
					console.log(" * wtv-challenge-response success for "+socket_session_data[socket.id].ssid);
					sec_session[socket_session_data[socket.id].ssid].PrepareTicket();
				} else {
					challenge_header = "wtv-challenge: "+sec_session[socket_session_data[socket.id].ssid].IssueChallenge();
				}
			} else {
				challenge_header = "wtv-challenge: "+sec_session[socket_session_data[socket.id].ssid].IssueChallenge();
			}
		}
	}
}

if (sec_session[socket_session_data[socket.id].ssid].ticket_b64) {
	headers = `200 OK
Connection: Keep-Alive
wtv-encrypted: true
wtv-ticket: `+sec_session[socket_session_data[socket.id].ssid].ticket_b64+`
wtv-client-time-zone: GMT -0000
wtv-client-date: `+strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString()))+` GMT
wtv-country: US
wtv-language-header: en-US,en
wtv-visit: client:closeallpanels
wtv-expire-all: client:closeallpanels
wtv-noback-all: wtv-
wtv-service: reset
wtv-service: name=wtv-1800 host=` + pubip + ` port=1615 connections=1
wtv-service: name=wtv-head-waiter host=` + pubip + ` port=1615 flags=0x04 flags=0x00000001 connections=1
wtv-service: name=htv-update host=` + pubip + ` port=1615 flags=0x04
wtv-boot-url: wtv-head-waiter:/login?
wtv-input-timeout: 14400
wtv-connection-timeout: 90
wtv-fader-timeout: 900
wtv-ssl-log-url: wtv-log:/log
wtv-bypass-proxy: true
wtv-allow-dsc: true
wtv-messenger-enable: 0
wtv-nameserver: 1.1.1.1
wtv-phone-log-url: wtv-log:/log
wtv-visit: wtv-head-waiter:/login-stage-two?
Content-type: text/html`

data = '';
//data = fs.readFileSync(__dirname + "/ServiceDeps/splash.html");

} else {

headers = `200 OK
Connection: Keep-Alive
Expires: Wed, 09 Oct 1991 22:00:00 GMT
wtv-expire-all: wtv-head-waiter:
wtv-service: name=wtv-log host=` + pubip + ` port=1615 connections=1
wtv-log-url: wtv-log:/log
`+challenge_header+`
wtv-relogin-url: wtv-1800:/preregister?relogin=true
wtv-reconnect-url: wtv-1800:/preregister?reconnect=true
wtv-visit: `+gourl+`
Content-type: text/html`;
data = '';
}