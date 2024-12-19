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

data = `<html><head><display allowoffline switchtowebmode>
<script src=/ROMCache/h.js></script><script src=/ROMCache/n.js></script>
<script src=htv-cSetup.js></script>
</head ><form name=t><input type=hidden name=h value=&pname;></form>
<script>head('WebTV Character Map');</script>
<br><br>
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