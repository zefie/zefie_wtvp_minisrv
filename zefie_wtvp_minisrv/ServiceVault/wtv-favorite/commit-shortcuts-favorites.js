var minisrv_service_file = true;

var folder = request_headers.query.favorite_folder_name;
var key = request_headers.query.Choose;
var id = request_headers.query.favoriteid;

session_data.favstore.createShortcutKey();
session_data.favstore.updateShortcutKey("none", key, folder, id);

