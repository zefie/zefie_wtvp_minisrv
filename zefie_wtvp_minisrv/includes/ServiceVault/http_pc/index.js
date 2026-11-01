const minisrv_service_file = true;

const title = minisrv_config.config.hide_minisrv_version ? "zefie's minisrv PC Services" : `zefie minisrv v${minisrv_config.version} PC Services`;

headers = `200 OK
Content-Type: text/html`

data = `<html>
<head>
<title>${title}</title>
</head>
<body bgcolor="#000000" text="#449944">
<p>
Welcome to ${title}
</p>
<hr>
<a href="/viewergen/">WebTV Viewer Generator</a><br>
<a href="mamessidgen.html">MAME SSID Generator</a><br>
<a href="anigen.html">wtv-1800 login generator</a><br>
</p>
</body>
</html>`;