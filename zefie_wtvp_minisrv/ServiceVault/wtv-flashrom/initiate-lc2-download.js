if (request_headers.query.path) {
	headers = "300 OK\n";
	headers += "wtv-visit: wtv-flashrom:/get-lc2-page?path=" + request_headers.query.path + "\n";
	headers += "Location: wtv-flashrom:/get-lc2-page?path=" + request_headers.query.path + "\n";
	headers += "Content-type: text/html";
	data = '';
} else {
	var errpage = doErrorPage(400)
	headers = errpage[0];
	data = errpage[1];
}