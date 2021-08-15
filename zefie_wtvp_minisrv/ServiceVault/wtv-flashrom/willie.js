var minisrv_service_file = true;

// willie is just a graphical frontend to a list of ROMs
// the rest of the scripts should work if you manually link to a ROM, and actually have it.

request_is_async = true;

var proxy_query = '';
if (request_headers.query.flash) delete request_headers.query.flash;
if (request_headers.query.vflash) delete request_headers.query.vflash;
if (request_headers.query.pflash) delete request_headers.query.pflash;

for (const [key, value] of Object.entries(request_headers.query)) {
	proxy_query += "&" + key + "=" + escape(value);
}

if (!minisrv_config.services[service_name].use_zefie_server) {
	proxy_query += "&minisrv_local_mode=true";
}

var options = {
	host: "wtv.zefie.com",
	path: "/willie.php?minisrv=true&service_name="+escape(service_name)+"&pflash=" + ssid_sessions[socket.ssid].get("wtv-client-rom-type") + proxy_query,
	timeout: 5000,
	method: 'GET'
}


headers = "200 OK\nContent-type: text/html";
const req = https.request(options, function (res) {
	data = '';
	res.on('data', d => {
		data += d;
	});

	res.on('error', function (e) {
		if (!minisrv_config.config.debug_flags.quiet) console.log(" * Upstream Ultra Willies HTTP Error:", e);
		var errpage = doErrorPage(400)
		headers = errpage[0];
		data = errpage[1];
		sendToClient(socket, headers, data);
	});

	res.on('end', function () {
		if (!minisrv_config.config.debug_flags.quiet) console.log(" * Upstream Ultra Willies HTTP Response:", res.statusCode, res.statusMessage);
		if (request_headers.query.clear_cache) {
			headers += "\nwtv-expire-all: "+service_name;
        }
		sendToClient(socket, headers, data);
	});
});
req.end();
