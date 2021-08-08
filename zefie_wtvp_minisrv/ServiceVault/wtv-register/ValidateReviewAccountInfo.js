if (!request_headers.query.registering ||
    !request_headers.query.subscriber_name ||
    !request_headers.query.subscriber_username ||
    !request_headers.query.subscriber_contact ||
    !request_headers.query.subscriber_contact_method ||
    !ssid_sessions[socket.ssid].session_store ||
    !ssid_sessions[socket.ssid] ||
    !socket.ssid
    ) {
    var errpage = doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
} else {
    ssid_sessions[socket.ssid].setSessionData("subscriber_name", request_headers.query.subscriber_name);
    ssid_sessions[socket.ssid].setSessionData("subscriber_username", request_headers.query.subscriber_username);
    ssid_sessions[socket.ssid].setSessionData("subscriber_contact", request_headers.query.subscriber_contact);
    ssid_sessions[socket.ssid].setSessionData("subscriber_contact_method", request_headers.query.subscriber_contact_method);
    ssid_sessions[socket.ssid].setSessionData("subscriber_userid", '1' + Math.floor(Math.random() * 1000000000000000000));
    ssid_sessions[socket.ssid].setSessionData("registered", true);
    if (!ssid_sessions[socket.ssid].storeSessionData()) {
        var errpage = doErrorPage(400);
        headers = errpage[0];
        data = errpage[1];
    } else {

        headers = `200 OK
Content-Type: text/html`;

        data = `<html>
<head>
<title>
Finished signing up
</title>
<display nooptions noscroll ClearBack
NoScroll
>
</head>
<body noscroll
bgcolor="#171726" text="#D1D3D3" link=#FFEA9C vlink=#FFEA9C
hspace=0 vspace=0 fontsize="large"
>
<table cellspacing=0 cellpadding=0 border=0 width=560 bgcolor=#171726>
<tr>
<td align=middle bgcolor="#5b6c81" border=0 colspan= 3 width="100" height="80">
<img src="${minisrv_config.config.service_logo}" WIDTH="87" HEIGHT="67">
<td colspan= 6 bgcolor="#5b6c81" border=0 width=100% absheight="80" valign=bottom >
<img src="images/head_registration.gif" >
<tr>
<td bgcolor= "#5b6c81" border=0 rowspan=2 width=21 height= 220></td>
<td bgcolor="#171726" border=0 width=9 height=25 align=left valign=top>
<img src="images/L_corner.gif" width=8 height=8>
<td bgcolor="#171726" border=1 colspan=1 width=70 height=25>
<td colspan=6 bgcolor="#171726" border=1 height=25 align=left valign=bottom gradcolor=#262E3D gradangle=90>
<font color=#d1d3d3 size=+1>
<blackface>
You've finished signing up
</blackface></font>
<tr> <td border=0 width=40 bgcolor="#171726" rowspan="2" >
<td absheight=20 width=100 bgcolor="#171726" colspan=6>
</tr>
</table>
<table cellspacing=0 cellpadding=0 border=0 width=560 bgcolor=#171726>
<tr>
<td bgcolor= "#5b6c81" border=0 rowspan=6 abswidth=21 height= 220></td>
<td border=0 abswidth=40 bgcolor="#171726" rowspan="6" >
<form action="FinishRegistration"
>
<td height=230 width= 300 bgcolor="#171726" colspan=5 valign=top align=left>
Thank you for signing up for ${minisrv_config.config.service_name}.
<p>
You will now go
to your <b>Web Home</b> page. You can always
connect to the Internet by choosing
<b>Web Home</b> on your TV Home page.
</font>
<td abswidth=20 bgcolor=#171726 >
</tr>
<tr>
<td valign= bottom height=15 colspan=7 bgcolor=#171726>
<shadow>
<hr size=5 valign=bottom></shadow>
</tr>
<tr>
<td border=2 colspan=4 width=300 height=50 bgcolor=#171726 valign=top align=left>
<font size=-1><i>
</i></font>
<td bgcolor=#171726 height=50 width=150 valign=top align=right>
<font size=-1 color=#e7ce4a>
<shadow>
<input type=submit Value=Continue name="Continue" borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=110>
</shadow>
</font>
</form>	<td abswidth=13 absheight=50 bgcolor=#171726>
</tr>	</table>
</body>
</html>
`;
    }
}