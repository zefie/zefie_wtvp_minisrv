const minisrv_service_file = true;

const docName = request_headers.query.docName;
const position = request_headers.query.blockNum

	session_data.pagestore.deleteBlock(docName, position);
	headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`