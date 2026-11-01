const minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-tricks:/benchmark
Content-type: text/html`
data = `<html>
<body>
<display nosave nosend skipback>
<title>${minisrv_config.config.service_name} Tricks</title>
<sidebar width=20%>
<img src="wtv-tricks:/images/Favorites_bg.jpg">
</sidebar>
<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff" vspace=0>
<br>
<br>
<h1>${minisrv_config.config.service_name} Tricks</h1>`;

const start_time = parseInt(session_data.getTicketData("benchmark_starttime"));
if (isNaN(start_time)) {
	data += "Invalid data, please try your benchmark again";
} else {
	let end_time = Math.floor(new Date().getTime());
	if (!session_data.getTicketData("benchmark_endtime")) {
		session_data.setTicketData("benchmark_endtime", end_time);
	} else {
		end_time = session_data.getTicketData("benchmark_endtime");
	}
	const download_time = end_time - start_time;
	const image_filename = wtvshared.getServiceDep("/wtv-tricks/benchmark.jpg", true);
	const image_size = fs.statSync(image_filename).size
	const image_size_kb = parseFloat(image_size / 1024).toFixed(3);
	const throughput = parseFloat((image_size / download_time) * 1024).toFixed(0);
	const throughput_bps = parseInt(throughput * 8)
	data += `
<table>
<tr>
        <td height=5>
<tr>
	<td valign=top align=right width=150><shadow>POP Number:</shadow>
	<td width=10>
	<td valign=top>&phone;
<tr>
	<td valign=top align=right><shadow>Connected at:</shadow>
	<td width=10>
	<td valign=top>&rate;
<tr>
	<td valign=top align=right><shadow>Modem f/w:</shadow>
	<td width=10>
	<td valign=top>&modem;
<tr>
        <td height=40>
<tr>
	<td valign=top align=right width=150><shadow>Image Size:</shadow>
	<td width=10>
	<td valign=top>${image_size_kb} KBytes
<tr>
	<td valign=top align=right><shadow>Start Time:</shadow>
	<td width=10>
	<td valign=top>${new Date(start_time).toISOString().replace('T', ' ').slice(0, 19)}
<tr>
	<td valign=top align=right><shadow>End Time:</shadow>
	<td width=10>
	<td valign=top>${new Date(end_time).toISOString().replace('T', ' ').slice(0, 19)}
<tr>
	<td valign=top align=right><shadow>Total Time:</shadow>
	<td width=10>
	<td valign=top>${parseFloat(download_time / 1000).toFixed(1)} seconds
<tr>
	<td valign=top align=right><shadow>Throughput:</shadow>
	<td width=10>
	<td valign=top>${throughput} bytes/sec (${throughput_bps} bps)


`;
}
data += `
</table>
<p>
<table>
<tr>
<td width=100>
<td><a selected href="wtv-tricks:/benchmark">Re-Test</a>
<td width=30>
<td><a href="wtv-tricks:/tricks">Back to Tricks</a>
</table>
</CENTER>
</BODY>
</HTML>
`;
