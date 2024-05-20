var minisrv_service_file = true;

// remove restrictions once this page is shown, since the user will be 'trapped' anyway
session_data.disableLockdown();
ssid_sessions[socket.ssid].delete("wtv-need-upgrade")
ssid_sessions[socket.ssid].delete("wtv-")

headers = `200 OK
Content-type: text/html
wtv-expire: wtv-home:
wtv-visit: wtv-home:/home`;

data = '';