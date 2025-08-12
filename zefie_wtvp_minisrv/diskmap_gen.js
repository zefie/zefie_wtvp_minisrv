const process = require('process');
const fs = require('fs');
const path = require('path');
const classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
const { WTVShared, clientShowAlert } = require(classPath + "/WTVShared.js");

const wtvshared = new WTVShared(); // creates minisrv_config
const minisrv_config = wtvshared.getMiniSrvConfig(); // snatches minisrv_config

// primitive recursive diskmap generator, usage:
// node diskmap_gen.js path_in_servicevault diskmap_name wtvdest [service_name]
// service_name defaults to wtv-disk
// will create a primitive diskmap you can then edit it as you need
// example: node diskmap_gen.js content/Demo/ Demo.json DealerDemo file://Disk/Demo/

if (process.argv.length < 6) {
    console.error("Usage:", process.argv[0], process.argv[1], "path_in_service_vault", "diskmap_name", "wtv_file_dest", "groupname", "[service_name]");
    console.error("Example:", process.argv[0], process.argv[1], "content/Demo/ Demo.json DealerDemo file://Disk/Demo/");
    process.exit(1);
}

const service_vault_subdir = process.argv[2];
const out_file = process.argv[3];
const group_name = process.argv[4];
let client_dest = process.argv[5];
let service_name;
if (process.argv.length >= 7) service_name = process.argv[6];
else service_name = "wtv-disk";

// find which service_vault the files are in
// nothing fancy, won't support generating a list across multiple vaults
// so be sure to choose ONE vault to keep all the files in before scanning
// Can be any vault, and after the scan you could technically move files across vaults
// so long as they are on the same service still

let service_vault = null;
let service_vault_dir = null;
if (minisrv_config.config.ServiceVaults) {
    Object.keys(minisrv_config.config.ServiceVaults).forEach(function (k) {
        if (service_vault_dir) return;
        const test = wtvshared.makeSafePath(wtvshared.returnAbsolutePath(minisrv_config.config.ServiceVaults[k]), service_name + path.sep + service_vault_subdir);
        console.log(" * Looking for", test);
        if (fs.existsSync(test)) {
            console.log(" * Found", test);
            service_vault = wtvshared.makeSafePath(wtvshared.returnAbsolutePath(minisrv_config.config.ServiceVaults[k]), service_name);
            service_vault_dir = test;
        }
    })
}

if (!service_vault) {
    console.error("Could not find", service_vault_subdir, "in any configured Service Vaults!");    
    process.exit(1);
}

const recursiveDirList = function (dirPath, arrayOfFiles = null) {
    const files = fs.readdirSync(dirPath)

    arrayOfFiles = arrayOfFiles || []

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = recursiveDirList(dirPath + "/" + file, arrayOfFiles)
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file))
        }
    })
    return arrayOfFiles
}

const fileList = recursiveDirList(service_vault_dir);

if (fileList.length > 0) {
    const diskmap = {};
    diskmap[group_name] = {};
    if (client_dest.substring(client_dest.length - 1, 1) != '/') client_dest += '/';
    diskmap[group_name].base = client_dest;
    diskmap[group_name].location = service_vault_subdir;
    diskmap[group_name].files = [];


    fileList.forEach(function (v) {
        diskmap[group_name].files.push({ "file": v.replace(service_vault_dir, client_dest).replace(new RegExp('\\' + path.sep, 'g'), '/') });
    });

    //    diskmap[group_name].files = diskmap_files;
    fs.writeFileSync(out_file,JSON.stringify(diskmap, null, "\t"));
} else {
    throw ("No files found in", service_vault);
}




