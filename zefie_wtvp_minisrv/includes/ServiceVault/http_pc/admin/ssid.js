const minisrv_service_file = true;

const WTVAdmin = require(classPath + "/WTVAdmin.js")
const wtva = new WTVAdmin(minisrv_config, socket, service_name);
const auth = wtva.isAuthorized();
if (auth === true) {
    const password = null;
    if (request_headers.authorization) {
        const authheader = request_headers.authorization.split(' ');
        console.log(request_headers)

        if (authheader[0] === "Basic") {
            let password = Buffer.from(authheader[1], 'base64').toString();
            password = password.split(':')[1];
        }
    }
    if (wtva.checkPassword(password)) {
        let redirectmsg = "";
        let result = false;
        headers = `200 OK
Content-Type: text/html`

        data = `<html>
<head>
<title>zefie minisrv v${minisrv_config.version} account administration</title>
</head>
<body bgcolor="#000000" text="#449944" link="gold" alink="gold" vlink="gold">
<p>
Welcome to the zefie minisrv v${minisrv_config.version} Account Administration
</p>
`;
        if (request_headers.query.cmd === "list") {
            data += `<hr>`;
            if (request_headers.query.msg) {
                data += decodeURI(request_headers.query.msg) + "<hr>";
            }
            data += `<table border=1>`;
            const accounts = wtva.listRegisteredSSIDs();
            Object.keys(accounts).forEach(function (k) {
                data += `<tr><td><a href="?cmd=ssid&ssid=${accounts[k][0]}">${accounts[k][0]}</a></td><td>${(accounts[k][1]['username'] === undefined) ? "Unregistered SSID" : accounts[k][1]['username'] }</td></tr>`;
            });
            data += `</table>`;

        } else if (request_headers.query.cmd === "ssid") {
            const ssid = request_headers.query.ssid;
            if (!ssid) {
                redirectmsg = `An SSID is required for the ${request_headers.query.cmd} command.`;
            } else {
                data += "<hr>";
                if (request_headers.query.msg) {
                    data += decodeURI(request_headers.query.msg) + "<hr>";
                }
                data += `<script>
function validateSelection(cmd, ssid, friendlymsg) {
    conf = confirm("Are you sure you wish to "+friendlymsg+"?\\n\\n"+ssid);
    if (conf) {
        location.href = "/admin/ssid/?cmd="+cmd+"&ssid="+ssid;
    }
}            
</script>
`
                data += `<p>Management for SSID: ${ssid}</p>`;
                data += `<form action="/admin/" method="GET">`
                data += `<input type="button" value="Delete Account" onclick="validateSelection('delete', '${ssid}', 'delete all accounts associated with this SSID')">`
                if (wtva.isBanned(ssid)) {
                    data += `<input type="button" value="Ban Account" onclick="validateSelection('ban', '${ssid}', 'ban this SSID')" disabled=disabled>`
                    data += `<input type="button" value="Unban Account" onclick="validateSelection('unban', '${ssid}', 'unban this SSID')">`
                } else {
                    data += `<input type="button" value="Ban Account" onclick="validateSelection('ban', '${ssid}', 'ban this SSID')">`
                    data += `<input type="button" value="Unban Account" onclick="validateSelection('unban', '${ssid}', 'unban this SSID')" disabled=disabled>`
                }
                data += "<p><a href='?cmd=list'>Back to SSID List</a>";
                data += "<p><table border=1>";
                const user_info = wtva.getAccountInfoBySSID(ssid);
                if (user_info.account_users) {
                    if (user_info.account_users['subscriber']) {
                        data += `<tr><td>Primary User:</td><td>${user_info.account_users['subscriber'].subscriber_username}</td></tr>`;
                        if (Object.keys(user_info.account_users).length > 1) {
                            data += `<tr><td style="vertical-align: top">Additional Users:</td><td>`;
                            Object.keys(user_info.account_users).forEach(function (k) {
                                if (k === "subscriber") return;
                                data += user_info.account_users[k].subscriber_username + "<br>";
                            })
                            data += `</td></tr>`
                        }
                        data += "</table></p>";
                    } else {
                        data += "The user aborted registration, so this account has no users."
                    }
                } else {
                    data += "The SSID does not exist in the SessionStore."
                }
            }
        } else if (request_headers.query.cmd === "delete") {
            redirectmsg = "";
            const ssid = request_headers.query.ssid;
            if (ssid) {
                const userAccount = wtva.getAccountBySSID(ssid);
                userAccount.unregisterBox();
                redirectmsg = `All data for SSID ${ssid} has been deleted. Please note that this does not include Usenet posts made by this account.`;
            } else {
                redirectmsg = `An SSID is required for the ${request_headers.query.cmd} command.`;
            }
            headers = "302 OK\nLocation: /admin/?cmd=list&msg=" + encodeURI(redirectmsg);
        } else if (request_headers.query.cmd === "ban") {
            redirectmsg = "";
            const ssid = request_headers.query.ssid;
            if (ssid) {
                result = wtva.banSSID(ssid);
                if (result === wtva.SUCCESS) {
                    reloadConfig();
                    redirectmsg = "The SSID is now banned.";
                } else if (result === wtva.REASON_EXISTS) {
                    redirectmsg = "The SSID was already banned.";
                } else {
                    redirectmsg = "Unknown response " + result.toString();
                }
            } else {
                redirectmsg = `An SSID is required for the ${request_headers.query.cmd} command.`;
            }
            headers = "302 OK\nLocation: /admin/?cmd=ssid&ssid=" + encodeURI(ssid) + "&msg=" + encodeURI(redirectmsg);
        } else if (request_headers.query.cmd === "unban") {
            redirectmsg = "The SSID was not banned, so it could not be unbanned.";
            const ssid = request_headers.query.ssid;
            if (ssid) {
                result = wtva.unbanSSID(ssid);
                if (result === wtva.SUCCESS) {
                    reloadConfig();
                    redirectmsg = "The SSID is now unbanned.";
                } else if (result === wtva.REASON_EXISTS) {
                    redirectmsg = "The SSID was not banned.";
                } else {
                    redirectmsg = "Unknown response " + result.toString();
                }
            } else {
                redirectmsg = `An SSID is required for the ${request_headers.query.cmd} command.`;
            }
            headers = "302 OK\nLocation: /admin/?cmd=ssid&ssid=" + encodeURI(ssid) + "&msg=" + encodeURI(redirectmsg);
        } else {
            const errpage = wtvshared.doErrorPage(401, "Missing command.");
            headers = errpage[0];
            headers += "\nWWW-Authenticate: Basic";
            data = errpage[1];                
        }
    } else {
        const errpage = wtvshared.doErrorPage(401, "Please enter the administration password, you can leave the username blank.");
        headers = errpage[0];
        headers += "\nWWW-Authenticate: Basic";
        data = errpage[1];
    }
} else {
    const errpage = wtvshared.doErrorPage(403, auth);
    headers = errpage[0];
    data = errpage[1];
}
