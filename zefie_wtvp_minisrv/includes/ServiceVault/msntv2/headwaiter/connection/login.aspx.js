const minisrv_service_file = true;

// Todo: auth if not guest

headers = `Content-type: text/html`;

if ( session_data && session_data.isRegistered() ) {
data = `<html>
<head>
  <title id="title"></title>
</head>
<body>
  <iframe id="checkmail" style="display:none"></iframe>
  <script language="javascript">

  </script>
</body>
</html>`;
} else {
 data = `<html>
<head>
  <title id="title"></title>
</head>
<body>
  <iframe id="checkmail" style="display:none"></iframe>
  <script language="javascript">
      var tvShell = new ActiveXObject("MSNTV.TVShell");
      var UserManager = tvShell.UserManager;

      var home = "https://sg1.trusted.msntv.msn.com/Home/Home.aspx";
      tvShell.ConnectionManager.ServiceState = 'Authorized';
      UserManager.SetCurrentUserIsAuthorized(true);
      var currentUser = UserManager.CurrentUser;
      if (currentUser != null) {
          currentUser.IsAuthorized = true;
      } 
      var myPanel = tvShell.PanelManager.Item('main');
      if (myPanel) {
          myPanel.ClearTravelLog();
          myPanel.NoBackToMe = true;          
          myPanel.GotoURL(home);
      }
  </script>
</body>
</html>`;
} 