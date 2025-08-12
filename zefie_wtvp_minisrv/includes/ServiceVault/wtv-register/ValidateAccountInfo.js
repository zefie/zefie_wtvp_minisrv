const minisrv_service_file = true;

if (!request_headers.query.registering) {
    const errpage = wtvshared.doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
} else {
    const WTVRegister = require(classPath + "/WTVRegister.js")
    const wtvr = new WTVRegister(minisrv_config, SessionStore);
    let errpage = null;
    if (!request_headers.query.registering) errpage = wtvshared.doErrorPage(400);
    else if (!request_headers.query.subscriber_name) errpage = wtvshared.doErrorPage(400, "Please enter your name. This can be your real name, or your well-known online alias.");
    else if (!request_headers.query.subscriber_username) errpage = wtvshared.doErrorPage(400, "Please enter a username.");
    else if (request_headers.query.subscriber_username.length < minisrv_config.config.user_accounts.min_username_length) errpage = wtvshared.doErrorPage(400, "Please choose a username with <b>" + minisrv_config.config.user_accounts.min_username_length + "</b> or more characters.");
    else if (request_headers.query.subscriber_username.length > minisrv_config.config.user_accounts.max_username_length) errpage = wtvshared.doErrorPage(400, "Please choose a username with <b>" + minisrv_config.config.user_accounts.max_username_length + "</b> or less characters.");
    else if (!wtvr.checkUsernameSanity(request_headers.query.subscriber_username)) errpage = wtvshared.doErrorPage(400, "The username you have chosen contains invalid characters. Please choose a username with only <b>letters</b>, <b>numbers</b>, <b>_</b> or <b>-</b>. Also, please be sure your username begins with a letter.");
    else if (!wtvr.checkUsernameAvailable(request_headers.query.subscriber_username)) errpage = wtvshared.doErrorPage(400, "The username you have selected is not available. Please select another username.");
    else if (!request_headers.query.subscriber_contact) errpage = wtvshared.doErrorPage(400, "Please enter your contact information.");
    else if (request_headers.query.subscriber_contact_method == "") errpage = wtvshared.doErrorPage(400, "Please select the type of contact information you provided.");


    if (errpage) {
        headers = errpage[0];
        data = errpage[1];
    } else {

        headers = `200 OK
wtv-noback-all: wtv-register:
Content-Type: text/html`;
        const title = "Account Review";
        const isOldBuild = wtvshared.isOldBuild(session_data);
        let main_data = '';
        if (!isOldBuild) main_data += `<table cellspacing=0 cellpadding=0 border=0 width=560 bgcolor=#171726>
<tr><td>`;

        main_data += `<form ACTION="ValidateReviewAccountInfo" ENCTYPE="x-www-form-encoded" METHOD="POST">
<input type=hidden name=registering value="true">
<input type=hidden name=subscriber_name value="${request_headers.query.subscriber_name}">
<input type=hidden name=subscriber_username value="${request_headers.query.subscriber_username}">
<input type=hidden name=subscriber_contact value="${request_headers.query.subscriber_contact}">
<input type=hidden name=subscriber_contact_method value="${request_headers.query.subscriber_contact_method}">
<td height=50 width=300 colspan=6 valign=top align=left>
 &nbsp; <br>
Here is your account information. If you need to<br>
correct an item, press <b>Back</b>.<p>`;
        if (isOldBuild) main_data += "<table>";

        main_data += `<tr>
<td width=260 valign=top align=left colspan=4>
<table cellspacing=0 cellpadding=0 border=0>
	<img src="images/arrow.gif">&nbsp;&nbsp;<font size=-2><b>NAME</b></font><br>
<tt><font color=#d1d3d3 size=-2><spacer type=horizontal size=17> ${request_headers.query.subscriber_name}</font></tt></a>
</table>
<p>
<table cellspacing=0 cellpadding=0 border=0> 
<img src="images/arrow.gif">&nbsp;&nbsp;<font size=-2><b>CONTACT</b></font><br>
<tt><font color=#d1d3d3 size=-2><spacer type=horizontal size=17> ${request_headers.query.subscriber_contact}</font></tt></a>
</table>
</TD>
<td abswidth=200 valign=top align=left>
<table cellspacing=0 cellpadding=0 border=0> <TR><TD>
<img src="images/arrow.gif"><font size=-2>&nbsp;&nbsp;<b>USERNAME</b></font><br>
<tr><td maxlines=1 >
<tt><font color=#d1d3d3><spacer type=horizontal size=17>${request_headers.query.subscriber_username}</font></tt></a>
</table>
<p>
<table cellspacing=0 cellpadding=0 border=0>
	<img src="images/arrow.gif">&nbsp;&nbsp;<font size=-2><b>CONTACT TYPE</b></font><br>
<tt><font color=#d1d3d3 size=-2><spacer type=horizontal size=17>${request_headers.query.subscriber_contact_method}</font></tt>
</table> <P>&nbsp;<P>&nbsp;
<td abswidth=20>
</tr>`;
        if (isOldBuild) main_data += '</table>';
        const form_data = `
        <input value="Edit" name="Change" type=submit  borderimage="file://ROM/Borders/ButtonBorder2.bif" text="#dddddd">
<input selected Value="Sign Up" name="Sign Up" width="110" type=submit Value=Continue name="Continue" borderimage="file://ROM/Borders/ButtonBorder2.bif" text="#dddddd">
</shadow>
</font>
</form>`;
        data = wtvr.getHTMLTemplate(title, main_data, form_data, isOldBuild);
    }
}
