var gourl = "wtv-1800:/offer-open-isp-suggest?";
if (initial_headers['wtv-ticket']) {
	gourl = "wtv-head-waiter:/login-stage-two?";
}

headers = `200 OK
Connection: Keep-Alive
wtv-open-isp-disabled: false
wtv-visit: wtv-1800:/offer-open-isp-suggest?
Content-type: text/html`;