const minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

data = `<script language="Javascript">
function getHumanName(emailAddress)
{	return Blim.getUmanName(emailAddress);	}
function setHumanName(emailAddress, newName)
{	return Blim.setUmanName(emailAddress, newName);	}
function MessengerIsOkay()
{	return ( Blim.isAlive() );
}
function isFriend(emailAddress)
{	return Blim.isInList("FL", emailAddress);
}
function isBlocked(emailAddress)
{	return Blim.isInList("BL", emailAddress);
}
function isAllowed(emailAddress)
{	return Blim.isInList("AL", emailAddress);
}
// policy: if the user adds a friend, we automatically allow and unblock
// the person at the same time
function befriendThisPerson(emailAddress)
{	Blim.addToList("FL", emailAddress);
var executeAllow = "allowThisPerson('" + emailAddress + "');";
var executeUnblock = "unblockThisPerson('" + emailAddress + "');";
setTimeout(executeAllow, 1*1000);
setTimeout(executeUnblock, 2*1000);
}
// policy: do not block when un-buddying-- make sure person is on allow list
function defriendThisPerson(emailAddress)
{	Blim.removeFromList("FL", emailAddress);
var executeAllow = "allowThisPerson('" + emailAddress + "');";
setTimeout(executeAllow, 1*500);
setTimeout(refreshFriendList, 1*600);
}
function blockThisPerson(emailAddress)
{	Blim.removeFromList("AL", emailAddress);
setTimeout("blockThisPersonCore('" + emailAddress + "');", 1*1000);
setTimeout(refreshFriendList, 1*1100);
}
function blockThisPersonCore(emailAddress)
{	Blim.addToList("BL", emailAddress);
}
function unblockThisPerson(emailAddress)
{	Blim.removeFromList("BL", emailAddress);
setTimeout("allowThisPersonCore('" + emailAddress + "');", 1*1000);
setTimeout(refreshFriendList, 1*1100);
}
function allowThisPerson(emailAddress)
{	Blim.removeFromList("BL", emailAddress);
setTimeout("allowThisPersonCore('" + emailAddress + "');", 1*1000);
}
function allowThisPersonCore(emailAddress)
{	Blim.addToList("AL", emailAddress);
}
function disallowThisPerson(emailAddress)
{	Blim.removeFromList("AL", emailAddress);
setTimeout("blockThisPersonCore('" + emailAddress + "');", 1*1000);
}
// convenience: start a conversation
function StartConversation(emailAddress)
{	Blim.openConversation( emailAddress ); Blim.openMessagesPanel();
}	// convenience: bring up the main Messenger panel
function ShowMessengerPanel()
{	Blim.openMessagesPanel();
}
</script>
<script language="Javascript">
var gTheList = "FL";
var gUserHasNoFriends = (Blim.listLength("FL") < 0);
function scrollFriendList()
{	var scrawlHere = document.friendList.document;
// handle scrolling here when we get art and some scroll position client javascript
}
function refreshFriendList()
{	var i;
var scrawlHere = document.friendList.document;
scrawlHere.open("text/html", "replace");
var atLeastOneConnected = false;
if (! Blim.isAlive() )
{	scrawlHere.write("<table border=0 cellspacing=3 cellpadding=0><tr>");
scrawlHere.write("<tr><td><font color=#FFEFAD>");
scrawlHere.write("MSN Messenger is currently turned off. To send and receive instant ");
scrawlHere.write("messages again, choose <b>Turn MSN Messenger on</b>.");
scrawlHere.write("</font>");
scrawlHere.write("</table>");
scrawlHere.close();
return;
}
var listLength = Blim.listLength("FL");
if (listLength == 0)
{	scrawlHere.write('<table border=0 cellspacing=3 cellpadding=0 ><tr>');
scrawlHere.write("<tr><td><font color=FFEFAD size=-1>You don't have any buddies yet. ");
scrawlHere.write('<p>To add a buddy or send an instant message, ');
scrawlHere.write('choose <b>Use MSN Messenger now</b>. ');
scrawlHere.write('You can also add buddies in your Address book.');
}
else
{	scrawlHere.write("<table border=0 cellspacing=3 cellpadding=0><tr>");
var isFirst = true;
for ( i=0 ; i < listLength; i++)
{	var ID = Blim.listItem("FL", i);
var humanName = Blim.getUmanName(ID);
scrawlHere.write('<tr><td maxlines=1><b><a ');
if (isFirst)
{	scrawlHere.write(" id=firstFriend selected ");
isFirst = false;
}
scrawlHere.write('href="javascript:void(StartConversation(');
scrawlHere.write("'");
scrawlHere.write(ID);
scrawlHere.write("'");
scrawlHere.write('))">');
scrawlHere.write("<font color=FFEFAD>");	scrawlHere.write(escapeHTML(humanName));
scrawlHere.write('</a><font color=FFEFAD> - ');
scrawlHere.write('<a href="javascript:void(defriendThisPerson(');
scrawlHere.write("'");
scrawlHere.write(ID);
scrawlHere.write("'");
scrawlHere.write('))">');
scrawlHere.write("<font color=FFEFAD>");	scrawlHere.write('Remove');
scrawlHere.write('</a><font color=FFEFAD> - ');
if (isBlocked(ID)) {
scrawlHere.write('<a href="javascript:void(unblockThisPerson(');
scrawlHere.write("'");
scrawlHere.write(ID);
scrawlHere.write("'");
scrawlHere.write('))">');
scrawlHere.write("<font color=FFEFAD>");	
scrawlHere.write('Unblock');
} else {
scrawlHere.write('<a href="javascript:void(blockThisPerson(');
scrawlHere.write("'");
scrawlHere.write(ID);
scrawlHere.write("'");
scrawlHere.write('))">');
scrawlHere.write("<font color=FFEFAD>");	
scrawlHere.write('Block');
}
}
}
scrawlHere.write("</font>");
scrawlHere.write("</table>");
scrawlHere.close();
}
</script>
<script language="Javascript">
</script>
<HTML>
<head>
<title>	Choose who can send messages
</title>
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
<blackface><font color=#D6D6D6>	Choose who can send messages
</font></blackface>
<td width=21>
<img src="wtv-setup:/images/widget.gif" width=16 height=16>
<td width=34>
<spacer type=vertical size=1><br>
<a href="wtv-guide:/help?topic=Messenger&subtopic=Index"><font sizerange=small color=#E7CE4A><b>Help</b></font></a>
<td width=12>
<img width=1 height=1 src="wtv-mail:/update-light-wtv-token-2295058104-7A30D06D2B14D07410FB5D0C4FABA9FF">
</table>
</table>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=15 rowspan=2 bgcolor=#645D5F>
<td width=48 rowspan=2>
<td width=497 height=237 valign=top>
<form action="wtv-setup:/messenger-validate-list" name="editListForm">
<table cellspacing=0 cellpadding=0>
<tr>
<td height=12 colspan=3>
<tr>
<td abswidth=420 valign=top>
<embed SCROLLTARGET name=friendList usestyle nobackground src="file://ROM/HTMLs/Empty.html" height=208></embed>
<script language="Javascript">
refreshFriendList();
</script>
<table border=0 cellspacing=10 cellpadding=0>
<tr>
<td width=10></td>
<td>
</td>
<td width=10>
</tr>
</table>
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