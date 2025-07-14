var minisrv_service_file = true;
//GET wtv-disk:/content/DownloadScreen.tmpl?diskmap=Demo&group=Demo

headers = `200 OK
Content-Type: text/html
wtv-expire: wtv-disk:/content/DownloadScreen.tmpl`

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
	<display downloadsuccess=client:goback downloadfail=client:goback>
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