const minisrv_service_file = true;

const WTVAdmin = require(classPath + "/WTVAdmin.js");
const wtva = new WTVAdmin(minisrv_config, session_data, service_name);
const auth = wtva.isAuthorized();

function generateFormField(type, confvar, options = null) {
    let confvar_value;
    const user_config = wtvshared.getUserConfig();
    if (confvar.indexOf('.') > 0) {
        const confvar_split = confvar.split('.');
        // not operater error resistant, be mindful if you modify this page
        if (user_config.config[confvar_split[0]]) {
            confvar_value = user_config.config[confvar_split[0]][confvar_split[1]] || minisrv_config.config[confvar_split[0]][confvar_split[1]];
        } else {
            confvar_value = minisrv_config.config[confvar_split[0]][confvar_split[1]];
        }
        confvar = confvar.replace(".", "-");
    } else {
        confvar_value = user_config.config[confvar] || minisrv_config.config[confvar];
    }

    if (type == "input")
        return `<input bgcolor="101010" text="ee44bb" type="text" name="${confvar}" value="${confvar_value}"${(options) ? ' '+options : ''}>`
    if (type == "checkbox")
        return `<input type="hidden" name="${confvar}" value="false">\n<input type=checkbox name="${confvar}" ${wtvshared.parseBool(confvar_value) ? "checked=checked" : ''}${(options) ? ' ' + options : ''}>`
    if (type == "select") {
        let out = `<select name="${confvar}">\n`
        if (options) {
            Object.keys(options).forEach((k) => {
                out += `<option value="${options[k].value}"${(confvar_value == options[k].value) ? ' selected' : ''}>${options[k].name}</option>\n`
            });
        }
        return out + "</select>";
    }
}

