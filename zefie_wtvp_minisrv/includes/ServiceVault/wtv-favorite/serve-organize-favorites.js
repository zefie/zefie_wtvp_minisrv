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


data = `<html><head>
<title>
Organize favorites
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
<tbody><tr><td abswidth="5" absheight="26">
</td><td abswidth="93"><table abswidth="93" href="wtv-favorite:/favorite" cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><shadow><font size="-1" color="E7CE4A">
 Folders
</font></shadow></td></tr></tbody></table>
</td></tr></tbody></table>
</td><td abswidth="6">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td abswidth="5" absheight="26">
</td><td abswidth="93"><table abswidth="93" href="wtv-favorite:/serve-add-folder-page" cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><shadow><font size="-1" color="E7CE4A">
 Add folder
</font></shadow></td></tr></tbody></table>
</td></tr></tbody></table>
</td><td abswidth="6">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td abswidth="5" absheight="26">
</td><td abswidth="93">
<table abswidth="93" href="wtv-guide:/quickhelp?title=Favorites" cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><shadow><font size="-1" color="E7CE4A">
 Help
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
<td width="4" height="12"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td width="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td><table width="428" cellspacing="0" cellpadding="0">
<tbody><tr>
<td align="left">
<shadow><blackface><font color="e7ce4a">Organize favorites in this folder:
</font><shadow><blackface>
</blackface></shadow></blackface></shadow></td></tr></tbody></table>
</td></tr><tr>
<td width="4" height="14"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td valign="top" align="left">
<table width="221" cellspacing="0" cellpadding="0">
	<tbody><tr><td width="221" valign="middle" height="42" background="ROMCache/LeftTop.gif" align="left">
<table width="100%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="10"> </td><td width="20" valign="top" height="28" align="left">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td height="1">
</td></tr><tr><td height="20">
<table width="20" height="20" cellspacing="0" cellpadding="0">
<tbody><tr><td> 
</td></tr></tbody></table>
</td></tr></tbody></table>
</td><td width="10"> </td><td height="20" align="center">
<font size="-1" color="#E6CD4A">
<limittext value="${foldername}" width="140">
</limittext></font>
</td><td width="20">
</td></tr></tbody></table>
</td></tr></tbody></table>
</td><td valign="top" align="left">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table abswidth="178" cellspacing="0" cellpadding="0">
<tbody><tr><td absheight="20" bgcolor="2b2b2b"> 
</td></tr><tr><td abswidth="178" valign="middle" height="22" background="ROMCache/MiddleTop.gif" align="left">
</td></tr></tbody></table>
</td><td>
<table abswidth="52" cellspacing="0" cellpadding="0">
<tbody><tr></tr></tbody></table><table abswidth="52" cellspacing="0" cellpadding="0" background="ROMCache/FarRightTop.gif">
<tbody><tr><td width="20" valign="middle" height="42" align="left">
</td><td width="25" valign="middle" height="42" align="left">
</td><td width="7" valign="middle" height="40" align="left">
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr><spacer type=block WIDTH=199 HEIGHT=0><td width="5" height="13"><img src="wtv-home:/ROMCache/Spacer.gif" width="199" height="1">
</td></tr></tbody></table></table>

<table cellspacing="0" cellpadding="0" bgcolor="191919">
</table><table cellspacing="0" cellpadding="0">
</table><table cellspacing="0" cellpadding="0">
<tbody><tr><td absheight="106" width="18"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td WIDTH=198 HEIGHT=206 VALIGN=top ALIGN=left>
<A HREF="wtv-favorite:/serve-discard-favorites?favorite_folder_name=${foldername}" selected><BLACKFACE>Discard</BLACKFACE></A><BR>
<FONT SIZE="-1">Remove unwanted favorites from this folder</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=7><BR>
<!--<A HREF="wtv-favorite:/serve-arrange-favorites?favorite_folder_name=${foldername}"><BLACKFACE>Listing</BLACKFACE></A><BR>
<FONT SIZE="-1">Change how favorites are listed</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=7><BR>-->
<A HREF="wtv-favorite:/serve-move-favorites?favorite_folder_name=${foldername}"><BLACKFACE>Move to folder</BLACKFACE></A><BR>
<FONT SIZE="-1">Move favorites from this folder to another</FONT><BR>

<TD WIDTH=20>

<TD WIDTH=198 VALIGN=top ALIGN=left>
<A HREF="wtv-favorite:/serve-rename-favorites?favorite_folder_name=${foldername}"><BLACKFACE>Rename</BLACKFACE></A><BR>
<FONT SIZE="-1">Rename favorites in this folder</FONT><BR>
<spacer type=block WIDTH=1 HEIGHT=7><BR>
<A HREF="wtv-favorite:/serve-shortcuts-favorites?favorite_folder_name=${foldername}"><BLACKFACE>Shortcuts</BLACKFACE></A><BR>
<FONT SIZE="-1">Assign a keyboard shortcut to a favorite, or <a href="wtv-favorite:/serve-shortcut-list">view a list</a> of all shortcuts</FONT><BR>

<TR>
<TD>
<TD COLSPAN=4 HEIGHT=9 VALIGN=top ALIGN=left>
<tr>
<TD>
<td colspan=4 height=2 valign=middle align=center bgcolor="2B2B2B">
<spacer type=block width=436 height=1>
<tr>
<TD>
<td colspan=4 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=4 height=2 valign=top align=left bgcolor="0D0D0D">
<spacer type=block width=436 height=1>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<TR>
<TD>
<TD COLSPAN=2 VALIGN=top ALIGN=left>
<TD VALIGN=top ALIGN=right>
<FORM action="wtv-favorite:/serve-browser?favorite_folder_name=${foldername}">
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" Value=Done NAME="Done" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>
`;