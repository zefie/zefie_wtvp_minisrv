var minisrv_service_file = true;

var WTVAdmin = require("./WTVAdmin.js");
var wtva = new WTVAdmin(minisrv_config, ssid_sessions[socket.ssid], service_name);
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
            var ssid_match = false;
            var ssid = request_headers.query.ssid.toLowerCase();
            var user_info = wtva.getAccountInfoBySSID(ssid);
            if (request_headers.query.confirm_delete) {
                user_info = null;
                if (ssid == socket.ssid) {
                    ssid_match = true;
                } else {
                    // delete
                    var userAccount = wtva.getAccountBySSID(ssid);
                    userAccount.unregisterBox();
                }
            }
        }
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/deleteaccount
wtv-noback-all: wtv-admin:/deleteaccount`;
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
<h3>Delete an Account</h3>
<form action="wtv-admin:/deleteaccount" method="POST">
<input type="text" name="ssid" value="${(ssid) ? ssid : ""}"> &nbsp; <input type="submit" value="Look Up SSID">
</form><br><br>`
        if (ssid) {
            if (user_info) {
                data += `
<strong>User Information:</strong>
<table border=1 cellpadding=3 width=400>
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
<td border=0 colspan=2 align=right>
<form action="wtv-admin:/deleteaccount" method="POST">
<input type="hidden" name="ssid" value="${user_info.ssid}">
<input type="hidden" name="confirm_delete" value="true">
<input type="submit" value="Confirm Delete">
</form>
</td>
</tr>
`
                data += `</table>`;
            } else if (request_headers.query.confirm_delete && ssid_match) {
                data += `<strong>Cannot delete yourself in this manner.<br>Try ${minisrv_config.config.service_name} Tricks Unregister.</strong><br><br>`;
            } else if (request_headers.query.confirm_delete) {
                data += "<strong>Account for SSID \"" + ssid + "\" has been deleted.</strong><br><br>";
            } else {
                data += "<strong>Could not find an account for SSID \"" + ssid + "\"</strong><br><br>";
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