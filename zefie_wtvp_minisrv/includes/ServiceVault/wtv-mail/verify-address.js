const minisrv_service_file = true;


headers = `200 OK
Content-type: text/plain
minisrv-no-mail-count: true`

const fail = '0';
const ok = '1';

// TODO: logic to check if account exists
// All this does is some sanity checks for now
// but does not verify the account exists

if (request_headers.query.address) {
    const address_split = request_headers.query.address.split("@");
    const domain = address_split[1];
    if (domain !== "escargot.chat" && domain !== "escargot.live") data = fail
    else data = ok;
} else {
    data = fail;
}
