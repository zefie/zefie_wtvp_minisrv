var minisrv_service_file = true;

var notImplementedAlert = new clientShowAlert({
	'image': minisrv_config.config.service_logo,
	'message': "This feature is not available.",
	'buttonlabel1': "Okay",
	'buttonaction1': "client:donothing",
	'noback': true,
}).getURL();


var settings = [
  ["wtv-setup:/mail", "Mail Signature"],
  ["wtv-setup:/edit-password", "Edit Password"],
  ["wtv-setup:/accounts", "Account & Users"],
  ["wtv-setup:/text", "Text Size"],
  ["wtv-setup:/sound", "Background Music"],
  [notImplementedAlert, "Printing"],
  ["wtv-setup:/keyboard", "On-Screen Keyboard"],
  ["wtv-setup:/screen", "Screen"],
  ["wtv-setup:/messenger", "MSN Messenger"],
  ["wtv-setup:/phone", "Dialing"],
  ["wtv-setup:/region", "Timezone & Region"],
  ["wtv-setup:/tweaks", "Tweaks"]
]

function removeSettingByUrl(url) {
  for (let i = settings.length - 1; i >= 0; i--) {
    if (settings[i][0] === url) {
      settings.splice(i, 1);
    }
  }
}

if (minisrv_config.config.hide_incomplete_features) {
  removeSettingByUrl(notImplementedAlert);
}

/* We need to fix most webtv viewers for this, since they spoof a build that doesn't support messenger?
if (!session_data.hasCap("client-can-use-messenger")) {
  removeSettingByUrl("wtv-setup:/messenger");
}
*/

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
Content-Type: text/html`

data = `<HTML>
<HEAD>
<meta http-equiv="reply-type" content="charset=iso-2022">
<TITLE>
Settings
</TITLE>
<DISPLAY >
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR=452a36>
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="file://ROM/Cache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=92 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=6>
<tr><td absheight=5 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor=2e1e26>
<img src="file://ROM/Cache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor=6b4657>
<spacer type=block width=1 height=1>
</table>
<tr><td absheight=132>
<tr><td absheight=166 align=right colspan=3>
<img src="ROMCache/SettingsBanner.gif" width=54 height=166>
<tr><td absheight=41>
</table>
</sidebar>
<BODY BGCOLOR="#191919" TEXT="#42CC55" LINK="36d5ff" VLINK="36d5ff" FONTSIZE="medium" hspace=0 vspace=0>

<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<shadow><blackface><font color="e7ce4a" size=5>
Settings
for ${session_data.getSessionData("subscriber_username") || "You"}
</font><blackface><shadow>
</table>
<table cellspacing=0 cellpadding=0><tr><td abswidth=10>&nbsp;<td colspan=3>
<table><tc><td>&nbsp;</td></tc><tc><td><table>`;

for (i = 0; i < settings.length; i += 2) {
  console.log(settings);
	data += `<tr>
<td colspan=3 height=6>
<tr>
<td>${(settings[i][0] != "") ? `&#128; <a href="${settings[i][0]}">${settings[i][1]}</a>` : `<!-- TODO --> &nbsp;`}
<td width=25>
<td>`
	if (i + 1 < settings.length) {
		data += (settings[i + 1][0] != "") ? `&#128; <a href="${settings[i + 1][0]}">${settings[i + 1][1]}</a>` : `<!-- TODO --> &nbsp;`
	} else {
		// require even number of settings
		data += "<!-- TODO --> &nbsp;"
	}
}
data += `</table></td></tc></table>
</body>
</html>


`;