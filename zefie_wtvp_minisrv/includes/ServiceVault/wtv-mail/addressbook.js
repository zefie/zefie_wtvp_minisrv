const minisrv_service_file = true;
const camefrom = request_headers.query.camefrom;
const action = request_headers.query.action;

let address_book = null
address_book = session_data.getSessionData("address_book")
if (address_book == null) {
	session_data.setSessionData("address_book", [])
	address_book = [];
}

if (!camefrom && !action) {
	headers = `200 OK`
	data = `<html>
<head>
<SAVEPANEL
message="The address book cannot be saved, because it is part of ${ minisrv_config.config.service_name }"
>
<SENDPANEL action="wtv-mail:/sendmail"
message="Write a new message"
label="Write"
>
<title>Addresses</title>
</head>
<print blackandwhite>
<sidebar width=114 height=420 align=left>
<table cellspacing=0 cellpadding=0 bgcolor=333b5a>
<tr>
<td colspan=3 width=104 absheight=4>
<td rowspan=100 width=10 height=420 valign=top align=left bgcolor=191919>
<img src="wtv-mail:/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0 width=100%>
<tr>
<td abswidth=6>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1>
<td align=center>
<img src="wtv-mail:/ROMCache/WebTVLogoJewel.gif" width=87 height=67>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="wtv-mail:/listmail"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Mail list</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table id=new href="/addressbook?camefrom=inbox&action=edit&new_address=true&selected=new"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Add</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="client:showalert?message=This%20feature%20is%20not%20currently%20available." transition=light cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Look up</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="wtv-guide:/quickhelp?title=AddressBook"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Help</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=174 valign=bottom align=right >
<img src="wtv-mail:/ROMCache/BannerMail.gif" width=50 height=96>
<tr><td colspan=3 absheight=36>
</table>
</sidebar>
<body instructions="wtv-guide:/helpindex?title=Index_Mail"
bgcolor="191919" text="42BD52" link="189CD6" vlink="189CD6"
vspace=0
hspace=0>
<table cellspacing=0 cellpadding=0>
<tr>
<td height=16 valign=top align=left>
<tr>
<td abswidth=8><img src="wtv-home:/ROMCache/Spacer.gif" width=8 height=1>
<td height=39 valign=top>
<font size=+1 color="E7CE4A">
<blackface>
<shadow>
E-mail addresses for ${session_data.getSessionData("subscriber_username")}
</shadow>
</blackface>
</font>
</table>
<table border=0 cellspacing=0 cellpadding=0>
<tr absheight=26>
<td rowspan=1000 abswidth=8>
<td colspan=3>
Your address is ${session_data.getSessionData("subscriber_username")}@${minisrv_config.config.service_name}
<tr absheight=8>
<td colspan=3>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=8>
<tr>
<td colspan=3 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=1 valign=top align=left>
<tr>
<td colspan=3 height=2 valign=top align=left bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=170 height=26 valign=middle align=left>
<font size=-1><b>Name</b></font>
<td abswidth=230 valign=middle align=left>
<font size=-1><b>E-mail address</b></font>
<td abswidth=38 valign=middle align=right>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=26>
<tr>
<td colspan=3 height=2 valign=middle align=center bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=1 valign=top align=left>
<tr>
<td colspan=3 height=2 valign=top align=left bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=10>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=10>
</table>`;
	for (let i = 0; i < address_book.length; i++) {
		data += `
<table border=0 cellspacing=0 cellpadding=0>
<TR>
<TD ABSWIDTH=8 valign=top>
<TD ABSWIDTH=400>
<TABLE cellspacing=0 cellpadding=0 HREF="/addressbook?camefrom=inbox&action=edit&id=${i}">
<TR><TD ABSWIDTH=150 valign=top>${address_book[i].name}
<TD ABSWIDTH=20 width=20><spacer>
<TD ABSWIDTH=230 valign=top>${address_book[i].address}
</TABLE>
<TD ABSWIDTH=30>
<TR>
<TD colspan=4 absheight=6><spacer>
</table>`
	}
	data += `
</table>
</body></html>`;
} else {
	switch (camefrom) {
		case "messenger":
			headers = `200 OK`;
			data = `<script language="Javascript">
function getHumanName(emailAddress)
{return Blim.getUmanName(emailAddress);}
function setHumanName(emailAddress, newName)
{return Blim.setUmanName(emailAddress, newName);}
function MessengerIsOkay()
{return ( Blim.isAlive() );
}
function isFriend(emailAddress)
{return Blim.isInList("FL", emailAddress);
}
function isBlocked(emailAddress)
{return Blim.isInList("BL", emailAddress);
}
function isAllowed(emailAddress)
{return Blim.isInList("AL", emailAddress);
}
// policy: if the user adds a friend, we automatically allow and unblock
// the person at the same time
function befriendThisPerson(emailAddress)
{Blim.addToList("FL", emailAddress);
var executeAllow = "allowThisPerson('" + emailAddress + "');";
var executeUnblock = "unblockThisPerson('" + emailAddress + "');";
setTimeout(executeAllow, 1*1000);
setTimeout(executeUnblock, 2*1000);
}
// policy: do not block when un-buddying-- make sure person is on allow list
function defriendThisPerson(emailAddress)
{Blim.removeFromList("FL", emailAddress);
var executeAllow = "allowThisPerson('" + emailAddress + "');";
setTimeout(executeAllow, 1*500);
setTimeout(location.reload(), 1*600);
}
function blockThisPerson(emailAddress)
{Blim.removeFromList("AL", emailAddress);
setTimeout("blockThisPersonCore('" + emailAddress + "');", 1*1000);
}
function blockThisPersonCore(emailAddress)
{Blim.addToList("BL", emailAddress);
setTimeout(location.reload(), 1*1100);
}
function unblockThisPerson(emailAddress)
{Blim.removeFromList("BL", emailAddress);
setTimeout("allowThisPersonCore('" + emailAddress + "');", 1*1000);
setTimeout(location.reload(), 1*1100);
}
function allowThisPerson(emailAddress)
{Blim.removeFromList("BL", emailAddress);
setTimeout("allowThisPersonCore('" + emailAddress + "');", 1*1000);
}
function allowThisPersonCore(emailAddress)
{Blim.addToList("AL", emailAddress);
}
function disallowThisPerson(emailAddress)
{Blim.removeFromList("AL", emailAddress);
setTimeout("blockThisPersonCore('" + emailAddress + "');", 1*1000);
}
// convenience: start a conversation
function StartConversation(emailAddress)
{Blim.openConversation( emailAddress ); Blim.openMessagesPanel();
}// convenience: bring up the main Messenger panel
function ShowMessengerPanel()
{Blim.openMessagesPanel();
}
</script>
<HTML>
<HEAD>
<TITLE>Addresses</TITLE>
<sendpanel action="wtv-mail:/sendmail"
message="Write a new message"
label="Write">
<savepanel
action="wtv-mail:/listmail?mailbox_name=mbox"
message="View your saved messages"
label="View saved messages">
</HEAD>

<SIDEBAR width="109" HEIGHT=420 ALIGN=LEFT>
<TABLE CELLSPACING=0 CELLPADDING=0 BGCOLOR=333B5A>
<TR><TD COLSPAN=3 WIDTH=120 ABSHEIGHT=4>
<TD ROWSPAN=100 WIDTH=10 HEIGHT=420 VALIGN=TOP ALIGN=LEFT BGCOLOR=191919><IMG SRC="ROMCache/Shadow.gif" WIDTH=6 HEIGHT=420>
<TR><TD ABSWIDTH=6>
<TD ABSWIDTH=109 ABSHEIGHT=76>
<TABLE HREF="wtv-home:/home" ABSHEIGHT=76 CELLSPACING=0 CELLPADDING=0 WIDTH=100%>
<TR><TD ABSWIDTH=6>
<IMG SRC="ROMCache/spacer.gif" WIDTH=1>
<TD ALIGN=CENTER><IMG SRC="ROMCache/WebTVLogoJewel.gif" WIDTH=87 HEIGHT=67>
</TABLE>
<TD ABSWIDTH=5>

<TR><TD COLSPAN=3 ABSHEIGHT=2 VALIGN=MIDDLE ALIGN=CENTER BGCOLOR=202434><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 ABSHEIGHT=1 VALIGN=TOP ALIGN=LEFT><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 ABSHEIGHT=2 VALIGN=TOP ALIGN=LEFT BGCOLOR=515B84><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD ABSWIDTH=6 >
<TD ABSWIDTH=109 ABSHEIGHT=26>
<TABLE HREF="wtv-mail:/listmail" CELLSPACING=0 CELLPADDING=0>
<TR><TD ABSWIDTH=5>
<TD ABSWIDTH=109 VALIGN=MIDDLE ALIGN=LEFT>
<TABLE BGCOLOR=333B5A CELLSPACING=0 CELLPADDING=0>
<TR><TD ABSHEIGHT=1>
<TR><TD MAXLINES=1><SHADOW><FONT SIZERANGE=MEDIUM COLOR="E7CE4A">Mail List</FONT></SHADOW>
</TABLE>
</TABLE>
<TD ABSWIDTH=5>

<TR><TD COLSPAN=3 ABSHEIGHT=2 VALIGN=MIDDLE ALIGN=CENTER BGCOLOR=202434><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 ABSHEIGHT=1 VALIGN=TOP ALIGN=LEFT><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 ABSHEIGHT=2 VALIGN=TOP ALIGN=LEFT BGCOLOR=515B84><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD ABSWIDTH=6 >
<TD ABSWIDTH=109 ABSHEIGHT=26 >

<TABLE href="/addressbook?action=edit&new_address=true&selected=new" CELLSPACING=0 CELLPADDING=0>
<TR><TD ABSWIDTH=5>
<TD ABSWIDTH=130 VALIGN=MIDDLE ALIGN=LEFT>
<TABLE BGCOLOR=333B5A CELLSPACING=0 CELLPADDING=0>
<TR><TD ABSHEIGHT=1>
<TR><TD MAXLINES=1><SHADOW><FONT SIZERANGE=MEDIUM COLOR="E7CE4A">Add</FONT></SHADOW>
</TABLE>
</TABLE>
<TD ABSWIDTH=5>

<TR><TD COLSPAN=3 ABSHEIGHT=2 VALIGN=MIDDLE ALIGN=CENTER BGCOLOR=202434><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 ABSHEIGHT=1 VALIGN=TOP ALIGN=LEFT><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 ABSHEIGHT=2 VALIGN=TOP ALIGN=LEFT BGCOLOR=515B84><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD ABSWIDTH=6 >
<TD ABSWIDTH=109 ABSHEIGHT=26 >
<TABLE href="JavaScript:alert('No idea what this goes to')" CELLSPACING=0 CELLPADDING=0>
<TR><TD ABSWIDTH=5>
<TD ABSWIDTH=130 VALIGN=MIDDLE ALIGN=LEFT>
<TABLE BGCOLOR=333B5A CELLSPACING=0 CELLPADDING=0>
<TR><TD ABSHEIGHT=1>
<TR><TD MAXLINES=1><SHADOW><FONT SIZERANGE=MEDIUM COLOR="E7CE4A">Help</FONT></SHADOW>
</TABLE>
</TABLE>
<TD ABSWIDTH=5>

<TR><TD COLSPAN=3 ABSHEIGHT=2 VALIGN=MIDDLE ALIGN=CENTER BGCOLOR=202434><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 ABSHEIGHT=1 VALIGN=TOP ALIGN=LEFT><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 ABSHEIGHT=2 VALIGN=TOP ALIGN=LEFT BGCOLOR=515B84><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 HEIGHT=205 VALIGN=BOTTOM ALIGN=RIGHT ><IMG SRC="ROMCache/BannerMail.gif" WIDTH=50 HEIGHT=96>
<TR><TD COLSPAN=3 ABSHEIGHT=36>
</TABLE>
</SIDEBAR>


<BODY BGCOLOR="191919" TEXT="42BD52" LINK="189CD6" VLINK="189CD6" FONTSIZE="SMALL" VSPACE=0>

<TABLE CELLSPACING=0 CELLPADDING=0>
<TR><TD COLSPAN=3 HEIGHT=12VALIGN=TOP ALIGN=LEFT>
<TR><TD COLSPAN=3 HEIGHT=35 VALIGN=TOP><FONT SIZE=+3 COLOR="E7CE4A"><B><SHADOW><BLACKFACE>Buddies for ${session_data.getSessionData("subscriber_username") || "You"
				}</BLACKFACE></SHADOW></B></FONT>
<TR><TD COLSPAN=3 HEIGHT=25 VALIGN=TOP>
<TABLE CELLSPACING=0 CELLPADDING=0>
<TD WIDTH=400>Your address is ${session_data.getSessionData("messenger_email") || "unlinked"
				}@${session_data.getSessionData("messenger_domain") || "escargot.chat"}
<TD ALIGN=RIGHT>
</TABLE>
</TABLE>

<TABLE CELLSPACING=0 CELLPADDING=0>
<TR><TD COLSPAN=3 HEIGHT=2 VALIGN=MIDDLE ALIGN=CENTER BGCOLOR="2B2B2B"><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 HEIGHT=1 VALIGN=TOP ALIGN=LEFT>
<TR><TD COLSPAN=3 HEIGHT=2 VALIGN=TOP ALIGN=LEFT BGCOLOR="0D0D0D"><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD ABSWIDTH=155 HEIGHT=26 VALIGN=MIDDLE ALIGN=LEFT><B>Name</B>
<TD ABSWIDTH=215 VALIGN=MIDDLE ALIGN=LEFT>&nbsp;<B>Options</B>
<TD ABSWIDTH=50 VALIGN=MIDDLE ALIGN=RIGHT>
<TR><TD COLSPAN=3 HEIGHT=2 VALIGN=MIDDLE ALIGN=CENTER BGCOLOR="2B2B2B"><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 HEIGHT=1 VALIGN=TOP ALIGN=LEFT>
<TR><TD COLSPAN=3 HEIGHT=2 VALIGN=TOP ALIGN=LEFT BGCOLOR="0D0D0D"><IMG SRC="ROMCache/spacer.gif" WIDTH=1 HEIGHT=1>
<TR><TD COLSPAN=3 HEIGHT=6>
</TABLE>
<TABLE CELLSPACING=0 CELLPADDING=2>
<TR><TD>
<script language="Javascript">
var gTheList = "FL";
var gUserHasNoFriends = (Blim.listLength("FL") < 0);
var i;
var listLength = Blim.listLength("FL");
if (listLength == 0)
{document.write('<table border=0 cellspacing=3 cellpadding=0 ><tr>');
document.write("<tr><td>You don't have any buddies yet. ");
document.write('<p>To add a buddy or send an instant message, ');
document.write('press <b>OPTIONS</b> and choose <b>messenger</b> ');
}
else
{document.write("<table border=0 cellspacing=3 cellpadding=0><tr>");
var isFirst = true;
for ( i=0 ; i < listLength; i++)
{var ID = Blim.listItem("FL", i);
var humanName = Blim.getUmanName(ID);
document.write('<tr><td maxlines=1><b><a ');
if (isFirst)
{document.write(" id=firstFriend selected ");
isFirst = false;
}
document.write("<TD ABSWIDTH=150 HEIGHT=20 MAXLINES=1>");
document.write("<FONT SIZE=4>");
document.write('<a href="javascript:void(StartConversation(');
document.write("'");
document.write(ID);
document.write("'");
document.write('))">');
document.write(escapeHTML(humanName));
document.write('</a><TD ABSWIDTH=250 MAXLINES=1>');
document.write("<FONT SIZE=4>");
document.write('<a href="javascript:void(defriendThisPerson(');
document.write("'");
document.write(ID);
document.write("'");
document.write('))">');
document.write('Remove');
document.write('</a>&nbsp;&nbsp;');
if (isBlocked(ID)) {
document.write('<a href="javascript:void(unblockThisPerson(');
document.write("'");
document.write(ID);
document.write("'");
document.write('))">');
document.write('Unblock');
} else {
document.write('<a href="javascript:void(blockThisPerson(');
document.write("'");
document.write(ID);
document.write("'");
document.write('))">');
document.write('Block');
}
}
}
document.write("</font>");
document.write("</table>");
document.close();
</script>
<script language="Javascript">
</script>
</TABLE>


</BODY>
</HTML>`;
			break;
	}

	switch (action) {
		case "edit":
		case "editfromheader":
			const newaddress = request_headers.query.new_address
			headers = `200 OK`;
			data = `<html>
<head>
<DISPLAY fontsize=medium poweroffalert>
<SAVEPANEL
message="Save this address"
action="client:submitform?name=addressform&submitname=action&submitvalue=Add"
label="Save"
>
<SENDPANEL action="wtv-mail:/sendmail"
message="Write a new message"
label="Write"
>
<title>${(!newaddress) ? "Change" : "Add"} an e-mail address</title>
</head>
<print blackandwhite>
<sidebar width=114 height=420 align=left>
<table cellspacing=0 cellpadding=0 bgcolor=333b5a>
<tr>
<td colspan=3 width=104 absheight=4>
<td rowspan=100 width=10 height=420 valign=top align=left bgcolor=191919>
<img src="wtv-mail:/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0 width=100%>
<tr>
<td abswidth=6>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1>
<td align=center>
<img src="wtv-mail:/ROMCache/WebTVLogoJewel.gif" width=87 height=67>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="wtv-mail:/addressbook?camefrom=inbox"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Addresses</font></shadow>
</table>
</table>
`;
			if (!newaddress) {
				data += `<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="wtv-mail:/addressbook?camefrom=inbox&action=discard&id=${request_headers.query.id}"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Discard</font></shadow>
</table>
</table>`;
			}
			data += `
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=${(!newaddress) ? "236" : "267"} valign=bottom align=right >
<img src="wtv-mail:/ROMCache/BannerMail.gif" width=50 height=96>
<tr><td colspan=3 absheight=${(!newaddress) ? "67" : "36"}>
</table>
</sidebar>
<body instructions="wtv-guide:/helpindex?title=Index_Mail"
bgcolor="191919" text="42BD52" link="189CD6" vlink="189CD6"
vspace=0
hspace=0
fontsize="medium">
<table cellspacing=0 cellpadding=0>
<tr>
<td height=16 valign=top align=left>
<tr>
<td height=39 valign=top>
<font size=+1 color="E7CE4A">
<blackface>
<shadow>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=4>${(!newaddress) ? "Change" : "Add"} an e-mail address
</shadow>
</blackface>
</font>
</table>
<table cellspacing=0 cellpadding=0 width=100%>
<tr>
<td rowspan=100 abswidth=15
<img src="wtv-home:/ROMCache/Spacer.gif">
<td colspan=4 width=100%>
`;
			if (!newaddress) {
				data += `To change the e-mail address, make your changes, then choose <b>Done</b>.<p>
To remove the entry from your address book, choose <b>Discard</b>.`;
			} else {
				data += "Type a name and electronic mail address to add to your address book, then choose <B>Add</B>.";
			}
			data += `
<td abswidth=10>
<form action="/addressbook" name="addressform" method ="POST"><tr absheight=24>
<td colspan=6><img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=24>
<tr >
<td>
<td align=right valign=top>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=4><br>
Name
<td abswidth=10>
<td valign=bottom colspan=3>
<INPUT type="text" bgcolor=#202020
cursor=#cc9933
text="E7CE4A"
font=proportional
name="nickname"
value="`;
			if (action == 'editfromheader') {
				data += request_headers.query.nickname
			} else if (action == 'edit' && request_headers.query.id) {
				data += address_book[request_headers.query.id].name
			}
			data += `"
size=25
maxlength=30
autoactivate
nosubmit>
</tr>
<tr absheight=12>
<td colspan=6><img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=12>
<tr>
<td absheight=${(!newaddress) ? "94" : "144"}>
<td align=right valign=top>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=4><br>
Address
<td abswidth=10>
<td valign=top colspan=3>
<TEXTAREA bgcolor=#202020
cursor=#cc9933
text="E7CE4A"
font=proportional
nosoftbreaks nohardbreaks
name="address"
value="`;
			if (action == 'editfromheader') {
				data += request_headers.query.address
			} else if (action == 'edit' && request_headers.query.id) {
				data += address_book[request_headers.query.id].address
			}
			data += `"
size=25
rows=1
maxlength=1000
autoactivate
autoascii
nosubmit
growable></TEXTAREA>
</tr>
<tr absheight=25>
<td colspan=6>
<img src="wtv-home:/ROMCache/Spacer.gif" width=4 height=25>
<tr><td>
<td colspan=4 absheight=2 align=center bgcolor=2B2B2B>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td>
<td colspan=4 absheight=1 align=center>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td>
<td colspan=4 absheight=2 align=center bgcolor=0D0D0D>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr absheight=5>
<td colspan=6>
<img src="wtv-home:/ROMCache/Spacer.gif" width=4 height=5>
<tr>
<td colspan=2>
<td colspan=2 align=right><FONT COLOR="#E7CE4A"><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" NAME=done value="${(!newaddress) ? "Done" : "Add"}"
USESTYLE WIDTH=103
NOARGS>
</SHADOW></FONT>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=1>
</table>
<input type=hidden name="camefrom" value="inbox">
<input type="hidden" name="action" value="${(!newaddress) ? "change" : "add"}">
${(!newaddress) ? `<input type=hidden name="id" value="${request_headers.query.id}">` : ""}
</form>
</body></html>`;
			break;

		case "add":
			let nameExists = false;
			let addrExists = false;
			// dumbass protection for making addresses look proper in the list
			let address = request_headers.query.address.split("@")[0];
			address += `@${minisrv_config.config.service_name}`;
			// sanity checks to make sure the user doesn't have duplicate names/addresses
			address_book.forEach(user => {
				if (user.name.includes(request_headers.query.nickname)) {
					nameExists = true;
				}
			});

			address_book.forEach(user => {
				if (user.address.includes(address)) {
					addrExists = true;
				}
			});

			if (addrExists) {
				headers = `400 The address <blackface>${address}</blackface> already exists in your address book.`;
			} else if (nameExists) {
				headers = `400 The name <blackface>${request_headers.query.nickname}</blackface> already exists in your address book. Please choose a different name and try again.`;
			} else {
				const entry = {
					name: request_headers.query.nickname,
					address: address
				}
				address_book.push(entry)
				session_data.setSessionData("address_book", address_book.sort(function (a, b) { return a.name < b.name ? -1 : 1; }))
				headers = `302 Moved temporarily
wtv-expire-all: wtv-mail:/addressbook
wtv-expire: wtv-mail:/addresslist
Location: wtv-mail:/addressbook`;
			}
			break;

		case "change":
			address = request_headers.query.address
			let nickname = request_headers.query.nickname
			if (!address) {
				address = address_book[request_headers.query.id].address
			}
			if (!nickname) {
				nickname = address_book[request_headers.query.id].nickname
			}
			// dumbass protection for making addresses look proper in the list
			address = address.split("@")[0];
			address += `@${minisrv_config.config.service_name}`;
			nameExists = false;
			addrExists = false;
			if (address_book.length > 1) {
				const otheraddrs = address_book.slice(0)
				otheraddrs.splice(request_headers.query.id, 1)
				// sanity checks to make sure the user doesn't have duplicate names/addresses
				otheraddrs.forEach(user => {
					if (user.name.includes(nickname)) {
						nameExists = true;
					}
				});

				otheraddrs.forEach(user => {
					if (user.address.includes(address)) {
						addrExists = true;
					}
				});
			}

			if (addrExists) {
				headers = `400 The address <blackface>${address}</blackface> already exists in your address book.`;
			} else if (nameExists) {
				headers = `400 The name <blackface>${nickname}</blackface> already exists in your address book. Please choose a different name and try again.`;
			} else {
				const entry = {
					name: nickname,
					address: address
				}
				address_book[request_headers.query.id] = entry
				session_data.setSessionData("address_book", address_book.sort(function (a, b) { return a.name < b.name ? -1 : 1; }))
				headers = `302 Moved temporarily
wtv-expire-all: wtv-mail:/addressbook
wtv-expire: wtv-mail:/addresslist
Location: wtv-mail:/addressbook`;
			}
			break;

		case "discard":
			if (address_book.length == 1) {
				address_book = []
			} else {
				address_book.splice(request_headers.query.id, 1)
			}
			session_data.setSessionData("address_book", address_book.sort(function (a, b) { return a.name < b.name ? -1 : 1; }))
			headers = `302 Moved temporarily
wtv-expire-all: wtv-mail:/addressbook
wtv-expire: wtv-mail:/addresslist
Location: wtv-mail:/addressbook`;
			break;

		default:
			headers = `302 Moved temporarily
Location: wtv-mail:/addressbook`;
			break;
	}
}
