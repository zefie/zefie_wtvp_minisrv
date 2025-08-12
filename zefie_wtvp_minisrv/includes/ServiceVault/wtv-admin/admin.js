const minisrv_service_file = true;

const WTVAdmin = require(classPath + "/WTVAdmin.js");
const wtva = new WTVAdmin(minisrv_config, session_data, service_name);
const auth = wtva.isAuthorized();
if (auth === true) {
    let password = null;
    if (request_headers.Authorization) {
        const authheader = request_headers.Authorization.split(' ');
        if (authheader[0] == "Basic") {
            password = Buffer.from(authheader[1], 'base64').toString();
            if (password) password = password.split(':')[1];
        }
    }
    if (wtva.checkPassword(password)) {
        headers = "200 OK\r\nContent-Type: text/html";
        data = `<html>
<body>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Admin Tricks</title>
<sidebar width=20%>
<img src="wtv-tricks:/images/Favorites_bg.jpg">
</sidebar>
<body bgcolor="#101010" text="#FF3455" link="#ff55ff" vlink="#ff55ff" vspace=0>
<font size="-1">
<br>
<br>
<h1>${minisrv_config.config.service_name} Admin Tricks</h1>
<br>
<table>
<tr>
<td colspan=3 height=6>
<tr>
<td width=170><a href="wtv-tricks:/tricks">Standard Tricks</a>
<td width=10>
<td><a href="wtv-admin:/findaccount">Account Lookup</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><a href="wtv-admin:/ban">Ban an SSID</a>
<td width = 10>
<td><a href="wtv-admin:/deleteaccount">Delete an Account</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><a href="wtv-admin:/unban">Unban an SSID</a>
<td width = 10>
<td><a href="wtv-admin:/deleteuser">Delete User from Account</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><strike><a href="wtv-admin:/whitelist">Whitelist an SSID</a></strike>
<td width = 10>
<td><a href="wtv-admin:/removeuserpasswd">Remove Pass from User </a>
<tr>
<td colspan=3 height=6>
<tr>
<td><strike><a href="wtv-admin:/addadmin">Grant Admin to SSID</a></strike>
<td width = 10>
<td><a href="wtv-admin:/polyzoot">Polyzoot a User</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><strike><a href="wtv-admin:/modadmin">Modify Admin for SSID</a></strike>
<td width = 10>
<td><a href="wtv-admin:/operatortweaks">Edit Config</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><a href="wtv-admin:/regenfavs">Restore Favs for User</a>
<td width = 10>
<td><a href="wtv-admin:/reloadconfig">Reload Config</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><!-- TODO -->
<td width = 10>
<td>
<!-- TODO -->
<td width = 10>
</table>
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