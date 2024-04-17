var minisrv_service_file = true;

var site = "";

if (minisrv_config.services['wtv-author'].public_domain) {
    site = minisrv_config.services['wtv-author'].public_domain;
} else {
    if (minisrv_config.services['wtv-author'].publish_mode == "service") {
        var target_service = minisrv_config.services[minisrv_config.services['wtv-author'].publish_dest];
        if (target_service) {
            site = target_service.host + ":" + target_service.port;
        }
    } else {
        site = minisrv_config.services['wtv-author'].host + ":" + minisrv_config.services['wtv-author'].port;
    }
}

headers = `200 OK
Content-Type: text/html`


data = `<html><head>

    <meta http-equiv="content-type" content="text/html;charset=iso-8859-1">
        <title>${minisrv_config.config.service_name} community home pages</title>
        <style type="text/css"></style></head>
    <body background="/blue_tile_128b.gif" bgcolor="1e4261" text="#dedede" link="#ccccff" data-new-gr-c-s-check-loaded="14.1114.0" data-gr-ext-installed="">
        <table border="0" cellpadding="4" cellspacing="0" width="95%">
            <tbody><tr>
                <td width="100" rowspan="2">
                    <a href="/"><img src="${minisrv_config.config.service_logo_pc}" border="0" width="87" height="67"></a></td>
                <td><font color="#dedede" size="5"><b>${minisrv_config.config.service_name} community home pages</b></font></td>
            </tr>
                <tr>
                    <td>
                        <hr>
                    </td>
                </tr>
                <tr>
                    <td width="100"></td>
                    <td bgcolor="#000033"><font color="#dedede" size="3">Here you'll find pages created by members of the ${minisrv_config.config.service_name} community using ${minisrv_config.config.service_name}'s Page Builder.</font></td>
                </tr>
                <tr height="7">
                    <td width="100" height="7"></td>
                    <td height="7" bgcolor="#000033"></td>
                </tr>
                <tr>
                    <td width="100"></td>
                    <td bgcolor="#000033"><font color="#dedede" size="3">If you know the name of a ${minisrv_config.config.service_name} user who has a home page, you can find that user's home page at an address of this form:</font> <blockquote>
                        <p><font color="#dedede" size="3">http://${site}/</font><font color="darkOrange" size="3">username</font></p></blockquote>
                    </td>
                </tr>
                <tr>
                    <td width="100"></td>
                    <td bgcolor="#000033"><font color="#dedede" size="3">For example, if the username is </font><font color="darkOrange" size="3">zefie</font><font color="#dedede" size="3">, then the address is:</font> <blockquote>
                        <p><font color="#dedede" size="3">http://${site}/</font><font color="darkOrange" size="3">zefie</font></p></blockquote>
                    </td>
                </tr>
                <tr>
                    <td width="100"></td>
                    <td></td>
                </tr>
            </tbody></table>



    </body></html>
 `