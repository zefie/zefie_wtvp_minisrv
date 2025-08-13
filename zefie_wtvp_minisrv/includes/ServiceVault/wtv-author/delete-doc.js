const minisrv_service_file = true;

const docName = request_headers.query.docName;
const position = request_headers.query.blockNum

	session_data.pagestore.deletePage(docName);
	headers = `300 OK
wtv-expire-all: wtv-author:/documents
wtv-expire-all: wtv-author:/doc-info
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/edit-title
wtv-expire-all: wtv-author:/block-preview
Location: wtv-author:/documents`