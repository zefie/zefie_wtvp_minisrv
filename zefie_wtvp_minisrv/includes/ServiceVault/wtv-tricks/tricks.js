var minisrv_service_file = true;


var notAdminAlert = new clientShowAlert({
	'image': minisrv_config.config.service_logo,
	'message': "Sorry, you are not configured as an admin on this server.<br><br>If you are the server operator, please<br> see <strong>user_config.example.json</strong><br> for an example on how to configure yourself as an administrator.",
	'buttonlabel1': "Ugh, fine.",
	'buttonaction1': "client:donothing",
	'noback': true,
}).getURL();

headers = `200 OK
Content-Type: text/html`

tricks = [
	["wtv-tricks:/info", minisrv_config.config.service_name + " info"],
	["wtv-cookie:list", "List Cookies"],
	["wtv-cookie:reset", "Clear Cookies"],
	["wtv-tricks:/blastbacklist?return_to=wtv-tricks%3A%2Ftricks", "Blast Backlist"],
	["client:ResetNVAndPowerOff", "Blast NVRAM"],
	["wtv-tricks:/charmap", "Character Map"],
	["wtv-tricks:/cSetup", "Connect Setup"],
	["wtv-disk:/content/Downloads.tmpl", "Download-O-Rama"],
	["wtv-tricks:/benchmark", "Speed Test"],
	["wtv-flashrom:/big-willie", "Big Willie"],
    ["wtv-flashrom:/willie", "Ultra Willie"],
	["wtv-setup:/transfer-account", "Transfer Account"],
	["wtv-setup:/timezone", "Set Timezone"],
	["wtv-proxy:/proxy", "Web Render Proxy"],
]
// add these at the bottom
tricks.push((session_data.getSessionData("registered")) ? ["wtv-tricks:/unregister", "Unregister This Box"] : ["wtv-tricks:/register", "Register This Box"]); // reg/unreg
tricks.push((wtvshared.isAdmin(session_data)) ? ["wtv-admin:/admin", minisrv_config.config.service_name + " Admin"] : [notAdminAlert, minisrv_config.config.service_name + " Admin"]); // wtv-admin

data = `<html>
<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff" vspace=0>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Tricks</title>
<sidebar width=20%>
<img src="wtv-tricks:/images/Favorites_bg.jpg">
</sidebar>
<br>
<br>
<h1>${minisrv_config.config.service_name} Tricks</h1>
<table cellspacing=0 cellpadding=0><tr><td abswidth=10>&nbsp;<td colspan=3>
<table><tc><td>&nbsp;</td></tc><tc><td><table>`;

for (i = 0; i < tricks.length; i += 2) {
	data += `<tr>
<td colspan=3 height=6>
<tr>
<td>${(tricks[i][0] != "") ? `&#128; <a href="${tricks[i][0]}">${tricks[i][1]}</a>` : `<!-- TODO --> &nbsp;`}
<td width=25>
<td>`
	if (i + 1 < tricks.length) {
		data += (tricks[i + 1][0] != "") ? `&#128; <a href="${tricks[i + 1][0]}">${tricks[i + 1][1]}</a>` : `<!-- TODO --> &nbsp;`
	} else {
		// require even number of tricks
		data += "<!-- TODO --> &nbsp;"
	}
}
data += `</table></td></tc></table>
</body>
</html>
`;
