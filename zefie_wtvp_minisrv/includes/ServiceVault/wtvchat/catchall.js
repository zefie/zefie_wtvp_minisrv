var minisrv_service_file = true;

var urldata = request_headers.request_url.split(":");
delete urldata[0];

urldata = urldata.join(":").substring(1);
console.log(urldata);
while (urldata.substring(0, 1) == "/") urldata = urldata.substring(1);

var server = urldata.split('/')[0];
var port = 6667;

if (server.indexOf(":") > 0) {
    port = server.split(":")[1];
    server = server.split(":")[0];
}
channel = urldata.split('/')[1]

var dest_url = "wtv-chat:/MakeChatPage?host=" + server + "&port=" + port + "&channel=" + channel;
headers = `300 Moved
Location: ${dest_url}`
