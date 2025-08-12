const minisrv_service_file = true;
let userSession = null;

session_data.loadSessionData();

let user_id = (request_headers.query.user_id) ? request_headers.query.user_id : session_data.user_id;

// security
if (session_data.user_id != 0 && session_data.user_id != user_id) {
    user_id = null; // force unset
    const errpage = wtvshared.doErrorPage(400, "You are not authorized to change the selected user's password.");
    headers = errpage[0];
    data = errpage[1];
}

if (user_id != null) {
    if (session_data.user_id == request_headers.query.user_id) userSession = session_data;
    else {
        userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
        userSession.user_id = user_id;
    }

    if (!userSession.loadSessionData()) {
        const errpage = wtvshared.doErrorPage(400, "Invalid user ID.");
        headers = errpage[0];
        data = errpage[1];
    }
    else {
        headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`;

        data = `
<HTML>
<HEAD>
<TITLE>
Change ${(user_id == session_data.user_id) ? 'your' : 'user'} password
</TITLE>
<DISPLAY nosave skipback noscroll>
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
<BODY BGCOLOR="#191919" TEXT="#44cc55" LINK="189CD6" VLINK="189CD6" HSPACE=0 VSPACE=0 FONTSIZE="large"
>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td abswidth=416 absheight=80 valign=center>
<font size="+2" color="E7CE4A"><blackface><shadow>
Change ${(user_id == session_data.user_id) ? 'your' : 'user'} password
<td abswidth=20>
<tr>
<td>
<td absheight=244 valign=top align=left>
<form
action="wtv-setup:/validate-change-password"
>
<P>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td align=left valign=top abswidth=198>
<table cellspacing=0 cellpadding=0>
<tr>
<td align=left>
Type a password<br>
from ${minisrv_config.config.passwords.min_length} to ${minisrv_config.config.passwords.max_length} <br>
characters long.
<p>This password will be<br>
required to access<br>
this account. If you<br>
don't want this<br>
account to have a<br>
password, leave<br>
these spaces blank.
</a>
</table>
</td>
<td align=left valign=top width=6>
</td>
<td align=left valign=top abswidth=210>
<table cellspacing=0 cellpadding=0>
<tr>
<td colspan=3 align=left>
Password<br>
<INPUT type="hidden" name="user_id" value="${user_id}">`;
        if (request_headers.Referer) data += `
<INPUT type="hidden" name="return_to" value="${request_headers.Referer}">`;

data += `<INPUT noSubmit name="password" id="password" Value=""
bgcolor=#444444 text=#ffdd33 cursor=#cc9933
TYPE="password" ASCIIONLY
SIZE="${minisrv_config.config.passwords.form_size}"
MAXLENGTH="${minisrv_config.config.passwords.max_length}">
<tr>
<td height=6>
<tr>
<td colspan=3 align=left>
<br>Type again to confirm<br>
<INPUT noSubmit name="password_verify" id="password_verify" Value=""
bgcolor=#444444 text=#ffdd33 cursor=#cc9933
TYPE="password" ASCIIONLY
SIZE="${minisrv_config.config.passwords.form_size}"
MAXLENGTH="${minisrv_config.config.passwords.max_length}">
</a>
</table>
</table>
<td>
<tr>
<td absheight=7>
<tr>
<td>
<td colspan=2 absheight=2 bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=426 height=1>
<tr>
<td absheight=1>
<tr>
<td>
<td colspan=2 absheight=2 bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=426 height=1>
<tr>
<td absheight=4>
</table>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=430 valign=top align=right>
<font color="#E7CE4A" size=-1><shadow>
<input
selected
type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif"
value=Done name="Done" usestyle width=103>
</shadow></font></form>
<td abswidth=20>
</table>
      </body>
</html>
`;
    }
}
if (userSession) userSession = null;