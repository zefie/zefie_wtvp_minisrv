var minisrv_service_file = true; 

if (request_headers.query.action == "editfromheader") {

	function parseAddress() {
		var nickname = request_headers.query.nickname + ":"
		var address = request_headers.query.address;
		return {
			nickname: address
		};
	}
	var addresstoadd = parseAddress()

	if (session_data.getSessionData("address_book")) {
		session_data.setSessionData("address_book", session_data.getSessionData("address_book") + addresstoadd);
		session_data.saveSessionData();
	} else {
		session_data.setSessionData("address_book", addresstoadd);
		session_data.saveSessionData();
	}


	headers = `200 OK
Content-type: text/html
wtv-expire: wtv-mail:/addresslist`;
} else {
	var camefrom = request_headers.query.camefrom;

	var CommonBLIMScripts = wtvshared.unpackCompressedB64('eNrFVttuGjEQfQaJfxjtS3ZbKFCpfQhJJIiEmiptI5V8gFkPYOG1kS9QVOXf6/Ui4l1uq0hRH9eeOXPOmVnbNzpVbGWAEzG3ZI630XeyJsVidNdqzqxIDZMC5mi+2YyInyTDGDPC+JBShVonrebfhkJjlYARZ9knF/l8NHDQeAkA9SnANgjc5KsHyPoE8mtGucQPt4dijupB/1qSbRwCxgUk00PO1hgnkAxazTCZ6bFiKOh5sUw/iEemTRyNH6M2lPVWAUdcpkusjTi6jDjkXG7qIw5PIHa7sJKcpdtrYDMwCwSrUQGhVAOBmfehDRsEYo3MiGEp4XwLJK8ORFCwYppr80h5+gqVdgSJ8V/atQYMyzDgPsUCdrJg+slHH4rw7B2JiTxj8ZoowD+YWoPeDbiFyBMLkK8i+FhKdJ/RVTKIyvnPhYocYSeoJoYbzImTJ62JQypt6H/o93q95GjIrlobPu+Dyq2gEoQ0UHDaLFA4mztTS+mWiXmnAxlZOm+t2tvNNOSmexe4cyywm9a1W2Em1zhWMntHz8/49eXALief5BocNS4JjZM87OvesNeJqjSsnr6jv0RQParA3kuFp7WFHT/DzYNcHPfRBWpHjen3D6sfDnM9by4RqPa8vjdvUVEdsP+t4Qy3ev0dXjrfKdNvE/2uQ+1OqFSKNQp3nqR4DdoQZdw14ReV9s0MRPzOt++DvRMa5ApFKazMJRnAPiy/191bRT8RgTz2tBpVVlPlDkmwK38BOaDgNQCrPC+kuJCb/e4OtMTrSMFW86ZbPJPu/gEVxhrd');

	headers = `200 OK`

	switch (camefrom) {
		case "messenger":
			data = `${CommonBLIMScripts}
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
<TR><TD COLSPAN=3 HEIGHT=35 VALIGN=TOP><FONT SIZE=+3 COLOR="E7CE4A"><B><SHADOW><BLACKFACE>Buddies for ${session_data.getSessionData("subscriber_username") || "You"}</BLACKFACE></SHADOW></B></FONT>
<TR><TD COLSPAN=3 HEIGHT=25 VALIGN=TOP>
	<TABLE CELLSPACING=0 CELLPADDING=0>
	<TD WIDTH=400>Your address is ${session_data.getSessionData("messenger_email") || "unlinked"}@${session_data.getSessionData("messenger_domain") || "escargot.chat"}
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
{	document.write('<table border=0 cellspacing=3 cellpadding=0 ><tr>');
document.write("<tr><td><font color=FFEFAD>You don't have any buddies yet. ");
document.write('<p>To add a buddy or send an instant message, ');
document.write('choose <b>Use MSN Messenger now</b>. ');
document.write('You can also add buddies in your Address book.');
}
else
{	document.write("<table border=0 cellspacing=3 cellpadding=0><tr>");
var isFirst = true;
for ( i=0 ; i < listLength; i++)
{	var ID = Blim.listItem("FL", i);
var humanName = Blim.getUmanName(ID);
document.write('<tr><td maxlines=1><b><a ');
if (isFirst)
{	document.write(" id=firstFriend selected ");
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
</HTML>`
	}
}