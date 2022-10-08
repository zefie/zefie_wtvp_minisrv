var minisrv_service_file = true;

function hex_to_ascii(POST)
 {
	var hex  = POST.toString();
	var str = '';
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	return str;
 }

var POST = request_headers.post_data;
var image = hex_to_ascii(POST);

var url = request_headers.request;

var title = url.split('favorite-title=')[1]
title = title.split('&')[0]

var folder = url.split('favorite-category=')[1]
folder = folder.split('&')[0]
folder = folder.replaceAll("+", " ")

var imagetype = url.split('favorite-thumbnail-type=')[1]
imagetype = imagetype.split('&')[0]

var favurl = url.split('favorite-url=')[1]
favurl = favurl.split('&')[0]

var favoritenum = 0;
var favstore_exists = ssid_sessions[socket.ssid].favstore.favstoreExists();
var favarray = ssid_sessions[socket.ssid].favstore.listFavorites(folder);
favoritenum = Object.keys(favarray).length;

if (favoritenum == minisrv_config.services[service_name].max_favorites_per_folder)
{
	headers = `400 You can only have ${minisrv_config.services[service_name].max_favorites_per_folder} favorites in a folder. Discard some favorites or choose a different folder, then try again.`
} else {

var createresult = ssid_sessions[socket.ssid].favstore.createFavorite(title, favurl, folder, image, imagetype);

headers = `200 OK
wtv-expire: wtv-favorite:/serve-browser?favorite_folder_name=${folder}`
}