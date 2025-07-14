var minisrv_service_file = true;
//GET wtv-disk:/content/DownloadScreen.tmpl?diskmap=Demo&group=Demo

headers = `200 OK
Content-Type: text/html
wtv-expire: wtv-disk:/content/DownloadScreen.tmpl`
var content_dir = "content/"
var diskmap_dir = content_dir + "diskmaps/";
var diskmap = request_headers.query[wtvshared.getCaseInsensitiveKey("DiskMap", request_headers.query)];
var diskmap_json_file = null;
Object.keys(service_vaults).forEach(function (g) {
	if (diskmap_json_file != null) return;
	diskmap_json_file = service_vaults[g] + "/" + service_name + "/" + diskmap_dir + diskmap + ".json";
	if (!fs.existsSync(diskmap_json_file)) diskmap_json_file = null;
});
var diskmap_data = JSON.parse(fs.readFileSync(diskmap_json_file).toString());
if (!diskmap_data[request_headers.query.group]) {
	throw ("Invalid diskmap data (group does not match)");
}
diskmap_data = diskmap_data[request_headers.query.group];
var message = request_headers.query.message || diskmap_data.message || "Retrieving files...";
var main_message = request_headers.query.main_message || diskmap_data.main_message || "Your receiver is downloading files.";
var success_url = request_headers.query.success_url || diskmap_data.success_url || null;
var fail_url = request_headers.query.fail_url || diskmap_data.fail_url || null;

if (success_url === null) success_url = new clientShowAlert({
	'image': this.minisrv_config.config.service_logo,
	'message': "Download successful!",
	'buttonlabel1': "Okay",
	'buttonaction1': "client:goback",
	'noback': true,
}).getURL();

if (fail_url === null) fail_url = new clientShowAlert({
	'image': this.minisrv_config.config.service_logo,
	'message': "Download failed...",
	'buttonlabel1': "Okay",
	'buttonaction1': "client:goback",
	'noback': true,
}).getURL();

data = `<html>
<head>

	<meta 
		http-equiv=refresh 
		content="0;url=client:Fetch?source=wtv-disk:/sync`;
if (request_headers.query.diskmap) data += `%3fdiskmap%3d${request_headers.query.diskmap}`;
if (!request_headers.query.group) data += `&root=file://Disk/Browser/`;
else data += `&group=${request_headers.query.group}`;
data += `&message=Retrieving Files..."
	>
	<display downloadsuccess="${success_url}" downloadfail="${fail_url}">
	<title>Retrieving Files</title>
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
					Retrieving Files
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
				Your ${wtvshared.getBoxName(session_data.get("wtv-client-rom-type"))} is retrieving some files.
				<p>This usually takes a while.
			</font>
	<tr>
		<td colspan=2>
		<td>
			<br><br>
			<font color=white>
			<progressindicator name="downloadprogress" 
			   message="Retrieving Files..." 
			   height=40 width=250>
			</font>
</table>
</body>
</html>`;