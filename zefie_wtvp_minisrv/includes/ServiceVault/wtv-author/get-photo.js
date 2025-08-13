const minisrv_service_file = true;

const docName = request_headers.query.docName;
const blockNum = request_headers.query.blockNum;
const page = session_data.pagestore.loadPage(docName);

headers = `200 OK
Content-Type: image/jpeg`;
data = new Buffer.from(page.blocks[blockNum].photo, 'base64');