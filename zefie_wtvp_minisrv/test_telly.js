const process = require('process');
const fs = require('fs');
const path = require('path');
const classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
const { WTVShared, clientShowAlert } = require(classPath + "/WTVShared.js");
const WTVTellyScript = require(classPath + "/WTVTellyScript.js")

//const bf0app = classPath + "/../ServiceDeps/wtv-1800/tellyscripts/bf0app/bf0app_WTV_18006138199.tok"
//const tokened = fs.readFileSync(bf0app);

const LC2 = classPath + "/../ServiceDeps/wtv-1800/tellyscripts/LC2/LC2_WTV_18006138199.tok";
const tokened = fs.readFileSync(LC2);

console.log("OGTOK:", tokened)
var token = new WTVTellyScript(tokened);
console.log("OGTOK Header:", token.packed_header);

token.raw_data = token.raw_data.replaceAll("zefie", "testing");
token.tokenize();
retok = token.pack()

retok = Buffer.from(retok)
console.log("Retok:", retok)
	
var token2 = new WTVTellyScript(retok);


console.log("Retok Header:", token2.packed_header);
console.log("Retok detok:", token2.raw_data);
