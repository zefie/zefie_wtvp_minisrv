class WTVRegister {

    fs = require('fs');
    path = require('path');
    minisrv_config = [];
    service_owner = "a minisrv user";
    session_store_dir = null;
    wtvshared = null;

    constructor(minisrv_config, session_store_dir = null) {
        this.minisrv_config = minisrv_config;
        this.service_owner = minisrv_config.config.service_owner || "a minisrv user";
        this.session_store_dir = session_store_dir || this.minisrv_config.config.SessionStore;
        const WTVShared = require("./WTVShared.js")['WTVShared'];
        this.wtvshared = new WTVShared(minisrv_config);
    }

    getServiceOperator(first_letter_lower = false) {
        if (this.service_owner == "a minisrv user") {
            if (first_letter_lower) return "the operator of this service";
            else return "The operator of this service";
        } else {
            return this.service_owner;
        }
    }

    /**
     * Checks if the username is valid according to the configured rules.
     * @param {string} username The username to check
     * @returns {boolean} True if the username is valid, false otherwise
     */
    checkUsernameSanity(username) {
        const regex_str = "^([A-Za-z0-9-\_]{" + this.minisrv_config.config.user_accounts.min_username_length + "," + this.minisrv_config.config.user_accounts.max_username_length + "})$";
        const regex = new RegExp(regex_str);
        return regex.test(username);
    }

    /**
     * Checks if the SSID is already registered.
     * @param {string} ssid The SSID to check
     * @returns {boolean} True if the SSID is available for registration, false if it already has an account registered.
     */
    checkSSIDAvailable(ssid) {
        const directory = this.session_store_dir + this.path.sep + "accounts";
        let available = true;
        if (this.fs.existsSync(directory)) {
            this.fs.readdirSync(directory).forEach(file => {
                if (file.toLowerCase() == ssid.toLowerCase()) {
                    available = false;
                    return false;
                }
            });
        };
        return available;
    }

    /**
     * Checks if the username is already taken.
     * @param {string} username The username to check
     * @param {string} directory The directory to search for user accounts
     * @returns {boolean} True if the username is available, false if it is already taken
     */
    checkUsernameAvailable(username, directory = null) {
        const self = this;
        let return_val = false;
        // returns the user's ssid, and user_id and userid in an array if true, false if not

        // check against reserved name list
        if (this.minisrv_config.config.user_accounts.reserved_names_files) {
            const reserved_names = []
            this.minisrv_config.config.user_accounts.reserved_names_files.forEach(function (v) {
                const data = self.fs.readFileSync(v);
                const json = JSON.parse(data);
                json.forEach(function (v) {
                    reserved_names.push(v);
                });
            });

            Object.keys(reserved_names).forEach((k) => {
                const regex = new RegExp("^"+reserved_names[k]+"$", 'i');
                if (username.match(regex)) return_val = true;
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
                    const temp_session_data_file = self.fs.readFileSync(directory + self.path.sep + file, 'Utf8');
                    const temp_session_data = JSON.parse(temp_session_data_file);
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
     * Generates registration template using Nunjucks
     * @param {string} title HTML Page Title
     * @param {string} main_content Main center content
     * @param {string} form_buttons Form and buttons
     * @param {boolean} is_old_build True or false
     * @returns {string} HTML Page
     */
    getHTMLTemplate(title, main_content, form_buttons, is_old_build) {
        try {
            const template = this.wtvshared.getTemplate("wtv-register", "templates/NunjucksTemplate.js", true);
            if (this.fs.existsSync(template)) {
                const WTVRegisterTemplate = require(template);
                
                // Determine which template to use based on build type
                const template_name = is_old_build ? 'register_old_build.njk' : 'register_new_build.njk';
                
                const template_args = {
                    template_name: template_name,
                    title: title,
                    main_content: main_content,
                    form_buttons: form_buttons,
                    service_logo: this.minisrv_config.config.service_logo
                };
                
                const wtvt = new WTVRegisterTemplate(template_args);
                const data = wtvt.getTemplatePage();
                
                if (data) {
                    return data;
                }
            }
        } catch (error) {
            console.error('Error using Nunjucks template for registration:', error);
        }
        return '';
    }

}

module.exports = WTVRegister;
