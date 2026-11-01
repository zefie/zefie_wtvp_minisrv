const minisrv_service_file = true;

headers = `Content-type: text/html`;

data = `<html>
<head>
<title id="title"></title>
</head>
<body>
<iframe id="checkmail" style="display:none"></iframe>
<script language="javascript">
var tvShell = new ActiveXObject("MSNTV.TVShell");
var wanProvider = tvShell.ConnectionManager.WANProvider;
function SetServiceList() {
  var entry;

  // BuiltinServiceList - for main MSN TV services

  tvShell.UserManager.CurrentUser.ServiceList.Clear(); //Always clear the list first to avoid dupes.

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('home::home');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/Pages/Home/Home.aspx';
  entry.KeyCode = 0xAC; // VK_BROWSER_HOME
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('home::bgmusic');
  entry.URL = '}';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('home::backendproxy');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/BackendProxy';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('home::radioplus');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/Stations.xml';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('mail::listmail');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/Pages/Mail/listmail.aspx';
  entry.KeyCode = 0xB4; // VK_LAUNCH_MAIL
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('mail::writemail');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/Pages/Mail/writemail.aspx';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('chat::home');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/Pages/Chat/Chat.html';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('messenger::root');
  entry.URL = 'http://login.live.com:1863';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('messenger::passport');
  entry.URL = 'https://login.live.com';

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('search::search');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/Pages/Search/search.html';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('search::main');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/Pages/Search/categories.html';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('discuss::home');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('maps::main');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('Settings::HomeNetwork');
  entry.URL = 'msntv:/Settings/Network/HomeNetworking.html';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('settings::mainindex');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/settings/main.aspx';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('UAM::UAMbase');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('Photo::Home');
  entry.URL = 'msntv:/Photo/PhotoHome.html';
  entry.Safe = true;

  entry = tvShell.UserManager.CurrentUser.ServiceList.Add('Photos');
  entry.URL = 'msntv:/Photo/PhotoHome.html';
  entry.Safe = true;

  // Add services to ServiceList
  tvShell.ServiceList.Clear();

  entry = tvShell.ServiceList.Add('home::cinemanow');
  entry.URL = 'http://g.msn.com/5TVANDURIL/4000';

  entry = tvShell.ServiceList.Add('msn::radioplus');
  entry.URL = 'http://radio.msn.com/asx/generate';

  entry = tvShell.ServiceList.Add('music::radiohome');
  entry.URL = 'http://radio.msn.com/asx/generate';

  entry = tvShell.ServiceList.Add('msn::musicnews');
  entry.URL = 'http://www.msnbc.msn.com/id/3032433/';

  entry = tvShell.ServiceList.Add('connection::popupcontrol');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/connection/PopupControlWhiteList.ashx';

  entry = tvShell.ServiceList.Add('connection::reconnect');
  entry.URL = 'http://headwaiter.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=Authorize';

  entry = tvShell.ServiceList.Add('connection::nightly_login');
  entry.URL = 'http://headwaiter.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=Nightly';

  entry = tvShell.ServiceList.Add('mail::check');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/apps/connection/CheckMail.aspx?phase=CheckMail&purpose=CheckMail';
  entry.Safe = true;

  if (wanProvider === "MSNIANB") {
    entry = tvShell.ServiceList.Add('home::videoplus');
    entry.URL = 'msntv:/Video/VideoHome.html';
    entry.Safe = true;
  } else {
    entry = tvShell.ServiceList.Add('home::videoplus');
    entry.URL = 'http://sg1.trusted.msntv.msn.com/pages/msnvideo/main';
    entry.Safe = true;
  }

  if (wanProvider === "MSNIANB") {
    entry = tvShell.ServiceList.Add('home::musicvideo');
    entry.URL = 'msntv:/Music/MusicHome.html';
    entry.Safe = true;
  } else {
    entry = tvShell.ServiceList.Add('home::musicvideo');
    entry.URL = 'http://sg1.trusted.msntv.msn.com/pages/msnvideo/main?p=music';
    entry.Safe = true;
  }

  entry = tvShell.ServiceList.Add('connection::resetpassword');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/connection/GatePage?phase=Bootstrap&purpose=ResetPassword';

  entry = tvShell.ServiceList.Add('connection::pagepatch');
  entry.URL = 'http://sg1.trusted.msntv.msn.com/connection/PagePatch.ashx';

  entry = tvShell.ServiceList.Add('connection::login');
  entry.URL = 'http://headwaiter.trusted.msntv.msn.com/connection/GatePage.aspx?phase=Bootstrap&purpose=Authorize';
  entry.Description = '${minisrv_config.config.service_name}/sg1 [${minisrv_config.config.hide_minisrv_version ? "beta" : minisrv_version_string.replace("zefie's wtv minisrv ","")}]';

  entry = tvShell.ServiceList.Add('ctags::main');
  entry.URL = 'http://c.msn.com/c.gif?di=1455&pi=68206&tp=http%3a%2f%2fmsntv.msn.com%2fclient%2f';
  tvShell.ServiceList.Save();
}

function IsServicePanel() {
  if ((window.name == null) || ((window.name != null) && (window.name.toLowerCase() != 'service'))) {
    return false;
  }
  return true;
}

function DontContinue() {
  var currentUser = tvShell.UserManager.CurrentUser;
  if (currentUser != null && currentUser.IsAuthorized) {
    tvShell.PanelManager.Item('main').GotoURL(tvShell.UserManager.CurrentUser.ServiceList.Item('home::home').URL);
    tvShell.PanelManager.Item('main').ClearTravelLog();
    tvShell.PanelManager.Item('main').NoBackToMe = true;
    } else {
    tvShell.ConnectionManager.ServiceState = 'ReSignIn';
  }
}

if (!IsServicePanel()) {
  DontContinue();
} else {
  SetServiceList();

  tvShell.UserManager.SetCurrentUserIsAuthorized(true);
  tvShell.ConnectionManager.ServiceState = 'Authorized';
  var dt = new Date();
  tvShell.UserManager.LastLoginTime = dt.getTime() / 1000 + dt.getTimezoneOffset() * 60;
  tvShell.UserManager.OfflineAppMaxAccessDays = 20;
  tvShell.UserManager.OfflineAppMaxAccessTimes = 20;
  tvShell.UserManager.Save();
  tvShell.PanelManager.Item('main').GotoURL(tvShell.UserManager.CurrentUser.ServiceList.Item('home::home').URL);
  tvShell.PanelManager.Item('main').ClearTravelLog();
  tvShell.PanelManager.Item('main').NoBackToMe = true;
}
</script>
</body>
</html>`;
