// Allow URL access outside our trusted minisrv

if (request_headers.query.url) var url = unescape(request_headers.query.url);
else var url = "client:showalert?message=Please%20provide%20a%20%3Furl%3D%20with%20the%20url%20you%20would%20like%20to%20access.&buttonlabel1=Okay&buttonacction1=client:donothing"

headers = `200 OK
wtv-visit: `+url+`
Content-type: text/html`


data = '';