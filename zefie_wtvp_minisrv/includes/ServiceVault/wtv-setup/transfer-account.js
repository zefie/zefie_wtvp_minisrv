const minisrv_service_file = true;

// security
if (session_data.user_id !== 0 && session_data.user_id !== parseInt(request_headers.query.user_id)) {
    const errpage = wtvshared.doErrorPage(400, "You are not authorized to transfer this account. Please log in as the primary user.");
    headers = errpage[0];
    data = errpage[1];
}

if (!session_data.getUserPasswordEnabled()) {
    const passwordRequired = new clientShowAlert({
        'image': minisrv_config.config.service_logo,
        'message': "For security, you must first set a password on your account before you can transfer it.",
        'buttonlabel1': "Set Password",
        'buttonaction1': "wtv-setup:/edit-password",
        'buttonlabel2': "Cancel",
        'buttonaction2': "client:donothing",
        'noback': true,
    }).getURL();

    const errpage = wtvshared.doRedirect(passwordRequired);
    headers = errpage[0];
    data = errpage[1];
} else if (session_data.getUserPasswordEnabled() && session_data.user_id === 0) {
    headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-setup:/transfer-account
wtv-noback-all: wtv-setup:/transfer-account`;
    data = `<HTML>
<HEAD>
<TITLE>
Transfer your account
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
Transfer your account
<td abswidth=20>
<tr>
<td>
<td absheight=244 valign=top align=left>
<form
action="wtv-setup:/validate-transfer-account"
>
<P>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td align=left valign=top abswidth=400 colspan=2>
<table cellspacing=0 cellpadding=0>
<tr>
<td align=left>
Enter the SSID of the target box, and the current primary user's password.
</table>
<tr>
<tr>
</td>
<td align=left valign=top width=6>
</td>
<table cellspacing=0 cellpadding=0>
<tr><td absheight=15></td></tr>
<tr>
<td colspan=3 align=left>
SSID<br>
<INPUT noSubmit name="ssid" id="ssid" Value=""
bgcolor=#444444 text=#ffdd33 cursor=#cc9933
TYPE="text" ASCIIONLY
SIZE="20"
MAXLENGTH="16">
<tr>
<td height=6>
<tr>
<td colspan=3 align=left>
<br>Primary User Password<br>
<INPUT noSubmit name="password" id="password" Value=""
bgcolor=#444444 text=#ffdd33 cursor=#cc9933
TYPE="password" ASCIIONLY
SIZE="20"
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
value=Continue name="Continue" usestyle width=103>
</shadow></font></form>
<td abswidth=20>
</table>
      </body>
</html>`
}