var minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-mail-count: ${ssid_sessions[socket.ssid].mailstore.countUnreadMessages(0)}
Content-Type: text/html`

data = `
<HTML>
<HEAD>
<TITLE>
WebTV Service Privacy Statement
</TITLE>
<DISPLAY >
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR="8C6A2E">
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="wtv-home:/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=92 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width=87 height=67>
</table>
<td abswidth=6>
<tr><td absheight=5 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor="5a4521">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor="c0954a">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>
<tr><td absheight=100>
<tr><td absheight=244 align=right colspan=3>
<img src="ROMCache/TermsBanner.gif" width=48 height=136>
<tr><td absheight=41>
</table>
</sidebar>
<print blackandwhite>
<print blackandwhite>
<BODY BGCOLOR="#191919" TEXT="#44cc55" LINK="189CD6" VLINK="189CD6" HSPACE=0 VSPACE=0 FONTSIZE="large"
>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td abswidth=416 absheight=80 valign=center>
<font size="+2" color="E7CE4A"><blackface><shadow>
<font size="+1">
<CENTER><B>WebTV Service Privacy Statement</B></font><br>
<B><font size="-1">(Release date January 21, 2022)</B></CENTER></font>
<td abswidth=20>
<tr>
<td>
<td valign=top align=left>
<p>The purpose of this WebTV server is to recreate the 1999 WebTV experience using pages and assets from that era. There will be inaccuracies in some areas. If you do find any, please report them to JarHead#3922 on Discord.</p>
<p><b>With Whom Personal Information Is Shared and What Is Collected</b><br>
<p>When you register with a WebTV account on this server, you are sharing the following:</p>
<ul>
    <li>Your WebTV SSID (Silicon Serial ID)</li>
    <li>Your name</li>
	<li>Your ZIP Code</li>
    <li>Pages you access</li>
  </ul> 
  <p>This information is shared with the server operators.</p>
  <p><b>Your Silicon Serial ID</b><br>
<p>Your Silicon Serial ID (SSID) is used to identify you on the network. Anyone with your SSID can impersonate you on the network, so don't share it. This ID is stored on our servers when you sign up, however it will not be shared with anyone except the server operators.</p>
  <p><b>Your Name</b><br>
<p>The name that you enter while signing up will be stored on our servers, however it will not be shared with anyone except the server operators.</p>
  <p><b>Your ZIP Code</b><br>
<p>The ZIP Code you enter to set weather info will be stored on our servers, and will only be sent to The Weather Channel to get current data. You are not required to enter a ZIP code, however it is required to fully utilize weather forecasting.</p>
  <p><b>Pages you access</b><br>
<p>All pages you visit and images you download will be temporarily logged for security reasons. This includes WebTV Network pages and Internet Web sites. This information can not be traced back to you, and will only be viewable to server operators for a short time. IRC Chat messages will <b><i>not</i></b> be logged, however server operators can see what servers you are connecting to.</p>
<p><b>How We Help Protect Children's Privacy</b><br>
<p>We do not knowingly collect information from children under the age of 13 to comply with COPPA. If the account creator is under 13, the main user and all secondary accounts will be terminated. All secondary users under 13 must be accompanied by a parent or guardian while using this service.</p>
<!-- <p><font size="-1"><i>MSN Privacy<br>
Microsoft Corporation<br>
One Microsoft Way<br>
Redmond, Washington 98052<br>
425-882-8080<br></i></font> -->
<p>This Privacy Statement can change at any time, and without warning. If you do not agree with this Privacy Statement, please disconnect and contact JarHead#3922 on Discord to terminate your account.</p>
<td>
<tr>
<td absheight=7>
<tr>
<td>
<td colspan=2 absheight=2 bgcolor="2B2B2B">
<img src="ROMCache/Spacer.gif" width=426 height=1>
<tr>
<td absheight=1>
<tr>
<td>
<td colspan=2 absheight=2 bgcolor="0D0D0D">
<img src="ROMCache/Spacer.gif" width=426 height=1>
<tr>
<td absheight=4>
</table>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=430 valign=top align=right>
<form
action=client:goback>
<font color="#E7CE4A" size=-1><shadow>
<input
selected
type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value=Done name="Done" usestyle width=103>
</shadow></font></form>
<td abswidth=20>
<tr>
<td absheight=15>
</table>
</body>
</html>
`;