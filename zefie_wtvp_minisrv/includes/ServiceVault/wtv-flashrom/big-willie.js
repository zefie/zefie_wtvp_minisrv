const minisrv_service_file = true;

request_is_async = true;

const options = {
    host: "flashrom.webtv.onl",
    port: 443,
    path: "/big-willie.html"
};

let data = "";   
console.log(" * Getting Big Willie Page");

const req = https.request(options, function(res) {
    res.setEncoding("utf8");
    res.on("data", function (chunk) {
        data += chunk;
    });

    res.on("end", function () {		
        headers = "200 OK\n";
		headers += "Content-Type: text/html";
		sendToClient(socket,headers,data)
    });

	res.on('error', function (e) {
		if (!minisrv_config.config.debug_flags.quiet) console.log(" * Upstream Big Willies HTTP Error:", e);
		const errpage = wtvshared.doErrorPage(400, "A required service is not responding. Please try again in a few moments.");
		headers = errpage[0];
		data = errpage[1];
		sendToClient(socket, headers, data);
	});
});
req.end();