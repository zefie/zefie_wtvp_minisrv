var minisrv_service_file = true;

// null is the new demo/flash

if (ssid_sessions[socket.ssid]) {
    if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
        if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store) {
            if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id != null) {
                if (ssid_sessions[socket.ssid].data_store.wtvsec_login.ticket_store.user_id >= 0)
                    ssid_sessions[socket.ssid].switchUserID(-1);
            }
        }
    }
}

headers = "400 You are now nullified.";
