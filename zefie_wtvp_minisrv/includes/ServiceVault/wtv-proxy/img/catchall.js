minisrv_service_file = true;
request_is_async = true;

const proxyUrl = minisrv_config.services['wtv-proxy'].wrp_url;
if (!proxyUrl.endsWith('/')) {
    proxyUrl += '/';
}
// Remove 'wtv-proxy:/' from the start of request_url
let forwardPath = request_headers.request_url.replace(/^wtv-proxy:\//, '');

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
    // Optionally copy other headers as needed

    let data = [];
    res.on('data', chunk => data.push(chunk));
    res.on('end', () => {
        sendToClient(socket, headers, Buffer.concat(data));
    });
}).on('error', err => {
    sendToClient(socket, '200 OK\nContent-Type: text/plain', `Error fetching image: ${err.message}`);
});