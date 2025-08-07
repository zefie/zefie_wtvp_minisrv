var minisrv_service_file = true;

if (request_headers.query.machine && request_headers.query.port) {
	headers = `200 OK
Content-Type: text/html
Connection: close
wtv-connection-close: true
wtv-service: reset
wtv-service: name=wtv-1800 host=${request_headers.query.machine} port=${request_headers.query.port} flags=0x00000004 connections=1
wtv-boot-url: wtv-1800:/preregister
`
	data = `<html>
<head>
<title>Connect Setup v2.2-minisrv</title>
<DISPLAY noscroll allowoffline notvaudio nooptions switchtowebmode noreconnectalert>
</head>
<body bgcolor="#3C2F47" text="#cbcbcb" link="#aaaaaa"
hspace="0" vspace="0" fontsize="large" noscroll hideoptions onload="load()">
<h2>Connecting...</h2>
Please wait while we connect you to ${request_headers.query.machine}:${request_headers.query.port} ...
<script>
function activ() {
	location.href = "client:activ";
}

function load() {
	location.href = "client:hangup";
	setTimeout(activ, 1000);	
}
</script>
</body>
</html>
`;

} else {

	headers = `200 OK
Content-Type: text/html`

	data = `<html><head><display nooptions noscroll allowoffline notvaudio switchtowebmode nosend>
<body hspace=0 vspace=0 fontsize=medium onload=uS() background=/ROMCache/bgpattern.gif bgcolor=003366 text=c6c6c6 link=0080ff vlink=0080ff yspeed=1 transition=slidedown>
<script src=htv-cSetup.js></script>
<title>Connect Setup v3.0</title>
</head><table cellspacing=0 cellpadding=0 bgcolor=004488 gradcolor=003366 gradangle=45 gradtransparency=100><tr><td>
<table cellspacing=0 cellpadding=0><tr>
	<td background=/ROMCache/cSetupShadowLogo.gif width=104 height=80 valign=top align=left><spacer type=block width=11 height=11><br>
		<spacer type=block width=10 height=1>
	</td><td width=456 height=80 valign=top>
		<img src=/ROMCache/cSetup.gif width=456 height=50><br>
		<img src=/ROMCache/Shadow_Horizontal.gif width=456 height=6>
	</td>
</tr></table>
<table width=100% cellspacing=0 cellpadding=0><tr>
	<td valign=middle><spacer height=16 type=vertical><font size=+2 color=f0f0f0 effect=emboss><b>&nbsp;Connect Setup v3.0</b></font></td>
	</font></form></td>
</tr></table>
<spacer height=2 type=vertical><hr><spacer height=15 type=vertical>
<form name=c action=client:ConfirmConnectSetup>
<table width=100% cellspacing=1 cellpadding=0>
<tr><td colspan=3>&nbsp;Server:</td>
<td><select width=420 name=p onchange=uS() selected>
<option value=htv>MattMan's (HTV) MiniSrv</option>
<option value=htvb>MattMan's (HTV) MiniSrv Backup</option>
<option value=mm69>MattMan's Revival Srv.</option>
<option value=zef>zefie's MiniSrv</option>
<option value=red>WebTV Redialed</option>
<option value=local>Your Local Machine</option>
<option value=other>Other</option>
</select></table>
<table width=100% cellspacing=1 cellpadding=0>
<tr><td height=18>
<tr><td><input name=serviceType type=hidden value=custom>
&nbsp;Address:&nbsp;&nbsp;&nbsp;<input size=21 asciionly name=machine value="" bgcolor=191919 text=c6c6c6 cursor=cc9933>
&nbsp;&nbsp;&nbsp;Port:<input size=5 asciionly numbers name=port value="" bgcolor=191919 text=c6c6c6 cursor=cc9933>
</table><hr><br>
<table cellspacing=1 cellpadding=0>
<tr><td height=1>
<tr><td colspan=2>&nbsp;Info:<br><br><td>
<tr><td width=20><td width=300 align=left valign=top>
<form name=i><font size=-1 color=c6c6c6><textarea name=msg rows=6 size=50 border=0 nobackground nohighlight noselect usestyle>The public HackTV minisrv, 
all are welcome to connect and enjoy the wonders of WebTV. Custom experience, but simulates the WebTV network after its MSN TV rebrand.</textarea>
</font>
<td><td width=100% align=right valign=top>
<font id=connectText color=e7ce4a size=-1 effect=shadow>
<b><input type=submit value=Connect name=Connect width=150 selected></b>
<br><br><font color=c6c6c6><input size=14 border=0 nobackground nohighlight noselect name=runByText value="Server run by:" usestyle></font>
<b><input name=runBy size=14 border=0 nobackground nohighlight noselect usestyle value=MattMan69></b>
</font>
</td></tr>
</table>
`;
}