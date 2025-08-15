const minisrv_service_file = true;
let errpage;

const query = request_headers.query

const discardAll = request_headers.query.DiscardAll
let strName;

if (discardAll !== "Discard All")
{
	for(strName in query)
	{
		if (strName !== "favorite_folder_name")
			break;
	}

	strName = strName.replaceAll("+", " ");
}

const folder = request_headers.query.favorite_folder_name;
if (request_headers.query.ForwardToBrowser)
{
	headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
Location: wtv-favorite:/serve-browser?favorite_folder_name=${folder}`
} else if (strName !== "getCaseInsensitiveKey") {
	const favorite = session_data.favstore.getFavorite(folder, strName);

	if (errpage) {
		headers = errpage[0];
		data = errpage[1];
	} else {
		if (!request_headers.query.confirm_remove) {
			let message, removeurl;
			if (discardAll === "Discard All")
			{
				message = `Are you sure you want to discard all favorites in this folder?`;
				removeurl = request_headers.request_url + "&confirm_remove=true&DiscardAll=Discard All";
			} else {
				message = `Are you sure you want to discard <b>${favorite.title}</b>?`;
				removeurl = request_headers.request_url + "&confirm_remove=true";
			}

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
			
			const gourl = `wtv-favorite:/serve-discard-favorites?favorite_folder_name=${folder}`;
			if (discardAll === "Discard All")
			{
				session_data.favstore.clearFolder(folder);
			} else {
				session_data.favstore.deleteFavorite(strName, folder);
			}

			headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:
Location: ${gourl}`
		}
	}
	} else {
				headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
Location: wtv-favorite:/serve-browser?favorite_folder_name=${folder}`
}