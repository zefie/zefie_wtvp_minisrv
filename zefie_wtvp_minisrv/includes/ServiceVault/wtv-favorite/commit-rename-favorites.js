const minisrv_service_file = true;

let favoritenum = 0;
const folder = request_headers.query.favorite_folder_name;
const favarray = session_data.favstore.listFavorites(folder);

favoritenum = Object.keys(favarray).length;
let favid, favname;

for (let i = 0; i < favoritenum; i++) {
	switch(i) {
	case 0:
		favid = request_headers.query.favorite0id;
		favname = request_headers.query.favorite0name;
		break;
	case 1:
		favid = request_headers.query.favorite1id;
		favname = request_headers.query.favorite1name;
		break;
	case 2:
		favid = request_headers.query.favorite2id;
		favname = request_headers.query.favorite2name;
		break;
	case 3:
		favid = request_headers.query.favorite3id;
		favname = request_headers.query.favorite3name;
		break;
	case 4:
		favid = request_headers.query.favorite4id;
		favname = request_headers.query.favorite4name;
		break;
	case 5:
		favid = request_headers.query.favorite5id;
		favname = request_headers.query.favorite5name;
		break;
	case 6:
		favid = request_headers.query.favorite6id;
		favname = request_headers.query.favorite6name;
		break;
	case 7:
		favid = request_headers.query.favorite7id;
		favname = request_headers.query.favorite7name;
		break;
	case 8:
		favid = request_headers.query.favorite8id;
		favname = request_headers.query.favorite8name;
		break;
	case 9:
		favid = request_headers.query.favorite9id;
		favname = request_headers.query.favorite9name;
		break;
	case 10:
		favid = request_headers.query.favorite10id;
		favname = request_headers.query.favorite10name;
		break;
	case 11:
		favid = request_headers.query.favorite11id;
		favname = request_headers.query.favorite11name;
		break;
	case 12:
		favid = request_headers.query.favorite12id;
		favname = request_headers.query.favorite12name;
		break;
	case 13:
		favid = request_headers.query.favorite13id;
		favname = request_headers.query.favorite13name;
		break;
	case 14:
		favid = request_headers.query.favorite14id;
		favname = request_headers.query.favorite14name;
		break;
	case 15:
		favid = request_headers.query.favorite15id;
		favname = request_headers.query.favorite15name;
		break;
	case 16:
		favid = request_headers.query.favorite16id;
		favname = request_headers.query.favorite16name;
		break;
	case 17:
		favid = request_headers.query.favorite17id;
		favname = request_headers.query.favorite17name;
		break;
	}
	session_data.favstore.changeFavoriteName(favid, folder, favname);
}

const gourl = `wtv-favorite:/serve-browser?favorite_folder_name=${folder}`;

headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:
wtv-visit: ${gourl}
Location: ${gourl}`
