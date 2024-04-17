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

	data = `<html>
<head>
<title>Connect Setup v2.2-minisrv</title>
<DISPLAY noscroll notvaudio switchtowebmode>
</head>
<body bgcolor="#3C2F47" text="#cbcbcb" link="#aaaaaa"
hspace="0" vspace="0" fontsize="large" noscroll>

<table cellspacing="0" cellpadding="0" cellborder="0">
  <tr>
    <td width="104" height="80" valign="top" align="left"><spacer type="block" WIDTH="11" HEIGHT="11"><br>
<spacer type="block" WIDTH="10" HEIGHT="1">    <a href="wtv-home:/home"><img src="${minisrv_config.config.service_logo}" width="87"
    height="67"></a>       
      </td>
    <td width="456" height="80" valign="middle" align="center">
 <br><h2>
         &nbsp;Connection Setup v2.2-minisrv
         </h2>
</td>
  </tr>
<tr><td colspan=4><hr>
<tr><td absheight=6>
</table>



	  <script>

  
	  function doConnect() {
		if (document.connect.machine.value == "${minisrv_config.services['wtv-1800'].host}" && document.connect.port.value == "${minisrv_config.services['wtv-1800'].port}") {
				alert("You are already here!");
		} else {
			document.connect.submit();
		}
	  }

	  function setOther() {
			count = document.connect.preset.length;
			document.connect.preset.selectedIndex = count - 1;
			setTimeout(updateService,10);
	  }
	  function updateService() {
		srv = document.connect.preset[document.connect.preset.selectedIndex].value;
		switch (srv) {
				case "mattman69":
					document.connect.machine.value="71.244.121.234"
                    document.connect.port.value="1615"
                    document.message.msg.value="This is MattMan69's Public HackTV minisrv, all are welcome to connect and enjoy the wonders of WebTV. Offers a custom experience."
					break;
				case "mm69bak":
					document.connect.machine.value="71.244.121.234"
                    document.connect.port.value="1415"
                    document.message.msg.value="This is the public HackTV minisrv backup, only available when the main HackTV server is down."
					break;
				case "mm69pri":
					document.connect.machine.value="71.244.121.234"
                    document.connect.port.value="1515"
                    document.message.msg.value="This is MattMan's normally private WebTV server. It's the real deal, not minisrv! May be up from time to time."
					break;
				case "zefie":
					document.connect.machine.value="24.148.114.32"
					document.connect.port.value="1615"
                    document.message.msg.value="This is zefie's public minisrv, for those who want the vanilla minisrv experience."
					break;
				case "local":
					document.connect.machine.value="127.0.0.1"
					document.connect.port.value="1615"
					document.message.msg.value="Connect to your server via localhost. Localhost refers to the computer that you are on that is running your server."
					break;
				case "jarhead":
					document.connect.machine.value="23.247.14.250"
					document.connect.port.value="1615"
					document.message.msg.value="This is Jarhead's public minisrv, for those who want a more original WebTV experience."
                    break;
				case "other":
					document.message.msg.value="Your custom service."
		}
	  }
	  </script>
      <form name="connect" action="wtv-tricks:/cSetup">
         <table width=100% cellspacing=1 cellpadding=0>
		    <tr>
				<td colspan=3>
					&nbsp;<font color=#4489a8>Presets:</font>
				</td>
				<td><spacer W=24 type=block>
					<select width="440" name="preset" onchange="updateService()" selected>
						<option value="mattman69" selected>MattMan's (HTV) MiniSrv - Public</option>
						<option value="mm69bak">MattMan's (HTV) MiniSrv - Bakup</option>
						<option value="mm69pri">MattMan's Revival Server</option>
						<option value="zefie">Zefie's MiniSrv - Public</option>
						<option value="jarhead">Jarhead's MiniSrv - Public</option>
						<option value="local">Localhost - Your Server</option>
						<option value="other">Other</option>
					</select>
<tr><td absheight=6>
            </table>
 <hr>
          <table width=100% cellspacing=1 cellpadding=0>
            <tr>
               <td height=6>
            <tr>
               <td colspan=3>
                  &nbsp;<font color=#4489a8>Service:</font>
            <tr>
               <td width=15></td>
               <td height=2>
            <tr>
               <td height=2>
            <tr>
               <td>
               <td>
                  <input name=serviceType type=radio bgcolor=#444444 value=custom checked>
               <td>
                  &nbsp;Custom:&nbsp;&nbsp;&nbsp;
               <td>
                  Address:
                  <input size=16 ASCIIONLY name=machine bgcolor=#444444 text=#cbcbcb cursor=#cc9933 value="71.244.121.234" onkeypress="setOther()">
                  &nbsp;&nbsp;&nbsp;Port:
                  <input size=5 ASCIIONLY NUMBERS name=port bgcolor=#444444 text=#cbcbcb cursor=#cc9933 value="1615" onkeypress="setOther()">
         </table>

                <spacer type=block height="8">
        <hr>
		 <table cellspacing=1 cellpadding=0>
            <tr>
               <td height=8>
            <tr>
               <td colspan=3>
                  &nbsp;<font color=#4489a8>Description:</font><br><br>
            <tr>
               <td width=20>
               <td width=390 align=left valign=top>
                  <form name=message>
                   <textarea rows=4 size=46 text=#cbcbcb id=msg name=msg border="0" bgcolor=#3C2F47 value='This is the public HackTV minisrv, all are welcome to connect and enjoy the wonders of WebTV. Custom experience!' nohighlight noselect>
                   </textarea>
                  </form>
               <td>
			   <td width=100% align=right valign=top>
			   <form action="client:GoToPhoneSetup">
					<font color="#E7CE4A" size=-2><shadow>&nbsp;
					<input
						type=submit
						borderimage="file://ROM/tvimages/TVButtonBorder.bif"
						value="Phone Settings"
						name="Phone Settings"
						usestyle
						width=170> &nbsp;
					</shadow></font>
					</form>
                <spacer type=block height="60">
					<font color="#E7CE4A" size=-2><shadow>&nbsp;
                    <input type=hidden name=useEncryption value=true checked>
					<input
						type=button
						borderimage="file://ROM/tvimages/TVButtonBorder.bif"
						value="Connect"
						name="Connect"
						onclick="doConnect()"
						usestyle
						width=170> &nbsp;
					</shadow></font>


         </table>
      </form>

</body>
</html>`;
}