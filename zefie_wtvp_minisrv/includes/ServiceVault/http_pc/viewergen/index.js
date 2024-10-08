var minisrv_service_file = true;

var viewers = {
    0: "WebTVIntel--1.0.exe",
    1: "WebTVIntel--1.1.exe",
    2: "WebTVIntel--2.5.exe",
    3: "WebTVIntel--1.0-HE.exe",
    4: "WebTVIntel--2.5-HE.exe"
}

var logos = {
    0: null,
    1: "SuperViewer_Setup.bmp",
    2: "HackersEdition_Setup.bmp"
}

var disksets = {
    0: null,
    98: "HackTV_min.zip"
}

var viewer_stock_md5s = {
    "WebTVIntel--1.0.exe": "d7bde1adbe3549f58dd95425d3ac2af9",
    "WebTVIntel--1.1.exe": "ce7b6d1734b5e3d1cbd5f068609223d1",
    "WebTVIntel--2.5.exe": "4c5754bb8b69739b6f414c2d159051da", 
    "WebTVIntel--1.0-HE.exe": "391f303fd70034e69d3a50583de72c89",
    "WebTVIntel--2.5-HE.exe": "64edab977ec19a663c5842176bec306a"
}

/*
var modpacks = {
    0: {
        "name": "Background Sound",
        "description": "Enables the Viewer to continue playing sound when it is not the currently active window.",
        "file": "BackgroundSound.zip",
        "default": true
    }
}
*/

var modpacks = {};


var feature_bits = {
    2: {
        0: {
            "offset": 2063881,
            "name": "Background Sound",
            "description": "Enables the Viewer to continue playing sound when it is not the currently active window.",
            "value": Buffer.from("\x80", 'ascii')
        }
    },
    4: {
        0: {
            "offset": 2063881,
            "name": "Background Sound",
            "description": "Enables the Viewer to continue playing sound when it is not the currently active window.",
            "value": Buffer.from("\x80", 'ascii')
        }
    }
}



var patch_defaults = {
    "start_url": "client:GoToConn",
    "default_ip": "10.0.0.1"
}

var patch_limits = {
    "start_url": 26,
    "default_ip": 11,
}

function getPatchDataType(type, invert = false) {
    var patch_data = false;
    if ((type == "wtv-incarnation" && !invert) || (type == "wtv-encryption" && invert)) {
        patch_data = "wtv-client-serial-number: %s\r\n"
        patch_data += "wtv-user-requested-upgrade: %s\r\n";
        patch_data += "wtv-system-cpuprid: %s\r\n";
        patch_data += "wtv-system-version: %s\r\n";
        patch_data += "wtv-capability-flags: %s\r\n";
        patch_data += "wtv-client-bootrom-version: %s\r\n";
        patch_data += "wtv-need-upgrade: %s\r\n";
        patch_data += "wtv-used-8675309: %s\r\n";
        patch_data += "wtv-client-rom-type: %s\r\n";
        patch_data += "wtv-system-chipversion: %s\r\n";
        patch_data += "User-Agent: %s\r\n";
    }
    else if ((type == "wtv-encryption" && !invert) || (type == "wtv-incarnation" && invert) ) {
        patch_data = "wtv-tourist-enabled: %s\r\n";
        patch_data += "wtv-demo-enabled: %s\r\n";
        patch_data += "wtv-default-client-scriptprops: %s\r\n";
        patch_data += "wtv-default-client-useragent: %s\r\n";
        patch_data += "wtv-system-cpuspeed: %s\r\n";
        patch_data += "wtv-system-sysconfig: %s\r\n";
        patch_data += "wtv-my-disk-sucks-sucks-sucks: %s\r\n";
        patch_data += "wtv-disk-first-error: %s\r\n";
        patch_data += "wtv-disk-size: %s\r\n";
        patch_data += "wtv-client-address: %s\r\n";
        patch_data += "wtv-viewer: %s\r\n";
    }
    return patch_data;
}


function getResData(file) {
    var res_data = null;
    if (file.substr(-2, 2).toLowerCase() == "gz") {
        var res_gz_data = wtvshared.getServiceDep("/viewergen/" + file);
        res_data = zlib.gunzipSync(res_gz_data);
    } else {
        res_data = wtvshared.getServiceDep("/viewergen/" + file);
    }
    return res_data;
}

