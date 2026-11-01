const minisrv_service_file = true;

const favstore_exists = session_data.favstore.favstoreExists();

if (favstore_exists !== true)
{
	session_data.favstore.createFavstore();
	headers = `300 OK
Location: wtv-favorite:/favorite`
} else {

const folder_array = session_data.favstore.getFolders();
const url = request_headers.request;
const key = url.split('?')[1]
const scfav = session_data.favstore.getShortcutKey(key);
if (!scfav.id || scfav.id === "none") {
	headers = `400 You have not assigned a favorite to ${key}`
} else {
	const fav = session_data.favstore.getFavorite(scfav.folder, scfav.id);
	headers = `300 OK
Content-Type: text/html
Location: ${fav.url}`
}
}