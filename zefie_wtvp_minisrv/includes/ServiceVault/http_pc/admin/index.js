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
<body bgcolor="#000000" text="#449944">
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
