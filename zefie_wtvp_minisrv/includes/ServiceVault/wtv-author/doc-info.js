const minisrv_service_file = true;

const pagestore_exists = session_data.pagestore.pagestoreExists();
const docName = request_headers.query.docName;

if (pagestore_exists != true)
{
	session_data.pagestore.createPagestore();
	headers = `300 OK
Location: wtv-author:/documents`
} else {
	
	const page = session_data.pagestore.loadPage(docName)
	const discardAlert = function (docName) {
		return new clientShowAlert({
			'image': this.minisrv_config.config.service_logo,
			'message': "Would you like to permanently discard this document and all of its contents?",
			'buttonlabel1': "Don't Discard",
			'buttonaction1': "client:donothing",
			'buttonlabel2': "Discard",
			'buttonaction2': "delete-doc?docName=" + docName,
			'sound': false,
			'noback': true,
		}).getURL();
	}
	const unpublishAlert = function (docName) {
		return new clientShowAlert({
			'image': this.minisrv_config.config.service_logo,
			'message': "Would you like to unpublish this document? You can republish it later.",
			'buttonlabel1': "Don't Unpublish",
			'buttonaction1': "client:donothing",
			'buttonlabel2': "Unpublish",
			'buttonaction2': "publish?docName=" + docName + "&unpublish=1",
			'sound': false,
			'noback': true,
		}).getURL();
	}

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `<HTML>
<HEAD>
  <DISPLAY fontsize=medium>
    <TITLE>Page Settings</TITLE>
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
    <tr>
      <td absheight=5>&nbsp;
    <TR>
      <td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
    <tr>
      <td>
      <td abswidth=93 absheight=26>
        <table href="wtv-author:/documents" cellspacing=0 cellpadding=0>
          <tr>
            <td abswidth=5>
            <td abswidth=90 valign=middle align=left>
              <table cellspacing=0 cellpadding=0>
                <tr>
                  <td maxlines=1>
                    <font sizerange=medium color="C2CCD7">Index</font>
              </table>
        </table>
    <TR>
      <td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
    <tr>
      <td>
      <td abswidth=93 absheight=26>
        <table href="wtv-guide:/help?topic=Glossary&subtopic=P&page=pagebuilder" cellspacing=0 cellpadding=0>
          <tr>
            <td abswidth=5>
            <td abswidth=90 valign=middle align=left>
              <table cellspacing=0 cellpadding=0>
                <tr>
                  <td maxlines=1>
                    <font sizerange=medium color="C2CCD7">Help</font>
              </table>
        </table>
    <TR>
      <td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
    <tr>
      <td>
      <td valign=bottom align=right>
        <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
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
<td abswidth=15 rowspan=100 absheight=1><td><td><td abswidth=15 rowspan=100>
<tr>
<td absheight=12>
<tr>
<td height=25 valign=top colspan=2>
<font size=+1 color=D1D1D1><blackface> Page settings </blackface></font>
<tr>
<td absheight=10>
<tr><td align=center colspan=2>
<table cellspacing=0 cellpadding=0>
<tr>	<td rowspan=2 valign=top><img src="/ROMCache/left_mark.gif" width=5 height=9>
<td colspan=4><img src="/ROMCache/horiz_line_top.gif" width=347 height=9>
<td rowspan=2 valign=top><img src="/ROMCache/right_mark.gif" width=5 height=9>
<tr>
<td width=8 bgColor=0F283F>
<td bgColor=0F283F width=331>
<font color=AEBFD1><B>
${page.title}
</B></font>
<P>
<font size=2 color=AEBFD1>`
if (page.published == true)
	data += `published ${page.publishdate}`
else
	data += "not published"
data += `</font>
<td width=8 bgColor=0F283F>
<tr>	<td><img src="/ROMCache/left_mark.gif" width=5 height=9>
<td colspan=4><img src="/ROMCache/horiz_line_bottom.gif" width=347 height=9>
<td><img src="/ROMCache/right_mark.gif" width=5 height=9>
<tr>
</table>
<tr>
<td height=18>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=show-blocks?docName=${docName} selected
><font effect=shadow><B>Change page</B></font></a>
<BR><spacer type=block width=18 height=30 align=top>
<font color=AEBFD1>
Change the contents of your page
</font>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=edit-title?docName=${docName}&returnPageURL=client:goback
><font effect=shadow><B>Change public listing</B></font></a>
<BR><spacer type=block width=18 height=30 align=top>
<font color=AEBFD1>
Change how your page is listed
</font>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0> `
	if (page.published != true) 
		data += `<a href=publish?docName=${docName}
><font effect=shadow><B>Publish page</B></font></a>
<BR><spacer type=block width=18 height=30 align=top>
<font color=AEBFD1>
Make your page available to others on the Web`
	else
		data += `<a href="${unpublishAlert(docName)}"
><font effect=shadow><B>Unpublish page</B></font></a>
<BR><spacer type=block width=18 height=30 align=top>
<font color=AEBFD1>
Hide your page from others on the Web`

data += `
</font>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href="${discardAlert(docName)}"><font effect=shadow><B>Discard page</B></font></a>
<BR><spacer type=block width=18 height=30 align=top>
<font color=AEBFD1>
Permanently erase your entire page
</font>
</table>
</BODY>
</HTML>
`;
}