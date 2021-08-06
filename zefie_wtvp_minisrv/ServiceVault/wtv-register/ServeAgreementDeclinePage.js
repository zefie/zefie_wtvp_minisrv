headers = `200 OK
Content-Type: text/html`

data = `<html>
<head>
<title>
Are you sure you want to decline?
</title>
<display nooptions noscroll >
<FORM ACTION="client:goback" ENCTYPE="x-www-form-encoded" METHOD="POST">
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
Are you sure you want to decline?
</blackface></font>
<tr> <td border=0 width=40 bgcolor="#171726" rowspan="2" >
<td absheight=20 width=100 bgcolor="#171726" colspan=6>
</tr>
</table>
<table cellspacing=0 cellpadding=0 border=0 width=560 bgcolor=#171726>
<tr>
<td bgcolor= "#5b6c81" border=0 rowspan=6 abswidth=21 height= 220></td>
<td border=0 abswidth=40 bgcolor="#171726" rowspan="6" >
<form >
<td height=230 width= 300 bgcolor="#171726" colspan=5 valign=top align=left>
You have declined the agreements on the previous page.
You won't be able to access the ${minisrv_config.config.service_name} service unless you
accept these agreements. To return to the previous page and
accept these agreements, choose <b>Continue</b>.
<p>
To exit the registration, choose <b>Power Off</b>.
Remember: you won't be able to access the ${minisrv_config.config.service_name} service without
accepting the agreement.
</font>
<td abswidth=20 bgcolor=#171726>
</tr>
<tr>
<td valign= bottom height=15 colspan=7 bgcolor=#171726>
<shadow>
<hr size=5 valign=bottom>
</shadow>
</tr>
<tr>
<td border=2 height=50 colspan=4 bgcolor=#171726 valign=top align=right width=600 >
<font size=-1 color=#e7ce4a>
<input type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=150
name="Power_Off" width="100"
value="Power Off"
action="client:poweroff" >
&nbsp;&nbsp;</font>
<td bgcolor=#171726 height=50 valign=top align=right width=150>
<font size=-1 color=#e7ce4a>
<shadow>
<input type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=150
selected
name="Continue"
width="100"
action="client:goback"
value="Continue">
</shadow>
</font>	</form>	</tr>	</table>
</body>
</html>`;
