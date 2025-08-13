const minisrv_service_file = true;

const docName = request_headers.query.docName;
const page = session_data.pagestore.loadPage(docName);

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

if (request_headers.query.publishing == "true") {
	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Title & Description</TITLE>
<DISPLAY skipback>
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
<form name=theForm action="wtv-author:save-title">
<TABLE BORDER=0 CELLSPACING=0 CELLPADDING=0 height=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td><td abswidth=10 rowspan=100>
<tr>
<td absheight=5>
<tr>
<td valign=top colspan=2>
<font size=+1 color=D1D1D1><blackface>
Title and description for your page
</blackface></font>
<p>
<font color=AEBFD1>
Before publishing your page to the Web, you may wish to confirm
its title and description.<P>
The title appears at the top of your page, if you've chosen to show it. The title and description appear in the list of your
pages.
</font>
<tr>
<td>
<tr>
<td valign=top align=left colspan=2>
<input name=docName type=hidden value=${docName}>
<input name=hideTitle type=hidden value=${!page.showtitle}>
<input name=returnPageURL type=hidden value="wtv-author:/publish?docName=${docName}&amp;publishStage=1">
<font color=AEBFD1>Type your page's title:</font><spacer type=vertical size=3><br></spacer>
<input type=text name="docTitle" bgcolor=192133 text=CACA4A font=proportional value="${page.title}" SIZE=28 MAXLENGTH=64 COLS=45 autoactivate selected>
<tr><td height=0>
<tr>
<td valign=top align=left colspan=2>
<font color=AEBFD1>Type your page's description:</font><spacer type=vertical size=3><br></spacer>
<TEXTAREA name="docDesc" bgcolor=192133 cursor=#cc9933 text=CACA4A font=proportional value="${page.description}"
cols=45 rows=4 MAXLENGTH=128></TEXTAREA>
</font>
<tr>
<td>
<td align=center>
<TABLE cellspacing=0 cellpadding=0 href="javascript:document.theForm.submit()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Continue</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</form>
</BODY>
</HTML>
`
} else if (request_headers.query.titleOnly == "true") {
	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Title</TITLE>
<script language="Javascript">
function SetHideTitle(boxChecked)
{	if (boxChecked)
document.theForm.hideTitle.value="false";
else
document.theForm.hideTitle.value="true";
}
</script>
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
<table href="wtv-guide:/help?topic=Publish&subtopic=Index"
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
<form name=theForm action="wtv-author:save-title">
<TABLE BORDER=0 CELLSPACING=0 CELLPADDING=0 height=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td><td abswidth=10 rowspan=100>
<tr>
<td absheight=5>
<tr>
<td valign=top colspan=2>
<font size=+1 color=D1D1D1><blackface>
Title for your page
</blackface></font>
<p>
<font color=AEBFD1>
The title appears at the top of your page (if you choose to show it)
as well as in the list of your pages.
</font>
<tr>
<td>
<tr>
<td valign=top align=left colspan=2>
<input name=docName type=hidden value=${docName}>
<input name=docDesc type=hidden value="${page.description}">
<input name=returnPageURL type=hidden value="wtv-author:/show-blocks?docName=${docName}">
<font color=AEBFD1>Type your page's title:</font><spacer type=vertical size=3><br></spacer>
<input type=text name="docTitle" bgcolor=192133 text=CACA4A font=proportional value="${page.title}" SIZE=28 MAXLENGTH=64 COLS=45 autoactivate selected>
<tr><td height=0>
<tr><td colspan=2>
<input type=hidden name="hideTitle" value="">
<input type=checkbox value=${!page.showtitle} `
if (page.showtitle == true)
	data += "checked"
data += `
onChange="SetHideTitle(this.checked)">
Show this title on your page <tr><td height=5%>
<tr><td height=5%>
<tr>
<td>
<td align=center>
<TABLE cellspacing=0 cellpadding=0 href="javascript:document.theForm.submit()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Done</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</form>
</BODY>
</HTML>
`
} else {
	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Title & Description</TITLE>
<script language="Javascript">
function SetHideTitle(boxChecked)
{	if (boxChecked)
document.theForm.hideTitle.value="false";
else
document.theForm.hideTitle.value="true";
}
</script>
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
<table href="wtv-guide:/help?topic=Publish&subtopic=Index"
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
<form name=theForm action="wtv-author:save-title">
<TABLE BORDER=0 CELLSPACING=0 CELLPADDING=0 height=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td><td abswidth=10 rowspan=100>
<tr>
<td absheight=5>
<tr>
<td valign=top colspan=2>
<font size=+1 color=D1D1D1><blackface>
Title and description for your page
</blackface></font>
<p>
<font color=AEBFD1>
The title appears at the top of your page, if you've chosen to show it. The title and description appear in the list of your
pages.
</font>
<tr>
<td>
<tr>
<td valign=top align=left colspan=2>
<input name=docName type=hidden value=${docName}>
<input name=returnPageURL type=hidden value="${request_headers.query.returnPageURL}">
<font color=AEBFD1>Type your page's title:</font><spacer type=vertical size=3><br></spacer>
<input type=text name="docTitle" bgcolor=192133 text=CACA4A font=proportional value="${page.title}" SIZE=28 MAXLENGTH=64 COLS=45 autoactivate selected>
<tr><td height=0>
<tr>
<td valign=top align=left colspan=2>
<font color=AEBFD1>Type your page's description:</font><spacer type=vertical size=3><br></spacer>
<TEXTAREA name="docDesc" bgcolor=192133 cursor=#cc9933 text=CACA4A font=proportional value="${page.description}"
cols=45 rows=4 MAXLENGTH=128></TEXTAREA>
</font>
<tr>
<td colspan=2>
<input type=hidden name="includeInPublicList" value="true">
<input type=checkbox value=true checked
onClick="document.theForm.includeInPublicList.value=this.checked">
Include this page in your public list of pages
<tr>
<td height=5>
<tr><td height=5%>
<tr>
<td>
<td align=center>
<TABLE cellspacing=0 cellpadding=0 href="javascript:document.theForm.submit()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Done</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</form>
</BODY>
</HTML>
`
}