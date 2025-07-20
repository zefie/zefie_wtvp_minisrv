var minisrv_service_file = true;

ssid_sessions[socket.ssid].delete("wtv-need-upgrade")
ssid_sessions[socket.ssid].delete("wtv-used-8675309")

const errpage = wtvshared.doRedirect("wtv-home:/home");
headers = errpage[0];
data = errpage[1];
