var minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-mail-count: ${session_data.mailstore.countUnreadMessages(0)}
Content-Type: text/html`

data = `
<HTML>
<HEAD>
<TITLE>
${minisrv_config.config.service_name} Terms of Service
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
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
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
<img src="images/TermsBanner.gif" width=48 height=136>
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
<CENTER><B>${minisrv_config.config.service_name} Terms of Service</B></font><br>
<B><font size="-1">(Release date January 21, 2022)</B></CENTER></font>
<td abswidth=20>
<tr>
<td>
<td valign=top align=left>
<p><b>General</b><br>
<p>This is a Work-in-Progress remaster of the WebTV service, originally hosted by WebTV Networks, Inc.
This server has no affiliation with WebTV Networks, and many original assets and pages belong to them.</p>
  <p><b>Rules</b><br>
<p>You must follow these rules, or your privilege to access this service may be revoked.</p>
<ul>
    <li>Do not harass other users</li>
    <li>Do not impersonate others on the network</li>
	<li>Do not send spam e-mail</li>
    <li>Do not attempt to access unauthorized areas of the network</li>
    <li>Do not attempt to disrupt or otherwise negatively impact the service for others</li>
	<li>All users must be over 13 years of age, or be accompanied by a parent or guardian at all times</li>
  </ul> 
  <p>Failure to abide by one or more of these rules may require your access to be terminated.</p>
  <p><b>Service Termination</b><br>
<p>If you break one or more of the rules listed above, your access to the service may be revoked. Disclosure of your termination reason will be decided on a case-by-case basis. Any attempt for a banned user to regain access to the server will be dealt with immediately. If you know of a banned user who is still on the network, please report it to us by contacting ${minisrv_config.config.service_owner_contact} via ${minisrv_config.config.service_owner_contact_method}. All decisions are final, and will not be reverted.</p>
  
<p>These terms can change at any time, without warning. Your continued usage of the service is an agreement to these Terms of Service. If you do not agree to these terms, please disconnect immediately and contact ${minisrv_config.config.service_owner_contact} via ${minisrv_config.config.service_owner_contact_method} to terminate your account.</p>
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