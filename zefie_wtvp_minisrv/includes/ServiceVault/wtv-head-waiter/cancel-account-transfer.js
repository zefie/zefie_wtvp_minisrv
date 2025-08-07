var minisrv_service_file = true;

var ssid = session_data.cancelPendingTransfer();
var transferCanceled = new clientShowAlert({
    'image': minisrv_config.config.service_logo,
    'message': "The transfer of this account to <b>" + ssid + "</b> has been cancelled.",
    'buttonlabel1': "Okay",
    'buttonaction1': "wtv-head-waiter:/login",
    'noback': true,
}).getURL();
const errpage = wtvshared.doRedirect(transferCanceled);
headers = errpage[0];
data = errpage[1];
