var minisrv_service_file = true;

headers = `200 OK
Content-type: text/html
wtv-expire-all: wtv-`

data = `<html>
<DISPLAY SWITCHTOWEBMODE>
<head>
<title>${minisrv_config.config.service_name} Unavailable</title>
<display noscroll nooptions nologo hspace=0 vspace=0>
</head>
<body background="wtv-star:/ROMCache/MessageGradient.gif" bgcolor="000000" text="F5C74A" fontsize="large">
<table cellspacing=0 cellpadding=0>
<tr>
<td rowspan=2 width=184 valign=top align=left>
<img src="wtv-star:/ROMCache/Spacer.gif" width=184 height=63><br>
<img src="wtv-star:/ROMCache/Spacer.gif" width=21>
<img src="${minisrv_config.config.service_logo}">
<td rowspan=2 width=40 valign=top align=left bgcolor=000000>
<img src="wtv-star:/ROMCache/Spacer.gif" width=1 height=1>
<td width=296 height=108 valign=top align=left bgcolor=000000>
<img src="wtv-star:/ROMCache/Spacer.gif" width=1 height=1>
<td rowspan=2 width=40 valign=top align=left bgcolor=000000>
<img src="wtv-star:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=2 width=184 height=312 valign=top align=left bgcolor=000000>
<font size="+1">
<b>
The ${minisrv_config.config.service_name} Network is temporarily unavailable.
</b>
<p>
Please try connecting later.`