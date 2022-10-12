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
            var show_cannot_modify_self = false;
            var show_user_has_no_password = false;
            var user_info = wtva.getAccountInfo(request_headers.query.username.toLowerCase()); // username search
            if (user_info) {
                if (user_info.ssid == socket.ssid) {
                    show_cannot_modify_self = true;
                }
                var userAccount = wtva.getAccountBySSID(user_info.ssid);
                userAccount.switchUserID(user_info.user_id, false, false);
                if (!userAccount.getUserPasswordEnabled()) {
                    show_user_has_no_password = true;
                }
                if (request_headers.query.confirm_remove) {
                    if (!show_cannot_modify_self && !show_user_has_no_password) {
                        userAccount.disableUserPassword();
                    } 
                } 
            }
        }
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/removeuserpasswd
wtv-noback-all: wtv-admin:/removeuserpasswd`;
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
<h3>Remove Password from a User Account</h3>
<form action="wtv-admin:/removeuserpasswd" method="POST">
<input type="text" name="username" value="${(request_headers.query.username) ? request_headers.query.username : ""}"> &nbsp; <input type="submit" value="Look Up User">
</form><br><br>`
        if (request_headers.query.username) {
            if (user_info && !request_headers.query.confirm_remove && !show_user_has_no_password && !show_cannot_modify_self) {
                data += `
<strong>User Information:</strong>
<table border=1 cellpadding=3 width=400>
<tr><td>Username:</td><td>${user_info.username} (User ID: ${user_info.user_id})</td></tr>
<tr><td>SSID:</td><td>${user_info.ssid}</td></tr>`;
                if (user_info.account_users) {
                    data += `<tr><td>Primary User:</td><td>${user_info.account_users['subscriber'].subscriber_username}</td></tr>`;
                }
                data += `
<tr>
<td border=0 colspan=2 align=right>
<form action="wtv-admin:/removeuserpasswd" method="POST">
<input type="hidden" name="username" value="${user_info.username}">
<input type="hidden" name="confirm_remove" value="true">
<input type="submit" value="Confirm Password Removal">
</form>
</td>
</tr>
`
                data += `</table>`;
            } else if (show_cannot_modify_self) {
                data += `<strong>Cannot modify your account in this manner.<br>Try <a href="wtv-setup:/accounts">wtv-setup</a>.</strong><br><br>`;
            } else if (show_user_has_no_password) {
                data += `<strong>${user_info.username} has no password,<br>so there nothing to do.<br><br>`;
            } else {
                data += `<strong>Password removed from account "${user_info.username}"</strong><br><br>`;
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