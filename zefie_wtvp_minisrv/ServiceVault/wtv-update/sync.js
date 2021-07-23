// todo: async

var path = require("path");

var content_dir = "content/"
var diskmap_dir = content_dir + "diskmaps/";

function generateDownloadList(diskmap_group_data, update_list, diskmap_data) {
    // create WebTV Download List

    var newest_file_epoch = 0;
    var download_list = '';

    if (diskmap_data.partition_size) {
        download_list += "CREATE " + diskmap_data.base + "\n";
        download_list += "partition-size: " + diskmap_data.partition_size + "\n\n";
    }

    download_list += "CREATE-GROUP " + diskmap_group_data + "-UPDATE\n";
    download_list += "state: invalid\n";
    download_list += "base: " + diskmap_data.base + ".GROUP-UPDATE/\n\n";
    
    Object.keys(update_list).forEach(function (k) {
        if (parseInt(update_list[k]["Last-modified"]) > newest_file_epoch) newest_file_epoch = parseInt(update_list[k]["Last-modified"]);
        download_list += "DISPLAY " + update_list[k].display + "\n\n";
        download_list += "GET " + update_list[k].file.replace(diskmap_data.base, "") + "\n";
        download_list += "group: " + diskmap_group_data + "-UPDATE\n";
        download_list += "location: " + service_name + ":/" + update_list[k].location + "\n";
        download_list += "file-permission: r\n"
        download_list += "wtv-checksum: " + update_list[k]["wtv-checksum"] + "\n";
        download_list += "service-source-location: /webtv/content/" + service_name.replace("wtv-","") + "d/" + update_list[k].location + "\n";
        download_list += "client-dest-location: " + update_list[k].file + "\n\n";
    });

    download_list += "CREATE-GROUP " + diskmap_group_data + "\n";
    download_list += "state: invalid\n";
    download_list += "service-owned: " + (diskmap_data.service_owned || false) + "\n";
    download_list += "base: " + diskmap_data.base + "\n\n";

    Object.keys(update_list).forEach(function (k) {
        download_list += "DELETE " + update_list[k].file.replace(diskmap_data.base, "") + "\n";
        download_list += "group: " + diskmap_group_data + "\n\n";
    });

    Object.keys(update_list).forEach(function (k) {
        download_list += "RENAME " + update_list[k].file.replace(diskmap_data.base, "") + "\n";
        download_list += "group: " + diskmap_group_data + "-UPDATE\n";
        download_list += "destination-group: " + diskmap_group_data + "\n";
        download_list += "location: " + update_list[k].file.replace(diskmap_data.base, "") + "\n\n";
    });

    download_list += "DELETE-GROUP " + diskmap_group_data + "-UPDATE\n\n";

    download_list += "SET-GROUP " + diskmap_group_data + "\n";
    download_list += "state: ok\n";
    download_list += "version: " + newest_file_epoch + "\n";
    download_list += "last-checkup-time: " + new Date().toUTCString().replace("GMT", "+0000") + "\n\n";

    return download_list;
}

