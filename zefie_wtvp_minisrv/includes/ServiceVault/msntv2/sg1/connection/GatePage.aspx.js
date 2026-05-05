const minisrv_service_file = true;

// Get the phase parameter from the query string
let phase = request_headers.query.phase;
if (Array.isArray(phase)) phase = phase[0];

let BoxId = request_headers.query.BoxId;
if (Array.isArray(BoxId)) BoxId = BoxId[0];
let clientIp = socket.remoteAddress;
let banned = false;
let sessionId = null;
ServiceDomain = minisrv_config.config.domain_name;

// Use the shared MSNTV2 helper injected by WTV-MSNTV2 VM context.
if (BoxId) {
    if (!BoxId || BoxId.length != 20 || !/^\d+$/.test(BoxId))
    {
        console.warn("Invalid BoxId format "+BoxId+" from "+clientIp);
        banned = true;
    } else {
        sessionId = encodeSessionID(BoxId);
    }
} else if (request_headers.cookie && request_headers.cookie.SessionID) {
    BoxID = decodeSessionID(request_headers.cookie.SessionID);
    sessionId = request_headers.cookie.SessionID;
} else {
    console.warn("No BoxId provided by client "+clientIp);
    banned = true;
}

if (!sessionId && !banned) {
    banned = true;
}

if (!session_data && BoxId) {
    console.log("Missing session_data for BoxId %s", BoxId);
}

let registered = false;
let username = '';
let Profile_Picture
if (session_data) {
    registered = session_data.isRegistered();
    if (registered) {
        username = session_data.getSessionData("subscriber_username") || '';
        Profile_Picture = session_data.getSessionData('ProfilePicture') || '';
    }
}

// Current UTC time
const now = new Date();

const timeData = {
    hh: now.getUTCHours(),
    mm: now.getUTCMinutes(),
    ss: now.getUTCSeconds(),
    mo: now.getUTCMonth() + 1,
    dd: now.getUTCDate(),
    yyyy: now.getUTCFullYear()
};

const timezoneMap = {
    "UTC": {
        standardName: "UTC",
        standardOffset: 0,
        daylightName: "UTC",
        daylightOffset: 0
    }
};

const {
    standardName,
    standardOffset,
    daylightName,
    daylightOffset
} = timezoneMap["UTC"];

// Set session cookie on the client
if (sessionId) {
    setCookie('SessionID', sessionId, { path: '/' });
}

