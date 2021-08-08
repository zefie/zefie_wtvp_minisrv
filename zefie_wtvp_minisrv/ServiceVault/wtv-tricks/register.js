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

        var message = "You will now be be redirected to registration.";
        var redirect = [3, "client:relog?"];
} else {
    message = `Are you ready to register your box with ${minisrv_config.config.service_name}?
<br><br>
<form action="register" method="POST" ENCTYPE="x-www-form-encoded">
<input type="button" action="client:goback" value="Nah, I like being a Guest" borderimage="file://ROM/Borders/ButtonBorder2.bif" text="gold" >
<input type="submit" name="confirm_register" value="Yes, I'm ready to register!" borderimage="file://ROM/Borders/ButtonBorder2.bif" text="gold" selected>
</form>`;
}

data = `<html>
<head>
<display fontsize=medium>
<title>Danger Zone!</title>
`;
if (redirect) data += `<meta http-equiv=Refresh content="${redirect[0]}; url=${redirect[1]}">`;

data += `</head>
<body bgcolor="#000000" text="gold" link="gold" alink="gold" vlink="gold">
<br><br>
${message}
</body>
</html>
`;