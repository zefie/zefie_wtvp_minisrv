var minisrv_service_file = true;

var error = '';
if (request_headers.query.error) {
    switch (request_headers.query.error) {
        case "1":
            error = "uncompression failed";
            break;
        case "2":
            error = "upgrade write failed";
            break;
        case "3":
            error = "signature verification failed";
            break;
        case "4":
            error = "cannot upgrade bootstrap";
            break;
        case "5":
            error = "out of memory";
            break;
        case "-7":
            error = "response error";
            break;
        case "-20":
            error = "timed out";
            break;
        case "99":
            error = "test code";
            break;
        default:
            error = "unknown error";
            break;
    }
}


var try_again_url = service_name + ":/willie";
var try_again_url_path = ''
var try_again_url_start_time = parseInt(new Date().toUTCString()) / 1000;

headers = `200 OK
Content-type: text/html`


data = `<html>
<head>
    <display switchtowebmode nooptions nostatus>
        <title>Update failed</title>
</head>

<body noscroll bgcolor="#191919" text="#42CC55" link="36d5ff"
      hspace=0 vspace=0 transition=none fontsize="large">
    <table cellspacing=0 cellpadding=0>
        <tr>
            <td width=104 height=74 valign=middle align=center bgcolor="3B3A4D">
                <img src="${minisrv_config.config.service_logo}" width=87 height=67>
            <td width=20 valign=top align=left bgcolor="3B3A4D">
                <img src="${service_name}:/ROMCache/Spacer.gif" width=1 height=1>
            <td colspan=10 width=436 valign=middle align=left bgcolor="3B3A4D">
                <font color="D6DFD0" size="+2">
                    <blackface>
                        <shadow>
                            <img src="${service_name}:/ROMCache/Spacer.gif" width=1 height=4>
                            <br>
                            Updating failed
                        </shadow>
                    </blackface>
                </font>
        <tr>
            <td colspan=12 width=560 height=10 valign=top align=left>
                <img src="${service_name}:/ROMCache/S40H1.gif" width=560 height=6>
        <tr>
            <td width=104 height=10 valign=top align=left>
            <td width=20 valign=top align=left>
            <td width=67 valign=top align=left>
            <td width=20 valign=top align=left>
            <td width=67 valign=top align=left>
            <td width=20 valign=top align=left>
            <td width=67 valign=top align=left>
            <td width=20 valign=top align=left>
            <td width=67 valign=top align=left>
            <td width=20 valign=top align=left>
            <td width=68 valign=top align=left>
            <td width=20 valign=top align=left>

                <form action="${try_again_url}">
                    <input type="hidden" name="clear_cache" value="true">
        <tr>
            <td width=104 valign=middle align=center>
            <td width=20 valign=middle align=center>
            <td colspan=9 width=100 height=258 valign=top align=left>
                <font size=+1>
                    We ran into a technical problem while updating
                    your unit. (Error: ${error})
                    Choose <b>Try Again</b> to try again now.
                    <p><font size=+1>Press the <b>power</b> button to switch off your ${session_data.getBoxName()}.
        <tr>
            <td width=104 valign=middle align=center>
            <td width=20 valign=middle align=center>
            <td colspan=10 height=2 valign=middle align=center bgcolor="2B2B2B">
                <img src="${service_name}:/ROMCache/Spacer.gif" width=436 height=1>
        <tr>
            <td width=104 valign=middle align=center>
            <td width=20 valign=middle align=center>
            <td colspan=9 height=1 valign=top align=left>
        <tr>
            <td width=104 valign=middle align=center>
            <td width=20 valign=middle align=center>
            <td colspan=10 height=2 valign=top align=left bgcolor="0D0D0D">
                <img src="${service_name}:/ROMCache/Spacer.gif" width=436 height=1>
        <tr>
            <td width=104 valign=middle align=center>
            <td width=20 valign=middle align=center>
            <td colspan=9 height=4 valign=top align=left>
        <tr>
            <td width=104 valign=middle align=center>
            <td width=20 valign=middle align=center>
            <td colspan=9 width=416 valign=top align=left>
                <table cellspacing=0 cellpadding=0>
                    <tr>
                        <td width=306 valign=top align=left>
                            <font size="-1">
                                <i>
                                </i>
                            </font>
                        <td width=112 valign=top align=right>
                            <font size="-1" color="#E7CE4A">
                                <shadow>
                                    <input selected
                                           name="Try Again"
                                           value="Try Again"
                                           type=submit Value=TryAgain name="Try Again"
                                           borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=110>
                                </shadow>
                            </font>
                            </form>

                </table>
            <td width=20 valign=middle align=center>
    </table>
</body>
</html>`;