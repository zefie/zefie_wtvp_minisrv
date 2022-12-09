var minisrv_service_file = true;

var favoritenum = 0;

var foldername = request_headers.query.favorite_folder_name;

var favarray = session_data.favstore.listFavorites(foldername);

var folder_array = session_data.favstore.getFolders();

var folderid = folder_array.indexOf(foldername);

var numoffolders = folder_array.length;

favoritenum = Object.keys(favarray).length;


headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:/serve-`


data = `<html>
<head>
</head>
<body fontsize="large" vspace="0" hspace="0" vlink="189cd6" text="44cc55" link="189cd6" bgcolor="191919">
<title>
Assign shortcut to favorite
</title>
<display>
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
</td><td width="100%"><table href="wtv-favorite:/serve-organize-favorites?favorite_folder_name=${foldername}" width="100%" cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><shadow><font size="-1" color="E7CE4A">
&nbsp;Organize
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
<table width="451" cellspacing="0" cellpadding="0" bgcolor="2b2b2b">
<tbody><tr>
<td width="4" height="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td width="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td><table cellspacing="0" cellpadding="0">
<tbody><tr>
<td align="left">
<shadow><blackface><font color="e7ce4a">Assign shortcut to favorite</font><shadow><blackface>
<shadow><blackface>
</blackface></shadow></blackface></shadow></blackface></shadow></td></tr></tbody></table>
</td></tr><tr>
<td width="4" height="14"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td valign="top" align="left">
<table width="227" cellspacing="0" cellpadding="0">
<tbody><tr><td width="227" valign="middle" height="42" background="ROMCache/LeftTop.gif" align="left">
<table width="100%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40">
</td><td height="20" align="center">
<font size="-1" color="#E6CD4A">
<limittext value="Personal" width="140">
</limittext></font>
</td><td width="20">
</td></tr></tbody></table>
</td></tr></tbody></table>
</td><td valign="top" align="left">
<table width="224" cellspacing="0" cellpadding="0">
<tbody><tr><td absheight="20" bgcolor="2b2b2b">&nbsp;
</td></tr><tr><td width="224" valign="middle" height="22" background="ROMCache/RightTopEdgeOnly.gif" align="left">
</td></tr></tbody></table>
</td></tr><tr></tr></tbody></table><table cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>

<table cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="4"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td width="15">
</td><td valign="middle" align="left">
<font size="-1" color="#42BC52">`
if (favoritenum == 0)
{
	data += "<font size=2>&nbsp;&nbsp;&nbsp;<i>There are no favorites to move in this folder.</i></font>";
} else {
	data += `To assign a keyboard shortcut to a favorite, <br>
choose the button to the right of the favorite. <br>
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="4"><br>
</font>
</td></tr><tr></tr></tbody></table>`
for (let i = 0; i < favoritenum; i++) {
	data += `<table cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr>
<td><table cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td height="4">
</td></tr><tr><td width="15">
</td><td absheight="2" valign="middle" bgcolor="1E1E1E" align="center"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td></tr><tr><td width="5" height="1">
</td></tr><tr><td width="15">
</td><td absheight="2" valign="middle" bgcolor="121212" align="center"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td></tr><tr><td height="4">
</td></tr></tbody></table>
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td width="25">
</td><td width="354">
<table bgcolor="191919">
<tbody><tr><td abswidth="70" valign="center" align="center">
`
if (favarray[i].imagetype == "url")
	data += `<img src="${favarray[i].image}" width="70" vspace="5" height="52"><br>`
else
	data += `<img src="get-thumbnail?folder=${favarray[i].folder}&id=${favarray[i].id}" width="70" vspace="5" height="52"><br>`
data += `
</td><td width="7">
</td><td width="100%" valign="center" align="left">
<font size="-1" color="#42BC52">
${favarray[i].title}<br>
</font>
</td></tr></tbody></table>
</td><td>	<table bgcolor="191919">
<tbody><tr><td abswidth="62" valign="center" align="center">
<table absheight="38" href="wtv-favorite:/serve-choose-shortcut-favorites?favorite_folder_name=${foldername}&amp;favoriteid=${favarray[i].id}" width="53" cellspacing="0" cellpadding="0">
<tbody><tr><td valign="middle" background="images/FKey.gif" align="left">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td width="8">
</td><td absheight="38" width="44" valign="center" align="center">
<font size="-2" color="#F1F1F1">
<br>
</font>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td><td width="3">
</td></tr></tbody></table>`
}
}
data += `<table cellspacing="0" cellpadding="0">
<tbody><tr><td><table cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td><table width="451" cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td height="4">
</td></tr><tr><td width="15">
</td><td absheight="2" valign="middle" bgcolor="2B2B2B" align="center"><img src="wtv-home:/ROMCache/Spacer.gif" height="1">
</td></tr><tr><td width="5" height="1">
</td></tr><tr><td width="15">
</td><td absheight="2" valign="middle" bgcolor="0D0D0D" align="center"><img src="wtv-home:/ROMCache/Spacer.gif" height="1">
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
<form action="wtv-favorite:/commit-shortcuts-favorites">
<input type="hidden" name="favorite_folder_name" value="${foldername}">
<table height="50" cellspacing="0" cellpadding="0" bgcolor="191919">
<tbody><tr><td height="10"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td width="100%"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td><td valign="center" align="right">
<font size="-1" color="#E7CE4A"><shadow>
<input type="submit" useform="Shortcuts" borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Done" name="ForwardToBrowser" usestyle="" width="110">
</shadow></font>
</td><td abswidth="13">
</td></tr><tr><td height="8"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</form>
</display></body></html>
`;