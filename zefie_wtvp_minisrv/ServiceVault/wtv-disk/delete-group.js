if (request_headers.query.group) {
    const WTVDownloadList = require("./WTVDownloadList.js");
    var wtvdl = new WTVDownloadList(minisrv_config, service_name);
    if (request_headers['wtv-request-type']) {
        headers = "200 OK\nContent-Type: " + wtvdl.content_type;
        wtvdl.deleteGroup(request_headers.query.group);
        data = wtvdl.getDownloadList();
    }
    var title = "Deleting group"
    var message = title + " " + request_headers.query.group;
    headers = "200 OK\nContent-Type: text/html"
    data = wtvdl.getSyncPage(title, request_headers.query.group, "delete", message, message, null, "client:goback", "client:goback", "wtv-disk:/delete-group");
} else {
    headers = "200 OK\nContent-Type: text/html"
    data = `
<html>
<head>
<title>Delete a DiskMap Group</title>
</head>
<body bgcolor="black" text="gold" vlink="gold" alink="gold" link="gold">
<form action="delete-group">
<input type="text" usestyle name="group">
<input type="submit" usestyle value="Delete">
</form>
<ul>
`;
    var groups = [
        "HackTV",
        "HackTV-Base",
        "HackTV-Music",
        "FREEDOOM",
        "Doom",
        "DealerDemo",
        "Modem_Firmware",
        "MAME",
        "zefie"
    ]
    groups.forEach(function (group) {
        data += "<li><a href=\"?group=" + group + "\">Delete Group \"" + group + "\"</a></li>\n";
    })
    data += `
</ul>
</body>
</html>
`
}