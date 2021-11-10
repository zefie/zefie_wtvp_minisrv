var minisrv_service_file = true;

headers =`200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-home:/splash
wtv-expire-all: wtv-flashrom:
Content-type: text/html`

if (request_headers.query.url) headers += "\nwtv-visit: " + request_headers.query.url;
var cryptstatus = ((socket_sessions[socket.id].secure === true) ? "Encrypted" : "Not Encrypted")

var comp_type = wtvmime.shouldWeCompress(ssid_sessions[socket.ssid],'text/html');
var compstatus = "uncompressed";
switch (comp_type) {
	case 1:
		compstatus = "wtv-lzpf";
		break;
	case 2:
		compstatus = "gzip (level 9)";
		break;
}

data = `<html>
<head>
<title>Home for ${ssid_sessions[socket.ssid].getSessionData("subscriber_username") || "minisrv"}</title>
<DISPLAY NoLogo hideoptions noscroll>
</head>
<body bgcolor="black" link="gold" vlink="gold" alink="gold" text="gold">
<script>
function go() {
	location.href=document.access.url.value;
}
</script>
<b>Welcome to ${minisrv_config.config.service_name}`;
if (ssid_sessions[socket.ssid].getSessionData("registered")) data += ", " + ssid_sessions[socket.ssid].getSessionData("subscriber_username") + "!";
data += `</b><br>
<div width="540" align="right">
<font size="-4"><i>
minisrv v${minisrv_config.version}${(minisrv_config.config.git_commit) ? ' git-'+minisrv_config.config.git_commit : ''}, hosted by ${minisrv_config.config.service_owner}</i></small></font></div><br>

<hr>
<b>Status</b>: ${cryptstatus} (${compstatus})<br>
<b>Connection Speed</b>: &rate;
<hr>
<form name=access onsubmit="go()">
<ul>
<li><a href="client:relog">client:relog (direct)</a></li>
<li><a href="wtv-flashrom:/willie" selected>Ultra Willies</a> ~ <a href="wtv-tricks:/tricks">Tricks</a></li>
<li><a href="wtv-setup:/setup">Setup (Including BG Music)</a></li>
`;
if (ssid_sessions[socket.ssid].hasCap("client-can-do-chat")) {
	data += "<li><a href=\"wtv-chat:/home\">IRC Chat Test</a></li>\n"
}
if (ssid_sessions[socket.ssid].hasCap("client-has-disk")) {
	// only show disk stuff if client has disk
	data += "<li><a href=\"client:diskhax\">DiskHax</a> ~ <a href=\"client:vfathax\">VFatHax</a></li>\n";
	if (ssid_sessions[socket.ssid].hasCap("client-can-do-macromedia-flash2")) {
		// only show demo if client can do flash2
		data += "<li>Old DealerDemo: <a href=\"wtv-disk:/sync?group=DealerDemo&diskmap=DealerDemo\">Download</a> ~ <a href=\"file://Disk/Demo/index.html\">Access</a></li>\n";
	}
}

data += `<li><a href="http://duckduckgo.com/lite/">DuckDuckGo Lite</a></li>`

if (ssid_sessions[socket.ssid].hasCap("client-can-do-javascript")) {
	// URL access form requires javascript, hide if client does not support
	data += `<li><input name=url `;

	if (request_headers.query.url) {
		data += "value='" + request_headers.query.url + "'";
	}

	data += `width=250  height=10 bgcolor=#444444 text=#ffdd33 cursor=#cc9933>
<input type=submit value="Access URL">
</form>`;
}

data += "</li >\n</ul>";

if (fs.existsSync(service_vaults[0] + "/" + service_name + "/home.zefie.html")) {
	data += fs.readFileSync(service_vaults[0] + "/" + service_name + "/home.zefie.html", { 'encoding': 'utf8' });
}