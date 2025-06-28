var minisrv_service_file = true;

// remove restrictions once this page is shown, since the user will be 'trapped' anyway
session_data.disableLockdown();
ssid_sessions[socket.ssid].delete("wtv-need-upgrade")
ssid_sessions[socket.ssid].delete("wtv-")

errpage = wtvshared.doRedirect("wtv-home:/home")
headers = errpage[0];
data = errpage[1];