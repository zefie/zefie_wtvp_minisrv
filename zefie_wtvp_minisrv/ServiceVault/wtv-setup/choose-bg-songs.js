var minisrv_service_file = true;

var WTVBGMusic = require("./WTVBGMusic.js");
var wtvbgm = new WTVBGMusic(minisrv_config, ssid_sessions[socket.ssid])


headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<html><head>
<title>
Background music styles
</title>
<bgsound src="sounds/silence.aiff" loop="">
</head><body vspace="0" hspace="0" fontsize="large" vlink="36d5ff" text="#42CC55" link="36d5ff" bgcolor="#191919"><display>

<sidebar width="110"> <table cellspacing="0" cellpadding="0" bgcolor="452a36">
<tbody><tr>
<td colspan="3" abswidth="104" absheight="4">
</td><td rowspan="99" absheight="420" width="6" valign="top" align="left">
<img src="wtv-home:/ROMCache/Shadow.gif" width="6" height="420">
</td></tr><tr>
<td abswidth="6">
</td><td abswidth="92" absheight="76">
<table href="wtv-home:/home" absheight="76" cellspacing="0" cellpadding="0">
<tbody><tr>
<td align="right">
<img src="${minisrv_config.config.service_logo}" width="87" height="67">
</td></tr></tbody></table>
</td><td abswidth="6">
</td></tr><tr><td absheight="5" colspan="3">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td abswidth="104" absheight="2" valign="middle" bgcolor="2e1e26" align="center">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td abswidth="104" absheight="1" valign="top" align="left">
</td></tr><tr><td abswidth="104" absheight="2" valign="top" bgcolor="6b4657" align="left">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
<tr><td absheight=132>
<tr><td absheight=166 align=right colspan=3>
<img src="ROMCache/SettingsBanner.gif" width=54 height=166>
<tr><td absheight=41>
</td></tr></tbody></table>
</sidebar>
<table cellspacing="0" cellpadding="0">
<tbody><tr>
<td abswidth="14">
</td><td colspan="3">
<table cellspacing="0" cellpadding="0">
<tbody><tr>
<td absheight="80" valign="center">
<font size="+2" color="E7CE4A"><blackface><shadow>
Background music styles
</shadow></blackface></font></td></tr><tr><td>
Choose the styles you'd like to hear. 
Choose a style name to see the songs for that style.
</td></tr><tr>
<td height="15">
</form></td></tr></tbody></table>
</td><td abswidth="20">
</td></tr><tr>
<td>
</td><td width="198" valign="top" height="196" align="left">
<form action="/validate-bg-song-category">
<input type="hidden" autosubmit="onLeave">
`;
var catsListed = 0;
var categories = wtvbgm.getCategoryList();
var numCats = categories.length;
var divide = Math.round(numCats / 2, 0);

Object.keys(categories).forEach(function (k) {
	var pubcat = parseInt(k) + 1;
	var songsInCat = wtvbgm.getCategorySongList(pubcat);
	if (songsInCat.length > 0) {
		if (catsListed == divide) {
			data += `</td ><td width="20">
</td><td width="198" valign="top" align="left">`;
		}
		data += `<table>
<tbody><tr>
<td valign="top">
<input type="checkbox" name="enableCategory" value=${pubcat}${(wtvbgm.isCategoryEnabled(pubcat)) ? ' checked="checked"' : ''}>
</td><td valign="bottom">
<a href="wtv-setup:/set-bg?category=${pubcat}">${categories[k]}</a><br>
</td></tr></tbody></table>`;
		catsListed++;
	}
});

data += `
</td><td>
</td></tr><tr>
<td>
</td><td colspan="4" valign="top" height="0" align="left">
</td></tr><tr>
<td>
</td><td colspan="4" valign="middle" height="2" bgcolor="2B2B2B" align="center">
<img src="wtv-home:/ROMCache/Spacer.gif" width="436" height="1">
</td></tr><tr>
<td>
</td><td colspan="4" valign="top" height="1" align="left">
</td></tr><tr>
<td>
</td><td colspan="4" valign="top" height="2" bgcolor="0D0D0D" align="left">
<img src="wtv-home:/ROMCache/Spacer.gif" width="436" height="1">
</td></tr><tr>
<td>
</td><td colspan="4" valign="top" height="4" align="left">

</td></tr><tr>
<td>
</td><td colspan="3" valign="top" align="right">
<table><tc><td>
<form action="wtv-setup:/reset-musicobj">
<font size="-1" color="#E7CE4A"><shadow>
<input type="SUBMIT" borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Reset to Defaults" name="Reset" usestyle="" width="203">
</shadow></font></form></td><td>
<form action="wtv-setup:/sound">
<font size="-1" color="#E7CE4A"><shadow>
<input type="SUBMIT" borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Done" name="Done" usestyle="" width="103">
</shadow></font></form>
</td></tc></table>
</td><td>
</td></tr></tbody></table>
</display></display></body></html>`;