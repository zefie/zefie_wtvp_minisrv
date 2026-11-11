const minisrv_service_file = true;

let create = true;
const pagenums = session_data.pagestore.listPages().length;
if (minisrv_config.services["wtv-author"].max_pages) {
	if (pagenums + 1 > minisrv_config.services["wtv-author"].max_pages) {
		create = false;
	}
}
if (create) {
	// FIX: .replace(' ', '_') only replaced the first space and threw
	// when styleName was missing. createPage() can also return false
	// (page already exists), which used to redirect to
	// show-blocks?docName=false.
	const styleName = (request_headers.query.styleName || "").toString().replace(/ /g, '_');
	const pagename = session_data.pagestore.createPage(styleName);
	if (pagename === false) {
		const err = wtvshared.doErrorPage(500, "Could not create the page. Please try again.");
		headers = err[0];
		data = err[1];
	} else {
		headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-author:/documents
Location: wtv-author:/show-blocks?docName=${pagename}`
		data = "";
	}
} else {
		const err = wtvshared.doErrorPage(500, "You are not allowed to create more than <b>"+minisrv_config.services["wtv-author"].max_pages+"</b> pages.");
		headers = err[0];
		data = err[1];
}
