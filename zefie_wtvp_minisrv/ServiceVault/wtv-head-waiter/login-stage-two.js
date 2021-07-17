var challenge_response, challenge_header = '';
var gourl;

if (socket_session_data[socket.id].ssid != null && !getSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login')) {
	var wtvsec_login = new WTVSec(1,zdebug);
	wtvsec_login.IssueChallenge();
	wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
	setSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login', wtvsec_login)
} else {
	var wtvsec_login = getSessionData(socket_session_data[socket.id].ssid, 'wtvsec_login')
}

if (socket_session_data[socket.id].ssid !== null) {
	if (wtvsec_login.ticket_b64 == null) {
		if (request_headers["wtv-ticket"]) {
			if (request_headers["wtv-ticket"].length > 8) {
				wtvsec_login.DecodeTicket(request_headers["wtv-ticket"]);
				wtvsec_login.ticket_b64 = request_headers["wtv-ticket"];
				//socket_session_data[socket.id].secure = true;
			}
		} else {
			challenge_response = wtvsec_login.challenge_response;
			var client_challenge_response = request_headers["wtv-challenge-response"] || null;
			if (challenge_response && client_challenge_response) {		
				//if (challenge_response.toString(CryptoJS.enc.Base64).substring(0,85) == client_challenge_response.substring(0,85)) {
				if (challenge_response.toString(CryptoJS.enc.Base64) == client_challenge_response) {
					console.log(" * wtv-challenge-response success for " + processSSID(socket_session_data[socket.id].ssid));
					wtvsec_login.PrepareTicket();
					//socket_session_data[socket.id].secure = true;
				} else {
					console.log(" * wtv-challenge-response FAILED for " + processSSID(socket_session_data[socket.id].ssid));
					if (zdebug) console.log("Response Expected:", challenge_response.toString(CryptoJS.enc.Base64));
					if (zdebug) console.log("Response Received:", client_challenge_response)
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
wtv-visit: `+ gourl + `
Content-type: text/html`;
	data = '';
}
else {
	var namerand = Math.floor(Math.random() * 100000);
	var nickname = 'HackTVUsr_' + namerand;
	var userid = '1'+ Math.floor(Math.random() * 1000000000000000000);
	var offline_user_list = CryptoJS.enc.Latin1.parse("<user-list>\n\t<user userid=\"" + userid + " user-name=\"" + nickname + "\" first-name=\"HackTV\" last-name=\"User \"" + namerand + "\" password=\"\" mail-enabled=\"true\" />\n</user-list>").toString(CryptoJS.enc.Base64);
	data = '';
	headers = `200 OK
Connection: Keep-Alive
wtv-encrypted: true
wtv-client-time-zone: GMT -0000
wtv-client-date: `+ strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString())) + ` GMT
wtv-country: US
wtv-language-header: en-US,en
wtv-visit: client:closeallpanels
wtv-expire-all: client:closeallpanels
wtv-offline-user-list: `+offline_user_list+`
wtv-bypass-proxy: true
wtv-ticket: `+ wtvsec_login.ticket_b64 + `
wtv-messagewatch-checktimeoffset: off
wtv-input-timeout: 14400
wtv-connection-timeout: 90
wtv-fader-timeout: 900
wtv-ssl-log-url: wtv-log:/log
wtv-smartcard-inserted-message: Contacting service
user-id: `+userid+`
wtv-transition-override: off
wtv-allow-dsc: true
wtv-messenger-enable: 0
wtv-noback-all: wtv-
wtv-service: reset
`+ getServiceString('all') + `
wtv-boot-url: wtv-1800:/preregister?relogin=true`
//wtv-ssl-certs-download-url: wtv-head-waiter:/ssl-cert.der
//wtv-ssl-certs-checksum: 473926DC1B11F635A6B920953FDCDE6A
	headers += `wtv-user-name: `+ nickname + `
wtv-human-name: `+ nickname + `
wtv-irc-nick: `+ nickname + `
wtv-home-url: wtv-home:/home?
wtv-domain: wtv.zefie.com
wtv-inactive-timeout: 0
wtv-connection-timeout: 90
wtv-show-time-enabled: true
wtv-fader-timeout: 900
wtv-tourist-enabled: true
wtv-connection-timeout: 180
wtv-ssl-timeout: 240
wtv-login-timeout: 7200
wtv-open-isp-disabled: false
wtv-log-url: wtv-log:/log
wtv-demo-mode: 0
wtv-wink-deferrer-retries: 3
wtv-offline-mail-enable: false
wtv-name-server: 8.8.8.8
wtv-visit: wtv-home:/splash?
Content-Type: text/html`;
}