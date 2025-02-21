const process = require('process');
const fs = require('fs');
const path = require('path');
const classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
const { WTVShared, clientShowAlert } = require(classPath + "/WTVShared.js");
const WTVTellyScript = require(classPath + "/WTVTellyScript.js")

//const LC2 = classPath + "/../ServiceDeps/wtv-1800/tellyscripts/LC2/LC2_WTV_18006138199.tok";
//const prereg = fs.readFileSync(LC2);

//const LC2OISP = classPath + "/../ServiceDeps/wtv-1800/tellyscripts/LC2/LC2_OpenISP_56k.tok";
//const isp = fs.readFileSync(LC2OISP);

//console.log("OGTOK:", tokened)
bf0 = fs.readFileSync(classPath + "/../ServiceDeps/wtv-1800/tellyscripts/bf0app/bf0app_OISP.tok")
var token = new WTVTellyScript(bf0);
//var token2 = new WTVTellyScript(isp);
console.log("OGTOK Header:", token.packed_header);
console.log(token.raw_data)
//console.log("OGTOK Header:", token2.packed_header);


