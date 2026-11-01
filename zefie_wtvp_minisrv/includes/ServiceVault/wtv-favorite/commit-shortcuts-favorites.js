const minisrv_service_file = true;

const folder = request_headers.query.favorite_folder_name;
const key = request_headers.query.Choose;
const id = request_headers.query.favoriteid;

session_data.favstore.updateShortcutKey("none", key, folder, id);

headers = `300 OK
Content-type: text/html
Location: wtv-favorite:/serve-shortcuts-favorites?favorite_folder_name=${folder}`
