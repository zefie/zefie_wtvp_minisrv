var minisrv_service_file = true;

headers = `200 OK
Content-Type: text/html`

data = `<html><head>
<title>
Keyboard shortcut list
</title>
</head><body fontsize="large" vspace="0" hspace="0" vlink="189cd6" text="44cc55" link="189cd6" bgcolor="191919"><display>
<sidebar width="109" height="384">

<table cellspacing="0" cellpadding="0" bgcolor="284a52">
<tbody><tr><td absheight="196" valign="top">
<table absheight="196" cellspacing="0" cellpadding="0">
<tbody><tr>
<td width="100%" valign="top" height="50%">
<table cellspacing="0" cellpadding="0">
<tbody><tr>
<td colspan="3" absheight="1" width="100%">
</td></tr><tr>
<td abswidth="6">
</td><td absheight="79" width="100%" align="center">
<table href="wtv-home:/home" absheight="79" width="100%" cellspacing="0" cellpadding="0">
<tbody><tr>
<td width="100%" align="center">
<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width="87" height="67">
</td></tr></tbody></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="100%" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td colspan="3" absheight="1" width="100%">
</td></tr><tr><td colspan="3" absheight="2" width="100%" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">	</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td abswidth="6" absheight="26">
</td><td width="100%"><table href="wtv-favorite:/favorite" width="100%" cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><shadow><font size="-1" color="E7CE4A">
&nbsp;Favorites
</font></shadow></td></tr></tbody></table>
</td></tr></tbody></table>
</td><td abswidth="6">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td><td abswidth="5" background="ROMCache/Shadow.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="188" valign="top">
<table absheight="188" cellspacing="0" cellpadding="0">
<tbody><tr><td width="100%"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td><td valign="bottom" align="right"><img src="ROMCache/FavoritesBanner.gif" width="50" height="188">
</td></tr></tbody></table>
</td><td abswidth="5" background="ROMCache/Shadow.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</sidebar>
<table width="451" cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr>
<td width="4" height="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td width="4" height="12"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td width="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td><table cellspacing="0" cellpadding="0">
<tbody><tr>
<td align="left">
<shadow><blackface><font color="e7ce4a">Keyboard shortcut list</font><shadow><blackface>
</blackface></shadow></blackface></shadow></td></tr></tbody></table>
</td></tr><tr>
<td width="4" height="14"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>`

for (var i = 1; i <= 8; i++) {
    var key = "F" + i;
    var scfav = session_data.favstore.getShortcutKey(key);
    if (scfav && scfav.id != "none") {
        var fav = session_data.favstore.getFavorite(scfav.folder, scfav.id);
    } else {
        var fav = { image: "wtv-home:/ROMCache/Spacer.gif", title: "Not assigned" };
    }

data += `
<table cellspacing="0" cellpadding="0">
<tbody><tr><td absheight="13"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</td><td><table cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td height="4">
</td></tr><tr><td width="15">
</td><td absheight="2" valign="middle" bgcolor="1E1E1E" align="center"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td></tr><tr><td width="5" height="1">
</td></tr><tr><td width="15">
</td><td absheight="2" valign="middle" bgcolor="121212" align="center"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td></tr><tr><td height="4">
</td></tr></tbody></table>
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td width="13">
</td><td>
<form action="client:goback">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><table cellspacing="0" cellpadding="0">
<tbody><tr><td abswidth="70" valign="center" align="center">
<table bgcolor="000000">
<tbody><tr><td><img src="${fav.image}" width="70" height="52">
</td></tr></tbody></table>
</td><td width="10">
</td><td width="279" valign="center" align="left">
<font size="-1" color="#42BC52">
${fav.title}
</font>
</td><td>
<table absheight="38" width="53" cellspacing="0" cellpadding="0">
<tbody><tr><td valign="middle" background="images/FKey.gif" absheight=38 align="center">
<font size="-2" color="#F1F1F1">
&nbsp;${key}
</font>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
`
}

data += `
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><table cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td><table cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td absheight="15"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</td><td><table width="100%" cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td height="10">
</td></tr><tr><td width="15">
</td><td absheight="2" valign="middle" bgcolor="2B2B2B" align="center"><img src="wtv-home:/ROMCache/Spacer.gif" height="1">
</td></tr><tr><td width="5" height="1">
</td></tr><tr><td width="15">
</td><td absheight="2" valign="middle" bgcolor="0D0D0D" align="center"><img src="wtv-home:/ROMCache/Spacer.gif" height="1">
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
<input type="hidden" name="favorite-folder-name" value="Personal">
<input type="hidden" name="favorite-id" value="catLAAXSaaIc">
<table absheight="52" cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td height="10"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td width="100%"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td><td valign="center" align="right">
<font size="-1" color="#E7CE4A"><shadow>
<input type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Done" name="GoBack" usestyle width=110>
</shadow></font>
</td><td abswidth="13">
</td></tr></tbody></table>
</form>
</display></body></html>`