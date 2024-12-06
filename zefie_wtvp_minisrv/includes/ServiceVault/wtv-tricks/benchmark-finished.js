var minisrv_service_file = true;


headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-tricks:/benchmark
Content-type: text/html`
data = `<html>
<display nosave nosend skipback>
<script src=/ROMCache/h.js></script><script src=/ROMCache/n.js></script><script>
head('Speed Test Result')</script>`;
var start_time = session_data.getTicketData("benchmark_starttime");
if (isNaN(start_time)) {
	data += "Invalid data, please try your benchmark again";
} else {
	var end_time = Math.floor(new Date().getTime());
	if (!session_data.getTicketData("benchmark_endtime")) {		
		session_data.setTicketData("benchmark_endtime", end_time);
	} else {
		end_time = session_data.getTicketData("benchmark_endtime");
	}	
	var download_time = end_time - start_time;
	var image_filename = wtvshared.getServiceDep("/wtv-tricks/benchmark.jpg", true);
	var image_size = fs.statSync(image_filename).size
	var image_size_kb = parseFloat(image_size / 1024).toFixed(3);
	var throughput = parseFloat((image_size / download_time) * 1024).toFixed(0);
	data += `
<table>
<tr>
        <td height=20>
<tr>
	<td valign=top align=right width=200><shadow>POP Number:</shadow>
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
	<td valign=top align=right width=200><shadow>Image Size:</shadow>
	<td width=10>
	<td valign=top>${image_size_kb} KBytes
<tr>
	<td valign=top align=right><shadow>Start Time:</shadow>
	<td width=10>
	<td valign=top>${new Date(start_time).toISOString().replace('T', ' ').substr(0, 19)}
<tr>
	<td valign=top align=right><shadow>End Time:</shadow>
	<td width=10>
	<td valign=top>${new Date(end_time).toISOString().replace('T', ' ').substr(0, 19)}
<tr>
	<td valign=top align=right><shadow>Total Time:</shadow>
	<td width=10>
	<td valign=top>${parseFloat(download_time / 1000).toFixed(1)} seconds
<tr>
	<td valign=top align=right><shadow>Throughput:</shadow>
	<td width=10>
	<td valign=top>${throughput} bytes/sec

</table>
`;
}
data += `
<p>
<p>
<a selected href="wtv-tricks:/benchmark">Re-Test</a>
<td width=30>
<a href="wtv-tricks:/tricks">Back to Tricks</a>

</CENTER>
</BODY>
</HTML>
`;
