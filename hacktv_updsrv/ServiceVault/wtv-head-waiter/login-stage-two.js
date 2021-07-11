var ssid = initial_headers['wtv-client-serial-number'] || null;
var initialChallenge, challenge_response, challenge_header = '';

if (ssid !== null) {
	if (sec_session[ssid].ticket) {
		challenge_header = "wtv-ticket: "+sec_session[ssid].ticket;
	}
}
 

	

headers = `200 OK
wtv-ticket: `+sec_session[ssid].ticket+`
Content-Type: text/html`;

data = sec_session[ssid].EncryptKey1('hehe! stage two! and its encrypted!');