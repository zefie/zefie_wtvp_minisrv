var minisrv_service_file = true;

var favstore_exists = ssid_sessions[socket.ssid].favstore.favstoreExists();

if (favstore_exists != true)
{
	ssid_sessions[socket.ssid].favstore.createFavstore();
	headers = `300 OK
Location: wtv-favorite:/favorite`
} else {

var folder_array = ssid_sessions[socket.ssid].favstore.getFolders();
var totalfavorites = folder_array.length;
var stopdrawing = false;

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-favorite:/serve-browser
wtv-expire-all: wtv-favorite:/favorite
`


data = `<html><head>

<title>
Favorite folders
</title>
</head><body fontsize="large" vspace="0" hspace="0" vlink="189cd6" text="44cc55" link="189cd6" bgcolor="191919"><display ${(minisrv_config.services[service_name].max_folders <= 14) ? "noscroll" : ""}>





<sidebar width="109" height="384">

<table cellspacing="0" cellpadding="0" bgcolor="284a52">
<tbody><tr><td absheight="196" valign="top">
<table absheight="196" cellspacing="0" cellpadding="0">
<tbody><tr>
<td width="100%" valign="top" height="50%">
<table cellspacing="0" cellpadding="0">
<tbody><tr>
<td colspan="3" absheight="1" width="100%">
</td></tr><tr>
<td abswidth="6">
</td><td absheight="79" width="100%" align="center">
<table href="wtv-home:/home" absheight="79" width="100%" cellspacing="0" cellpadding="0">
<tbody><tr>
<td width="100%" align="center">
<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width="87" height="67">
</td></tr></tbody></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="100%" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td colspan="3" absheight="1" width="100%">
</td></tr><tr><td colspan="3" absheight="2" width="100%" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">	</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td abswidth="5" absheight="26">
</td><td width="100%">
<table href="wtv-favorite:/serve-add-folder-page?favorite_folder_name=Personal" width="100%" cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><shadow><font size="-1" color="E7CE4A">
 Add folder&nbsp;&nbsp;
</font></shadow></td></tr></tbody></table>
</td></tr></tbody></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td abswidth="5" absheight="26">
</td><td width="100%">
<table href="wtv-favorite:/serve-discard-folders?favorite_folder_name=Personal" width="100%" cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><shadow><font size="-1" color="E7CE4A">
 Remove&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
</font></shadow></td></tr></tbody></table>
</td></tr></tbody></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tbody><tr><td abswidth="5" absheight="26">
</td><td width="100%">
<table href="wtv-home:/throwerror" width="100%" cellspacing="0" cellpadding="0">
<tbody><tr><td>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td><shadow><font size="-1" color="E7CE4A">
 Help&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
</font></shadow></td></tr></tbody></table>
</td></tr></tbody></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td><td abswidth="5" background="ROMCache/Shadow.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="188" valign="top">
<table absheight="188" cellspacing="0" cellpadding="0">
<tbody><tr><td width="100%"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td><td valign="bottom" align="right"><img src="ROMCache/FavoritesBanner.gif" width="50" height="188">
</td></tr></tbody></table>
</td><td abswidth="5" background="ROMCache/Shadow.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>
</sidebar>
<table width="451" cellspacing="0" cellpadding="0" bgcolor="2b2b2b">
<tbody><tr>
<td width="4" height="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td width="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td><table cellspacing="0" cellpadding="0">
<tbody><tr><td align="left">
<shadow><blackface><font color="e7ce4a">
Favorite folders
for ${ssid_sessions[socket.ssid].getSessionData("subscriber_username") || "You"}
</font><blackface><shadow>
</shadow></blackface></blackface></shadow></td></tr></tbody></table>
</td></tr><tr>
<td width="4" height="14"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>

<table cellspacing="0" cellpadding="0">
<tbody><tr><td valign="top" align="left">
<table width="225" cellspacing="0" cellpadding="0">
<tbody><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftTop.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[0]}" selected="">
<font size="-1">
<limittext value="${folder_array[0]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
	var kval = 0;
	// process evens
	Object.keys(folder_array).forEach(function (k) {
		if (k == 0) return; // skip 0 since it was processed above
		if (parseInt(k) % 2 == 0) {
			// even
			// Left Middle
			data += `</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[k]}">
<font size="-1">
<limittext value="${folder_array[k]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`;
			kval = k;
		}
	});

	// process end if total is even
	if (folder_array.length > 1) {
		if (folder_array.length % 2 == 0) {
			data += `</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`;
		}
	}

	// process middle (folder 2 (id 1))
	if (folder_array.length == 1) {
		// no folder 2
		data += `<tr><td><table cellspacing="0" cellpadding="0">
<tbody><tr><td width="6" height="12"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td width="20">
</td></tr></tbody></table>
</tr><td></td></tr></tbody></table>
</td><td valign="top" align="left">
<table width="225" cellspacing="0" cellpadding="0">
<tbody><tr><td absheight="20" bgcolor="2b2b2b"> 
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightTopEdgeOnly.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</font>
</td><td width="20">
</td></tr></tbody></table>`
	} else {
		// process folder 2 (id 1)
		data += `<tr><td><table cellspacing="0" cellpadding="0">
<tbody><tr><td width="6" height="12"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td width="20">
</td></tr></tbody></table>
</tr><td></td></tr></tbody></table>
</td><td valign="top" align="left">
<table width="225" cellspacing="0" cellpadding="0">
<tbody><tr><td absheight="21" bgcolor="2b2b2b"> 
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightTop.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[1]}">
<font size="-1">
<limittext value="${folder_array[1]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`;
	}

	// process odds
	Object.keys(folder_array).forEach(function (k) {
		if (k == 1) return; // skip 1 since it was processed above
		if (parseInt(k) % 2 != 0) {
			// odd
			// Right Middle
			data += `</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[k]}">
<font size="-1">
<limittext value="${folder_array[k]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`;
		}
	});

	// process end if total is odd
	if (folder_array.length > 1) {
		if (folder_array.length % 2 != 0) {
			data += `</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`;
		}
	}

	/*
if (totalfavorites > 2)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[2]}">
<font size="-1">
<limittext value="${folder_array[2]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 2) {
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 4)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[4]}">
<font size="-1">
<limittext value="${folder_array[4]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 4) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 6)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[6]}">
<font size="-1">
<limittext value="${folder_array[6]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 6) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 8)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[8]}">
<font size="-1">
<limittext value="${folder_array[8]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 8) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 10)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[10]}">
<font size="-1">
<limittext value="${folder_array[10]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 10) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 12)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[12]}">
<font size="-1">
<limittext value="${folder_array[12]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 12) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`
}

if (totalfavorites == 14) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 1)
{
	data += `<tr><td><table cellspacing="0" cellpadding="0">
<tbody><tr><td width="6" height="12"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td width="20">
</td></tr></tbody></table>
</tr><td></td></tr></tbody></table>
</td><td valign="top" align="left">
<table width="225" cellspacing="0" cellpadding="0">
<tbody><tr><td absheight="21" bgcolor="2b2b2b"> 
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightTop.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[1]}">
<font size="-1">
<limittext value="${folder_array[1]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 1) {
	data += `<tr><td><table cellspacing="0" cellpadding="0">
<tbody><tr><td width="6" height="12"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td width="20">
</td></tr></tbody></table>
</tr><td></td></tr></tbody></table>
</td><td valign="top" align="left">
<table width="225" cellspacing="0" cellpadding="0">
<tbody><tr><td absheight="20" bgcolor="2b2b2b"> 
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightTopEdgeOnly.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</font>
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 3)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[3]}">
<font size="-1">
<limittext value="${folder_array[3]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 3) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 5)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[5]}">
<font size="-1">
<limittext value="${folder_array[5]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 5) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 7)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[7]}">
<font size="-1">
<limittext value="${folder_array[7]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 7) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 9)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[9]}">
<font size="-1">
<limittext value="${folder_array[9]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 9) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 11)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[11]}">
<font size="-1">
<limittext value="${folder_array[11]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 11) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
if (totalfavorites > 13)
{
	data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[13]}">
<font size="-1">
<limittext value="${folder_array[13]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></tbody></table>`
} else if (totalfavorites == 13) {
		data += `
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tbody><tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></tbody></table>`

stopdrawing = true;

}
*/
	data += `
</td></tr></tbody></table>
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr><td width="451" height="2" background="ROMCache/FoldersCoverBorder.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></tbody></table>



</display></body></html>
`;
}