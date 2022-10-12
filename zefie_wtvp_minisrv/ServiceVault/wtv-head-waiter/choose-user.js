var minisrv_service_file = true;

if (socket.ssid !== null) {
    session_data.switchUserID(0);
    session_data.setUserLoggedIn(false);
}

headers = `200 OK
minisrv-no-mail-count: true
wtv-expire-all: wtv-head-waiter:/ValidateLogin
wtv-noback-all: wtv-
Content-Type: text/html`

data = `
<HTML>
<HEAD>
<title>
Choose your name
</title>
<display nooptions nostatus switchtowebmode>
</HEAD>
<sidebar width=144> <table cellspacing=0 cellpadding=0 bgcolor="30364D">
<tr>
<td width=138 absheight=109 valign=top align=center>
<img src="ROMCache/Spacer.gif" width=1 height=8><br>
<img src="ROMCache/Spacer.gif" width=7 height=1>
<img src="${minisrv_config.config.service_logo}" width=127 height=98>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td absheight=5>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=138 absheight=2 valign=middle align=center bgcolor="1C1E28">
<img src="ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=138 absheight=1 valign=top align=left>
<tr><td abswidth=138 absheight=2 valign=top align=left bgcolor="4D5573">
<img src="ROMCache/Spacer.gif" width=1 height=1>
</table>
<tr>
<td absheight=170>
<tr>
<td align=right>
<img src="images/NameBanner.gif" width=50 height=125>
<tr>
<td absheight=8>
</table>
</sidebar>
<body background="ROMCache/NameStrip.gif"
novtilebg
nohtilebg
bgcolor=191919
text="AA9B4A" link=189cd6 vlink=189cd6 hspace=0 fontsize="large">
<LINK href="ROMCache/UtilityBullet.gif" rel=next>
<form action=/ValidateLogin enctype="x-www-form-encoded" method=post>
<input type="hidden" NAME="target-url" VALUE="">
<table cellspacing=0 cellpadding=0>
<tr>
<td width=20>
<td valign=center absheight=104 colspan=3>
<font size="+1" color="E7CE4A"><blackface><shadow>
Choose your name
</shadow></blackface>
<tr>
<td>
<td bgcolor=2b2b2b width=400 absheight=2 colspan=3>
<img src="ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td>
<td absheight=1 colspan=3>
<tr>
<td>
<td bgcolor=000000 width=400 absheight=2 colspan=3>
<img src="ROMCache/Spacer.gif" width=1 height=1>
</table>
<table cellspacing=0 cellpadding=0 width=416>
<tr><td width=20>
<tr><td absheight=2>
<tr>`;

var accounts = session_data.listPrimaryAccountUsers();
var accounts_listed = 0;
for (const [key, value] of Object.entries(accounts)) {
    data += "<td absheight=37><td valign=middle abswidth=50% maxlines=1>";
    if (key == "subscriber") var user_id = 0
    else var user_id = key.replace("user", '');
    data += `<a href=/ValidateLogin?user_id=${user_id}&user_login=true nocancel>`;
    if (key == "subscriber") data += `<font size=+1><b>${value['subscriber_username']}</b></font></a>`;
    else data += `<font size=+1>${value['subscriber_username']}</font>`
    data += "<td width=15><td nowrap>	<font color=42BD52>";
    var userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
    userSession.user_id = user_id;

    var mailcount = 0;
    if (userSession.mailstore.mailstoreExists()) {
        if (userSession.mailstore.mailboxExists(0)) {
            mailcount = userSession.mailstore.countUnreadMessages(0);
        }
    }
  
    var mcnumber = (mailcount >= 100) ? "<b>99+</b>" : mailcount;
    data += `<b>${mcnumber} ${(mcnumber > 0) ? '<img src="/images/signin_new_mail.gif" width="25" height="20">' : '<img src="/images/signin_no_mail.gif" width="25" height="19">'}`;
    data += `</font>
<tr>
<td>
<td bgcolor=1e1e1e width=400 absheight=2 colspan=3>
<img src="ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td>
<td absheight=1 colspan=3>
<tr>
<td>
<td bgcolor=121212 width=400 absheight=2 colspan=3>
<img src="ROMCache/Spacer.gif" width=1 height=1>
<tr>
`;
    accounts_listed++;
};

while (accounts_listed < minisrv_config.config.user_accounts.max_users_per_account) {
    data += `<tr>
<td>
<td absheight=37><tr>
<td>
<td bgcolor=1e1e1e width=400 absheight=2 colspan=3>
<img src="ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td>
<td absheight=1 colspan=3>
<tr>
<td>
<td bgcolor=121212 width=400 absheight=2 colspan=3>
<img src="ROMCache/Spacer.gif" width=1 height=1>`;
    accounts_listed++;
}

data += `
<tr>
<td height=5>
<tr>
<td>
<td colspan=3 valign=bottom align=right>
<font color=e7ce4a size=-1><shadow>
<img src="ROMCache/Spacer.gif" width=20 height=1>
<!-- Only show this button on plus, since classic has no useful purpose offline -->
<input type=submit name=hangup value="Hang Up" borderimage="file://ROM/Borders/ButtonBorder2.bif" useStyle width=110><spacer width=20 type=horizontal>
</table>
</form>
</body>
</html>
`; 