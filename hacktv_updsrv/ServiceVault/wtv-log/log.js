console.log(initial_headers);

headers = `200 OK
Connection: Keep-Alive
Expires: `+strftime("%a, %d %b %Y %H:%M:%S", new Date((new Date().toUTCString()) + 10))+` GMT
Content-length: 0
Content-type: text/html`;

data = '';


