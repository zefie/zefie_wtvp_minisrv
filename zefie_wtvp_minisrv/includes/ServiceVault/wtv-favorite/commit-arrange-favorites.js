var minisrv_service_file = true;

var with_pictures = request_headers.query.with_pictures

if (with_pictures = "on")
{
	session_data.setSessionData("subscriber_fav_images", true)
} else {
	session_data.setSessionData("subscriber_fav_images", false)
}
session_data.saveSessionData();

headers = `300 OK
Location: wtv-favorite:/favorite`