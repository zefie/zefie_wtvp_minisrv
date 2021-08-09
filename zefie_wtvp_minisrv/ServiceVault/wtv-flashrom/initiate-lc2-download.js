if (request_headers.query.path) {
var url = service_name + ":/get-lc2-page?path=" + request_headers.query.path;
var romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
	if (romtype == "bf0app") {
		url = "client:updateflash?ipaddr=" + minisrv_config.services[service_name].host + "&port=" + minisrv_config.services[service_name].port + "&path=" + escape(service_name + ":/" +request_headers.query.path);
		if (request_headers.query.numparts) url += escape("&numparts=" + request_headers.query.numparts);
	}
	headers = "200 OK\n";
	headers += "wtv-visit: " + url + "\n";
	headers += "Content-type: text/html";
	data = '';
} else {
	var errpage = doErrorPage(400)
	headers = errpage[0];
	data = errpage[1];
}