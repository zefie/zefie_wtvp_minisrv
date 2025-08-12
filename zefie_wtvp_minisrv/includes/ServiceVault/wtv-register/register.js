const minisrv_service_file = true;

headers = `200 OK
Content-Type: text/html`;

const WTVRegister = require(classPath + "/WTVRegister.js");
const wtvr = new WTVRegister(minisrv_config);
const namerand = Math.floor(Math.random() * 100000);
const nickname = (minisrv_config.config.service_name + '_' + namerand)
const human_name = nickname;
const isOldBuild = wtvshared.isOldBuild(session_data);
let form_data = `<input type=button action="ValidateAgreement?registering=true&subscriber_name=${human_name}&subscriber_username=${nickname}" text="#dddddd" Value="Quick Reg" name="speedyreg" borderimage="file://ROM/Borders/ButtonBorder2.bif" width=130>`;
const main_data = `<form action="ValidateAgreement"
ENCTYPE="x-www-form-encoded" METHOD="POST">
<input type=hidden name=registering value="true">
Welcome to the ${minisrv_config.config.service_name} Mini Service, operated by ${minisrv_config.config.service_owner}.
The next screens will lead you through a quick setup process for using this service.<p> Press the "Continue" button below to begin setup.<p>`;

form_data += `<input type=submit Value=Continue name="Continue" text="#dddddd" borderimage="file://ROM/Borders/ButtonBorder2.bif" width=110 selected>
</shadow>
</font>
</form>
`;

data = wtvr.getHTMLTemplate("Welcome to " + minisrv_config.config.service_name, main_data, form_data, isOldBuild);
