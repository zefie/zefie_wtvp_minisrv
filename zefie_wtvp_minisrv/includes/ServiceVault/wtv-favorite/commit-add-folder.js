const minisrv_service_file = true;

const foldername = request_headers.query.new_folder_name;
const favstore_exists = session_data.favstore.favstoreExists();
const valid_foldername = session_data.favstore.checkFolderName(foldername);


if (!valid_foldername) {
	headers = `400 That folder name is not valid. Choose a different name and try again.`
} else {
	const folder_exists = session_data.favstore.folderExists(foldername);
	const folder_array = session_data.favstore.getFolders();

	if (foldername) {
		if (favstore_exists === false)
			session_data.favstore.createFavstore();

		if (folder_exists === false) {
			if (folder_array.length < minisrv_config.services[service_name].max_folders) {
				session_data.favstore.createFolder(foldername);
				headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
Location: wtv-favorite:/favorite
wtv-expire-all: wtv-favorite:`
			} else {
				headers = `400 You can only have ${minisrv_config.services[service_name].max_folders} folders at one time. Delete some folders and try again.`
			}
		} else {
			headers = `400 That folder already exists. Choose a different name and try again.`
		}
	} else {
		headers = `400 Please type a folder name.`
	}
}