const minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<!--- *=* Copyright 1996, 1997 WebTV Networks, Inc. All rights reserved. --->
<HTML>
<HEAD>
<TITLE>
Dialing options
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
Dialing options
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



<tr>
<td>
<td WIDTH=198 HEIGHT=206 VALIGN=top ALIGN=left>
<A HREF="wtv-setup:/phone-basic" selected><BLACKFACE>Basic</BLACKFACE></A><BR>
<FONT SIZE="-1">Use tone/pulse dialing or choose a dialing prefix</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=12><BR>
<A HREF="wtv-setup:/phone-call-waiting"><BLACKFACE>Call waiting</BLACKFACE></A><BR>
<FONT SIZE="-1">Call waiting can be turned off automatically</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=12><BR>
<A HREF="${session_data.get("wtv-open-access") ? 'file://rom/HTMLs/ConfigureBYOISP.html' : 'client:GoToBYOISPIntro'}"><BLACKFACE>Use an ISP</BLACKFACE></A><BR>
<FONT SIZE="-1">Save money if you dial long distance to WebTV</FONT><BR>

<TD WIDTH=20>

<TD WIDTH=198 VALIGN=top ALIGN=left>
<A HREF="wtv-setup:/phone-advanced"><BLACKFACE>Advanced</BLACKFACE></A><BR>
<FONT SIZE="-1">Set audible dialing, dialing speed, and wait to dial</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=12><BR>
<A HREF="wtv-setup:/phone-reset"><BLACKFACE>Reset</BLACKFACE></A><BR>
<FONT SIZE="-1">Original settings for dialing options</FONT><BR>

<TR>
<TD>
<TD COLSPAN=4 HEIGHT=29 VALIGN=top ALIGN=left>
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
<FORM action="wtv-setup:/setup">
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" Value=Done NAME="Done" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>


`;