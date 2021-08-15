var minisrv_service_file = true;

headers = `200 OK
wtv-noback-all: wtv-
wtv-expire-all: wtv-
Content-type: text/html
wtv-service: reset
`+getServiceString('wtv-1800');


// HackTV Homepage is default
var url="file://Disk/Browser/Games/Games.html"; 

if (request_headers.query.url) {
	url = request_headers.query.url;
}

data = `<html>
<head>
<title>Going offline...</title>
<DISPLAY notvaudio allowoffline hideoptions switchtowebmode>
<body bgcolor="black" text="gold" onload="onLoad">
<script type="text/javascript">
function disconnect() {
	location.href = "client:HangUpPhone?allow-reconnect=no";
}
function go(url) {
	location.href = url;
}

if (window.location) {
     setTimeout('disconnect()',100);
     setTimeout('go("`+url+`")',200);
}
</script>
<br><br>
`
if (request_headers.query.title) {
	data += "Going offline and loading " + decodeURI(request_headers.query.title)+", please wait!";
} else {
	data += "Please wait a moment.";
}

data += "</body>\n</html>";
