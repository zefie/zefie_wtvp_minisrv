class WTVMail {

    fs = require('fs');
    path = require('path');
    uuid = require('uuid');
    ssid = null;
    unread_mail = 0;
    inbox_store = null;
    sent_store = null;
    saved_store = null;
    minisrv_config = [];
    wtvshared = null;
    wtvmime = null;
    wtvclient = null;
    WTVClientSessionData = null;
    mailstore_dir = null;
    mailboxes = null;
    msgFileExt = ".zmsg";
    trashMailboxName = "Trash";

    constructor(minisrv_config, wtvclient) {
        if (!minisrv_config) throw ("minisrv_config required");
        var WTVShared = require('./WTVShared.js')['WTVShared'];
        var WTVMime = require('./WTVMime.js');
        this.WTVClientSessionData = require('./WTVClientSessionData.js');
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        this.wtvmime = new WTVMime(minisrv_config);
        this.wtvclient = wtvclient;
        this.ssid = this.wtvclient.ssid;
        this.unread_mail = this.wtvclient.getSessionData("subscriber_unread_mail") ? this.wtvclient.getSessionData("subscriber_unread_mail") : 0;
        this.mailboxes = [
            // referenced by id, so order is important!
            "Inbox",
            "Sent",
            "Saved",
            this.trashMailboxName
        ];
    }

    checkMailIntroSeen() {
        return (this.wtvclient.getSessionData("subscriber_mail_intro_seen")) ? this.wtvclient.getSessionData("subscriber_mail_intro_seen") : false;
    }

    setMailIntroSeen(seen) {
        this.wtvclient.setSessionData("subscriber_mail_intro_seen", (seen) ? true : false);
    }


    mailstoreExists() {
        if (!this.isguest) {
            if (this.mailstore_dir === null) {
                // set mailstore directory local var so we don't call the function every time
                var userstore_dir = this.wtvclient.getUserStoreDirectory();

                // MailStore
                var store_dir = "MailStore" + this.path.sep;
                this.mailstore_dir = userstore_dir + store_dir;
            }
            return this.fs.existsSync(this.mailstore_dir);
        }
        return null;
    }

    mailboxExists(mailboxid) {
        if (mailboxid > this.mailboxes.length) return null;
        var mailbox_dir = null;
        if (this.mailstoreExists()) {
            var mailbox_name = this.getMailboxById(mailboxid);
            if (!mailbox_name) return null;

            var mailbox_dir = mailbox_name + this.path.sep;
            var store_dir = this.mailstore_dir + mailbox_dir;
        }
        return (store_dir !== null) ? this.fs.existsSync(store_dir) : false;
    }

    createMailstore() {
        if (this.mailstoreExists() === false) {
            if (!this.fs.existsSync(this.mailstore_dir)) this.fs.mkdirSync(this.mailstore_dir, { recursive: true });
            return true;
        }
        return false;
    }

    getMailboxById(mailboxid) {
        return (mailboxid < this.mailboxes.length) ? this.mailboxes[mailboxid] : false;
    }

    getMailboxByName(mailbox_name) {
        var mailbox_id = false;
        this.mailboxes.every(function (v, k) {
            if (v.toLowerCase() == mailbox_name.toLowerCase()) {
                mailbox_id = k;
                return false;
            }
            return true;
        });
        return mailbox_id;
    }

    getMailboxStoreDir(mailboxid) {
        if (this.mailboxExists(mailboxid)) {
            var mailbox_name = this.getMailboxById(mailboxid);
            return this.mailstore_dir + mailbox_name + this.path.sep;
        }
        return null;
    }

    createMailbox(mailboxid) {
        var mailbox_exists = this.mailboxExists(mailboxid);
        if (mailbox_exists === false) {
            var mailbox_name = this.getMailboxById(mailboxid);
            var mailbox_dir = mailbox_name + this.path.sep;
            var store_dir = this.mailstore_dir + mailbox_dir;
            if (!this.fs.existsSync(store_dir)) this.fs.mkdirSync(store_dir, { recursive: true });
            return true;
        }
        return mailbox_exists;
    }

    createMessageID() {
        return this.uuid.v1();
    }

    createMessage(mailboxid, from_addr, to_addr, msgbody, subject = null, from_name = null, to_name = null, signature = null,  date = null, known_sender = false, attachments = []) {
        if (this.createMailbox(mailboxid)) {
            if (!date) date = Math.floor(Date.now() / 1000);

            var mailbox_path = this.getMailboxStoreDir(mailboxid);
            var message_id = this.createMessageID();
            var message_file = message_id + this.msgFileExt;
            var message_file_out = mailbox_path + message_file;
            var message_data = {
                "from_addr": from_addr,
                "from_name": from_name,
                "to_addr": to_addr,
                "to_name": to_name,
                "date": date,
                "subject": subject,
                "body": msgbody,
                "known_sender": known_sender,
                "signature": signature,
                "unread": true,
                "attachments": attachments
            }
            try {
                if (this.fs.existsSync(message_file_out)) {
                    console.log(" * ERROR: Message with this UUID (" + messageid + ") already exists (should never happen). Message lost.");
                    return false;
                }

                // encode message into json
                var result = this.fs.writeFileSync(message_file_out, JSON.stringify(message_data));
                if (!result) return false;

                // rely on filesystem times for sorting as it is quicker then reading every file
                var file_timestamp = new Date(date * 1000);
                fs.utimesSync(message_file, Date.now(), file_timestamp);
                if (!result) console.error(" WARNING: Setting timestamp on " + message_file + " failed, mail dates will be inaccurate.");

            } catch (e) {
                console.error(" # MailErr: Mail Store failed\n", e, "\n", message_file_out, "\n", message_data ,"\n");
            }
            return false;
        }
    }

    createWelcomeMessage() {
        var from_addr = (this.minisrv_config.config.service_owner_account) ? this.minisrv_config.config.service_owner_account : this.minisrv_config.config.service_owner;
        from_addr += "@" + this.minisrv_config.config.service_name;
        var from_name = this.minisrv_config.config.service_owner
        var to_addr = this.wtvclient.getSessionData("subscriber_username") + "@" + this.minisrv_config.config.service_name;
        var to_name = this.wtvclient.getSessionData("subscriber_name");
        var subj = "Welcome to " + this.minisrv_config.config.service_name;
        var msg = "poop";
        return this.createMessage(0, from_addr, to_addr, msg, subj, from_name, to_name, null, null, true);
    }

    getMessage(mailboxid, messageid) {
        if (this.createMailbox(mailboxid)) {
            var mailbox_path = this.getMailboxStoreDir(mailboxid);
            var message_file = messageid + this.msgFileExt;
            var message_file_in = mailbox_path + this.path.sep + message_file;
            var message_data_raw = null;

            if (this.fs.existsSync(message_file_in)) message_data_raw = this.fs.readFileSync(message_file_in);
            else console.error(" # MailErr: could not find ", message_file_in);

            if (message_data_raw) {
                var message_data = JSON.parse(message_data_raw);
                message_data.mailbox_path = mailbox_path;
                message_data.message_file = message_file;
                if (message_data) {
                    message_data.id = messageid;
                    // backwards compat
                    if (!message_data.attachments) message_data.attachments = [];

                    return message_data;
                }
                else console.error(" # MailErr: could not parse json in ", message_file_in);
            }
        }
        return false;
    }

    updateMessage(message_data) {
        // encode message into json
        var message_out = new Object();
        Object.assign(message_out, message_data);
        delete message_out.mailbox_path;
        delete message_out.message_file;
        var result = this.fs.writeFileSync(message_data.mailbox_path + this.path.sep + message_data.message_file, JSON.stringify(message_out));
        if (!result) return false;

        // rely on filesystem times for sorting as it is quicker then reading every file
        var file_timestamp = new Date(message_data.date * 1000);
        fs.utimesSync(message_file, Date.now(), file_timestamp);
        if (!result) console.error(" WARNING: Setting timestamp on " + message_file + " failed, mail dates will be inaccurate.");
    }

    checkMessageIdSanity(messageid) {
        return /^[A-Za-z0-9\-]{36}$/.test(messageid);
    }


    listMessages(mailboxid, limit, reverse_sort = false, offset = 0) {
        if (this.createMailbox(mailboxid)) {
            var mailbox_path = this.getMailboxStoreDir(mailboxid);
            var self = this;
            var files = this.fs.readdirSync(mailbox_path)
                .map(function (v) {
                    var message_data_raw = null;
                    var message_date = null;
                    var message_path = mailbox_path + self.path.sep + v;
                    if (self.fs.existsSync(message_path)) message_data_raw = self.fs.readFileSync(message_path);
                    if (message_data_raw) {
                        var message_data = JSON.parse(message_data_raw);
                        if (message_data) message_date = message_data.date;
                    }
                    var message_date_ret = (message_date) ? message_date : self.fs.statSync(mailbox_path + self.path.sep + v).mtime.getTime();
                    self.fs.statSync(mailbox_path + self.path.sep + v).mtime.getTime()
                    return {
                        name: v,
                        time: message_date_ret
                    };
                })
                .sort(function (a, b) {
                    if (!reverse_sort) return b.time - a.time;
                    else return a.time - b.time;
                })
                .map(function (v) {
                    if (v.name.substring((v.name.length - self.msgFileExt.length)) === self.msgFileExt) return v.name.substring(0, (v.name.length - 5));
                });

            if (files.length == 0) return false; // no messages
            else {
                // todo filter previous results when offset
                var messagelist_out = new Array();
                Object.keys(files).forEach(function (k) {
                    var message = self.getMessage(mailboxid, files[k]);
                    if (message) messagelist_out.push(mailboxid, message);
                    else console.error(" # MailErr: reading message ID: ", files[k]);
                })
                return messagelist_out.filter(function (n) { return n; });
            }
        }
        return null; // error
    }

    countMessages(mailboxid) {
        var messages = this.listMessages(mailboxid, 100, false);
        var message_count = Object.keys(messages).length;
        return (message_count) ? message_count : 0;
    }

    countUnreadMessages(mailboxid) {
        var messages = this.listMessages(mailboxid, 100, false);
        var unread = 0;
        Object.keys(messages).forEach(function (k) {
            if (messages[k].unread) unread++;
        });
        return unread;
    }

    getMailboxIcon() {
        var icon_image = null;
        switch (this.countMessages(0)) {
            case 0:
                icon_image = "OpenMailbox0.gif";
                break;
            case 1:
                icon_image = "OpenMailbox1.gif";
                break;
            default:
                icon_image = "OpenMailbox2.gif";
                break;
        }
        return icon_image;
    }

    checkUserExists(username, directory = null) {
        // returns the user's ssid, and user_id and userid in an array if true, false if not
        var search_dir = this.minisrv_config.config.SessionStore;
        var return_val = false;
        var self = this;
        if (directory) search_dir = directory;
        this.fs.readdirSync(search_dir).forEach(file => {
            if (self.fs.lstatSync(search_dir + self.path.sep + file).isDirectory() && !return_val) {
                return_val =  self.checkUserExists(username, search_dir + self.path.sep + file);
            }
            if (!file.match(/.*\.json/ig)) return;
            try {
                var temp_session_data_file = self.fs.readFileSync(search_dir + self.path.sep + file, 'Utf8');
                var temp_session_data = JSON.parse(temp_session_data_file);
                if (temp_session_data.subscriber_username.toLowerCase() == username.toLowerCase()) {
                    return_val = search_dir.replace(this.minisrv_config.config.SessionStore + self.path.sep, '').replace("user", '').split(self.path.sep);
                    return_val.push(temp_session_data.subscriber_name);
                }
            } catch (e) {
                console.error(" # Error parsing Session Data JSON", file, e);
            }
        });
        return return_val;
    }

    getUserMailstore(username) {
        var user_data = this.checkUserExists(username);
        if (user_data) {
            var user_wtvsession = new this.WTVClientSessionData(this.minisrv_config, user_data[0]);
            user_wtvsession.user_id = user_data[1];
            var user_mailstore = new WTVMail(this.minisrv_config, user_wtvsession)
            return user_mailstore;
        }
        return false;
    }

    sendMessageToAddr(from_addr, to_addr, msgbody, subject = null, from_name = null, to_name = null, signature = null, attachments = []) {
        if (!to_addr) return "Your message could not be sent.<p>You must specify an addressee in the <blackface>To:</blackface> area.";


        if (to_addr.indexOf('@') === -1) to_addr += "@"+this.minisrv_config.config.service_name;
        var username = to_addr.split("@")[0];
        var dest_minisrv = to_addr.split("@")[1] || this.minisrv_config.config.service_name;

        // local only for now
        if (dest_minisrv.toLowerCase() !== this.minisrv_config.config.service_name.toLowerCase()) {
            return "The m-mail address <strong>" + to_addr + "</strong> is not supported by this MiniSrv.";
        }

        // find user if local
        if (dest_minisrv.toLowerCase() === this.minisrv_config.config.service_name.toLowerCase()) {
            var dest_user_mailstore = this.getUserMailstore(username);
            // user does not exist
            if (!dest_user_mailstore) return "The user <strong>" + username + "</strong> does not exist on MiniSrv <strong>" + dest_minisrv + "</strong>";

            if (!to_name) {
                var userExistsData = this.checkUserExists(username);
                to_name = userExistsData[2];
            }

            // check if the destination user's Inbox exists yet
            if (!dest_user_mailstore.mailboxExists(0)) {
                // mailbox does not yet exist, create it
                var mailbox_exists = dest_user_mailstore.createMailbox(mailbox);
                // Just created Inbox for the first time, so create the welcome message
                if (mailbox_exists) dest_user_mailstore.createWelcomeMessage();
            }
            // if the mailbox exists, deliver the message
            if (dest_user_mailstore.mailboxExists(0)) dest_user_mailstore.createMessage(0, from_addr, to_addr, msgbody, subject, from_name, to_name, signature, null, this.isInUserAddressBook(to_addr, from_addr), attachments);
            else return "There was an internal error sending the message to <strong>" + to_addr + "</strong>. Please try again later";

            // clean up
            dest_user_mailstore = null;
            return true;
        }
        return "Unknown error";
    }

    isInUserAddressBook(address_to_check, address_to_look_for) {
        // unimplemented
        return false;
    }

    getMessageMailboxName(messageid) {
        // returns the mailbox id of which the message was found for the current user
        var self = this;
        var mailbox_name = false;
        if (this.checkMessageIdSanity(messageid)) {
            if (this.mailstoreExists()) {
                this.fs.readdirSync(this.mailstore_dir).every(mailbox => {
                    if (mailbox_name) return false;
                    self.fs.readdirSync(self.mailstore_dir + mailbox).every(file => {
                        var regexSearch = messageid + self.msgFileExt;
                        var re = new RegExp(regexSearch, "ig");
                        if (!file.match(re)) return true;
                        mailbox_name = mailbox;
                        return false;
                    });
                    return true;
                });
            }
        }
        return mailbox_name;
    }

    getMessageMailboxID(messageid) {
        var mailbox_name = this.getMessageMailboxName(messageid);
        if (!mailbox_name) return false;
        return this.getMailboxByName(mailbox_name);
    }

    getMessageByID(messageid) {
        var mailbox_name = this.getMessageMailboxName(messageid);
        if (!mailbox_name) return false;

        var mailboxid = this.mailboxes.findIndex((value) => value == mailbox_name);

        if (mailboxid !== false) return this.getMessage(mailboxid, messageid);
        return null;
    }

    moveMailMessage(messageid, dest_mailbox_id) {
        // returns true if successful, false if failed.
        var currentMailbox = this.getMessageMailboxID(messageid);
        // Same mailbox
        if (dest_mailbox_id == currentMailbox) return false;

        // Invalid destination mailbox ID
        if (dest_mailbox_id > (this.mailboxes.length - 1) || dest_mailbox_id < 0) return false;

        if (!this.mailboxExists(dest_mailbox_id)) this.createMailbox(dest_mailbox_id);

        var currentMailStoreDir = this.getMailboxStoreDir(currentMailbox);
        if (!currentMailStoreDir) return false;

        var destMailStoreDir = this.getMailboxStoreDir(dest_mailbox_id);
        if (!destMailStoreDir) return false;

        var currentMailFile = currentMailStoreDir + this.path.sep + messageid + this.msgFileExt;
        var destMailFile = destMailStoreDir + this.path.sep + messageid + this.msgFileExt;

        // File exists
        if (this.fs.existsSync(destMailFile)) return false;

        return this.fs.renameSync(currentMailFile, destMailFile);
    }

    deleteMessage(messageid) {
        var currentMailbox = this.getMessageMailboxName(messageid);
        var trashMailbox = this.getMailboxByName(this.trashMailboxName);
        if (currentMailbox != trashMailbox) {
            // if not in the trash, move it to trash
            return this.moveMailMessage(messageid, trashMailbox);
        } else {
            // if its already in the trash, delete it forever
            var currentMailFile = this.getMailboxStoreDir(trashMailbox) + this.path.sep + messageid + this.msgFileExt;
            if (this.fs.fileExistsSync(currentMailFile))
                return this.fs.unlink(currentMailFile);
            else
                return false;
        }
    }

    setMessageReadStatus(messageid, read = true) {
        var message = this.getMessageByID(messageid);
        if (!message) return false;

        message.unread = !read;
        this.updateMessage(message);
        return true;
    }
}

module.exports = WTVMail;
