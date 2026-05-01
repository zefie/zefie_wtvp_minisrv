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
    <div style="top:0px; left:0px; width:176px; height:105px;" xmlns:msntvuxp="msntvuxp.microsoft.com">
        <div class="PNGImage" style="width:176px;height:105px;src:/Images/Home/HomeRotatorBGWeather.png;"></div>
    </div>
    <div style="position:absolute; top:0px; left:0px; width:178px; height:107px;" xmlns:msntvuxp="msntvuxp.microsoft.com">
        <table class="wthrTbl" border="0" cellpadding="1" cellspacing="0">
            <tbody>
                <tr>
                    <td height="4" width="4" rowspan="4"><img src="/Images/Shared/s.gif" height="4" width="4"></td>
                    <td height="4" width="45"><img src="/Images/Shared/s.gif" height="4" width="45"></td>
                    <td height="4" width="10"><img src="/Images/Shared/s.gif" height="4" width="10"></td>
                    <td height="4" width="65"><img src="/Images/Shared/s.gif" height="4" width="65"></td>
                    <td height="4" width="10" rowspan="4"><img src="/Images/Shared/s.gif" height="4" width="10"></td>
                </tr>
                <tr>
                    <td id="CityCellID" class="wthrCityCell" colspan="3" valign="top"><span class="wthrCityText">Your City</span></td>
                </tr>
                <tr>
                    <td id="TRCID" class="wthrTempCond">
                        <table>
                            <tbody>
                                <tr>
                                    <td id="TemperatureCellID" class="wthrTempCell"><span class="wthrTempTxt">63&#176;/50</span></td>
                                </tr>
                                <tr>
                                    <td id="ConditionCellID" class="wthrCondCell"><span class="wthrCondTxt">Mostly</span><br><span class="wthrCondTxt"> Cloudy</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                    <td id="PaddingID" width="10"><img src="/Images/Shared/s.gif" height="1" width="10"></td>
                    <td id="ConditionIconID" class="wthrCondIcon"><span class="PNGImage" style="src:/Images/Shared/Weather/28.png;width:65px;height:61px;"></span></td>
                </tr>
                <tr>
                    <td id="ProviderID" class="wthrProvider" colspan="3">The Weather Channel &#174;</td>
                </tr>
            </tbody>
        </table>
    </div>
    <!--<ROTATOR_FEEDBACK></ROTATOR_FEEDBACK>--><!--<ROTATOR_CLICKTHROUGH>/Pages/Weather/YourCity.aspx</ROTATOR_CLICKTHROUGH>-->
    <script xmlns:msntvuxp="msntvuxp.microsoft.com">
        function clickPageRotatePanel() {
            location.href = "/Pages/Weather/YourCity.aspx";
        }
    </script>
</body>

</html>`;
