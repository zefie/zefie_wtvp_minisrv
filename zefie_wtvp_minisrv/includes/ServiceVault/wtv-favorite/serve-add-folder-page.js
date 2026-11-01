const minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:/serve-
wtv-expire-all: wtv-favorite:/favorite`


data = `<HTML>
<HEAD>
<TITLE>
Add a folder
</TITLE>
<DISPLAY
>
</HEAD>
<body bgcolor="#191919" text="#44cc55" link="#FFE99B" vlink="#FFE99B" fontsize="medium" vspace=0 hspace=0>
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
<td width="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td><table cellspacing="0" cellpadding="0">
<tbody><tr><td align="left">
<shadow><blackface><font size=4 color="e7ce4a">
Add a folder
</font><blackface><shadow>
<td width=21>
<td width=13>
<spacer type=horizontal size=13>
</table>
</table>
<tr>
<td colspan=2 height=4 bgcolor=#544447>
</table>
</shadow></blackface>
</table>
<tr><table cellspacing=0 cellpadding=0 width=456 height=274 bgcolor=#191919>
<td abswidth=19>
<td><table cellspacing=0 cellpadding=0>
<tr><td absheight=10>
<tr><td>
Type the name of the new folder you want<br>
to add, and then choose <b>Add</b>.<br>
<br>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=18>
<tr><td align=right>
<form action="wtv-favorite:/commit-add-folder">
<input type=hidden name="favorite-folder-name" value="">
Folder name
<font color="#E6CD4A">
<input bgcolor=#111111 AutoCaps text=#ffdd33 cursor=#cc9933
type=text width=150
usestyle
MAXLENGTH=15
name="new_folder_name"
selected>
</font>
<img src="wtv-home:/ROMCache/Spacer.gif" width=4 height=1>
<font color="#E6CD4A"><shadow>
<input
type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value=Add name="Add" usestyle width=108>
</shadow></font>
<img src="wtv-home:/ROMCache/Spacer.gif" width=2 height=1>
</form>
<tr><td absheight=25>
<tr><td absheight=25>
<tr><td>
Or choose <b>Samples</b> to select one or<br>
more sample folders.<br>
<tr><td absheight=18>
<tr><td align=right>
<form action=wtv-favorite:/serve-samples-page>
<input type=hidden name="favorite-folder-name" value="">
<font color="#E6CD4A"><shadow>
<input
type=submit	borderimage="file://ROM/Borders/ButtonBorder2.bif" value=Samples name="Samples"
nosubmit usestyle width=108>
</shadow></font>
<img src="wtv-home:/ROMCache/Spacer.gif" width=14 height=1>
</form>
<tr><td absheight=12>
</table>
</table>
</table>
</table> </BODY>
</HTML>
`;