var patch_data = {
    "WebTVIntel--1.0.exe": {
        225: Buffer.from("\xD8", 'ascii'),
        273: Buffer.from("\x60", 'ascii'),
        332: Buffer.from("\x00\xAA", 'ascii'),
        568: Buffer.from("\x00\xA8", 'ascii'),
        577: Buffer.from("\xAA", 'ascii'),
        624: {
            length: 383,
            type: "wtv-incarnation"
        },
        132022: Buffer.from("\x68\xE8\x65\x5D\x00", 'ascii'), // patch pre-register pt1
        157861: Buffer.from("\x68\x70\x02\x40\x00", 'ascii'), // Prepare incarnation hack
        1016856: Buffer.from("\x68\xCC\x04\x5E\x00", 'ascii'),
        1074080: Buffer.from("\x68\xCC\x04\x5E\x00", 'ascii'),
        1263129: Buffer.from("\x68\x70\x6C\x5A\x00", 'ascii'), // Prepare encryption hack
        1919952: Buffer.from("scriptless-visit-reason\x00", 'ascii'), // patch pre-register pt2
        1919976: Buffer.from("10\x00", 'ascii'), // patch pre-register pt3
        1728624: {
            length: 398,
            type: "wtv-encryption"
        },
        1931552: Buffer.from(patch_defaults.default_ip + "\x00", 'ascii'), // patch default service address
        1960460: Buffer.from(patch_defaults.start_url + "\x00", 'ascii'), // patch startup url
        1960496: Buffer.from(patch_defaults.start_url + "\x00", 'ascii'), // patch startup url
        1967796: Buffer.from("\x00".repeat(41), 'ascii'), // remove unwanted headers
        1967856: Buffer.from("\x00".repeat(24), 'ascii'), // remove unwanted headers
        2003968: getResData("ResData--1.0.res.gz")
    },
    "WebTVIntel--1.0-HE.exe": {
        624: {
            length: 383,
            type: "wtv-incarnation"
        },
        1728624: {
            length: 398,
            type: "wtv-encryption"
        }
    },
    "WebTVIntel--1.1.exe": {
        209: Buffer.from("\xFA", 'ascii'),
        257: Buffer.from("\x90", 'ascii'),
        316: Buffer.from("\x00\xB6", 'ascii'),
        552: Buffer.from("\x00\xB4", 'ascii'),
        561: Buffer.from("\xB6", 'ascii'),
        620: {
            length: 383,
            type: "wtv-incarnation"
        },
        132118: Buffer.from("\x68\xE4\x75\x5D\x00", 'ascii'), // patch pre-register pt1
        157861: Buffer.from("\x68\xCC\x72\x5A\x00", 'ascii'), // Prepare encryption hack
        1015384: Buffer.from("\x68\xCC\x14\x5E\x00", 'ascii'),
        1073264: Buffer.from("\x68\xCC\x14\x5E\x00", 'ascii'),
        1264057: Buffer.from("\x68\x6C\x02\x40\x00", 'ascii'), // Prepare incarnation hack
        1730252: {
            length: 307,
            type: "wtv-encryption"
        },
        1921484: Buffer.from("scriptless-visit-reason\x00", 'ascii'), // patch pre-register pt2
        1921508: Buffer.from("10\x00", 'ascii'), // patch pre-register pt3
        1933064: Buffer.from(patch_defaults.default_ip + "\x00", 'ascii'), // patch default service address
        1962188: Buffer.from(patch_defaults.start_url + "\x00", 'ascii'), // patch startup url
        1962224: Buffer.from(patch_defaults.start_url + "\x00", 'ascii'), // patch startup url
        1969540: Buffer.from("\x00".repeat(84), 'ascii'), // remove unwanted headers
        2005504: getResData("ResData--1.1.res.gz")
    },

    "WebTVIntel--2.5.exe": {
        396: Buffer.from("\x00\x50", 'ascii'),
        720: {
            length: 3356,
            type: "wtv-encryption"
        },
        279771: Buffer.from("\x68\xB8\x04\x75\x00", 'ascii'), // patch pre-register pt1
        299023: Buffer.from("\x08", 'ascii'), // Change the call location from ecx+16 to ecx+15 to unlock the communication stream
        329666: Buffer.from("\x68\x82\x6C\x70\x00", 'ascii'), // Prepare incarnation hack
        1893931: Buffer.from("\x71", 'ascii'), // Unlock the wtv- url access from the address bar.
        2201731: Buffer.from("\x68\xD0\x02\x40\x00", 'ascii'), // Prepare encryption hack
        3173506: {
            length: 865,
            type: "wtv-incarnation"
        },
        3473396: Buffer.from("\x00", 'ascii'),
        3474616: Buffer.from("10\x00", 'ascii'), // patch pre-register pt3
        3746504: Buffer.from(patch_defaults.default_ip + "\x00", 'ascii'), // patch default service address
        3474628: Buffer.from("scriptless-visit-reason\x00", 'ascii'), // patch pre-register pt2
        3482832: Buffer.from("\x00".repeat(10), 'ascii'), // remove unwanted headers
        3808684: Buffer.from(patch_defaults.start_url + "\x00", 'ascii'), // patch startup url
        3808720: Buffer.from(patch_defaults.start_url + "\x00", 'ascii'), // patch startup url
        3808748: Buffer.from(patch_defaults.start_url + "\x00", 'ascii'), // patch startup url
        3826408: Buffer.from("\x00".repeat(66), 'ascii'), // remove unwanted headers
        3826356: Buffer.from("\x00".repeat(24), 'ascii'), // remove unwanted headers
        3940352: getResData("ResData--2.5.res.gz")
    },
    "WebTVIntel--2.5-HE.exe": {
        720: {
            length: 3356,
            type: "wtv-encryption"
        },
        3173506: {
            length: 865,
            type: "wtv-incarnation"
        }
    }
}

