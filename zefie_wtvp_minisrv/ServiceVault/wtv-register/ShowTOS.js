const WTVReg = require("./WTVRegister.js")
var WTVRegister = new WTVReg(minisrv_config.config.service_owner);

if (!request_headers.query.registering) {
    var errpage = doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
} else {
    headers = `200 OK
Content-Type: text/html`;

    data = `<html>
<head>
<title>Terms of Service</title>
<display nooptions>
</head>
<sidebar width=110 bgcolor=#5b6c81 fontsize="large" font color="#171726" absheight=300> <table width=150 height=450 cellspacing=0 cellpadding=2 BGCOLOR="#171726">
<tr>
<td align=middle valign=top bgcolor="#5b6c81" border=0 abswidth="200" height="80"><font color="#171726" >
<img src="${minisrv_config.config.service_logo}" >
<p><br>	<font size=-1 color="#171726">	<i>	To read <br>more of this <br>page, press <b>scroll down</b>
<br><br>
<form name="theForm"
action="/ValidateAgreement" method="POST">
<input type=hidden name=registering value="true">
To agree<br> to these terms<br> and go on, <br>choose <b>Accept</b><br>
</i></font><p>
<font size="-1" color="#E7CE4A">
<shadow>
<img src="wtv-star:/ROMCache/Spacer.gif" width=18 height=1><p>
<input type=submit Value=Accept name="Agree" borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=100>
<img src="wtv-star:/ROMCache/Spacer.gif" width=18 height=1><p>
<input type=submit Value=Decline
name="Decline"
action="/ServeAgreementDeclinePage"
borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=100
selected>
</shadow>
</font>
</form>
</tr>
</table>
</sidebar>
<BODY bgcolor="#171726" hspace=0 vspace=0 fontsize=large text=#d1d3d3 link=#FFEA9C vlink=#FFEA9C>
<form name="theForm" action="/ValidateAgreement">
<input type=hidden name=registering value="true">
<BODY bgcolor="#171726" hspace=0 vspace=0 fontsize=large text=#d1d3d3>
<TABLE width=450 height=200 ALIGN=left VALIGN=BOTTOM vspace=0 hspace=0 cellspacing=0 cellpadding=0>
<tr>
<td colspan= 8 height="30">
<tr>
<td abswidth=20 bgcolor="#171726">
<td height=202 width= 300 bgcolor="#171726" colspan=6 valign=top align=left>
<P ALIGN="CENTER">TERMS OF SERVICE AND NOTICES</P>
To create your ${minisrv_config.config.service_name} account, you must review and agree to the agreements and statements below. Use these links to review the documents: <br>
<br>
<a href="wtv-register:/ServeLegal">Review the ${minisrv_config.config.service_name} Subscription Agreement and ${minisrv_config.config.service_name} Privacy Statement</a>
<br>
<br>
By choosing <b>Accept</b>, you acknowledge that you have read the documents listed above and are agreeing to be bound by them.
You are also consenting to receive all information from ${WTVRegister.getServiceOperator()} in electronic form including the documents listed above.
</BODY>
</HTML>
</tr>
<tr>
<td valign= bottom height=15 colspan=7>
<hr size=5 valign=bottom>
</tr>
<tr>
<td border=2 absheight=50 colspan=5 bgcolor="#171726" valign=top align=left style="margin-right:50">
<td bgcolor="#171726" height=50 abswidth=100 valign=top align=right style="padding-right:13">
</form>
<td abswidth=13 absheight=50 bgcolor="#171726">
</tr>
</table>
</body>
</html>
`;
}