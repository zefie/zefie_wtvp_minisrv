var minisrv_service_file = true;

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
<script src=file://rom/Cache/h.js></script><script src=file://rom/Cache/n.js></script><script>
head('${minisrv_config.config.service_name} Tricks - Blast Blacklist','','','',1)</script>
<table cellspacing=0 cellpadding=0><tr><td abswidth=10>&nbsp;<td colspan=3>
<br>
Successfully expired service URL cache<br>
Any previously cached pages should be reloaded from the network.<br><br>
<a href="`+visit_url+`">Not loading? Click here.</a>
</body>
</html>`;