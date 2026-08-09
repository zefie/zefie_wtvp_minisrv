const minisrv_service_file = true;

headers = `Status: 200 OK
Content-type: text/html`;

data = `<HTML xmlns:msntv>
<?import namespace="msntv" implementation="/Include/HTC/Shared/CustomButton.htc">
<HEAD>
    <title id="title">Login to Passport</title>
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
        .input-container {
            margin-left: 50px;
        }
    </STYLE>
    <script>
        function SubmitForm() {
            var tvShell = new ActiveXObject("MSNTV.TVShell");
            var baseUrl = window.location.protocol + "//" + window.location.hostname;
            if (window.location.port) {
                baseUrl += ":" + window.location.port;
            }
            var url = baseUrl + '/Register/Promotion-code.aspx';
            var password = document.getElementById('password').value;
            var parms = 'password=' + encodeURIComponent(password);
            var myPanel = tvShell.PanelManager.Item('main');
            if (myPanel) {
                myPanel.PostToURL(url, parms);
            }
        }
    </script>
</HEAD>
<BODY width="520" height="388">
    <DIV id="title">Password Required</DIV>
    <DIV id="main">
        <p>
            A password is <b>required</b> to create a new account. Please click the Continue button to enter a password.
        </p>
        <p>Type your minisrv password:</p>
        <div>
            <td><input type="password" id="password" class="inputText" name="password" maxlength="32" size="25"> </td>
        </div>
        <br>
    </DIV>
    <div id="footer">
        <msntv:CustomButton id="continue" label="Continue" href="javascript:SubmitForm()" />
    </div>
</BODY>
</HTML>`;
