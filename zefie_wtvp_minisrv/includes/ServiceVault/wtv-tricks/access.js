const minisrv_service_file = true;

if (wtvshared.shenanigans.checkShenanigan(wtvshared.shenanigans.shenanigans.ENABLE_TRICKS_URLACCESS)) {
    // Allow URL access outside our trusted minisrv
    let url;
    if (request_headers.query.url) url = request_headers.query.url;
    else url = "client:showalert?message=Please%20provide%20a%20%3Furl%3D%20with%20the%20url%20you%20would%20like%20to%20access.&buttonlabel1=Okay&buttonacction1=client:donothing"

    headers = `300 OK
wtv-visit: ${url}
Location: ${url}
Content-type: text/html`
} else {
    const err = wtvshared.doErrorPage(403, "Access Denied");
    headers = err[0];
    data = err[1];
}