var minisrv_service_file = true;
var settings_obj = ssid_sessions[socket.ssid].getSessionData("wtv-setup");
if (settings_obj === null) settings_obj = {};

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<HTML>
<HEAD>
<TITLE>
Keyboard settings
</TITLE>
<DISPLAY noscroll nologo>
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR=452a36>
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="file://ROM/Cache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=92 absheight=76>
<table absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=6>
<tr><td absheight=5 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor=2e1e26>
<spacer>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor=6b4657>
<spacer>
</table>
<tr><td absheight=132>
<tr><td absheight=166 align=right colspan=3>
<img src="ROMCache/SettingsBanner.gif" width=54 height=166>
<tr><td absheight=41>
</table>
</sidebar>
<BODY BGCOLOR="#191919" TEXT="#42CC55" LINK="189CD6" VLINK="189CD6" HSPACE=0 VSPACE=0 FONTSIZE="large"
>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<font size="+2" color="E7CE4A"><blackface><shadow>
Keyboard
</table>
<td abswidth=20>
<tr>
<TD>
<td colspan=3 height=2 valign=middle align=center bgcolor="2B2B2B">
<spacer type=block width=436 height=1>
<tr>
<TD>
<td colspan=3 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=3 height=2 valign=top align=left bgcolor="0D0D0D">
<spacer type=block width=436 height=1>
<td abswidth=20>
<tr><td colspan=4 height=8></td></tr>
<TR>
<td>
<td WIDTH=198 HEIGHT=238 VALIGN=top ALIGN=left>
<table cellspacing=0 cellpadding=0>
<tr>
<td absheight=195 valign=top>
Choose the kind of 
keyboard that should 
appear on your screen.
</table>
<form action="client:SetSetupValue">
<input type=hidden name=autosubmit value=true autosubmit=onleave>
<input type="hidden" name="kbsetting" id=kbsetting value="&kbd;">
<TD WIDTH=20>
<TD WIDTH=198 VALIGN=top ALIGN=left>
<table cellspacing=0 cellpadding=0>
<tr>
<td align=left>
<p>
<INPUT TYPE="radio" id="alphabetical" NAME="setup-keyboard" VALUE="alphabetical">
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=1 HEIGHT=1> Alphabetical<BR>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=29 HEIGHT=1>
<IMG SRC="wtv-setup:/ROMCache/kb_alpha.gif" WIDTH=144 HEIGHT=22>
<BR>
<BR>
`;
if (settings_obj['setup-keyboard'] == "standard") {
    data += '<INPUT TYPE="radio" id="standard" NAME="setup-keyboard" VALUE="standard" selected>';
} else {
    data += '<INPUT TYPE="radio" id="standard" NAME="setup-keyboard" VALUE="standard">';
}
data += `
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=1 HEIGHT=1> Traditional<BR>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=29 HEIGHT=1>
<IMG SRC="wtv-setup:/ROMCache/kb.gif" WIDTH=144 HEIGHT=22>
</table>
</form>
<script>

var kbvalue = document.forms[0].kbsetting.value
if (kbvalue == "alphabetical") {
 document.forms[0].alphabetical.checked = true
} else {
 document.forms[0].standard.checked = true
}
</script>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=0 VALIGN=top ALIGN=left>
<tr>
<TD>
<td colspan=3 height=2 valign=middle align=center bgcolor="2B2B2B">
<spacer type=block width=436 height=1>
<tr>
<TD>
<td colspan=4 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=3 height=2 valign=top align=left bgcolor="0D0D0D">
<spacer type=block width=436 height=1>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<TR>
<TD>
<TD COLSPAN=2 VALIGN=top ALIGN=left>
<TD VALIGN=top ALIGN=right>
<FORM action="client:goback">
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" Value=Done NAME="Done" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>


`;