if (auth === true) {
    let password = null;
    if (request_headers.Authorization) {
        const authheader = request_headers.Authorization.split(' ');
        if (authheader[0] == "Basic") {
            password = Buffer.from(authheader[1], 'base64').toString();
            if (password) password = password.split(':')[1];
        }
    }
    if (wtva.checkPassword(password)) {
        const user_config = wtvshared.getUserConfig();
        headers = "200 OK\r\nContent-Type: text/html";
        data = `<html>
<body>
<display nosave nosend>
<title>${minisrv_config.config.service_name} Operator Tweaks</title>
<script type="text/javascript">
 
    function forceNumeric(e) {
        switch (e.keyCode) {
             case 8:
             case 9:
            case 13:
            case 48:
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57:
                return true;
                break;

            default:
                return false;
        }
    }

    function passwordFieldToggle(check) {
        document.forms[0]['passwords-min_length'].disabled = !check.checked;
        document.forms[0]['passwords-min_length'].readonly = !check.checked;
        document.forms[0]['passwords-max_length'].disabled = !check.checked;
        document.forms[0]['passwords-max_length'].readonly = !check.checked;
        document.forms[0]['passwords-form_size'].disabled = !check.checked;
        document.forms[0]['passwords-form_size'].readonly = !check.checked;
    }

    function validateNumber(field, min, max, def) {
        var num = parseInt(field.value);
        if (num === NaN) num = def;
        if (num < min) num = min;
        if (num > max) num = max;
        if (field.value != num) field.value = num;
    }
</script>
<sidebar width=20%>
<img src="wtv-tricks:/images/Favorites_bg.jpg">
</sidebar>
<body bgcolor="#101010" text="#EE44bb" link="#ff55ff" vlink="#ff55ff" vspace=0>
<font size="-1">
<br>
<br>
<h1><font color=#FF3455>${minisrv_config.config.service_name} Operator Tweaks</font></h1>

<font size=-1><i>These settings can be updated without restarting minisrv</i></font>
<hr>
<table>
<tr>
<TD>
<TR>
<td>
<tr>
<td WIDTH=198 VALIGN=top ALIGN=left>
<table cellspacing=0 cellpadding=5>
<tr><td absheight=60 valign=top>
<font size=-1><b>service_owner</b><br>The name of the server
operator
<tr><td absheight=60 valign=top>
<font size=-1><b>service_owner_account</b><br>The minisrv account name of the server
operator
<tr><td absheight=90 valign=top>
<font size=-1><b>service_owner_contact</b><br>The email address or username of the
server operator where users can contact them
<tr><td absheight=100 valign=top>
<font size=-1><b>service_owner_<br>contact_method</b><br>The method by which the user can
contact the server operator (eg. email, Discord, Twitter, etc...)
<tr><td absheight=60 valign=top>
<font size=-1><b>service_name</b><br>The name of the service (eg. WebTV)
<tr><td absheight=90 valign=top>
<font size=-1><b>service_logo</b><br>The logo for the service. Absolute URL, or file name in the Shared ROMCache.
<tr><td absheight=90 valign=top>
<font size=-1><b>service_splash_logo</b><br>The splash page logo for the service. Absolute URL, or file name in the Shared ROMCache.
<tr><td absheight=60 valign=top>
<font size=-1><b>show_detailed_splash</b><br>Show service information and client connection speed on the splash page.
<tr><td absheight=60 valign=top>
<font size=-1><b>hide_ssid_in_logs</b><br>Filter SSIDs in console logs and log files.
<tr><td absheight=90 valign=top>
<font size=-1><b>filter_<br>passwords_in_logs</b><br>Filter passwords (if the form field contains 'pass') in console logs and log files.
<tr><td absheight=45 valign=top>
<font size=-1><b>verbosity</b><br>Console log debug level.
<tr><td absheight=60 valign=top>
<font size=-1><b>show_diskmap</b><br>Useful for debugging wtv-disk downloads.
<tr><td absheight=90 valign=top>
<font size=-1><b>enable_<br>lzpf_compression</b><br>Toggles whether LZPF compression will be considered or not
<tr><td absheight=90 valign=top>
<font size=-1><b>enable_<br>gzip_compression</b><br>Toggles whether GZIP compression will be considered or not
<tr><td absheight=45 valign=top>
<font size=-1><b>Max Users Per Account</b>
<tr><td absheight=45 valign=top>
<font size=-1><b>Min Username Length</b>
<tr><td absheight=45 valign=top>
<font size=-1><b>Max Username Length</b>
<tr><td absheight=120 valign=top>
<font size=-1><b>Enable Passwords</b><br>
When disabled, accounts will not be able to use passwords, if they had a password set prior, the account will be accessible without it.
<tr><td absheight=45 valign=top>
<font size=-1><b>Min Password Length</b>
<tr><td absheight=45 valign=top>
<font size=-1><b>Max Password Length</b>
<tr><td absheight=60 valign=top>
<font size=-1><b>Password Field Size</b>
The size of the field on the login password page
</table>
<TD WIDTH=15>
<TD WIDTH=198 absheight=1640 VALIGN=top ALIGN=left colspan=2>
<form action="wtv-admin:/validate-operator-tweaks">
<input type=hidden name=autosubmit value=true autosubmit=onleave>
<table cellspacing=0 cellpadding=5>
<tr><td valign=top>
<table>
<tr>
<td absheight=60 valign=top>
${generateFormField('input', 'service_owner')}
<tr>
<td absheight=60 valign=top>
${generateFormField('input', 'service_owner_account')}
<tr>
<td absheight=90 valign=top>
${generateFormField('input', 'service_owner_contact')}
<tr>
<td absheight=90 valign=top>
${generateFormField('input', 'service_owner_contact_method')}
<tr>
<td absheight=55 valign=top>
${generateFormField('input', 'service_name')}
<tr>
<td absheight=85 valign=top>
${generateFormField('input', 'service_logo')}
<tr>
<td absheight=90 valign=top>
${generateFormField('input', 'service_splash_logo')}
<tr>
<td absheight=60 valign=top>
${generateFormField('checkbox', 'show_detailed_splash')}
<tr>
<td absheight=60 valign=top>
${generateFormField('checkbox', 'hide_ssid_in_logs')}
<tr>
<td absheight=80 valign=top>
${generateFormField('checkbox', 'filter_passwords_in_logs')}
<tr>
<td absheight=50 valign=top>
${generateFormField('select', 'verbosity', [
    { "name": "Quiet (0)", value: 0 },
    { "name": "Show Headers (1)", value: 1 },
    { "name": "Verbose, without Headers (2)", value: 2 },
    { "name": "Verbose, with headers (3)", value: 3 },
    { "name": "Debug (4)", value: 4 },
])}
<tr>
<td absheight=60 valign=top>
${generateFormField('checkbox', 'show_diskmap')}
<tr>
<td absheight=85 valign=top>
${generateFormField('checkbox', 'enable_lzpf_compression')}
<tr>
<td absheight=80 valign=top>
${generateFormField('checkbox', 'enable_gzip_compression')}
<tr>
<td absheight=42 valign=top>
${generateFormField('input', 'user_accounts.max_users_per_account', "size=2 onkeypress='return forceNumeric(event)' onchange='validateNumber(this,1,50,6)' maxlength=2")}
<tr>
<td absheight=42 valign=top>
${generateFormField('input', 'user_accounts.min_username_length', "size=2 onkeypress='return forceNumeric(event)' onchange='validateNumber(this,3,50,5)' maxlength=2")}
<tr>
<td absheight=50 valign=top>
${generateFormField('input', 'user_accounts.max_username_length', "size=2 onkeypress='return forceNumeric(event)' onchange='validateNumber(this,3,50,18)' maxlength=2")}
<tr>
<td absheight=113 valign=top>
${generateFormField('checkbox', 'passwords.enabled', "onchange='passwordFieldToggle(this)'")}
<tr>
<td absheight=40 valign=top>
${generateFormField('input', 'passwords.min_length', "size=2 onkeypress='return forceNumeric(event)' onchange='validateNumber(this,3,32,5)' maxlength=2")}
<tr>
<td absheight=46 valign=top>
${generateFormField('input', 'passwords.max_length', "size=2 onkeypress='return forceNumeric(event)' onchange='validateNumber(this,3,256,32)' maxlength=2")}
<tr>
<td absheight=60 valign=top>
${generateFormField('input', 'passwords.form_size', "size=2 onkeypress='return forceNumeric(event)' onchange='validateNumber(this,5,99,16)' maxlength=2")}
</table>
</table>
</form>
<tr>
<td colspan=4><hr>

<TR>
<TD>
<TD COLSPAN=2 VALIGN=top ALIGN=left>
<TD VALIGN=top ALIGN=right>
<FORM action="client:goback">
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" Value=Done NAME="Done" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD><TD>
<tr><td>
</TABLE>
</body>
</html>
`;
    } else {
        const errpage = wtvshared.doErrorPage(401, "Please enter the administration password, you can leave the username blank.");
        headers = errpage[0];
        data = errpage[1];
    }
} else {
    const errpage = wtvshared.doErrorPage(403, auth);
    headers = errpage[0];
    data = errpage[1];
}