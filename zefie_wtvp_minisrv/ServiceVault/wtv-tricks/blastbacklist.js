headers = `200 OK
wtv-expire-all: wtv-
wtv-expire-all: http
Content-type: text/html`

var visit_url = null;

if (request_headers.Referer) visit_url = request_headers.Referer;
else if (request_headers.query.return_to) visit_url = request_headers.query.return_to;
else visit_url = "client:goback";

data = `<html>
<head>
    <meta
        http-equiv=refresh
        content="1; url=`+ visit_url +`"
    >	
<body bgcolor="black" text="gold" link="gold" vlink="gold" alink="gold">
Successfully expired service URL cache<br>
Any previously cached pages should be reloaded from the network.<br><br>
<a href="`+visit_url+`">Not loading? Click here.</a>
</body>
</html>`;