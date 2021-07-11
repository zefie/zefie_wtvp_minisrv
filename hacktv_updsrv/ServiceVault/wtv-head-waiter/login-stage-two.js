var challenge_response, challenge_header = '';
var gourl;

if (socket_session_data[socket.id].ssid !== null) {
	if (sec_session[socket_session_data[socket.id].ssid].ticket_b64 == null) {
		if (initial_headers['wtv-ticket']) {
			if (initial_headers['wtv-ticket'].length > 8) {
				DecodeTicket(initial_headers['wtv-ticket']);
				sec_session[socket_session_data[socket.id].ssid].ticket_b64 = initial_headers['wtv-ticket'];
				socket_session_data[socket.id].secure == true;
			}
		} else {
			challenge_response = sec_session[socket_session_data[socket.id].ssid].challenge_response;
			var client_challenge_response = initial_headers['wtv-challenge-response'] || null;
			if (challenge_response && client_challenge_response) {		
				if (challenge_response.toString(CryptoJS.enc.Base64).substring(0,85) == client_challenge_response.substring(0,85)) {
					console.log(" * wtv-challenge-response success for "+socket_session_data[socket.id].ssid);
					sec_session[socket_session_data[socket.id].ssid].PrepareTicket();
					socket_session_data[socket.id].secure == true;
				} else {
					gourl = "wtv-head-waiter:/login?reissue_challenge=true";
				}
			} else {
				gourl = "wtv-head-waiter:/login?no_response=true";
			}
		}
	}
}

if (gourl) {
headers = `200 OK
Connection: Keep-Alive
wtv-open-isp-disabled: false
wtv-visit: `+gourl+`
Content-type: text/html`;
	data = '';
} else {
	headers = `200 OK
Connection: Keep-Alive
wtv-encrypted: true
wtv-ticket: `+sec_session[socket_session_data[socket.id].ssid].ticket_b64+`
Content-Type: text/html`;
	
	data = "hehe! stage two! <a href='wtv-head-waiter:/finalize-security'>test</a>";
}