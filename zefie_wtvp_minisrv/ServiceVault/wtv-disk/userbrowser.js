// todo some fancy ass file manager or something


if (socket.ssid) {
    if (ssid_sessions[socket.ssid]) {
        if (ssid_sessions[socket.ssid].isRegistered()) {
            data = ssid_sessions[socket.ssid].getUserStoreFileByURL("file://Disk/Demo/allyouneed.html");
            //data = ssid_sessions[socket.ssid].getUserStoreFile("Disk/Demo/allyouneed.html");
            var contype = ssid_sessions[socket.ssid].getUserStoreContentType("file://Disk/Demo/allyouneed.html");

            if (data) {
                headers = "200 OK\n";
                headers += "Content-Type: " + contype;
            }
        }
    }
}

if (!headers) {
    var errpage = doErrorPage(400)
    headers = errpage[0];
    data = errpage[1];
}