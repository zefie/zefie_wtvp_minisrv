var minisrv_service_file = true;

const WTVFlashrom = require("./WTVFlashrom.js");
request_is_async = true;

var bf0app_update = false;
var request_path = request_headers.request_url.replace(service_name + ":/", "");
var romtype = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
var bootver = ssid_sessions[socket.ssid].get("wtv-client-bootrom-version")

if ((romtype == "bf0app" || !romtype) && (bootver == "105" || !bootver)) {
	// assume old classic in flash mode, override user setting and send tellyscript
	// because it is required to proceed in flash mode
	bf0app_update = true;
	ssid_sessions[socket.ssid].set("bf0app_update", bf0app_update);
}

if (!ssid_sessions[socket.ssid].data_store.WTVFlashrom) {
	ssid_sessions[socket.ssid].data_store.WTVFlashrom = new WTVFlashrom(minisrv_config, service_vaults, service_name, minisrv_config.services[service_name].use_zefie_server, bf0app_update);
}

ssid_sessions[socket.ssid].data_store.WTVFlashrom.getFlashRom(request_path, function (data, headers) {
	sendToClient(socket, headers, data);
});
