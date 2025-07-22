minisrv_service_file = true;
request_is_async = true;

const proxyUrl = minisrv_config.services['wtv-proxy'].wrp_url;
if (!proxyUrl.endsWith('/')) {
    proxyUrl += '/';
}
// Remove 'wtv-proxy:/' from the start of request_url
let forwardPath = request_headers.request_url.replace(/^wtv-proxy:\//, '');

// Build the full URL to forward to
var targetUrl = proxyUrl + forwardPath;

// Forward the request using http(s) module
const urlObj = new URL(targetUrl);
const lib = urlObj.protocol === 'https:' ? https : http;

coords = request_headers.request_url.split("?")[1];
if (!coords) {
    coords = '0,0'
}

console.log(`Forwarding request to ${targetUrl} with coordinates ${coords}`);
targetUrl += `?${coords}`; // Append coordinates to the target URL

lib.get(targetUrl, (res) => {
    let headers = `200 OK\n`;
    // Copy content-type if present
    if (res.headers['content-type']) {
        headers += `Content-Type: ${res.headers['content-type']}\n`;
    }
    // Optionally copy other headers as needed

    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (data.startsWith('<HTML')) {
            // success page
            // Find all <a href="..."><img src="..."></a> and extract the URLs
            const aHrefMatch = data.match(/<a\s+href="([^"]+)"/i);
            const imgSrcMatch = data.match(/<img\s+src="([^"]+)"/i);
            const links = [];
            if (aHrefMatch && imgSrcMatch) {
                links.push({
                    href: aHrefMatch[1],
                    img: imgSrcMatch[1]
                });
            }
            var proxy_id = links[0].href.replace(/\/map\//, '');
            proxy_id = proxy_id.replace(/\.map/, '');
            var imgExt = links[0].img.split('.').pop().split('?')[0].toLowerCase();
            const urlInputMatch = data.match(/<input[^>]+type=["']text["'][^>]+name=["']url["'][^>]+value=["']([^"']+)["']/i);
            let pageUrl = '';
            if (urlInputMatch) {
                pageUrl = urlInputMatch[1];
            }
            var redirectUrl = `wtv-proxy:/proxy?id=${proxy_id}&t=${imgExt}&url=${encodeURIComponent(pageUrl)}`;
            sendToClient(socket, {'Status': 302, 'Location': redirectUrl}, '');
        } else {
            var idx = data.indexOf('<BR>');
            data = data.substring(0, idx);
            var redirectUrl = `wtv-proxy:/proxy?err=${escape(data)}`;
            sendToClient(socket, {'Status': 302, 'Location': redirectUrl}, '');
        }
    });
}).on('error', err => {
    sendToClient(socket, '200 OK\nContent-Type: text/plain', `Error fetching image: ${err.message}`);
});