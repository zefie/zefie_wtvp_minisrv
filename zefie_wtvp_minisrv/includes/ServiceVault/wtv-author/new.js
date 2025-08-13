const minisrv_service_file = true;

let create = true;
const pagenums = session_data.pagestore.listPages().length;
if (minisrv_config.services["wtv-author"].max_pages) {
	if (pagenums + 1 > minisrv_config.services["wtv-author"].max_pages) {
		create = false;
	}
}
if (create) {
	const pagename = session_data.pagestore.createPage(request_headers.query.styleName.replace(' ', '_'));

	headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-author:/documents
Location: wtv-author:/show-blocks?docName=${pagename}`
} else {
		const err = wtvshared.doErrorPage(500, "You are not allowed to create more than <b>"+minisrv_config.services["wtv-author"].max_pages+"</b> pages.");
		headers = err[0];
		data = err[1];
}