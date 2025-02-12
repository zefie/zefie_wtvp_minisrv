var minisrv_service_file = true;

var num_per_line = 4
var legend_every = 6;

function getLegend() {
    d = "<tr>\n";
    for (var i = 0; i < num_per_line; i++) {
        d += "<td><b>Code</b>\n<td><b>Char</b>\n";
    }
    d += "<tr>\n";
    return d;
}


headers = `200 OK
Content-Type: text/html`;

data = `<html>
<body>
<display nosave nosend>
<title>Character Map</title>
<sidebar width=20%>
<img src="wtv-tricks:/images/Favorites_bg.jpg">
</sidebar>
<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff" vspace=0>
<br>
<br>
<h1>WebTV Character Map</h1>
<table border=1>`;


for (var i = 0; i <= 255; i++) {
    if (i % num_per_line === 0) {
        if (i % (num_per_line * legend_every) === 0) {
            data += getLegend();
        } else {
            data += "<tr>"
        }
    }
    data += "<td>&amp;#" + i + ";\n";
    data += "<td>&#" + i + ";\n";
}

data += `</table>
</body>
</html>
`