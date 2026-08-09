const minisrv_service_file = true;

// max of 6, any more will be ignored

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Featured discussion groups</TITLE>
</HEAD>

<body
bgcolor="191919" text="42BD52" link="189CD6"
vlink="189CD6"
hspace=0
vspace=0>
<table>
<tc width=114>
<td>
<table cellspacing=0 cellpadding=0 bgcolor=3d2f3a>
<tr>
<td colspan=3 width=104 absheight=4>
<td rowspan=100 width=10 height=420 valign=top align=left bgcolor=191919>
<img src="wtv-mail:/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table href="wtv-news:/news?category=1"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1>
<shadow><font sizerange=medium color="E7CE4A">All groups</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Discuss&subtopic=Index&appName=Discuss"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1>
<shadow><font sizerange=medium color="E7CE4A">Help</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=237 valign=bottom align=right >
<img src="wtv-news:/images/BannerDiscuss.gif" width=50 height=165>
<tr><td colspan=3 absheight=36>
</table>
</td></tc><tc><td>

<table cellspacing=0 cellpadding=0>

<tr>
<td abswidth=10>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<font size="+2" color="E7CE4A"><blackface><shadow>
Featured discussions
</table>
<td abswidth=20>
<tr>
<td>
<td WIDTH=198 HEIGHT=200 VALIGN=top ALIGN=left>`;

const featuredGroups = minisrv_config.services[minisrv_config.services[service_name].usenet_service].featuredGroups;
const limit = 6;
while (featuredGroups.length > limit) featuredGroups.pop(); // remove anything passing our limit

function printGroup(group) {
    return `<a href="News.aspx?group=${group.group}"><b>${group.name}</b></a><br>${group.description}<BR>`;
}

// evens
Object.keys(featuredGroups).forEach((k) => { if (k % 2 === 0) { data += printGroup(featuredGroups[k]); } });

if (featuredGroups.length > 1) data += `<td WIDTH=20><td WIDTH=198 HEIGHT=220 VALIGN=top ALIGN=left>`;

// odds
Object.keys(featuredGroups).forEach((k) => { if (k % 2 !== 0) data += printGroup(featuredGroups[k]); });


data += `
<hr>
<table cellspacing=0 cellpadding=0>
<tr>
<td rowspan=2 abswidth=10>
<td absheight=10>
<tr>
<td abswidth=416 valign=top align=left>
Type a discussion topic<br>
<form action="News.aspx" method="GET">
<input name="search" bgcolor=#202020 cursor=#cc9933 text="E7CE4A" font=proportional value="" SIZE=28 MAXLENGTH=100>
&nbsp;
<font color=E7CE4A><shadow>
<input type=submit value="Search" usestyle>
</shadow></font>
</form>
</table>
</td></tc>
</table>
</BODY>
</HTML>`;