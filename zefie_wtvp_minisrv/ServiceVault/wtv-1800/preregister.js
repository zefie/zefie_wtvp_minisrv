var gourl = "wtv-1800:/finish-prereg?";
if (request_headers.query.relogin) gourl += "relogin=true";


if (request_headers["wtv-ticket"]) {
	gourl = "wtv-head-waiter:/login-stage-two?";
}

if (socket.ssid) {
    if (ssid_sessions[socket.ssid].data_store) {
        if (ssid_sessions[socket.ssid].data_store.sockets) {
            var i = 0;
            ssid_sessions[socket.ssid].data_store.sockets.forEach(function (k) {
                if (typeof k != "undefined") {
                    if (k != socket) {
                        k.destroy();
                        ssid_sessions[socket.ssid].data_store.sockets.delete(k);
                        i++;
                    }
                }
            });
            if (i > 0 && zdebug) console.log(" # Closed", i, "previous sockets for", socket.ssid);
        }
    }
    if (ssid_sessions[socket.ssid].data_store.wtvsec_login) {
        delete ssid_sessions[socket.ssid].data_store.wtvsec_login;
    }
}

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-open-isp-disabled: false
wtv-visit: `+ gourl + `
Content-type: text/html`;
