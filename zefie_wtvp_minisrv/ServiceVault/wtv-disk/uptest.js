const WTVDownloadList = require("./WTVDownloadList.js");
var wtvdl = new WTVDownloadList(minisrv_config);
if (request_headers['wtv-request-type'] == 'download') {
    console.log(request_headers.post_data.toString(CryptoJS.enc.Latin1));
    wtvdl.reset();
    var froot = "file://disk/Demo/";
    var fget = [
        "attract.mpg",
        "can-you-hear.mpg",
        "explore.mpg",
        "hear.html",
        "index.html",
        "menu1.html",
        "menu2.html",
        "menu3.html",
        "menu4.html",
        "service.html",
        "splash-mits.mpg",
        "splash-phil.mpg",
        "splash-sony.mpg",
        "splash1.html",
        "splash2.html",
        "splash3.html",
        "what-is-it.html",
        "what-is-it.mpg",
        "what-others.html",
        "what-others.mpg",
        "whats-in-it.html",
        "whats-in-it.mpg",
        "whats-in-it.mpg.old"
    ];

    Object.keys(fget).forEach(function (k) {
        wtvdl.putUserStore(froot + fget[k]);
    });
    headers = "200 OK\nContent-type: " + wtvdl.content_type;
    data = wtvdl.getDownloadList();
    console.log(data);
} else {
    headers = "200 OK\nContent-type: text/html";
    var success_url = new clientShowAlert({
        'image': minisrv_config.config.service_logo,
        'message': "Upload successful!",
        'buttonlabel1': "Okay",
        'buttonaction1': "client:goback",
        'noback': true,
    }).getURL();

    var fail_url = new clientShowAlert({
        'image': minisrv_config.config.service_logo,
        'message': "Upload failed...",
        'buttonlabel1': "Okay...",
        'buttonaction1': "client:goback",
        'noback': true,
    }).getURL();
    data = wtvdl.getSyncPage("Testing", "UploadTest", null, "Your receiver is uploading files.", "Sending files", null, success_url, fail_url, "wtv-disk:/uptest");
}