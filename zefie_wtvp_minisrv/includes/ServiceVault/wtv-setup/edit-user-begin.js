var minisrv_service_file = true;
session_data.loadSessionData();

var user_id = null;
if (request_headers.query.user_id) {
    user_id = request_headers.query.user_id;
} else {
    user_id = session_data.user_id;
}

// security
if (session_data.user_id != 0 && session_data.user_id != request_headers.query.user_id) {
    user_id = null; // force unset
    var errpage = wtvshared.doErrorPage(400, "You are not authorized to edit the selected user.");
    headers = errpage[0];
    data = errpage[1];
}

if (user_id != null) {
    headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-setup:/edit-user
wtv-noback-all: wtv-setup:/edit-user`
    var userSession = null;
    if (session_data.user_id == request_headers.query.user_id) userSession = session_data;
    else {
        userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
        userSession.user_id = user_id;
    }

    if (!userSession.loadSessionData()) {
        var errpage = wtvshared.doErrorPage(400, "Invalid user ID.");
        headers = errpage[0];
        data = errpage[1];
    } else {

        data = `
<HTML>
<HEAD>
<TITLE>
Changing ${(user_id == 0) ? 'subscriber' : 'user'} information
</TITLE>
<DISPLAY nosave
noscroll>
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
${(user_id == 0) ? 'Subscriber' : 'User'} information
<td abswidth=20>
<tr>
<td>
<td absheight=244 valign=top align=left>
<form
action="client:goback"
>
<P>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td align=left valign=top abswidth=198>
<table cellspacing=0 cellpadding=0>
<tr>
<td align=left>
Choose any item to
change the
information.
<p>Choose <b>Done</b> when
you're finished.
</a>
</table>
</td>
<td align=left valign=top width=6>
</td>
<td align=left valign=top abswidth=210>
<table cellspacing=0 cellpadding=0>
<tr>
<td colspan=3 align=left>
<b>Username:</b><br>
${userSession.getSessionData("subscriber_username")}
</a>
<tr>
<td height=6>
<tr>
<td colspan=3 align=left>
<b>Display Name:</b><br>
<a href="wtv-setup:/edit-user-name?user_id=${user_id}">
${userSession.getSessionData("subscriber_name")}
</a>
<tr>
<td height=6>
<tr>
<td colspan=3 align=left>
<b>Password:</b>
<br>
<a href="wtv-setup:/edit-password?user_id=${user_id}">
${(userSession.getUserPasswordEnabled()) ? "Change Password" : "Set Password"}
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