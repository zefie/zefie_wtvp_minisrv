minisrv_service_file = true;

if (!request_headers.query.mediaData) {
    var errpage = wtvshared.doErrorPage(400, "Bad Request", "Missing mediaData parameter.");
    headers = errpage[0];
    data = errpage[1];    
} else {
    var id = session_data.pagestore.getFreeScrapbookID();
    var result = session_data.pagestore.addToScrapbook(id, "image/jpg", request_headers.query.mediaData);
    if (result) {
        headers = `300 OK
Content-Type: text/html
wtv-expire-all: wtv-author:/scrapbook
Location: wtv-author:/scrapbook
wtv-visit: wtv-author:/scrapbook`;
    } else {
        var errpage = wtvshared.doErrorPage(500, "Internal Server Error", "Failed to add scrapbook item.");
        headers = errpage[0];
        data = errpage[1];
    }
}