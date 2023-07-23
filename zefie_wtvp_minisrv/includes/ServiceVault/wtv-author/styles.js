var minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

var styleName = request_headers.query.styleName
var page = request_headers.query.pageNum
var docName = request_headers.query.docName
if (styleName) {
	switch(page) {
		case "1":
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
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=0#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>2 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=2#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<font color=AEBFD1> Your current style is: <b>${styleName}</b> </font>
<tr>
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=
Blue.tmpl&contentTMPL=&styleName=Blue
&blocksPerPage=0"
name="Blue
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Blue
<BR>
</font>
<center>
<img src=/images/styles/blue.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Green.tmpl&contentTMPL=&styleName=Green
&blocksPerPage=0"
name="Green
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Green
<BR>
</font>
<center>
<img src=/images/styles/green.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Red.tmpl&contentTMPL=&styleName=Red
&blocksPerPage=0"
name="Red
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Red
<BR>
</font>
<center>
<img src=/images/styles/red.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Brown_Spots.tmpl&contentTMPL=&styleName=Tan
&blocksPerPage=0"
name="Tan
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Tan
<BR>
</font>
<center>
<img src=/images/styles/brown_spots.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Grey.tmpl&contentTMPL=&styleName=Grey
&blocksPerPage=0"
name="Grey
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Grey
<BR>
</font>
<center>
<img src=/images/styles/grey.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Rivets.tmpl&contentTMPL=&styleName=Rivets
&blocksPerPage=0"
name="Rivets
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Rivets
<BR>
</font>
<center>
<img src=/images/styles/rivets.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		case "2":
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
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=1#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>3 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=3#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<font color=AEBFD1> Your current style is: <b>${styleName}</b> </font>
<tr>
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=
Football.tmpl&contentTMPL=&styleName=Football
&blocksPerPage=0"
name="Football
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Football
<BR>
</font>
<center>
<img src=/images/styles/football.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Baseball.tmpl&contentTMPL=&styleName=Baseball
&blocksPerPage=0"
name="Baseball
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Baseball
<BR>
</font>
<center>
<img src=/images/styles/baseball.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=xmas.tmpl&contentTMPL=&styleName=Christmas
&blocksPerPage=0"
name="Christmas
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Christmas
<BR>
</font>
<center>
<img src=/images/styles/xmas.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Channukah.tmpl&contentTMPL=&styleName=Channukah
&blocksPerPage=0"
name="Channukah
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Channukah
<BR>
</font>
<center>
<img src=/images/styles/channukah.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Easter.tmpl&contentTMPL=&styleName=Easter
&blocksPerPage=0"
name="Easter
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Easter
<BR>
</font>
<center>
<img src=/images/styles/easter.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Halloween.tmpl&contentTMPL=&styleName=Halloween
&blocksPerPage=0"
name="Halloween
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Halloween
<BR>
</font>
<center>
<img src=/images/styles/halloween.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		case "3":
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
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=2#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>4 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=4#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<font color=AEBFD1> Your current style is: <b>${styleName}</b> </font>
<tr>
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=
Democratic.tmpl&contentTMPL=&styleName=Democratic
&blocksPerPage=0"
name="Democratic
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Democratic
<BR>
</font>
<center>
<img src=/images/styles/democratic.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Republican.tmpl&contentTMPL=&styleName=Republican
&blocksPerPage=0"
name="Republican
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Republican
<BR>
</font>
<center>
<img src=/images/styles/republican.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Flowers.tmpl&contentTMPL=&styleName=Flowers
&blocksPerPage=0"
name="Flowers
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Flowers
<BR>
</font>
<center>
<img src=/images/styles/flowers.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Itsagirl.tmpl&contentTMPL=&styleName=It's a Girl
&blocksPerPage=0"
name="It's a Girl
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
It's a Girl
<BR>
</font>
<center>
<img src=/images/styles/itsagirl.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Itsaboy.tmpl&contentTMPL=&styleName=It's a Boy
&blocksPerPage=0"
name="It's a Boy
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
It's a Boy
<BR>
</font>
<center>
<img src=/images/styles/itsaboy.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Wedding.tmpl&contentTMPL=&styleName=Wedding
&blocksPerPage=0"
name="Wedding
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Wedding
<BR>
</font>
<center>
<img src=/images/styles/wedding.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		case "4":
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
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=3#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>5 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=5#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<font color=AEBFD1> Your current style is: <b>${styleName}</b> </font>
<tr>
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=
1983.tmpl&contentTMPL=&styleName=New Wave
&blocksPerPage=0"
name="New Wave
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
New Wave
<BR>
</font>
<center>
<img src=/images/styles/1983.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Eyeballs.tmpl&contentTMPL=&styleName=Eyeballs
&blocksPerPage=0"
name="Eyeballs
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Eyeballs
<BR>
</font>
<center>
<img src=/images/styles/eyeballs.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=usflag.tmpl&contentTMPL=&styleName=American
&blocksPerPage=0"
name="American
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
American
<BR>
</font>
<center>
<img src=/images/styles/us_flag.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=southbeach.tmpl&contentTMPL=&styleName=South Beach
&blocksPerPage=0"
name="South Beach
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
South Beach
<BR>
</font>
<center>
<img src=/images/styles/south_beach.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=paisley.tmpl&contentTMPL=&styleName=Paisley
&blocksPerPage=0"
name="Paisley
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Paisley
<BR>
</font>
<center>
<img src=/images/styles/spirals.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Green_Paper.tmpl&contentTMPL=&styleName=Green Paper
&blocksPerPage=0"
name="Green Paper
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Green Paper
<BR>
</font>
<center>
<img src=/images/styles/light_green_paper.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		case "5":
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
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=4#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>6 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
><tr><td><img src="wtv-author:/ROMCache/plus_button_dim.gif">
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
<font color=AEBFD1> Your current style is: <b>${styleName}</b> </font>
<tr>
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=
Water.tmpl&contentTMPL=&styleName=${styleName}
&blocksPerPage=0"
name="Water
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Water
<BR>
</font>
<center>
<img src=/images/styles/water.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=marble.tmpl&contentTMPL=&styleName=Marble
&blocksPerPage=0"
name="Marble
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Marble
<BR>
</font>
<center>
<img src=/images/styles/marble.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Business.tmpl&contentTMPL=&styleName=Finance&blocksPerPage=0"
name="Finance"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Finance<BR>
</font>
<center>
<img src=/images/styles/business.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		default:
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
><tr><td><img src="wtv-author:/ROMCache/minus_button_dim.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>1 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=${docName}&styleName=${styleName}&pageNum=1#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<font color=AEBFD1> Your current style is: <b>${styleName}</b> </font>
<tr>
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Blue_Sands.tmpl&contentTMPL=&styleName=Blue Sands
&blocksPerPage=0"
name="Blue Sands
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Blue Sands
<BR>
</font>
<center>
<img src=/images/styles/blue_sands.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Ocean.tmpl&contentTMPL=&styleName=Ocean
&blocksPerPage=0"
name="Ocean
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Ocean
<BR>
</font>
<center>
<img src=/images/styles/oceanic.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Space.tmpl&contentTMPL=&styleName=Space
&blocksPerPage=0"
name="Space
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Space
<BR>
</font>
<center>
<img src=/images/styles/space.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=ringbinder.tmpl&contentTMPL=&styleName=Ringbinder
&blocksPerPage=0"
name="Ringbinder
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Ringbinder
<BR>
</font>
<center>
<img src=/images/styles/ringbinder.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Stone.tmpl&contentTMPL=&styleName=Stone
&blocksPerPage=0"
name="Stone
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Stone
<BR>
</font>
<center>
<img src=/images/styles/stone.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="save-style?docName=${docName}
&layoutTMPL=Cats.tmpl&contentTMPL=&styleName=Cats
&blocksPerPage=0"
name="Cats
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Cats
<BR>
</font>
<center>
<img src=/images/styles/catz.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`;
break;
	}
} else {
	switch(page) {	
		case "1":
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
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=0#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>2 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=2#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=
Blue.tmpl&contentTMPL=&styleName=Blue
&blocksPerPage=0"
name="Blue
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Blue
<BR>
</font>
<center>
<img src=/images/styles/blue.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Green.tmpl&contentTMPL=&styleName=Green
&blocksPerPage=0"
name="Green
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Green
<BR>
</font>
<center>
<img src=/images/styles/green.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Red.tmpl&contentTMPL=&styleName=Red
&blocksPerPage=0"
name="Red
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Red
<BR>
</font>
<center>
<img src=/images/styles/red.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Brown_Spots.tmpl&contentTMPL=&styleName=Tan
&blocksPerPage=0"
name="Tan
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Tan
<BR>
</font>
<center>
<img src=/images/styles/brown_spots.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Grey.tmpl&contentTMPL=&styleName=Grey
&blocksPerPage=0"
name="Grey
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Grey
<BR>
</font>
<center>
<img src=/images/styles/grey.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Rivets.tmpl&contentTMPL=&styleName=Rivets
&blocksPerPage=0"
name="Rivets
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Rivets
<BR>
</font>
<center>
<img src=/images/styles/rivets.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		case "2":
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
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=1#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>3 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=3#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=
Football.tmpl&contentTMPL=&styleName=Football
&blocksPerPage=0"
name="Football
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Football
<BR>
</font>
<center>
<img src=/images/styles/football.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Baseball.tmpl&contentTMPL=&styleName=Baseball
&blocksPerPage=0"
name="Baseball
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Baseball
<BR>
</font>
<center>
<img src=/images/styles/baseball.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=xmas.tmpl&contentTMPL=&styleName=Christmas
&blocksPerPage=0"
name="Christmas
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Christmas
<BR>
</font>
<center>
<img src=/images/styles/xmas.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Channukah.tmpl&contentTMPL=&styleName=Channukah
&blocksPerPage=0"
name="Channukah
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Channukah
<BR>
</font>
<center>
<img src=/images/styles/channukah.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Easter.tmpl&contentTMPL=&styleName=Easter
&blocksPerPage=0"
name="Easter
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Easter
<BR>
</font>
<center>
<img src=/images/styles/easter.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Halloween.tmpl&contentTMPL=&styleName=Halloween
&blocksPerPage=0"
name="Halloween
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Halloween
<BR>
</font>
<center>
<img src=/images/styles/halloween.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		case "3":
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
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=2#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>4 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=4#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=
Democratic.tmpl&contentTMPL=&styleName=Democratic
&blocksPerPage=0"
name="Democratic
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Democratic
<BR>
</font>
<center>
<img src=/images/styles/democratic.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Republican.tmpl&contentTMPL=&styleName=Republican
&blocksPerPage=0"
name="Republican
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Republican
<BR>
</font>
<center>
<img src=/images/styles/republican.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Flowers.tmpl&contentTMPL=&styleName=Flowers
&blocksPerPage=0"
name="Flowers
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Flowers
<BR>
</font>
<center>
<img src=/images/styles/flowers.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Itsagirl.tmpl&contentTMPL=&styleName=It's a Girl
&blocksPerPage=0"
name="It's a Girl
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
It's a Girl
<BR>
</font>
<center>
<img src=/images/styles/itsagirl.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Itsaboy.tmpl&contentTMPL=&styleName=It's a Boy
&blocksPerPage=0"
name="It's a Boy
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
It's a Boy
<BR>
</font>
<center>
<img src=/images/styles/itsaboy.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Wedding.tmpl&contentTMPL=&styleName=Wedding
&blocksPerPage=0"
name="Wedding
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Wedding
<BR>
</font>
<center>
<img src=/images/styles/wedding.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		case "4":
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
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=3#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>5 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=5#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=
1983.tmpl&contentTMPL=&styleName=New Wave
&blocksPerPage=0"
name="New Wave
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
New Wave
<BR>
</font>
<center>
<img src=/images/styles/1983.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Eyeballs.tmpl&contentTMPL=&styleName=Eyeballs
&blocksPerPage=0"
name="Eyeballs
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Eyeballs
<BR>
</font>
<center>
<img src=/images/styles/eyeballs.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=usflag.tmpl&contentTMPL=&styleName=American
&blocksPerPage=0"
name="American
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
American
<BR>
</font>
<center>
<img src=/images/styles/us_flag.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=southbeach.tmpl&contentTMPL=&styleName=South Beach
&blocksPerPage=0"
name="South Beach
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
South Beach
<BR>
</font>
<center>
<img src=/images/styles/south_beach.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=paisley.tmpl&contentTMPL=&styleName=Paisley
&blocksPerPage=0"
name="Paisley
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Paisley
<BR>
</font>
<center>
<img src=/images/styles/spirals.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Green_Paper.tmpl&contentTMPL=&styleName=Green Paper
&blocksPerPage=0"
name="Green Paper
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Green Paper
<BR>
</font>
<center>
<img src=/images/styles/light_green_paper.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		case "5":
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
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=4#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>6 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
><tr><td><img src="wtv-author:/ROMCache/plus_button_dim.gif">
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
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=
Water.tmpl&contentTMPL=&styleName=Water
&blocksPerPage=0"
name="Water
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Water
<BR>
</font>
<center>
<img src=/images/styles/water.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=marble.tmpl&contentTMPL=&styleName=Marble
&blocksPerPage=0"
name="Marble
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Marble
<BR>
</font>
<center>
<img src=/images/styles/marble.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=11
&layoutTMPL=Business.tmpl&contentTMPL=&styleName=Finance&blocksPerPage=0"
name="Finance"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Finance<BR>
</font>
<center>
<img src=/images/styles/business.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>
`
		break;
		
		default:
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
><tr><td><img src="wtv-author:/ROMCache/minus_button_dim.gif">
</table>
</td>
<td align=center><font color=D1D1D1><B>1 of 6</B></font></td>
<td>
<table cellspacing=0 cellpadding=0
href="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=1#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">
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
<td absheight=5>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=
&layoutTMPL=Blue_Sands.tmpl&contentTMPL=&styleName=Blue Sands
&blocksPerPage=0"
name="Blue Sands
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Blue Sands
<BR>
</font>
<center>
<img src=/images/styles/blue_sands.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=
&layoutTMPL=Ocean.tmpl&contentTMPL=&styleName=Ocean
&blocksPerPage=0"
name="Ocean
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Ocean
<BR>
</font>
<center>
<img src=/images/styles/oceanic.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=
&layoutTMPL=Space.tmpl&contentTMPL=&styleName=Space
&blocksPerPage=0"
name="Space
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Space
<BR>
</font>
<center>
<img src=/images/styles/space.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<tr>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=
&layoutTMPL=ringbinder.tmpl&contentTMPL=&styleName=Ringbinder
&blocksPerPage=0"
name="Ringbinder
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Ringbinder
<BR>
</font>
<center>
<img src=/images/styles/ringbinder.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=
&layoutTMPL=Stone.tmpl&contentTMPL=&styleName=Stone
&blocksPerPage=0"
name="Stone
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Stone
<BR>
</font>
<center>
<img src=/images/styles/stone.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
<td>
<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
<TR height=120>
<TD width=128 height=120 bgcolor=#8A99B0
href="new?tmplClass=
&layoutTMPL=Cats.tmpl&contentTMPL=&styleName=Cats
&blocksPerPage=0"
name="Cats
"
>
<spacer type=block width=4></spacer>
<font color=0F283F>
Cats
<BR>
</font>
<center>
<img src=/images/styles/catz.gif width="120" height="90" vspace=3>
</center>
</TD>
<TD height=120><IMG height=120 width=12 src=/ROMCache/right_shadow.gif></TD>
</TR>
<TR>
<TD width=128><IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif></TD>
<TD><IMG height=12 width=12 src=/ROMCache/corner_shadow.gif></TD>
</TR>
</TABLE>
</td>
</table>
</BODY>
</HTML>`
		break;
	}
}