var minisrv_service_file = true;
var errpage;

var query = request_headers.query
var folder_array = session_data.favstore.getFolders();
var totalfavorites = folder_array.length;

var strName, strValue ;

for(strName in query)
{
	break;
}

strName = strName.replaceAll("+", " ");

if (request_headers.query.ForwardToFolders)
{
	headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
Location: wtv-favorite:/favorite`
} else if (strName != "getCaseInsensitiveKey") {
var folder = session_data.favstore.getFolders();
var folderdata = session_data.favstore.listFavorites(strName);
var numoffavorites = Object.keys(folderdata).length;

if (totalfavorites == 1) {
	errpage = wtvshared.doErrorPage(400, "You cannot remove your last folder.");
}

if (errpage) {
	headers = errpage[0];
	data = errpage[1];
} else {
	if (!request_headers.query.confirm_remove) {
		var message = '';
		if (numoffavorites == 0) {
			message = `Are you sure you want to remove <b>${strName}</b>?`;
		} else {
			message = `Removing <b>${strName}</b> will also remove the ${numoffavorites} favorites it contains.`;
		}
		var removeurl = request_headers.request_url;
		removeurl += "&confirm_remove=true";

		var confirmAlert = new clientShowAlert({
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
		
		var gourl = "wtv-favorite:/serve-discard-folders";
		session_data.favstore.deleteFolder(strName);

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
Location: wtv-favorite:/serve-discard-folders`
}