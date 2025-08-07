var minisrv_service_file = true;

var folder = request_headers.query.favorite_folder_name;
var key = request_headers.query.Choose;
var id = request_headers.query.favoriteid;

session_data.favstore.updateShortcutKey("none", key, folder, id);

headers = `300 OK
Content-type: text/html
Location: wtv-favorite:/serve-shortcuts-favorites?favorite_folder_name=${folder}`
