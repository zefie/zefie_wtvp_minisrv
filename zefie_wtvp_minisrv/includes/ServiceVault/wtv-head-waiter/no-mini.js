var minisrv_service_file = true;

ssid_sessions[socket.ssid].delete("wtv-need-upgrade")
ssid_sessions[socket.ssid].delete("wtv-used-8675309")

[headers, data] = wtvshared.doRedirect("wtv-home:/home");
