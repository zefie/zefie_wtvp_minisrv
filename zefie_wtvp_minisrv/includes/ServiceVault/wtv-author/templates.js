var minisrv_service_file = true;
var create = true;
var pagenums = session_data.pagestore.listPages().length;
if (minisrv_config.services["wtv-author"].max_pages) {
	if (pagenums + 1 > minisrv_config.services["wtv-author"].max_pages) {
		create = false;
	}
}

if (create) {
headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

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
<body bgcolor=#1e4261 background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7 vlink=B8BDC7 hspace=0 vspace=0>
  <table cellspacing=0 cellpadding=0 width=100%>
    <tr>
      <td abswidth=10 rowspan=100>
    <tr>
      <td height=44 width=206 valign=middle colspan=2>
        <font size=+1 color=D1D1D1>
          <blackface> Choose a page style </blackface>
        </font>
      <td align=right valign=middle>
        <table valign=middle>
          <tr>
            <td>
              <table cellspacing=0 cellpadding=0>
                <tr>
                  <td>
                    <img src="wtv-author:/ROMCache/minus_button_dim.gif">
              </table>
            </td>
            <td align=center>
              <font color=D1D1D1>
                <B>1 of 1</B>
              </font>
            </td>
            <td>
              <table cellspacing=0 cellpadding=0 ref="wtv-author:/styles?tmplClass=11&docName=&styleName=&pageNum=1#plus" id=plus>
                <tr>
                  <td>
                    <img src="wtv-author:/ROMCache/plus_button_dim.gif">
              </table>
            </td>
          </tr>
        </table>
    <tr>
      <td absheight=5>
    <tr>
      <td colspan=5>
        <font color=AEBFD1> You can change the style at any time without losing your text or images. </font>
    <tr>
      <td absheight=10>
    <tr>
      <td absheight=5>
    <tr>
      <td>

		<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
          <TR height=120>
            <TD width=128 height=120 bgcolor=#8A99B0 href="new?tmplClass=&layoutTMPL=Blue_Sands.tmpl&contentTMPL=&styleName=Blue Sands&blocksPerPage=0" name="Blue Sands">
              <spacer type=block width=4></spacer>
              <font color=0F283F> Blue Sands <BR>
              </font>
              <center>
                <img src=/images/styles/blue_sands.gif width="120" height="90" vspace=3>
              </center>
            </TD>
            <TD height=120>
              <IMG height=120 width=12 src=/ROMCache/right_shadow.gif>
            </TD>
          </TR>
          <TR>
            <TD width=128>
              <IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif>
            </TD>
            <TD>
              <IMG height=12 width=12 src=/ROMCache/corner_shadow.gif>
            </TD>
          </TR>
        </TABLE>
      </td>
      <td>

		<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
          <TR height=120>
            <TD width=128 height=120 bgcolor=#8A99B0 href="new?tmplClass=&layoutTMPL=Space.tmpl&contentTMPL=&styleName=Space&blocksPerPage=0" name="Space">
              <spacer type=block width=4></spacer>
              <font color=0F283F> Space <BR>
              </font>
              <center>
                <img src=/images/styles/space.gif width="120" height="90" vspace=3>
              </center>
            </TD>
            <TD height=120>
              <IMG height=120 width=12 src=/ROMCache/right_shadow.gif>
            </TD>
          </TR>
          <TR>
            <TD width=128>
              <IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif>
            </TD>
            <TD>
              <IMG height=12 width=12 src=/ROMCache/corner_shadow.gif>
            </TD>
          </TR>
        </TABLE>
      </td>
      <td>

		<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
          <TR height=120>
            <TD width=128 height=120 bgcolor=#8A99B0 href="new?tmplClass=&layoutTMPL=Cats.tmpl&contentTMPL=&styleName=Cats&blocksPerPage=0" name="Cats">
              <spacer type=block width=4></spacer>
              <font color=0F283F> Cats <BR>
              </font>
              <center>
                <img src=/images/styles/catz.gif width="120" height="90" vspace=3>
              </center>
            </TD>
            <TD height=120>
              <IMG height=120 width=12 src=/ROMCache/right_shadow.gif>
            </TD>
          </TR>
          <TR>
            <TD width=128>
              <IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif>
            </TD>
            <TD>
              <IMG height=12 width=12 src=/ROMCache/corner_shadow.gif>
            </TD>
          </TR>
        </TABLE>
      </td>
      <tr>
      <td>
		<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
          <TR height=120>
            <TD width=128 height=120 bgcolor=#8A99B0 href="new?tmplClass=&layoutTMPL=Blue.tmpl&contentTMPL=&styleName=Blue&blocksPerPage=0" name="Blue">
              <spacer type=block width=4></spacer>
              <font color=0F283F> Blue <BR>
              </font>
              <center>
                <img src=/images/styles/blue.gif width="120" height="90" vspace=3>
              </center>
            </TD>
            <TD height=120>
              <IMG height=120 width=12 src=/ROMCache/right_shadow.gif>
            </TD>
          </TR>
          <TR>
            <TD width=128>
              <IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif>
            </TD>
            <TD>
              <IMG height=12 width=12 src=/ROMCache/corner_shadow.gif>
            </TD>
          </TR>
        </TABLE>
      </td>
      <td>

		<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
          <TR height=120>
            <TD width=128 height=120 bgcolor=#8A99B0 href="new?tmplClass=&layoutTMPL=Red.tmpl&contentTMPL=&styleName=Red&blocksPerPage=0" name="Red">
              <spacer type=block width=4></spacer>
              <font color=0F283F> Red <BR>
              </font>
              <center>
                <img src=/images/styles/red.gif width="120" height="90" vspace=3>
              </center>
            </TD>
            <TD height=120>
              <IMG height=120 width=12 src=/ROMCache/right_shadow.gif>
            </TD>
          </TR>
          <TR>
            <TD width=128>
              <IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif>
            </TD>
            <TD>
              <IMG height=12 width=12 src=/ROMCache/corner_shadow.gif>
            </TD>
          </TR>
        </TABLE>
      </td>
      <td>

		<TABLE border=0 cellpadding=0 cellspacing=0 width=137>
          <TR height=120>
            <TD width=128 height=120 bgcolor=#8A99B0 href="new?tmplClass=&layoutTMPL=Republican.tmpl&contentTMPL=&styleName=Republican&blocksPerPage=0" name="Republican">
              <spacer type=block width=4></spacer>
              <font color=0F283F> Republican <BR>
              </font>
              <center>
                <img src=/images/styles/republican.gif width="120" height="90" vspace=3>
              </center>
            </TD>
            <TD height=120>
              <IMG height=120 width=12 src=/ROMCache/right_shadow.gif>
            </TD>
          </TR>
          <TR>
            <TD width=128>
              <IMG height=12 width=128 src=/ROMCache/bottom_shadow.gif>
            </TD>
            <TD>
              <IMG height=12 width=12 src=/ROMCache/corner_shadow.gif>
            </TD>
          </TR>
        </TABLE>
      </td>
  </table>
</BODY>
</HTML>
`;
} else {
		var err = wtvshared.doErrorPage(500, "You are not allowed to create more than <b>"+minisrv_config.services["wtv-author"].max_pages+"</b> pages.");
		headers = err[0];
		data = err[1];
}
