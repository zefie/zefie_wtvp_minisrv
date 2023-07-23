const fs = require('fs');
var dir = "ServiceVault\\wtv-author\\clipart\\Sports\\Baseball"
var files = fs.readdirSync(dir)
var start = 12;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

console.log(files)

data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery</TITLE>
<SCRIPT language="JavaScript">
function AddToClipbook()
{	document.theForm.submit();
open();
}
function GoBackToUrl(gvnStr) {
foundInBackList = false;
for (i=history.length-1; i >= 0; i--) {	if (history[i].indexOf(gvnStr) != -1) {	foundInBackList = true;
break;
}
}
if (foundInBackList) {	history.go(i-history.length+1);
return true;
}
else
return false;
}
function DoDone()
{	GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-author:clipbook-categories?addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3DWebDD9%26blockNum%3D13%26blockClass%3D23"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Index</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href=javascript:void(DoDone())
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Done</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
>
<form action="wtv-author:/clipbook-setLastPage">
<input type=hidden name="pageNum" value="2" autosubmit=onEnter>
<input type=hidden name=mediaCategoryID value="51">
</form>
<table cellspacing=0 cellpadding=0 width=100%>
<tr>
<td height=44 width=206 valign=middle>
<font size=+1 color=D1D1D1><blackface> Art Gallery </blackface></font>
<td align=right valign=middle>
<table valign=middle>
<tr>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:clipbook?addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3DWebDD9%26blockNum%3D13%26blockClass%3D23&mediaCategoryID=51&pageNum=1#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>2 of 2</B></font></td>
<td>
<table cellspacing=0 cellpadding=0 id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button_dim.gif">
</table>
</td>
</tr>
</table>
<tr>
<td colspan=2>
Sports
:
Baseball
<tr>
<td height=10>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose an image to add to your Web page </font>
</table>
<CENTER>
<TABLE cellspacing=0 cellpadding=0 align=center>
<TR height=8>
<TD width=10 height=8></TD>
<TD bgcolor=#8A99B0 width=2 rowspan=7></TD>
<TD width=10 background=wtv-author:/ROMCache/horiz_line.gif>
<IMG src=wtv-author:/ROMCache/left_arrow.gif> </TD>
<TD valign=middle height=8 background=wtv-author:/ROMCache/horiz_line.gif>
<spacer type=block height=1 width=1></TD>
<TD width=10 align=right background=wtv-author:/ROMCache/horiz_line.gif>
<IMG src=wtv-author:/ROMCache/right_arrow.gif> </TD>
<TD bgcolor=#8A99B0 width=2 rowspan=7></TD>
<TD width=10></TD>
</TR>
<TR height=2>
<TD bgcolor=#8A99B0 height=2 colspan=7></TD>
</TR>
<TR height=10>
<TD absheight=10 width=10 valign=top background=wtv-author:/ROMCache/vert_line.gif>
<IMG src=wtv-author:/ROMCache/up_arrow.gif> </TD>
<TD colspan=3 rowspan=3 align=center>
<table cellspacing=14 cellpadding=0 background="/ROMCache/light_blue_tile.gif">
<tr>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start]}">
<img src="clipart/icons/Sports/Baseball/${files[start]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 1]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 1]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 1]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 2]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 2]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 2]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 3]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 3]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 3]}" width=64 height=64>
</td>
<tr>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 4]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 4]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 4]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 5]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 5]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 5]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 6]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 6]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 6]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 7]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 7]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 7]}" width=64 height=64>
</td>
<tr>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 8]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 8]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 8]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 9]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 9]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 9]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 10]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 10]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 10]}" width=64 height=64>
</td>
<td border=1 width=64 align=center valign=middle
href="wtv-author:/add-media-to-block?docName=WebDD9&blockNum=13&blockClass=23&mediaPath=clipart%2FSports%2FBaseball%2F${files[start + 11]}&thumbnailPath=clipart%2Ficons%2FSports%2FBaseball%2F${files[start + 11]}">
<img src="clipart/icons/Sports/Baseball/${files[start + 11]}" width=64 height=64>
</td>
</table>
</TD>
</TR>
<TR>
<TD align=center width=10 background=wtv-author:/ROMCache/vert_line.gif></TD>
</TR>
<TR height=10>
<TD absheight=10 width=10 valign=bottom background=wtv-author:/ROMCache/vert_line.gif><IMG src=wtv-author:/ROMCache/down_arrow.gif> </TD>
<TD width=10></TD>
</TR>
<TR height=2>
<TD bgcolor=#8A99B0 height=2 colspan=7></TD>
</TR>
<TR height=8>
<TD height=8></TD>
</TR>
</TABLE>
</CENTER>
</BODY>
</HTML>`