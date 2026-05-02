const minisrv_service_file = true;

let BoxId = request_headers.query.BoxId;
if (Array.isArray(BoxId)) BoxId = BoxId[0];
let clientIp = socket.remoteAddress;
let banned = false;
let sessionId = null;

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
if (session_data) {
  registered = session_data.isRegistered();
  if (registered) {
    username = session_data.getSessionData("subscriber_username") || '';
  }
}

// Current UTC time
const now = new Date();

// Time data object
const timeData = {
    hh: now.getUTCHours(),
    mm: now.getUTCMinutes(),
    ss: now.getUTCSeconds(),
    mo: now.getUTCMonth() + 1, // JS months are 0-based
    dd: now.getUTCDate(),
    yyyy: now.getUTCFullYear()
};

// Timezone mapping (C# tuple → JS array or object)
const timezoneMap = {
    "UTC": {
        standardName: "UTC",
        standardOffset: 0,
        daylightName: "UTC",
        daylightOffset: 0
    }
};

// Destructure like the C# tuple deconstruction
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

headers = `200 OK
Content-type: text/html`

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
      var sink = new ActiveXObject("MSNTV.MultipleEventSink");

      function getIDCRLCode(value) {
        return value & 0xFFFF;
      }

      function isIDCRLErrorCode(value) {
        return (value >>> 16) != 0;
      }
      var email = TVShell.UserManager.EMail;
      var wanProvider = TVShell.ConnectionManager.WANProvider;

      var banned = ${banned}; // JavaScript boolean value
      var registered = ${registered}; // JavaScript boolean value
      var username = "${username}"; // JavaScript string value

      InitializeGuestMode();          
      RemoveGuestUsers();    

      if (!banned) {
          TVShell.AddSecretCode(10000); // sync shit
          TVShell.AddSecretCode(10001); // sync shit
          TVShell.AddSecretCode(10002); // sync shit
          TVShell.AddSecretCode(93288); // Service Select
          TVShell.AddSecretCode(77437); // Spooky Options
          TVShell.AddSecretCode(6145539); // Force Crash
          var entry = TVShell.ServiceList.Add("connection::login");
          entry.URL = "https://headwaiter.trusted.msntv.msn.com/connection/login.aspx?BoxId=${BoxId}";
      }

      function CheckForUser(usernameToCheck) {
        var UserManager = TVShell.UserManager;
	      for (var i=0; i<UserManager.Count; i++) {
		      var user = UserManager.Item(i);
      		if (user == usernameToCheck) {
      			return true;
		      }
        }      
        return false;
      }

      function DoLogin() {  
        var currentUser = TVShell.UserManager.CurrentUser;
        if (currentUser == null) {
          if (banned === true) {
            var url = 'https://sg1.trusted.msntv.msn.com/connection/banned.html';
            var myPanel = TVShell.PanelManager.Item('main');
            if (myPanel) myPanel.GotoURL(url);
          } else {
            if (registered === true) {
              if (!CheckForUser(username)) {
                var user = TVShell.UserManager.AddNew(username);
                if (user) {
                  user.IsPersistent = true;
                }
              }
            }
            SetProgress('Welcome, New User!', 100);
            var myPanel = TVShell.PanelManager.Item('main')
            if (registered === true) {
		          var signon = TVShell.BuiltinServiceList.Item("SignOn");
        		  var panel = TVShell.PanelManager.FocusedPanel;
        		  var atLogin = false;
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
              if (myPanel) myPanel.GotoURL('https://sg1.trusted.msntv.msn.com/register/Establish-your-MSN-TV-Account.html');
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
          var serviceArgs = new Array();
          var ProductionArgs = new Array("msntv.msn.com", "MBI",  0,  0,  
                             "mail.services.live.com", "MBI",  0,  0,
                             "livefilestore.com", "MBI",  0,  0,
                             "messenger.msn.com", "?id=507",  0,  0,
                             "spaces.live.com", "MBI",  0,  0
                              );
          var PPEArgs = new Array();
          var INTArgs = new Array();
          serviceArgs[0] = ProductionArgs;
          serviceArgs[1] = PPEArgs;
          serviceArgs[2] = INTArgs;
          try {
            TVShell.LoginManager.IDCRLInitialize(0);
            TVShell.LoginManager.IDCRLLogonAndAuthToServices(serviceArgs[0]);
          } catch (e) {
            if (window.console) console.log("IDCRL error: " + e.message);
          }
          
          GoToUserCheck(); 
        }
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

      function CheckBoxID() {
        SetProgress("${minisrv_config.config.service_name} [${minisrv_config.config.hide_minisrv_version ? "beta" : minisrv_version_string.replace("zefie's wtv minisrv ","")}] Welcome, ${username != '' ? username : 'Guest'}!", 20);
      }

      function GoToUserCheck() {
        if (banned === true) {
          var url = 'https://headwaiter.trusted.msntv.msn.com/connection/banned.html';
          var myPanel = TVShell.PanelManager.Item('service');
          if (myPanel) myPanel.GotoURL(url);
        } else if (registered) {
          GotoSignOn();
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
        CheckBoxID();
        DoPoptimization();
        DoLogin();
      
        try {
          TVShell.DeviceControl.SetTimeZone(${standardOffset}, "${standardName}", 0, "");
        } catch (e) {
          if (window.console) console.log("SetTimeZone error: " + e.message);
        }
    
        try {
          TVShell.DeviceControl.SetClock(${timeData.hh}, ${timeData.mm}, ${timeData.ss}, ${timeData.mo}, ${timeData.dd}, ${timeData.yyyy});
          TVShell.DeviceControl.ClockSet = true;
        } catch (e) {
          if (window.console) console.log("SetClock error: " + e.message);
        }
       
      }
    } catch (e) {
      if (window.console) console.log("Error in boxcheck: " + e.message);
      
      var myPanel = TVShell ? TVShell.PanelManager.Item('main') : null;
      if (myPanel) myPanel.GotoURL('https://headwaiter.trusted.msntv.msn.com/connection/error.html');
    }
  </script>
</body>
</html>`;