// Handle different phases
switch (phase) {
    case "Bootstrap":
        headers = `200 OK
        Content-type: text/html`;

        data = `<HTML>
        <HEAD>
        <title id="title"></title>
        </HEAD>
        <body>
        <iframe id=checkmail style="display:none"></iframe>
        <script language="javascript">
        var TVShell = new ActiveXObject("MSNTV.TVShell");
        function IsNightlyEnabled() {
            var taskScheduler = TVShell.TaskScheduler;
            var updateTask = null;
            for (var i = 0; ((i < taskScheduler.Count) && (updateTask == null)); i++) {
                if (taskScheduler.Item(i).Caller == 'NightlyUpdate') {
                    updateTask = taskScheduler.Item(i);
                }
            }
            if (updateTask != null) {
                return(true);
            }
            else {
                return(false);
            }
        }
        function GotoBoxCheck() {
            var url = 'https://sg1.trusted.msntv.msn.com/connection/GatePage.aspx?phase=BoxCheck&purpose=Authorize';
            var parms='';
            parms += 'BoxId=' + TVShell.SystemInfo.BoxIDService + '&';
            parms += 'WANProvider=' + TVShell.ConnectionManager.WANProvider + '&';
            parms += 'version=' + encodeURIComponent(TVShell.SystemInfo.LastVersion) + '&';
            if ((TVShell.ConnectionManager.MSNIAManager != null) && (TVShell.ConnectionManager.MSNIAManager.CurrentConnector != null)) parms += 'ConnectorName=' + encodeURIComponent(TVShell.ConnectionManager.MSNIAManager.CurrentConnector.Name) + '&';
            if (TVShell.UserManager.CurrentUser != null) parms += 'domain=' + encodeURIComponent(TVShell.UserManager.CurrentUser.Domain) + '&';
            parms += 'NumRedirects=0&';
            parms += 'NightlyEnabled=' + IsNightlyEnabled() + '&';
            parms += 'x=y';
            var myPanel = TVShell.PanelManager.Item('service');
            if (myPanel) myPanel.PostToURL(url, parms);
        }
        var progressPanel = TVShell.PanelManager.Item('progress');
        function SetProgress(text, percent) {
            if (progressPanel) {
                progressPanel.Document.SetProgressText(text);
                progressPanel.Document.SetProgressPercent(percent);
            }
        }
        function IsServicePanel() {
            if ((window.name == null) || ((window.name != null) && (window.name.toLowerCase() != 'service'))) {
                return(false);
            }
            return(true);
        }
        function DontContinue() {
            var currentUser = TVShell.UserManager.CurrentUser;
            if (currentUser != null && currentUser.IsAuthorized) {
                window.location.replace(TVShell.UserManager.CurrentUser.ServiceList.Item('home::home').URL);
            }
            else {
                TVShell.ConnectionManager.ServiceState = 'ReSignIn';
            }
        }
        if (!IsServicePanel()) {
            DontContinue();
        }
        else {
            TVShell.MeteringManager.Stop();
            SetProgress('Please wait while we sign you into MSN TV.', 10);
            GotoBoxCheck();
        }
        </script>
        </body>
        </HTML>`;
        break;

    case "BoxCheck":

    headers = `200 OK
    Content-type: text/html`;

    data = `<html>
    <head>
    <title id="title"></title>
    </head>
    <body>
    <iframe id="checkmail" style="display:none"></iframe>
    <script src="msntv:/Javascript/TVShell.js" language="javascript"></script>
    <script src="msntv:/Javascript/ServiceList.js" language="javascript"></script>
    <script src="msntv:/Javascript/GuestUser.js" language="javascript"></script>
    <script language="javascript">
    try {
        var TVShell = new ActiveXObject("MSNTV.TVShell");
        var Sink = new ActiveXObject("MSNTV.MultipleEventSink");
        var email = TVShell.UserManager.EMail;
        var wanProvider = TVShell.ConnectionManager.WANProvider;

        var banned = ${banned};
        var registered = ${registered};
        var username = "${username}";
        var picture = "${Profile_Picture}";
        var ServiceDomain = "${ServiceDomain}";
        var MSNTVToken = "";
        var serviceArgs = new Array();
        var ProductionArgs = new Array("msntv.msn.com", "MBI",  0,  0,
                                       "mail.services.live.com", "MBI",  0,  0,
                                       "livefilestore.com", "MBI",  0,  0,
                                       "messenger.msn.com", "?id=507",  0,  0,
                                       "spaces.live.com", "MBI",  0,  0
        );
        serviceArgs[0] = ProductionArgs;

        if (!banned) {
            // DEBUG ONLY! USE WITH CAUTION!
            TVShell.AddSecretCode(10000);   // Power-on for nightly update
            TVShell.AddSecretCode(10001);   // Power-on for nightly email check at anchor time
            TVShell.AddSecretCode(10002);   // Power-on for nightly email check at non-anchor time
            TVShell.AddSecretCode(77437);   // spooky dialing options
            TVShell.AddSecretCode(93288);   // Service Selection Page
            TVShell.AddSecretCode(6145539); // crash the system
            TVShell.AddSecretCode(3932397); // update loop test
        }

        function isIDCRLErrorCode( theCode )
        {
            // when high bit is set, it is an error
            if ( theCode & 0x80000000 )
                return true;

            return false;
        }

        function getIDCRLCode( theCode )
        {
            return (theCode & 0xFF);
        }

        /*
        function CheckForUser(usernameToCheck) {
            var UserManager = TVShell.UserManager;
            for (var i=0; i<UserManager.Count; i++) {
                var user = UserManager.Item(i);
                if (user == usernameToCheck) {
                    return true;
                }
            }
            return false;
        }*/

        function DoLogin() {
            var currentUser = TVShell.UserManager.CurrentUser;
            if (currentUser == null) {
                if (banned === true) {
                    var url = 'https://sg1.trusted.msntv.msn.com/connection/banned.html';
                    var myPanel = TVShell.PanelManager.Item('main');
                    if (myPanel) myPanel.GotoURL(url);
                } else {
                    if (registered === true) {
                        var user = TVShell.UserManager.AddNew(username + '@' + ServiceDomain);
                        if (user) {
                            var useroptions = UserManager.Item(username + '@' + ServiceDomain);
                            useroptions.IsPersistent = true;
                            //user.setAttribute("GuestUser", false);
                            useroptions.LargeIcon = "msntv:/SignInPics/big/"+ picture + ".png";
                            useroptions.SmallIcon = "msntv:/SignInPics/small/"+ picture + ".gif";
                            TVShell.UserManager.Save();
                        }
                    }
                    var myPanel = TVShell.PanelManager.Item('main')
                    if (registered === true) {
                        entry = TVShell.ServiceList.Add('connection::login');
                        entry.URL = 'https://sg1.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=Authorize';
                        entry.Description = '${minisrv_config.config.service_name}/sg1 [${minisrv_config.config.hide_minisrv_version ? "beta" : minisrv_version_string.replace("zefie's wtv minisrv ","")}]';
                        TVShell.ServiceList.Save();
                        var signon = TVShell.BuiltinServiceList.Item("SignOn");
                        var panel = TVShell.PanelManager.FocusedPanel;
                        var atLogin = false;
                        TVShell.ConnectionManager.ServiceState = 'ReSignIn';
                        if ( signon && panel && panel.Name == "main" )
                        {
                            if ( IsMainPanelOnPage( signon.URL ) ) atLogin = true;
                        }
                        if (!atLogin) {
                            myPanel.ClearTravelLog();
                            myPanel.NoBackToMe = true;
                            GotoSignOn();
                        }
                    } else {
                        if (myPanel) myPanel.GotoURL('https://sg1.trusted.msntv.msn.com/Register/Establish-your-MSN-TV-Account.html');
                    }
                    if (myPanel) {
                        myPanel.ClearTravelLog();
                        myPanel.NoBackToMe = true;
                    }
                }
            } else {
                if (banned === true) {
                    var url = 'https://sg1.trusted.msntv.msn.com/connection/banned.html';
                    var myPanel = TVShell.PanelManager.Item('service');
                    if (myPanel) myPanel.GotoURL(url);
                }
            }

            if (currentUser != null) {
                // Check if We can do IDCRL if not fall back to Legacy XMLlogin
                if (TVShell.LoginManager.IDCRLInitialize) {
                    DoIDCRLLogin();
                } else {
                    // Non IDCRL Auth Code (Pre 5.x)
                    Sink.AttachEvent(TVShell.LoginManager, 'OnLoginResult', OnLoginResult);
                    TVShell.LoginManager.PassportSiteIDs = '507';
                    TVShell.LoginManager.LoginURL = "https://login.live.com/ppsecure/clientpost.srf";
                    TVShell.LoginManager.LogoutURL = "https://login.live.com/ppsecure/logoutxml.srf";
                    TVShell.LoginManager.ResetPasswordURL = "https://login.live.com/ppsecure/MSRV_ResetPW_ClientPost.srf";
                    TVShell.LoginManager.ChangePasswordURL = "https://login.live.com/ppsecure/MSRV_ChangePW_ClientPost.srf";
                    TVShell.LoginManager.RequestProfileURL = "https://login.live.com/ppsecure/ClientProfileRequest.srf";
                    TVShell.LoginManager.UpdateProfileURL = "https://login.live.com/ClientEditProf.srf";
                    TVShell.LoginManager.Authenticate(email, "", "https://login.live.com/ppsecure/clientpost.srf");
                }
            }
        }

        function OnLoginResult(hr,t,p)
        {
            MSNTVToken = t;
            GoToUserCheck();
        }

        function DoIDCRLLogin()
        {
            try {
                TVShell.LoginManager.IDCRLInitialize(0);
                Sink.AttachEvent(TVShell.LoginManager, "IDCRLOnAuthStateChanged",IDCRLOnAuthStateChanged);
                TVShell.LoginManager.IDCRLLogonAndAuthToServices(serviceArgs[0]);
            } catch (e) {
                TVShell.EventLog.Important("IDCRL error: " + e.message);
            }
        }

        function IDCRLOnAuthStateChanged(result, authState, requestStatus, user, serviceTarget, servicePolicy, token, webFlowUrl)
        {
            // Find the matching policy in ProductionArgs for this serviceTarget
            var expectedPolicy = "";
            for(var i = 0; i < ProductionArgs.length; i++) {
                if(ProductionArgs[i] == serviceTarget && i+1 < ProductionArgs.length) {
                    expectedPolicy = ProductionArgs[i+1];
                    break;
                }
            }

            // Now check with the correctly matched policy
            if(TVShell.UserManager.CurrentUser.EMail != user ||
                ProductionArgs[0] != serviceTarget ||
                expectedPolicy != servicePolicy ||
                (isIDCRLErrorCode(authState) || getIDCRLCode(authState) != 0x03) ||
                (isIDCRLErrorCode(requestStatus) || getIDCRLCode(requestStatus) != 0x00)) {
            return;
                }

                if (token != ""){
                    var tIndex = token.indexOf("t=");
                    var pIndex = token.indexOf("&p=");
                    // make sure there is only the "t" token exists, this is for RPS compact ticket
                    // it is possible that compact ticket contains empty p parameter.
                    MSNTVToken = token;
                    GoToUserCheck();
                }
                else
                    TVShell.EventLog.Important("No token");
        }

        function DoPoptimization() {
            if (wanProvider === "MSNIANB") {
                var connector = GetConnectorByName("LocalPOP");
                if (connector == null) {
                    connector = TVShell.ConnectionManager.MSNIAManager.Connectors.Add("modem");
                    connector.AreaCode = "";
                    connector.Exchange = "";
                    connector.DialingFlags = 0x00001000;
                    connector.Name = "LocalPOP";
                    connector.LocationName = "LocalPOP";
                    TVShell.ConnectionManager.Save();
                    connector.Poptimize("0", connector.AreaCode, connector.Exchange);
                }

                if (connector.Phonebook == null || connector.Phonebook.length === 0) {
                    if (connector.AreaCode && connector.Exchange) {
                        connector.Poptimize(connector.AreaCode, connector.Exchange);
                    }
                }
            }
        }

        function GetConnectorByName(name) {
            var connectors = TVShell.ConnectionManager.MSNIAManager.Connectors;
            for (var i = 0; i < connectors.length; i++) {
                if (connectors[i].Name === name) {
                    return connectors[i];
                }
            }
            return null;
        }

        function GoToUserCheck() {
            if (banned === true) {
                var url = 'https://sg1.trusted.msntv.msn.com/connection/banned.html';
                var myPanel = TVShell.PanelManager.Item('service');
                if (myPanel) myPanel.GotoURL(url);
            } else if (registered) {
                var url = 'https://sg1.trusted.msntv.msn.com/connection/GatePage.aspx?phase=UserCheck&purpose=Authorize&t=' + MSNTVToken ;
                var myPanel = TVShell.PanelManager.Item('service');
                if (myPanel) myPanel.GotoURL(url);
            }
        }

        function SetProgress(text, percent) {
            if (progressPanel) {
                progressPanel.Document.SetProgressText(text);
                progressPanel.Document.SetProgressPercent(percent);
            }
        }

        var progressPanel = TVShell.PanelManager.Item('progress');

        function IsServicePanel() {
            if ((window.name == null) || ((window.name != null) && (window.name.toLowerCase() != 'service'))) {
                return false;
            }
            return true;
        }

        function DontContinue() {
            var currentUser = TVShell.UserManager.CurrentUser;
            if (currentUser != null && currentUser.IsAuthorized) {
                window.location.replace(TVShell.UserManager.CurrentUser.ServiceList.Item('home::home').URL);
            } else {
                TVShell.ConnectionManager.ServiceState = 'ReSignIn';
            }
        }

        if (!IsServicePanel()) {
            DontContinue();
        } else {
            DoPoptimization();
            DoLogin();

            try {
                TVShell.DeviceControl.SetTimeZone(${standardOffset}, "${standardName}", 0, "");
            } catch (e) {
                TVShell.EventLog.Important("SetTimeZone error: " + e.message);
            }

            try {
                TVShell.DeviceControl.SetClock(${timeData.hh}, ${timeData.mm}, ${timeData.ss}, ${timeData.mo}, ${timeData.dd}, ${timeData.yyyy});
            } catch (e) {
                TVShell.EventLog.Important("SetClock error: " + e.message);
            }

        }
    } catch (e) {
        TVShell.EventLog.Important("Error in boxcheck: " + e.message);
    }
    </script>
    </body>
    </html>`;
    break;

    case "UserCheck":
        headers = `Content-type: text/html`;

        // Check if the msntv.msn.com token is correct TODO

        data = `<html>
        <head>
        <title id="title"></title>
        </head>
        <body>
        <iframe id="checkmail" style="display:none"></iframe>
        <script language="javascript">
        var TVShell = new ActiveXObject("MSNTV.TVShell");
        var wanProvider = TVShell.ConnectionManager.WANProvider;
        function SetServiceList() {
            var entry;

            // BuiltinServiceList - for main MSN TV services

            TVShell.UserManager.CurrentUser.ServiceList.Clear(); //Always clear the list first to avoid dupes.

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('help::help');
            entry.URL = 'http://sg1.msntv.msn.com/health/Help.aspx';
            entry.KeyCode = 0xAC; // VK_BROWSER_HOME
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('home::home');
            entry.URL = 'http://sg1.trusted.msntv.msn.com/Home/Home.aspx?WANProvider=' + wanProvider;
            entry.KeyCode = 0xAC; // VK_BROWSER_HOME
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('home::bgmusic');
            entry.URL = '';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('home::backendproxy');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/BackendProxy';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('home::radioplus');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/Stations.xml';
            entry.Safe = true;

            entry = TVShell.ServiceList.Add('music::radiohome');
            entry.URL = 'http://msntv.msn.com/pages/radio/home.aspx';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Livefilestore::AuthServer');
            entry.URL = 'livefilestore.com';
            entry.Description = 'MBI'
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Skydrive::AuthServer');
            entry.URL = 'favorites.live.com';
            entry.Description = 'MBI'

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Skydrive::Browse');
            // entry.URL = 'users.storage.live.com';
            entry.URL = 'favorites.msn.com';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Skydrive::AppId');
            entry.Description = '1'

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Skydrive::ApiServer');
            entry.URL = 'api.live.net';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('onlinestorage::root');
            entry.URL = 'https://livefilestore/onlinestorage/';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Favorites::RoamingServer');
            entry.URL = 'https://livefilestore.com/onlinestorage/';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Favorites::Migration');
            entry.URL = 'https://livefilestore.com/onlinestorage/';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Favorites::SyncServer');
            entry.URL = 'https://livefilestore.com/onlinestorage/';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('onlinestorage::authServer');
            entry.URL = 'http://77.68.90.130/';
            entry.Description = 'MBI'
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('mail::listmail');
            entry.URL = 'http://mail-sgN.msntv.msn.com/apps/mail/listmail.aspx';
            entry.KeyCode = 0xB4; // VK_LAUNCH_MAIL
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('mail::writemail');
            entry.URL = 'http://mail-sg1.trusted.msntv.msn.com/apps/mail/writemail.aspx';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('chat::home');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/Pages/Chat/Chat.aspx';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('chat::ServiceTarget');
            entry.URL = 'chat.msn.com';
            entry.Description = '?id=2260'
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('messenger::root');
            entry.URL = 'http://ms.msgrsvcs.ctsrv.gay:1863';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('messenger::passport');
            entry.URL = 'https://login.live.com/messenger';

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('messenger::ServiceTarget');
            entry.URL = 'messenger.msn.com';

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('search::search');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/Pages/Search/search.html';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('search::main');
            entry.URL = 'https://sg1.msntv.msn.com/search/Search.aspx';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('discuss::home');
            entry.URL = 'http://sg1.msntv.msn.com/apps/discuss/DiscussLobby.aspx';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('maps::main');
            entry.URL = 'https://sg1.msntv.msn.com/apps/maps/GetMap.aspx';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Settings::HomeNetwork');
            entry.URL = 'msntv:/Settings/Network/HomeNetworking.html';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('settings::mainindex');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/apps/settings/MainIndex.aspx';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('UAM::UAMbase');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/apps/uam/pages/settings.aspx';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Photo::Home');
            entry.URL = 'msntv:/Photo/PhotoHome.html';
            entry.Safe = true;

            entry = TVShell.UserManager.CurrentUser.ServiceList.Add('Photos');
            entry.URL = 'msntv:/Photo/PhotoHome.html';
            entry.Safe = true;

            // Add services to ServiceList
            TVShell.ServiceList.Clear();

            entry = TVShell.ServiceList.Add('home::cinemanow');
            entry.URL = 'http://g.msn.com/5TVANDURIL/4000';

            entry = TVShell.ServiceList.Add('msn::radioplus');
            entry.URL = 'http://radio.msn.com/asx/generate';

            entry = TVShell.ServiceList.Add('msn::musicnews');
            entry.URL = 'http://www.msnbc.msn.com/id/3032433/';

            entry = TVShell.ServiceList.Add('connection::popupcontrol');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/connection/PopupControlWhiteList.ashx';

            entry = TVShell.ServiceList.Add('connection::reconnect');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=ReAuthorize';

            entry = TVShell.ServiceList.Add('connection::nightly_login');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=Nightly';

            entry = TVShell.ServiceList.Add('mail::check');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/apps/connection/CheckMail.aspx?phase=CheckMail&purpose=CheckMail';
            entry.Safe = true;

            if (wanProvider === "BYOA") {
                entry = TVShell.ServiceList.Add('home::videoplus');
                entry.URL = 'http://msntv.msn.com/pages/msnvideo/main.aspx';
                entry.Safe = true;
            }

            if (wanProvider === "BYOA") {
                entry = TVShell.ServiceList.Add('home::musicvideo');
                entry.URL = 'http://msntv.msn.com/pages/msnvideo/main.aspx?p=music';
                entry.Safe = true;
            }

            entry = TVShell.ServiceList.Add('connection::resetpassword');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=ResetPassword';

            entry = TVShell.ServiceList.Add('connection::pagepatch');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/connection/PagePatch.ashx';

            entry = TVShell.ServiceList.Add('connection::login');
            entry.URL = 'https://sg1.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=Authorize';
            entry.Description = '${minisrv_config.config.service_name}/sg1 [${minisrv_config.config.hide_minisrv_version ? "beta" : minisrv_version_string.replace("zefie's wtv minisrv ","")}]';

            entry = TVShell.ServiceList.Add('ctags::main');
            entry.URL = 'http://c.msn.com/c.gif?di=1455&pi=68206&tp=http%3a%2f%2fmsntv.msn.com%2fclient%2f';
            TVShell.ServiceList.Save();
}

function IsServicePanel() {
    if ((window.name == null) || ((window.name != null) && (window.name.toLowerCase() != 'service'))) {
        return false;
    }
    return true;
}

function DontContinue() {
    var currentUser = TVShell.UserManager.CurrentUser;
    if (currentUser != null && currentUser.IsAuthorized) {
        TVShell.PanelManager.Item('main').GotoURL(TVShell.UserManager.CurrentUser.ServiceList.Item('home::home').URL);
        TVShell.PanelManager.Item('main').ClearTravelLog();
        TVShell.PanelManager.Item('main').NoBackToMe = true;
    } else {
        TVShell.ConnectionManager.ServiceState = 'ReSignIn';
    }
}

if (!IsServicePanel()) {
    DontContinue();
} else {
    SetServiceList();

    TVShell.UserManager.SetCurrentUserIsAuthorized(true);
    TVShell.ConnectionManager.ServiceState = 'Authorized';
    var dt = new Date();
    TVShell.UserManager.LastLoginTime = dt.getTime() / 1000 + dt.getTimezoneOffset() * 60;
    TVShell.UserManager.OfflineAppMaxAccessDays = 20;
    TVShell.UserManager.OfflineAppMaxAccessTimes = 20;
    TVShell.UserManager.Save();
    TVShell.PanelManager.Item('main').GotoURL(TVShell.UserManager.CurrentUser.ServiceList.Item('home::home').URL);
    TVShell.PanelManager.Item('main').ClearTravelLog();
    TVShell.PanelManager.Item('main').NoBackToMe = true;
}
</script>
</body>
</html>`;
break;

default:
headers = `200 OK
Content-type: text/html`;

data = `<HTML>
<HEAD>
<title id="title"></title>
</HEAD>
</HTML>`;
break;
}
