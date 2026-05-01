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
            var email = document.getElementById('email').value;
            var password = document.getElementById('password').value;
            var parms = 'email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password);
            var myPanel = tvShell.PanelManager.Item('main');
            if (myPanel) {
                myPanel.PostToURL(url, parms);
            }
        }
    </script>
</HEAD>
<BODY width="520" height="388">
    <DIV id="title">Creating an minisrv account</DIV>
    <DIV id="main">
        <p>
            When using MSNTV2, you'll be using a minisrv account to sign in.
			If you already have a minisrv account with a MSNTV, you can
            use it with MSNTV2. If not, you can create a new one for use with MSNTV2 here.
        </p>
        <p>Type your minisrv username:</p>
        <div class="input-container">
            <td><input type="text" id="email" class="inputText" name="email" maxlength="32" size="25"> </td>
            <p style="display: inline; bottom: 4px; position: relative;">@${minisrv_config.config.service_name}</p>
        </div>
        <br>
        <p>Next, enter a password:</p>
        <div class="input-container">
            <td><input type="password" id="password" class="inputText" name="password" maxlength="32" size="25"> </td>
        </div>
        <br>
        <p>If you have a minisrv account already, hit the <EM>Back</EM> button on your keyboard and choose <i>I want to use my existing minisrv account</i>.</p>
    </DIV>
    <div id="footer">
        <msntv:CustomButton id="continue" label="Continue" href="javascript:SubmitForm()" />
    </div>
</BODY>
</HTML>`;
