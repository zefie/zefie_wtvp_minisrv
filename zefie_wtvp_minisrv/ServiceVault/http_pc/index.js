headers = `200 OK
Content-Type: text/html`

var splash_logo = minisrv_config.config.service_splash_logo;
if (splash_logo.substring(0, 4) == "file") splash_logo = "wtv-star:/ROMCache/splash_logo_hacktv.gif";

data = `<html>
<head>
<display hideoptions nostatus showwhencomplete skipback clearback fontsize=medium>
<title>zefie minisrv ${minisrv_config.version}</title>
<meta http-equiv=Refresh content="4; url=wtv-home:/home?">
</head>
<body bgcolor="#000000" text="#449944">
<center>
<spacer type=block height=88 width=21>
<img src="/get?url=${escape('wtv-star:/ROMCache/spacer.gif')}" height=4><br>
<img src="/get?url=${escape(splash_logo)}">
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
</table>
</center>
</body>
</html>`;