const minisrv_service_file = true;

const WTVAdmin = require(classPath + "/WTVAdmin.js");
const wtva = new WTVAdmin(minisrv_config, session_data, service_name);
const auth = wtva.isAuthorized();
if (auth === true) {
    let user_info;
    let password = null;
    let show_cannot_modify_self = false;
    let show_cannot_remove_primary = false;
    let result = false;
    const show_box_was_unregistered = false;
    if (request_headers.Authorization) {
        const authheader = request_headers.Authorization.split(' ');
        if (authheader[0] === "Basic") {
            password = Buffer.from(authheader[1], 'base64').toString();
            if (password) password = password.split(':')[1];
        }
    }
    if (wtva.checkPassword(password)) {
        if (request_headers.query.username) {

            user_info = wtva.getAccountInfo(request_headers.query.username.toLowerCase()); // username search
            if (user_info) {
                if (user_info.ssid === socket.ssid) {
                    show_cannot_modify_self = true;
                }
                if (request_headers.query.confirm_delete) {
                    if (!show_cannot_modify_self) {
                        // delete
                        const userAccount = wtva.getAccountBySSID(user_info.ssid);
                        userAccount.switchUserID(0, false, false);
                        const userCount = Object.keys(user_info.account_users).length;
                        if (user_info.user_id === 0) {
                            show_cannot_remove_primary = true;
                        } else {
                            result = userAccount.removeUser(user_info.user_id);
                        }
                    }
                }
            }
        }
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/deleteuser
wtv-noback-all: wtv-admin:/deleteuser`;
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
<h3>Delete a user from an account</h3>
<form action="wtv-admin:/deleteuser" method="POST">
<input type="text" name="username" value="${(request_headers.query.username) ? request_headers.query.username : ""}"> &nbsp; <input type="submit" value="Look Up User">
</form><br><br>`
        if (request_headers.query.username) {
            if (user_info && !request_headers.query.confirm_delete) {
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
<form action="wtv-admin:/deleteuser" method="POST">
<input type="hidden" name="username" value="${user_info.username}">
<input type="hidden" name="confirm_delete" value="true">
<input type="submit" value="Confirm Delete">
</form>
</td>
</tr>
`
                data += `</table>`;
            } else if (request_headers.query.confirm_delete && show_cannot_modify_self) {
                data += `<strong>Cannot modify your account in this manner.<br>Try <a href="wtv-setup:/remove-users">wtv-setup</a>.</strong><br><br>`;
            } else if (request_headers.query.confirm_delete && show_cannot_remove_primary) {
                data += `<strong>Cannot delete a primary user in this manner.<br>Try <a href="wtv-admin:/deleteaccount?ssid=${user_info.ssid}">deleting the account</a>.<br><br>`;
            } else if (request_headers.query.confirm_delete && show_box_was_unregistered) {
                data += `<strong>Account for "${user_info.username}" was deleted, and SSID ${user_info.ssid} unregistered, as it was the only user.<br><br>`;
            } else if (request_headers.query.confirm_delete) {
                if (result) data += `<strong>User "${user_info.username}" has been deleted from account belonging to SSID ${user_info.ssid}.</strong><br><br>`;
                else data += `<strong>Could not delete "${user_info.username}" from SSID ${user_info.ssid}.</strong><br><br>`;
            } else {
                data += "<strong>Could not find an account for user \"" + request_headers.query.username + "\"</strong><br><br>";
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
        const errpage = wtvshared.doErrorPage(401, "Please enter the administration password, you can leave the username blank.");
        headers = errpage[0];
        data = errpage[1];
    }
} else {
    const errpage = wtvshared.doErrorPage(403, auth);
    headers = errpage[0];
    data = errpage[1];
}