var minisrv_service_file = true;

headers = `200 OK
Content-type: text/html`;

data = `
<html>
<head>
<title>
Welcome to Mail
</title>
<display
noscroll
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
<table background="wtv-mail:/ROMCache/help/common/helpMastheadBlank.swf" width=560 height=96 cellspacing=0 cellpadding=0>
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
Welcome to Mail&nbsp;
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
In Mail, you can exchange typed messages&#151;called
<i>m-mail</i>&#151;with anyone who is on ${minisrv_config.config.service_name}, as well as anyone using other compatible MiniSrvs around the world. This is your m-mail address:
<blockquote>
<b>${session_data.getSessionData("subscriber_username")}@${minisrv_config.config.service_name}</b>
</blockquote>
Choose <b>Begin</b> to start using Mail. <!-- Or to learn more,
choose this link:
<spacer type=vertical height=12><br>
<table bgcolor=001316 cellpadding=0 cellspacing=8 href="wtv-guide:/help?topic=Common&subtopic=PreTour&tourTopic=Mail">
<tr>
<td height=20><font color=4B7136>
<b>&#128;
<td>
<font color=4B7136><b>Introductory tutorial about Mail
<td>&nbsp;
</table>
-->
<tr>
<td width=35>&nbsp;
<td width=450>&nbsp;
<td width=50>&nbsp;
</table>
</table>
<tr>
<td valign=top height=55 align=right>
<form method="POST" action="wtv-mail:/listmail">
<input type="hidden" name="intro_seen"  value="true">
<font color=ffcf69><shadow>
<input type=submit usestyle borderimage="file://ROM/Borders/ButtonBorder2.bif"
value="Begin"
width='110'
selected>
<spacer type=horizontal width=20>
</shadow></font>
</form>
</table>
</body>
`;