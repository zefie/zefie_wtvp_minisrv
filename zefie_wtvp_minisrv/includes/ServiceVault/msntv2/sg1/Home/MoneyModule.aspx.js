const minisrv_service_file = true;

headers = `200 OK
Content-type: text/html`;

data = `<html>

<head>
    <script>
        var forceReload = false;
        var l = 'd:' + new Date().valueOf() + '|';

        function setCookie(name, value) {
            var now = new Date();
            var expires = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            document.cookie = escape(name) + '=' + escape(value) + ';expires=' + expires.toGMTString() + ';path=/';
        }

        function getCookie(name) {
            var str = document.cookie;
            var arr = str.split('; ');
            for (var i = arr.length - 1; i >= 0; i--) {
                var c = arr[i].split('=');
                if (c.length != 2) continue;
                if (unescape(c[0]) == name) return unescape(c[1]);
            }
            return null;
        }

        function syncCookie(cookieName, propValue) {
            var c = getCookie(cookieName);
            l += 'g:' + cookieName + ':' + c + '|';
            if (c != propValue) {
                setCookie(cookieName, propValue);
                l += 's:' + cookieName + ':' + propValue + '|';
                var check = getCookie(cookieName);
                if (check == propValue) forceReload = true;
            }
        }
        var d = new Date();
        var utcOffset = d.getTimezoneOffset();
        syncCookie('UserUtcOffset', utcOffset);
        var connSpeed;
        try {
            connSpeed = window.external.ClientCaps.connectionType;
        } catch (e) {
            connSpeed = "undetected";
        }
        syncCookie('UserConnectionSpeed', connSpeed);
        try {
            top.log(l);
        } catch (e) {}
        if (forceReload) location.replace(location.href);
    </script>
</head>

<body>
    <div style="top:0px; left:0px; width:176px; height:105px;">
        <div class="PNGImage" style="width:176px;height:105px;src:/Images/Home/HomeRotatorBGStock.png;"></div>
    </div>
    <table cellpadding="0" cellspacing="0" class="stocksTbl">
        <tbody>
            <tr height="8">
                <td width="7"></td>
                <td width="75"></td>
                <td width="5"></td>
                <td width="14"></td>
                <td width="7"></td>
                <td width="65"></td>
                <td width="5"></td>
            </tr>
            <tr>
                <td></td>
                <td class="stocksCell" style="font-weight:bold; overflow:hidden; text-overflow:ellipsis">Dow</td>
                <td></td>
                <td>
                    <div class="PNGImage" style="src:/Images/Home/HomeStocksUpArrow.png; width:14px; height:24px"></div>
                </td>
                <td></td>
                <td class="stocksCell" style="text-align: right;">+54.11</td>
                <td></td>
            </tr>
            <tr>
                <td class="stocksRule" colspan="7"></td>
            </tr>
            <tr>
                <td></td>
                <td class="stocksCell" style="font-weight:bold; overflow:hidden; text-overflow:ellipsis">Nasdaq</td>
                <td></td>
                <td>
                    <div class="PNGImage" style="src:/Images/Home/HomeStocksUpArrow.png; width:14px; height:24px"></div>
                </td>
                <td></td>
                <td class="stocksCell" style="text-align: right;">+6.31</td>
                <td></td>
            </tr>
            <tr>
                <td class="stocksRule" colspan="7"></td>
            </tr>
            <tr>
                <td></td>
                <td class="stocksCell" style="font-weight:bold; overflow:hidden; text-overflow:ellipsis">S&amp;P</td>
                <td></td>
                <td>
                    <div class="PNGImage" style="src:/Images/Home/HomeStocksUpArrow.png; width:14px; height:24px"></div>
                </td>
                <td></td>
                <td class="stocksCell" style="text-align: right;">+3.19</td>
                <td></td>
            </tr>
            <tr>
                <td class="stocksRule" colspan="7"></td>
            </tr>
            <tr>
                <td id="ProviderID" class="wthrProvider" colspan="6">Source: MSN Money</td>
            </tr>
        </tbody>
    </table>
    <!--<ROTATOR_FEEDBACK></ROTATOR_FEEDBACK>--><!--<ROTATOR_CLICKTHROUGH>/Pages/Money/MyStocks.aspx</ROTATOR_CLICKTHROUGH>-->
    <script>
        function clickPageRotatePanel() {
            location.href = "/Pages/Money/MyStocks.aspx";
        }
    </script>
</body>

</html>`;
