headers = `200 OK
Content-Type: text/html`;

data = `<html>
<head>
<title>
Using ${minisrv_config.config.service_name}
</title>
<display nooptions noscroll NoScroll>
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
<td bgcolor="#5b6c81" border=0 rowspan=2 width=21 height= 220></td>
<td bgcolor="#171726" border=0 width=9 height=25 align=left valign=top>
<img src="images/L_corner.gif" width=8 height=8>
<td bgcolor="#171726" border=1 colspan=1 width=70 height=25>
<td colspan=6 bgcolor="#171726" border=1 height=25 align=left valign=bottom gradcolor=#262E3D gradangle=90>
<font color=#d1d3d3 size=+1>
<blackface>
Welcome
</blackface></font>
<tr> <td border=0 width=40 bgcolor="#171726" rowspan="2" >
<td absheight=20 width=100 bgcolor="#171726" colspan=6>
</tr>
</table>
<table cellspacing=0 cellpadding=0 border=0 width=560 bgcolor=#171726>
<tr>
<td bgcolor= "#5b6c81" border=0 rowspan=6 abswidth=21 height= 220></td>
<td border=0 abswidth=40 bgcolor="#171726" rowspan="6" >
<form action="ValidateWelcome"
ENCTYPE="x-www-form-encoded" METHOD="POST">
<input type=hidden name=registering value="true">
<td height=230 width= 300 bgcolor="#171726" colspan=5 valign=top align=left>
Welcome to the ${minisrv_config.config.service_name} Mini Service, operated by ${minisrv_config.config.service_owner}
The next screens will lead you through a quick setup process for using this service.<p> Press the "Continue" button below to begin setup.<p>
<td abswidth=20 bgcolor=#171726 >
</tr>
<tr>
<td valign= bottom height=15 colspan=7 bgcolor=#171726>
<shadow>
<hr size=5 valign=bottom></shadow>
</tr>
<tr>
<td border=2 colspan=4 width=100 height=50 bgcolor=#171726 valign=top align=left>
<font size=-1><i>
</i></font>
<td bgcolor=#171726 height=50 width=560 valign=top align=right>
<font size=-1 color=#e7ce4a>
`;
var namerand = Math.floor(Math.random() * 100000);
var nickname = (minisrv_config.config.service_name + '_' + namerand)
var human_name = nickname;
    data += `
<shadow>
<input type=button action="ValidateAgreement?registering=true&subscriber_name=${human_name}&subscriber_username=${nickname}" Value="Quick Reg" name="speedyreg" borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=130>
<input type=button action="ValidateWelcome" Value="Sign in as Guest" name="noreg" borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=170>
<input type=submit Value=Continue name="Continue" borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=110 selected>
</shadow>
</font>
</form>	<td abswidth=13 absheight=50 bgcolor=#171726>
</tr>	</table>
</body>
</html>
`;