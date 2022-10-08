var minisrv_service_file = true;

var with_pictures = request_headers.query.with_pictures

if (with_pictures = "on")
{
	ssid_sessions[socket.ssid].setSessionData("subscriber_fav_images", true)
} else {
	ssid_sessions[socket.ssid].setSessionData("subscriber_fav_images", false)
}
ssid_sessions[socket.ssid].saveSessionData();

headers = `300 OK
Location: wtv-favorite:/favorite`