headers = `200 OK
Content-type: text/html`;

data = `<html>
<head>
<title>
Access Denied
</title>
<display nostatus nooptions switchtowebmode nohome>
</head>
<body noscroll bgcolor="#191919" text="#42CC55" link="36d5ff"
hspace=0 vspace=0 fontsize="large"
>
<table cellspacing=0 cellpadding=0^C>
<tr>
<td width=104 height=74 valign=middle align=center bgcolor="3B3A4D">
<img src="file://ROM/Cache/WebTVLogoJewel.gif" width=86 height=64>
<td width=20 valign=top align=left bgcolor="3B3A4D">
<img src="ROMCache/Spacer.gif"
width=1 height=1>
<td colspan=10 width=436 valign=middle align=left bgcolor="3B3A4D">
<font color="D6DFD0" size="+2">
<blackface>
<shadow>
<img src="ROMCache/Spacer.gif"
width=1 height=4>
<br>
Access Denied
</shadow>
</blackface>
</font>
<tr>
<td colspan=12 width=560 height=10 valign=top align=left>
<img src="ROMCache/Shadow.gif" width=560 height=6>
<tr>
<td width=104 height=10 valign=top align=left>
<td width=20 valign=top align=left>
<td width=67 valign=top align=left>
<td width=20 valign=top align=left>
<td width=67 valign=top align=left>
<td width=20 valign=top align=left>
<td width=67 valign=top align=left>
<td width=20 valign=top align=left>
<td width=67 valign=top align=left>
<td width=20 valign=top align=left>
<td width=68 valign=top align=left>
<td width=20 valign=top align=left>
<form action="client:poweroff"
>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 width=100 height=258 valign=top align=left>
<font size=-1>You are not authorized to use this service. <p>Reason: ${ssid_sessions[socket.ssid].lockdownReason}</font>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 height=1 valign=top align=left>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=top align=left bgcolor="0D0D0D">
<img src="ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 height=4 valign=top align=left>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 width=416 valign=top align=left>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=306 valign=top align=left>
<font size="-1"><i>
</i></font><td width=112 valign=top align=right>
<font size="-1" color="#E7CE4A">
<shadow>
<input selected
name="Power Off"
value="Power Off"
type=submit Value=Continue name="Continue" borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=110>
</shadow>
</font>
</form>
</table>
<td width=20 valign=middle align=center>
</table>
</body>
</html>`;
