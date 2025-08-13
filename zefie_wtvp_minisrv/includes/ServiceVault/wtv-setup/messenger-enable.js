const minisrv_service_file = true;
let justenabled, enablestatus;

if (!session_data.getSessionData("messenger_enabled") == 1) {
	session_data.setSessionData("messenger_enabled", 1);
	session_data.saveSessionData;
	justenabled = "true";
	enablestatus = "1";
} else {
	session_data.setSessionData("messenger_enabled", 0);
	session_data.saveSessionData;
	justenabled = "false"
	enablestatus = "0"
}

headers = `300 OK
Content-type: text/html
wtv-expire: wtv-setup:/messenger
Location: wtv-setup:/messenger?just_enabled=${justenabled}
wtv-messenger-enable: ${enablestatus}
`;
