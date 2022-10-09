var minisrv_service_file = true;

var WTVAdmin = require("./WTVAdmin.js");
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
            if (ssid == socket.ssid) {
                var nobanself = true;
            } else {
                var fake_config = wtvshared.getUserConfig();
                if (!fake_config.config) fake_config.config = {};
                if (!fake_config.config.ssid_block_list) fake_config.config.ssid_block_list = [];
                var entry_exists = false;
                Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                    if (fake_config.config.ssid_block_list[k] == ssid) {
                        entry_exists = true;
                    }
                });
                if (!entry_exists) {
                    fake_config.config.ssid_block_list.push(ssid);
                    wtvshared.writeToUserConfig(fake_config);
                    reloadConfig();
                }
            }
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
<body bgcolor="#0a0a0a" text="#CC1111" link="#ff55ff" vlink="#ff55ff" vspace=0>
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
            if (nobanself) {
                data += "<strong>Cannot ban yourself.</strong>"
            } else {
                if (entry_exists) {
                    data += "<strong>SSID " + request_headers.query.ssid + " is already in the ban list.</strong><br><br>";
                } else {
                    data += "<strong>SSID " + request_headers.query.ssid + " added to the ban list.</strong><br><br>";
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