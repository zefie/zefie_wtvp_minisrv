var minisrv_service_file = true;

var client_caps = null;

if (socket.ssid != null) {
	if (session_data.capabilities) {
		client_caps = session_data.capabilities;
	}
}
if (client_caps) {
	headers = `200 OK
Content-Type: text/html`

	var service_ip = minisrv_config.config.service_ip
	var client_label = "TODO";
	var boot_client_label = "TODO";
	var wtv_system_sysconfig_str = "TODO";


	var wtv_system_version = session_data.get("wtv-system-version");
	var wtv_client_bootrom_version = session_data.get("wtv-client-bootrom-version");
	var wtv_client_serial_number = wtvshared.filterSSID(session_data.get("wtv-client-serial-number"));
	var wtv_client_rom_type = session_data.get("wtv-client-rom-type");
	var wtv_system_chipversion_str = session_data.get("wtv-system-chipversion");
	var wtv_system_sysconfig_hex = parseInt(session_data.get("wtv-system-sysconfig")).toString(16);

	var capabilities_table = new WTVClientCapabilities().capabilities_table;



	data = `<html>
<!--- *=* Copyright 1996, 1997 WebTV Networks, Inc. All rights reserved. --->
<display nosave nosend skipback>
<script src=/ROMCache/h.js></script><script src=/ROMCache/n.js></script><script>
head('${minisrv_config.config.service_name} Info')</script>

<table cellspacing=0 cellpadding=0><tr><td abswidth=10>&nbsp;<td colspan=3>
<table>
<tr>
		<td height=20>
<tr>
		<td valign=top align=right><shadow>Connected to:</shadow>
		<td width=10>
		<td valign=top>Mini Service
<tr>
		<td valign=top align=right><shadow>Host/Port:</shadow>
		<td width=10>
		<td valign=top>${service_ip}/${minisrv_config.services[service_name].port}
<tr>
		<td valign=top align=right width=150><shadow>Service:</shadow>
		<td width=10>
		<td valign=top>${minisrv_version_string}
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
`;
	if (session_data.getSessionData("registered")) {
		data += `<tr>
		<td valign=top align=right><shadow>Subscriber Name:</shadow>
		<td width=10>
		<td valign=top>${session_data.getSessionData("subscriber_name")}
<tr>
		<td valign=top align=right><shadow>Subscriber Username:</shadow>
		<td width=10>
		<td valign=top>${session_data.getSessionData("subscriber_username")}
<tr>
		<td valign=top align=right><shadow>Subscriber Contact:</shadow>
		<td width=10>
		<td valign=top>${session_data.getSessionData("subscriber_contact")} (${session_data.getSessionData("subscriber_contact_method")})`;
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
	if (session_data.get("wtv-need-upgrade")) {
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
		<td valign=top>0x${wtv_system_sysconfig_hex}
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
	var errpage = wtvshared.doErrorPage(400);
	headers = errpage[0];
	data = errpage[1];
}