function processGroup(diskmap_primary_group, diskmap_group_data, diskmap_subgroup = null) {
    // parse webtv post
    var output_data = '';
    var post_data = request_headers.post_data.toString(CryptoJS.enc.Latin1).split("\n");
    var post_data_current_directory = '';
    var post_data_current_file = '';
    var post_data_fileinfo = new Array();
    var post_data_filecount = -1;

    Object.keys(post_data).forEach(function (k) {
        if (post_data[k] == "") return;
        if (post_data[k].substring(0, 7) == "file://") {
            post_data_current_directory = post_data[k];
            post_data_current_file = post_data[k];
        }
        if (post_data[k].indexOf(":") > 0) {
            var post_data_line = post_data[k].split(": ")
            var post_data_line_name = post_data_line[0];
            post_data_line.shift();
            var post_data_line_data = post_data_line.join(": ");

            if (!post_data_fileinfo[post_data_filecount]) post_data_fileinfo[post_data_filecount] = new Array();

            if (post_data_line_name == "Last-modified") {
                post_data_fileinfo[post_data_filecount][post_data_line_name] = (new Date(new Date(Date.parse(post_data_line_data)).toUTCString()) / 1000);
            } else if (post_data_line_name == "Content-length") {
                post_data_fileinfo[post_data_filecount][post_data_line_name] = parseInt(post_data_line_data);
            }
            else {
                post_data_fileinfo[post_data_filecount][post_data_line_name] = post_data_line_data;
            }
        } else {
            post_data_filecount++;
            post_data_current_file = post_data_current_directory + post_data[k];
            post_data_fileinfo[post_data_filecount] = new Array();
            post_data_fileinfo[post_data_filecount].file = post_data_current_file
        }
    });
    var wtv_download_list = new Array();
    Object.keys(diskmap_group_data.files).forEach(function (k) {
        if (!diskmap_group_data.files[k].location) diskmap_group_data.files[k].location = diskmap_group_data.location + diskmap_group_data.files[k].file.replace(diskmap_group_data.base, "");
        var post_match_file = null;
        Object.keys(service_vaults).forEach(function (g) {
            if (post_match_file != null) return;
            post_match_file = service_vaults[g] + "/" + service_name + "/" + diskmap_group_data.files[k].location;
            if (!fs.existsSync(post_match_file)) post_match_file = null;
        });

        var file_in_postdata = function (post_file) {
            return post_file.file === diskmap_group_data.files[k].file
        }

        var post_match_file_lstat = fs.lstatSync(post_match_file);
        var post_match_result = post_data_fileinfo.find(file_in_postdata) || null;
        var post_match_file_data = new Buffer.from(fs.readFileSync(post_match_file, {
            encoding: null,
            flags: 'r'
        }));
        diskmap_group_data.files[k]["Last-modified"] = (new Date(new Date(post_match_file_lstat.mtime).toUTCString()) / 1000);
        diskmap_group_data.files[k]["Content-length"] = post_match_file_lstat.size;
        diskmap_group_data.files[k]["wtv-checksum"] = CryptoJS.MD5(CryptoJS.lib.WordArray.create(post_match_file_data)).toString(CryptoJS.enc.Hex).toLowerCase();
        if (!diskmap_group_data.files[k].display) diskmap_group_data.files[k].display = diskmap_group_data.display;

        if (post_match_result) {
            // md5s match, so client doesn't need file
            if (diskmap_group_data.files[k]['wtv-checksum'].toLowerCase() == post_match_result["wtv-checksum"]) return;
            // last modified is equal to or newer than the last update, and file size match, so assume same file and client does not need it
            else if ((post_match_result["Last-modified"] >= diskmap_group_data.files[k]["Last-modified"]) && (post_match_result["Content-length"] == diskmap_group_data.files[k]["Content-length"])) return;
            // otherwise send to client
            else wtv_download_list.push(diskmap_group_data.files[k]);
        } else {
            wtv_download_list.push(diskmap_group_data.files[k]);
        }
        var diskmap_group_name = (diskmap_subgroup == null) ? diskmap_primary_group : diskmap_primary_group + "-" + diskmap_subgroup;
        output_data = generateDownloadList(diskmap_group_name, wtv_download_list, diskmap_group_data)
    });
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
                if (!diskmap_data.display) {               
                    Object.keys(diskmap_data).forEach(function (k) {
                        if (diskmap_data[k]) data += processGroup(request_headers.query.group,diskmap_data[k],k);
                    });
                } else {
                    data = processGroup(request_headers.query.group, diskmap_data);
                }

                headers = "200 OK\nContent-Type: wtv/download-list";
            } catch (e) {
                var errpage = doErrorPage(400);
                headers = errpage[0];
                data = errpage[1];
                console.log("wtv-update:/sync error", e);
            }
        }
    } else {
        var errpage = doErrorPage(404,"The requested DiskMap does not exist.");
        headers = errpage[0];
        data = errpage[1];
        if (zdebug) console.log(" # wtv-update:/sync error", "could not find diskmap");
    }
} else {
    var errpage = doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
    if (zdebug) console.log(" # wtv-update:/sync error", "missing query arguments");
}

