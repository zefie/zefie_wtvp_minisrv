var minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-noback-all: wtv-setup:/mail-signature
wtv-expire-all: wtv-setup:/mail-signature
wtv-expire-all: wtv-mail:/get-signature
wtv-expire-all: wtv-mail:/sendmail
wtv-expire-all: http
Content-Type: text/html`

var signature = session_data.getSessionData("subscriber_signature");

if (request_headers.query.mail_signature) {
    if (signature != request_headers.query.mail_signature) {
        session_data.setSessionData("subscriber_signature", (request_headers.query.mail_signature) ? request_headers.query.mail_signature : "");
        session_data.saveSessionData();
        signature = request_headers.query.mail_signature;
    }
} 
var message_colors = session_data.mailstore.getSignatureColors(signature)

data = `<HTML>
<HEAD>
<TITLE>
Mail signature setup
</TITLE>
<DISPLAY >
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR=452a36>
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
<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width=87 height=67>
</table>
<td abswidth=6>
<tr><td absheight=5 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor=2e1e26>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor=6b4657>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>
<tr><td absheight=132>
<tr><td absheight=166 align=right colspan=3>
<img src="ROMCache/SettingsBanner.gif" width=54 height=166>
<tr><td absheight=41>
</table>
</sidebar>
<BODY BGCOLOR="#191919" TEXT="#42CC55" LINK="36d5ff" VLINK="36d5ff" HSPACE=0 VSPACE=0 FONTSIZE="large">            
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<font size="+2" color="E7CE4A"><blackface><shadow>
Mail signature
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
<td colspan=3 WIDTH=416 HEIGHT=68 VALIGN=top ALIGN=left>
<spacer type=block height=24 width=1>
Type a short text <B>signature</B> here and it will be added to the end of each mail message you send.<br>
If you wish to use HTML, the first line of your signature should be <b>&lt;html&gt;</b>.
<TR>
<TD absheight=6>
<TR>
<TD>
<TD colspan=3 WIDTH=416 HEIGHT=118 VALIGN=top ALIGN=left>
<FORM method="POST" name="sig" action="/validate-mail-signature">
<INPUT type=hidden autosubmit=onleave>
<TEXTAREA name="mail_signature"
action="/validate-mail-signature"
selected
bgcolor="#191919" text="#44cc55"
cursor=#cc9933
cols=45 rows=5
autoactivate
nosoftbreaks
maxlength=4096
font=proportional>${signature || ""}</TEXTAREA></FORM></TD>
</FORM>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=30 VALIGN=top ALIGN=left>
<tr>
<TD>
<td colspan=3 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<TD>
<td colspan=4 height=1 valign=top align=left>
${(request_headers.query.preview) ? "<tr><td><td colspan=3><b>Signature Preview:</b>" : ""}
<tr>
<TD>
<td colspan=3 valign=top align=left bgcolor="${(request_headers.query.preview) ? message_colors.bgcolor : "0D0D0D"}">
${(request_headers.query.preview) ? `<embed src="wtv-mail:/get-signature?sanitize=true&showdemotext=true" height=40></embed><br><br>` : ''}
<tr>
<td>
<td colspan=3 height=2 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=6>
<TR>
<TD>
<TD  VALIGN=top ALIGN=left>
<FORM action="/mail-signature" METHOD="POST" onsubmit="this.mail_signature.value = document.forms[0].mail_signature.value">
<INPUT type=hidden name="mail_signature">
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" Value=Preview NAME="preview" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>

<TD>
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