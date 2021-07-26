headers =`200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-home:/splash
wtv-expire-all: wtv-flashrom:
Content-type: text/html`

if (ssid_sessions[socket.ssid].get('box-does-psuedo-encryption')) {
	var cryptstatus = "<a href='client:showalert?message=Your%20WebTV%20Unit%20sent%20us%20a%20request%20for%20SECURE%20ON%2C%20but%20did%20not%20encrypt%20any%20data%2C%20nor%20will%20accept%20it.%20However%2C%20we%20send%20the%20wtv-encryption%20flag%20to%20roll%20with%20it%2C%20enabling%20%27psuedo-encryption%27.%20Nothing%20is%20encrypted%2C%20but%20the%20box%20trusts%20us.%20This%20will%20probably%20go%20away%20if%20you%20reload%20or%20change%20pages.&buttonaction1=client:donothing&buttonlabel1=Oh%2C%20okay...'>Psuedo-encrypted</a>";
} else {
	var cryptstatus = ((socket_sessions[socket.id].secure === true) ? "Encrypted" : "Not Encrypted")
}


data = `<html>
<head>
<title>Home for minisrv</title>
<DISPLAY NoLogo hideoptions noscroll>
</head>
<body bgcolor="black" link="gold" vlink="gold" alink="gold" text="gold">
<script>
function go() {
	location.href=document.access.url.value;
}
</script>
<h2>Welcome to `+ z_title + `</h2>
<b>Encryption Status</b>: ${cryptstatus}<br>
<b>Connection Speed</b>: &rate;
<p>
<form name=access onsubmit="go()">
<ul>
<li><a href="client:relog">client:relog (direct)</a> ~ <a href="wtv-tricks:/blastcache?return_to=wtv-home:/home">Clear Cache</a></li>
<li><a href="wtv-flashrom:/willie" selected>Ultra Willies</a> ~ <a href="wtv-tricks:/info">Tricks Info</a></li>
<li><a href="wtv-music:/demo/index">MIDI Music Demo</a></li>
`;
if (ssid_sessions[socket.ssid].hasCap("client-has-disk")) {
	// only show disk stuff if client has disk
	data += "<li><a href=\"client:diskhax\">DiskHax</a> ~ <a href=\"client:vfathax\">VFatHax</a></li>\n";
	if (ssid_sessions[socket.ssid].hasCap("client-can-do-macromedia-flash2")) {
		// only show demo if client can do flash2
		data += "<li>Old MSNTV DealerDemo: <a href=\"wtv-update:/DealerDemo\">Download</a> ~ <a href=\"file://Disk/Demo/index.html\"> Access (after Download)</a></li>\n";
	}
}

data += `<li><a href="http://duckduckgo.com/lite/">DuckDuckGo Lite</a></li>`

if (ssid_sessions[socket.ssid].hasCap("client-can-do-javascript")) {
	// URL access form requires javascript, hide if client does not support
	data += `<li><input name=url `;

	if (request_headers.query.url) {
		data += "value='" + unescape(request_headers.query.url) + "'";
	}

	data += `width=250  height=10 bgcolor=#444444 text=#ffdd33 cursor=#cc9933>
<input type=submit value="Access URL">
</form>`;
}

data += "</li >\n</ul>";

if (fs.existsSync(service_vaults[0] + "/" + service_name + "/home.zefie.html")) {
	data += fs.readFileSync(service_vaults[0] + "/" + service_name + "/home.zefie.html", { 'encoding': 'utf8' });
}