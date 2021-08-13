var minisrv_service_file = true;

headers = "200 OK";
if (request_headers.query.nick) headers += "\n" + ssid_sessions[socket.ssid].setIRCNick(request_headers.query.nick);
headers += "\nContent-Type: text/html";

if (request_headers.query.host && request_headers.query.port && request_headers.query.channel) {
    data = `<html>
<display address="${request_headers.query.host}, port ${request_headers.query.port}, room ${request_headers.query.channel}">
<wtvchat
host="${request_headers.query.host}"
port="${request_headers.query.port}"
channel="#${request_headers.query.channel}"
bgcolor="#101C1E"
>
<head>
<title>
${request_headers.query.channel}
</title>
</head>
<body bgcolor="#101C1E" text="#A2ACB5" link="#CFC382" vlink="#E1EOE3" fontsize="medium" vspace=0 hspace=0>
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
<table cellspacing=0 cellpadding=0 href="javascript:void(window.open('newChatChannel.panel'))" >
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E1EOE3>Create</font></shadow>
</table>
<td width=5>
<tr>	<td bgcolor=#2E3A54 height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="client:ListChannelUsers" >
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E1EOE3>People</font></shadow>
</table>
<td width=5>
<tr>	<td bgcolor=#2E3A54 height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="client:OpenChatWhisperPanel" >
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E1EOE3>Whisper</font></shadow>
</table>
<td width=5>
<tr>	<td bgcolor=#2E3A54 height=2 width=104 colspan=3>
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
<blackface><font color=#D6D6D6>	${request_headers.query.channel}
</font></blackface><td>
<table cellspacing=0 cellpadding=0 border=0 bgcolor=#3C4652 gradcolor=#2E3A54 gradangle=90>
<tr>
<td><img src="wtv-chat:/images/widget.gif" width=16 height=16>
<td width=3>
<td width=84>
<spacer type=vertical size=1><br>
<a href="wtv-chat:/home"><font size=-1 color=#E7CE4A><b> Home</b></font></a>
</table>
</table>
</table>
<spacer type=vertical size=12>	<table cellspacing=0 cellpadding=0>
<tr>
<td colspan=3 height=12>
<spacer type=vertical size=12>	<tr>
<td abswidth=14>
<td>
<wtvchattranscript height=250 width=100%>
<td abswidth=20>
<tr>
<td height=10>
<tr>
<td>
<td colspan=2 height=2>
<spacer>
<tr>
<td height=1>
<tr>
<td>
<td colspan=2 height=2>
<spacer>
<tr>
<td height=6>
</table>
<table cellspacing=0 cellpadding=0 width=100%>
<tr>
<form action="client:ChatAddMessage" ONSUBMIT="this.chatinput.focus()">
<td abswidth=14>
<td>
<input id="chatinput" name="message" type="text" value="" size=32 bgcolor=262626 text=ffc342 cursor=cc9933 font=proportional selected autoactivate nohighlight>
<td align=right>
<font color=e7ce4a><shadow>
<input type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Send" usestyle width=80>
<td abswidth=9>
</form>
<tr> <TD HEIGHT=8>
</table>
</body>
</html>`;
} else {
    var errpage = wtvshared.doErrorPage("400 Chat requires host, port and channel arguments. Do not use the # on channels.");
    headers = errpage[0];
    data = errpage[1];
}