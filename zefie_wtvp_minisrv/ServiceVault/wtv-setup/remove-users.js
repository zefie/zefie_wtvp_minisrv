var minisrv_service_file = true;
var errpage;

if (Object.keys(ssid_sessions[socket.ssid].listPrimaryAccountUsers()).length == 1) {
	errpage = wtvshared.doErrorPage(400, "There are no more users to remove.");
}
else if (ssid_sessions[socket.ssid].user_id != 0) errpage = wtvshared.doErrorPage(400, "You are not authorized to add users to this account.");
if (errpage) {
	headers = errpage[0];
	data = errpage[1];
} else {
	headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-setup:/remove-users
wtv-expire-all: wtv-setup:/validate-remove-users
Content-Type: text/html`

	data = `<HTML>
<HTML>
<HEAD>
<TITLE>
Remove users
</TITLE>
<DISPLAY nosave
noscroll>
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR=30364D>
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
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor=1C1E28>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor=4D5573>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>
<tr><td absheight=37>
<tr><td absheight=263 align=right colspan=3>
<img src="ROMCache/AccountBanner.gif" width=53 height=263>
<tr><td absheight=41>
</table>
</sidebar>
<BODY NOHTILEBG BGCOLOR="#191919" TEXT="#42CC55" LINK="36d5ff" VLINK="36d5ff" HSPACE=0 VSPACE=0 FONTSIZE="large"
>
<TABLE cellspacing=0 cellpadding=0>
<TR><TD width=20><img src="wtv-home:/ROMCache/Spacer.gif" width=20 height=1>
<TD colspan=3 height=16 valign=top align=left>
<TR>
<TD width=20>
	<TD colspan=3 height=39 valign=top>
	<FONT size=+2 color="42CC55"> <blackface><shadow> 
		Remove users </shadow></blackface>
	</FONT>
<TR><TD width=10>
	<TD colspan=5 height=56 valign=top>
	<TABLE cellspacing=0 cellpadding=0>
		<TD width=400>
		<FONT color="42CC55"> 
				Mark users to remove permanently from your account, 
				then choose <b>Remove</b>.
		</FONT>
		<TD align=right>
	</TABLE>
<td abswidth=20>
<TR>
<td>
<td WIDTH=198 HEIGHT=214 VALIGN=top ALIGN=left>
<FONT COLOR="44cc55"><B>
<TABLE CELLSPACING=0 CELLPADDING=0>
<TR><TD COLSPAN=3 HEIGHT=2 VALIGN=MIDDLE ALIGN=CENTER BGCOLOR="2B2B2B"><IMG SRC="ROMCache/spacer.gif" WIDTH=10 HEIGHT=1>
<TR><TD COLSPAN=3 HEIGHT=1 VALIGN=TOP ALIGN=LEFT>
<TR><TD COLSPAN=3 HEIGHT=2 VALIGN=TOP ALIGN=LEFT BGCOLOR="0D0D0D"><IMG SRC="ROMCache/spacer.gif" WIDTH=10 HEIGHT=1>
<TR><TD abswidth=54 absheight=25 valign=middle align=left>
<TD abswidth=230 valign=left  align=left>
<font><blackface>Name</blackface></font>
<TD abswidth=150 valign=left  align=right>
<font size="-1"><blackface>New Messages</blackface></font>
<TR><TD COLSPAN=3 HEIGHT=2 VALIGN=MIDDLE ALIGN=CENTER BGCOLOR="2B2B2B"><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 HEIGHT=1 VALIGN=TOP ALIGN=LEFT>
<TR><TD COLSPAN=3 HEIGHT=2 VALIGN=TOP ALIGN=LEFT BGCOLOR="0D0D0D"><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 HEIGHT=0>

<P><FORM ACTION="wtv-setup:/validate-remove-users" METHOD="POST">
`;

	var accounts = ssid_sessions[socket.ssid].listPrimaryAccountUsers();

	var num_accounts = ssid_sessions[socket.ssid].getNumberOfUserAccounts();
	if (num_accounts > 1) {
		delete accounts.subscriber;
		for (const [key, value] of Object.entries(accounts)) {
			var userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
			userSession.user_id = parseInt(key.replace("user", ''));

			var mailcount = 0;
			if (userSession.mailstore.mailstoreExists()) {
				if (userSession.mailstore.mailboxExists(0)) {
					mailcount = userSession.mailstore.countUnreadMessages(0);
				}
			}

			data += `<FONT COLOR="42CC55"><B>

<TR><TD COLSPAN=3 HEIGHT=5>
<tr>
<td colspan=2><input type=checkbox name="${key}"><font size=+1> <b>${value.subscriber_username}</b>
<td align=right>${mailcount}
</tr>
</B></FONT>
`;
		}
	}

	data += `
</table>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<tr>
<TD>
<td colspan=4 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<TD>
<td colspan=4 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=4 height=2 valign=top align=left bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=1>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<TR>
<TD>
<TD COLSPAN=3 VALIGN=top ALIGN=right>
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT type="submit"
name="Remove" value="Remove" WIDTH=103 USESTYLE
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button1" WIDTH=103>
<IMG SRC="wtv-home:/ROMCache/Spacer.gif" WIDTH=4 HEIGHT=1>
<INPUT action="wtv-setup:/accounts?"
name="Done"
value="Done"
WIDTH=103
selected
TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME="Button3" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>
`;
}