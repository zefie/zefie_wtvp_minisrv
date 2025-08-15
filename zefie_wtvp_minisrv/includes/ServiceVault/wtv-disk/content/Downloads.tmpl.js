const minisrv_service_file = true;

headers = `200 OK
Content-Type: text/html`;

data = `<html><head></head><body vspace="0" vlink="36d5ff" text="#44cc55" link="36d5ff" bgcolor="#191919">
<title>
Download-O-Rama
</title>
<br><br>
<h1>
Download-O-Rama!
</h1>
<br>
Welcome to Download-O-Rama.
<p>
Download any of our fine file sets.<br>
Click the <b>!</b> to force download a specific file set.
</p><h2>Demos</h2>
<ul>
<table border=1 cellspacing=3 cellpadding=8>
<tr>
<td><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=DealerDemo&amp;group=DealerDemo">Dealer Demo</a></td>
<td><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=DealerDemo&amp;group=DealerDemo&force=true">!</a></td>
<td><a href="file://Disk/Demo/index.html">View Demo</a></td>
</tr>
<tr>
<td><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=DealerDemo-BPS&amp;group=DealerDemo-BPS">Dealer Demo BPS</a></td>
<td><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=DealerDemo-BPS&amp;group=DealerDemo-BPS&force=true">!</a></td>
<td><a href="file://Disk/Demo-BPS/index.html">View Demo</a></td>
</tr>
</table>
</ul>
<h2>Firmware</h2>
<ul>
<i>These are always forced downloads</i>
<li><br><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=ModemFirmwareDel&amp;group=ModemFirmware&force=true">
Delete Modem Firmware (Use 33.6k technology)
</a></li>
<li><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=ModemFirmwareOld&amp;group=ModemFirmware&force=true">
K.Flex Modem Firmware (Use older 56k technology)
</a></li>
<li><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=ModemFirmware&amp;group=ModemFirmware&force=true">
V.90 Modem Firmware (Use common 56k technology)
</a></li>
</ul>
<h2>Music</h2>
<li>
<a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=Music&amp;group=Music">
<i>All Music</i> <a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=Music&amp;group=Music&force=true">!</a> (can take a very long time)</a>

</li><li><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=Karaoke&amp;group=Karaoke">
<i>Karaoke</i></a><font size=-1> (Will fail if you installed <i>All Music</i> above, as its included)</font></li></ul>
<p>
<h2>Games</h2>
<ul>
<table border=1 cellspacing=3 cellpadding=8>
<tr>
<td><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=FreeDoom&amp;group=FreeDoom">FreeDoom</a></td>
<td><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=FreeDoom&amp;group=FreeDoom&force=true">!</a></td>
<td><a href="client:boota?partition=DoomROM">Boot Game</a></td>
</tr>
<tr>
<td><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=YDKJ&amp;group=YDKJ">You Don't Know Jack</a></td>
<td><a href="wtv-disk:/content/DownloadScreen.tmpl?diskmap=YDKJ&amp;group=YDKJ&force=true">!</a></td>
<td><a href="client:boota?partition=JackROM">Boot Game</a></td>
</tr>
</table>
</ul>
<h2>Tools</h2>

</p>
<ul>
<i><b>WARNING: Use the following with caution</b></i>

<li><br>
<a href="wtv-disk:/get-group-data">View & Delete Groups</a>
</li></ul>
<h2>Home</h2>
<ul><li><a href="wtv-home:/home">Leave Download-O-Rama and Go Home</a></li>
</ul>
</body></html>`;