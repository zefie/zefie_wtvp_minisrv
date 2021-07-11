headers =`200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-home:/splash
Content-type: text/html`

if (getSessionData(socket_session_data[socket.id].ssid, 'box-does-psuedo-encryption')) {
	var cryptstatus = "<a href='client:showalert?message=Your%20WebTV%20Unit%20sent%20us%20a%20request%20for%20SECURE%20ON%2C%20but%20did%20not%20encrypt%20any%20data%2C%20nor%20will%20accept%20it.%20However%2C%20we%20send%20the%20wtv-encryption%20flag%20to%20roll%20with%20it%2C%20enabling%20%27psuedo-encryption%27.%20Nothing%20is%20encrypted%2C%20but%20the%20box%20trusts%20us.%20This%20will%20probably%20go%20away%20if%20you%20reload%20or%20change%20pages.&buttonaction1=client:donothing&buttonlabel1=Oh%2C%20okay...'>Psuedo-encrypted</a>";
} else {
	var cryptstatus = ((socket_session_data[socket.id].secure === true) ? "Encrypted" : "Not Encrypted")
}


data =`<html>
<head>
<title>Home for minsrv</title>
<DISPLAY showwhencomplete options showoptions noscroll>
</head>
<body bgcolor="black" link="gold" vlink="gold" alink="gold" text="gold">
<script>
function ax(a) {
		document.open("text/url");
		document.write(a);
		document.close();
}
</script>
<h1>Welcome to `+ z_title + `</h1>
<h3>Encryption Status: `+cryptstatus+`</h3>`
if (socket_session_data[socket.id].secure) {
	data += '<span size="-1">Encryption Key (Server): ' + sec_session[socket.id].session_key2.toString(CryptoJS.enc.Hex)+'<br>';
	data += 'Encryption Key (Client): ' + sec_session[socket.id].session_key1.toString(CryptoJS.enc.Hex)+'</span><br><br>';
}
data += `<h4>Working stuff</h4>
<a href="client:relog">client:relog (direct)</a><br>
<a href="wtv-tricks:/blastcache?">Clear Cache</a><br>

<h4>zefie's server only</h4>
<a href="wtv-music:/content/index.html">Music Collection</a><br>

<h4>Test Stuff (probably broken)</h4>
<a href="wtv-update:/update?" selected>HackTV Updater Test</a><br>
<a href="wtv-flashrom:/willie">Ultra Willies</a><br>
<a href="client:showalert?message=If%20you%20choose%20to%20disconnect%20and%20return%20to%20HackTV%20home%2C%20you%20may%20not%20be%20able%20to%20reconnect%20to%20the%20update%20server%20until%20you%20power%20cycle%20your%20box.%3Cbr%3E%3Cbr%3EAre%20you%20sure%20you%20would%20like%20to%20go%20offline%3F&buttonlabel1=No&buttonaction1=client:donothing&buttonlabel2=Yes&buttonaction2=wtv-tricks%3A%2Fgo-offline%3Ftitle%3DHackTV%2520Home">Disconnect and go to HackTV Home</a><br>
<!-- <a href="buttonaction2=wtv-home:/unlock">Unlock Full Client (Options, Goto, etc)</a><br> -->

</body>
</html>`