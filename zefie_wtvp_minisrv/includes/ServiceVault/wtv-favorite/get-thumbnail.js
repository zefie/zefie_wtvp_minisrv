const minisrv_service_file = true;

let errpage = null;

const id = request_headers.query.id;
const folder = request_headers.query.folder;
const favorite = session_data.favstore.getFavorite(folder, id);
if (!favorite) errpage = wtvshared.doErrorPage(400, "Invalid favorite ID");


    headers = `200 OK
Content-Type: ${favorite.imagetype}`;
    data = new Buffer.from(favorite.image, 'base64');
