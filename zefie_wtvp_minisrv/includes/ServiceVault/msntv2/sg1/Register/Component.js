const minisrv_service_file = true;

let username = request_headers.query.email || request_headers.query.username || '';
if (Array.isArray(username)) username = username[0];
if (!username) username = 'New User';

let picture = request_headers.query.ProfilePicture || request_headers.query.profilepicture || request_headers.query.picture || 'tile01';
if (Array.isArray(picture)) picture = picture[0];
if (!picture) picture = 'tile01';

headers = `Status: 200 OK
Content-type: text/html`;

data = `<html xmlns:msntv>
<head>
    <meta name="vs_targetSchema" content="http://schemas.microsoft.com/intellisense/ie5">
    <title id="title">Change your Profile Picture</title>
    <script LANGUAGE="Javascript" src="Javascript/TVShell.js"></script>
    <script LANGUAGE="Javascript" src="Javascript/MSNTVService.js"></script>
    <import namespace="msntv" implementation="HTC/LoopingDIV.htc">
    <import namespace="msntv" implementation="HTC/CustomButton.htc">
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
        var tvShell = new ActiveXObject("MSNTV.TVShell");
        tvShell.UserManager.SetCurrentUserIsAuthorized(false);
        function AddUser() {
            var user = tvShell.UserManager.AddNew("${username}");
            if (user) {
                user.IsPersistent = false;
            } else {
                user = tvShell.UserManager.Item("${username}");
                if (user && user.IsPersistent) {
                    user.IsPersistent = true;
                }
            }
            if (user) {
                user.LargeIcon = "msntv:/tvshell/images/${picture}.png";
                user.SmallIcon = "msntv:/tvshell/images/${picture}.gif";
            }
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
                                                <span style='display:inline-block; width:142px; height:158px; behavior:url(#default#alphaImageLoader); src:url(msntv:/SignInPics/Big/${picture}.png);'></span>
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
            <msntv:CustomButton id="continue" label="Continue" href="/boxcheck.aspx" />
        </div>
    </div>
</body>
</html>`;
