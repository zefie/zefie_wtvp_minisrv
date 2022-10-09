var minisrv_service_file = true;

if (!session_data.getSessionData("messenger_enabled") == 1) {
	session_data.setSessionData("messenger_enabled", 1);
	session_data.saveSessionData;
	var justenabled = "true"
	var enablestatus = "1"
} else {
	session_data.setSessionData("messenger_enabled", 0);
	session_data.saveSessionData;
	var justenabled = "false"
	var enablestatus = "0"
}

headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/messenger
Location: wtv-setup:/messenger?just_enabled=${justenabled}
wtv-messenger-enable: ${enablestatus}
`;
