const minisrv_service_file = true;

// Session ID from query or cookie (mirrors Razor page logic)
let sessionId = request_headers.query.session || null;
if (!sessionId && request_headers.cookie) {
    const cookieMatch = request_headers.cookie.match(/(?:^|;\s*)MSNTV2_Session=([^;]*)/);
    if (cookieMatch) sessionId = decodeURIComponent(cookieMatch[1]);
}

headers = `Status: 200 OK
Content-type: text/html`;

data = `<HTML xmlns:msntv>
<?import namespace="msntv" implementation="https://sg1.trusted.msntv.msn.com/Include/HTC/Shared/CustomButton.htc">
<HEAD>
    <title id="title">Login to Passport</title>
    <meta name="vs_targetSchema" content="http://schemas.microsoft.com/intellisense/ie5">
    <link rel="stylesheet" type="text/css" href="msntv:/Registration/css/Registration.css">
    <script src="/Include/2.0.261.778/localhost-1700/Shared/BaseClient/JsTransforms/en-us/PaneHelp.js" language="javascript" defer="true"></script>
    <script src="/Include/2.0.261.778/localhost-1700/Shared/Anduril/JsTransforms/en-us/Scripts.js" language="javascript"></script>
    <script src="msntv:/Javascript/TVShell.js" language="javascript"></script>
    <script src="msntv:/Javascript/GuestUser.js" language="javascript"></script>
    <script src="msntv:/Javascript/ServiceList.js" language="javascript"></script>
    <script language="javascript">
        function handleGuest() {
            if (!GuestUserExists()) {
                InitializeGuestMode();
            	var PersistentProperties = TVShell.Property("Persistent/");

                if (!PersistentProperties) {
                    return;
                }

                PersistentProperties.Add("GuestMode", "Guest");
                PersistentProperties.Save();
                
                AddGuestUser();
		        var signon = TVShell.BuiltinServiceList.Item("SignOn");
        		var panel = TVShell.PanelManager.FocusedPanel;
        		var atLogin = false;
        		if ( signon && panel && panel.Name == "main" )
        		{
			        if ( IsMainPanelOnPage( signon.URL ) ) atLogin = true;
		        }
            }
            if (!atLogin) {
                 GotoSignOn();
            }
        }
    </script>
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
    <DIV id="title">Establish your MSN TV account</DIV>
    <DIV id="main">
        <p>Over the next few pages, you'll establish an account to use on the MSN TV service. The first step is to choose the e-mail address you want to use.</p>
        <p>Choose one of these links:</p>

        <div style="margin: 0; font:bold 18 Segoe; padding: 0; bottom: 8px; position: relative;">
            <table style="margin: 0; padding: 0; border-spacing: 0;">
                <tr style="margin: 0; padding: 0;">
                    <td style="margin: 0; padding: 0; vertical-align: middle;"><img src="msntv:/Shared/Images/BulletCustom.gif" height="14" width="7" alt="Bullet"></td>
                    <td style="margin: 0; padding: 0; width: 4px;"></td>
                    <td style="margin: 0; padding: 0; font:bold 18; line-height: 20px;"><a class="shrLnk2" href="/Register/Register-MSN-email.aspx" style="display: inline-block; line-height: 20px;">I want to create a new minisrv account</a></td>
                </tr>
                <tr style="margin: 0; padding: 0; top: 2px; position: relative;">
                    <td style="margin: 0; padding: 0; vertical-align: middle; top: 2px; position: relative;"><img src="msntv:/Shared/Images/BulletCustom.gif" height="14" width="7" alt="Bullet"></td>
                    <td style="margin: 0; padding: 0; width: 4px;"></td>
                    <td style="margin: 0; padding: 0; font:bold 18; line-height: 20px;"><a class="shrLnk2" href="/Register/Login-to-WebTV.aspx" style="display: inline-block; line-height: 20px;">I want to use my existing minisrv account</a> (TODO)</td>
                </tr>
                <tr style="margin: 0; padding: 0; top: 2px; position: relative;">
                    <td style="margin: 0; padding: 0; vertical-align: middle; top: 2px; position: relative;"><img src="msntv:/Shared/Images/BulletCustom.gif" height="14" width="7" alt="Bullet"></td>
                    <td style="margin: 0; padding: 0; width: 4px;"></td>
                    <td style="margin: 0; padding: 0; font:bold 18; line-height: 20px;"><a class="shrLnk2" onclick="handleGuest()" style="display: inline-block; line-height: 20px;">I want to sign in as a guest</a></td>
                </tr>        
                <tr style="margin: 0; padding: 0; top: 2px; position: relative;">
                    <td style="margin: 0; padding: 0; vertical-align: middle; top: 2px; position: relative;"><img src="msntv:/Shared/Images/BulletCustom.gif" height="14" width="7" alt="Bullet"></td>
                    <td style="margin: 0; padding: 0; width: 4px;"></td>
                    <td style="margin: 0; padding: 0; font:bold 18; line-height: 20px;"><a class="shrLnk2" href="https://headwaiter.trusted.msntv.msn.com/connection/boxcheck.html" style="display: inline-block; line-height: 20px;">I want to start over</a></td>
                </tr>                                              
            </table>
        </div>
    </DIV>
</BODY>
</HTML>`;
