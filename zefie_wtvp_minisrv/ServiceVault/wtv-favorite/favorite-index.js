var minisrv_service_file = true;

var favstore_exists = ssid_sessions[socket.ssid].favstore.favstoreExists();

if (favstore_exists != true)
{
	ssid_sessions[socket.ssid].favstore.createFavstore();
	headers = `300 OK
Location: wtv-favorite:/favorite`
} else {

var folder_array = ssid_sessions[socket.ssid].favstore.getFolders();
var url = request_headers.request;
var key = url.split('?')[1]

headers = `400 You have not assigned a favorite to ${key}`

}