var minisrv_service_file = true;

if (socket.ssid) {
    if (ssid_sessions[socket.ssid]) {
        ssid_sessions[socket.ssid].resetCookies();
        headers = "200 OK\n";
        headers += "Content-Type: text/html";
        data = `<html>
<head>
<display fontsize=medium>
<title>Cookies cleared!</title>
<meta http-equiv=Refresh content="3; url=client:goback?">
</head>
<body bgcolor="#000000" text="gold" link="gold" alink="gold" vlink="gold">
<br><br>
Your cookies have successfully been cleared!<br>
Redirecting shortly... <a href="client:goback">Go Back</a>
</body>
</html>`;
    }
}

if (!headers) {
    var errpage = wtvshared.doErrorPage(400)
    headers = errpage[0];
    data = errpage[1];
}