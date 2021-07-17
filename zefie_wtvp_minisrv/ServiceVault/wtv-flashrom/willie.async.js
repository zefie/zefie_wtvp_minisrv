// willie is just a graphical frontend to a list of ROMs
// the rest of the scripts should work if you manually link to a ROM, and actually have it.


var proxy_query = '';
if (query['flash']) delete query['flash'];
if (query['vflash']) delete query['vflash'];

for (const [key, value] of Object.entries(query)) {
	proxy_query += "&" + key + "=" + value;
}

console.log(proxy_query);

var options = {
	host: "wtv.zefie.com",
	path: "/willie.php?pflash=" + getSessionData(socket_session_data[socket.id].ssid, 'wtv-client-rom-type') + proxy_query,
	method: 'GET'
}


headers = "200 OK\nContent-type: text/html";
const req = http.request(options, function (res) {
	data = '';
	console.log(` * Upstream HTTP StatusCode: ${res.statusCode}`)

	res.on('data', d => {
		data += d;
	})

	res.on('end', function () {
		sendToClient(socket, headers, data);
	});
});
req.end();
