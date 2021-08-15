var minisrv_service_file = true;

if (request_headers.query.url) {
    if (request_headers.query.url.indexOf(":/") > 0) {
        var service_request = request_headers.query.url.split(":/")[0];
        var service_port = 0;
        Object.keys(minisrv_config.services).forEach(function (k) {
            if (minisrv_config.services[k].disabled) return;
            if (k == service_request) service_port = minisrv_config.services[k].port;
        });
        if (service_port > 0) {
            request_is_async = true;
            var request_headers_out = new Array()
            request_headers_out.request = "GET " + request_headers.query.url;
            request_headers_out.request_url = request_headers.query.url;
            request_headers_out['wtv-client-serial-number'] = socket.id + "HTTPPCReq";
            processURL(socket, request_headers_out);
/*
 var s = require('net').Socket();
            var outdata = "";
            s.connect(service_port);
            s.setTimeout(1, function () {
                outdata = outdata.split()
                sendToClient(socket,outdata);
            });
            s.on('data', function (data) {
                outdata += data;
            });
            s.write()
*/
        }
    }
}

if (!headers) {
    var errpage = doErrorPage(500)
    headers = errpage[0];
    data = errpage[1];
}