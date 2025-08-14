const minisrv_service_file = true;

const docName = request_headers.query.docName;
const docTitle = request_headers.query.docTitle;

if (docTitle.length === 0) {
	headers = "400 You must enter a title for your page. Please enter a title and try again."
} else {
	const pagedata = session_data.pagestore.loadPage(docName);
	const description = request_headers.query.docDesc
	const showtitle = request_headers.query.hideTitle

	session_data.pagestore.editMetadata(docTitle, description, showtitle, docName);
	headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-title
wtv-expire-all: wtv-author:/documents
wtv-expire-all: wtv-author:/doc-info
Location: ${request_headers.query.returnPageURL}`
}