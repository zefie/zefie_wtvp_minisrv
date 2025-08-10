var minisrv_service_file = true;
var request_is_async = true;

var options = {
    host: "flashrom.webtv.onl",
    port: 443,
    path: "/big-willie.html"
};

var data = "";   
console.log(" * Getting Big Willie Page");

var req = https.request(options, function(res) {
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
		var errpage = wtvshared.doErrorPage(400)
		headers = errpage[0];
		data = errpage[1];
		sendToClient(socket, headers, data);
	});



req.end();