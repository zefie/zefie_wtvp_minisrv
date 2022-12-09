var minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `
<html>
<head>
<title>What is remote mail?</title>
<display
noscroll
showwhencomplete
>
</head>
<body hspace=0 vspace=0
text='E6E6E6' link='E6E6E6' vlink='E6E6E6'
fontsize='medium'
bgcolor=00292f
>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=560 height=96 valign=top>
<table background="wtv-guide:/ROMCache/help/common/helpMastheadBlank.swf" width=560 height=96 cellspacing=0 cellpadding=0>
<tr>
<td width=107 height=96 valign=top rowspan=2>
<spacer type=vertical height=7><br>
<spacer type=horizontal width=7>
<a href='wtv-home:/home'>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</a>
<td width=453 valign=top>
<spacer type=vertical height=54><br>
<font size=+3><blackface>
What is remote mail?&nbsp;
</blackface></font>
<tr>
<td align=right>
&nbsp;
</table>
<tr>
<td width=560 valign=top height=225>
<table cellpadding=0 cellspacing=0 width=560>
<tr>
<td width=25 height=17>
<td width=535>
<tr>
<td>
<td height=225 rowspan=2 valign=top>
<table cellpadding=0 cellspacing=0 height=225 width=535>
<tr>
<td height=15>
<tr>
<td>
<td valign=top>
Remote mail is a feature that allows you to have e-mail from another mail service delivered to your WebTV Mail list.
<tr>
<td width=35>&nbsp;
<td width=450>&nbsp;
<td width=50>&nbsp;
</table>
</table>
<tr>
<td valign=top height=55 align=right>
<form>
<font color=ffcf69><shadow>
<input type=button usestyle borderimage="file://ROM/Borders/ButtonBorder2.bif"
action="WhatIs2"
value="Continue"
width='110'
selected>
<spacer type=horizontal width=20>
</shadow></font>
</form>
</table>
</body>
`; 