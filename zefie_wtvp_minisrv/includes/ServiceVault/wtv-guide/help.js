const minisrv_service_file = true;

data = wtvguide.generatePage(request_headers.query.topic || "Index", request_headers.query.subtopic || "Main", request_headers.query.page || null)

if (data) {
    headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`
} else {
    const err = wtvshared.doErrorPage(500);
    console.log(" * wtv-guide error: no implementation for selected for topic/subtopic, or an error occured during generation")
    headers = err[0];
    data = err[1];
}