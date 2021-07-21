request_is_async = true;

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


if (request_headers.query.raw) {
	if ((/\.brom$/).test(request_path)) headers += "Content-Type: binary/x-wtv-bootrom"; // maybe?
	else headers += "Content-Type: binary/x-wtv-flashblock";
	var flashrom_file_path = service_dir + '/' + request_path;
	if (minisrv_config.services[service_name].use_zefie_server && !fs.existsSync(flashrom_file_path)) {
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