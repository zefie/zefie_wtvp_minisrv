const minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`;

const styleName = request_headers.query.styleName;
let page = (request_headers.query.pageNum) ? parseInt(request_headers.query.pageNum) : 0
const docName = request_headers.query.docName;

const pages = [
	[
	    //   Name,        TMPL,          GIF
		["Blue Sands", "Blue_Sands", "blue_sands"],
		["Ocean", "Ocean", "oceanic"],
		["Space", "Space", "space"],
		["Ringbinder", "ringbinder", "ringbinder"],
		["Stone", "Stone", "stone"],
		["Cats", "Cats", "catz"]
	],
	[
		["Blue", "Blue", "blue"],
		["Green", "Green", "green"],
		["Red", "Red", "red"],
		["Brown Spots", "Brown_Spots", "brown_spots"],
		["Grey", "Grey", "grey"],
		["Rivets", "Rivets", "rivets"]
	],
	[
		["Football", "Football", "football"],
		["Baseball", "Baseball", "baseball"],
		["Christmas", "xmas", "xmas"],
		["Channukah", "Channukah", "channukah"],
		["Easter", "Easter", "easter"],
		["Halloween", "Halloween", "halloween"]
	],
	[
		["Democratic", "Democratic", "democratic"],
		["Republican", "Republican", "republican"],
		["Flowers", "Flowers", "flowers"], 
		["It's a Girl", "Itsagirl", "itsagirl"],
		["It's a Boy", "Itsaboy", "itsaboy"],
		["Wedding", "Wedding", "wedding"]
	],
	[
		["New Wave", "1983", "1983"],
		["Eyeballs", "Eyeballs", "eyeballs"],
		["America", "usflag", "us_flag"],
		["South Beach", "southbeach", "south_beach"],
		["Paisley", "paisley", "spirals"],
		["Green Paper", "Green_Paper", "light_green_paper"]
	],
	[
		["Water", "Water", "water"],
		["Marble", "marble", "marble"],
		["Finance", "Business", "business"]
	]	
];

if (page >= pages.length) page = pages.length - 1; // max page
if (page < 0) page = 0 // min page

const currentPage = pages[page];

data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Select a page style</TITLE>
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
<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width=87 height=67>
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
<table cellspacing=0 cellpadding=0 width=100%>
<tr>
<td abswidth=10 rowspan=100>
<tr>
<td height=44 width=206 valign=middle colspan=2>
<font size=+1 color=D1D1D1><blackface> Choose a page style </blackface></font>
<td align=right valign=middle>
<table valign=middle>
<tr>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${wtvshared.escape(styleName)}&pageNum=${(page > 0) ? (page - 1) : (pages.length - 1)}#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>${page + 1} of ${pages.length}</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${wtvshared.escape(styleName)}&pageNum=${(page+1 < pages.length) ? (page + 1) : 0}#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
</table>
</td>
</tr>
</table>
<tr>
<td absheight=5>
<tr>
<td colspan=5><font color=AEBFD1> You can change the style at any time without losing your text or images.
</font>
<tr>
<td absheight=10>
<tr>
<td colspan=5>
${(styleName) ? `<font color=AEBFD1> Your current style is: <b>${styleName}</b> </font>` : ''}
<tr>
<td absheight=5>
<tr>
`;

for (let i = 0; i < currentPage.length; i++) {
	if (i % 3 === 0) data += `<tr>`
	data += `
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0 href="${(styleName) ? `save-style` : `new`}?docName=${docName}&layoutTMPL=${currentPage[i][1]}.tmpl&contentTMPL=&styleName=${currentPage[i][0]}&blocksPerPage=0" name="${currentPage[i][0]}">
<spacer type=block width=4></spacer>
<font color=0F283F>
${currentPage[i][0]}
<BR>
</font>
<center>
<img src=/images/styles/${currentPage[i][2]}.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>`
}

data += `</table>
</BODY>
</HTML>
`;