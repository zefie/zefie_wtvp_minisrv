const WTVReg = require("./WTVRegister.js")
var WTVRegister = new WTVReg(minisrv_config.config.service_owner, SessionStore);

if (!request_headers.query.registering) {
    var errpage = doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
} else {
    var errpage = null;
    if (!request_headers.query.registering) errpage = doErrorPage(400);
    else if (!request_headers.query.subscriber_name) errpage = doErrorPage(400, "Please enter your name. This can be your real name, or your well-known online alias.");
    else if (!request_headers.query.subscriber_username) errpage = doErrorPage(400, "Please enter a username.");
    else if (request_headers.query.subscriber_username.length < 5) errpage = doErrorPage(400, "Please choose a username with 5 or more characters.");
    else if (request_headers.query.subscriber_username.length > 16) errpage = doErrorPage(400, "Please choose a username with 16 or less characters.");
    else if (!WTVRegister.checkUsernameSanity(request_headers.query.subscriber_username)) errpage = doErrorPage(400, "The username you have chosen contains invalid characters. Please choose a username with only <b>letters</b>, <b>numbers</b>, <b>_</b> or <b>-</b>. Also, please be sure your username begins with a letter.");
    else if (!WTVRegister.checkUsernameAvailable(request_headers.query.subscriber_username, ssid_sessions)) errpage = doErrorPage(400, "The username you have selected is already in use. Please select another username.");
    else if (!request_headers.query.subscriber_contact) errpage = doErrorPage(400, "Please enter your contact information.");
    else if (request_headers.query.subscriber_contact_method == "") errpage = doErrorPage(400, "Please select the type of contact information you provided.");


    if (errpage) {
        headers = errpage[0];
        data = errpage[1];
    } else {

        headers = `200 OK
wtv-noback-all: wtv-register:
Content-Type: text/html`;

        data = `<html>
<head>
<title>
Review </title>
<display nooptions noscroll NoScroll
>
</head>
<body noscroll
bgcolor="#171726" text="#D1D3D3" link=#FFEA9C vlink=#FFEA9C
hspace=0 vspace=0 fontsize="large"
link="36d5ff" vlink="36d5ff" >
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
Review account info
</blackface></font>
<tr> <td border=0 width=40 bgcolor="#171726" rowspan="2" >
<td absheight=20 width=100 bgcolor="#171726" colspan=6>
</tr>
</table>
<table cellspacing=0 cellpadding=0 border=0 width=560 bgcolor=#171726>
<tr>
<td bgcolor= "#5b6c81" border=0 rowspan=6 abswidth=21 height= 220></td>
<td border=0 abswidth=40 bgcolor="#171726" rowspan="6" >
<form ACTION="ValidateReviewAccountInfo" ENCTYPE="x-www-form-encoded" METHOD="POST">
<input type=hidden name=registering value="true">
<input type=hidden name=subscriber_name value="${request_headers.query.subscriber_name}">
<input type=hidden name=subscriber_username value="${request_headers.query.subscriber_username}">
<input type=hidden name=subscriber_contact value="${request_headers.query.subscriber_contact}">
<input type=hidden name=subscriber_contact_method value="${request_headers.query.subscriber_contact_method}">
<td height=50 width= 300 bgcolor="#171726" colspan=6 valign=top align=left>
Here is your account information. If you need to<br>
correct an item, press <b>Back</b>.
<p>
<tr>
<td width=260 valign=top align=left colspan=4>
<table cellspacing=0 cellpadding=0 border=0 >
	<img src="images/arrow.gif">&nbsp;&nbsp;<font size=-2><b>NAME</b></font><br>
<tt><font color=#d1d3d3 size=-2><spacer type=horizontal size=17> ${request_headers.query.subscriber_name}</font></tt></a>
</table>
<p>
<table cellspacing=0 cellpadding=0 border=0> 
<img src="images/arrow.gif">&nbsp;&nbsp;<font size=-2><b>CONTACT</b></font><br>
<tt><font color=#d1d3d3 size=-2><spacer type=horizontal size=17> ${request_headers.query.subscriber_contact}</font></tt></a>
</table>
</TD>
<td abswidth=200 bgcolor=#171726 valign=top align=left>
<table cellspacing=0 cellpadding=0 border=0> <TR><TD>
<img src="images/arrow.gif"><font size=-2>&nbsp;&nbsp;<b>USERNAME</b></font><br>
<tr><td maxlines=1 >
<tt><font color=#d1d3d3><spacer type=horizontal size=17>${request_headers.query.subscriber_name}</font></tt></a>
</table>
<p>
<table cellspacing=0 cellpadding=0 border=0>
	<img src="images/arrow.gif">&nbsp;&nbsp;<font size=-2><b>CONTACT TYPE</b></font><br>
<tt><font color=#d1d3d3 size=-2><spacer type=horizontal size=17>${request_headers.query.subscriber_contact_method}</font></tt>
</table> <P>&nbsp;<P>&nbsp;
<td abswidth=20 bgcolor=#171726 >
</tr>
<tr>
<td valign= bottom height=39 colspan=7 bgcolor=#171726>
<shadow>
<hr size=5 valign=bottom></shadow>
</tr>
<tr>
<td border=2 colspan=4 width=300 height=50 bgcolor=#171726 valign=top align=left>
<font size=-1><i>
To go on, highlight
<b>Sign Up</b>
and<br> press <b>Return</b>.
</i></font>
<td bgcolor=#171726 height=50 width=150 valign=top align=right>
<font size=-1 color=#e7ce4a>
<shadow>
<input selected
Value="Sign Up"
name="Sign Up" usestyle width=100
width="100"
type=submit Value=Continue name="Continue" borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=110>
</shadow>
</font>
</form>	<td abswidth=13 absheight=50 bgcolor=#171726>
</tr>	</table>
</body>
</html>


`;
    }
}