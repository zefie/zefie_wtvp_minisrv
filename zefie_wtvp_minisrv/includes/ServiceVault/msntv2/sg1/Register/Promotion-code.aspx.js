const minisrv_service_file = true;

// TODO: if the user hits back, and removes the password from the user/pass page, any previously entered password
// will still be in the cookie and they will skip the password page.
// We should probably clear the password cookie when they hit back from the password page, but how?
// We can't assume password = '' means they hit back, because some pages will not send it.
let email = request_headers.query.email || '';
if (Array.isArray(email)) email = email[0];
if (!email && request_headers.cookie) {
    const pm = request_headers.cookie.match(/(?:^|;\s*)register_email=([^;]*)/);
    if (pm) email = decodeURIComponent(pm[1]);
}

let password = request_headers.query.password || '';
if (Array.isArray(password)) password = password[0];
if (!password && request_headers.cookie) {
    const pm = request_headers.cookie.match(/(?:^|;\s*)register_password=([^;]*)/);
    if (pm) password = decodeURIComponent(pm[1]);
}

if (email && email.indexOf('@') < 0) email += "@"+minisrv_config.config.domain_name;
let userAvail = false;

if (email) {
    username = email.split('@')[0];
    const wtvr = new WTVRegister(minisrv_config);
    userSane = wtvr.checkUsernameSanity(username);
    userAvail = wtvr.checkUsernameAvailable(username);
    setCookie('register_email', email, { path: '/' });
    if (!userAvail || !userSane) {
        headers =  `Status: 302 Found
Location: https://sg1.trusted.msntv.msn.com/Register/Username-Not-Available.aspx`;
data = "";
    }
}

if (!password && !headers) {
    headers =  `Status: 302 Found
Location: https://sg1.trusted.msntv.msn.com/Register/Password-Required.aspx`;
data = "";
    deleteCookie('register_password', { path: '/' });
} else {
    setCookie('register_password', password, { path: '/' });
}

if (userAvail && password) {

headers = `Status: 200 OK
Content-type: text/html`;

data = `<HTML xmlns:msntv>
<?import namespace="msntv" implementation="/Include/HTC/Shared/CustomButton.htc">
<HEAD>
    <title id="title">Promotion Code</title>
    <meta name="vs_targetSchema" content="http://schemas.microsoft.com/intellisense/ie5">
    <link rel="stylesheet" type="text/css" href="msntv:/Registration/css/Registration.css">
    <STYLE>
        body {
            background-image: url(msntv:/Registration/images/bgimage.jpg);
            background-color: #23B3DF;
        }
        #main td {
            padding-bottom: 9px;
            padding-right: 0px;
        }
    </STYLE>
</HEAD>
<BODY width="520" height="388">
    <DIV id="title">Promotion Code</DIV>
    <DIV id="main">
        <p>Do you have a Promotion Code? Please choose the answer below.</p>
        <br/>
        <div class="moreNewsDiv" style="margin: 0; padding: 0; bottom: 8px; position: relative;">
            <table style="margin: 0; padding: 0; border-spacing: 0; ">
                <tr style="margin: 0; padding: 0;">
                    <td style="margin: 0; padding: 0; vertical-align: middle;"><img src="msntv:/Shared/Images/BulletCustom.gif" height="14" width="7" alt="Bullet"></td>
                    <td style="margin: 0; padding: 0; width: 4px;"></td>
                    <td style="margin: 0; padding: 0; font-size: 24px; font:bold 18; line-height: 20px;"><a class="shrLnk2" href="/Register/Choose-Your-Profile-Picture.aspx" style="display: inline-block; line-height: 20px;">No, I don't have a Promotion Code.</a></td>
                </tr>
                <tr style="margin: 0; padding: 0; top: 2px; position: relative;">
                    <td style="margin: 0; padding: 0; vertical-align: middle; top: 2px; position: relative;"><img src="msntv:/Shared/Images/BulletCustom.gif" height="14" width="7" alt="Bullet"></td>
                    <td style="margin: 0; padding: 0; width: 4px;"></td>
                    <td style="margin: 0; padding: 0; font-size: 24px; font:bold 18; line-height: 20px;"><a class="shrLnk2" href="/Register/Enter-Promotion-Code.aspx" style="display: inline-block; line-height: 20px;">Yes, I have a Promotion Code.</a> (TODO)</td>
                </tr>
            </table>
        </div>
    </DIV>
</BODY>
</HTML>`;

}
