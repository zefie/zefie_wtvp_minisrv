request_is_async = true;


var bf0app_update = false;
var request_path = unescape(request_headers.query.path);
headers = "200 OK\n"

function doLocalFlashROM(flashrom_file_path) {
	// use local flashrom files;
	try {
		fs.readFile(flashrom_file_path, null, function (err, data) {
			if (err) {
				errpage = doErrorPage(400)
				headers = errpage[0];
				data = err.toString();
			}
			sendToClient(socket, headers, data);
		});
	} catch (e) {
		var errpage = doErrorPage(404, "The service could not find the requested ROM.")
		headers = errpage[0];
		data = errpage[1];
		sendToClient(socket, headers, data);
	}
}

if (ssid_sessions[socket.ssid].get("wtv-client-rom-type") == "bf0app" && ssid_sessions[socket.ssid].get("wtv-client-bootrom-version") == "105") {
	// assume old classic in flash mode, override user setting and send tellyscript
	// because it is required to proceed in flash mode
	bf0app_update = true;
	ssid_sessions[socket.ssid].set("bf0app_update", bf0app_update);
	headers += "minisrv-use-carriage-return: false\n";
}


function calculatedPath(data, path, numparts = null) {
	var data_128 = new Buffer.alloc(128);
	data.copy(data_128, 0, 0, 128);
	var flashrom_numparts = null;
	var flashrom_message = new Buffer.from(data_128.toString('hex').substring(36 * 2, 68 * 2), 'hex').toString('ascii').replace(/[^0-9a-z\ \.\-]/gi, "");

	if (numparts != null) flashrom_numparts = parseInt(numparts);
	if (!flashrom_numparts) flashrom_numparts = flashrom_message.substring(flashrom_message.length - 4).replace(/\D/g, '');

	var ind = new Array();
	ind[0] = (path.indexOf("part") + 4);
	ind[1] = (path.indexOf(".", ind[0]) + 1);
	var flashrom_part_num = path.substr(ind[0], (path.length - ind[1]));
	var flashrom_lastpart = (flashrom_numparts == (parseInt(flashrom_part_num) + 1)) ? true : false;
	var flashrom_rompath = 'wtv-flashrom:/get-by-path?path=' + path;
	if (flashrom_lastpart) flashrom_next_rompath = null;
	else {
		var flashrom_next_part_num = (parseInt(flashrom_part_num) + 1);
		if (flashrom_next_part_num < 10) flashrom_next_part_num = "00" + flashrom_next_part_num; // 1s
		else if (flashrom_next_part_num >= 10 && flashrom_next_part_num < 100) flashrom_next_part_num = "0" + flashrom_next_part_num; // 10s
		var flashrom_next_rompath = flashrom_rompath.replace("part" + flashrom_part_num, "part" + flashrom_next_part_num) + "&numparts=" + parseInt(flashrom_numparts);
	}
	return flashrom_next_rompath;
}

if (request_headers.query.raw || bf0app_update) {
	if ((/\.brom$/).test(request_path)) headers += "Content-Type: binary/x-wtv-bootrom"; // maybe?
	else headers += "Content-Type: binary/x-wtv-flashblock";

	var flashrom_file_path = null;
	Object.keys(service_vaults).forEach(function (g) {
		if (flashrom_file_path != null) return;
		flashrom_file_path = service_vaults[g] + "/" + service_name + "/" + request_path;
		if (!fs.existsSync(flashrom_file_path)) flashrom_file_path = null;
	});
	if (minisrv_config.services[service_name].use_zefie_server && !flashrom_file_path) {
		// get flashrom files from archive.midnightchannel.net
		var options = {
			host: "archive.midnightchannel.net",
			path: "/zefie/files/wtv-flashrom/" + request_path,
			timeout: 5000,
			method: 'GET'
		}
		const req = https.request(options, function (res) {
			var data_hex = '';
			res.setEncoding('hex');

			res.on('data', d => {
				data_hex += d;
			})

			res.on('end', function () {
				if (!zquiet) console.log(` * Zefie's FlashROM Server HTTP Status: ${res.statusCode} ${res.statusMessage}`)
				if (res.statusCode == 200) {
					data = Buffer.from(data_hex, 'hex');
				} else if (res.statusCode == 404) {
					var errpage = doErrorPage(404, "The service could not find the requested ROM on zefie's server.")
					headers = errpage[0];
					data = errpage[1];
				} else {
					var errpage = doErrorPage(400)
					headers = errpage[0];
					data = errpage[1];
				}
				if (bf0app_update) {
					var nextpath = calculatedPath(data, request_path, (request_headers.query.numparts || null));
					if (nextpath != null) headers += "\nwtv-visit: " + nextpath;
				}
				else headers += "\nwtv-connection-close: true";
				sendToClient(socket, headers, data);
			});
		});
		req.end();
	} else {
		doLocalFlashROM(flashrom_file_path);
	}
} else {
	// no support for bf0app yet, but here we send the client to initiate-lc2-download
	// to get the rom image
	if (request_headers.query.path) {
		headers += "Content-type: text/html\n"
		headers += "wtv-visit: wtv-flashrom:/initiate-lc2-download?path=" + request_headers.query.path;
		data = '';
	} else {
		var errpage = doErrorPage(404)
		headers = errpage[0];
		data = errpage[1];
	}
	sendToClient(socket, headers, data);
}