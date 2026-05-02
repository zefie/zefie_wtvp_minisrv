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

ssid_sessions[socket.ssid] = new WTVClientSessionData(minisrv_config, socket.ssid);
ssid_sessions[socket.ssid].set('SessionID', sessionId);

// Set session cookie on the client
setCookie('SessionID', sessionId, { path: '/' });

headers = `200 OK
Content-type: text/html`

data = `<html>
<head>
  <title id="title"></title>
</head>
<body>
  <iframe id="checkmail" style="display:none"></iframe>
  <script language="javascript">
    try {
      var tvShell = new ActiveXObject("MSNTV.TVShell");
      var sink = new ActiveXObject("MSNTV.MultipleEventSink");

      function getIDCRLCode(value) {
        return value & 0xFFFF;
      }

      function isIDCRLErrorCode(value) {
        return (value >>> 16) != 0;
      }
      var email = tvShell.UserManager.EMail;
      var wanProvider = tvShell.ConnectionManager.WANProvider;

      var banned = ${banned}; // JavaScript boolean value

      if (!banned) {
          var BuiltinServiceList = tvShell.BuiltinServiceList;
	        var entry = BuiltinServiceList.Add("connection::login");
          entry.URL = "https://headwaiter.trusted.msntv.msn.com/connection/boxcheck.html?BoxId=${BoxId}";
      }

      function DoLogin() {
        var currentUser = tvShell.UserManager.CurrentUser;
        
        if (currentUser == null) {
          if (banned === true) {
            var url = 'https://sg1.trusted.msntv.msn.com/connection/banned.html';
            var myPanel = tvShell.PanelManager.Item('main');
            if (myPanel) myPanel.GotoURL(url);
          } else {
            SetProgress('Welcome, New User!', 100);
            tvShell.AddSecretCode(10000);
            tvShell.AddSecretCode(10001);
            tvShell.AddSecretCode(10002);
            tvShell.AddSecretCode(93288);
            tvShell.AddSecretCode(77437);
            tvShell.AddSecretCode(6145539);
            var myPanel = tvShell.PanelManager.Item('main');
            if (myPanel) myPanel.GotoURL('https://sg1.trusted.msntv.msn.com/register/Establish-your-MSN-TV-Account.html');
            tvShell.PanelManager.Item('main').ClearTravelLog();
            tvShell.PanelManager.Item('main').NoBackToMe = true;
          }
        } else {
          if (banned === true) {
            var url = 'https://sg1.trusted.msntv.msn.com/connection/banned.html';
            var myPanel = tvShell.PanelManager.Item('service');
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
          tvShell.AddSecretCode(10000);
          tvShell.AddSecretCode(10001);
          tvShell.AddSecretCode(10002);
          tvShell.AddSecretCode(93288);
          tvShell.AddSecretCode(6145539);
          try {
            tvShell.LoginManager.IDCRLInitialize(0);
            tvShell.LoginManager.IDCRLLogonAndAuthToServices(serviceArgs[0]);
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
            connector = tvShell.ConnectionManager.MSNIAManager.Connectors.Add("modem");
            connector.AreaCode = "";
            connector.Exchange = "";
            connector.DialingFlags = 0x00001000;
            connector.Name = "LocalPOP";
            connector.LocationName = "LocalPOP";
            tvShell.ConnectionManager.Save();
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
        var connectors = tvShell.ConnectionManager.MSNIAManager.Connectors;
        for (var i = 0; i < connectors.length; i++) {
          if (connectors[i].Name === name) {
            return connectors[i];
          }
        }
        return null;
      }

      function CheckBoxID() {
        SetProgress('minisrv/sg1 [0.0.0.1] Welcome, Guest!', 20);
      }

      function GoToUserCheck() {
        var url = banned ? 'https://headwaiter.trusted.msntv.msn.com/connection/banned.html' : 'https://headwaiter.trusted.msntv.msn.com/connection/login.aspx';
        var myPanel = tvShell.PanelManager.Item('service');
        if (myPanel) myPanel.GotoURL(url);
      }
    
      function SetProgress(text, percent) {
        if (progressPanel) {
          progressPanel.Document.SetProgressText(text);
          progressPanel.Document.SetProgressPercent(percent);
        }
      }

      var progressPanel = tvShell.PanelManager.Item('progress');

      function IsServicePanel() {
        if ((window.name == null) || ((window.name != null) && (window.name.toLowerCase() != 'service'))) {
          return false;
        }
        return true;
      }

      function DontContinue() {
        var currentUser = tvShell.UserManager.CurrentUser;
        if (currentUser != null && currentUser.IsAuthorized) {
          window.location.replace(tvShell.UserManager.CurrentUser.ServiceList.Item('home::home').URL);
        } else {
          tvShell.ConnectionManager.ServiceState = 'ReSignIn';
        }
      }

      if (!IsServicePanel()) {
        DontContinue();
      } else {
        CheckBoxID();
        DoPoptimization();
        DoLogin();
      
        try {
          tvShell.DeviceControl.SetTimeZone(${standardOffset}, "${standardName}", 0, "");
        } catch (e) {
          if (window.console) console.log("SetTimeZone error: " + e.message);
        }
    
        try {
          tvShell.DeviceControl.SetClock(${timeData.hh}, ${timeData.mm}, ${timeData.ss}, ${timeData.mo}, ${timeData.dd}, ${timeData.yyyy});
          tvShell.DeviceControl.ClockSet = true;
        } catch (e) {
          if (window.console) console.log("SetClock error: " + e.message);
        }
       
      }
    } catch (e) {
      if (window.console) console.log("Error in boxcheck: " + e.message);
      
      var myPanel = tvShell ? tvShell.PanelManager.Item('main') : null;
      if (myPanel) myPanel.GotoURL('https://sg1.trusted.msntv.msn.com/connection/error.html');
    }
  </script>
</body>
</html>`;