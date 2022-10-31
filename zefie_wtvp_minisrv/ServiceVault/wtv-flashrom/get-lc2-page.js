var minisrv_service_file = true;

request_is_async = true;

if (!request_headers.query.path) {
	var errpage = wtvshared.doErrorPage(400);
	headers = errpage[0];
	data = errpage[1];
} else {	
	var wtvflashrom = new WTVFlashrom(minisrv_config, service_vaults, service_name, minisrv_config.services[service_name].use_zefie_server, false, (minisrv_config.services[service_name].debug ? false : true));
	var request_path = request_headers.query.path;

	// read flashrom header info into array using WTVFlashrom class	
	wtvflashrom.getFlashromMeta(request_path, function (data, headers) {
		processLC2DownloadPage(data, headers, (request_headers.query.numparts ? request_headers.query.numparts : null));
	});
}

async function processLC2DownloadPage(flashrom_info, headers, numparts = null) {
	if (typeof flashrom_info === 'string') {
		// zefie_flashrom_server error
		data = flashrom_info;
		headers += "\nminisrv-no-mail-count: true\nwtv-expire-all: wtv-flashrom:/get-lc2-page?";
		sendToClient(socket, headers, data);
		return false;
	}
	if (numparts != null) flashrom_info.part_count = parseInt(numparts);
	if (!flashrom_info.part_count) flashrom_info.part_count = parseInt(flashrom_info.message.substring(flashrom_info.message.length - 4).replace(/\D/g, ''));
	if (parseInt(flashrom_info.part_number) >= 0 && flashrom_info.rompath && flashrom_info.next_rompath) {
		if (!flashrom_info.message && flashrom_info.is_bootrom) {
			flashrom_info.message = "BootRom Part " + (flashrom_info.part_number + 1) + " of " + flashrom_info.part_count;
        }
		if (!flashrom_info.is_last_part) {
			flashrom_info.next_rompath = request_headers.request_url.replace(escape(request_headers.query.path), escape(flashrom_info.next_rompath.replace(service_name+":/","")));
		}

		headers = `200 OK
Content-type: text/html
minisrv-no-mail-count: true`

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
<img src="${service_name}:/ROMCache/Spacer.gif" width=1 height=1>
<td colspan=10 width=436 valign=middle align=left bgcolor="3B3A4D">
<font color="D6DFD0" size="+2">
<blackface>
<shadow>
<img src="${service_name}:/ROMCache/Spacer.gif" width=1 height=4>
<br>
Updating now
</shadow>
</blackface>
</font>
<tr>
<td colspan=12 width=560 height=10 valign=top align=left>
<img src="${service_name}:/ROMCache/S40H1.gif" width=560 height=6>
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
Your ${session_data.getBoxName()} is being<br>updated automatically.
<p> <font size=+1>
This will take a while, and<br>then you can use your ${session_data.getBoxName()} again.
`;
		if (flashrom_info.is_bootrom && flashrom_info.part_number == (flashrom_info.part_count - 1)) {
			data += `<p>
	The system will pause for about 30 seconds at the end of this
	update.  Please <strong>do not</strong> interrupt the system
	during this time.
	`
		}
data += `
</font>
<br><br><br><br><br>
<upgradeblock width=250 height=15
nexturl="${flashrom_info.next_rompath}"
errorurl="${service_name}:/lc2-download-failed?"
blockurl="${flashrom_info.rompath}"
lastblock="${flashrom_info.is_last_part}"
curblock="${(flashrom_info.part_number + 1)}"${(flashrom_info.part_count) ? `
totalblocks="${flashrom_info.part_count}">` : `>`}
<font size="-1" color="#D6DFD0">
<br>
<img src="${service_name}:/ROMCache/Spacer.gif" width=2 height=10><br>
${flashrom_info.message}
 <br><br>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=middle align=center bgcolor="#191919">
<img src="${service_name}:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 height=1 valign=top align=left>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=top align=left bgcolor="#191919">
<img src="${service_name}:/ROMCache/Spacer.gif" width=436 height=1>
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
		var errpage = wtvshared.doErrorPage(400)
		headers = errpage[0];
		headers += "\nminisrv-no-mail-count: true\nwtv-expire-all: wtv-flashrom:/get-lc2-page?";
		data = errpage[1];
    }
	sendToClient(socket, headers, data);
}
