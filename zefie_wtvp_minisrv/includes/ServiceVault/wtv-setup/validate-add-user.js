const minisrv_service_file = true;
let errpage = null;

if (session_data.user_id !== 0) errpage = wtvshared.doErrorPage(400, "You are not authorized to add users to this account.");

// seperate if statements as to not overwrite the first error if multiple occur

if (!errpage) {
    if (session_data.getNumberOfUserAccounts() > minisrv_config.config.user_accounts.max_users_per_account) errpage = wtvshared.doErrorPage(400, "You are not authorized to add more than " + minisrv_config.config.user_accounts.max_users_per_account + ` account${minisrv_config.config.user_accounts.max_users_per_account > 1 ? 's' : ''}.`);
}

if (!errpage) {
    if (request_headers.query.user_password) {
        if (request_headers.query.user_password.length < minisrv_config.config.passwords.min_length) errpage = wtvshared.doErrorPage(400, "Your password must contain at least " + minisrv_config.config.passwords.min_length + " characters.");
        else if (request_headers.query.user_password.length > minisrv_config.config.passwords.max_length) errpage = wtvshared.doErrorPage(400, "Your password must contain no more than than " + minisrv_config.config.passwords.max_length + " characters.");
        else if (request_headers.query.user_password !== request_headers.query.user_password2) errpage = wtvshared.doErrorPage(400, "The passwords you entered did not match. Please check them and try again.");
    }
    else if (!request_headers.query.user_name) errpage = wtvshared.doErrorPage(400, "Please enter a username.");
}

if (errpage) {
    headers = errpage[0];
    data = errpage[1];
} else {

    headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

    data = `<HTML>
<HTML>
<HEAD>
<TITLE>
Adding a user
</TITLE>
<DISPLAY nosave
noscroll>
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR="30364D">
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="ROMCache/Shadow.gif" width=6 height=420>
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
<img src="ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor="4D5573">
<img src="ROMCache/Spacer.gif" width=1 height=1>
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
Adding a user
<td abswidth=20>
<tr>
<td>
<td absheight=244 valign=top align=left>
<form
action="/validate-add-user-done"
>
<P>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td align=left valign=top abswidth=198>
<table cellspacing=0 cellpadding=0>
<INPUT TYPE="hidden" NAME="display_name" VALUE="${request_headers.query.display_name}">
<INPUT TYPE="hidden" NAME="user_name" VALUE="${request_headers.query.user_name}">
<INPUT TYPE="hidden" NAME="user_password" VALUE="${request_headers.query.user_password}">
<INPUT TYPE="hidden" NAME="user_password2" VALUE="${request_headers.query.user_password2}">
<tr>
<td align=left>
You are adding
<a href="wtv-setup:/add-user-name?
user_name=${request_headers.query.user_name}&
display_name=${request_headers.query.display_name}&
user_password=${request_headers.query.user_password}&
user_password2=${request_headers.query.user_password2}">
${request_headers.query.user_name}<br>
</a>
to your account.
<tr>
<td height=11>
<tr>
<td align=left0 abswidth=198 maxlines=2>
Display Name:
<a href="wtv-setup:/add-user?
display_name=${request_headers.query.display_name}&
user_name=${request_headers.query.user_name}&
user_password=${request_headers.query.user_password}&
user_password2=${request_headers.query.user_password2}&
review-only=true">
${request_headers.query.display_name || request_headers.query.user_name}
</a>
<tr>
<td height=6>
<tr>
<td align=left abswidth=188 maxlines=2>
</table>
</td>
<td align=left valign=top width=6>
</td>
<td align=left valign=top abswidth=210>
<table cellspacing=0 cellpadding=0>
<tr>
<td colspan=3 align=left>
<a href="wtv-setup:/add-user-password?
display_name=${request_headers.query.display_name}&
user_name=${request_headers.query.user_name}&
user_password=${request_headers.query.user_password}&
user_password2=${request_headers.query.user_password2}">`;
    if ((request_headers.query.user_password) === "") {
        data += `No password`;
    } else {
        data += `Has password`;
    }
    data += `
</a>
</table>
</table>
<td>
<tr>
<td absheight=7>
<tr>
<td>
<td colspan=2 absheight=2 bgcolor="2B2B2B">
<img src="ROMCache/Spacer.gif" width=426 height=1>
<tr>
<td absheight=1>
<tr>
<td>
<td colspan=2 absheight=2 bgcolor="0D0D0D">
<img src="ROMCache/Spacer.gif" width=426 height=1>
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