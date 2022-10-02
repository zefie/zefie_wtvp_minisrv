var minisrv_service_file = true;
const crypto = require('crypto')


var viewer = 2 // debug override

var viewers = {
    0: "WebTVIntel--1.0.exe",
    1: "WebTVIntel--1.1.exe",
    2: "WebTVIntel--2.5.exe"
}

var viewer_stock_md5s = {
    "WebTVIntel--1.0.exe": "d7bde1adbe3549f58dd95425d3ac2af9",
    "WebTVIntel--1.1.exe": "ce7b6d1734b5e3d1cbd5f068609223d1",
    "WebTVIntel--2.5.exe": "4c5754bb8b69739b6f414c2d159051da"
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
        patch_data += "wtv-need-upgrade: %s\n";
        patch_data += "wtv-used-8675309: %s\n";
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
    }
    return patch_data;
}


function getResData(file) {
    var res_data = null;
    if (file.substr(-2, 2).toLowerCase() == "gz") {
        var res_gz_data = fs.readFileSync(cwd + "/viewers/" + file);
        res_data = zlib.gunzipSync(res_gz_data);
    } else {
        res_data = fs.readFileSync(cwd + "/viewers/" + file);
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
                var patch_data = getPatchDataType(val['type'], (fname == "WebTVIntel--2.5.exe"));
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
                patch_data_string += val['type'];
                var length_difference = block_length - patch_data_string.length;
                if (length_difference > 0)
                    patch_data_string += "\x00".repeat(length_difference);
                customized_patch_data[idx] = Buffer.from(patch_data_string, 'ascii');
            }
        }
    })
    return customized_patch_data;
}

function patchBinary(patchDataObject) {
    Object.keys(patchDataObject.patch_data).forEach(function (idx) {
        idx = parseInt(idx);
        data_length = patchDataObject.patch_data[idx].byteLength || patchDataObject.patch_data[idx].length
        patchDataObject.data.fill(patchDataObject.patch_data[idx], idx, data_length + idx);
    })
    return patchDataObject.data;
}

if (request_headers.query.viewer &&
    request_headers.query.client_ssid) {
    var viewer_file = viewers[request_headers.query.viewer];
    if (!viewer_file) {
        errpage = wtvshared.doErrorPage("500", null, socket.minisrv_pc_mode)
        headers = errpage[0];
        data = errpage[1];
    } else {
        var viewer_gz_data = fs.readFileSync(cwd + "/viewers/" + viewer_file + ".gz");
        var viewer_data = zlib.gunzipSync(viewer_gz_data);
        var viewer_md5 = crypto.createHash('md5').update(viewer_data).digest("hex");
        if (viewer_md5 != viewer_stock_md5s[viewer_file]) {
            console.log(viewer_file, "md5sum error. expected:", viewer_stock_md5s[viewer_file], ", got:", viewer_md5)
            errpage = wtvshared.doErrorPage("500", null, socket.minisrv_pc_mode)
            headers = errpage[0];
            data = errpage[1];
        } else {
            var client_data_obj = {
                "wtv-client-serial-number": request_headers.query.client_ssid,
                "wtv-system-version": 16276,
                "wtv-capability-flags": "1fee0e1d9b1ffdef",
                "wtv-client-bootrom-version": 2046,
                "wtv-client-rom-type": "US-LC2-disk-0MB-8MB",
                "wtv-system-chipversion": 53608448,
                "User-Agent": "Mozilla/4.0 WebTV/2.8.2 (compatible; MSIE 4.0)",
                "wtv-system-cpuspeed": 166164662,
                "wtv-system-sysconfig": 3116068,
                "wtv-disk-size": 8006
            }
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
                headers = `200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="${viewer_file.replace(".exe", ".zip")}"`
                var AdmZip = require("adm-zip");
                var zip = new AdmZip();
                zip.addFile(viewer_file, patched_file, "SSID: " + request_headers.query.client_ssid);
                if (!request_headers.query.viewer_only) {
                    var data_zip = new AdmZip(cwd + "/viewers/" + viewer_file.replace(".exe", "").replace("WebTVIntel", "AppData") + ".zip");
                    var zipEntries = data_zip.getEntries();
                    zipEntries.forEach(function (zipEntry) {
                        if (zipEntry.entryName == "Setup.bmp" && request_headers.query.superviewer_logo) {
                            var logo_gz_data = fs.readFileSync(cwd + "/viewers/SuperViewer_Setup.bmp.gz");
                            var logo_data = zlib.gunzipSync(logo_gz_data);
                            zip.addFile(zipEntry.entryName, logo_data);
                        } else {
                            zip.addFile(zipEntry.entryName, zipEntry.getData());
                        }
                    });
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
function generateSSID() {
    var ssidForm = document.getElementById('client_ssid');
    var ssid_template = "91xxxY0xx0b002xx";
    var ssid = ssid_template;
    while (ssid.indexOf("x") != -1) {
        ssid = ssid.replace("x",Math.floor(Math.random() * 16).toString(16))
    }
    ssid = ssid.replace("Y", Math.floor(Math.random() * 7));
    ssidForm.value = ssid;
}

function validateForm() {
    var ssidForm = document.getElementById('client_ssid');
    if (validateSSID(ssidForm.value)) {
        var mainForm = document.getElementById('viewergen');
        mainForm.submit();
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
<select name="viewer">
<option value="0">WebTV Viewer v1.0 Build 146 (w/ B210 ROMs)</option>
<option value="1">WebTV Viewer v1.1 Build 220</option>
<option selected value="2">WebTV Viewer v2.5 Build 117</option>
</td>
</tr>
<tr>
<td><strong>SSID:</strong></td>
<td><input name="client_ssid" id="client_ssid" maxlength=16" value="91">
<input type="button" onclick="generateSSID()" value="Randomize SSID" /><br>
<em>Viewer clients should use SSIDs starting with <strong>91</strong>,<br>
unless you are intentionally trying to spoof a box.</em>
</td>
</tr>
<tr>
<td><strong>Other Flags</strong>:</td>
<td>
<input type="checkbox" name="superviewer_logo" checked="checked"> Replace WebTV Viewer Startup Logo with "SuperViewer 4.0" Logo<br>
<input type="checkbox" name="viewer_only"> Only include Viewer EXE, not ROM files or Logos
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