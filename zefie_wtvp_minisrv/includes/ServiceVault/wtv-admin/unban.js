const minisrv_service_file = true;

const WTVAdmin = require(classPath + "/WTVAdmin.js");
const wtva = new WTVAdmin(minisrv_config, session_data, service_name);
const auth = wtva.isAuthorized();
const ssids_removed = [];

if (auth === true) {
    let config_changed = false;
    let password = null;
    if (request_headers.Authorization) {
        const authheader = request_headers.Authorization.split(' ');
        if (authheader[0] == "Basic") {
            password = Buffer.from(authheader[1], 'base64').toString();
            if (password) password = password.split(':')[1];
        }
    }
    if (wtva.checkPassword(password)) {
        if (request_headers.query.unban_ssid) {
            const fake_config = wtvshared.getUserConfig();
            if (!fake_config.config) fake_config.config = {};
            if (!fake_config.config.ssid_block_list) fake_config.config.ssid_block_list = [];
            if (typeof request_headers.query.unban_ssid === 'string') {
                Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                    if (fake_config.config.ssid_block_list[k] == request_headers.query.unban_ssid) {
                        fake_config.config.ssid_block_list.splice(k, 1);
                        ssids_removed.push(request_headers.query.unban_ssid)
                        config_changed = true;
                    }
                });
            } else {
                Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                    Object.keys(request_headers.query.unban_ssid).forEach(function (j) {                        
                        if (fake_config.config.ssid_block_list[k] == request_headers.query.unban_ssid[j]) {
                            fake_config.config.ssid_block_list.splice(k,1);
                            ssids_removed.push(request_headers.query.unban_ssid[j])
                            config_changed = true;
                        }
                    });
                });
            }
            if (config_changed) {
                wtvshared.writeToUserConfig(fake_config);
                minisrv_config = reloadConfig();
            }
        }
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/unban`;
        if (request_headers.query.unban_ssid) {
            headers += "\nwtv-noback-all: wtv-admin:/unban";
        }
        data = `<html>
<body>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Admin Tricks</title>
<sidebar width=20%>
<img src="wtv-admin:/images/nuke_inverted.gif">
</sidebar>
<body bgcolor="#101010" text="#FF3455" link="#ff55ff" vlink="#ff55ff" vspace=0>
<br>
<br>
<h1>${minisrv_config.config.service_name} Admin Tricks</h1>
<br>
<table>
<tr>
<td colspan=3 height=6>
<h3>Unban an SSID</h3>`;
        if (minisrv_config.config.ssid_block_list) {
            if (minisrv_config.config.ssid_block_list.length > 0) {
                data += '<form action="wtv-admin:/unban" method="POST">';
                data += '<select name="unban_ssid" multiple size="8">';
                Object.keys(minisrv_config.config.ssid_block_list).forEach(function (k) {
                    const ssid = minisrv_config.config.ssid_block_list[k];
                    data += "<option value=\"" + ssid + "\">" + ssid + "</option>\n";
                });
                data += '</select><br><input type="submit" value="Unban SSID(s)"></form>';
            } else {
                data += "No SSIDs are in the ban list.<br><br>";
            }
        } else {
            data += "No SSIDs are in the ban list.<br><br>";
        }
        if (ssids_removed.length > 0) {
            if (config_changed) {
                data += "<strong>SSID(s) " + ssids_removed + " removed from the ban list.</strong><br><br>";
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