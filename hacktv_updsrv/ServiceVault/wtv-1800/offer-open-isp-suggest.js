var ssid = initial_headers['wtv-client-serial-number'] || null;
if (ssid != null && !sec_session[ssid]) {
	sec_session[ssid] = new WTVNetworkSecurity();
	sec_session[ssid].IssueChallenge();
}

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/tellyscript
wtv-initial-key: ` + sec_session[ssid].challenge_key.toString(CryptoJS.enc.Base64) + `
wtv-service: reset
wtv-service: name=wtv-1800 host=` + pubip + ` port=1615 connections=1
wtv-service: name=wtv-head-waiter host=` + pubip + ` port=1615 flags=0x04 flags=0x00000001 connections=1
wtv-service: name=htv-update host=` + pubip + ` port=1615 flags=0x04
wtv-client-time-zone: GMT -0000
wtv-client-date: `+strftime("%a, %d %b %Y %H:%M:%S", new Date(new Date().toUTCString()))+` GMT
wtv-boot-url: wtv-head-waiter:/login?
Location: wtv-head-waiter:/login?
wtv-visit: wtv-head-waiter:/login?`;


var romtype = getWTVROMType(initial_headers);

switch (romtype) {
	case "US-LC2-disk-0MB-8MB":
		data = fs.readFileSync(__dirname + "/ServiceVault/wtv-1800/LC2/artemis_18006138199.tok");
		break;
		
	default:
		data = '';
		break;
}

