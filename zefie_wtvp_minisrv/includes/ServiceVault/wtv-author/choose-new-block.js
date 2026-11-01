const minisrv_service_file = true;

const docName = request_headers.query.docName
const numOfBlocks = request_headers.query.blockNum;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Add an item</TITLE>
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
<TABLE BORDER=0 CELLSPACING=0 CELLPADDING=0
>
<tr>
<td abswidth=10 rowspan=100>
<tr>
<td height=44 valign=middle>
<font size=+1 color=D1D1D1><blackface> Add an item to your page </blackface></font>
<tr>
<td valign=top colspan=6>
<font color=AEBFD1>
Choose the type of item to add:
</font>
<tr>
<td absheight=23>
<tr>
<td valign=top align=center width=100%>
<TABLE cellspacing=0 cellpadding=0 width=358 height=218>
<TR height=113 valign=top>
<TD href=wtv-author:/add-block?docName=${docName}&blockNum=${numOfBlocks}&blockClass=23><IMG src="/ROMCache/new_pict.gif" width=102 height=89>
<TD width=30><IMG src="/ROMCache/new_shadow-right.gif">
<TD href=wtv-author:/add-block?docName=${docName}&blockNum=${numOfBlocks}&blockClass=21><IMG src="/ROMCache/new_text.gif" width=102 height=89>
<TD width=30><IMG src="/ROMCache/new_shadow-right.gif">
<TD href=wtv-author:/add-block?docName=${docName}&blockNum=${numOfBlocks}&blockClass=25><IMG src="/ROMCache/new_links.gif" width=102 height=89>
<TD width=30><IMG src="/ROMCache/new_shadow-right.gif">
<TR>
<TD colspan=2 height=30 valign=top><IMG src="/ROMCache/new_shadow-bottom.gif" width=115 height=15>
<TD colspan=2 height=30 valign=top><IMG src="/ROMCache/new_shadow-bottom.gif" width=115 height=15>
<TD colspan=2 height=30 valign=top><IMG src="/ROMCache/new_shadow-bottom.gif" width=115 height=15>
<TR height=113 valign=top>
<TD href=wtv-author:/add-block?docName=${docName}&blockNum=${numOfBlocks}&blockClass=24><IMG src="/ROMCache/new_list.gif" width=102 height=89>
<TD width=30><IMG src="/ROMCache/new_shadow-right.gif">
<TD href=wtv-author:/add-block?docName=${docName}&blockNum=${numOfBlocks}&blockClass=27><IMG src="/ROMCache/new_pagebreak.gif" width=102 height=89>
<TD width=30><IMG src="/ROMCache/new_shadow-right.gif">
<TD href=wtv-author:/add-block?docName=${docName}&blockNum=${numOfBlocks}&blockClass=26><IMG src="/ROMCache/new_heading.gif" width=102 height=89>
<TD width=30><IMG src="/ROMCache/new_shadow-right.gif">
<TR>
<TD colspan=2><IMG src="/ROMCache/new_shadow-bottom.gif" width=115 height=15>
<TD colspan=2><IMG src="/ROMCache/new_shadow-bottom.gif" width=115 height=15>
<TD colspan=2><IMG src="/ROMCache/new_shadow-bottom.gif" width=115 height=15>
</TABLE>
</table>
</BODY>
</HTML>`