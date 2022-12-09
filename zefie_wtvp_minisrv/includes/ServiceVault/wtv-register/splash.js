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
<meta http-equiv=Refresh content="4; url=wtv-register:/register?">
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
<tr><td width=150>
Mini service
<tr><td>
zefie minisrv v${minisrv_config.version}`;
if (minisrv_config.config.git_commit) data += " (git " + minisrv_config.config.git_commit + ")";
data += `
<tr><td>&rate;
</table>
</center>
</body>
</html>`;