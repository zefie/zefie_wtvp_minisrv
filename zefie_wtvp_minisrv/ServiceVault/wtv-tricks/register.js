headers = `200 OK
Content-Type: text/html`;

if (ssid_sessions[socket.ssid].getSessionData("registered")) {
    var redirect = [10, "client:goback?"];
    var message = "Error: Your box is already registered. If you would like to re-register, you must first unregister.";
} else if (request_headers.query.confirm_register) {
    headers += `
wtv-noback-all: wtv-
wtv-expire-all: wtv-
wtv-relogin-url: wtv-1800:/preregister?relogin=true
wtv-reconnect-url: wtv-1800:/preregister?reconnect=true
wtv-boot-url: wtv-1800:/preregister?relogin=true`;
    var redirect = [3, "client:relog?"];
    var message = "You will now be be redirected to registration.<br><br>";
    message += `<a href="${redirect[1]}">Click here if you are not automatically redirected.</a>`;
} else {
    message = `Are you ready to register your box with ${minisrv_config.config.service_name}?
<br><br>
<form action="register" method="POST" ENCTYPE="x-www-form-encoded">
<input type="button" action="client:goback" value="Nah, I like being a Guest" borderimage="file://ROM/Borders/ButtonBorder2.bif" text="#dadada" >
<input type="submit" name="confirm_register" value="Yes, I'm ready to register!" borderimage="file://ROM/Borders/ButtonBorder2.bif" text="#dadada" selected>
</form>`;
}

data = `<html>
<head>
<display fontsize=medium>
<title>Comfy Zone!</title>
`;
if (redirect) data += `<meta http-equiv=Refresh content="${redirect[0]}; url=${redirect[1]}">`;

data += `</head>
<body bgcolor="#202020" text="#dadada" link="#dadada" alink="#dadada" vlink="#dadada">
<br><br>
${message}
</body>
</html>
`;