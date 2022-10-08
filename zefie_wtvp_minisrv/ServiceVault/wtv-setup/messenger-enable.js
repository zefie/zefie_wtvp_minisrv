var minisrv_service_file = true;

if (!ssid_sessions[socket.ssid].getSessionData("messenger_enabled") == 1) {
	ssid_sessions[socket.ssid].setSessionData("messenger_enabled", 1);
	ssid_sessions[socket.ssid].saveSessionData;
	var justenabled = "true"
	var enablestatus = "1"
} else {
	ssid_sessions[socket.ssid].setSessionData("messenger_enabled", 0);
	ssid_sessions[socket.ssid].saveSessionData;
	var justenabled = "false"
	var enablestatus = "0"
}

headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/messenger
Location: wtv-setup:/messenger?just_enabled=${justenabled}
wtv-messenger-enable: ${enablestatus}
`;
