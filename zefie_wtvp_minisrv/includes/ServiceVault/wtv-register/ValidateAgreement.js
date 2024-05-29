var minisrv_service_file = true;

if (!request_headers.query.registering) {
    var errpage = wtvshared.doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
} else {
    var hasJS = session_data.hasCap("client-can-do-javascript");
    const WTVRegister = require(classPath + "/WTVRegister.js")
    var wtvr = new WTVRegister(minisrv_config);
    headers = `200 OK
Content-Type: text/html`;
    var main_data = `<form action="ValidateAccountInfo"
ENCTYPE="x-www-form-encoded" METHOD="POST">
<input type=hidden name=registering value="true">
Please set up your account:<br><br>
<table>
<tr>
<td>
<font size="-2"><b>YOUR NAME:</b></font><img src="ROMCache/spacer.gif" width="7">
<img src="ROMCache/spacer.gif" width="78" height="5">
</td>
<td>
<INPUT NAME="subscriber_name" ID="subscriber_name" bgcolor=#444444 text=#ffdd33 cursor=#cc9933 VALUE="${request_headers.query.subscriber_name || ""}" TYPE="text" SIZE="19" MAXLENGTH="18" AutoCaps selected>
</td>
</tr>
<tr>
<td>
<font size="-2"><b>DESIRED USERNAME:</b></font><img src="ROMCache/spacer.gif" width="7">
<img src="ROMCache/spacer.gif" width="5">
</td>
<td>
<INPUT NAME="subscriber_username" ID="subscriber_username" bgcolor=#444444 text=#ffdd33 cursor=#cc9933 VALUE="${request_headers.query.subscriber_username || ""}" TYPE="text" SIZE="19" MAXLENGTH="16" selected>
</td>
</tr>
<tr>
<td>
<font size="-2"><b>YOUR CONTACT INFO:</b></font><img src="ROMCache/spacer.gif" width="7">
</td><td><INPUT NAME="subscriber_contact"
ID="subscriber_contact"
bgcolor=#444444 text=#ffdd33 cursor=#cc9933
VALUE="" TYPE="text" SIZE="19"
MAXLENGTH="64"
AutoCaps selected>
</td></tr>
<td><font size="-2"><b>CONTACT INFO TYPE:</b></font><img src="ROMCache/spacer.gif" width="7">
<img src="ROMCache/spacer.gif" width="3"></td>
<td>
<select usestyle id="subscriber_contact_method" name="subscriber_contact_method">
<option value="">Type</option>
<option>E-Mail</option>
<option>Discord</option>
<option>Twitter</option>
<option>Telegram</option>
<option>Instagram</option>
</select>
</td></tr></table>`;
    var form_data = ``
    if (hasJS) {
        form_data += `<script>butt(th,'Continue','Continue',110)</script>`;
    } else {
        form_data += `<shadow><input type=submit Value=Continue name="Continue" borderimage="file://ROM/Borders/ButtonBorder2.bif" width=110></shadow>`;
    }
    form_data += `</form>`;
    data = wtvr.getHTMLTemplate(minisrv_config.config.service_name + " Account Setup", main_data, form_data, hasJS); 
}