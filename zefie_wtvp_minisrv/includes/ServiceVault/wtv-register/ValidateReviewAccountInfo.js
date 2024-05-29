var minisrv_service_file = true;


if (!request_headers.query.registering ||
    !request_headers.query.subscriber_name ||
    !request_headers.query.subscriber_username ||
    !request_headers.query.subscriber_contact ||
    !request_headers.query.subscriber_contact_method ||
    !session_data.session_store ||
    !session_data ||
    !socket.ssid
) {
    var errpage = wtvshared.doErrorPage(400);
    headers = errpage[0];
    data = errpage[1];
} else {
    var errpage = null;
    const WTVRegister = require(classPath + "/WTVRegister.js")
    var wtvr = new WTVRegister(minisrv_config, SessionStore);
    if (!request_headers.query.subscriber_username) errpage = wtvshared.doErrorPage(400, "Please enter a username.");
    else if (request_headers.query.subscriber_username.length < minisrv_config.config.user_accounts.min_username_length) errpage = wtvshared.doErrorPage(400, "Please choose a username with <b>" + minisrv_config.config.user_accounts.min_username_length + "</b> or more characters.");
    else if (request_headers.query.subscriber_username.length > minisrv_config.config.user_accounts.max_username_length) errpage = wtvshared.doErrorPage(400, "Please choose a username with <b>" + minisrv_config.config.user_accounts.max_username_length + "</b> or less characters.");
    else if (!wtvr.checkUsernameSanity(request_headers.query.subscriber_username)) errpage = wtvshared.doErrorPage(400, "The username you have chosen contains invalid characters. Please choose a username with only <b>letters</b>, <b>numbers</b>, <b>_</b> or <b>-</b>. Also, please be sure your username begins with a letter.");
    else if (!wtvr.checkUsernameAvailable(request_headers.query.subscriber_username)) errpage = wtvshared.doErrorPage(400, "The username you have selected is already in use. Please select another username.");
    if (errpage) {
        headers = errpage[0];
        data = errpage[1];
    } else {
        session_data.setSessionData("subscriber_name", request_headers.query.subscriber_name);
        session_data.setSessionData("subscriber_username", request_headers.query.subscriber_username);
        session_data.setSessionData("subscriber_contact", request_headers.query.subscriber_contact);
        session_data.setSessionData("subscriber_contact_method", request_headers.query.subscriber_contact_method);
        session_data.setSessionData("subscriber_userid", 0);
        session_data.setSessionData("registered", true);
        var mailstore_exists = session_data.mailstore.mailstoreExists();
        var mailbox_exists = false;
        if (!mailstore_exists) mailstore_exists = session_data.mailstore.createMailstore();
        if (mailstore_exists) {
            if (!session_data.mailstore.mailboxExists(0)) {
                // mailbox does not yet exist, create it
                mailbox_exists = session_data.mailstore.createMailbox(0);
            }
            if (mailbox_exists) {
                // Just created Inbox for the first time, so create the welcome message
                session_data.mailstore.createWelcomeMessage();
            }
        }
        if (!session_data.saveSessionData(true, true)) {
            var errpage = wtvshared.doErrorPage(400);
            headers = errpage[0];
            data = errpage[1];
        } else {

            var hasJS = session_data.hasCap("client-can-do-javascript")
            headers = `200 OK
Content-Type: text/html`;
            var title = "Finished signing up";
            var main_data = `<form action="FinishRegistration"
<input type=hidden name=registering value="true">
<input type=hidden name=subscriber_name value="${request_headers.query.subscriber_name}">
<input type=hidden name=subscriber_username value="${request_headers.query.subscriber_username}">
<input type=hidden name=subscriber_contact value="${request_headers.query.subscriber_contact}">
<input type=hidden name=subscriber_contact_method value="${request_headers.query.subscriber_contact_method}">
Thank you for signing up for ${minisrv_config.config.service_name}.
<p>
You will now go
to your <b>Web Home</b> page. You can always
connect to the Internet by choosing
<b>Web Home</b> on your TV Home page.`;


            var form_data = '';
            if (hasJS) {
                form_data += `<script>butt(th,'Continue','Continue',110)</script>`;
            }
            else {
                form_data += `<shadow><input selected Value="Continue" name="Continue" width="110" type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif"></shadow>`;
            }

            form_data += '</form>';
            data = wtvr.getHTMLTemplate(title, main_data, form_data, hasJS);

            headers = `200 OK
Content-Type: text/html`;
        }
    }
}