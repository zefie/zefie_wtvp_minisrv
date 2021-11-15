var minisrv_service_file = true;

if (request_headers.query && ssid_sessions[socket.ssid]) {
    var settings_obj = ssid_sessions[socket.ssid].getSessionData("wtv-setup");
    if (settings_obj === null) settings_obj = {};

    Object.keys(request_headers.query).forEach(function (k) {
        settings_obj[k] = request_headers.query[k];
    });
    console.log(settings_obj);
    ssid_sessions[socket.ssid].setSessionData("wtv-setup", Object.assign({}, settings_obj));
    ssid_sessions[socket.ssid].saveSessionData();
    headers = `200 OK
Content-type: text/html`;
} else {
    var outdata = doErrorPage();
    headers = outdata[0];
    data = outdata[1];
}