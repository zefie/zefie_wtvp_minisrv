var minisrv_service_file = true;

var notImplementedAlert = new clientShowAlert({
	'image': minisrv_config.config.service_logo,
	'message': "This feature is not available.",
	'buttonlabel1': "Okay",
	'buttonaction1': "client:donothing",
	'noback': true,
}).getURL();

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<HTML>
<HEAD>
<meta http-equiv="reply-type" content="charset=iso-2022">
<TITLE>
Settings
</TITLE>
<DISPLAY >
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR=452a36>
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="file://ROM/Cache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=92 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=6>
<tr><td absheight=5 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor=2e1e26>
<img src="file://ROM/Cache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor=6b4657>
<spacer type=block width=1 height=1>
</table>
<tr><td absheight=132>
<tr><td absheight=166 align=right colspan=3>
<img src="ROMCache/SettingsBanner.gif" width=54 height=166>
<tr><td absheight=41>
</table>
</sidebar>
<BODY BGCOLOR="#191919" TEXT="#42CC55" LINK="36d5ff" VLINK="36d5ff" FONTSIZE="small" hspace=0 vspace=0>

<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<shadow><blackface><font color="e7ce4a" font size="5">
Settings
for ${session_data.getSessionData("subscriber_username") || "You"}
</font><blackface><shadow>
</table>
<tr>
<TD>
<td colspan=4 height=2 valign=middle align=center bgcolor="2B2B2B">
<spacer type=block width=436 height=1>
<tr>
<TD>
<td colspan=4 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=4 height=2 valign=top align=left bgcolor="0D0D0D">
<spacer type=block width=436 height=1>
<td abswidth=20>
<tr>

<table cellspacing=0 cellpadding=2>
<br><br>
  <tr>
    <td width=20>&nbsp;</td>
    <td width=160><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/mail"><font size=2>Mail</a></td>
    <td width=220><font size=2>Signature <strike>and more</strike></td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/edit-password"><font size=2>Password</a></td>
    <td><font size=2>Change your password</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/screen"><font size=2>Television</a></td>
    <td><font size=2>Options for your TV</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/text"><font size=2>Text size</a></td>
    <td><font size=2>Make text bigger or smaller</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/sound"><font size=2>Music</a></td>
    <td><font size=2>Play background songs</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="${notImplementedAlert}"><font size=2><strike>Printing</strike></a></td>
    <td><strike><font size=2>Change how you print</strike></td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/keyboard"><font size=2>Keyboard</a></td>
    <td><font size=2>Choose an on-screen keyboard</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/accounts"><font size=2>Extra Users</a></td>
    <td><font size=2>Add, change, or remove users</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td> 
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/messenger"><font size=2>Messenger</a></td>
    <td><font size=2>Configure Messenger</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/phone"><font size=2>Dialing</a></td>
    <td><font size=2>Connecting to WebTV</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/region"><font size=2>Region Settings</a></td>
    <td><font size=2>Change timezone and  zip code</td>
  </tr>
  <tr>
    <td width=20>&nbsp;</td>
    <td><img src="ROMCache/BulletArrow.gif" width=6 height=6 valign=absmiddle>
<a href="wtv-setup:/tweaks"><font size=2>Tweaks</a></td>
    <td><font size=2>minisrv specific settings</td>
  </tr>
</table>

<table width=100%>
<tr><td align=right>
<spacer type=block width=436 height=4>
<FORM action="wtv-home:/home" selected>
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" Value=Done NAME="Done" USESTYLE WIDTH=103>&nbsp;&nbsp;&nbsp;
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>


`;