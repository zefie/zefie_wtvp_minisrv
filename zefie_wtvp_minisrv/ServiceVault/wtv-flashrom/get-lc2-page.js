// todo, actual file logic
// - ready query param to get flashrom path, check for its existance
// - handle last part to redirect to lc2-download-complete
// - handle failures

headers = `200 OK
Content-type: text/html`

data = `<html>
<head>
<title>
Updating
</title>
<display switchtowebmode transition=none nostatus nooptions skipback clearback>
</head>
<body noscroll bgcolor="#191919" text="#42CC55" link="36d5ff"
hspace=0 vspace=0 fontsize="large">
<table cellspacing=0 cellpadding=0>
<tr>
<td width=104 height=74 valign=middle align=center bgcolor="3B3A4D">
<td width=20 valign=top align=left bgcolor="3B3A4D">
<td colspan=10 width=436 valign=middle align=left bgcolor="3B3A4D">
<font color="D6DFD0" size="+2">
<blackface>
<shadow>
<br>
Updating now...
</shadow>
</blackface>
</font>
<tr>
<td colspan=12 width=560 height=10 valign=top align=left>
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
<form action="client:poweroff">
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 width=100 height=258 valign=top align=left>
<font size=+1>
Your Internet Receiver is being<br>updated automatically.
<p> <font size=+1>
This will take a while, and then<br> your unit will reboot.<br><br>
`;

if (flashrom_isboot && flashrom_part == 16) {
data += `<p>
	The system will pause for about 30 seconds at the end of this
	update.  Please <strong>do not</strong> interrupt the system
	during this time.
	`
}
data += `</font>
</table>
<table width="100%">
<tr>
<td align="left"><font size="-1" color="#D6DFD0"><small>&nbsp; &nbsp; Receiving part ${flashrom_part} of ${flashrom_total_parts}</small></font></td>
<td align="right"><font size="-1" color="#D6DFD0"><small>v${flashrom_version} (${flashrom_type}) &nbsp; &nbsp;</small></font></td>
</tr>
</table>
<center>
<upgradeblock width=520 height=15
${nextrompath}
errorurl="wtv-flashrom:/lc2-download-failed"
blockurl="wtv-flashrom:/${flashrom_rompath}
lastblock=${flashrom_lastpart}
curblock="${flashrom_part}"
totalblocks="${flashrom_total_parts}"></center>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=middle align=center bgcolor="#191919">
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=9 height=1 valign=top align=left>
<tr>
<td width=104 valign=middle align=center>
<td width=20 valign=middle align=center>
<td colspan=10 height=2 valign=top align=left bgcolor="#191919">
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
<font size="-1" color="#191919">
</font>
</form>
</table>
<td width=20 valign=middle align=center>
</table>
</body>
</html>`