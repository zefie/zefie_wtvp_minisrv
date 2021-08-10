// todo: async

var force_update = (request_headers.query.force == "true") ? true : false;
if (request_headers['wtv-request-type'] == 'download') {
    var path = require("path");

    var content_dir = "content/"
    var diskmap_dir = content_dir + "diskmaps/";

    function generateDownloadList(diskmap_group_data, update_list, diskmap_data) {
        // create WebTV Download List
        var newest_file_epoch = 0;
        var download_list = '';

        if (diskmap_data.execute && diskmap_data.execute_when == "atStart") {
            download_list += "EXECUTE " + diskmap_data.execute + "\n\n";
        }

        if (diskmap_data.partition_size) {
            download_list += "CREATE " + diskmap_data.base + "\n";
            download_list += "partition-size: " + diskmap_data.partition_size + "\n\n";
        }

        download_list += "CREATE-GROUP " + diskmap_group_data + "-UPDATE\n";
        download_list += "state: invalid\n";
        download_list += "base: " + diskmap_data.base + ".GROUP-UPDATE/\n\n";

        download_list += "CREATE-GROUP " + diskmap_group_data + "\n";
        download_list += "state: invalid\n";
        download_list += "service-owned: " + (diskmap_data.service_owned || false) + "\n";
        download_list += "base: " + diskmap_data.base + "\n\n";

        Object.keys(update_list).forEach(function (k) {
            if (update_list[k].checksum_match && !force_update) return;
            if (!update_list[k].invalid && !force_update) return;
            download_list += "DELETE " + update_list[k].file.replace(diskmap_data.base, "") + "\n";
            download_list += "group: " + diskmap_group_data + "\n\n";
        });

        Object.keys(update_list).forEach(function (k) {
            if (update_list[k].checksum_match && !force_update) return;
            if (!update_list[k].invalid && !force_update) return;
            download_list += "DISPLAY " + update_list[k].display + "\n\n";
            download_list += "GET " + update_list[k].file.replace(diskmap_data.base, "") + "\n";
            download_list += "group: " + diskmap_group_data + "-UPDATE\n";
            download_list += "location: " + service_name + ":/" + update_list[k].location + "\n";
            download_list += "file-permission: r\n"
            download_list += "wtv-checksum: " + update_list[k].checksum + "\n";
            download_list += "service-source-location: /webtv/content/" + service_name.replace("wtv-", "") + "d/" + update_list[k].location + "\n";
            download_list += "client-dest-location: " + update_list[k].file + "\n\n";
        });

        download_list += "CREATE-GROUP " + diskmap_group_data + "\n";
        download_list += "state: invalid\n";
        download_list += "service-owned: " + (diskmap_data.service_owned || false) + "\n";
        download_list += "base: " + diskmap_data.base + "\n\n";


        Object.keys(update_list).forEach(function (k) {
            if (update_list[k].checksum_match && !force_update) return;
            if (!update_list[k].invalid && !force_update) return;
            download_list += "RENAME " + update_list[k].file.replace(diskmap_data.base, "") + "\n";
            download_list += "group: " + diskmap_group_data + "-UPDATE\n";
            download_list += "destination-group: " + diskmap_group_data + "\n";
            download_list += "location: " + update_list[k].file.replace(diskmap_data.base, "") + "\n\n";
        });

        download_list += "SET-GROUP " + diskmap_group_data + "\n";
        download_list += "state: ok\n";
        download_list += "version: " + diskmap_data.version + "\n";
        download_list += "last-checkup-time: " + new Date().toUTCString().replace("GMT", "+0000") + "\n\n";

        if (diskmap_data.execute && diskmap_data.execute_when == "atEnd") {
            download_list += "EXECUTE " + diskmap_data.execute + "\n\n";
        }

        download_list += "DELETE-GROUP " + diskmap_group_data + "-UPDATE\n\n";
        download_list += "DELETE " + diskmap_data.base + ".GROUP-UPDATE/\n\n";
        return download_list;
    }

    function processGroup(diskmap_primary_group, diskmap_group_data, diskmap_subgroup = null) {
        // parse webtv post
        var output_data = '';
        var post_data = request_headers.post_data.toString(CryptoJS.enc.Latin1).split("\n");
        var post_data_current_directory = '';
        var post_data_current_file = false;
        var post_data_current_group = '';
        var post_data_last_modified = false;
        var post_data_content_length = false;
        var post_data_current_group_state = false;
        var post_data_fileinfo = new Array();
        var entry_type = false;
        var post_data_current_version = false;
        var post_data_current_checksum = false;
        var post_data_last_checkup_time = 0;
        Object.keys(post_data).forEach(function (k) {
            if (post_data[k].substring(0, 7) == "file://") {
                entry_type = "folder";
                post_data_current_file = false;
                post_data_current_version = false;
                post_data_last_checkup_time = 0;
                post_data_current_group = '';
                post_data_current_group_state = false;
                post_data_last_modified = false;
                post_data_content_length = false;
                post_data_current_checksum = false;
                post_data_current_directory = post_data[k];
            } else {
                if (post_data[k].indexOf(":") > 0) {
                    var post_data_line = post_data[k].split(": ")
                    var post_data_line_name = post_data_line[0];
                    post_data_line.shift();
                    var post_data_line_data = post_data_line.join(": ");

                    switch (post_data_line_name.toLowerCase()) {
                        case "last-modified":
                            post_data_last_modified = (new Date(new Date(Date.parse(post_data_line_data)).toUTCString()) / 1000);
                            break;
                        case "content-length":
                            post_data_content_length = parseInt(post_data_line_data);
                            break;
                        case "version":
                            post_data_current_version = parseInt(post_data_line_data);
                            break;
                        case "group":
                            post_data_current_group = post_data_line_data;
                            break;
                        case "state":
                            post_data_current_group_state = post_data_line_data;
                            break;
                        case "wtv-checksum":
                            post_data_current_checksum = post_data_line_data;
                            break;
                        case "last-checkup-time":
                            post_data_last_checkup_time = (new Date(new Date(Date.parse(post_data_line_data)).toUTCString()) / 1000);
                            break;
                    }
                } else {
                    if (!entry_type && post_data[k] != "") {
                        entry_type = "file";
                        post_data_current_file = post_data[k];
                    }

                    if (post_data[k] == "" && entry_type) {
                        var post_data_current_path = ((entry_type == "file") ? (post_data_current_directory + post_data_current_file) : post_data_current_directory);
                        var index = post_data_current_path.replace(/[\:\/]/g, "_").toLowerCase() + "_" + post_data_current_group;
                        if (index.match(/\/$/)) entry_type = "folder";
                        if (!post_data_fileinfo[index]) post_data_fileinfo[index] = new Array();
                        post_data_fileinfo[index].entry_type = entry_type;
                        post_data_fileinfo[index].file = post_data_current_path;
                        post_data_fileinfo[index].group = post_data_current_group;
                        post_data_fileinfo[index].version = post_data_current_version || 0;
                        if (post_data_current_checksum) post_data_fileinfo[index].checksum = post_data_current_checksum;
                        if (post_data_current_group_state) post_data_fileinfo[index].state = post_data_current_group_state;
                        if (post_data_last_checkup_time) post_data_fileinfo[index].last_checkup = post_data_last_checkup_time;
                        if (post_data_last_modified) post_data_fileinfo[index].last_modified = post_data_last_modified;
                        if (post_data_content_length) post_data_fileinfo[index].content_length = post_data_content_length;
                        entry_type = false;
                    }
                }
            }
        });
        var wtv_download_list = new Array();
        var newest_file_epoch = 0;
        Object.keys(diskmap_group_data.files).forEach(function (k) {
            if (!diskmap_group_data.files[k].location) diskmap_group_data.files[k].location = diskmap_group_data.location + diskmap_group_data.files[k].file.replace(diskmap_group_data.base, "");
            var post_match_file = null;
            Object.keys(service_vaults).forEach(function (g) {
                if (post_match_file != null) return;
                post_match_file = service_vaults[g] + "/" + service_name + "/" + diskmap_group_data.files[k].location;
                if (!fs.existsSync(post_match_file)) post_match_file = null;
            });

            var post_match_file_lstat = fs.lstatSync(post_match_file);
            var post_match_file_data = new Buffer.from(fs.readFileSync(post_match_file, {
                encoding: null,
                flags: 'r'
            }));
            diskmap_group_data.files[k].base = diskmap_group_data.base;
            diskmap_group_data.files[k].last_modified = (new Date(new Date(post_match_file_lstat.mtime).toUTCString()) / 1000);
            diskmap_group_data.files[k].content_length = post_match_file_lstat.size;
            diskmap_group_data.files[k].checksum = CryptoJS.MD5(CryptoJS.lib.WordArray.create(post_match_file_data)).toString(CryptoJS.enc.Hex).toLowerCase();

            if (parseInt(diskmap_group_data.files[k].last_modified) > newest_file_epoch) newest_file_epoch = parseInt(diskmap_group_data.files[k].last_modified);
            if (!diskmap_group_data.files[k].display) diskmap_group_data.files[k].display = diskmap_group_data.display;

            diskmap_group_data.files[k].invalid = true;
            wtv_download_list.push(diskmap_group_data.files[k]);
        });
        // check to see if client says they have this version
        diskmap_group_data.version = newest_file_epoch;
        Object.keys(wtv_download_list).forEach(function (k) {
            wtv_download_list[k].version = newest_file_epoch;
            Object.keys(post_data_fileinfo).forEach(function (g) {
                if (post_data_fileinfo[g].file == wtv_download_list[k] || post_data_fileinfo[g].file == wtv_download_list[k].base) {
                    diskmap_group_data.group_exists = true;
                    if (diskmap_group_data.files[k].checksum.toLowerCase() == post_data_fileinfo[g].checksum) wtv_download_list[k].invalid = false;
                    else if (post_data_fileinfo[g].version == wtv_download_list[k].version && post_data_fileinfo[g].state != "invalid") wtv_download_list[k].invalid = false;
                }
            });
        });
        var diskmap_group_name = (diskmap_subgroup == null) ? diskmap_primary_group : diskmap_primary_group + "-" + diskmap_subgroup;
        output_data = generateDownloadList(diskmap_group_name, wtv_download_list, diskmap_group_data);
        return output_data;
    }

    if (request_headers.query.diskmap && request_headers.query.group && request_headers.post_data) {
        var diskmap_json_file = null;
        Object.keys(service_vaults).forEach(function (g) {
            if (diskmap_json_file != null) return;
            diskmap_json_file = service_vaults[g] + "/" + service_name + "/" + diskmap_dir + request_headers.query.diskmap + ".json";
            if (!fs.existsSync(diskmap_json_file)) diskmap_json_file = null;
        });

        if (diskmap_json_file != null) {
            if (fs.lstatSync(diskmap_json_file)) {
                try {
                    // read diskmap
                    var diskmap_data = JSON.parse(fs.readFileSync(diskmap_json_file).toString());
                    if (!diskmap_data[request_headers.query.group]) {
                        throw ("Invalid diskmap data (group does not match)");
                    }
                    data = '';
                    diskmap_data = diskmap_data[request_headers.query.group];
                    if (!diskmap_data.location) {
                        Object.keys(diskmap_data).forEach(function (k) {
                            if (diskmap_data[k]) data += processGroup(request_headers.query.group, diskmap_data[k], k);
                        });
                    } else {
                        data = processGroup(request_headers.query.group, diskmap_data);
                    }

                    headers = "200 OK\nContent-Type: wtv/download-list";
                } catch (e) {
                    var errpage = doErrorPage(400);
                    headers = errpage[0];
                    data = errpage[1];
                    console.error(" # " + service_name+":/sync error", e);
                }
            }
        } else {
            var errpage = doErrorPage(404, "The requested DiskMap does not exist.");
            headers = errpage[0];
            data = errpage[1];
            if (zdebug) console.error(" # " + service_name +":/sync error", "could not find diskmap");
        }
    } else {
        var errpage = doErrorPage(400);
        headers = errpage[0];
        data = errpage[1];
        if (zdebug) console.error(" # " + service_name + ":/sync error", "missing query arguments");
    }
} else if (request_headers.query.group && request_headers.query.diskmap) {
    var message = request_headers.query.message || "Retrieving files...";
    var main_message = request_headers.query.main_message || "Your receiver is downloading files.";
    headers = `200 OK
Content-Type: text/html`;

    data = `
<html>
<head>
        <meta
                http-equiv=refresh
                    content="0;url=client:Fetch?group=${escape(request_headers.query.group)}&source=${service_name}:/sync%3Fdiskmap%3D${escape(escape(request_headers.query.diskmap))}%26force%3D${force_update}&message=${escape(message)}"
        >
        <display downloadsuccess="client:ShowAlert?message=Download%20successful%21&buttonlabel1=Okay&buttonaction1=client:goback&image=${minisrv_config.config.service_logo}&noback=true" downloadfail="client:ShowAlert?message=Download%20failed...&buttonlabel1=Okay...&buttonaction1=client:goback&image=${minisrv_config.config.service_logo}&noback=true">
        <title>Retrieving files...</title>
</head>
<body bgcolor=#0 text=#42CC55 fontsize=large hspace=0 vspace=0>
<table cellspacing=0 cellpadding=0>
        <tr>
                <td width=104 height=74 valign=middle align=center bgcolor=3B3A4D>
                        <img src="${minisrv_config.config.service_logo}" width=86 height=64>
                <td width=20 valign=top align=left bgcolor=3B3A4D>
                        <spacer>
                <td colspan=2 width=436 valign=middle align=left bgcolor=3B3A4D>
                        <font color=D6DFD0 size=+2><blackface><shadow>
                                <spacer type=block width=1 height=4>
                                <br>
                                        ${message}
                                </shadow>
                                </blackface>
                        </font>
        <tr>
                <td width=104 height=20>
                <td width=20>
                <td width=416>
                <td width=20>
        <tr>
                <td colspan=2>
                <td>
                        <font size=+1>
                               ${main_message}
                                <p>This may take a while.
                        </font>
        <tr>
                <td colspan=2>
                <td>
                        <br><br>
                        <font color=white>
                        <progressindicator name="downloadprogress"
                           message="Preparing..."
                           height=40 width=250>
                        </font>
</table>
</body>
</html>
`;

}