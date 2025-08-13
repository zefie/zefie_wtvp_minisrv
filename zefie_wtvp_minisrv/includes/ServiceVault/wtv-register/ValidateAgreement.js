const minisrv_service_file = true;

if (!request_headers.query.registering) {
    const errpage = wtvshared.doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
} else {
    const WTVRegister = require(classPath + "/WTVRegister.js")
    const wtvr = new WTVRegister(minisrv_config);
    headers = `200 OK
Content-Type: text/html`;
    const main_data = `<form action="ValidateAccountInfo"
ENCTYPE="x-www-form-encoded" METHOD="POST">
<input type=hidden name=registering value="true">
Please set up your account:<br><br>
<font size="-2"><b>YOUR NAME:</b></font><img src="ROMCache/spacer.gif" width="7">
<img src="ROMCache/spacer.gif" width="78" height="5"><INPUT NAME="subscriber_name"
ID="subscriber_name"
bgcolor=#444444 text=#ffdd33 cursor=#cc9933
VALUE="${request_headers.query.subscriber_name || ""}" TYPE="text" SIZE="19"
MAXLENGTH="18"
AutoCaps selected>
<p>
<font size="-2"><b>DESIRED USERNAME:</b></font><img src="ROMCache/spacer.gif" width="7">
<img src="ROMCache/spacer.gif" width="5"><INPUT NAME="subscriber_username"
ID="subscriber_username"
bgcolor=#444444 text=#ffdd33 cursor=#cc9933
VALUE="${request_headers.query.subscriber_username || ""}" TYPE="text" SIZE="19"
MAXLENGTH="16"
AutoCaps selected>
<p>
<font size="-2"><b>YOUR CONTACT INFO:</b></font><img src="ROMCache/spacer.gif" width="7">
<INPUT NAME="subscriber_contact"
ID="subscriber_contact"
bgcolor=#444444 text=#ffdd33 cursor=#cc9933
TYPE="text" SIZE="19"
MAXLENGTH="64"
AutoCaps selected value="${request_headers.query.subscriber_contact || ""}">
<p>
<font size="-2"><b>CONTACT INFO TYPE:</b></font><img src="ROMCache/spacer.gif" width="7">
<img src="ROMCache/spacer.gif" width="3"><select usestyle id="subscriber_contact_method" name="subscriber_contact_method">
<option value="">Type</option>
<option${(request_headers.query.subscriber_contact_method == "E-Mail") ? " selected" : ""}>E-Mail</option>
<option${(request_headers.query.subscriber_contact_method == "Discord") ? " selected" : ""}>Discord</option>
<option${(request_headers.query.subscriber_contact_method == "Twitter") ? " selected" : ""}>Twitter</option>
<option${(request_headers.query.subscriber_contact_method == "Telegram") ? " selected" : ""}>Telegram</option>
<option${(request_headers.query.subscriber_contact_method == "Instagram") ? " selected" : ""}>Instagram</option>
</select>
`;
    const form_data = `<shadow>
<input type=submit Value=Continue name="Continue" borderimage="file://ROM/Borders/ButtonBorder2.bif" text="#dddddd" width=110>
</shadow>
</font>
</form>`;
    data = wtvr.getHTMLTemplate(minisrv_config.config.service_name + " Account Setup", main_data, form_data, wtvshared.isOldBuild(session_data)); 
}
