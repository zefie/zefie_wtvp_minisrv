const minisrv_service_file = true;

const docName = request_headers.query.docName

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = session_data.pagestore.generatePage("previewing", docName, request_headers.query.pageNum);