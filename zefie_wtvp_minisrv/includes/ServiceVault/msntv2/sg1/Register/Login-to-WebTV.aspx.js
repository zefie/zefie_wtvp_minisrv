const minisrv_service_file = true;

headers = `Status: 200 OK
Content-type: text/html`;

data = `<HTML xmlns:msntv>
<?import namespace="msntv" implementation="HTC/Shared/CustomButton.htc">
<HEAD>
    <title id="title">Learning to use the keyboard</title>
    <meta name="vs_targetSchema" content="http://schemas.microsoft.com/intellisense/ie5">
    <link rel="stylesheet" type="text/css" href="msntv:/Registration/css/Registration.css">
    <STYLE>
        body {
            background-image: url(msntv:/Registration/images/bgimage.jpg);
            background-color: #23B3DF;
        }
        #main td {
            display: flex;
            align-items: center;
            padding-bottom: 9px;
            padding-right: 0px;
        }
        .input-container {
            margin-left: 50px;
        }
        .Back {
            position: absolute;
            left: 50px;
        }
    </STYLE>
</HEAD>
<BODY width="520" height="388">
    <DIV id="title">Logging into your account</DIV>
    <DIV id="main">
        <p>When using MSN TV, you will be using your webtv.net account
to sign in. If you already have a email to WebTV, you can
use it with MSN TV. If not, you will have to use a Hotmail or MSN address.</p>
        <br>
        <p>Type your WebTV e-mail in the box below:</p>
        <div class="input-container">
            <textarea name="textarea1" id="textarea1" rows="1" cols="15"></textarea>
            <p style="display: inline;">@webtv.net</p>
        </div>
        <br>
        <a>If you don't have a WebTV account, select the <EM>Back</EM> Button.</a>
    </DIV>
    <div id="footer">
        <msntv:CustomButton id="continue" label="Continue" href="/Register/ConnectionType.aspx"/>
    </div>
    <div id="Back">
        <msntv:CustomButton id="continue2" label="Back" href="/Register/ConnectionType.aspx"/>
    </div>
</BODY>
</HTML>`;
