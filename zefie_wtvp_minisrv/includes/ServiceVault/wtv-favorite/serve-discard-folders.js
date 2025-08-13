const minisrv_service_file = true;

const folder_array = session_data.favstore.getFolders();
const totalfavorites = folder_array.length;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`


data = `<HTML>
<HEAD>
<TITLE>
Remove folders
</TITLE>
<DISPLAY>
</HEAD>
<body bgcolor="#191919" text="#44cc55" link="#FFE99B" vlink="#FFE99B" fontsize="medium" vspace=0 hspace=0>
<sidebar width=109 height=384>
<tr><td absheight=384>
<table cellspacing=0 cellpadding=0 bgcolor=284a52>
<tr><td valign=top absheight=196>
<table cellspacing=0 cellpadding=0 absheight=196>
<tr>
<td valign=top width=100% height=50%>
<table cellspacing=0 cellpadding=0>
<tr>
<td colspan=3 width=100% absheight=1>
<tr>
<td abswidth=6>
<td width=100% align=center absheight=79>
<table href="wtv-home:/home" width=100% absheight=79 cellspacing=0 cellpadding=0>
<tr>
<td width=100% align=center>
<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width=87 height=67>
</table>
<td abswidth=5>
<tr><td colspan=3 width=100% absheight=2 bgcolor=1f3136>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td colspan=3 width=100% absheight=1>
<tr><td colspan=3 width=100% absheight=2 bgcolor=436f79>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>	<tr><td width=100% absheight=32 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=6 absheight=26>
<td width=100%><table width=100% cellspacing=0 cellpadding=0 href="wtv-favorite:/favorite">
<tr><td>
<table cellspacing=0 cellpadding=0>
<tr><td><shadow><font color=E7CE4A size=-1>
&nbsp;Favorites
</table>
</table>
<td abswidth=5>
<tr><td colspan=3 width=104 absheight=2 bgcolor=1f3136>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td absheight=1>
<tr><td colspan=3 width=104 absheight=2 bgcolor=436f79>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>
</table>
</table>
<td abswidth=5 background="ROMCache/Shadow.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td valign=top absheight=188>
<table cellspacing=0 cellpadding=0 absheight=188>
<tr><td width=100%><img src="wtv-home:/ROMCache/Spacer.gif" width=100% height=1>
<td align=right valign=bottom><img src="ROMCache/FavoritesBanner.gif" width=50 height=188>
</table>
<td abswidth=5 background="ROMCache/Shadow.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>
</sidebar>
<table width="451" cellspacing="0" cellpadding="0" bgcolor="2b2b2b">
<tbody><tr>
<td width="4" height="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td width="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td><table cellspacing="0" cellpadding="0">
<tbody><tr><td align="left">
<shadow><blackface><font size=4 color="e7ce4a">
Remove folders
</font><blackface><shadow>
</shadow></blackface></blackface></shadow></td></tr></tbody></table>
</td></tr><tr>
<td width="4" height="14"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
<form id="Discard" action="wtv-favorite:/commit-discard-folders">
<input type=hidden autosubmit=onLeave>
<table cellspacing=0 cellpadding=0>
<tr><td align=left valign=top>
<table cellspacing=0 cellpadding=0 width=225>
<tr><td width=225>
<table width=100% cellspacing=0 cellpadding=0>
<tr><td height=42 align=left valign=middle background="ROMCache/LeftTop.gif">
<table width=100% cellspacing=0 cellpadding=0>
<tr><td width=40>
<td align=center height=20>
<font size=-1>
<limittext value="${folder_array[0]}" width=140>
</font>
<td width=20>
</table>
<tr><td>
<table cellspacing=0 cellpadding=0>
<tr><td height=20>
</table>
</table>`
for (let i = 1; i < totalfavorites; i++) {
data += `<tr><td width=225>
<table width=100% cellspacing=0 cellpadding=0>
<tr><td height=42 align=left valign=middle background="ROMCache/LeftMiddleTabOnly.gif">
<table width=100% cellspacing=0 cellpadding=0>
<tr><td width=40>
<td align=center height=20>
<font size=-1>
<limittext value="${folder_array[i]}" width=140>
</font>
<td width=20>
</table>
<tr><td>
<table cellspacing=0 cellpadding=0>
<tr><td height=20>
</table>
</table>`
}
if (totalfavorites == 1)
	data += `<tr><td align=left valign=top>	</table>
<td valign=top align=left>
<table cellspacing=0 cellpadding=0 width=115><tr><td width=227 height=20 bgcolor=#2b2b2b>
<tr><td width=227>
<tr><td height=15 align=center valign=middle background="ROMCache/RightTopEdgeOnly.gif">
<tr><td height=0>
`
else
	data += `<tr><td align=left valign=top>
<table cellspacing=0 cellpadding=0>
<tr><td height=20><img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>	</table>
<td valign=top align=left>
<table cellspacing=0 cellpadding=0 width=115>
<tr><td width=227 height=20 bgcolor=#2b2b2b><img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td width=227>
<table width=100% cellspacing=0 cellpadding=0>
<tr><td height=22 align=center valign=middle background="ROMCache/RightTopEdgeOnly.gif">
<tr><td height=40>
<table cellspacing=0 cellpadding=0>
<td width=107>
<td valign=top align=center>
<font color="#E7CE4A" size=-1><shadow>
<input
type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value=Remove
name="${folder_array[0]}" usestyle
width=110>
</shadow></font>
</table>
</table>`
for (let i = 1; i < totalfavorites; i++) {
data += `
<tr><td width=227>
<table width=100% cellspacing=0 cellpadding=0>
<tr><td height=22 align=center valign=middle background="ROMCache/RightMiddleEdgeOnly.gif">
<tr><td height=40>
<table cellspacing=0 cellpadding=0>
<td width=107>
<td valign=top align=center>
<font color="#E7CE4A" size=-1><shadow>
<input
type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value=Remove
name="${folder_array[i]}" usestyle
width=110>
</shadow></font>
</table>
</table>`
}
data += `
</table>
</table>
</table>
</table>
</form>`
if (totalfavorites == 1)
	data += "<i>&nbsp;&nbsp;&nbsp;You cannot delete your last folder.</i>"
data += `
<hr width=420>
<form action="wtv-favorite:/commit-discard-folders">
<input type=hidden name=favorite-folder-name value="Personal">
<tr><td><table absheight=50 cellspacing=0 cellpadding=0>
<tr><td height=10><img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td width=330 align=center valign=center>
<td align=center valign=center>
<font color="#E7CE4A" size=-1><shadow>
<input
type=submit
useform="Discard"
borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Done"
name="ForwardToFolders"
usestyle
width=110>
</shadow></font>
<tr><td height=8><img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>
</form>
</BODY>
</HTML>
`;