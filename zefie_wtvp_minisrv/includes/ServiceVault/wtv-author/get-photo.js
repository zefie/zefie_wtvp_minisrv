const minisrv_service_file = true;

const docName = request_headers.query.docName;
const blockNum = request_headers.query.blockNum;
const page = session_data.pagestore.loadPage(docName);

// FIX: an unknown doc, a missing block, or a block with no photo used to
// throw (headers were set, data never was).
if (!page || !Array.isArray(page.blocks) || !page.blocks[blockNum] || !page.blocks[blockNum].photo) {
	headers = `404 Not Found
Content-Type: text/html`;
	data = "Photo not found.";
} else {
	headers = `200 OK
Content-Type: image/jpeg`;
	data = Buffer.from(page.blocks[blockNum].photo, 'base64');
}
