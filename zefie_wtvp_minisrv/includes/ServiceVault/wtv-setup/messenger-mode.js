const minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `<HTML>
<head>
<title>	MSN Messenger settings
</title>
<script language="Javascript">
function setupSettings()
{	var theForm = document.modeForm;
var goOpenMode = theForm.theListRadio[0];
var goClosedMode = theForm.theListRadio[1];
goOpenMode.checked = ! Blim.isClosedMode();
goClosedMode.checked = Blim.isClosedMode();
}
function makeChanges()
{	var theForm = document.modeForm;
var goOpenMode = theForm.theListRadio[0];
var goClosedMode = theForm.theListRadio[1];
if (goOpenMode.checked)
Blim.setClosedMode(false);
else if (goClosedMode.checked)
Blim.setClosedMode(true);
// window.location = "client:goback";
}
</script>
</head>
<display nosave>
<body bgcolor="#2E2E2A" text="#CBCBCB" link="#FFE99B" vlink="#FFE99B" hspace=0 vspace=0 fontsize="medium">
<table cellspacing=0 cellpadding=0 border=0 bgcolor=#645D5F>
<tr>
<td height=7 colspan=4>
<tr>
<td width=7>
<td width=87 href="wtv-home:/home">
<img src="/ROMCache/WebTVLogoJewel.gif" width=87 height=67>
<td width=7>
<td width=459 valign=bottom>
<img src="wtv-setup:/images/Settings.gif" width=197 height=58>
<tr>
<td height=5 colspan=4>
</table>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=15 height=25 bgcolor=#645D5F>
<td width=545 height=25 bgcolor=#2E2E2A gradcolor=#23231F gradangle=90>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=8 height=25 valign=top>
<img src="wtv-setup:/images/CornerTop.gif" width=8 height=8>
<td width=78>
<td abswidth=392 valign=middle maxlines=1>
<blackface><font color=#D6D6D6>	MSN Messenger settings
</font></blackface>
<td width=21>
<img src="wtv-setup:/images/widget.gif" width=16 height=16>
<td width=34>
<spacer type=vertical size=1><br>
<a href="wtv-guide:/help?topic=Messenger&subtopic=Index"><font sizerange=small color=#E7CE4A><b>Help</b></font></a>
<td width=12>
<img width=1 height=1 src="wtv-mail:/update-light-wtv-token-745586897-D8457537A2A3153CC59CCCE37A3A93EA">
</table>
</table>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=15 rowspan=2 bgcolor=#645D5F>
<td width=48 rowspan=2>
<td width=497 height=237 valign=top>
<form action="client:goback" ID="modeForm">
<table cellspacing=0 cellpadding=0>
<tr>
<td height=12 colspan=3>
<tr>
<td abswidth=200 valign=top>
You can decide how available you'd like to be with MSN Messenger. <p>
<script language="Javascript">
if (Blim.isClosedMode())
document.write("You currently allow only people on your allow list to send you messages.");
else
document.write("You currently allow everyone except people you've blocked to send you messages.");
</script>
<td abswidth=40>
<spacer type=horizontal size=40>
<td abswidth=220 valign=top>
<table>
<tr>
<td valign=top align=right>
<input type="radio" name="theListRadio" value="chooseOpenMode" onChange="makeChanges()">
<spacer type=horizontal width=2></td>
<td>Allow everyone except people you've blocked to contact you</td>
<tr>
<td height=5>
</tr><tr>
<td valign=top align=right>
<input type="radio" name="theListRadio" value="chooseClosedMode" onChange="makeChanges()">
<spacer type=horizontal width=2></td>
<td>Allow only people on your list to contact you</td>
</tr>
</table>
<script language="Javascript">
setupSettings();
</script>
</table>
<tr>
<td align=right>
<table cellspacing=0 cellpadding=0>
<tr>
<td>
<spacer type=horizontal size=12>
<font color="#E7CE4A" size=-1><shadow>
<input
type=submit selected
value=Done name="Done" usestyle selected
borderimage="file://ROM/Borders/ButtonBorder2.bif"
width=103>
</shadow></font></form>
<td abswidth=12>
<tr>
<td height=12 colspan=2>
</table>
</table>
</body>
</HTML>
`;