const minisrv_service_file = true;
const canDoMuzac = session_data.hasCap('client-can-do-muzac');

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<!--- *=* Copyright 1996, 1997 WebTV Networks, Inc. All rights reserved. --->
<HTML>
<HEAD>
<TITLE>
Music
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
<BODY NOHTILEBG BGCOLOR="#191919" TEXT="#42CC55" LINK="36d5ff" VLINK="36d5ff" HSPACE=0 VSPACE=0 FONTSIZE="large"
>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<font size="+2" color="E7CE4A"><blackface><shadow>
Music
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
<TR>
<td>
<td WIDTH=198 HEIGHT=236 VALIGN=top ALIGN=left>
<spacer type=block height=2 width=1>
`;
if (canDoMuzac) {
    data += `<p>Turn on background music 
to have songs play continually in 
the background.<p>Remember to adjust the 
volume on your TV so you can 
hear the music.
<TD WIDTH=20>
<TD WIDTH=198 VALIGN=top ALIGN=left>
<spacer type=block height=16 width=1>
<form>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=top>
Background music<p>
<input type=hidden name=autosubmit value=true autosubmit=onleave>
<INPUT TYPE="checkbox" NAME="setup-play-bgm" VALUE="1"
action="client:SetSetupValue" selected &wtv-muzac-on;${canDoMuzac ? '' : 'disabled'}>
<INPUT TYPE="hidden" NAME="current_volume" ID="current_volume" value="&vol;">

<tr><td absheight=38>

<tr>
<td>
<p>
BGM Volume
<p>
<INPUT TYPE="radio" ID="vol_soft" NAME="setup-bgm-volume" VALUE="soft" action="client:SetSetupValue">&nbsp;Soft<br> 
<INPUT TYPE="radio" ID="vol_medium" NAME="setup-bgm-volume" VALUE="medium" action="client:SetSetupValue">&nbsp;Medium<br> 
<INPUT TYPE="radio" ID="vol_loud" NAME="setup-bgm-volume" VALUE="loud" action="client:SetSetupValue">&nbsp;Loud
<script type="text/javascript">
var volume=document.forms[0].current_volume.value
var radio = null;
if (volume == "soft") {
	radio = document.forms[0]['setup-bgm-volume'][0];
} else if (volume == "medium") {
	radio = document.forms[0]['setup-bgm-volume'][1];
} else if (volume == "loud") {
	radio = document.forms[0]['setup-bgm-volume'][2];
}

if (radio) {
	radio.checked = true;
}
</script>
</td>
`;
} else {
    data += `<p>Your client reports it does
not support background music.
<p>However, you can still browse,
and listen to the music in the foreground.
<TD WIDTH=20>
<TD WIDTH=198 VALIGN=top ALIGN=left>
<spacer type=block height=16 width=1>
<form>
<table cellspacing=0 cellpadding=0>
`;
}
data += `
<tr>
<td valign=top>
</table>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=10 VALIGN=top ALIGN=left>
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
<TD COLSPAN=3 VALIGN=top ALIGN=right>
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>

<INPUT name="resetMusicStyles" value="Reset Defaults" WIDTH=145 action="wtv-setup:/reset-musicobj"
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button1" USESTYLE WIDTH=103>
<spacer type=block WIDTH=4 HEIGHT=1>
<INPUT name="chooseMusicStyles" value="Choose Music" WIDTH=145 action="wtv-setup:/choose-bg-songs"
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button1" USESTYLE WIDTH=103>
<spacer type=block WIDTH=4 HEIGHT=1>
<INPUT name="Done" value="Done" WIDTH=103
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button2" USESTYLE WIDTH=103 action="wtv-setup:/setup">
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>


`;