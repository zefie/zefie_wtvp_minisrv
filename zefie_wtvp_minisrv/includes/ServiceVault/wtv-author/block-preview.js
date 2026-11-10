const minisrv_service_file = true;

const docName = request_headers.query.docName

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

const pageNum = parseInt(request_headers.query.pageNum) || 1;
try {
	data = session_data.pagestore.generatePage("editing", docName, pageNum);
} catch (e) {
	// FIX: generatePage() throws on a missing page; that used to be a
	// bare script error. Show a clean 400 instead.
	headers = `400 Page not found.`;
	data = "";
}
