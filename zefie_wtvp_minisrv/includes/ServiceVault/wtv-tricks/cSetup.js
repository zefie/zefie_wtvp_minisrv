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
<script src=/ROMCache/h.js></script><script src=/ROMCache/n.js></script>
<script src=htv-cSetup.js></script>
</head><form name=t><input type=hidden name=h value=&pname;></form>
<script>head('Connect Setup v2.6');
window.onload=uS;
</script><form name=c action=client:ConfirmConnectSetup>
<table width=100% cellspacing=1 cellpadding=0>
<tr><td height=18>
<tr><td colspan=3>&nbsp;Server:</td>
<td><select width=420 name=p onchange=uS() selected>
<option value=htv>MattMan's (HTV) MiniSrv</option>
<option value=htvb>MattMan's (HTV) MiniSrv Backup</option>
<option value=mm69>MattMan's Revival Srv.</option>
<option value=zef>zefie's MiniSrv</option>
<option value=jar>WebTV Redialed</option>
<option value=zlan>zefie LAN (.8)</option>
<option value=zlan2>zefie LAN (.95)</option>
<option value=other>Other</option>
</select></table>
<table width=100% cellspacing=1 cellpadding=0>
<tr><td height=18>
<tr><td><input name=serviceType type=hidden value=custom>
&nbsp;Address:&nbsp;&nbsp;&nbsp;<input size=21 asciionly name=machine value="" bgcolor=191919 text=c6c6c6 cursor=cc9933>
&nbsp;&nbsp;&nbsp;Port:<input size=5 asciionly numbers name=port value="" bgcolor=191919 text=c6c6c6 cursor=cc9933>
</table>
<spacer type=block height=42><hr><br>
<table cellspacing=1 cellpadding=0>
<tr><td height=1>
<tr><td colspan=2>&nbsp;Info:<br><br><td>
<tr><td width=20><td width=300 align=left valign=top>
<form name=i><font size=-1><script>ta(6,46,'msg',0,'','nohighlight noselect',1)</script></font></form>
<td><td width=100% align=right valign=top>
<font size=-2><input type=hidden name=useEncryption value=true><script>butt('Connect','Connect',170);</script></font>	
</form>
<form action=client:gotophonesetup><font size=-2><script>butt( 'Dialing Options', '', 170);</script></font></form>
</table>
`;
}