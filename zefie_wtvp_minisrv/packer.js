const { WTVShared } = require("./WTVShared.js");
var wtvshared = new WTVShared(null, true);
const fs = require('fs');

function showUsage() {
    console.log(" * Usage:", process.argv[0], process.argv[1], "<file to CompB64>");
    process.exit(1);
}

if (process.argv) {
    if (process.argv[2]) {
        var reverse = false;
        var file = process.argv[2];
        if (file == "-d") {
            file = process.argv[3];
            reverse = true;
        }
        if (fs.existsSync(file)) {
            console.log(` * Processing ${file} ...`)
            if (reverse) {
                var outfile = file.replace(/\.cb64\.txt/,'') + ".dec.txt";
                var encodedData = fs.readFileSync(file);
                var rawdata = wtvshared.unpackCompressedB64(encodedData);
                try {
                    fs.writeFileSync(outfile, rawdata);
                    console.log(` * Successfully decoded into ${outfile}`)
                } catch (e) {
                    console.error("Error processing file:", e)
                    process.exit(1);
                }
            } else {
                var outfile = file + ".cb64.txt";
                var rawdata = fs.readFileSync(file);
                var encodedData = wtvshared.packCompressedB64(rawdata);
                try {
                    fs.writeFileSync(outfile, encodedData);
                    console.log(` * Successfully encoded into ${outfile}`)
                } catch (e) {
                    console.error("Error processing file:", e)
                    process.exit(1);
                }
            }
        } else {
            console.error(` * Could not find file ${file}`)
            showUsage();
        }
    } else {
        showUsage();
    }
} else {
    showUsage();
}