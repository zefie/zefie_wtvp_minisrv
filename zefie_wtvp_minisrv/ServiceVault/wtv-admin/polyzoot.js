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
        if (request_headers.query.username) {
            var user_info = wtva.getAccountInfo(request_headers.query.username.toLowerCase()); // username search
            if (user_info) {
                var userAccount = wtva.getAccountBySSID(user_info.ssid);
                userAccount.switchUserID(user_info.user_id, false, false);
                if (request_headers.query.confirm) {
                    var polyzooot = 1407;
                    var WTVBGMusic = require("./WTVBGMusic.js");
                    var wtvbgm = new WTVBGMusic(minisrv_config, userAccount);
                    var bgmcat = wtvbgm.getSongCategory(polyzooot);
                    var music_obj = wtvbgm.getMusicObj();
                    music_obj.enableCategories = [bgmcat];
                    music_obj.enableSongs = [polyzooot];
                    music_obj = Object.assign({}, music_obj)
                    userAccount.setSessionData("wtv-bgmusic", music_obj);
                    var settings_obj = userAccount.getSessionData("wtv-setup");
                    if (settings_obj === null) settings_obj = {};
                    settings_obj['setup-play-bgm'] = 1;
                    userAccount.setSessionData("wtv-setup", Object.assign({}, settings_obj));
                    userAccount.saveSessionData();
                }
                if (request_headers.query.reset) {
                    var WTVBGMusic = require("./WTVBGMusic.js");
                    userAccount.deleteSessionData("wtv-bgmusic")
                    var wtvbgm = new WTVBGMusic(minisrv_config, userAccount);
                    var music_obj = wtvbgm.getMusicObj(true);
                    var settings_obj = userAccount.getSessionData("wtv-setup");
                    if (settings_obj === null) settings_obj = {};
                    settings_obj['setup-play-bgm'] = 0;
                    userAccount.setSessionData("wtv-setup", Object.assign({}, settings_obj));
                    userAccount.saveSessionData();
                }
            }
        }
        headers = `200 OK
Content-Type: text/html
wtv-expire-all: wtv-admin:/polyzoot
wtv-noback-all: wtv-admin:/polyzoot`;
        data = `<html>
<body>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Admin Tricks</title>
<sidebar width=20%>
<img src="wtv-admin:/images/polyzoot.jpg">
</sidebar>
<body bgcolor="#0a0a0a" text="#CC1111" link="#ff55ff" vlink="#ff55ff" vspace=0>
<br>
<br>
<h1>${minisrv_config.config.service_name} Admin Tricks</h1>
<br>
<table>
<tr>
<td colspan=3 height=6>
<h3>Polyzoot a User</h3>`;

        if (!request_headers.query.username) {
            data += `"Polyzooting" a user will replace their Background Music with only Polyzoot,
and turn on BGM if they have it disabled. This will not work on Old Classic clients. 
Also, the only way to undo a "Polyzooting" is to reset the user's music selection to default.<br><br>`
        }

data += `
<form action="wtv-admin:/polyzoot" method="POST">
<input type="text" name="username" value="${(request_headers.query.username) ? request_headers.query.username : ""}"> &nbsp; <input type="submit" value="Look Up User">
</form><br><br>`
        if (request_headers.query.username) {
            if (user_info && !request_headers.query.confirm && !request_headers.query.reset) {
                if (user_info.username == ssid_sessions[socket.ssid].getSessionData("subscriber_username")) {
                    data += `Are you sure you want to Polyzoot <b>yourself</b>?<br>Are you a masochist?`;
                } else {
                    data += `Are you sure you want to Polyzoot <b>${user_info.username}</b>?<br>Are you a sadist?`;
                }
                data += `
<br><br>
<tr>
<td>
<form action="wtv-admin:/polyzoot" method="POST">
<input type="hidden" name="username" value="${user_info.username}">
<input type="hidden" name="reset" value="true">
<input type="submit" value="Release This Soul (Reset)">
</td>
<td>
<form action="wtv-admin:/polyzoot" method="POST">
<input type="hidden" name="username" value="${user_info.username}">
<input type="hidden" name="confirm" value="true">
<input type="submit" value="Torture This Soul">
</form>
</td>
</tr>
`
                data += `</table>`;
            } else if (request_headers.query.confirm) {
                data += `You have condemned <strong>${user_info.username}</strong><br> to endless loops of Polyzoot.<br><br>It will take effect upon their next login.<br><br>`;
            } else if (request_headers.query.reset) {
                data += `You have freed <strong>${user_info.username}'s</strong> soul<br> from the bounds of Polyzoot.<br><br>It will take effect upon their next login.<br><br>`;
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