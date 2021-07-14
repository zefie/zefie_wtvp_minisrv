var gourl = "wtv-1800:/finish-prereg?";
if (query['relogin']) gourl += "relogin=true";


if (query['reconnect']) {
	headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: htv-`

	if (sec_session[initial_headers['wtv-client-serial-number']].ticket_b64) {
		headers += "wtv-encrypted: true\n";
		headers += "wtv-ticket: " + sec_session[initial_headers['wtv-client-serial-number']].ticket_b64 + "\n";
	}

	headers += `wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: GMT
wtv-client-date: `+ strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString())) + ` GMT
Content-type: text/html`;
} else {

	if (initial_headers['wtv-ticket']) {
		gourl = "wtv-head-waiter:/login-stage-two?";
	}

	headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: htv-
wtv-open-isp-disabled: false
wtv-visit: `+ gourl + `
Content-type: text/html`;

}