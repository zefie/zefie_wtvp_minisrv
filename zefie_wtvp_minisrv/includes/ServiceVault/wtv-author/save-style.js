const minisrv_service_file = true;

const docName = request_headers.query.docName;
const page = session_data.pagestore.loadPage(docName);
// FIX: .replace(' ', '_') only replaced the first space and threw when
// styleName was missing. A missing page used to throw on page.style.
const style = (request_headers.query.styleName || "").toString().replace(/ /g, '_')
if (!page) {
	headers = `300 OK
Location: wtv-author:/documents`
	data = "";
} else {
	page.style = style;
	session_data.pagestore.editPage(page, docName);
	headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/show-blocks?docName=${docName}`
	data = "";
}
