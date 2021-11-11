var minisrv_service_file = true;

headers = `200 OK
Content-Type: text/html`;

if (!session_data.getSessionData("registered")) {
    headers += "\nwtv-noback-all: wtv-";
    headers += "\nwtv-expire-all: wtv-";
    var redirect = [5, "client:relogin?"];
    var message = "Error: Your box is not registered. You are accessing " + minisrv_config.config.service_name + " in Guest Mode. There is nothing to delete!";
} else if (session_data.user_id !== 0) {
    headers += "\nwtv-noback-all: wtv-";
    headers += "\nwtv-expire-all: wtv-";
    var redirect = [5, "wtv-tricks:/tricks"];
    var message = "Error: You must be the primary user to unregister this box.";
} else if (request_headers.query.confirm_unregister) {
    if (session_data.unregisterBox()) {
        headers += "\nwtv-noback-all: wtv-";
        headers += "\nwtv-expire-all: wtv-";
        var redirect = [3, "client:relog?"];
        var message = "Your account data has been successfully removed. You will now be be redirected to registration.<br><br>";
        message += `<a href="${redirect[1]}">Click here if you are not automatically redirected.</a>`;
    } else {
        var redirect = [10, "client:goback?"];
        var message = "There was an error deleting your account data. Please try again later. If the problem persists, please contact " + minisrv_config.config.service_owner + " to request manual deletion.";
        message += "SSID verifcation may be required to perform a manual deletion.<br><br>Returning from whence you came...<br><br>";
        message += `<a href="${redirect[1]}">Click here if you are not automatically redirected.</a>`;
        }
} else {
    message = `Are you sure you wish to unregister your account? Session Data deleted by this tool is unrecoverable, even by ${minisrv_config.config.service_owner}.
Please be absolutely sure this is what you want to do!<br><br>
<form action="unregister" method="POST" ENCTYPE="x-www-form-encoded">
<input type="button" action="client:goback" value="No, I changed my mind" borderimage="file://ROM/Borders/ButtonBorder2.bif" text="gold" selected>
<input type="submit" name="confirm_unregister" value="Yes, delete my account" borderimage="file://ROM/Borders/ButtonBorder2.bif" text="gold">
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