var minisrv_service_file = true;

WTVPCAdmin = require(classPath + "/WTVPCAdmin.js")
var wtva = new WTVPCAdmin(minisrv_config, socket, service_name);
var auth = wtva.isAuthorized();
if (auth === true) {
    var password = null;
    if (request_headers.authorization) {
        var authheader = request_headers.authorization.split(' ');
        console.log(request_headers)

        if (authheader[0] == "Basic") {
            password = Buffer.from(authheader[1], 'base64').toString();
            password = password.split(':')[1];
        }
    }
    if (wtva.checkPassword(password)) {
        headers = `200 OK
Content-Type: text/html`

        htmlhead = `<html>
<head>
<title>zefie minisrv v${minisrv_config.version} account administration</title>
</head>
<body bgcolor="#000000" text="#449944" link="gold" alink="gold" vlink="gold">
<p>
Welcome to the zefie minisrv v${minisrv_config.version} Account Administration
</p>
`;
        data = htmlhead;
        if (!request_headers.query.cmd) {
            data += `Please select an option to get started:
        <hr>
            <a href="?cmd=list">List all SSIDs and their Primary User</a><br>
            </p>
        </body>
</html >`;
        }
        else if (request_headers.query.cmd == "list") {
            data += `<hr>`;
            if (request_headers.query.msg) {
                data += decodeURI(request_headers.query.msg) + "<hr>";
            }
            data += `<table border=1>`;
            accounts = wtva.listRegisteredSSIDs();
            Object.keys(accounts).forEach(function (k) {
                data += `<tr><td><a href="?cmd=ssid&ssid=${accounts[k][0]}">${accounts[k][0]}</a></td><td>${(accounts[k][1]['username'] === undefined) ? "Unregistered SSID" : accounts[k][1]['username'] }</td></tr>`;
            });
            data += `</table>`;

        } else if (request_headers.query.cmd == "ssid") {
            var ssid = request_headers.query.ssid;
            if (!ssid) {
                data += "<hr>Missing SSID?";
            } else {
                data += "<hr>";
                if (request_headers.query.msg) {
                    data += decodeURI(request_headers.query.msg) + "<hr>";
                }
                data += `<script>
function validateSelection(cmd, ssid, friendlymsg) {
    conf = confirm("Are you sure you wish to "+friendlymsg+"?\\n\\n"+ssid);
    if (conf) {
        location.href = "/admin/?cmd="+cmd+"&ssid="+ssid;
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
                data += "<p><table border=1>";
                user_info = wtva.getAccountInfoBySSID(ssid.toLowerCase());
                if (user_info.account_users['subscriber']) {
                    data += `<tr><td>Primary User:</td><td>${user_info.account_users['subscriber'].subscriber_username}</td></tr>`;
                    if (Object.keys(user_info.account_users).length > 1) {
                        data += `<tr><td style="vertical-align: top">Additional Users:</td><td>`;
                        Object.keys(user_info.account_users).forEach(function (k) {
                            if (k == "subscriber") return;
                            data += user_info.account_users[k].subscriber_username + "<br>";
                        })
                        data += `</td></tr>`
                    }
                    data += "</table></p>";
                } else {
                    data += "User aborted registration, and has no users."
                }
            }
        } else if (request_headers.query.cmd == "delete") {
            redirectmsg = "";
            var ssid = request_headers.query.ssid;
            if (ssid) {
                var userAccount = wtva.getAccountBySSID(ssid);
                userAccount.unregisterBox();
                redirectmsg = "Account deleted.";
            } else {
                redirectmsg = "Missing SSID.";
            }
            headers = "302 OK\nLocation: /admin/?cmd=list&msg=" + encodeURI(redirectmsg);
        } else if (request_headers.query.cmd == "ban") {
            redirectmsg = "";
            var ssid = request_headers.query.ssid;
            if (ssid) {
                var fake_config = wtvshared.getUserConfig();
                if (!fake_config.config) fake_config.config = {};
                if (!fake_config.config.ssid_block_list) fake_config.config.ssid_block_list = [];
                var entry_exists = false;
                Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                    if (fake_config.config.ssid_block_list[k] == ssid) {
                        redirectmsg = "That SSID is already banned.";
                    }
                });
                if (!entry_exists) {
                    fake_config.config.ssid_block_list.push(ssid);
                    wtvshared.writeToUserConfig(fake_config);
                    reloadConfig();
                    redirectmsg = "SSID Banned.";
                }
            } else {
                redirectmsg = "Missing SSID.";
            }
            headers = "302 OK\nLocation: /admin/?cmd=ssid&ssid=" + encodeURI(ssid) + "&msg=" + encodeURI(redirectmsg);
        } else if (request_headers.query.cmd == "unban") {
            redirectmsg = "SSID was not banned.";
            var ssid = request_headers.query.ssid;
            if (ssid) {
                var config_changed = false;
                var fake_config = wtvshared.getUserConfig();
                if (!fake_config.config) fake_config.config = {};
                if (!fake_config.config.ssid_block_list) fake_config.config.ssid_block_list = [];
                if (typeof request_headers.query.ssid === 'string') {
                    Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                        if (fake_config.config.ssid_block_list[k] == request_headers.query.ssid) {
                            fake_config.config.ssid_block_list.splice(k, 1);
                            config_changed = true
                        }
                    });
                } else {
                    Object.keys(fake_config.config.ssid_block_list).forEach(function (k) {
                        Object.keys(request_headers.query.ssid).forEach(function (j) {
                            if (fake_config.config.ssid_block_list[k] == request_headers.query.ssid[j]) {
                                fake_config.config.ssid_block_list.splice(k, 1);
                                config_changed = true
                            }
                        });
                    });
                }
                if (config_changed) {
                    wtvshared.writeToUserConfig(fake_config);
                    minisrv_config = reloadConfig();
                    redirectmsg = "SSID Unbanned.";
                }
            }
            headers = "302 OK\nLocation: /admin/?cmd=ssid&ssid=" + encodeURI(ssid) + "&msg=" + encodeURI(redirectmsg);
        }

        } else {
            var errpage = wtvshared.doErrorPage(401, "Please enter the administration password, you can leave the username blank.");
            headers = errpage[0];
            headers += "\nWWW-Authenticate: Basic";
            data = errpage[1];
        }
    } else {
        var errpage = wtvshared.doErrorPage(403, auth);
        headers = errpage[0];
        data = errpage[1];
    }