function getPatchData(fname, client_data_obj, start_url = "client:GoToConn", default_ip = "10.0.0.1") {
    var customized_patch_data = patch_data[fname];
    Object.keys(customized_patch_data).forEach(function (idx) {
        var val = customized_patch_data[idx];
        if (typeof val === 'string') {
            // start url override
            if (start_url != patch_defaults.start_url && start_url.length <= patch_limits.start_url) {
                if (val.substr(0, patch_defaults.start_url.length) == patch_defaults.start_url)
                    customized_patch_data[idx] = start_url + "\x00";
            }

            // default service ip override
            if (default_ip != patch_defaults.default_ip && default_ip.length <= patch_limits.default_ip) {
                if (val.substr(0, patch_defaults.default_ip.length) == patch_defaults.default_ip)
                    customized_patch_data[idx] = default_ip + "\x00";
            }
        } else {
            if (!val.byteLength) {
                // not a buffer object
                var block_length = val['length'];
                var patch_data = getPatchDataType(val['type'], (fname.substr(12, 3) != "1.1"));
                if (patch_data) {
                    var patch_data_array = patch_data.split("\r\n");
                    var patch_data_string = "";
                    Object.keys(patch_data_array).forEach(function (didx) {
                        var header_end = patch_data_array[didx].indexOf(":");
                        if (header_end) {
                            var patch_data_header = patch_data_array[didx].substr(0, header_end);
                            var client_value = client_data_obj[patch_data_header];
                            if (client_value)
                                patch_data_string += patch_data_array[didx].replace("%s", client_value) + "\r\n";
                        }
                    });
                }
                if (fname.substr(12, 3) != "2.5") {
                    var length_difference = block_length - patch_data_string.length;
                    if (length_difference > 0)
                        patch_data_string += "\x00".repeat(length_difference - (val['type'].length + 1));
                    patch_data_string += val['type'] + "\x00";
                } else {
                    patch_data_string += val['type'] + "\x00";
                    var length_difference = block_length - patch_data_string.length;
                    if (length_difference > 0)
                        patch_data_string += "\x00".repeat(length_difference);
                }
                customized_patch_data[idx] = Buffer.from(patch_data_string, 'ascii');
            }
        }
    })
    return customized_patch_data;
}

