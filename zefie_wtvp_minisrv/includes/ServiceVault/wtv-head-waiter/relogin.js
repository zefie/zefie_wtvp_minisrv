var minisrv_service_file = true;

session_data.setUserLoggedIn(false);

var gourl = "wtv-1800:/preregister?";
if (request_headers.query.relogin) gourl += "relogin=true";
else if (request_headers.query.reconnect) gourl += "reconnect=true";

headers = `200 OK
Connection: Keep-Alive
Expires: Wed, 09 Oct 1991 22:00:00 GMT
wtv-expire-all: wtv-head-waiter:
wtv-expire-all: wtv-1800:
wtv-service: reset
${getServiceString('wtv-1800')}
wtv-visit: ${gourl}
Content-type: text/html`;
data = '';