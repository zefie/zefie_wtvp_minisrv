var minisrv_service_file = true;

headers = `200 OK
Content-Type: text/html`;

var WTVRegister = require(classPath + "/WTVRegister.js");
var wtvr = new WTVRegister(minisrv_config);
var namerand = Math.floor(Math.random() * 100000);
var nickname = (minisrv_config.config.service_name + '_' + namerand)
var human_name = nickname;
var hasJS = session_data.hasCap("client-can-do-javascript");
if (hasJS) {
    var form_data = `<script>butt(th,'Quick Reg','speedyreg',130,'button','action="ValidateAgreement?registering=true&subscriber_name=${human_name}&subscriber_username=${nickname}"');`;
    if (minisrv_config.config.allow_guests) form_data += `butt(th, 'Sign in as Guest', 'noreg', 170, 'button', 'action="BeMyGuest"')`;
    form_data += '</script>';
} else {
    var form_data = `<input type=button action="ValidateAgreement?registering=true&subscriber_name=${human_name}&subscriber_username=${nickname}" text="e7ce4a" Value="Quick Reg" name="speedyreg" borderimage="file://ROM/Borders/ButtonBorder2.bif" width=130>`;
    if (minisrv_config.config.allow_guests) form_data += `<input type=button text="e7ce4a" action="BeMyGuest" Value="Sign in as Guest" name="noreg" borderimage="file://ROM/Borders/ButtonBorder2.bif" width=170 >`;
}
var main_data = `<form action="ValidateAgreement"
ENCTYPE="x-www-form-encoded" METHOD="POST">
<input type=hidden name=registering value="true">
Welcome to the ${minisrv_config.config.service_name} Mini Service, operated by ${minisrv_config.config.service_owner}.
The next screens will lead you through a quick setup process for using this service.<p> Press the "Continue" button below to begin setup.<p>`;
if (hasJS) {
    form_data += `<script>butt(th,'Continue','Continue',110)</script>`;
} else {
    form_data += `<input type=submit Value=Continue name="Continue" text="#e7ce4a" borderimage="file://ROM/Borders/ButtonBorder2.bif" width=110 selected>`;
}

form_data += `</form>`;

data = wtvr.getHTMLTemplate("Welcome to " + minisrv_config.config.service_name, main_data, form_data, hasJS);