function applyPatch(data, patch_data, offset) {
    var data_length = patch_data.byteLength || patch_data.length;
    var data = data.fill(patch_data, offset, data_length + offset);
    return data;
}

function patchBinary(patchDataObject) {
    var patched_file = patchDataObject.data;
    Object.keys(patchDataObject.patch_data).forEach(function (idx) {
        idx = parseInt(idx);
        patched_file = applyPatch(patched_file, patchDataObject.patch_data[idx], idx);
    })
    return patched_file;
}


function generateSSID() {
    var ssid_template = "91xxxxxxaeb002";
    var ssid = ssid_template;
    while (ssid.indexOf("x") != -1) {
        // random hex char from 0-F
        ssid = ssid.replace("x", Math.floor(Math.random() * 16).toString(16))
    }    
    return ssid + wtvshared.getSSIDCRC(ssid);
}

function buildProfile(build) {
    var buildProfile = null;
    switch (build) {
        case 1235:
            buildProfile = {
                "wtv-system-version": build,
                "wtv-capability-flags": "1009c93bef",
                "wtv-client-bootrom-version": 105,
                "wtv-client-rom-type": "bf0app",
                "wtv-system-chipversion": 16842752,
                "User-Agent": "Mozilla/4.0 WebTV/1.4.2 (compatible; MSIE 3.0)",
                "wtv-system-cpuspeed": 112790760,
                "wtv-system-sysconfig": 736935823
            }
            break;

        case 7181:
            buildProfile = {
                "wtv-system-version": build,
                "wtv-capability-flags": "10935ffc8f",
                "wtv-client-bootrom-version": 2046,
                "wtv-client-rom-type": "US-LC2-disk-0MB-8MB",
                "wtv-system-chipversion": 51511296,
                "User-Agent": "Mozilla/4.0 WebTV/2.2.6.1 (compatible; MSIE 4.0)",
                "wtv-system-cpuspeed": 166187148,
                "wtv-system-sysconfig": 4163328,
                "wtv-disk-size": 8006
            }
            break;
			
		case 71810:
			buildProfile = {
			    "wtv-capability-flags": "d10094938ef",
				"wtv-system-version": 7181,
				"wtv-client-rom-type": "bf0app",
				"wtv-client-bootrom-version": 105,
				"wtv-system-chipversion": 16842752,
				"wtv-system-sysconfig": 736935823,
				"wtv-system-cpuspeed": 112790760,
				"User-Agent": "Mozilla/4.0 WebTV/2.5 (compatible; MSIE 4.0)",
			}
			break;
        case 16276:
            buildProfile = {
                "wtv-system-version": build,
                "wtv-capability-flags": "1fee0e1d9b1ffdef",
                "wtv-client-bootrom-version": 2046,
                "wtv-client-rom-type": "US-LC2-disk-0MB-8MB",
                "wtv-system-chipversion": 53608448,
                "User-Agent": "Mozilla/4.0 WebTV/2.8.2 (compatible; MSIE 4.0)",
                "wtv-system-cpuspeed": 166164662,
                "wtv-system-sysconfig": 3116068,
                "wtv-disk-size": 8006
            }
            break;
    }
    return buildProfile;
}

var enable_full_hacktv = false;
if (wtvshared.getServiceDep("/viewergen/" + "HackTV.zip", true)) {
    enable_full_hacktv = true;
    disksets['99'] = "HackTV.zip";
}

