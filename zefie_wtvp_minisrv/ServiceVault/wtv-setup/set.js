var minisrv_service_file = true;

if (request_headers.query && session_data) {
    var settings_obj = session_data.getSessionData("wtv-setup");
    if (settings_obj === null) settings_obj = {};

    Object.keys(request_headers.query).forEach(function (k) {
        settings_obj[k] = request_headers.query[k];
    });
    session_data.setSessionData("wtv-setup", Object.assign({}, settings_obj));
    session_data.saveSessionData();
    headers = `200 OK
Content-type: text/html`;
} else {
    var outdata = doErrorPage();
    headers = outdata[0];
    data = outdata[1];
}