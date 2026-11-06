const minisrv_service_file = true;

const docName = request_headers.query.docName

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`


const pageNum = parseInt(request_headers.query.pageNum) || 1;
data = session_data.pagestore.generatePage("editing", docName, pageNum);