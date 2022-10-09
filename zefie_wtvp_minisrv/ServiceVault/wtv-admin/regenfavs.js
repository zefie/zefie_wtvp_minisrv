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
        if (request_headers.query.username) {
            var user_info = wtva.getAccountInfo(request_headers.query.username.toLowerCase()); // username search
            if (user_info) {
                var userAccount = wtva.getAccountBySSID(user_info.ssid);
                userAccount.switchUserID(user_info.user_id, false, false);
                if (request_headers.query.folder) {
                    if (userAccount.favstore.favstoreExists()) {
                        if (userAccount.favstore.folderExists(request_headers.query.folder)) {
                            userAccount.favstore.deleteFolder(request_headers.query.folder);
                        }
                        userAccount.favstore.createTemplateFolder(request_headers.query.folder);
                    }
                }
            }
        }
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/regenfavs
wtv-noback-all: wtv-admin:/regenfavs`;
        data = `<html>
<body>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Admin Tricks</title>
<sidebar width=20%>
<img src="wtv-tricks:/images/Favorites_bg.jpg">
</sidebar>
<body bgcolor="#0a0a0a" text="#CC1111" link="#ff55ff" vlink="#ff55ff" vspace=0>
<br>
<br>
<h1>${minisrv_config.config.service_name} Admin Tricks</h1>
<br>
<table>
<tr>
<td colspan=3 height=6>
<h3>Restore a default favorites folder for a User</h3>
<form action="wtv-admin:/regenfavs" method="POST">
<input type="text" name="username" value="${(request_headers.query.username) ? request_headers.query.username : ""}"> &nbsp; <input type="submit" value="Look Up User">
</form><br><br>`
        if (request_headers.query.username) {
            if (user_info && !request_headers.query.folder) {
                if (userAccount.favstore.favstoreExists()) {
                    data += `<form action="wtv-admin:/regenfavs" method="POST">
<input type="hidden" name="username" value="${user_info.username}">
<select name="folder">`;

                    Object.keys(minisrv_config.favorites.folder_templates).forEach(function (k) {
                        data += `<option value="${k}">${k}</option`;
                    });
                    data += `</select>
<input type="submit" value="Restore Folder">
</form>
</td>
</tr>
`
                    data += `</table>`;
                } else {
                    data += `<strong>${user_info.username} has not initialized their favorites.</strong><br><br>`;
                }
            } else {
                data += `<strong>Successfully regenerated folder ${request_headers.query.folder} for user "${user_info.username}"</strong><br><br>`;
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