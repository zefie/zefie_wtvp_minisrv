data = `
<html>
<head>
<title>Your e-mail address</title>
<display
noscroll
showwhencomplete
>
</head>
<body hspace=0 vspace=0
text='E6E6E6' link='E6E6E6' vlink='E6E6E6'
fontsize='medium'
bgcolor=00292f
>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=560 height=96 valign=top>
<table background="wtv-guide:/ROMCache/help/common/helpMastheadBlank.swf" width=560 height=96 cellspacing=0 cellpadding=0>
<tr>
<td width=107 height=96 valign=top rowspan=2>
<spacer type=vertical height=7><br>
<spacer type=horizontal width=7>
<a href='wtv-home:/home'>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</a>
<td width=453 valign=top>
<spacer type=vertical height=54><br>
<font size=+3><blackface>
Your e-mail address&nbsp;
</blackface></font>
<tr>
<td align=right>
&nbsp;
</table>
<tr>
<td width=560 valign=top height=225>
<table cellpadding=0 cellspacing=0 width=560>
<tr>
<td width=25 height=17>
<td width=535>
<tr>
<td>
<td height=225 rowspan=2 valign=top>
<table cellpadding=0 cellspacing=0 height=225 width=535>
<tr>
<td height=15>
<tr>
<td>
<td valign=top>
This is your e-mail address:
<p>
<spacer type=horizontal width=20><b>${ssid_sessions[socket.ssid].getSessionData("subscriber_username")}@WebTV</b>
<p>
If you want to begin using a different e-mail address,
you can add a new user and give it the
name you want.
To add a new user now, choose this link:
<spacer type=vertical height=12><br>
<table bgcolor=001316 cellpadding=0 cellspacing=8 href="wtv-setup:/accounts">
<tr>
<td height=20><font color=4B7136>
<b>&#128;
<td>
<font color=4B7136><b>Users setup
<td>&nbsp;
</table>

<tr>
<td width=35>
<td width=450>
<td width=50>
</table>
</table>
<tr>
<td valign=bottom align=right>
<form>
<font color=ffcf69><shadow>
<input type=button usestyle borderimage="file://ROM/Borders/ButtonBorder2.bif"`; 
if (request_headers.query.directLink === "true")
	data += "action=javascript:location=history.go(-1);"
else
	data += "action=javascript:location=history.go(-2);"
data += `
value="Done"
width='110'
selected>
<spacer type=horizontal width=20>
</shadow></font>
</form>
</table>
</body>
`; 