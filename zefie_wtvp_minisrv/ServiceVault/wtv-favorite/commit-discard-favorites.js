var minisrv_service_file = true;
var errpage;

var query = request_headers.query

var discardAll = request_headers.query.DiscardAll

if (discardAll != "Discard All")
{
var strName, strValue ;

for(strName in query)
{
	if (strName != "favorite_folder_name")
		break;
}

strName = strName.replaceAll("+", " ");
}
var folder = request_headers.query.favorite_folder_name;
if (request_headers.query.ForwardToBrowser)
{
	headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
Location: wtv-favorite:/serve-browser?favorite_folder_name=${folder}`
} else if (strName != "getCaseInsensitiveKey") {
var favorite = ssid_sessions[socket.ssid].favstore.getFavorite(folder, strName);

if (errpage) {
	headers = errpage[0];
	data = errpage[1];
} else {
	if (!request_headers.query.confirm_remove) {
		if (discardAll == "Discard All")
		{
			var message = `Are you sure you want to discard all favorites in this folder?`;
			var removeurl = request_headers.request_url;
			removeurl += "&confirm_remove=true&DiscardAll=Discard All";
		} else {
			var message = `Are you sure you want to discard <b>${favorite.title}</b>?`;
			var removeurl = request_headers.request_url;
			removeurl += "&confirm_remove=true";
		}
		

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
		
		var gourl = `wtv-favorite:/serve-discard-favorites?favorite_folder_name=${folder}`;
		if (discardAll == "Discard All")
		{
			ssid_sessions[socket.ssid].favstore.clearFolder(folder);
		} else {
			ssid_sessions[socket.ssid].favstore.deleteFavorite(strName, folder);
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