
var client_caps = null;

if (socket.ssid != null) {
	if (ssid_sessions[socket.ssid].capabilities) {
		client_caps = ssid_sessions[socket.ssid].capabilities;
	}
}
if (client_caps) {
	headers = `200 OK
Content-Type: text/html`


	var client_label = "TODO";
	var boot_client_label = "TODO";
	var wtv_system_sysconfig_str = "TODO";


	var wtv_system_version = ssid_sessions[socket.ssid].get("wtv-system-version");
	var wtv_client_bootrom_version = ssid_sessions[socket.ssid].get("wtv-client-bootrom-version");
	var wtv_client_serial_number = filterSSID(ssid_sessions[socket.ssid].get("wtv-client-serial-number"));
	var wtv_client_rom_type = ssid_sessions[socket.ssid].get("wtv-client-rom-type");
	var wtv_system_chipversion_str = ssid_sessions[socket.ssid].get("wtv-system-chipversion");
	var wtv_system_sysconfig_hex = parseInt(ssid_sessions[socket.ssid].get("wtv-system-sysconfig")).toString(16);

	var capabilities_table = new WTVClientCapabilities().capabilities_table;



	data = `<html>
<!--- *=* Copyright 1996, 1997 WebTV Networks, Inc. All rights reserved. --->
<display nosave nosend skipback>
<title>${minisrv_config.config.service_name} Info</title>

<sidebar width=20%>
		<img src="wtv-tricks:/images/About_bg.jpg">
</sidebar>

<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff" vspace=0>
<br>
<br>
<br>

<h1>${minisrv_config.config.service_name} Info</h1>

<table>
<tr>
		<td height=20>
<tr>
		<td valign=top align=right><shadow>Connected to:</shadow>
		<td width=10>
		<td valign=top>Mini Service
<tr>
		<td valign=top align=right width=150><shadow>Service:</shadow>
		<td width=10>
		<td valign=top>${z_title}
<tr>
		<td valign=top align=right><shadow>Client:</shadow>
		<td width=10>
		<td valign=top>&vers; (Build ${wtv_system_version} [${client_label}])
<tr>
		<td valign=top align=right><shadow>Boot:</shadow>
		<td width=10>
		<td valign=top>&wtv-bootvers; (Build ${wtv_client_bootrom_version} [${boot_client_label}])
<tr>
		<td height=20)
<tr>
		<td valign=top align=right><shadow>Silicon serial ID:</shadow>
		<td width=10>
		<td valign=top>${wtv_client_serial_number}
<tr>
		<td valign=top align=right><shadow>Connected at:</shadow>
		<td width=10>
		<td valign=top>&rate;
<tr>
		<td valign=top align=right><shadow>Client IP number:</shadow>
		<td width=10>
		<td valign=top>${socket.remoteAddress}
<tr>
		<td valign=top align=right><shadow>Service IP number:</shadow>
		<td width=10>
		<td valign=top>${service_ip}
`;
	if (ssid_sessions[socket.ssid].getSessionData("registered")) {
		data += `<tr>
		<td valign=top align=right><shadow>Subscriber Name:</shadow>
		<td width=10>
		<td valign=top>${ssid_sessions[socket.ssid].getSessionData("subscriber_name")}
<tr>
		<td valign=top align=right><shadow>Subscriber Username:</shadow>
		<td width=10>
		<td valign=top>${ssid_sessions[socket.ssid].getSessionData("subscriber_username")}
<tr>
		<td valign=top align=right><shadow>Subscriber Contact:</shadow>
		<td width=10>
		<td valign=top>${ssid_sessions[socket.ssid].getSessionData("subscriber_contact")} (${ssid_sessions[socket.ssid].getSessionData("subscriber_contact_method")})`;
	} else {
		data += `<tr>
		<td valign=top align=right><shadow>Unregistered Guest:</shadow>
		<td width=10>
		<td valign=top>Yes`;
	}

	data += `<tr>
		<td height=20>
<tr>
		<td valign=top align=right><shadow>ROM type:</shadow>
		<td width=10>
		<td valign=top>${wtv_client_rom_type}
<tr>
		<td valign=top align=right><shadow>Modem f/w (when available):</shadow>
		<td width=10>
		<td valign=top>&modem;
`;
	if (ssid_sessions[socket.ssid].get("wtv-need-upgrade")) {
		data += `<tr>
		<td valign=top align=right><shadow>Mini-browser:</shadow>
		<td width=10>
		<td valign=top>Yes
`;
	}
	data += `	
<tr>
		<td valign=top align=right><shadow>Chip version:</shadow>
		<td width=10>
		<td valign=top>${wtv_system_chipversion_str} (TODO)
<tr>
		<td valign=top align=right><shadow>SysConfig:</shadow>
		<td width=10>
		<td valign=top>0x${wtv_system_sysconfig_hex.toUpperCase()}
</table>

<table>
<tr>
		<td height=20>
<tr>
		<td valign=top align=right width=175><shadow>Client capabilities:</shadow>
		<td width=10>
		<td valign=top>
</table>
<table>
`;


	// start loop

	Object.keys(capabilities_table).forEach(function (k) {
		data += `<tr>
		<td valign=top align=right>${capabilities_table[k][1]}
		<td width=10>
		`;
		if (client_caps[capabilities_table[k][0]]) data += "<td valign=top>True\n";
		else data += "<td valign=top>False\n";
	});

// end loop

data += `
</table>

<pre>


${wtv_system_sysconfig_str}
</pre>
<br>

</body> </html>`;
} else {
	var errpage = doErrorPage(400);
	headers = errpage[0];
	data = errpage[1];
}