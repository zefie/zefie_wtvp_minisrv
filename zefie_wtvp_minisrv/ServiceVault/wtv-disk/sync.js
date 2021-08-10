const WTVDownloadList = require("./WTVDownloadList.js");
var wtvdl = new WTVDownloadList(service_name);

var force_update = (request_headers.query.force == "true") ? true : false;
if (request_headers['wtv-request-type'] == 'download') {
    var content_dir = "content/"
    var diskmap_dir = content_dir + "diskmaps/";

    function generateDownloadList(diskmap_group_data, update_list, diskmap_data) {
        wtvdl.reset();
        var files_to_send = 0;
        Object.keys(update_list).forEach(function (k) {
            if (update_list[k].checksum_match && !force_update) return;
            if (!update_list[k].invalid && !force_update) return;
            files_to_send++;
        });

        // create WebTV Download List
        if (diskmap_data.execute && diskmap_data.execute_when) {
            if (diskmap_data.execute_when.toLowerCase().match(/start/)) {
                wtvdl.execute(diskmap_data.execute);
            }
        }

        if (diskmap_group_data.display) wtvdl.display(diskmap_group_data.display);

        if (files_to_send > 0) {

            if (diskmap_data.partition_size) {
                wtvdl.createPartition(diskmap_data.base, diskmap_data.partition_size);
            }

            if (!diskmap_data.nogroup) {
                // only send group commands if group mode is enable
                // useful to disable for PUT
                wtvdl.createUpdateGroup(diskmap_group_data, diskmap_data.base, "invalid", (diskmap_data.service_owned || false));
            }

            Object.keys(update_list).forEach(function (k) {
                // file { "action": "delete" }
                // Useful to purge files we no longer want on the client
                if (update_list[k].action != "DELETE") {
                    // skip deleting valid files if we aren't specifically requesting their deletion
                    if (update_list[k].checksum_match && !force_update) return;
                    if (!update_list[k].invalid && !force_update) return;
                }
                wtvdl.delete(update_list[k].file.replace(diskmap_data.base, ""), diskmap_group_data);
            });

            Object.keys(update_list).forEach(function (k) {
                if (update_list[k].checksum_match && !force_update) return;
                if (!update_list[k].invalid && !force_update) return;
                if (update_list[k].display) wtvdl.display(update_list[k].display);
                switch (update_list[k].action) {
                    case "PUT":
                        wtvdl.put(update_list[k].file.replace(diskmap_data.base, ""), service_name + ":/" + update_list[k].location, update_list[k].display);
                        break;

                    case "GET":
                        wtvdl.get(update_list[k].file.replace(diskmap_data.base, ""), update_list[k].file, service_name + ":/" + update_list[k].location, diskmap_group_data, update_list[k].checksum)
                        break;
                }
            });

            if (!diskmap_data.nogroup) {
                wtvdl.createGroup(diskmap_group_data, diskmap_data.base, "invalid", (diskmap_data.service_owned || false));


                // this rename loop is a part of the group system
                Object.keys(update_list).forEach(function (k) {
                    if (update_list[k].checksum_match && !force_update) return;
                    if (!update_list[k].invalid && !force_update) return;
                    wtvdl.rename(update_list[k].file.replace(diskmap_data.base, ""), update_list[k].file.replace(diskmap_data.base, ""), diskmap_group_data, diskmap_group_data);
                });

                wtvdl.setGroup(diskmap_group_data, 'ok', diskmap_data.version);
            }

        }

        if (diskmap_data.execute && diskmap_data.execute_when) {
            if (diskmap_data.execute_when.toLowerCase().match(/end/)) {
                wtvdl.execute(diskmap_data.execute);
            }
        }

        if (files_to_send > 0) {
            if (!diskmap_data.nogroup) {
                wtvdl.deleteGroupUpdate(diskmap_group_data, diskmap_data.base);
            }
        }
        var download_list = wtvdl.getDownloadList();
        console.log(download_list);
        return download_list;
    }

    function processGroup(diskmap_primary_group, diskmap_group_data, diskmap_subgroup = null) {
        // parse webtv post
        var output_data = '';
        var post_data = new Array();
        if (request_headers.post_data) post_data = request_headers.post_data.toString(CryptoJS.enc.Latin1).split("\n");
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
            diskmap_group_data.files[k].action = (diskmap_group_data.files[k].action) ? diskmap_group_data.files[k].action.toUpperCase() : "GET";

            if (parseInt(diskmap_group_data.files[k].last_modified) > newest_file_epoch) newest_file_epoch = parseInt(diskmap_group_data.files[k].last_modified);
            //if (!diskmap_group_data.files[k].display) diskmap_group_data.files[k].display = diskmap_group_data.display;

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

    if (request_headers.query.diskmap && request_headers.query.group) {
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
    headers = "200 OK\nContent-Type: text/html";
    data = wtvdl.getSyncPage(minisrv_config, message, request_headers.query.group, request_headers.query.diskmap, main_message, message, force_update)
}