var minisrv_service_file = true;

var favoritenum = 0;
var folder = request_headers.query.favorite_folder_name || null;
var favarray = session_data.favstore.listFavorites(folder);
var error_occured = false;
if (!folder) error_occured = true;
else {
	favoritenum = Object.keys(favarray).length;

	if (typeof request_headers.query.favoriteid === 'string') {
		// one favorite
		var favid = request_headers.query.favoriteid;
		var favfolder = request_headers.query.favoritefolder;
		if (folder != favfolder) session_data.favstore.moveFavorite(folder, favfolder, favid);
	} else {
		if (request_headers.query.favoriteid.length == request_headers.query.favoritefolder.length) {
			// both queries should have the same number of entries 
			Object.keys(request_headers.query.favoriteid).forEach(function (k) {
				var favid = request_headers.query.favoriteid[k];
				var favfolder = request_headers.query.favoritefolder[k];
				if (folder != favfolder) session_data.favstore.moveFavorite(folder, favfolder, favid);
			})
		} else {
			error_occured = true;
        }
	}

	if (!error_occured) {
		var gourl = `wtv-favorite:/serve-browser?favorite_folder_name=${folder}`;

		headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:
Location: ${gourl}`
	} else {
		var err = doErrorPage(500);
		headers = err[0];
		data = err[1];
    }
}