var minisrv_service_file = true;

var result = session_data.finalizePendingTransfer();
if (result) {
    var transferCanceled = new clientShowAlert({
        'image': minisrv_config.config.service_logo,
        'message': "The transfer is complete.",
        'buttonlabel1': "Login",
        'buttonaction1': "wtv-head-waiter:/login",
        'noback': true,
    }).getURL();
} else {
    var transferCanceled = new clientShowAlert({
        'image': minisrv_config.config.service_logo,
        'message': "The transfer failed.",
        'buttonlabel1': "Try to Login",
        'buttonaction1': "wtv-head-waiter:/login",
        'noback': true,
    }).getURL();
}

const errpage = wtvshared.doRedirect(transferCanceled);
headers = errpage[0];
data = errpage[1];

