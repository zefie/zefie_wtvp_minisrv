var gourl = "wtv-1800:/finish-prereg?";
if (query['relogin']) gourl += "relogin=true";


if (request_headers['wtv-ticket']) {
	gourl = "wtv-head-waiter:/login-stage-two?";
}

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-open-isp-disabled: false
wtv-visit: `+ gourl + `
Content-type: text/html`;
