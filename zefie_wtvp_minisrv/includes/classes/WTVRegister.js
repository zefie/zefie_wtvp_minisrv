class WTVRegister {

    fs = require('fs');
    path = require('path');
    minisrv_config = [];
    service_owner = "a minisrv user";
    session_store_dir = null;

    constructor(minisrv_config, session_store_dir = null) {
        this.minisrv_config = minisrv_config;
        this.service_owner = minisrv_config.config.service_owner || "a minisrv user";
        this.session_store_dir = session_store_dir || this.minisrv_config.config.SessionStore;
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
        var regex_str = "^([A-Za-z0-9\-\_]{" + this.minisrv_config.config.user_accounts.min_username_length + "," + this.minisrv_config.config.user_accounts.max_username_length + "})$";
        var regex = new RegExp(regex_str);
        return regex.test(username);
    }


    checkUsernameAvailable(username, directory = null) {
        var self = this;
        var return_val = false;
        // returns the user's ssid, and user_id and userid in an array if true, false if not

        // check against reserved name list
        if (this.minisrv_config.config.user_accounts.reserved_names) {
            Object.keys(this.minisrv_config.config.user_accounts.reserved_names).forEach((k) => {
                if (self.minisrv_config.config.user_accounts.reserved_names[k].toLowerCase() == username.toLowerCase()) return_val = true;
            })
        }

        if (return_val) return !return_val;

        // check against user accounts
        directory = (directory) ? directory : this.session_store_dir + this.path.sep + "accounts";

        if (this.fs.existsSync(directory)) {
            this.fs.readdirSync(directory).forEach(file => {
                if (self.fs.lstatSync(directory + self.path.sep + file).isDirectory() && !return_val) {
                    return_val = !self.checkUsernameAvailable(username, directory + self.path.sep + file);
                }
                if (!file.match(/user.*\.json/ig)) return;
                try {
                    var temp_session_data_file = self.fs.readFileSync(directory + self.path.sep + file, 'Utf8');
                    var temp_session_data = JSON.parse(temp_session_data_file);
                    if (temp_session_data.subscriber_username) {
                        if (temp_session_data.subscriber_username.toLowerCase() == username.toLowerCase()) {
                            return_val = true;
                        }
                    }
                } catch (e) {
                    console.error(" # Error parsing Session Data JSON", directory + self.path.sep + file, e);
                }
            });
        }
        return !return_val;
    }


    /**
     * Generations regnstration template
     * @param {string} title HTML Page Title
     * @param {string} main_content Main center content
     * @param {string} form_buttons Form and buttons
     * @returns {string} HTML Page
     */
    getHTMLTemplate(title, main_content, form_buttons, hasJS) {
        var data;
        data = `<html><head>`;
        if (hasJS) {
            data += `<script src=/ROMCache/h.js></script><script src=/ROMCache/n.js></script></head><script>head('${title}','','','',1)</script>`
        } else {
            data += `<body background=/ROMCache/Themes/Images/Pattern.gif text=42bd52 bgcolor=191919 vlink=dddddd link=dddddd hspace=0 vspace=0 fontsize=medium>
<table cellspacing=0 cellpadding=0>
<tr><td>
<td width=100% height=80 valign=top align=left>
<spacer type=block width=11 height=11><br>
<spacer type=block width=10 height=1>
<img src=/ROMCache/WebTVLogoJewel.gif width=90 height=69>
<td width=100% height=80 valign=top>
<td abswidth=460 height=54 valign=top align=right>
<spacer height=32 type=block><b><shadow><blackface><font color=cbcbcb>${title} &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; </font></blackface></shadow></b>
</td></tr></table>`;
        }
        data += `<display nooptions>

   <table width=480 align=center cellspacing=0 cellpadding=0>
      <tr>
         <td height=242>
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
        return data;
    }

}

module.exports = WTVRegister;