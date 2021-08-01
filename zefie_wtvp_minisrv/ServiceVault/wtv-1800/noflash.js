if (socket.ssid != null && !ssid_sessions[socket.ssid].get("wtvsec_login")) {
	var wtvsec_login = new WTVSec();
	wtvsec_login.IssueChallenge();
	wtvsec_login.set_incarnation(request_headers["wtv-incarnation"]);
	ssid_sessions[socket.ssid].set("wtvsec_login", wtvsec_login);
} else if (socket.ssid != null) {
	var wtvsec_login = ssid_sessions[socket.ssid].get("wtvsec_login");
}

if (wtvsec_login) {


headers = `200 OK
Connection: Keep-Alive
minisrv-use-carriage-return: false
wtv-initial-key: ` + wtvsec_login.challenge_key.toString(CryptoJS.enc.Base64) + `
Content-Type: text/tellyscript
wtv-service: reset
` + getServiceString('wtv-head-waiter') + `
` + getServiceString('wtv-star', { "no_star_word": true }) + `
` + getServiceString('wtv-flashrom') + `
wtv-boot-url: wtv-head-waiter:/login?
wtv-visit: wtv-head-waiter:/login?
wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: GMT
wtv-client-date: `+ strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString())) + ` GMT`;

	var file_path = __dirname + "/ServiceDeps/premade_tellyscripts/BF0APP/bf0app_boot_uncompressed.tok";

	if (file_path) {
		request_is_async = true;
		fs.readFile(file_path, null, function (err, file_read_data) {
			if (err) {
				headers=`500 Some error occurred...`
			}
			sendToClient(socket, headers, file_read_data);
		});
	}
} else {
	console.log(" * Something bad happened (we don't know the client ssid???)");
	headers=`500 missing ssid`
}


