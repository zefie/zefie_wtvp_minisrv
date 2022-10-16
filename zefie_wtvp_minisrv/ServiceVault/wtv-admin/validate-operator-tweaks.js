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
        var user_config = wtvshared.getUserConfig();
        Object.keys(request_headers.query).forEach((k) => {
            if (k === "autosubmit") return;
            var v = request_headers.query[k];
            if (!isNaN(parseInt(v))) v = parseInt(v);
            if (v === "on" || v === "true" || v === "false") v = wtvshared.parseBool(v);
            if (k.indexOf("-") > 0) {
                var s = k.split("-");
                if (!user_config.config[s[0]]) user_config.config[s[0]] = {}
                user_config.config[s[0]][s[1]] = v;
            } else {
                user_config.config[k] = v;
            }
        });
        var res = wtvshared.writeToUserConfig(user_config);
        if (res) {
            console.log(" * Configuration updated from wtv-admin, reloading")
            reloadConfig();
            headers = "200 OK\r\nContent-Type: text/html";
        } else {
            err = wtvshared.doErrorPage(400, "Error writing userconfig");
            headers = err[0];
            data = err[1];
        }
    }
}

if (!headers) {
    err = wtvshared.doErrorPage();
    headers = err[0];
    data = err[1];
}