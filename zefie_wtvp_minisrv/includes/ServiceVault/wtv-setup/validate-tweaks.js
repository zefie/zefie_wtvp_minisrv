const minisrv_service_file = true;


const fast_splash = wtvshared.parseBool(request_headers.query.fast_splash);
session_data.setSessionData("fast_splash", fast_splash);
session_data.saveSessionData();

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`
