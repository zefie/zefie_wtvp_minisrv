const minisrv_service_file = true;

let urldata = request_headers.request_url.split(":");
delete urldata[0];

urldata = urldata.join(":").slice(1);
console.log(urldata);
while (urldata.slice(0, 1) == "/") urldata = urldata.slice(1);

let server = urldata.split('/')[0];
let port = 6667;

if (server.indexOf(":") > 0) {
    port = server.split(":")[1];
    server = server.split(":")[0];
}
const channel = urldata.split('/')[1]

const dest_url = "wtv-chat:/MakeChatPage?host=" + server + "&port=" + port + "&channel=" + channel;
headers = `300 Moved
Location: ${dest_url}`
