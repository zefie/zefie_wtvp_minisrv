var minisrv_service_file = true;

headers = `200 OK
Connection: Close
wtv-connection-close: true
Content-type: text/html`

data = `<html>

<head>
<title>
Updating
</title>
<display switchtowebmode nostatus nooptions skipback clearback>

<meta http-equiv=Refresh content="270; url=client:poweroff?invalRAMImage">

</head>

<body onLoad="document.forms.invalram.submit()";
noscroll bgcolor="#191919" text="#42CC55" link="36d5ff"
hspace=0 vspace=0 fontsize="large">

<form name ="invalram" action="client:invalramimage">
</form>

<table cellspacing=0 cellpadding=0>
<tr>
<td width=104 height=74 valign=middle align=center bgcolor="3B3A4D">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<td width=20 valign=top align=left bgcolor="3B3A4D">
<img src="${service_name}:/ROMCache/Spacer.gif" width=1 height=1>
<td colspan=10 width=436 valign=middle align=left bgcolor="3B3A4D">
<font color="D6DFD0" size="+2">
<blackface>
<shadow>
<img src="${service_name}:/ROMCache/Spacer.gif" width=1 height=4>
<br>
Updating complete
</shadow>
</blackface>
</font>
<tr>
<td colspan=12 width=560 height=10 valign=top align=left>
<img src="${service_name}:/ROMCache/S40H1.gif" width=560 height=6>
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
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 width=100 height=258 valign=top align=left>
<font size=+1>
The update is complete.<br>
<p><font size=+1>Choose <b>Connect Now</b> if you<br>want to connect to ${minisrv_config.config.service_name}.
	<p><font size=+1>Press the <b>power</b> button to switch<br>off your unit.
</font>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="${service_name}:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 height=1 valign=top align=left>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=top align=left bgcolor="0D0D0D">
<img src="${service_name}:/ROMCache/Spacer.gif" width=436 height=1>
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

<form action="client:poweroff">
<input selected type=submit value="Connect Now" name="UseUpgradeNow"
  borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=170>
<input type="hidden" name="invalRAMImage">
<input type="hidden" name="autoPowerOn">
</shadow>
</font>
</form>

</table>
<td width=20 valign=middle align=center>
</table>
</body>
</html>`