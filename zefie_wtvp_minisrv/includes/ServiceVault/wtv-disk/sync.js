var minisrv_service_file = true;

var diskmap = request_headers.query[wtvshared.getCaseInsensitiveKey("DiskMap", request_headers.query)];
var wtvdl = new WTVDisk(minisrv_config, service_name);

var force_update = (request_headers.query.force == "true") ? true : false;
var no_delete = (request_headers.query.dont_delete_files == "true") ? true : false;
var content_dir = "content/"
var diskmap_dir = content_dir + "diskmaps/";

if (request_headers['wtv-request-type'] == 'download') {

    function generateDownloadList(diskmap_group_name, update_list, diskmap_group_data) {
        wtvdl.reset();
        var files_to_send = 0;
        Object.keys(update_list).forEach(function (k) {
            if (update_list[k].checksum_match && !force_update) return;
            if (!update_list[k].invalid && !force_update) return;
            files_to_send++;
        });

        // create WebTV Download List
        if (diskmap_group_data.execute_start) {
            wtvdl.execute(diskmap_group_data.execute_start);
        }

        // delete groups if force, or group is invalid
        if (diskmap_group_data.client_group_data) {
            if (force_update || diskmap_group_data.client_group_data.state == "invalid") {
                wtvdl.deleteGroupUpdate(diskmap_group_data.client_group_data.group, diskmap_group_data.client_group_data.path);
            }

            // delete partition/path if force, and not no_delete
            if (force_update && !no_delete) {
                // don't delete Brower partition, ever, but allow deleting of Browser partition subdirs
                if (!diskmap_group_data.base.match(/disk\/browser(\/)?$/i)) {
                    if (diskmap_group_data.client_group_data.path.toLowerCase() == diskmap_group_data.base.toLowerCase()) {
                        wtvdl.delete(diskmap_group_data.base, null);
                    } else {
                        wtvdl.delete(diskmap_group_data.base, diskmap_group_data.client_group_data.group);
                    }
                }
            }
        }

        if (diskmap_group_name.display) wtvdl.display(diskmap_group_name.display);

        if (files_to_send > 0) {

            if (diskmap_group_data.partition_size) {
                wtvdl.createPartition(diskmap_group_data.base, diskmap_group_data.partition_size);
            }

            if (!diskmap_group_data.nogroup) {
                // only send group commands if group mode is enable
                // useful to disable for PUT
                wtvdl.createUpdateGroup(diskmap_group_name, diskmap_group_data.base, "invalid", (diskmap_group_data.service_owned || false));
            }

            Object.keys(update_list).forEach(function (k) {
                // file { "action": "delete" }
                // Useful to purge files we no longer want on the client
                if (update_list[k].action != "DELETE" && update_list[k].action != "DELETEONLY") {
                    // skip deleting valid files if we aren't specifically requesting their deletion
                    if (update_list[k].checksum_match && !force_update) return;
                    if (!update_list[k].invalid && !force_update) return;
                }
                wtvdl.delete(update_list[k].file.replace(diskmap_group_data.base, ""), diskmap_group_name);
            });

            Object.keys(update_list).forEach(function (k) {
                if (update_list[k].checksum_match && !force_update) return;
                if (!update_list[k].invalid && !force_update) return;
                if (update_list[k].action == "DELETEONLY") return;
                if (update_list[k].display) wtvdl.display(update_list[k].display);
                switch (update_list[k].action) {
                    case "PUT":
                        wtvdl.put(update_list[k].file.replace(diskmap_group_data.base, ""), service_name + ":/" + update_list[k].location, update_list[k].display);
                        break;

                    case "GET":
                        var get_url = service_name + ":/" + update_list[k].location + "?";
                        if (update_list[k].compress === false) get_url += "dont_compress=true&";
                        if (update_list[k].type) get_url += "content_type=" + escape(update_list[k].type) + "&";
                        get_url = get_url.slice();
                        wtvdl.get(update_list[k].file.replace(diskmap_group_data.base, ""), update_list[k].file, get_url, diskmap_group_name, update_list[k].checksum, update_list[k].uncompressed_size || null, update_list[k].original_filename)
                        break;
                }
            });

            if (!diskmap_group_data.nogroup) {
                wtvdl.createGroup(diskmap_group_name, diskmap_group_data.base, "invalid", (diskmap_group_data.service_owned || false));

                // this rename loop is a part of the group system
                Object.keys(update_list).forEach(function (k) {
                    if (update_list[k].checksum_match && !force_update) return;
                    if (!update_list[k].invalid && !force_update) return;
                    if (update_list[k].action == "DELETEONLY") return;
                    wtvdl.rename(update_list[k].file.replace(diskmap_group_data.base, ""), update_list[k].file.replace(diskmap_group_data.base, ""), diskmap_group_name, diskmap_group_name, update_list[k].rename || update_list[k].original_filename || null);
                });

                wtvdl.setGroup(diskmap_group_name, 'ok', diskmap_group_data.version);
            }

        }

        if (diskmap_group_data.execute_end) {
            wtvdl.execute(diskmap_group_data.execute_end);
        }

        if (files_to_send > 0) {
            if (!diskmap_group_data.nogroup) {
                wtvdl.deleteGroupUpdate(diskmap_group_name, diskmap_group_data.base);
            }
        }
        var download_list = wtvdl.getDownloadList();
        if (minisrv_config.config.show_diskmap) console.log(download_list);
        return download_list;
    }

    function processGroup(diskmap_primary_group, diskmap_group_data, diskmap_subgroup = null, version = 0) {
        // parse webtv post
        var output_data = '';
        var post_data = new Array();
        var client_group_data = new Array();
        if (request_headers.post_data) {
            post_data = request_headers.post_data.toString(CryptoJS.enc.Latin1).split("\n");
            client_group_data = wtvdl.getGroupDataFromClientPost(request_headers.post_data.toString(CryptoJS.enc.Latin1));
        }
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
        var newest_file_epoch = version;
        Object.keys(diskmap_group_data.files).forEach(function (k) {
            if (!diskmap_group_data.files[k].location) diskmap_group_data.files[k].location = wtvshared.makeSafePath(diskmap_group_data.location,diskmap_group_data.files[k].file.replace(diskmap_group_data.base, ""), true);
            var diskmap_data_file = null;
            Object.keys(service_vaults).forEach(function (g) {
                if (diskmap_data_file != null) return;
                diskmap_data_file = service_vaults[g] + "/" + service_name + "/" + diskmap_group_data.files[k].location;
                if (!fs.existsSync(diskmap_data_file) || !fs.lstatSync(diskmap_data_file).isFile()) diskmap_data_file = null;
            });

            if (diskmap_data_file) {
                var diskmap_file_stat = fs.lstatSync(diskmap_data_file);
                var diskmap_file_data = new Buffer.from(fs.readFileSync(diskmap_data_file, {
                    encoding: null,
                    flags: 'r'
                }));
                diskmap_group_data.files[k].base = diskmap_group_data.base;
                diskmap_group_data.files[k].last_modified = (new Date(new Date(diskmap_file_stat.mtime).toUTCString()) / 1000);
                diskmap_group_data.files[k].content_length = diskmap_file_stat.size;
                diskmap_group_data.files[k].action = (diskmap_group_data.files[k].action) ? diskmap_group_data.files[k].action.toUpperCase() : "GET";

                // we need the checksum of the uncompressed data
                if (wtvshared.getFileExt(diskmap_data_file).toLowerCase() == "gz") {
                    var gunzipped = zlib.gunzipSync(diskmap_file_data);
                    diskmap_group_data.files[k].checksum = CryptoJS.MD5(CryptoJS.lib.WordArray.create(gunzipped)).toString(CryptoJS.enc.Hex).toLowerCase();
                    var gzip_fn_end = diskmap_file_data.indexOf("\0", 10);
                    if (!diskmap_group_data.files[k].dont_extract_filename) {
                        diskmap_group_data.files[k].original_filename = diskmap_file_data.toString('utf8', 10, gzip_fn_end);
                    }
                    diskmap_group_data.files[k].uncompressed_size = gunzipped.byteLength;
                    gunzipped = null;
                } else {
                    diskmap_group_data.files[k].checksum = CryptoJS.MD5(CryptoJS.lib.WordArray.create(diskmap_file_data)).toString(CryptoJS.enc.Hex).toLowerCase();
                }

                if (parseInt(diskmap_group_data.files[k].last_modified) > newest_file_epoch) newest_file_epoch = parseInt(diskmap_group_data.files[k].last_modified);

                diskmap_group_data.files[k].invalid = true;
                wtv_download_list.push(diskmap_group_data.files[k]);
            }
        });
        // check to see if client says they have this version
        diskmap_group_data.version = newest_file_epoch;
        Object.keys(wtv_download_list).forEach(function (k) {
            wtv_download_list[k].version = newest_file_epoch;
            Object.keys(post_data_fileinfo).forEach(function (g) {
                if (post_data_fileinfo[g].file == wtv_download_list[k] || post_data_fileinfo[g].file == wtv_download_list[k].base) {
                    diskmap_group_data.group_exists = true;
                    if (diskmap_group_data.files[k].checksum && diskmap_group_data.files[k].checksum.toLowerCase() == post_data_fileinfo[g].checksum) wtv_download_list[k].invalid = false;
                    else if (post_data_fileinfo[g].version == wtv_download_list[k].version && post_data_fileinfo[g].state != "invalid") wtv_download_list[k].invalid = false;
                }
            });
        });
        var diskmap_group_name = (diskmap_subgroup == null) ? diskmap_primary_group : diskmap_primary_group + "-" + diskmap_subgroup;
        diskmap_group_data.client_group_data = client_group_data[diskmap_group_name] || null;
        output_data = generateDownloadList(diskmap_group_name, wtv_download_list, diskmap_group_data);
        return output_data;
    }

    if (diskmap && request_headers.query.group) {
        var diskmap_json_file = null;
        Object.keys(service_vaults).forEach(function (g) {
            if (diskmap_json_file != null) return;
            diskmap_json_file = service_vaults[g] + "/" + service_name + "/" + diskmap_dir + diskmap + ".json";
            if (!fs.existsSync(diskmap_json_file)) diskmap_json_file = null;
        });

        if (diskmap_json_file != null) {
            if (fs.existsSync(diskmap_json_file)) {
                try {
                    // read diskmap
                    var json_stats = fs.lstatSync(diskmap_json_file);
                    var diskmap_data = JSON.parse(fs.readFileSync(diskmap_json_file).toString());
                    if (!diskmap_data[request_headers.query.group]) {
                        throw ("Invalid diskmap data (group does not match)");
                    }
                    data = '';
                    diskmap_data = diskmap_data[request_headers.query.group];
                    if (!diskmap_data.location) {
                        Object.keys(diskmap_data).forEach(function (k) {
                            if (diskmap_data[k]) {
                                diskmap_data[k].version = (new Date(new Date(json_stats.mtime).toUTCString()) / 1000);
                                data += processGroup(request_headers.query.group, diskmap_data[k], k, diskmap_data.version);
                            }
                        });
                    } else {
                        diskmap_data.version = (new Date(new Date(json_stats.mtime).toUTCString()) / 1000);
                        data = processGroup(request_headers.query.group, diskmap_data, null, diskmap_data.version);
                    }

                    headers = "200 OK\nContent-Type: wtv/download-list";
                } catch (e) {
                    var errpage = wtvshared.doErrorPage(400);
                    headers = errpage[0];
                    data = errpage[1];
                    console.error(" # " + service_name+":/sync error", e);
                }
            }
        } else {
            var errpage = wtvshared.doErrorPage(404, "The requested DiskMap does not exist.");
            headers = errpage[0];
            data = errpage[1];
            if (minisrv_config.config.debug_flags.debug) console.error(" # " + service_name +":/sync error", "could not find diskmap");
        }
    } else {
        var errpage = wtvshared.doErrorPage(400);
        headers = errpage[0];
        data = errpage[1];
        if (minisrv_config.config.debug_flags.debug) console.error(" # " + service_name + ":/sync error", "missing query arguments");
    }
} else {
    var queryString = Object.keys(request_headers.query)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(request_headers.query[key]))
        .join('&');
    headers = "302 Found\nLocation: wtv-disk:/content/DownloadScreen.tmpl" + (queryString ? ("?" + queryString) : "");
    data = "";
}