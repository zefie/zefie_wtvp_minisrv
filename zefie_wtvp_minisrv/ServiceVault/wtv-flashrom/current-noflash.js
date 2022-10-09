var minisrv_service_file = true;

const WTVFlashrom = require("./WTVFlashrom.js");
request_is_async = true;

// this build can be local or on zefie's server
// to get the path from zefie's server, browse
// https://archive.midnightchannel.net/zefie/files/wtv-flashrom/content/artemis-webtv-000/
// and put everything from 'content/' onwards, including the part000.rom filename
// example is below
var default_build_to_send = minisrv_config.services[service_name].bf0app_default_rom || "content/artemis-webtv-000/build7181/daily-nondebug/bf0app-part000.rom";


var request_path = "";
var bf0app_update = true;
if (request_headers.query.path) request_path = request_headers.query.path;
else request_path = default_build_to_send;

if (session_data.get("wtv-client-rom-type") == "bf0app" && session_data.get("wtv-client-bootrom-version") == "105") {
	// assume old classic in flash mode, override user setting and send tellyscript
	// because it is required to proceed in flash mode
	bf0app_update = true;
	session_data.set("bf0app_update", bf0app_update);
}

if (!session_data.data_store.WTVFlashrom) {
	session_data.data_store.WTVFlashrom = new WTVFlashrom(minisrv_config, service_vaults, service_name, minisrv_config.services[service_name].use_zefie_server, bf0app_update);
}

session_data.data_store.WTVFlashrom.getFlashRom(request_path, function (data, headers) {
	sendToClient(socket, headers, data);
});