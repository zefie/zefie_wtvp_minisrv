var minisrv_service_file = true;

if (request_headers.query) {
    if (request_headers.query.shade) {
        headers = `300 OK
Location: wtv-setup:/screen
wtv-visit: client:setscreenborder?shade=${request_headers.query.shade}`;
    } else {
        var errpage = wtvshared.doErrorPage(400);
        headers = errpage[0];
        data = errpage[1];
    }
} else {
    var errpage = wtvshared.doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
}
