const minisrv_service_file = true;

headers = `Status: 200 OK
Content-type: text/html`;

data = `<HTML xmlns:msntv>
<?import namespace="msntv" implementation="https://sg1.trusted.msntv.msn.com/Include/HTC/Shared/CustomButton.htc">
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
        <p>When using MSNTV2, you can use an existing minisrv account.</p>
        <br>
        <p>Type your existing primary username in the box below:</p>
        <div class="input-container">
            <textarea name="username" id="username" rows="1" cols="15"></textarea>
            <p style="display: inline;">@${minisrv_config.config.domain_name}</p>
        </div>
        <br>
        <div class="input-container">
            <textarea name="password" id="password" rows="1" cols="15"></textarea>
        </div>
        <br>
        If you do not have a password set on your primary user account, you will need to set one up on your WebTV before you can connect it to this MSNTV2.
        After entering your username and password, select the <EM>Continue</EM> Button.
    </DIV>
    <div id="footer">
        <msntv:CustomButton id="continue2" label="Back" href="/Register/Establish-your-MSN-TV-Account.html"/>
        <msntv:CustomButton id="continue" label="Continue" disabled="true" href="/Register/Validate-account.aspx"/>
    </div>
</BODY>
</HTML>`;
