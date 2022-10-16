var minisrv_service_file = true;


var fast_splash = wtvshared.parseBool(request_headers.query.fast_splash);


session_data.set("fast_splash", fast_splash);

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`
