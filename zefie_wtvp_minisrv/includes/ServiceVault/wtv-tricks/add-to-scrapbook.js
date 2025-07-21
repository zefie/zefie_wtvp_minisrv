var minisrv_service_file = true;
var request_is_async = true;


function handleError(reason) {
    var errpage = wtvshared.doErrorPage(400, reason);
    sendToClient(socket, errpage[0], errpage[1]);
}

if (!request_headers.query.url && !request_headers.query.mediaPath) {
    handleError('No URL provided');
} else {
    var mediaURL = request_headers.query.url || request_headers.query.mediaPath;
    var targetURL = 'wtv-author:/scrapbook-add?mediaPath=' + encodeURIComponent(mediaURL);
    sendToClient(socket, {'Status': 302, 'Location': targetURL, 'wtv-visit': targetURL}, '');
}