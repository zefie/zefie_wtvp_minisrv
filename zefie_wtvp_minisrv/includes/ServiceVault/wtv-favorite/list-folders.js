const minisrv_service_file = true;
const favstore_exists = session_data.favstore.favstoreExists();

if (favstore_exists !== true) {
	session_data.favstore.createFavstore();
}

const folder_array = session_data.favstore.getFolders();
data = "";

for (let i = 0; i < folder_array.length; i++) data += folder_array[i] + "\0";

headers = `200 OK
Content-type: text/plain`