var minisrv_service_file = true;


headers = `200 OK
Content-type: text/plain
minisrv-no-mail-count: true`

var fail = '0';
var ok = '1';

// TODO: logic to check if account exists
// All this does is some sanity checks for now
// but does not verify the account exists

if (request_headers.query.address) {
    var address_split = request_headers.query.address.split("@");
    var domain = address_split[1];
    if (domain != "escargot.chat" && domain != "escargot.live") data = fail
    else data = ok;
} else {
    data = fail;
}
