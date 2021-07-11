var ssid = initial_headers['wtv-client-serial-number'] || null;
var initialChallenge, challenge_response, challenge_header = '';
var gourl = "wtv-head-waiter:/login?reissue_challenge=true";

if (query['reissue_challenge']) {
	gourl = "client:activ";
} 
if (ssid !== null) {
	if (sec_session[ssid].ticket_b64 == null) {
		if (initial_headers['wtv-ticket']) {
			DecodeTicket(initial_headers['wtv-ticket']);
			sec_session[ssid].ticket_b64 = initial_headers['wtv-ticket'];
			challenge_header = "wtv-ticket: "+initial_headers['wtv-ticket'];
		} else {
			challenge_response = sec_session[ssid].challenge_response;
			var client_challenge_response = initial_headers['wtv-challenge-response'] || null;
			if (challenge_response && client_challenge_response) {		
				if (challenge_response.toString(CryptoJS.enc.Base64).substring(0,85) == client_challenge_response.substring(0,85)) {
					console.log(" * wtv-challenge-response success for "+ssid);
					sec_session[ssid].PrepareTicket();
					challenge_header = "wtv-ticket: "+sec_session[ssid].ticket_b64;
					var gourl = "wtv-head-waiter:/login-stage-two?";
				} else {
					challenge_header = "wtv-whatever: meh";
					gourl = "wtv-1800:/preregister?";
				}
			} else {
				if (sec_session[ssid].challenge_b64 == null) {
					challenge_header = "wtv-whatever: meh";
					gourl = "wtv-1800:/preregister?";					
				} else {
					challenge_header = "wtv-challenge: "+sec_session[ssid].challenge_b64;
				}
			}
		}
	} else {
		challenge_header = "wtv-ticket: "+sec_session[ssid].ticket_b64;
	}
}
	

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
Content-length: 0
Content-type: text/html`;

data = '';


