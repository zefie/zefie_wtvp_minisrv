headers = `200 OK
Content-Type: text/html`


data = `<html>
<body>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Tricks</title>
<sidebar width=20%>
<img src="wtv-tricks:/images/Favorites_bg.jpg">
</sidebar>
<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff" vspace=0>
<br>
<br>
<h1>${minisrv_config.config.service_name} Tricks</h1>
<br>
<table>
<tr>
<td colspan=3 height=6>
<tr>
<td><a href="wtv-tricks:/info">Info</a>
<td width = 25>
<td><a href="wtv-cookie:list">List Cookies</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><a href="wtv-flashrom:/willie">Visit Ultra Willie's!</a>
<td width = 25>
<td><a href="wtv-cookie:reset">Clear Cookies</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><a href="wtv-tricks:/blastbacklist?return_to=wtv-tricks%3A%2Ftricks">Blast Backlist</a>
<td width = 25>
<td><a href="client:ResetNVAndPowerOff">Blast NVRAM</a>
<tr>
<td colspan=3 height=6>
<tr>
<td><a href="client:showservices">Show Services</a>
<td width = 25>
`;
if (ssid_sessions[socket.ssid].getSessionData("registered")) data += `<td><a href="wtv-tricks:/unregister">Unregister This Box</a>`;
else data += `<td><a href="wtv-tricks:/register">Register This Box</a>`

data += `
<tr>
<td colspan=3 height=6>
<tr>
<td><!-- TODO -->
<td width = 25>
<td><!-- TODO -->
<tr>
<td colspan=3 height=6>
<tr>
<td><!-- TODO -->
<td width = 25>
<td><!-- TODO -->
<tr>
<td colspan=3 height=6>
<tr>
<td><!-- TODO -->
<td width = 25>
<td><!-- TODO -->
<tr>
<td colspan=3 height=6>
<tr>
<td><!-- TODO -->
<td width = 25>
<td>
<!-- TODO -->
<td width = 25>
</table>
</body>
</html>
`;
