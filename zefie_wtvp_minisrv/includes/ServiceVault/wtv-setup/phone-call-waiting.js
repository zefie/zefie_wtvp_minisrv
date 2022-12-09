var minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<!--- *=* Copyright 1996, 1997 WebTV Networks, Inc. All rights reserved. --->
<HTML>
<HEAD>
<TITLE>
Call waiting options
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
Call waiting options
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
<tr><td colspan=4 height=10></td></tr>
<TR>
<td>
<td WIDTH=198 HEIGHT=236 VALIGN=top ALIGN=left>
<p><font size="medium">If your phone line
has call waiting and you
want incoming calls to interrupt WebTV, choose <b>accept calls</b>, and
adjust sensitivity.
<p>If your line has
call waiting but you don't want WebTV to
be interrupted, choose <b>block calls</b>.</font>
<TD WIDTH=20>
<TD WIDTH=198 VALIGN=top ALIGN=left>
<form action="client:ConfirmPhoneSetup">
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=top>
<input type=hidden name=autosubmit value=true autosubmit=onleave>
<input type=radio name=call-waiting-mode value="NONE" checked=&hasit;>
<td abswidth=4>
<td valign=top>
<font size=-1>No call waiting on my phone line.</font>
<tr><td absheight=10>
<tr>
<td valign=top>
<input type=radio name=call-waiting-mode value="HACK" checked=&hack;>
<td abswidth=4>
<td valign=top>
<font size=-1><i>Accept calls</i><br>Disconnect
if a call comes in.</font>
<tr><td absheight=10>
<tr>
<td valign=top>
<input type=radio name=call-waiting-mode value="DISABLE" checked=&nowait;>
<td abswidth = 3>
<td valign=top>
<font size=-1><i>Block calls</i><br>
Shut off call waiting when connecting to WebTV, using this prefix:
<input type=text name=CallWaitingPrefix maxlength=31 bgcolor=#444444 text=#ffdd33 size=4
cursor=#cc9933 value="&wstr;"></font>
<tr><td absheight=3>
<tr>
<td align=center valign=top colspan=3><font size=-1><i>example:</i>
<tt>*70,</tt></font>
</table>
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
<TD COLSPAN=3 VALIGN=top ALIGN=right>
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT name="AdjustSensitivity" value="Adjust Sensitivity" WIDTH=190 action="wtv-setup:/phone-call-wait-thresh"
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button1" USESTYLE WIDTH=103>
<spacer type=block WIDTH=4 HEIGHT=1>
<INPUT name="Done" value="Done" WIDTH=190
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button2" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>


`;