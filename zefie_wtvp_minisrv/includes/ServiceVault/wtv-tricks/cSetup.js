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
<title>Connect Setup v3.0-minisrv</title>
<DISPLAY noscroll allowoffline notvaudio hideoptions switchtowebmode noreconnectalert>
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
<title>Connect Setup v3.0-minisrv</title>
<DISPLAY noscroll notvaudio >
</head>
<body hspace=0 vspace=0 fontsize=medium onload=uS() background=/ROMCache/bgpattern.gif bgcolor=#3C2F47 text=c6c6c6 link=0080ff vlink=0080ff>

<table cellspacing="0" cellpadding="0" cellborder="0" transparency=100>
  <tr>
    <td background="/ROMCache/cSetupShadowLogo.gif" width="104" height="80" valign="top" align="left"><spacer type="block" WIDTH="11" HEIGHT="11"><br>
<spacer type="block" WIDTH="10" HEIGHT="1">   <a href="wtv-home:/home"><img src="${minisrv_config.config.service_logo}" width="87"
    height="67"></a> </td>
    <td width="456" height="80" valign="top" align="center"><img src="ROMCache/cSetup.gif"
    width="456" height="50"><br>
    <img src="/ROMCache/Shadow_Horizontal.gif" width="456" height="6"> </td>
  </tr>
</table>

<h2>&nbsp;Connection Setup v3.0-minisrv </h2>
<hr>

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
                    document.runBy.runByName.value=" MattMan69"
					document.connect.machine.value="71.244.121.234"
                    document.connect.port.value="1615"
                    document.message.msg.value="This is MattMan69's Public HackTV minisrv, all are welcome to connect and enjoy the wonders of WebTV. Offers a custom experience."
					break;
				case "mm69bak":
                    document.runBy.runByName.value=" MattMan69"
					document.connect.machine.value="71.244.121.234"
                    document.connect.port.value="1415"
                    document.message.msg.value="This is the public HackTV minisrv backup, only available when the main HackTV server is down."
					break;
				case "mm69pri":
                    document.runBy.runByName.value=" MattMan69"
					document.connect.machine.value="71.244.121.234"
                    document.connect.port.value="1515"
                    document.message.msg.value="This is MattMan's normally private WebTV server. It's the real deal, not minisrv! May be up from time to time."
					break;
				case "zefie":
                    document.runBy.runByName.value="   zefie"
					document.connect.machine.value="204.11.163.156"
					document.connect.port.value="1615"
                    document.message.msg.value="This is zefie's public minisrv, for those who want the vanilla minisrv experience."
					break;
				case "local":
                    document.runBy.runByName.value="     You"
					document.connect.machine.value="127.0.0.1"
					document.connect.port.value="1615"
					document.message.msg.value="Connect to your server via localhost. Localhost refers to the computer that you are on that is running your server."
					break;
				case "jarhead":
                    document.runBy.runByName.value="   HIDEN"
					document.connect.machine.value="31.97.129.116"
					document.connect.port.value="1615"
					document.message.msg.value="WebTV Redialed, for those who want a more original WebTV experience."
                    break;
				case "other":
                    document.runBy.runByName.value="     ???"
					document.message.msg.value="Your custom service."

		}
	  }
	  </script>

<form name="connect" action="wtv-tricks:/cSetup">
    <table width="100%" cellspacing="1" cellpadding="0">
        <tr>
            <td colspan="3">
                &nbsp;<font color="#BBAEC8"><shadow>Presets:</shadow></font>
            </td>
            <td>
                <spacer W="24" type="block">
                <select width="440" name="preset" onchange="updateService()" selected>
                    <option value="mattman69" selected>MattMan's (HTV) MiniSrv - Public</option>
                    <option value="mm69bak">MattMan's (HTV) MiniSrv - Backup</option>
                    <option value="mm69pri">MattMan's Revival Server</option>
                    <option value="zefie">Zefie's MiniSrv - Public</option>
                    <option value="jarhead">WebTV Redialed - Public</option>
                    <option value="local">Localhost - Your Server</option>
                    <option value="other">Other</option>
                </select>
            </td>
        </tr>
        <tr>
            <td absheight="6"></td>
        </tr>
    </table>

    <hr>
    <table width="100%" cellspacing="1" cellpadding="0">
        <tr>
            <td height="6"></td>
        </tr>
        <tr>
            <td width="15"></td>
            <td height="2"></td>
        </tr>
        <tr>
            <td height="2"></td>
        </tr>
        <tr>
            <td>
                &nbsp;<font color="#BBAEC8"><shadow>Service:&nbsp;&nbsp;&nbsp;</shadow></font>
            </td>
            <td>
                Address:
                <input size="16" ASCIIONLY name="machine" bgcolor="#444444" text="#cbcbcb" cursor="#cc9933" value="71.244.121.234" onkeypress="setOther()">
                &nbsp;&nbsp;&nbsp;Port:
                <input size="5" ASCIIONLY NUMBERS name="port" bgcolor="#444444" text="#cbcbcb" cursor="#cc9933" value="1615" onkeypress="setOther()">
            </td>
        </tr>
    </table>

                <spacer type=block height="5">
                  <hr>
                  <table cellspacing=1 cellpadding=0>
                    <tr>
                      <td height=5>
                    <tr>

                      <td width=20>
                      <td align=left valign=top>
                        <font color=#BBAEC8>
                          <shadow>Description:</shadow>
                        </font><br><br>
                        <form name=message>
                          <textarea rows=4 size=46 text=#cbcbcb id=msg name=msg border="0" bgcolor=#3C2F47 value='This is the public HackTV minisrv, all are welcome to connect and enjoy the wonders of WebTV. Custom experience!' nohighlight noselect>
                   </textarea>
                        </form>
                      <td>
                      <td width=100% align=right valign=top>

                        <spacer type=block height="60">

                          <font color="#BBAEC8" size=-2>
                            <shadow>&nbsp;
                              <input type=hidden name=useEncryption value=true checked>
                              <input type=button value="Connect" name="Connect" onclick="doConnect()" usestyle width=160>&nbsp;&nbsp;&nbsp;
                            </shadow>
                          </font>
                          </form>

		 <table cellspacing=7 cellpadding=0 width=160>
            <tr>
               <td align="left">
				<form name=runBy>
				 <font color=c6c6c6>Server run by:</font>
				 
				 <tr>
                 <td align=left>
                 <b><input name=runByName text="#BBAEC8" size=11 border=0 nobackground nohighlight noselect value=&nbsp;MattMan69></b>
                </form>
             <tr>
           </td>
         </table>
        </table>


</body>
</html>`;
}