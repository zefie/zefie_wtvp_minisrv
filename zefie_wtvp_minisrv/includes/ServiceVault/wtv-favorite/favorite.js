const minisrv_service_file = true;

const favstore_exists = session_data.favstore.favstoreExists();

if (favstore_exists !== true)
{
	session_data.favstore.createFavstore();
	headers = `300 OK
wtv-expire-all: wtv-favorite:/favorite
Location: wtv-favorite:/favorite`
} else {

const folder_array = session_data.favstore.getFolders();

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
<display ${(minisrv_config.services[service_name].max_folders <= 14) ? "noscroll" : ""}>
</head><body fontsize="large" vspace="0" hspace="0" vlink="189cd6" text="44cc55" link="189cd6" bgcolor="191919">


<sidebar width="109" height="384">

<table cellspacing="0" cellpadding="0" bgcolor="284a52">
<tr><td absheight="196" valign="top">
<table absheight="196" cellspacing="0" cellpadding="0">
<tr>
<td width="100%" valign="top" height="50%">
<table cellspacing="0" cellpadding="0">
<tr>
<td colspan="3" absheight="1" width="100%">
</td></tr><tr>
<td abswidth="6">
</td><td absheight="79" width="100%" align="center">
<table href="wtv-home:/home" absheight="79" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td width="100%" align="center">
<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width="87" height="67">
</td></tr></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="100%" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td colspan="3" absheight="1" width="100%">
</td></tr><tr><td colspan="3" absheight="2" width="100%" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">	</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tr><td abswidth="5" absheight="26">
</td><td width="100%">
<table href="wtv-favorite:/serve-add-folder-page?favorite_folder_name=Personal" width="100%" cellspacing="0" cellpadding="0">
<tr><td>
<table cellspacing="0" cellpadding="0">
<tr><td><shadow><font size="-1" color="E7CE4A">
 Add folder&nbsp;&nbsp;
</font></shadow></td></tr></table>
</td></tr></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></table>
</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tr><td abswidth="5" absheight="26">
</td><td width="100%">
<table href="wtv-favorite:/serve-discard-folders?favorite_folder_name=Personal" width="100%" cellspacing="0" cellpadding="0">
<tr><td>
<table cellspacing="0" cellpadding="0">
<tr><td><shadow><font size="-1" color="E7CE4A">
 Remove&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
</font></shadow></td></tr></table>
</td></tr></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></table>
</td></tr><tr><td absheight="32" colspan="3" width="100%">
<table cellspacing="0" cellpadding="0">
<tr><td abswidth="5" absheight="26">
</td><td width="100%">
<table href="wtv-home:/throwerror" width="100%" cellspacing="0" cellpadding="0">
<tr><td>
<table cellspacing="0" cellpadding="0">
<tr><td><shadow><font size="-1" color="E7CE4A">
 Help&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
</font></shadow></td></tr></table>
</td></tr></table>
</td><td abswidth="5">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="1f3136">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="1">
</td></tr><tr><td colspan="3" absheight="2" width="104" bgcolor="436f79">
<img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></table>
</td></tr></table>
</td></tr></table>
</td><td abswidth="5" background="ROMCache/Shadow.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr><td absheight="188" valign="top">
<table absheight="188" cellspacing="0" cellpadding="0">
<tr><td width="100%"><img src="wtv-home:/ROMCache/Spacer.gif" width="100%" height="1">
</td><td valign="bottom" align="right"><img src="ROMCache/FavoritesBanner.gif" width="50" height="188">
</td></tr></table>
</td><td abswidth="5" background="ROMCache/Shadow.gif"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></table>
</sidebar>

<table width="451" cellspacing="0" cellpadding="0" bgcolor="2b2b2b">
<tr>
<td width="4" height="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td width="16"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td><table cellspacing="0" cellpadding="0">
<tr><td align="left">
<shadow><blackface><font color="e7ce4a">
Favorite folders
for ${session_data.getSessionData("subscriber_username") || "You"}
</font><blackface><shadow>
</shadow></blackface></blackface></shadow></td></tr></table>
</td></tr><tr>
<td width="4" height="14"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></table>

<table cellspacing="0" cellpadding="0">
<tr><td valign="top" align="left">
<table width="225" cellspacing="0" cellpadding="0">
<tr><td width="225" valign="middle" height="42" background="ROMCache/LeftTop.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[0]}" selected="">
<font size="-1">
<limittext value="${folder_array[0]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></table>`
	let kval = 0;
	// process evens
	Object.keys(folder_array).forEach(function (k) {
		if (parseInt(k)=== 0) return; // skip 0 since it was processed above
		if (parseInt(k) % 2 === 0) {
			// even
			// Left Middle
			data += `</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[k]}">
<font size="-1">
<limittext value="${folder_array[k]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></table>`;
			kval = k;
		}
	});

	// process end if total is even
	if (folder_array.length > 1) {
		if (folder_array.length % 2 === 0) {
			data += `</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/LeftBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tr><td width="40" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></table>`;
		}
	}

	// process middle (folder 2 (id 1))
	if (folder_array.length === 1) {
		// no folder 2
		data += `<tr><td><table cellspacing="0" cellpadding="0">
<tr><td width="6" height="12"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td width="20">
</td></tr></table>
</tr><td></td></tr></table>
</td><td valign="top" align="left">
<table width="225" cellspacing="0" cellpadding="0">
<tr><td absheight="20" bgcolor="2b2b2b"> 
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightTopEdgeOnly.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</font>
</td><td width="20">
</td></tr></table>`
	} else {
		// process folder 2 (id 1)
		data += `<tr><td><table cellspacing="0" cellpadding="0">
<tr><td width="6" height="12"><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td><td width="20">
</td></tr></table>
</tr><td></td></tr></table>
</td><td valign="top" align="left">
<table width="225" cellspacing="0" cellpadding="0">
<tr><td absheight="21" bgcolor="2b2b2b"> 
</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightTop.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[1]}">
<font size="-1">
<limittext value="${folder_array[1]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></table>`;
	}

	// process odds
	Object.keys(folder_array).forEach(function (k) {
		if (parseInt(k) === 1) return; // skip 1 since it was processed above
		if (parseInt(k) % 2 !== 0) {
			// odd
			// Right Middle
			data += `</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightMiddle.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
<a href="wtv-favorite:/serve-browser?favorite_folder_name=${folder_array[k]}">
<font size="-1">
<limittext value="${folder_array[k]}" width="140"></limittext></font></a><font size="-1">
</font>
</td><td width="20">
</td></tr></table>`;
		}
	});

	// process end if total is odd
	if (folder_array.length > 1) {
		if (folder_array.length % 2 !== 0) {
			data += `</td></tr><tr><td width="225" valign="middle" height="42" background="ROMCache/RightBottom.gif" align="center">
<table width="50%" cellspacing="0" cellpadding="0">
<tr><td width="5" height="20">
</td><td maxlines="1" width="140" height="20" align="center">
</td><td width="20">
</td></tr></table>`;
		}
	}

	data += `
</td></tr></table>
</td></tr></table>
<table cellspacing="0" cellpadding="0">
<tr><img src="wtv-home:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr></table>


</display></body></html>
`;
}