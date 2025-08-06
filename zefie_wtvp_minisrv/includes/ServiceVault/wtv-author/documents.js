const minisrv_service_file = true;

const pagestore_exists = session_data.pagestore.pagestoreExists();

const site = session_data.pagestore.getPublishDomain();

if (pagestore_exists != true)
	session_data.pagestore.createPagestore();
	
const pagearray = session_data.pagestore.listPages();
const numofpages = pagearray.length

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `<HTML>
<HEAD>
  <DISPLAY fontsize=medium>
    <TITLE>Page Builder index</TITLE>
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
        <table href="wtv-author:/templates" cellspacing=0 cellpadding=0>
          <tr>
            <td abswidth=5>
            <td abswidth=90 valign=middle align=left>
              <table cellspacing=0 cellpadding=0>
                <tr>
                  <td maxlines=1>
                    <font sizerange=medium color="C2CCD7">Create</font>
              </table>
        </table>
    <TR>
      <td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
    <tr>
      <td>
      <td abswidth=93 absheight=26>
        <table href="wtv-author:/scrapbook" cellspacing=0 cellpadding=0>
          <tr>
            <td abswidth=5>
            <td abswidth=90 valign=middle align=left>
              <table cellspacing=0 cellpadding=0>
                <tr>
                  <td maxlines=1>
                    <font sizerange=medium color="C2CCD7">Scrapbook</font>
              </table>
        </table>
    <TR>
      <td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
    <tr>
      <td>
      <td abswidth=93 absheight=26>
        <table href="client:showalert?message=Select%20the%20document%20you%20would%20like%20to%20remove%20then%20choose%20discard%20page." cellspacing=0 cellpadding=0>
          <tr>
            <td abswidth=5>
            <td abswidth=90 valign=middle align=left>
              <table cellspacing=0 cellpadding=0>
                <tr>
                  <td maxlines=1>
                    <font sizerange=medium color="C2CCD7">Clean up</font>
              </table>
        </table>
    <TR>
      <td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
    <tr>
      <td>
      <td abswidth=93 absheight=26>
        <table href="wtv-author:/samples_en-US/index.html" cellspacing=0 cellpadding=0>
          <tr>
            <td abswidth=5>
            <td abswidth=90 valign=middle align=left>
              <table cellspacing=0 cellpadding=0>
                <tr>
                  <td maxlines=1>
                    <font sizerange=medium color="C2CCD7">Examples</font>
              </table>
        </table>
    <TR>
      <td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
    <tr>
      <td>
      <td abswidth=93 absheight=26>
        <table href=client:showalert?message=This%20feature%20is%20not%20available. cellspacing=0 cellpadding=0>
          <tr>
            <td abswidth=5>
            <td abswidth=90 valign=middle align=left>
              <table cellspacing=0 cellpadding=0>
                <tr>
                  <td maxlines=1>
                    <font sizerange=medium color="C2CCD7">Archive</font>
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
<body bgcolor=#1e4261 background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7 vlink=B8BDC7 hspace=0 vspace=0 onLoad=StorageWarning()>
  <SCRIPT>
    function StorageWarning() {}
  </SCRIPT>
  <form name=onlyOnce>
    <input type=hidden name=didIt value=0>
  </form>
  <table cellspacing=0 cellpadding=0 width=100%>
    <tr>
      <td abswidth=22 rowspan=100>
      <td>
      <td abswidth=22 rowspan=100>
    <tr>
      <td absheight=12>
    <tr>
      <td height=25 valign=top>
        <font size=+1 color=D1D1D1>
          <blackface> Page Builder index </blackface>
        </font>
    <tr>
      <td height=24>
        <font color=AEBFD1> Choose a document to change or view it </font>
    <tr>
      <td height=14>
    <tr>
      <td>
        <table cellspacing=0 cellpadding=0>
`
for (let i = 0; i < numofpages; i++) {
data += `<tr>	<td rowspan=2 valign=top>`
	if (i == 0)
		data += `<img src="/ROMCache/left_mark.gif" width=5 height=9>
<td colspan=4><img src="/ROMCache/horiz_line_top.gif" width=347 height=9>
<td rowspan=2 valign=top><img src="/ROMCache/right_mark.gif" width=5 height=9>`

data += `
<tr>
<td width=8 bgColor=0F283F>
<td bgColor=0F283F href="wtv-author:/doc-info?docName=${i}" width=331>
<font color=AEBFD1><B>
${pagearray[i].title}
</B></font>
<P>
<font size=-1 color=AEBFD1><I>
${pagearray[i].description}
</I></font>
<P>
<font size=1 color=AEBFD1>`
if (pagearray[i].published == true)
	data += `published ${pagearray[i].publishdate}`
else
	data += "not published"
data += `
</font>
<td width=8 bgColor=0F283F>
<tr>	<td><img src="/ROMCache/left_mark.gif" width=5 height=9>
<td colspan=4><img src="/ROMCache/horiz_line_bottom.gif" width=347 height=9>
<td><img src="/ROMCache/right_mark.gif" width=5 height=9>`
}
if (minisrv_config.services["wtv-author"].max_pages) {
	data += `
</table>
<p>A maximum of <b>${minisrv_config.services["wtv-author"].max_pages}</b> pages can be created, regardless of publish status.
<br><br>
Your published pages are available at<br>
<a href="http://${site}/${session_data.getSessionData("subscriber_username")}/">http://${site}/${session_data.getSessionData("subscriber_username")}/</a>
</table>`

}
data += `
<SCRIPT language=JavaScript>
function checkPageStatus() {
location = "wtv-author:/scrapbook-serve-confirm-archive?pub=true&unpub=false";
}
</SCRIPT>

</BODY>
</HTML>`;
