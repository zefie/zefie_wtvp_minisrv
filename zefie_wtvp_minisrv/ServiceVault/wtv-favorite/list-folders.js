var minisrv_service_file = true;

var favstore_exists = session_data.favstore.favstoreExists();

if (favstore_exists != true)
{
	session_data.favstore.createFavstore();
}

var folder_array = session_data.favstore.getFolders();
var data = "";

for (let i = 0; i < folder_array.length; i++) data += folder_array[i] + "\0";

headers = `200 OK
Content-type: text/plain`