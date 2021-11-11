var minisrv_service_file = true;


headers = `200 OK`


data = `<html>
<!--MattMan 2020--/>
<head>
<TITLE>
Messenger status
</TITLE>
<script language="JavaScript">
function atLoad()
{	Blim.onProtocolTranscriptChange("refreshTranscript()");
Blim.onProtocolStatusChange("refreshStatus()");
refreshTranscript();
refreshStatus();
}
function refreshTranscript()
{	var doc = document.transcript.document;
doc.open("text/html", "replace");
doc.write("<font size=-1 bgcolor=#000000 color=#ffdd33>");
doc.write("<table cellspacing=0 cellpadding=0>");
doc.write("<tr>");
doc.write("<td width=540 valign=bottom>");
doc.write(Blim.getDebugTranscript());
doc.write("</table>");
doc.write("</font>");
doc.close();
}
function refreshStatus()
{	document.forms[0].status.value = Blim.getConnectionState();
}
function removeOne()
{	var list = "FL";
if(Blim.listLength(list) == 0)
list = "AL";
if(Blim.listLength(list) == 0)
list = "BL";
if (Blim.listLength(list) > 0)
{	var toRemove = Blim.listItem(list, 0);
Blim.removeFromList(list, toRemove);
}
}
function clearAllLists()
{	if(Blim.listLength("FL") == 0 && Blim.listLength("AL") == 0 && Blim.listLength("BL") == 0 )
message("Your lists are already clear.");
else
{	removeOne();
setTimeout("clearAllLists();", 2*1000);
}
}
</script>
<DISPLAY nosave
>
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 bgcolor=452a36>
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=92 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=6>
<tr><td absheight=5 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor=2e1e26>
<img src="/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor=6b4657>
<img src="/ROMCache/Spacer.gif" width=1 height=1>
</table>
<tr>
<td height=31 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=5 height=26>
<td width=93>
<table width=93 cellspacing=0 cellpadding=0 href=wtv-guide:/help?topic=Messenger&subtopic=Index>
<tr>
<td>
<table cellspacing=0 cellpadding=0>
<tr>
<td>
<shadow><font color=e7ce4a size=-1>&nbsp;Help
</table>
</table>
<td width=6>
<tr>
<td colspan=3 width=104 height=2 bgcolor=000000 transparency=64>
<spacer>
<tr>
<td height=1>
<tr>
<td colspan=3 width=104 height=2 bgcolor=ffffff transparency=88>
<spacer>
</table>
<tr><td absheight=101>
<tr><td absheight=166 align=right colspan=3>
<img src="wtv-setup:/ROMCache/SettingsBanner.gif" width=54 height=166>
<tr><td absheight=41>
</table>
</sidebar>
<BODY NOHTILEBG BGCOLOR="#191919" TEXT="#42CC55" LINK="36d5ff" VLINK="36d5ff" HSPACE=0 VSPACE=0 FONTSIZE="large"
>
<table cellspacing=0 cellpadding=0 height=340>
<tr>
<td abswidth=14>
<td abswidth=416 absheight=80 valign=center>
<font size="+2" color="E7CE4A"><blackface><shadow>
Messenger status
<td abswidth=20>
<tr>
<td>
<td valign=top align=left>
<form
action="client:goback"
>
<form>
<input type=button value ="Open Messenger Panel" name="msgr" onclick="javascript:void(Blim.openMessagesPanel());">
</form>
<p>
<script language="JavaScript">
document.write("User: ");
document.write(Blim.getServiceParameter("MSN", "UNAM"));
document.write("<br>");
document.write(Blim.getServiceParameter ("MSN","UPW" ));
document.write("<br>");
document.write("Server: ");
document.write(Blim.getServiceParameter("MSN", "SNAM"));
document.write("<br>");
document.write("Enabled: ");
document.write("True<br>");
document.write("Passport: ");
document.write(Blim.getServiceParameter("MSN", "PPOR"));
document.write("<br>");
document.write("Alive: ");
if(Blim.isAlive())
document.write("True<br>");
else
document.write("False<br>");
document.write("Status: ");
document.write(Blim.getConnectionState());
</script>
<p>
<form>
<table border=0 cellspacing=0 cellpadding=0>
<tr>
<td valign=top>
<input type=button value ="Clear" name="goofy" onclick="(clearAllLists());">
<td width=5><spacer type=horizontal width=5>
<td valign=top>Clear your allow, block, and buddy lists in one swell foop!
</table>	</form>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=450 >	<embed height=1 name=transcript border=0 src="file://ROM/HTMLs/Empty.html">
</table>
<td>
<tr>
<td absheight=7>
<tr>
<td>
<td colspan=2 absheight=2 bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=426 height=1>
<tr>
<td absheight=1>
<tr>
<td>
<td colspan=2 absheight=2 bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=426 height=1>
<tr>
<td absheight=4>
</table>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=430 valign=top align=right>
<font color="#E7CE4A" size=-1><shadow>
<input
selected
type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif"
value=Done name="Done" usestyle width=103>
</shadow></font></form>
<td abswidth=20>
<tr><td height=10>
</table>

</body>
</html>`