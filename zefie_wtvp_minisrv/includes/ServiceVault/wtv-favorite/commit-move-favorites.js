const minisrv_service_file = true;

let favoritenum = 0;
const folder = request_headers.query.favorite_folder_name || null;
const favarray = session_data.favstore.listFavorites(folder);
let error_occured = false;
if (!folder) error_occured = true;
else {
	favoritenum = Object.keys(favarray).length;

	if (typeof request_headers.query.favoriteid === 'string') {
		// one favorite
		const favid = request_headers.query.favoriteid;
		const favfolder = request_headers.query.favoritefolder;
		if (folder != favfolder) session_data.favstore.moveFavorite(folder, favfolder, favid);
	} else {
		if (request_headers.query.favoriteid.length == request_headers.query.favoritefolder.length) {
			// both queries should have the same number of entries 
			Object.keys(request_headers.query.favoriteid).forEach(function (k) {
				const favid = request_headers.query.favoriteid[k];
				const favfolder = request_headers.query.favoritefolder[k];
				if (folder != favfolder) session_data.favstore.moveFavorite(folder, favfolder, favid);
			})
		} else {
			error_occured = true;
        }
	}

	if (!error_occured) {
		const gourl = `wtv-favorite:/serve-browser?favorite_folder_name=${folder}`;

		headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:
Location: ${gourl}`
	} else {
		const err = wtvshared.doErrorPage(500);
		headers = err[0];
		data = err[1];
    }
}