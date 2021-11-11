var minisrv_service_file = true;

var errpage = null;

var id = request_headers.query.id;
var folder = request_headers.query.folder;
var favorite = session_data.favstore.getFavorite(folder, id);
if (!favorite) errpage = wtvshared.doErrorPage(400, "Invalid favorite ID");


    headers = `200 OK
Content-Type: ${favorite.imagetype}`;
    data = new Buffer.from(favorite.image, 'base64');
