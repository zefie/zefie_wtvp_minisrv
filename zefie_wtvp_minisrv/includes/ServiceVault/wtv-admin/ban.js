var minisrv_service_file = true;

var WTVAdmin = require(classPath + "/WTVAdmin.js");
var wtva = new WTVAdmin(minisrv_config, session_data, service_name);
var auth = wtva.isAuthorized();
if (auth === true) {
    var password = null;
    if (request_headers.Authorization) {
        var authheader = request_headers.Authorization.split(' ');
        if (authheader[0] == "Basic") {
            password = Buffer.from(authheader[1], 'base64').toString();
            if (password) password = password.split(':')[1];
        }
    }
    if (wtva.checkPassword(password)) {
        if (request_headers.query.ssid) {
            var ssid = request_headers.query.ssid.toLowerCase();
            var result = wtva.banSSID(ssid, socket.ssid);
        }
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/ban`;
        if (ssid) {
            headers += "\nwtv-noback-all: wtv-admin:/ban";
        }
        data = `<html>
<body>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Admin Tricks</title>
<sidebar width=20%>
<img src="wtv-admin:/images/nuke.gif">
</sidebar>
<body bgcolor="#101010" text="#FF3455" link="#ff55ff" vlink="#ff55ff" vspace=0>
<br>
<br>
<h1>${minisrv_config.config.service_name} Admin Tricks</h1>
<br>
<table>
<tr>
<td colspan=3 height=6>
<h3>Ban an SSID</h3>
<form action="wtv-admin:/ban" method="POST">
<input type="text" name="ssid" value="${(ssid) ? ssid : ""}"> 
<input type="submit" value="Ban SSID">
</form><br><br>`
        if (request_headers.query.ssid) {
            if (result == wtva.REASON_SELF) {
                data += "<strong>Cannot ban yourself.</strong>"
            } else {
                if (result == wtva.REASON_EXISTS) {
                    data += "<strong>SSID " + request_headers.query.ssid + " is already in the ban list.</strong><br><br>";
                } else if (result === wtva.SUCCESS) {
                    reloadConfig();
                    data += "<strong>SSID " + request_headers.query.ssid + " added to the ban list.</strong><br><br>";
                } else {
                    data += "<strong>Unexpected response "+result.toString()+".</strong><br><br>";
                }
            }
        }
        data += `
<br>
<br>
<tr>
</table>
<p align="right">
<a href="client:goback">Go Back</a>
</p>
</body>
</html>
`;
    } else {
        var errpage = wtvshared.doErrorPage(401, "Please enter the administration password, you can leave the username blank.");
        headers = errpage[0];
        data = errpage[1];
    }
} else {
    var errpage = wtvshared.doErrorPage(403, auth);
    headers = errpage[0];
    data = errpage[1];
}