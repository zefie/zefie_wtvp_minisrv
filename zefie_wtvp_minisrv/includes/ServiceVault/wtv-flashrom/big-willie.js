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
});


req.end();