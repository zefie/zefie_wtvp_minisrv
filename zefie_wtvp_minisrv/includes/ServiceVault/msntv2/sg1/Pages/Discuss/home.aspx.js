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
</table>
<hr>
<table cellspacing=0 cellpadding=0>
<tr>
<td rowspan=2 abswidth=10>
<td absheight=10>
<tr>
<td abswidth=416 valign=top align=left>
Type a discussion topic<br>
<img src="/ROMCache/Spacer.gif" width=1 height=4>
<form action="News.aspx" method="GET">
<input name="search" bgcolor=#202020 cursor=#cc9933 text="E7CE4A" font=proportional value="" SIZE=28 MAXLENGTH=100>
&nbsp;
<font color=E7CE4A><shadow>
<input type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Look for" usestyle>
</shadow></font>
</form>
</table>
</BODY>
</HTML>`;