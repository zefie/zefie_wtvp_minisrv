const minisrv_service_file = true;

headers = `200 OK
Content-type: text/html`;

data = `<HTML>
  <HEAD>
   <title id="title"></title>
  </HEAD>
  <body>
   <iframe id=checkmail style="display:none"></iframe>
   <script language="javascript">
    var tvShell = new ActiveXObject("MSNTV.TVShell");
 function IsNightlyEnabled() {
     var taskScheduler = tvShell.TaskScheduler;
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
     parms += 'BoxId=' + tvShell.SystemInfo.BoxIDService + '&';
     parms += 'WANProvider=' + tvShell.ConnectionManager.WANProvider + '&';
     parms += 'version=' + encodeURIComponent(tvShell.SystemInfo.LastVersion) + '&';
     if ((tvShell.ConnectionManager.MSNIAManager != null) && (tvShell.ConnectionManager.MSNIAManager.CurrentConnector != null)) parms += 'ConnectorName=' + encodeURIComponent(tvShell.ConnectionManager.MSNIAManager.CurrentConnector.Name) + '&';
     if (tvShell.UserManager.CurrentUser != null) parms += 'domain=' + encodeURIComponent(tvShell.UserManager.CurrentUser.Domain) + '&';
     parms += 'NumRedirects=0&';
     parms += 'NightlyEnabled=' + IsNightlyEnabled() + '&';
     parms += 'x=y';
     var myPanel = tvShell.PanelManager.Item('service');
     if (myPanel) myPanel.PostToURL(url, parms);
 }
 var progressPanel = tvShell.PanelManager.Item('progress');
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
     var currentUser = tvShell.UserManager.CurrentUser;
     if (currentUser != null && currentUser.IsAuthorized) {
         window.location.replace(tvShell.UserManager.CurrentUser.ServiceList.Item('home::home').URL);
     }
     else {
         tvShell.ConnectionManager.ServiceState = 'ReSignIn';
     }
 }
 if (!IsServicePanel()) {
     DontContinue();
 }
 else {
     tvShell.MeteringManager.Stop();
     SetProgress('Please wait while we sign you into MSN TV.', 10);
     GotoBoxCheck();
 }
   </script>
  </body>
 </HTML>
`;
