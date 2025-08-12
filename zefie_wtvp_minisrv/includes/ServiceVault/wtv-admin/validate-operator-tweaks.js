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
        const user_config = wtvshared.getUserConfig();
        Object.keys(request_headers.query).forEach((k) => {
            if (k === "autosubmit") return;
            let v = request_headers.query[k];

            // enable_multi_query may send ["false", "on"] for checkboxes due to webtvism
            if (util.isArray(v)) v = v[(v.length - 1)]; 

            // convert numbers back to int before writing to config
            if (!isNaN(parseInt(v))) v = parseInt(v); 

            // convert string back to boolean before writing to config
            if (v === "on" || v === "true" || v === "false") v = wtvshared.parseBool(v);

            if (k.indexOf("-") > 0) {
                // handle sub-config items
                const s = k.split("-");
                if (!user_config.config[s[0]]) user_config.config[s[0]] = {}
                user_config.config[s[0]][s[1]] = v;
            } else {
                user_config.config[k] = v;
            }
        });
        const res = wtvshared.writeToUserConfig(user_config);
        if (res) {
            console.log(" * Configuration updated from wtv-admin, reloading")
            reloadConfig();
            headers = "200 OK\nwtv-expire-all: wtv-admin:/operatortweaks\nContent-Type: text/html";
        } else {
            const err = wtvshared.doErrorPage(400, "Error writing userconfig");
            headers = err[0];
            data = err[1];
        }
    }
}

if (!headers) {
    const err = wtvshared.doErrorPage();
    headers = err[0];
    data = err[1];
}