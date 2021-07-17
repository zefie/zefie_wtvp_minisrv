// todo, actual file logic
// - ready query param to get flashrom path, check for its existance
// - handle last part to redirect to lc2-download-complete
// - handle failures
request_is_async = true;

if (!request_headers.query.path) {
	var errpage = doErrorPage(400);
	headers = errpage[0];
	data = errpage[1];
} else {
	var request_path = unescape(request_headers.query.path);
	if (services_configured.services[service_name].use_zefie_server) {
		// read first 256 bytes of flashrom file from archive.midnightchannel.net
		// to get `flashrom_message` and `numparts` if missing
		var options = {
			host: "archive.midnightchannel.net",
			path: "/zefie/files/wtv-flashrom/" + request_path,
			method: 'GET',
			timeout: 5000,
			headers: {
				'Range': 'bytes=0-256'
            }
		}

		var chunk;

		const req = https.request(options, function (res) {
			var data = '';
			res.setEncoding('hex');

			res.on('data', function (d) {
				data += d;
			});

			res.on('error', function (e) {
				console.log(" * Upstream FlashROM Error:", e);
				var errpage = doErrorPage(400)
				headers = errpage[0];
				data = errpage[1];
				sendToClient(socket, headers, data);
			});

			res.on('end', function () {
				if (res.statusCode == 206) {
					var flashrom_message = new Buffer.from(data.substring(36 * 2, 68 * 2), 'hex').toString('ascii').replace(/[^0-9a-z\ \.\-]/gi, "");
					processLC2DownloadPage(request_headers.query.path, flashrom_message, (request_headers.query.numparts || null));
					return;
				} else if (res.statusCode == 404) {
					var errpage = doErrorPage(404, "The service could not find the requested ROM on zefie's server.")
					headers = errpage[0];
					data = errpage[1];
				} else {
					var errpage = doErrorPage(400)
					headers = errpage[0];
					data = errpage[1];
				}
				sendToClient(socket, headers, data);
			});
		});
		req.end();
	} else {
		// use local flashrom files
		var flashrom_file_path = service_dir + '/' + request_path;
		fs.readFile(flashrom_file_path, null, function (err, data) {
			try {
				var data_128 = new Buffer.alloc(128);
				data.copy(data_128, 0, 0, 128);
				var flashrom_message = new Buffer.from(data_128.toString('hex').substring(36 * 2, 68 * 2), 'hex').toString('ascii').replace(/[^0-9a-z\ \.\-]/gi, "");
				processLC2DownloadPage(request_headers.query.path, flashrom_message, (request_headers.query.numparts || null));
			} catch (e) {
				var errpage = doErrorPage(404, "The service could not find the requested ROM.")
				headers = errpage[0];
				data = errpage[1];
				sendToClient(socket, headers, data);
			}
		});
	}
}

async function processLC2DownloadPage(path, flashrom_message, numparts = null) {
	if (numparts != null) var flashrom_numparts = parseInt(numparts);
	if (!flashrom_numparts) flashrom_numparts = flashrom_message.substring(flashrom_message.length - 4).replace(/\D/g, '');
	var ind = new Array();
	ind[0] = (path.indexOf("part") + 4);
	ind[1] = (path.indexOf(".", ind[0]) + 1);
	var flashrom_part_num = path.substr(ind[0], (path.length - ind[1]));
	var flashrom_lastpart = (flashrom_numparts == (parseInt(flashrom_part_num) + 1)) ? true : false;
	var flashrom_rompath = 'wtv-flashrom:/get-by-path?path=' + path + '&raw=true';
	var flashrom_isboot = (/\.brom$/).test(path);
	if (flashrom_lastpart) {
		flashrom_next_rompath = "wtv-flashrom:/lc2-download-complete?";
	} else {
		var flashrom_next_part_num = (parseInt(flashrom_part_num) + 1);
		if (flashrom_next_part_num < 10) flashrom_next_part_num = "00" + flashrom_next_part_num; // 1s
		else if (flashrom_next_part_num >= 10 && flashrom_next_part_num < 100) flashrom_next_part_num = "0" + flashrom_next_part_num; // 10s
		var flashrom_next_rompath = flashrom_rompath.replace("part"+flashrom_part_num, "part"+flashrom_next_part_num).replace('get-by-path', 'get-lc2-page').replace("&raw=true", "&numparts=" + parseInt(flashrom_numparts));
	}
	if (!flashrom_part_num || !flashrom_lastpart || !flashrom_rompath || !flashrom_next_rompath || !flashrom_isboot) {

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
<img src="wtv-flashrom:/ROMCache/HackTVLogoJewel.gif" width=87 height=67>
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
		if (flashrom_isboot && parseInt(flashrom_part_num) == 16) {
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
nexturl="${flashrom_next_rompath}"
errorurl="wtv-flashrom:/lc2-download-failed?"
blockurl="${flashrom_rompath}"
lastblock="${flashrom_lastpart}"
curblock="` + (parseInt(flashrom_part_num) + 1) + `"
totalblocks="${flashrom_numparts}">
<font size="-1" color="#D6DFD0">
<br>
<img src="wtv-flashrom:/ROMCache/Spacer.gif" width=2 height=10><br>
${flashrom_message}
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
<td colspan=9 width=416 valign=top align=left>
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
