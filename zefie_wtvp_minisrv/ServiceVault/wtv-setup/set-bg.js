var minisrv_service_file = true;

var WTVBGMusic = require("./WTVBGMusic.js");
var wtvbgm = new WTVBGMusic(minisrv_config, ssid_sessions[socket.ssid]);
if (request_headers.query.category) {
	var musicList = wtvbgm.getCategorySongList(request_headers.query.category);
	var categoryName = wtvbgm.getCategoryName(request_headers.query.category);

	headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

	data = `<html><head>
<title>
${categoryName}
</title>
<bgsound src="/sounds/silence.aiff" loop="">
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
${categoryName}
</shadow></blackface></font></td></tr><tr><td>
Choose the songs that you'd like to include.
</td></tr><tr>
<td height="15">
<input type="hidden" name="category" value="1">
</form></td></tr></tbody></table>
</td><td abswidth="20">
</td></tr><tr>
<td>
</td><td width="198" valign="top" height="201" align="left">
<form action="validate-bg-song-category">
<input type="hidden" name="category" value="${request_headers.query.category}">
<input type="hidden" autosubmit="onLeave">
`;
	var songsListed = 0;
	var numSongs = musicList.length;
	var divide = Math.round(numSongs / 2, 0);
	Object.keys(musicList).forEach(function (k) {
		if (songsListed == divide) {
			data += `</td ><td width="20">
</td><td width="198" valign="top" align="left">`;
		}
		data += `<table>
<tbody><tr>
<td valign="top">
<input type="checkbox" name="enableSong" value=${musicList[k]['id']}${(wtvbgm.isSongEnabled(musicList[k]['id'])) ? ' checked="checked"' : ''}>
</td><td valign="bottom">
<a href=${musicList[k]['url']}?wtv-title=${escape(musicList[k]['title'])}>${musicList[k]['title']}</a>
</td></tr></tbody></table>`;
		songsListed++;
	});


	data += `

</td><td>
</td></tr><tr>
<td>
</td><td colspan="4" valign="top" height="7" align="left">
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
<form action="client:goback">
<font size="-1" color="#E7CE4A"><shadow>
<input type="SUBMIT" borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Done" name="Done" usestyle="" width="103">
</shadow></font></form>
</td><td>
</td></tr></tbody></table>
</display></display></body></html>`;

} else {
	var errPage = doErrorPage("400", "Category ID is required.");
	headers = errPage[0];
	data = errPage[1];
}