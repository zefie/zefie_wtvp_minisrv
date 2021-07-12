var wtv = new WTVNetworkSecurity();
var test = CryptoJS.enc.Utf8.parse("this is a test");
var test2 = wtv.wordArrayToUint8Array(test);
var test3 = CryptoJS.lib.WordArray.create(test2);
headers = `200 OK
Connection: Close
Content-type: text/plain`

data = test3.toString(CryptoJS.enc.Utf8);