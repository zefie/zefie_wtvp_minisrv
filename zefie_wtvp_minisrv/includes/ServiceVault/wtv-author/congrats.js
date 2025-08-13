const minisrv_service_file = true;

const docName = request_headers.query.docName;
const page = session_data.pagestore.loadPage(docName)
const site = session_data.pagestore.getPublishDomain();


headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

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
{	GoBackToUrl("wtv-author:/show-blocks?docName=${docName}");
GoBackToUrl("wtv-author:/doc-info?docName=${docName}");
}
</SCRIPT>
<DISPLAY fontsize=medium noscroll>
<TITLE>Congratulations</TITLE>
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
<table cellspacing=0 cellpadding=0 width=100% height=100%>
<tr>
<td abswidth=10 rowspan=100><td><td abswidth=15 rowspan=100>
<tr>
<td absheight=16>
<tr>
<td absheight=31 valign=top>
<font size=+1 color=D1D1D1><blackface> Congratulations! </blackface></font>
<tr>
<td absheight=15>
<tr>
<td>
<font color=AEBFD1> "${page.title}"
is now on the Web.
It can be found at:
</font>
<tr>
<td>
<font size="-1"><a href=http://${site}/${session_data.getSessionData("subscriber_username")}/${page.publishname}/>http://${site}/${session_data.getSessionData("subscriber_username")}/${page.publishname}/</a></font>
<tr>
<td absheight=15>
<tr>
<td>
Would you like to:
<tr>
<td>
<form name=mail_form method=POST action=wtv-mail:/sendmail>
<input type=hidden name=message_url value="http://${site}/${session_data.getSessionData("subscriber_username")}/${page.publishname}/">
<input type=hidden name=message_subject value="${page.title}">
<input type=hidden name=message_title value="${page.title}">
</form>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=javascript:document.mail_form.submit()
><font effect=shadow><B>send mail announcing your page?</B></font></a>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-setup:/appendto-mail-signature?appendstringURL=http%3A%2F%2F${encodeURIComponent(site)}%3A1640%2F${session_data.getSessionData("subscriber_username")}%2F${page.publishname}%2F&appendstring=${page.title}&alert=The%20address%20has%20been%20added%20to%20your%20mail%20signature.
><font effect=shadow><B>add its address to your mail signature?</B></font></a>
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:/edit-title?docName=${docName}&returnPageURL=client:goback
><font effect=shadow><B>change the title or description?</B></font></a>
<tr>
<td>&nbsp;
<tr>
<td align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:DoDone()" >
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
