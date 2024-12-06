var minisrv_service_file = true;

headers = `200 OK
Connection: Keep-Alive
`;

if (!request_headers.query.getimage) {	
	if (session_data.getTicketData("benchmark_starttime")) {
		session_data.deleteTicketData("benchmark_endtime")
	}	
	headers += `wtv-expire-all: wtv-tricks:/benchmark
Content-type: text/html`
	data = `<HTML>
<HEAD>
<TITLE>Speedtest in progress...</TITLE>
<display nosend noback>
</HEAD>

<BODY BGCOLOR=191919 TEXT=44cc55 LINK=189cd6 VLINK=189cd6>

<CENTER>
<h1>Benchmark Image</h1>
<br>

<IMG SRC="wtv-tricks:/benchmark?getimage=true" ALIGN=CENTER onload="location.href='wtv-tricks:/benchmark-finished'">

</CENTER>
</BODY>
</HTML>`;
} else {
	var start_time = Math.floor(new Date().getTime());
	session_data.setTicketData("benchmark_starttime", start_time);
	headers += "wtv-expire-all: wtv-tricks:/benchmark\nContent-type: image/jpg"
	data = wtvshared.getServiceDep("/wtv-tricks/benchmark.jpg", false);
}