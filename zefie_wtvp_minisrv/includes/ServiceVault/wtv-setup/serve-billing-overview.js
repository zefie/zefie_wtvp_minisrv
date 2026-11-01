const minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `
<HTML>
<HEAD>
<TITLE>
Your ${minisrv_config.config.service_name} account
</TITLE>
<DISPLAY noscroll>
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR="30364D">
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="wtv-home:/ROMCache/Shadow.gif" width=6 height=420>
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
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor="1C1E28">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor="4D5573">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>
<tr><td absheight=37>
<tr><td absheight=263 align=right colspan=3>
<img src="ROMCache/AccountBanner.gif" width=53 height=263>
<tr><td absheight=41>
</table>
</sidebar>
<BODY BGCOLOR="#191919" TEXT="#44cc55" LINK="189CD6" VLINK="189CD6" HSPACE=0 VSPACE=0 FONTSIZE="large">            
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<font size="+2" color="E7CE4A"><blackface><shadow>
Your ${minisrv_config.config.service_name} account
</table>
<td abswidth=20>
<TR>
<td>
<td WIDTH=198 HEIGHT=236 VALIGN=top ALIGN=left>
<A HREF="wtv-setup:/edit-user-begin?user_id=0"><BLACKFACE>Subscriber info</BLACKFACE></A><BR>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=1 HEIGHT=1><BR>
<FONT SIZE="-1">Change your display name and/or password</FONT><BR>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=1 HEIGHT=11><BR>
<A HREF="wtv-setup:/accounts"><BLACKFACE>Additional Users</BLACKFACE></A><BR>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=1 HEIGHT=1><BR>
<FONT SIZE="-1">Manage additional user accounts</FONT><BR>
<TD WIDTH=20>
<TD WIDTH=198 VALIGN=top ALIGN=left>
<A HREF="wtv-home:/Credits-Legal"><BLACKFACE>Terms of service</BLACKFACE></A><BR>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=1 HEIGHT=1><BR>
<FONT SIZE="-1">Rules and regulations</FONT><BR>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=1 HEIGHT=11><BR>
<A HREF="wtv-home:/Credits-Privacy"><BLACKFACE>Privacy policy</BLACKFACE></A><BR>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=1 HEIGHT=1><BR>
<FONT SIZE="-1">How we use your personal information</FONT><BR>

<TR>
<TD>
<TD COLSPAN=4 HEIGHT=7 VALIGN=top ALIGN=left>
<tr>
<TD>
<td colspan=4 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<TD>
<td height=1>
<tr>
<TD>
<td colspan=4 height=2 bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=1>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<TR>
<TD>
<TD COLSPAN=3 VALIGN=top ALIGN=right>
<FORM action="wtv-setup:/setup">
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" Value=Done NAME="Done" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
      </BODY>
</HTML>`;