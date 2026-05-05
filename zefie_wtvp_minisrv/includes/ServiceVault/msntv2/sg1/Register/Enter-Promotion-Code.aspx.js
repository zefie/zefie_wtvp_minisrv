const minisrv_service_file = true;

headers = `Status: 200 OK
Content-type: text/html`;

data = `<HTML xmlns:msntv>
<?import namespace="msntv" implementation="/Include/HTC/Shared/CustomButton.htc">
<HEAD>
    <title id="title">Type your Promotion Code</title>
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
            var url = baseUrl + '/Register/Choose-Your-Profile-Picture.aspx';
            var promo = document.getElementById('promo_code').value;
            var parms = 'promo_code=' + encodeURIComponent(promo);
            var myPanel = tvShell.PanelManager.Item('main');
            if (myPanel) {
                myPanel.PostToURL(url, parms);
            }
        }
    </script>
</HEAD>
<BODY width="520" height="388">
    <DIV id="title">Type your Promotion Code</DIV>
    <DIV id="main">
        <p>
            Type your Promotion Code below, and then choose
            <EM>Continue</EM>
            <br><br><br><br>
            <div class="input-container">
                <p style="display: inline; bottom: 4px; right: 39px; position: relative;">Promotion Code:</p>
                <td><input type="text" id="promo_code" class="inputText" name="promo_code" style="right: 29px; position: relative;" maxlength="32" size="15"> </td>
            </div>
        </p>
        <p style="display: inline; left: 76px; position: relative;">Example:</p>
        <p style="display: inline; left: 110px; position: relative;">ABCEAZ82KDKA</p>
        <p>&nbsp;</p>
        <p>One day, certain promotion codes will unlock special features or content on minisrv. But for now, this is just a placeholder page.</p>
    </DIV>
    <div id="footer">
        <msntv:CustomButton id="continue" label="Continue" href="javascript:SubmitForm()" />
    </div>
</BODY>
</HTML>`;
