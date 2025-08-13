const minisrv_service_file = true;

if (request_headers['wtv-request-type'] === "download") {
    const wtvdl = new WTVDisk(minisrv_config, service_name);
    headers = "200 OK\nContent-Type: " + wtvdl.content_type;
    wtvdl.execute('client:donothing');
    data = wtvdl.getDownloadList();
    const client_group_data = wtvdl.getGroupDataFromClientPost(request_headers.post_data.toString(CryptoJS.enc.Latin1));
    session_data.setTicketData("client_disk_group_data", client_group_data);
    if (minisrv_config.config.show_diskmap) console.log("Client POST Data:", client_group_data);
    if (minisrv_config.config.show_diskmap) console.log("DiskMap Data:", data);
} else {
    const query = request_headers.query;
    query['url'] = 'wtv-disk:/get-group-data';
    query['success_url'] = 'wtv-disk:/delete-group';
    const queryString = Object.keys(query)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(query[key]))
        .join('&');
    headers = "302 Found\nLocation: wtv-disk:/content/DownloadScreen.tmpl" + (queryString ? ("?" + queryString) : "");
}