const minisrv_service_file = true;
let promoCode = request_headers.query.promo_code || '';
if (Array.isArray(promoCode)) promoCode = promoCode[0];
if (promoCode) {
    if (minisrv_config.services[service_name] && minisrv_config.services[service_name].validPromoCodes && minisrv_config.services[service_name].validPromoCodes.includes(promoCode)) {
        console.log('Valid promo code entered: %s', promoCode);
    } else {
        console.warn('Invalid promo code entered: %s', promoCode);
        promoCode = '';
    }
    setCookie('promo_code', promoCode, { path: '/' });
    session_data.set('promo_code', promoCode);
}

headers = `Status: 200 OK
Content-type: text/html`;

data = `<html xmlns:msntv>
<head>
    <meta name="vs_targetSchema" content="http://schemas.microsoft.com/intellisense/ie5">
    <title id="title">Change your Profile Picture</title>

    <script LANGUAGE="Javascript" src="Javascript/TVShell.js"></script>
    <script LANGUAGE="Javascript" src="Javascript/MSNTVService.js"></script>

    <?import namespace="msntv" implementation="/Include/HTC/Shared/LoopingDIV.htc">
    <link rel="stylesheet" type="text/css" href="msntv:/Registration/css/Registration.css">

    <STYLE>
        .arrow {
            width: 8px;
            height: 11px;
            border: 0;
            vertical-align: middle;
        }
    </STYLE>

    <script>
        var tvShell = new ActiveXObject("MSNTV.TVShell");

        function SubmitForm() {
            var baseUrl = window.location.protocol + "//" + window.location.hostname;
            if (window.location.port) {
                baseUrl += ":" + window.location.port;
            }
            var url = baseUrl + '/Register/Established-Account.aspx';
            var parms = 'BoxID=' + tvShell.SystemInfo.BoxIDService + '&ProfilePicture=' + currentTile;

            var myPanel = tvShell.PanelManager.Item('main');
            if (myPanel) {
                myPanel.GotoURL(url + '?' + parms);
            }
        }

        var nIcons;
        var ImgURL = [];
        var currentTile = "";

        function GetImagePath(tile) {
            return "msntv:/SignInPics/Big/" + tile + ".png";
        }

        function SetCurrentTile(tile) {
            currentTile = tile;
        }

        ImgURL = [
            "tile01", "tile02", "tile03", "tile04", "tile05", "tile06",
            "tile07", "tile08", "tile09", "tile10", "tile11", "tile12",
            "tile13", "tile14", "tile15", "tile16", "tile17", "tile18",
            "tile19", "tile20", "tile21", "tile22"
        ];

        var ImgObjs = new Array(nIcons);
        nIcons = ImgURL.length;

        for (var i = 0; i < nIcons; i++) {
            ImgObjs[i] = new Image();
            ImgObjs[i].src = GetImagePath(ImgURL[i]);
        }

        function initIcons() {
            var navbar = document.getElementById("navbar");
            if (!navbar) {
                if (window.console) console.log("Navbar element not found!");
                return;
            }

            var dq = '"';
            for (var index = 0; index < nIcons; index++) {
                var realIndex = (index + nIcons - 1) % nIcons;
                var cellHTML = "<span" +
                    " onFocus=" + dq + "SetCurrentTile('" + ImgURL[realIndex] + "');" + dq +
                    " onBlur=" + dq + dq +
                    " onClick=" + dq + "SubmitForm()" + dq +
                    " style='display:inline-block; width:142px; height:158px; behavior:url(#default#alphaImageLoader);" +
                    " src:url(" + GetImagePath(ImgURL[realIndex]) + ");' tabindex='1'>" +
                    "</span>";

                navbar.AddCellHTML(cellHTML, 142, 50);
            }
        }

        function handleLoopingDivReady() {
            var tableCells = document.getElementsByTagName('td');
            for (var i = 0; i < tableCells.length; i++) {
                tableCells[i].tabIndex = -1;
            }

            var tables = document.getElementsByTagName('table');
            for (var j = 0; j < tables.length; j++) {
                tables[j].tabIndex = -1;
            }
        }

        window.onload = initIcons;
    </script>
</head>

<body>
    <div id="title">Select your sign in picture</div>
    <div id="main" style="padding-right:5%;">
        <P> Here, you can setup your sign in picture<br> Your sign in picture will be shown whenever you sign in to MSN TV, as well as when you use MSN Messenger.</P>
        <P>Choose your sign in picture:</P>

        <div id="iconNavBarID" class="iconNavBar">
            <table class="iconNavBarMasterTbl" tabindex="-1">
                <tr>
                    <td align="center" valign="middle">
                        <table class="iconNavBarTbl" tabindex="-1">
                            <tr>
                                <td class="iconNavBarTblFrameCell">
                                    <table class="ApolloIcons" tabindex="-1">
                                        <tr height="150">
                                            <td tabindex="-1">
                                                <msntv:loopingDIV id="navbar" hasInitialFocus="true" divWidthPX="554" onLoopingDivReady="handleLoopingDivReady()"></msntv:loopingDIV>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
        <br>
        <P> To select an image, use the <EM>Enter</EM> key on your keyboard. </P>
    </div>
</body>
</html>`;
