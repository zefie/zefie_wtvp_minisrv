headers =`200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-home:/splash
wtv-expire-all: htv-
Content-type: text/html`

if (initial_headers['psuedo-encryption']) {
	var cryptstatus = "<a href='client:showalert?message=Your%20WebTV%20Unit%20sent%20us%20a%20request%20for%20SECURE%20ON%2C%20but%20did%20not%20encrypt%20any%20data%2C%20nor%20will%20accept%20it.%20However%2C%20we%20send%20the%20wtv-encryption%20flag%20to%20roll%20with%20it%2C%20enabling%20%27psuedo-encryption%27.%20Nothing%20is%20encrypted%2C%20but%20the%20box%20trusts%20us.%20This%20will%20probably%20go%20away%20if%20you%20reload%20or%20change%20pages.&buttonaction1=client:donothing&buttonlabel1=Oh%2C%20okay...'>Psuedo-encrypted</a>";
} else {
	var cryptstatus = ((socket_session_data[socket.id].secure === true) ? "Encrypted" : "Not Encrypted")
}


data =`<html>
<head>
<DISPLAY showwhencomplete noscroll>
</head>
<body bgcolor="black" link="gold" vlink="gold" alink="gold" text="gold">
<script>
function ax(a) {
		document.open("text/url");
		document.write(a);
		document.close();
}
</script>
<h2>Encryption Status: `+cryptstatus+`</h2>`
if (socket_session_data[socket.id].secure) {
	data += '<span size="-1">Encryption Key (Server): ' + sec_session[socket.id].session_key2.toString(CryptoJS.enc.Hex)+'<br>';
	data += 'Encryption Key (Client): ' + sec_session[socket.id].session_key1.toString(CryptoJS.enc.Hex)+'</span><br><br>';
}
data += `<a href="javascript:ax('client:relog')" selected>client:relog (via text/url)</a><br>
<a href="client:relog">client:relog (direct)</a><br>
<a href="htv-update:/update">HackTV Updater Test</a><br>
<!-- <a href="wtv-home:/unlock">Unlock Full Client (Options, Goto, etc)</a><br> -->

</body>
</html>`