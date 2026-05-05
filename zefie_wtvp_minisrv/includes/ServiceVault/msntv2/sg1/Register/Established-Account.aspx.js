const minisrv_service_file = true;

let username = request_headers.query.email || request_headers.query.username || '';
if (Array.isArray(username)) username = username[0];
if (!username && request_headers.cookie) {
    const m = request_headers.cookie.match(/(?:^|;\s*)register_email=([^;]*)/);
    if (m) username = decodeURIComponent(m[1]);
}
if (!username) username = 'New User';

let picture = request_headers.query.ProfilePicture || request_headers.query.profilepicture || request_headers.query.picture || 'tile01';
if (Array.isArray(picture)) picture = picture[0];
if (!picture) picture = 'tile01';

// socket.ssid is already resolved by WTV-MSNTV2 from BoxID or SessionID query params.
// Capture BoxId for use in log messages.
const BoxId = (socket.ssid) ? socket.ssid : (request_headers.query.BoxID || request_headers.query.boxid || '');

// Read email/password from cookies (set during registration flow)
let register_email = '';
let register_password = '';
if (request_headers.cookie) {
    const em = request_headers.cookie.match(/(?:^|;\s*)register_email=([^;]*)/);
    if (em) register_email = decodeURIComponent(em[1]);
    const pm = request_headers.cookie.match(/(?:^|;\s*)register_password=([^;]*)/);
    if (pm) register_password = decodeURIComponent(pm[1]);
}

if (session_data && !session_data.isRegistered()) {
    const user_name = register_email ? register_email.split('@')[0] : username;
    const user_password = register_password;

    session_data.setSessionData("subscriber_name", username);
    session_data.setSessionData("subscriber_username", user_name);
    session_data.setSessionData('ProfilePicture', picture);
    session_data.setSessionData("subscriber_userid", 0);
    session_data.setSessionData("registered", true);
    session_data.setUserPassword(user_password);

    if (!session_data.saveSessionData(true, true)) {
        const errpage = wtvshared.doErrorPage(500);
        headers = errpage[0];
        data = errpage[1];
        console.error("Failed to save session data for user %s", username);
    }
} else if (session_data && session_data.isRegistered()) {
    console.warn("Session for BoxID %s is already registered", BoxId);
} else if (!session_data) {
    console.warn("No session_data for BoxID %s — skipping registration", BoxId);
}
if (!headers) {
headers = `Status: 200 OK
Content-type: text/html`;

data = `<html xmlns:msntv>
<head>
    <meta name="vs_targetSchema" content="http://schemas.microsoft.com/intellisense/ie5">
    <title id="title">Account Established</title>

    <script LANGUAGE="Javascript" src="Javascript/TVShell.js"></script>
    <script LANGUAGE="Javascript" src="Javascript/MSNTVService.js"></script>

    <import namespace="msntv" implementation="/Include/HTC/Shared/LoopingDIV.htc">
    <import namespace="msntv" implementation="/Include/HTC/Shared/CustomButton.htc">

    <link rel="stylesheet" type="text/css" href="msntv:/Registration/css/Registration.css">

    <STYLE>
        .arrow {
            width: 8px;
            height: 11px;
            border: 0;
            vertical-align: middle;
        }
    </STYLE>

    <script>
        var TVShell = new ActiveXObject("MSNTV.TVShell");
        TVShell.UserManager.SetCurrentUserIsAuthorized(false);

        function AddUser() {
            var user = TVShell.UserManager.AddNew("${username}");

            if (user) {
                user.IsPersistent = true;
                user.setAttribute("GuestUser", false);
                var dt = new Date();

                TVShell.UserManager.LastLoginTime = dt.getTime() / 1000 + dt.getTimezoneOffset() * 60;

                TVShell.UserManager.OfflineAppMaxAccessDays = 20;
                TVShell.UserManager.OfflineAppMaxAccessTimes = 20;
                TVShell.UserManager.CurrentUser = user;
                user.LargeIcon = "msntv:/SignInPics/big/${picture}.png";
                user.SmallIcon = "msntv:/SignInPics/small/${picture}.gif";
                TVShell.UserManager.Save();
            } else {
                user = TVShell.UserManager.Item("${username}");
                if (user && !user.IsPersistent) {
                    user.IsPersistent = true;
                }
            }
        }

        function GobacktoSignon() {
            entry = TVShell.ServiceList.Add('connection::login');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=Authorize';
            entry.Description = '${minisrv_config.config.service_name}/sg1 [${minisrv_config.config.hide_minisrv_version ? "beta" : minisrv_version_string.replace("zefie's wtv minisrv ","")}]';
            TVShell.ServiceList.Save();
            TVShell.ConnectionManager.ServiceState = 'ReSignIn';
        }

        AddUser();
    </script>
</head>

<body>
    <div id="title">You've finished registration</div>
    <div id="main" style="padding-right:5%;">
        <P>Thank you for registering for the MSN TV service.<br>Your e-mail name and sign in picture appear below.</P>

        <div id="iconNavBarID" class="iconNavBar" style="position: absolute; top: 50px;">
            <table class="iconNavBarMasterTbl">
                <tr>
                    <td align="center" valign="left">
                        <table class="iconNavBarTbl" tabindex="-1">
                            <tr>
                                <td class="iconNavBarTblFrameCell">
                                    <table class="ApolloIcons" tabindex="-1">
                                        <tr height="70">
                                            <td tabindex="-1">
                                                <span style='display:inline-block; width:142px; height:158px; behavior:url(#default#alphaImageLoader); src:url(msntv:/SignInPics/big/${picture}.png);'></span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td align="center" valign="middle">
                        <p>${username}</p>
                    </td>
                </tr>
            </table>
        </div>

        <p style="position: absolute; top: 210px;">
            Choose <em>Continue</em> to sign in to MSN TV using your e-mail
            name and password. Once you sign in, you'll go to your
            MSN TV home page. You can return to your home page
            any time by pressing the <em>Home</em> key on your keyboard.
        </p>

        <div id="footer">
            <msntv:CustomButton id="continue" label="Continue" onclick="GobacktoSignon()" />
        </div>
    </div>
</body>
</html>`;
}
