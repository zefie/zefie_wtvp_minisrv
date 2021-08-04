
const WTVFlashrom = require("./WTVFlashrom.js");
var wtvflashrom;
var flashrom_info;
request_is_async = true;

if (!request_headers.query.path) {
	var errpage = doErrorPage(400);
	headers = errpage[0];
	data = errpage[1];
} else {	
	var wtvflashrom = new WTVFlashrom(service_vaults, service_name, minisrv_config.services[service_name].use_zefie_server);
	var request_path = unescape(request_headers.query.path);

	// read 512 bytes of rom
	flashrom_info = wtvflashrom.getFlashRom(request_path, function (data, headers = null) {
		processLC2DownloadPage(request_headers.query.path, data, (request_headers.query.numparts || null));
	}, 512);
}

async function processLC2DownloadPage(path, flashrom_info, numparts = null) {
	var flashrom_numparts = null;
	if (numparts != null) flashrom_numparts = parseInt(numparts);
	if (!flashrom_numparts) flashrom_numparts = parseInt(flashrom_info.message.substring(flashrom_info.message.length - 4).replace(/\D/g, ''));

	if (!flashrom_info.is_last_part) {
		flashrom_info.next_rompath = flashrom_info.next_rompath.replace("get-by-path", "get-lc2-page").replace("&raw=true", "&numparts=" + parseInt(flashrom_numparts));
	}
	if (!flashrom_info.part_number || !flashrom_info.is_last_part || !flashrom_info.rompath || !flashrom_info.next_rompath || !flashrom_info.is_bootrom) {

		headers = `200 OK
Content-type: text/html`

		data = `<html>
<head>
<title>
Updating
</title>
<display switchtowebmode transition=none nostatus nooptions skipback clearback>
</head>
<body noscroll bgcolor="#191919" text="#42CC55" link="36d5ff"
hspace=0 vspace=0 fontsize="large">
<table cellspacing=0 cellpadding=0>
<tr>
<td width=104 height=74 valign=middle align=center bgcolor="3B3A4D">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<td width=20 valign=top align=left bgcolor="3B3A4D">
<img src="wtv-flashrom:/ROMCache/Spacer.gif" width=1 height=1>
<td colspan=10 width=436 valign=middle align=left bgcolor="3B3A4D">
<font color="D6DFD0" size="+2">
<blackface>
<shadow>
<img src="wtv-flashrom:/ROMCache/Spacer.gif" width=1 height=4>
<br>
Updating now
</shadow>
</blackface>
</font>
<tr>
<td colspan=12 width=560 height=10 valign=top align=left>
<img src="wtv-flashrom:/ROMCache/S40H1.gif" width=560 height=6>
<tr>
<td width=104 height=10 valign=top align=left>
<td width=20 valign=top align=left>
<td width=67 valign=top align=left>
<td width=20 valign=top align=left>
<td width=67 valign=top align=left>
<td width=20 valign=top align=left>
<td width=67 valign=top align=left>
<td width=20 valign=top align=left>
<td width=67 valign=top align=left>
<td width=20 valign=top align=left>
<td width=68 valign=top align=left>
<td width=20 valign=top align=left>
<form action="client:poweroff">
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 width=100 height=258 valign=top align=left>
<font size=+1>
Your WebTV Unit is being<br>updated automatically.
<p> <font size=+1>
This will take a while, and<br>then you can use your WebTV again.
`;
		if (flashrom_info.is_bootrom && flashrom_info.part_number == 16) {
			data += `<p>
	The system will pause for about 30 seconds at the end of this
	update.  Please <strong>do not</strong> interrupt the system
	during this time.
	`
		}
data += `
</font>
<br><br><br><br><br>
<upgradeblock width=280 height=15
nexturl="${flashrom_info.next_rompath}"
errorurl="wtv-flashrom:/lc2-download-failed?"
blockurl="${flashrom_info.rompath}"
lastblock="${flashrom_info.is_last_part}"
curblock="` + (flashrom_info.part_number + 1) + `"
`
		if (flashrom_numparts) {
			data += `totalblocks="${flashrom_numparts}"`;
		}
	data += `>
<font size="-1" color="#D6DFD0">
<br>
<img src="wtv-flashrom:/ROMCache/Spacer.gif" width=2 height=10><br>
${flashrom_info.message}
 <br><br>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=middle align=center bgcolor="#191919">
<img src="wtv-flashrom:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 height=1 valign=top align=left>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=top align=left bgcolor="#191919">
<img src="wtv-flashrom:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 height=4 valign=top align=left>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 width=416 valign=top align=right>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=306 valign=top align=left>
<font size="-1"><i>
</i></font><td width=112 valign=top align=right>
<font size="-1" color="#191919">
</font>
</form>
</table>
<td width=20 valign=middle align=center>
</table>
</body>
</html>`;
	} else {
		var errpage = doErrorPage(400)
		headers = errpage[0];
		data = errpage[1];
    }
	sendToClient(socket, headers, data);
}
