const minisrv_service_file = true;

// The client auto-submits this form when a scrapbook page loads
// (fields: pageNum, mediaCategoryID). minisrv doesn't use the value,
// so just acknowledge the request to avoid logging a 404.

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = ``