if (request_headers.query.viewer &&
    (request_headers.query.client_ssid || request_headers.query.random_ssid)) {
    var client_ssid = null;
    if (request_headers.query.client_ssid)
        client_ssid = request_headers.query.client_ssid;

    if (request_headers.query.random_ssid)
        client_ssid = generateSSID();

    var viewer_file = viewers[request_headers.query.viewer];
    var needs_hacktv_mini = (viewer_file === "WebTVIntel--2.5-HE.exe") ? true : false
    if (!viewer_file) {
        errpage = wtvshared.doErrorPage("500", null, socket.minisrv_pc_mode)
        headers = errpage[0];
        data = errpage[1];
    } else {
        var viewer_gz_data = wtvshared.getServiceDep("/viewergen/" + viewer_file + ".gz");
        var viewer_data = zlib.gunzipSync(viewer_gz_data);
        var viewer_md5 = crypto.createHash('md5').update(viewer_data).digest("hex");
        if (viewer_md5 != viewer_stock_md5s[viewer_file]) {
            console.error(viewer_file, "md5sum error. expected:", viewer_stock_md5s[viewer_file], ", got:", viewer_md5)
            errpage = wtvshared.doErrorPage("500", null, socket.minisrv_pc_mode)
            headers = errpage[0];
            data = errpage[1];
        } else {
            var build = request_headers.query.build;
            var client_data_obj = null
            
            if (build) {
                if (parseInt(build) > 0) {
                    client_data_obj = buildProfile(parseInt(build));
                }
            }
            // fallback
            if (!client_data_obj)
                client_data_obj = buildProfile(7181);

            var viewer_tag = viewer_file.split('.');
            viewer_tag.pop();
            client_data_obj['wtv-viewer'] = viewer_tag.join('.');
            client_data_obj["wtv-client-serial-number"] = client_ssid;
            var patchDataObject = {
                data: viewer_data,
                patch_data: getPatchData(viewer_file, client_data_obj)
            }
            
            if (!patchDataObject.patch_data) {
                errpage = wtvshared.doErrorPage("500", null, socket.minisrv_pc_mode)
                headers = errpage[0];
                data = errpage[1];
            } else {
                var patched_file = patchBinary(patchDataObject);
                var enabled_feature_bits = [];
                Object.keys(request_headers.query).forEach((k) => {
                    if (k.substring(0, 12) === "feature_bit_") {
                        enabled_feature_bits.push(parseInt(k.substring(12)));
                    }
                });
                Object.keys(enabled_feature_bits).forEach((k) => {
                    var bit = feature_bits[request_headers.query.viewer][enabled_feature_bits[k]];
                    if (bit) {
                        patched_file = applyPatch(patched_file, bit.value, bit.offset);
                    }
                });

                headers = `200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="${viewer_file.replace(".exe", ".zip")}"`
                var AdmZip = require("adm-zip");
                var zip = new AdmZip();

                zip.addZipComment("Viewer SSID: " + client_ssid);
                console.log(request_headers)
                update_str = "http://" + request_headers.host + request_headers.request_url.split('?')[0] + "?ssid=" + client_ssid;
                Object.keys(request_headers.query).forEach((k) => {
                    if (k != "random_ssid") {
                        update_str += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(request_headers.query[k]);
                    }
                });
                zip.addFile("update_url.txt", update_str);

                zip.addFile(viewer_file.replace("--", "-" + client_ssid + "-"), patched_file);
                if (!request_headers.query.viewer_only) {
                    var romset_zip = new AdmZip(wtvshared.getServiceDep("/viewergen/" + viewer_file.replace(".exe", "").replace("WebTVIntel", "AppData") + ".zip", true));
                    var zipEntries = romset_zip.getEntries();
                    zipEntries.forEach(function (zipEntry) {
                        if (zipEntry.entryName == "Setup.bmp" && request_headers.query.logo) {
                            var logo_file = logos[parseInt(request_headers.query.logo) || 0];
                            if (logo_file) {
                                var logo_gz_data = wtvshared.getServiceDep("/viewergen/" + logo_file + ".gz");
                                var logo_data = zlib.gunzipSync(logo_gz_data);
                                zip.addFile(zipEntry.entryName, logo_data);
                            } else {
                                zip.addFile(zipEntry.entryName, zipEntry.getData());
                            }
                        } else {
                            zip.addFile(zipEntry.entryName, zipEntry.getData());
                        }
                    });
                    if (request_headers.query.diskset || needs_hacktv_mini) {
                        var diskset_file = 0;
                        if (needs_hacktv_mini && request_headers.query.diskset === 0) diskset_file = disksets[98];
                        else diskset_file = disksets[parseInt(request_headers.query.diskset) || 0];
                        if (diskset_file) {
                            var diskset_zip = new AdmZip(wtvshared.getServiceDep("/viewergen/" + diskset_file, true));
                            var zipEntries = diskset_zip.getEntries();
                            zipEntries.forEach(function (zipEntry) {
                                zip.addFile("Disk/" + zipEntry.entryName, zipEntry.getData());
                            });
                        }
                    }

                    var embed_modpacks = [];
                    Object.keys(request_headers.query).forEach((k) => {
                        if (k.substring(0, 8) === "modpack_") {
                            embed_modpacks.push(parseInt(k.substring(8)));
                        }
                    });

                    if (embed_modpacks.length > 0) {
                        Object.keys(embed_modpacks).forEach((k) => {
                            var modpack_file = wtvshared.getServiceDep("/viewergen/" + modpacks[k].file, true);
                            if (fs.existsSync(modpack_file)) {
                                var modpack_zip = new AdmZip(modpack_file);
                                var zipEntries = modpack_zip.getEntries();
                                zipEntries.forEach(function (zipEntry) {
                                    zip.addFile(zipEntry.entryName, zipEntry.getData());
                                });
                            }
                        });
                    }
                }
                data = zip.toBuffer();
            }
        }
    }
    
} else {

    headers = `200 OK
Content-Type: text/html`

    data = `<html>
<head>
<title>zefie minisrv v${minisrv_config.version}</title>
<style type="Text/css">
table, td {
    border: 1px dotted;
}
td {
    padding: 5px;
    vertical-align: text-top;
}
</style>
</head>
<script>
window.onload = function() {
    updateFeatureBits();
}

function getSSIDCRC(ssid) {
    let crc = 0;
    var ssid = ssid.substr(0, 14);
    for (let i = 0; i < ssid.length; i += 2) {
        let inbyte = parseInt(ssid.substring(i, i+2), 16);
		for (let ii = 8; ii > 0; ii--) {
		    let mix = (crc ^ inbyte) & 0x01;
			crc >>= 1;
			if (mix != 0) crc ^= 0x8C;
			inbyte >>= 1;
		}

		if(isNaN(crc)) crc = 0;
    }

    var out = crc.toString(16);
    if (out.length == 1) return "0" + out;
    else return out;
}

function generateSSID() {
    var ssid_template = "91xxxxxxaeb002";
    var ssid = ssid_template;
    while (ssid.indexOf("x") != -1) {
        // random hex char from 0-F
        ssid = ssid.replace("x", Math.floor(Math.random() * 16).toString(16))
    }    
    document.getElementById('client_ssid').value = ssid + getSSIDCRC(ssid);
}

function validateForm() {
    var ssidForm = document.getElementById('client_ssid');
    if (document.getElementById('random_ssid').checked) {
        document.getElementById('viewergen').submit();
    } else {
        if (validateSSID(ssidForm.value)) {
            document.getElementById('viewergen').submit();
        }
    }
}

function updateFeatureBits() {
    var feature_bit_html = document.getElementById('feature_bits');
    var viewer_select = document.getElementById('viewer');
    var selected_viewer = parseInt(viewer_select[viewer_select.selectedIndex].value);
`;
    var bits = 0;
    Object.keys(feature_bits).forEach((k) => {
        data += `\t${(bits === 0) ? "if" : "else if"} (selected_viewer == parseInt(${k})) {\n`;
        data += `\t\tfeature_bit_html.innerHTML = "";\n`
        Object.keys(feature_bits[k]).forEach((j) => {
            data += `\t\tfeature_bit_html.innerHTML += "<input type=\\"checkbox\\" name=\\"feature_bit_${j}\\"${(feature_bits[k][j].default) ? "checked=checked" : ""}>${feature_bits[k][j].name}<br> &nbsp; &nbsp; &nbsp;<em>${feature_bits[k][j].description}</em><br>"\n`;
        });
        data += "\t}\n";
        bits++;
    });

    data += `    else {
        feature_bit_html.innerHTML = "None available";
    }
}


function validateSSID(ssid) {
    if (ssid.length != 16) {
        alert("Please choose a valid SSID and try again.");
        return false;
    }
    if ((ssid.substr(0,1) != "0" && ssid.substr(0,1) != "8" && ssid.substr(0,1) != "9") ||
        (ssid.substr(6,1) != "0") ||
        (ssid.substr(9,5) != "0b002")) {
        alert("Your SSID is not proper, but I'll allow it.")
    }
    return true;
}

function toggleRandomizer(cbox) {
    document.getElementById('client_ssid').disabled = cbox.checked;
    document.getElementById('generate_ssid').disabled = cbox.checked;
}

function toggleLogoOption(cbox) {
    document.getElementById('logo').disabled = cbox.checked;
    document.getElementById('diskset').disabled = cbox.checked;
}

</script>
<body bgcolor="#000000" text="#449944">
<p>
Welcome to the zefie minisrv v${minisrv_config.version} PC Services<Br>
<hr>
<form method="GET" id="viewergen">
<table>
<tr>
<td><strong>Viewer Version:</strong></td>
<td>
<select name="viewer" id="viewer" onchange="updateFeatureBits()">
<option value="0">WebTV Viewer v1.0 Build 146 (w/ B210 ROMs)</option>
<option value="1">WebTV Viewer v1.1 Build 220</option>
<option value="2">WebTV Viewer v2.5 Build 117</option>
<option value="3">WebTV Viewer v1.0 Build 210 (Hackers Edition)</option>
<option selected value="4">WebTV Viewer v2.5 Build 117 (Hackers Edition)</option>
</td>
</tr>
<tr>
<td><strong>SSID:</strong></td>
<td><input name="client_ssid" id="client_ssid" maxlength=16" value="91" disabled=disabled>
<input type="button" onclick="generateSSID()" id="generate_ssid" value="Randomize SSID" disabled=disabled/><br>
<em>Viewer clients should use SSIDs starting with <strong>91</strong>,<br>
unless you are intentionally trying to spoof a box.</em>
</td>
</tr>
<tr>
<td><strong>Startup Logo</strong></td>
<td><select name="logo" id="logo">
<option selected value="0">WebTV Viewer Default</option>
<option value="1">SuperViewer 4.0</option>
<option value="2">WebTV Viewer Hacker's Edition</option>
</td>
</tr>
<tr>
<td><strong>Disk Set</strong></td>
<td><select name="diskset" id="diskset">
<option selected value="0">WebTV Viewer Default</option>`;
    if (enable_full_hacktv)
        data += `<option value="99">MattMan69's HackTV (Full Content)</option>`;
    data += `
</select>
</td>
</tr>
<tr>
<td><strong>Build Spoof</strong></td>
<td><select name="build" id="build">
<option value="1235">Build 1235 (Old Classic)</option>
<option value="71810">Build 7181 (Old Classic)</option>
<option selected value="7181">Build 7181 (Old Plus)</option>
<option value="16276">Build 16276 (Old Plus)</option>
</select><br>
<em>This legacy option has little impact on minisrv servers,<br>
although certain advanced server operators may use these flags<br>
to determine what your "box" can do, and as such, may offer<br>
features that do not work in the Viewer, especially older ones</em>
</tr>
<tr>
<td><strong>Feature Bits</strong></td>
<td><div id="feature_bits">None available</div></td>
</tr>`;
    if (modpacks.length > 0) {
        data += `<tr>
<td><strong>Mod Packs</strong></td>
<td>`;

        Object.keys(modpacks).forEach((k) => {
            data += `<input type="checkbox" name="modpack_${k}"${(modpacks[k].default) ? " checked=checked" : ""}>${modpacks[k].name}<br> &nbsp; &nbsp; &nbsp;<em>${modpacks[k].description}</em><br>`
        })

        data += `</td>
</tr>`;
    }

data += `
<tr>
<td><strong>Other Flags</strong>:</td>
<td>
<input type="checkbox" name="random_ssid" id="random_ssid" onchange="toggleRandomizer(this)" checked=checked> Let the server choose the SSID (Ignores SSID above)<br>
<input type="checkbox" name="viewer_only" onchange="toggleLogoOption(this)"> Only include Viewer EXE, not ROM files or Logos (Advanced Users Only)
</td>
</tr>
<tr>
<tr>
<td colspan="2" style="text-align: right">
<br>
<input type="button" onclick="validateForm()" value="Get Modified WebTV Viewer">
</table>
</form>
</body>
</html>`;
}