minisrv_service_file = true;
request_is_async = true;

const proxyUrl = minisrv_config.services[service_name].wrp_url;
if (!proxyUrl.endsWith('/')) {
    proxyUrl += '/';
}

// Remove 'service_name:/' from the start of request_url
let forwardPath = request_headers.request_url
    .replace(new RegExp(`^${service_name}:\\/`), '');

// Build the full URL to forward to
const targetUrl = proxyUrl + forwardPath;

// Forward the request using http(s) module
const urlObj = new URL(targetUrl);
const lib = urlObj.protocol === 'https:' ? https : http;

lib.get(targetUrl, (res) => {
    let headers = `200 OK\n`;
    // Copy content-type if present
    if (res.headers['content-type']) {
        headers += `Content-Type: ${res.headers['content-type']}\n`;
    }

    let data = [];
    res.on('data', chunk => data.push(chunk));
    res.on('end', () => {
        sendToClient(socket, headers, Buffer.concat(data));
    });
}).on('error', err => {
    var errpage = WTVShared.doErrorPage(400, 'Error fetching image', err.message);
    sendToClient(socket, errpage[0], errpage[1]);
});