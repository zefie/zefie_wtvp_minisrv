var minisrv_service_file = true;

var errpage = null;

var docName = request_headers.query.docName;
var blockNum = request_headers.query.blockNum;
var page = session_data.pagestore.loadPage(docName);

if (!errpage) {
    headers = `200 OK
Content-Type: image/jpeg`;
    data = new Buffer.from(page.blocks[blockNum].photo, 'base64');
	console.log(data)
}