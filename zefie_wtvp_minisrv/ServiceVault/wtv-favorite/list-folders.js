var minisrv_service_file = true;

var favstore_exists = ssid_sessions[socket.ssid].favstore.favstoreExists();

if (favstore_exists != true)
{
	ssid_sessions[socket.ssid].favstore.createFavstore();
}

var folder_array = ssid_sessions[socket.ssid].favstore.getFolders();
var data = "";

for (let i = 0; i < folder_array.length; i++) data += folder_array[i] + "\0";

headers = `200 OK
Content-type: text/plain`