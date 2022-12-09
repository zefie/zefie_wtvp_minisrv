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
        reloadConfig();
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/reloadconfig
wtv-noback-all: wtv-admin:/reloadconfig`;
        data = `<html>
<body>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Admin Tricks</title>
<sidebar width=20%>
<img src="wtv-tricks:/images/Favorites_bg.jpg">
</sidebar>
<body bgcolor="#101010" text="#FF3455" link="#ff55ff" vlink="#ff55ff" vspace=0>
<br>
<br>
<h1>${minisrv_config.config.service_name} Admin Tricks</h1>
<br>
<table>
<tr>
<td colspan=3 height=6>
<h3>Reload Config</h3>
The config.json and user_config.json files has been reloaded.<br>
If you added a new service, it will not bind without a restart.
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