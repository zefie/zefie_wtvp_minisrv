const minisrv_service_file = true;

headers = `200 OK
Content-Type: text/html`

data = `<html>
<head>
<title>zefie minisrv v${minisrv_config.version}</title>
</head>
<body bgcolor="#000000" text="#449944">
<p>
Welcome to the zefie minisrv v${minisrv_config.version} PC Services
</p>
<hr>
<a href="/viewergen/">WebTV Viewer Generator</a><br>
<a href="mamessidgen.html">MAME SSID Generator</a><br>
<a href="anigen.html">wtv-1800 login generator</a><br>
</p>
</body>
</html>`;