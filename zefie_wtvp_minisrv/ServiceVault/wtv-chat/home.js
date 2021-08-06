var irc_nick = "";
headers = "200 OK";
if (request_headers.query.nick) headers += "\n" + ssid_sessions[socket.ssid].setIRCNick(request_headers.query.nick);
else if (!ssid_sessions[socket.ssid].getSessionData("subscriber_irc_nick")) ssid_sessions[socket.ssid].getSessionData("subscriber_username") || ssid_sessions[socket.ssid].setIRCNick(minisrv_config.config.service_name + '_' + Math.floor(Math.random() * 100000)).substring(0, 16);
headers += "\nContent-Type: text/html";

var irc_nick = ssid_sessions[socket.ssid].getSessionData("subscriber_irc_nick") || ssid_sessions[socket.ssid].getSessionData("subscriber_username");

data = `<html>
<head>
<title>
Chat Home (Testing)
</title>
</head>
<body bgcolor="#101C1E" text="#A2ACB5" link="#CFC382" vlink="#E1EOE3" fontsize="medium" vspace=0 hspace=0>
<display noscroll>
<sidebar width=109>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=104 height=420 bgcolor=#69758B valign=top>
<table cellspacing=0 cellpadding=0>
<tr>
<td height=7 colspan=3>
<spacer type=vertical size=7>
<tr>
<td width=7>
<spacer type=horizontal size=7>
<td width=87 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<td width=10>
<spacer type=horizontal size=10>
</table>
<spacer type=vertical size=6>
<table cellspacing=0 cellpadding=0 border=0>
<tr>	<td bgcolor=#2E3A54 height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="client:relog" >
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E1EOE3>Relogin</font></shadow>
</table>
<td width=5>
<tr>	<td bgcolor=#2E3A54 height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="wtv-home:/home" >
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E1EOE3>Home</font></shadow>
</table>
<td width=5>
<tr>	<td bgcolor=#2E3A54 height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
</table>
<td width=5 bgcolor=#2E3A54>
</table>
</sidebar>

<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=451 colspan=2 align=center bgcolor=#2E3A54>
<spacer type=vertical size=13>
<tr>
<td><img src="wtv-chat:/images/top_corner_dark.jpg" width=8 height=8>
<td width=60>
<tr>
<td bgcolor=#101C1E width=13>
<spacer type=horizontal size=13>
<td bgcolor=#101C1E width=438 valign=top>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=105 height=9><spacer type=vertical size=9>
<td>
</table>
<tr>
<td colspan=2>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=375 height=25 bgcolor=#101C1E gradcolor=#3C4652 gradangle=90>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=366 valign=middle>&nbsp;&nbsp;
<blackface><font color=#D6D6D6>
</font></blackface><td>
<table cellspacing=0 cellpadding=0 border=0 bgcolor=#3C4652 gradcolor=#2E3A54 gradangle=90>
<tr>
<td width=21>
<td width=400>
<td width=34>
</table>
</table>
</table>
<spacer type=vertical size=12>	<table cellspacing=0 cellpadding=0>
<tr>
<td colspan=3 height=12>
<spacer type=vertical size=22>	<tr>
<td abswidth=14>
<td abswidth=400>
<form action="wtv-chat:/MakeChatPage" method="get">
<table>
<tr>
<td abswidth="120">Server:</td>
<td><input width="240" bgcolor=262626 text=D6D6D6 cursor=cc9933 font=proportional type="text" name="host" value="${request_headers.query.host || "chat.irchat.tv"}"></td>
</tr>

<tr>
<td>Port:</td>
<td><input width="240" bgcolor=262626 text=D6D6D6 cursor=cc9933 font=proportional type="text" name="port" value="${request_headers.query.port || 6667}"></td>
</tr>

<tr>
<td>Channel:</td>
<td><input width="240" bgcolor=262626 text=D6D6D6 cursor=cc9933 font=proportional type="text" name="channel" value="${request_headers.query.channel || "WebTV"}"></td>
</tr>
<tr>
<td>IRC Nick<sup>*</sup>:</td>
<td><input width="240" bgcolor=262626 text=D6D6D6 cursor=cc9933 font=proportional maxlength=16 type="text" name="nick" value="${irc_nick}"></td>
</tr>
<tr>
<td colspan="2" align="right">
<input type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Connect" text=D6D6D6 width=100>
</td>
</tr>
</table>
<br>

<small><sup>*</sup>Note: Once you are connected to the IRC Server, you cannot change your nickname until you disconnect. 
What triggers the WebTV to disconnect from the chat server is not yet known, 
it does maintain a connection to the IRC server, but leaves the channel, when you leave the chat page. 
The connection times out after some time. Only then will any future attempts to change your name work.</small>

<td abswidth=9>
</form>
<tr> <TD HEIGHT=8>
</table>
</body>
</html>`;