class WTVRegister {

    fs = require('fs');
    path = require('path');
    minisrv_config = [];

    service_owner = "a minisrv user";
    session_store_dir = null;

    constructor(minisrv_config, session_store_dir = null) {
        this.minisrv_config = minisrv_config;
        this.service_owner = minisrv_config.config.service_owner || "a minisrv user";
        if (session_store_dir) this.session_store_dir = session_store_dir
    }

    getServiceOperator(first_letter_lower = false) {
        if (this.service_owner == "a minisrv user") {
            if (first_letter_lower) return "the operator of this service";
            else return "The operator of this service";
        } else {
            return this.service_owner;
        }
    }

    checkUsernameSanity(username) {
        var check1 = /^([A-Za-z0-9\-\_]{5,16})$/.test(username);
        var check2 = /^[A-Za-z]/.test(username);
        return (check1 && check2);
    }

    checkUsernameAvailable(username, ssid_sessions) {
        var username_match = false;
        this.fs.readdirSync(this.session_store_dir).forEach(file => {
            if (!file.match(/.*\.json/ig)) return;
            if (username_match) return;
            try {
                var temp_session_data_file = this.fs.readFileSync(this.session_store_dir + this.path.sep + file, 'Utf8');
                var temp_session_data = JSON.parse(temp_session_data_file);
                if (temp_session_data.subscriber_username.toLowerCase() == username.toLowerCase()) username_match = true;
            } catch (e) {
                console.error(" # Error parsing Session Data JSON", file, e);
                username_match = true;
            }
        });
        return !username_match;
    }

    /**
     * Generations regnstration template
     * @param {string} title HTML Page Title
     * @param {string} main_content Main center content
     * @param {string} form_buttons Form and buttons
     * @param {boolean} is_old_build True or false
     * @returns {string} HTML Page
     */
    getHTMLTemplate(title, main_content, form_buttons, is_old_build) {
        var data;
        if (is_old_build) {
            data = `<html>
<head>
   <title>
      ${title}
   </title>
   <display nooptions>
</head>
<body bgcolor=#191919 text=#42CC55 fontsize=large hspace=0 vspace=0>
   <table cellspacing=0 cellpadding=0>
      <tr>
         <td width=104 height=74 valign=middle align=center bgcolor=#3B3A4D>
            <img src="${this.minisrv_config.config.service_logo}" width=86 height=64>
         <td width=20 valign=top align=left bgcolor=#3B3A4D>
            <spacer>
         <td colspan=2 width=100% align=left bgcolor=#3B3A4D>
            <font color=D6DFD0 size=+2>
               <blackface>
                  <shadow>
                     <spacer type=block width=1 height=4>
                     <br>
                     ${title}
                  </shadow>
               </blackface>
            </font>
      </tr>
      </td>
   </table>
   <table width=520 align=center cellspacing=0 cellpadding=0>
      <tr>
         <td height=272>
            <font size=+1>
               ${main_content}
               <p>
            </font>
         </td>
     </tr>
   </table>
   <hr>
   <p>
   <table align=right cellspacing=0 cellpadding=0>
      <tr>
         <td>
            <spacer type=block height=10>
            ${form_buttons}
         </td>
         <td>
            &nbsp; &nbsp;
         </td>
      </tr>
   </table>
</body>
</html>
`;
        } else {
            data = `<html>
<head>
<title>
 ${title}
</title>
<display nooptions noscroll NoScroll>
</head>
<body noscroll
bgcolor="#171726" text="#D1D3D3" link=#FFEA9C vlink=#FFEA9C
hspace=0 vspace=0 fontsize="large"
>
<table cellspacing=0 cellpadding=0 border=0 width=560 bgcolor=#171726>
<tr>
<td align=middle bgcolor="#5b6c81" border=0 colspan= 3 width="100" height="80">
<img src="${this.minisrv_config.config.service_logo}" WIDTH="87" HEIGHT="67">
<td colspan= 6 bgcolor="#5b6c81" border=0 width=100% absheight="80" valign=bottom >
<img src="images/head_registration.gif" >
<tr>
<td bgcolor="#5b6c81" border=0 rowspan=2 width=21 height= 220></td>
<td bgcolor="#171726" border=0 width=9 height=25 align=left valign=top>
<img src="images/L_corner.gif" width=8 height=8>
<td bgcolor="#171726" border=1 colspan=1 width=70 height=25>
<td colspan=6 bgcolor="#171726" border=1 height=25 align=left valign=bottom gradcolor=#262E3D gradangle=90>
<font color=#d1d3d3 size=+1>
<blackface>
${title}
</blackface></font>
<tr> <td border=0 width=40 bgcolor="#171726" rowspan="2" >
<td absheight=20 width=100 bgcolor="#171726" colspan=6>
</tr>
</table>
<table cellspacing=0 cellpadding=0 border=0 width=560 bgcolor=#171726>
<tr>
<td bgcolor= "#5b6c81" border=0 rowspan=6 abswidth=21 height= 220></td>
<td border=0 abswidth=40 bgcolor="#171726" rowspan="6" >
<td height=230 width= 300 bgcolor="#171726" colspan=5 valign=top align=left>
${main_content}
<td abswidth=20 bgcolor=#171726 >
</tr>
<tr>
<td valign= bottom height=15 colspan=7 bgcolor=#171726>
<shadow>
<hr size=5 valign=bottom></shadow>
</tr>
<tr>
<td border=2 colspan=4 width=100 height=50 bgcolor=#171726 valign=top align=left>
<font size=-1><i>
</i></font>
<td bgcolor=#171726 height=50 width=560 valign=top align=right>
<font size=-1 color=#e7ce4a>
${form_buttons}
<td abswidth=13 absheight=50 bgcolor=#171726>
</tr>
</table>
</body>
</html>`;
        }
        return data;
    }

}

module.exports = WTVRegister;