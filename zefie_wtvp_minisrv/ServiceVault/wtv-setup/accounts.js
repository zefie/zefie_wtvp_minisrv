var minisrv_service_file = true;
ssid_sessions[socket.ssid].loadSessionData();

if (ssid_sessions[socket.ssid].user_id != 0) {
    var errpage = doErrorPage(400, "You are not authorized to edit the primary account.");
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
Users setup
</TITLE>
<DISPLAY >
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
${minisrv_config.config.service_name} users
</table>
<td abswidth=20>
<TR>
<td>
<td WIDTH=198 HEIGHT=244 VALIGN=top ALIGN=left>
<FONT COLOR="44cc55"><B>
Subscriber:
<P>`;
    var accounts = ssid_sessions[socket.ssid].listPrimaryAccountUsers();

    var num_accounts = ssid_sessions[socket.ssid].getNumberOfUserAccounts();
    if (num_accounts > 1) data += "Additional users:</B></FONT>";

    data += "<TD WIDTH=20><TD WIDTH=198 VALIGN=top ALIGN=left>";

    data += `<FORM>
<FONT COLOR="189CD6"><B>
<A HREF="wtv-setup:/edit-user-begin?user_id=0">${accounts.subscriber.subscriber_username}</A>
</B></FONT>
<P>`;

    if (num_accounts > 1) {
        delete accounts.subscriber;
        for (const [key, value] of Object.entries(accounts)) {
            data += `<FONT COLOR="189CD6"><B>
<A HREF="wtv-setup:/edit-user-begin?user_id=${key.replace("user", '')}">${value.subscriber_username}</A>
</B></FONT><BR>

`;

        };
    }
    data += `
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<tr>
<TD>
<td colspan=4 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="ROMCache/Spacer.gif" width=436 height=1>
<tr>
<TD>
<td colspan=4 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=4 height=2 valign=top align=left bgcolor="0D0D0D">
<img src="ROMCache/Spacer.gif" width=436 height=1>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<TR>
<TD>
<TD COLSPAN=3 VALIGN=top ALIGN=right>
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT action="/remove-users?user-count=x"
name="RemoveUser" value="Remove User" WIDTH=140 ${(num_accounts >= 1) ? 'USESTYLE' : 'disabled="disabled" text=gray' }
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button1" WIDTH=103>
<IMG SRC="ROMCache/Spacer.gif" WIDTH=4 HEIGHT=1>
<INPUT action="/add-user?user_count=${num_accounts}"
name="AddUser" value="Add User" WIDTH=120 ${(num_accounts >= minisrv_config.config.user_accounts.max_users_per_account) ? 'disabled="disabled" text=gray' : 'USESTYLE'}
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button2" WIDTH=103>
<IMG SRC="ROMCache/Spacer.gif" WIDTH=4 HEIGHT=1>
<INPUT action="client:goback"
name="Done"
value="Done"
WIDTH=120
selected
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button3" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>
`;
}