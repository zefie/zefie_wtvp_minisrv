const minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<HTML>
<HEAD>
<TITLE>
Screen border
</TITLE>
<DISPLAY nosave
>
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR=452a36>
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="/ROMCache/Shadow.gif" width=6 height=420>
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
<img src="/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor=6b4657>
<img src="/ROMCache/Spacer.gif" width=1 height=1>
</table>
<tr><td absheight=171>
<tr><td absheight=123 align=right colspan=3>
<img src="images/SetupBanner.gif" width=54 height=123>
<tr><td absheight=41>
</table>
</sidebar>
<BODY NOHTILEBG BGCOLOR="#191919" TEXT="#42CC55" LINK="36d5ff" VLINK="36d5ff" HSPACE=0 VSPACE=0 FONTSIZE="large">            
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<font size="+2" color="E7CE4A"><blackface><shadow>
Screen border
<FORM
action="/validate-screen-border"
>
</table>
<td abswidth=20>
<TR>
<td>
<td WIDTH=198 HEIGHT=244 VALIGN=top ALIGN=left>
Select the brightness you would
like for the border around the edge of the screen. <p>Adjusting the
screen border can help reduce the bent lines that appear
on some televisions.
<TD WIDTH=20>
<TD WIDTH=198 VALIGN=top ALIGN=left>
<table>
<tr valign=top>
<td>
<input name=shade type=radio bgcolor=#444444 value="dark" selected checked>
<td>
Dark
<tr><td height=16>
<tr valign=top>
<td>
<input name=shade type=radio bgcolor=#444444 value="medium">
<td>
Medium
<tr><td height=16>
<tr valign=top>
<td>
<input name=shade type=radio bgcolor=#444444 value="light">
<td>
Light
</table>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=7 VALIGN=top ALIGN=left>
<tr>
<TD>
<td colspan=3 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<TD>
<td colspan=4 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=3 height=2 valign=top align=left bgcolor="0D0D0D">
<img src="/ROMCache/Spacer.gif" width=436 height=1>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<TR>
<TD>
<TD COLSPAN=3 VALIGN=top ALIGN=right>
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Continue" USESTYLE
selected
Value="Continue" WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
      </BODY>
</HTML>
`;