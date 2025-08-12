const minisrv_service_file = true;
request_is_async = true;

let proxyUrl = minisrv_config.services[service_name].wrp_url;
if (!proxyUrl.endsWith('/')) {
    proxyUrl += '/';
}

// Remove 'service_name:/' from the start of request_url
const forwardPath = request_headers.request_url
    .replace(new RegExp(`^${service_name}:\\/`), '');

// Build the full URL to forward to
let targetUrl = proxyUrl + forwardPath;

// Forward the request using http(s) module
const urlObj = new URL(targetUrl);
const lib = urlObj.protocol === 'https:' ? https : http;

let coords = request_headers.request_url.split("?")[1];
if (!coords) {
    coords = '0,0'
}

targetUrl += `?${coords}`; // Append coordinates to the target URL

lib.get(targetUrl, (res) => {
    let headers = `200 OK\n`;
    // Copy content-type if present
    if (res.headers['content-type']) {
        headers += `Content-Type: ${res.headers['content-type']}\n`;
    }

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
            let proxy_id = links[0].href.replace(/\/map\//, '');
            proxy_id = proxy_id.replace(/\.map/, '');
            const imgExt = links[0].img.split('.').pop().split('?')[0].toLowerCase();
            const urlInputMatch = data.match(/<input[^>]+type=["']text["'][^>]+name=["']url["'][^>]+value=["']([^"']+)["']/i);
            let pageUrl = '';
            if (urlInputMatch) {
                pageUrl = urlInputMatch[1];
            }
            const redirectUrl = `${service_name}:/proxy?id=${proxy_id}&t=${imgExt}&url=${encodeURIComponent(pageUrl)}`;
            sendToClient(socket, {'Status': 302, 'Location': redirectUrl}, '');
        } else {
            const idx = data.indexOf('<BR>');
            data = data.slice(0, idx);
            const redirectUrl = `${service_name}:/proxy?err=${encodeURIComponent(data)}`;
            sendToClient(socket, {'Status': 302, 'Location': redirectUrl}, '');
        }
    });
}).on('error', err => {
    sendToClient(socket, '200 OK\nContent-Type: text/plain', `Error fetching image: ${err.message}`);
});