const minisrv_service_file = true;

if (request_headers.query && session_data) {
    let settings_obj = session_data.getSessionData("wtv-setup");
    if (settings_obj === null) settings_obj = {};

    Object.keys(request_headers.query).forEach(function (k) {
        settings_obj[k] = request_headers.query[k];
    });
    session_data.setSessionData("wtv-setup", Object.assign({}, settings_obj));
    session_data.saveSessionData();
    headers = `200 OK
Content-type: text/html`;
} else {
    const errpage = wtvshared.doErrorPage();
    headers = errpage[0];
    data = errpage[1];
}