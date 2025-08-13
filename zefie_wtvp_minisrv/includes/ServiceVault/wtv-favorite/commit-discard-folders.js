const minisrv_service_file = true;
let errpage;

const query = request_headers.query
const folder_array = session_data.favstore.getFolders();
const totalfolders = folder_array.length;
let folder;

Object.entries(query).forEach(([key, value]) => {
	if (value === "Remove") {
		folder = key;
		return;
	}
});

if (request_headers.query.ForwardToFolders)
{
	headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
Location: wtv-favorite:/favorite`
} else {
	const folderdata = session_data.favstore.listFavorites(folder);
	const numoffavorites = Object.keys(folderdata).length;

	if (totalfolders === 1) {
		errpage = wtvshared.doErrorPage(400, "You cannot remove your last folder.");
	}

	if (errpage) {
		headers = errpage[0];
		data = errpage[1];
	} else {
		if (!request_headers.query.confirm_remove) {
			let message = '';
			if (numoffavorites == 0) {
				message = `Are you sure you want to remove <b>${folder}</b>?`;
			} else {
				message = `Removing <b>${folder}</b> will also remove the ${numoffavorites} favorites it contains.`;
			}
			let removeurl = request_headers.request_url;
			removeurl += "&confirm_remove=true";

			const confirmAlert = new clientShowAlert({
				'message': message,
				'buttonlabel1': "Don't Remove",
				'buttonaction1': "client:donothing",
				'buttonlabel2': "Remove",
				'buttonaction2': removeurl,
				'noback': true,
			}).getURL();
			headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:
Location: ${confirmAlert}`
		} else {
			
			const gourl = "wtv-favorite:/serve-discard-folders";
			session_data.favstore.deleteFolder(folder);

			headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:
Location: ${gourl}`
		}
	}
}