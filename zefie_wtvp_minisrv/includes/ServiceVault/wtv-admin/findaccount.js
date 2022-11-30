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
        if (request_headers.query.username) {
            var user_info = wtva.getAccountInfo(request_headers.query.username.toLowerCase()); // username search
            if (!user_info) user_info = wtva.getAccountInfoBySSID(request_headers.query.username.toLowerCase()); // ssid search
        }
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/findaccount
wtv-noback-all: wtv-admin:/findaccount`;
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
<h3>Account Lookup</h3>
<form action="wtv-admin:/findaccount" method="POST">
<input type="text" name="username" value="${(request_headers.query.username) ? request_headers.query.username : ""}"> &nbsp; <input type="submit" value="Look Up User / SSID">
</form><br><br>`
        if (request_headers.query.username) {
            if (user_info) {
                data += `
<strong>User Information:</strong>
<table border=1 cellpadding=3>
<tr><td>Username:</td><td>${user_info.username} (User ID: ${user_info.user_id})</td></tr>
<tr><td>SSID:</td><td>${user_info.ssid}</td></tr>`;
                if (user_info.account_users) {
                    data += `<tr><td>Primary User:</td><td>${user_info.account_users['subscriber'].subscriber_username}</td></tr>`;
                    if (Object.keys(user_info.account_users).length > 1) {
                        data += `<tr><td>Additional Users:</td><td>`;
                        Object.keys(user_info.account_users).forEach(function (k) {
                            if (k == "subscriber") return;
                            data += user_info.account_users[k].subscriber_username + "<br>";
                        })
                        data += `</td></tr>`
                    }
                }
                data += `
<tr>
<td border=0 colspan=2>`;
                if (wtva.isBanned(user_info.ssid)) {
                    data += `<a href="wtv-admin:/unban?ssid=${user_info.ssid}">Unban SSID</a>`;
                    data += "&nbsp;".repeat(28);
                } else {
                    data += `<a href="wtv-admin:/ban?ssid=${user_info.ssid}">Ban SSID</a>`;
                    data += "&nbsp;".repeat(32);
                }
data += `<a href="wtv-admin:/deleteaccount?ssid=${user_info.ssid}">Delete Account</span>
</td>
</tr>
`
                data += `</table>`;
            } else {
                data += "<strong>Could not find user \"" + request_headers.query.username + "\"</strong><br><br>";
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