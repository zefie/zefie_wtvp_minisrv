var challenge_response, challenge_header = '';
var gourl;

if (socket_session_data[socket.id].ssid !== null) {
	if (sec_session[socket_session_data[socket.id].ssid].ticket_b64 == null) {
		if (initial_headers['wtv-ticket']) {
			if (initial_headers['wtv-ticket'].length > 8) {
				sec_session[socket_session_data[socket.id].ssid].DecodeTicket(initial_headers['wtv-ticket']);
				sec_session[socket_session_data[socket.id].ssid].ticket_b64 = initial_headers['wtv-ticket'];
				//socket_session_data[socket.id].secure = true;
			}
		} else {
			challenge_response = sec_session[socket_session_data[socket.id].ssid].challenge_response;
			var client_challenge_response = initial_headers['wtv-challenge-response'] || null;
			if (challenge_response && client_challenge_response) {		
				//if (challenge_response.toString(CryptoJS.enc.Base64).substring(0,85) == client_challenge_response.substring(0,85)) {
				if (challenge_response.toString(CryptoJS.enc.Base64) == client_challenge_response) {
					console.log(" * wtv-challenge-response success for "+socket_session_data[socket.id].ssid);
					if (zdebug) console.log("Response Expected:",challenge_response.toString(CryptoJS.enc.Base64));
					if (zdebug) console.log("Response Received:",client_challenge_response)
					sec_session[socket_session_data[socket.id].ssid].PrepareTicket();
					//socket_session_data[socket.id].secure = true;
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
	var nickname = 'HackTVUsr_'+Math.floor(Math.random() * 100000);
	headers = `200 OK
Connection: Keep-Alive
wtv-encrypted: true
wtv-ticket: `+sec_session[socket_session_data[socket.id].ssid].ticket_b64+`
wtv-client-time-zone: GMT -0000
wtv-client-date: `+strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString()))+` GMT
wtv-country: US
wtv-language-header: en-US,en
wtv-tv-zipcode: 90210
wtv-visit: client:closeallpanels
wtv-messagewatch-checktimeoffset: off
wtv-expire-all: client:closeallpanels
wtv-input-timeout: 14400
wtv-connection-timeout: 90
wtv-fader-timeout: 900
wtv-ssl-log-url: wtv-log:/log
wtv-smartcard-inserted-message: Contacting service
user-id: 1`+Math.floor(Math.random() * 1000000000000000000)+`
wtv-transition-override: off
wtv-bypass-proxy: true
wtv-allow-dsc: true
wtv-messenger-enable: 0
wtv-noback-all: wtv-
wtv-service: reset
wtv-service: name=wtv-1800 host=` + pubip + ` port=` + port + ` connections=1
wtv-service: name=wtv-head-waiter host=` + pubip + ` port=` + port + ` flags=0x04 flags=0x00000001 connections=1
wtv-service: name=htv-update host=` + pubip + ` port=` + port + ` connections=3
wtv-service: name=wtv-log host=` + pubip + ` port=` + port + ` connections=1
wtv-service: name=wtv-home host=` + pubip + ` port=` + port + ` flags=0x00000010
wtv-boot-url: wtv-1800:/preregister
wtv-user-name: `+nickname+`
wtv-human-name: `+nickname+`
wtv-irc-nick: `+nickname+`
wtv-home-url: htv-update:/update?
wtv-domain: wtv.zefie.com
wtv-inactive-timeout: 0
wtv-connection-timeout: 90
wtv-show-time-enabled: true
wtv-fader-timeout: 900
wtv-tourist-enabled: true
wtv-boot-url: wtv-head-waiter:/login
wtv-connection-timeout: 180
wtv-ssl-timeout: 240
wtv-login-timeout: 7200
wtv-open-isp-disabled: false
wtv-log-url: wtv-log:/log
wtv-demo-mode: 0
wtv-wink-deferrer-retries: 3
wtv-offline-mail-enable: true
wtv-visit: wtv-head-waiter:/finalize-security?
Content-Type: text/html`;
	
data = '';
}