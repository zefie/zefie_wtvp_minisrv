const process = require('process');
const fs = require('fs');
const path = require('path');
const classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
const { WTVShared, clientShowAlert } = require(classPath + "/WTVShared.js");
const WTVTellyScript = require(classPath + "/WTVTellyScript.js")
//const bf0app = classPath + "/../ServiceDeps/wtv-1800/tellyscripts/bf0app/bf0app_WTV_18006138199.tok"
//const tokened = fs.readFileSync(bf0app);
const LC2 = classPath + "/../ServiceDeps/wtv-1800/tellyscripts/LC2/LC2.prereg.template.txt";
const tokened = fs.readFileSync(LC2);
console.log("OGTOK:", tokened)
var token = new WTVTellyScript(tokened, 2);
console.log("OGTOK Header:", token.packed_header); 
token.setTemplateVars("Test", 5736666, "192.168.11.1", "8.8.8.8");
console.log(token.raw_data);
token.tokenize();
token.pack();
token.minify();

