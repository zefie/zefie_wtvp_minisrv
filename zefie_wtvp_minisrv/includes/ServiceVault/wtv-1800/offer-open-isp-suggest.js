var minisrv_service_file = true;

var gourl = "wtv-1800:/finish-prereg?";
if (request_headers.query.relogin) gourl += "relogin=true";


if (request_headers["wtv-ticket"]) {
	gourl = "wtv-head-waiter:/login-stage-two?";
}

headers = `200 OK
Connection: Keep-Alive
minisrv-no-mail-count: true
wtv-expire-all: wtv-
wtv-open-isp-disabled: false
wtv-visit: `+ gourl + `
Content-type: text/html`;
