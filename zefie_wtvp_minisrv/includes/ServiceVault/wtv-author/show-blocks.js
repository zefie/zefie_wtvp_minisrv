const minisrv_service_file = true;

const docName = request_headers.query.docName;
const page = session_data.pagestore.loadPage(docName);
const numOfBlocks = page.blocks.length
const style = page.style.replace ('_', ' ')
console.log(numOfBlocks)

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Change your Web page</TITLE>
<SCRIPT language="JavaScript">
function BlocksLoaded( firstBlock, lastBlock )
{	}
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
<table href="wtv-author:/documents"
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
<table href="wtv-author:/edit-title?docName=${docName}&titleOnly=true"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Edit title</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-author:/preview?docName=${docName}&pageNum=1"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Preview</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-author:/publish?docName=${docName}"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Publish</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Glossary&subtopic=P&page=pagebuilder"
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
<form name=onlyOnce><input type=hidden name=didIt value=0></form>
<CENTER>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=10 rowspan=100>
<tr>
<td height=44 valign=middle colspan=5>
<font size=+1 color=D1D1D1><blackface> Choose an item to change or remove it </blackface></font>
<p>
<tr>
<td width=50%>
<TABLE cellspacing=0 cellpadding=0 href="wtv-author:/choose-new-block?docName=${docName}&blockNum=${numOfBlocks}" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Add an item</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
<td width=50%>
<TABLE cellspacing=0 cellpadding=0 href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${style}#${style}" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Change page style</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
<SPACER type=block height=10>
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
<EMBED src="wtv-author:/block-preview?docName=${docName}&pageNum=1" vspace=1 hspace=1 width=394>
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
</TABLE>`
for (let i = 0; i < page.pagebreaks.length; i++) {
	data += `<CENTER>
<A href="wtv-author:/edit-block?docName=${docName}&blockNum=${page.pagebreaks[i]}" ID="B2">
<IMG src="/ROMCache/pagebreak.gif" width=398 height=35>
</A>
</CENTER>
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
<EMBED src="wtv-author:/block-preview?docName=${docName}&pageNum=${i + 2}" vspace=1 hspace=1 width=394>
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
</TABLE>`
}
data += `
<A NAME="end">
<table width=100%><tr>
<td width=50%>
<TABLE cellspacing=0 cellpadding=0 href="wtv-author:/choose-new-block?docName=${docName}&blockNum=${numOfBlocks}" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Add an item</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
<td width=50%>
<TABLE cellspacing=0 cellpadding=0 href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${style}#${style}" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Change page style</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</CENTER>
</BODY>
</HTML>`;
