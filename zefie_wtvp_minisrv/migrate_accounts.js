var classPath = __dirname + "/includes/";
const { WTVShared } = require(classPath + "WTVShared.js");
const wtvshared = new WTVShared(); // creates minisrv_config
classPath = wtvshared.getAbsolutePath(classPath, __dirname);
const WTVClientSessionData = require(classPath + "/WTVClientSessionData.js");
minisrv_config = wtvshared.getMiniSrvConfig();

const wtvcsd = new WTVClientSessionData(minisrv_config)

const fs = require('fs')
const path = require('path')


var old_account_dir = minisrv_config.config.SessionStore;
var new_account_dir = wtvcsd.getAccountStoreDirectory();
if (!fs.existsSync(new_account_dir)) fs.mkdirSync(new_account_dir);

total = 0;

fs.readdirSync(old_account_dir).forEach(file => {
    if (file === "accounts" || file === "minisrv_internal_nntp" || file === "client registration and session data will populate here.txt") return;
    fs.renameSync(old_account_dir + path.sep + file, new_account_dir + path.sep + file)
    console.log(" * Migrated", old_account_dir + path.sep + file, "to", new_account_dir + path.sep + file);
    total++;
});

console.log(" *", total, "accounts migrated.");