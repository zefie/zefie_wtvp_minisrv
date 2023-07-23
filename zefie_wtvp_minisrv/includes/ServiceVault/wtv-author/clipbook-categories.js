var minisrv_service_file = true;

var docName = request_headers.query.docName
var blockNum = request_headers.query.blockNum
var blockClass = request_headers.query.blockClass
var category = request_headers.query.mediaCategoryID

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

switch(category) {
	case "0":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>Animals
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=0&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Birds & Bees
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=1&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Cats & Dogs
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=2&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Farm Animals
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=3&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Fish & Sealife
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=4&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Horses
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=5&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Insects & Reptiles
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=6&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Prehistoric
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=7&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Wildlife
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	
	case "10":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>Food
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=17&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Beverages
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=18&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Desserts
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=19&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Fruit
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=20&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Meats
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=21&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Other
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=22&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Vegetables
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	
	case "11":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>Household Objects
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=23&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Appliances
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=24&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Bath
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=25&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Clothing
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=26&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Electronics
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=27&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Furniture
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=28&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Garden
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=29&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Kids' Stuff
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=30&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Kitchen
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=31&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Miscellaneous
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=32&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Office
</B></font></a>
</td>
</tr>
</table></td>
<td valign=top><table cellspacing=0 cellpadding=3>	<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=33&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Tools
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	
	case "17":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>Nature
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=39&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Flowers
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=40&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Foliage
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=41&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Other
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=42&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Scenic
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=43&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Weather
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	
	case "18":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>People
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=44&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Abstract
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=45&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Cartoon
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=46&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Realistic
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=47&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Silhouettes
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	
	case "19":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>Special Occasions
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=48&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Celebrate
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=49&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Holidays
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=50&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Wedding
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	
	case "20":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>Sports
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=51&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Baseball
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=52&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Basketball
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=53&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Football
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=54&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Golf
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=55&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Other
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=56&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Soccer
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=57&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Water
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=58&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Winter
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=59&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Workout
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	
	case "22":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>Transportation
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=61&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Air
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=62&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Land
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=63&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Sea
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	
	case "23":
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
<B>Travel
</B>
</font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=3>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=64&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>City Scenes
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=65&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Domestic
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=66&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>International
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=67&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Landmarks
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=68&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Luggage & Docs
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
	default:
	data = `<HTML>
<HEAD>
<SCRIPT language=JavaScript>
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
{	//history.go(-1);
GoBackToUrl("wtv-author:/edit-block");
}
</SCRIPT>
<DISPLAY fontsize=medium>
<TITLE>Art Gallery Categories</TITLE>
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
<table href=javascript:DoDone()
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td rowspan=100 abswidth=15><td><td><td rowspan=100 abswidth=15>
<tr>
<td height=44 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Art Gallery Categories </blackface></font>
<tr>
<td colspan=2 height=30>
<font color=AEBFD1> Choose a category of
art </font>
<tr><td absheight=6>
<tr><td valign=top>
<table cellspacing=0 cellpadding=1>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=0&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Animals
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=8&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Animations
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=9&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Arrows & Hands
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=10&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Business
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=11&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Careers
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=12&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Decorative
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=13&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Dino Letters
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=14&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Education
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=15&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Entertainment
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=16&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Flags
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=10&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Food
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=11&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Household Objects
</B></font></a>
</td>
</tr>
</table></td>
<td valign=top><table cellspacing=0 cellpadding=1>	<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=34&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Industrial Objects
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=35&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Infants & Kids
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=36&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Maps & Globes
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=37&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Medical
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=38&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Music
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=17&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Nature
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=18&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>People
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=19&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Special Occasions
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=20&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Sports
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook?mediaCategoryID=60&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Symbols
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=22&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Transportation
</B></font></a>
</td>
</tr>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:clipbook-categories?mediaCategoryID=23&addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D${blockNum}%26blockClass%3D23&docName=${docName}&blockNum=${blockNum}
><font effect=shadow><B>Travel
</B></font></a>
</td>
</tr>
</table>
</BODY>
</HTML>
`
	break;
}