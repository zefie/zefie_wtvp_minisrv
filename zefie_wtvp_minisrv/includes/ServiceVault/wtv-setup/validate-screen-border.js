const minisrv_service_file = true;

if (request_headers.query) {
    if (request_headers.query.shade) {
        headers = `300 OK
Location: wtv-setup:/screen
wtv-visit: client:setscreenborder?shade=${request_headers.query.shade}`;
    } else {
        const errpage = wtvshared.doErrorPage(400, null, "Missing shade parameter");
        headers = errpage[0];
        data = errpage[1];
    }
} else {
    const errpage = wtvshared.doErrorPage(400, null, "Missing query");
    headers = errpage[0];
    data = errpage[1];
}
