const minisrv_service_file = true;

const WTVAdmin = require(classPath + "/WTVAdmin.js")
const wtva = new WTVAdmin(minisrv_config, socket, service_name);
const auth = wtva.isAuthorized();
if (auth === true) {
    let password = null;
    if (request_headers.authorization) {
        const authheader = request_headers.authorization.split(' ');
        console.log(request_headers)

        if (authheader[0] === "Basic") {
            password = Buffer.from(authheader[1], 'base64').toString();
            password = password.split(':')[1];
        }
    }
    if (wtva.checkPassword(password)) {
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
        data += `Please select an option to get started:
        <hr>
            <a href="/admin/ssid?cmd=list">List all SSIDs and their Primary User</a><br>
            </p>
        </body>
</html >`;

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