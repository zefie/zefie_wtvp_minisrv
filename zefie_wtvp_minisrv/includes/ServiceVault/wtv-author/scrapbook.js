const minisrv_service_file = true;

const files = session_data.listScrapbook();
const dir = session_data.scrapbookDir()
const pageNum = parseInt(request_headers.query.pageNum || 1);
const start = (pageNum - 1) * 6;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-author:/scrapbook`

data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Scrapbook</TITLE>
<SCRIPT language="JavaScript">
function AddToScrapbook()
{	document.theForm.submit();
}
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
{	GoBackToUrl("wtv-author:/edit-block");
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
<td abswidth=93 absheight=26 >
<table href=wtv-author:/welcome
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Index</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href=client:videocapture?notify=javascript%3Avoid(AddToScrapbook())&device=video&width=40%25&height=40%25&name=cache%3Asnapshot.jpg&donebuttonlabel=Add%20picture&open
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Capture</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-author:/scrapbook-cleanup"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Clean up</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=FromScrapbook"
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
background=wtv-author:/ROMCache/blue_tile_128.gif
text=AEBFD1
link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
onLoad=StorageWarning();
>
<SCRIPT>
function StorageWarning() {	}
</SCRIPT>
<form name=onlyOnce><input type=hidden name=didIt value=0></form>
<form action="wtv-author:/scrapbook-setLastPage">
<input type=hidden name="pageNum" value="1" autosubmit=onEnter>
</form>
<table cellspacing=0 cellpadding=0 width=100%>
<tr>
<td absheight=1>
<FORM name="theForm" action="wtv-author:scrapbook-add" method=POST>
<input type=file device=video name=mediaData src="cache:snapshot.jpg" invisible>
</FORM>
<tr>
<td height=44 valign=middle>
<font size=+1 color=D1D1D1><blackface> Your scrapbook </blackface></font>`
if (files.length > 6) {
data += `<td align=right valign=middle>
<table valign=middle>
<tr>
<td>`;
if (pageNum > 1) {
data += `<table cellspacing=0 cellpadding=0
href="wtv-author:scrapbook?addMediaURL=&mediaCategoryID=0&pageNum=${pageNum - 1}#minus" id=minus><tr><td><img src="wtv-author:/ROMCache/minus_button.gif">`
} else {
data += `<table cellspacing=0 cellpadding=0
><tr><td><img src="wtv-author:/ROMCache/minus_button_dim.gif">`
}
data += `
</table>
</td>
<td align=center><font color=D1D1D1><B>${pageNum} of ${Math.ceil(files.length / 6)}</B></font></td>
<td>`;
if (files.length > start + 6) {
data += `<table cellspacing=0 cellpadding=0
href="wtv-author:scrapbook?addMediaURL=&mediaCategoryID=0&pageNum=${pageNum + 1}#plus" id=plus><tr><td><img src="wtv-author:/ROMCache/plus_button.gif">`

} else {
    data += `<table cellspacing=0 cellpadding=0><tr><td><img src="wtv-author:/ROMCache/plus_button_dim.gif">`
}
    data += `
</table>
</td>
</tr>
</table>`
}
data += `
<tr>
<td colspan=2>
<table><tr><td width=20><td width=380>
<font color=AEBFD1>`;
if (files.length === 0) {
        data += `<font color=AEBFD1>
Your scrapbook is currently empty.
<p>
Storing pictures in your scrapbook makes it easy to add them to your Web pages.
<p>
You can add pictures to your scrapbook from TV, a VCR, a video
camera, an e-mail message, or another Web page.
<p>
Choose <b>Help</b> for instructions.
</font>`;
} else {
    if (request_headers.query.addMediaURL) {
        data += "Choose an image to add to your web page.";
    } else {
        data += `You are currently using ${session_data.getScrapbookUsagePercent()}% of your scrapbook storage space. Choose one of your saved images to view it full size.`;
    }
}
data += `
</font>
</table>
<tr><td absheight=10>
</table>
<CENTER>

`
if (files.length > 0) {
    data += `<TABLE cellspacing=0 cellpadding=0 align=center>
<TR height=8>
<TD width=10 height=8></TD>
<TD bgcolor=#8A99B0 width=2 rowspan=7></TD>
<TD width=10 background=wtv-author:/ROMCache/horiz_line.gif>
<IMG src=wtv-author:/ROMCache/left_arrow.gif> </TD>
<TD valign=middle height=8 background=wtv-author:/ROMCache/horiz_line.gif>
<spacer type=block height=1 width=1></TD>
<TD width=10 align=right background=wtv-author:/ROMCache/horiz_line.gif>
<IMG src=wtv-author:/ROMCache/right_arrow.gif> </TD>
<TD bgcolor=#8A99B0 width=2 rowspan=7></TD>
<TD width=10></TD>
</TR>
<TR height=2>
<TD bgcolor=#8A99B0 height=2 colspan=7></TD>
</TR>
<TR height=10><TD absheight=10 width=10 valign=top background=wtv-author:/ROMCache/vert_line.gif>
<IMG src=wtv-author:/ROMCache/up_arrow.gif> </TD>
<TD colspan=3 rowspan=3 align=center>
<table cellspacing=24 cellpadding=1 width=372 background="/ROMCache/light_blue_tile.gif">
<tr>
`
    for (let i = start; i < Math.min(files.length, start + 6); i++) {
        let url = "wtv-tricks:/view-scrapbook-image?id=" + files[i];
        if (request_headers.query.addMediaURL) {
            url = decodeURIComponent(request_headers.query.addMediaURL) + "&scrapbookID=" + files[i];
        }
data += `
<td align=center valign=middle>
<a href="${url}" transition=light>
<img src="wtv-tricks:/view-scrapbook-image?id=${files[i]}&width=90" width=90>
</a>
</td>
${(i - start + 1) % 3 === 0 ? '<tr>' : ''}`
    }
data += `</tr></table>
</TD>
</TR>
<TR>
<TD align=center width=10 background=wtv-author:/ROMCache/vert_line.gif></TD>
</TR>
<TR height=10>
<TD absheight=10 width=10 valign=bottom background=wtv-author:/ROMCache/vert_line.gif><IMG src=wtv-author:/ROMCache/down_arrow.gif> </TD>
<TD width=10></TD>
</TR>
<TR height=2>
<TD bgcolor=#8A99B0 height=2 colspan=7></TD>
</TR>
<TR height=8>
<TD height=8></TD>
</TR>
</TABLE>
`

}
data += `
</CENTER>
</table>
</BODY>
</HTML>
`;