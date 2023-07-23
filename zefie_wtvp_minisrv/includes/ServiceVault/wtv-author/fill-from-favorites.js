var minisrv_service_file = true;

var docName = request_headers.query.docName;
var blockNum = request_headers.query.blockNum;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Add from Favorites</TITLE>
<script language=javascript>
function SubmitAll()
{	var	theForm = document.favsEmbed.document.FavoritesForm;
theForm.action = "wtv-author:add-links-to-block?docName=${docName}&blockNum=${blockNum}";
theForm.submit();
}
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
<table cellspacing=0 cellpadding=0 width=100% height=100%>
<tr><td abswidth=15 rowspan=50><td><td abswidth=15 rowspan=50>
<tr>
<td height=35 valign=bottom>
<font size=+1 color=D1D1D1><blackface> Add from your favorites </blackface></font>
<tr>
<td height=16>
<tr>
<td><font color=AEBFD1> Mark the favorites to include in your list, and then choose <b>Done</b>
<P>
</font>
<tr><td>
<EMBED name=favsEmbed src="wtv-favorite:/serve-raw-favorites?textColor=AEBFD1" nobackground>
<tr><td align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:SubmitAll()" >
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
</BODY>
</HTML>
`;