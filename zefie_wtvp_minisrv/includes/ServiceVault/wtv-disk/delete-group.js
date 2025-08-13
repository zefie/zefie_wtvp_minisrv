const minisrv_service_file = true;

if (request_headers.query.group) {
    if (request_headers['wtv-request-type'] === "download") {
        const wtvdl = new WTVDisk(minisrv_config, service_name);
        headers = "200 OK\nContent-Type: " + wtvdl.content_type;
        wtvdl.deleteGroup(request_headers.query.group);
        wtvdl.deleteGroupUpdate(request_headers.query.group, request_headers.query.path || null);
        data = wtvdl.getDownloadList();
        const client_group_data = wtvdl.getGroupDataFromClientPost(request_headers.post_data.toString(CryptoJS.enc.Latin1));
        session_data.setTicketData("client_disk_group_data", client_group_data);
        if (minisrv_config.config.show_diskmap) console.log("Client POST Data:", client_group_data)
        if (minisrv_config.config.show_diskmap) console.log("DiskMap Data:", data);
    } else {
        const query = request_headers.query;
        query['url'] = 'wtv-disk:/delete-group';
        const queryString = Object.keys(query)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(query[key]))
            .join('&');
        headers = "302 Found\nLocation: wtv-disk:/content/DownloadScreen.tmpl" + (queryString ? ("?" + queryString) : "");    
    }
} else {
    const client_group_data = session_data.getTicketData("client_disk_group_data");
    if (!client_group_data) {
        headers = "302 Found\nLocation: wtv-disk:/get-group-data";
    } else {
        session_data.deleteTicketData("client_disk_group_data");
        headers = "200 OK\nContent-Type: text/html\nwtv-expire-all: wtv-disk:/delete-group";
        data = `
<html>
<head>
<title>Delete a DiskMap Group</title>
</head>
<body bgcolor="#191919" text="#44bb55" link="#44bb55" vlink="#44bb55" alink="#44bb55">
<form action="delete-group">
<input type="text" usestyle name="group">
<input type="submit" usestyle value="Delete">
</form>
<p>
<table border=1 cellspacing=3 cellpadding=3>
<tr><td>Group</td><td>Path</td><td>State</td><td>Last Checkup</td></tr>
`;
        if (!client_group_data) {
            data += "<li>No groups found.</li>";
        } else {
            Object.entries(client_group_data).forEach(([group, _]) => {
                const path = client_group_data[group].path;
                const state = client_group_data[group].state;
                const date = client_group_data[group]['last-checkup-time'];
                data += `<tr><td><a href="wtv-disk:/content/DownloadScreen.tmpl?url=${encodeURIComponent('wtv-disk:/delete-group?path='+path+'&group='+group)}">${group}</a></td><td>${path}</td><td>${state}</td><td>${date}</td></tr>\n`;
            })
        }
        data += `
</table>
</p>
<br>
<a href="/get-group-data">Refresh Box Group Data</a> - <a href="/content/Downloads.tmpl">Go to Downloads</a>
</body>
</html>
`
    }
}