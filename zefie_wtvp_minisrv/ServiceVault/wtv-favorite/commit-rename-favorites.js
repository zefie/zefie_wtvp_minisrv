var minisrv_service_file = true;

var favoritenum = 0;
var folder = request_headers.query.favorite_folder_name;
var favarray = session_data.favstore.listFavorites(folder);

favoritenum = Object.keys(favarray).length;

for (let i = 0; i < favoritenum; i++) {
	switch(i) {
	case 0:
		var favid = request_headers.query.favorite0id;
		var favname = request_headers.query.favorite0name;
		break;
	case 1:
		var favid = request_headers.query.favorite1id;
		var favname = request_headers.query.favorite1name;
		break;
	case 2:
		var favid = request_headers.query.favorite2id;
		var favname = request_headers.query.favorite2name;
		break;
	case 3:
		var favid = request_headers.query.favorite3id;
		var favname = request_headers.query.favorite3name;
		break;
	case 4:
		var favid = request_headers.query.favorite4id;
		var favname = request_headers.query.favorite4name;
		break;
	case 5:
		var favid = request_headers.query.favorite5id;
		var favname = request_headers.query.favorite5name;
		break;
	case 6:
		var favid = request_headers.query.favorite6id;
		var favname = request_headers.query.favorite6name;
		break;
	case 7:
		var favid = request_headers.query.favorite7id;
		var favname = request_headers.query.favorite7name;
		break;
	case 8:
		var favid = request_headers.query.favorite8id;
		var favname = request_headers.query.favorite8name;
		break;
	case 9:
		var favid = request_headers.query.favorite9id;
		var favname = request_headers.query.favorite9name;
		break;
	case 10:
		var favid = request_headers.query.favorite10id;
		var favname = request_headers.query.favorite10name;
		break;
	case 11:
		var favid = request_headers.query.favorite11id;
		var favname = request_headers.query.favorite11name;
		break;
	case 12:
		var favid = request_headers.query.favorite12id;
		var favname = request_headers.query.favorite12name;
		break;
	case 13:
		var favid = request_headers.query.favorite13id;
		var favname = request_headers.query.favorite13name;
		break;
	case 14:
		var favid = request_headers.query.favorite14id;
		var favname = request_headers.query.favorite14name;
		break;
	case 15:
		var favid = request_headers.query.favorite15id;
		var favname = request_headers.query.favorite15name;
		break;
	case 16:
		var favid = request_headers.query.favorite16id;
		var favname = request_headers.query.favorite16name;
		break;
	case 17:
		var favid = request_headers.query.favorite17id;
		var favname = request_headers.query.favorite17name;
		break;
	}
	session_data.favstore.changeFavoriteName(favid, folder, favname);
}

var gourl = `wtv-favorite:/serve-browser?favorite_folder_name=${folder}`;

headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:
wtv-visit: ${gourl}
Location: ${gourl}`
