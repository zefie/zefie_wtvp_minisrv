var minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<html>
<head>
<display hideoptions nostatus showwhencomplete skipback clearback fontsize=medium>
<title>Engaging zefie...</title>
<meta http-equiv=Refresh content="4; url=wtv-home:/home?">
</head>
<body bgcolor="#000000" text="#449944">
<bgsound src="file://ROM/Sounds/Splash.mid">
<center>
<spacer type=block height=88 width=21>
<img src="file://ROM/Images/spacer.gif" height=4><br>
<img src="${minisrv_config.config.service_splash_logo}">
<br><br><br>
<p><br>
<p><br>
<table border>
<tr><td>
${minisrv_config.config.service_name} Mini Service hosted by ${minisrv_config.config.service_owner}
<tr><td>
minisrv v${minisrv_config.version} ${(minisrv_config.config.git_commit) ? '(git '+minisrv_config.config.git_commit+')' : ''}
<tr><td>Connected: &rate;
</table>
</center>
</body>
</html>`;