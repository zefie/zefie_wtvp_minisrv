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
Mail settings
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
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
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
Mail settings
</table>
<td abswidth=20>
<TR>
<td>
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
<tr>
<td>
<td WIDTH=198 HEIGHT=206 VALIGN=top ALIGN=left>
<spacer type=block height=24 width=1>
<!--
<A HREF="JavaScript:alert('This feature is not available.')" selected><BLACKFACE>Extras</BLACKFACE></A><BR>
<FONT SIZE="-1">Additional features for storing, addressing, and replying to mail</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=7><BR>
<A HREF="JavaScript:alert('This feature is not available.')"><BLACKFACE>Listing</BLACKFACE></A><BR>
<FONT SIZE="-1">Choose the order in which messages are listed in the mail list</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=7><BR>
<A HREF="JavaScript:alert('This feature is not available.')"><BLACKFACE>Message light</BLACKFACE></A><BR>
<FONT SIZE="-1">Automatically check for mail once a day</FONT><BR>

<TD WIDTH=20>

<TD WIDTH=198 VALIGN=top ALIGN=left>
-->
<A HREF="wtv-setup:/mail-signature"><BLACKFACE>Signature</BLACKFACE></A><BR>
<FONT SIZE="-1">Add personal text to the bottom of every message you send</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=7><BR>
<!--
<A HREF="JavaScript:alert('This feature is not available.')"><BLACKFACE>Mail name</BLACKFACE></A><BR>
<FONT SIZE="-1">Change the name that appears on your mail</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=7><BR>
<A HREF="JavaScript:alert('This feature is not available.')"><BLACKFACE>Remote mail</BLACKFACE></A><BR>
<FONT SIZE="-1">Fetch mail from another mail account</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=7><BR>
<A HREF="JavaScript:alert('This feature is not available.')"><BLACKFACE>Junk Mail</BLACKFACE></A><BR>
<FONT SIZE="-1">Block unwanted mail</FONT><BR>
-->
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=9 VALIGN=top ALIGN=left>
<!-- remove later -->
<spacer type=block WIDTH=1 HEIGHT=40>
<tr>
<TD>
<td colspan=3 height=2 valign=middle align=center bgcolor="2B2B2B">
<!-- <spacer type=block width=436 height=1> -->
<spacer type=block width=456 height=1>
<tr>
<TD>
<td colspan=3 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=3 height=2 valign=top align=left bgcolor="0D0D0D">
<spacer type=block width=436 height=1>
<TR>
<TD>
<TD COLSPAN=3 HEIGHT=4 VALIGN=top ALIGN=left>
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