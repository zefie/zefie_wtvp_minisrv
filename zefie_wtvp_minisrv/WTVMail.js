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
    mailstore_dir = null;
    is_guest = null;
    mailboxes = null;

    constructor(minisrv_config, ssid, WTVClientSessionData) {
        if (!minisrv_config) throw ("minisrv_config required");
        var WTVShared = require('./WTVShared.js')['WTVShared'];
        var WTVMime = require('./WTVMime.js');
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        this.wtvmime = new WTVMime(minisrv_config);
        this.wtvclient = WTVClientSessionData;
        this.is_guest = !this.wtvclient.isRegistered();
        this.ssid = ssid;
        this.unread_mail = this.wtvclient.getSessionData("subscriber_unread_mail") ? this.wtvclient.getSessionData("subscriber_unread_mail") : 0;
        this.mailboxes = [
            // referenced by id, so order is important!
            "Inbox",
            "Sent",
            "Saved",
            "Trash"
        ];
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
        return (mailboxid < this.mailboxes.length - 1) ? this.mailboxes[mailboxid] : false;
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


    createMessage(mailboxid, from_addr, to_addr, msgbody, subject = null, from_name = null, to_name = null, date = null, known_sender = false) {
        if (this.createMailbox(mailboxid)) {
            if (!date) date = Math.floor(Date.now() / 1000);

            var mailbox_path = this.getMailboxStoreDir(mailboxid);
            var message_file = this.createMessageID() + ".zmsg";
            var message_file_out = mailbox_path + message_file;
            var message_data = {
                "from_addr": from_addr,
                "from_name": from_name,
                "to_addr": to_addr,
                "to_name": to_name,
                "date": date,
                "subject": subject,
                "body": msgbody,
                "known_sender": known_sender
            }
            try {
                if (this.fs.existsSync(message_file_out)) {
                    console.log(" * ERROR: Message with this UUID already exists (should never happen). Message lost.");
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
        return this.createMessage(0, from_addr, to_addr, msg, subj, from_name, to_name, null, true);
    }

    getMessage(mailboxid, messageid) {
        if (this.createMailbox(mailboxid)) {
            var mailbox_path = this.getMailboxStoreDir(mailboxid);
            var message_file = messageid + ".zmsg";
            var message_file_in = mailbox_path + this.path.sep + message_file;
            var message_data_raw = null;

            if (this.fs.existsSync(message_file_in)) message_data_raw = this.fs.readFileSync(message_file_in);
            else console.error(" # MailErr: could not find ", message_file_in);

            if (message_data_raw) {
                var message_data = JSON.parse(message_data_raw);
                if (message_data) {
                    message_data.id = messageid;
                    return message_data;
                }
                else console.error(" # MailErr: could not parse json in ", message_file_in);
            }
        }
        return false;
    }

    listMessages(mailboxid, limit, reverse_sort = false, offset = 0) {
        if (this.createMailbox(mailboxid)) {
            var mailbox_path = this.getMailboxStoreDir(mailboxid);
            var self = this;
            var files = this.fs.readdirSync(mailbox_path)
                .map(function (v) {
                    return {
                        name: v,
                        time: self.fs.statSync(mailbox_path + self.path.sep + v).mtime.getTime()
                    };
                })
                .sort(function (a, b) {
                    if (reverse_sort) return b.time - a.time;
                    else return a.time - b.time;
                })
                .map(function (v) {
                    if (v.name.substring((v.name.length - 5)) === ".zmsg") return v.name.substring(0, (v.name.length - 5));
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
        var messages = this.listMessages(mailboxid, false);
        return (messages.length) ? messages.length : 0;
    }
}

module.exports = WTVMail;
