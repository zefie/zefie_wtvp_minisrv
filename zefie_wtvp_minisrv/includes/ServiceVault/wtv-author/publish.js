const minisrv_service_file = true;

const docName = request_headers.query.docName;
const page = session_data.pagestore.loadPage(docName);
const site = session_data.pagestore.getPublishDomain();

if (request_headers.query.publishStage == "1") {
	headers = `200 OK
Content-Type: text/html`

	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Ready to publish</TITLE>
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
<form name=theForm action="wtv-author:/publish">
<input name=docName type=hidden value=${docName}>
<input type=hidden name=publishStage value=2>
<TABLE BORDER=0 CELLSPACING=0 CELLPADDING=0 height=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td><td><td abswidth=10 rowspan=100>
<tr>
<td absheight=16>
<tr>
<td valign=top colspan=3>
<font size=+1 color=D1D1D1><blackface> Ready to publish </blackface></font>
<tr>
<td colspan=3>
<font color=AEBFD1>
You are about to publish your page to the World Wide Web where
anyone can see it.
</font>
<tr>
<td height=20>
<tr>
<td colspan=3 valign=top>
<font color=AEBFD1>
Mark <B>Include in public list</B> to have this page's address added to a public
list of your Web pages, making it easier for your family and friends to
find your pages.<P>
Your public list of pages will be at:<BR>
</font>
<SPACER type=block height=15 width=10>
<FONT size=-1><A href="http://${site}/${session_data.getSessionData("subscriber_username")}/">http://${site}/${session_data.getSessionData("subscriber_username")}/</A></FONT>
<tr>
<td height=30>
<tr>
<td colspan=3 valign=top>
<input type=checkbox name="includeInPublicList" value=${page.inlist} `
if (page.inlist == true)
	data += "checked"
data += `>
Include in public list
<tr>
<td width=100>&nbsp;
<td align=right>
<TABLE cellspacing=0 cellpadding=0 href="client:goback" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Don't Publish</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
<td align=right valign=middle>
<TABLE cellspacing=0 cellpadding=0 href="javascript:document.theForm.submit()" selected >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Publish</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</form>
</BODY>
</HTML>
`
} else if (request_headers.query.publishStage == "2") {
	let inlist;
	if (request_headers.query.includeInPublicList != undefined) {
		inlist = true;
	} else {
		inlist = false;
	}
	const result = session_data.pagestore.publishPage(docName, inlist);
	if (result == true) {
	headers = `300 OK
wtv-expire-all: wtv-author:/documents
Location: wtv-author:/congrats?docName=${docName}`
	} else {
		headers = `400 ${result}`
	}
} else if (request_headers.query.unpublish == "1") {
	const result = session_data.pagestore.unpublishPage(docName);
	if (result == true) {
		headers = `300 OK
wtv-expire-all: wtv-author:/documents
wtv-expire-all: wtv-author:/doc-info
Location: wtv-author:/doc-info?docName=${docName}`
	} else {
		headers = `400 ${result}`
	}
} else {
	headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/edit-title?docName=${docName}&publishing=true`
} 