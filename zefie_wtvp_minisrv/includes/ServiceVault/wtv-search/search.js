minisrv_service_file = true;
request_is_async = true;

var searchUrl = minisrv_config.services[service_name].searxng_url;
if (!searchUrl.endsWith('/')) {
    searchUrl += '/';
}
searchUrl += 'search';

if (!request_headers.query.q) {
    const headers = `200 OK\nContent-Type: text/html`;
    const data = `<html>
<head>
    <title>Web Search Proxy</title>
</head>
<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff">
    <h1>WebTV Search</h1>
    <p>Please provide a search query.</p>
    <form method="POST" action="wtv-search:/search">
        <label for="q"> Query:</label>
        <input type="text" id="q" name="q" value="" size=30>
        <input type="hidden" name="safesearch" value="0">
        <input type="hidden" name="language" value="auto">
        <input type="hidden" name="time_range" value="">
        <select name="categories">
            <option value="general">General</option>
            <option value="images">Images</option>
        </select>
        <input type="submit" value="Search">
    </form>
</body>
</html>`;
    sendToClient(socket, headers, data);
} else {
    const params = new URLSearchParams();
    for (const key in request_headers.query) {
        if (request_headers.query.hasOwnProperty(key)) {
            params.append(key, request_headers.query[key]);
        }
    }
    params.append('format', 'json');
    params.append('limit', '10');
    const urlObj = new URL(searchUrl);
    const lib = urlObj.protocol === 'https:' ? https : http;
    var post_data = params.toString();
    const options = {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: parseInt(urlObj.port) || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + (urlObj.search || ''),
        method: 'POST',
        headers: {
            'User-Agent': request_headers['User-Agent'] || 'Mozilla/4.0 WebTV/2.6 (compatible; MSIE 4.0)',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(post_data),
            'Accept': 'application/json, text/plain, */*',
        }
    };
    if (urlObj.protocol === 'https:' && urlObj.hostname.includes("lan.zef")) {
        options.ca = wtvshared.getServiceDep('https/zefienetCA.pem');
    }

    fetch(lib, options, post_data)
        .then(response => response.text())
        .then(text => { process(text); })
        .catch(err => { finishPage([`Error fetching page: ${err.message}`]); });
}

function fetch(lib, options, post_data) {
    return new Promise((resolve, reject) => {
        var req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ text: () => Promise.resolve(data) }));
        }).on('error', reject);
        req.write(post_data); // 🔁 Send body
        req.end();
    });
}

function process(data) {
    if (data === "Too Many Requests") {
        sendToClient(socket, '400 SearXNG reported<br>"Too Many Requests"<br><br>Please check your limiter.toml.\nContent-Type: text/plain', 'SearXNG reported "Too Many Requests", please check your limiter.toml');
        return;
    } else {
        const results  = JSON.parse(data).results || [];
        let content = '';
        if (results.length === 0) {
            content = ['<h1>No results found</h1>'];
        } else {
            content = [];
            results.forEach(result => {
                result.title = result.title.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
                if (result.description) {
                    result.description = result.description.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
                }
                result.encodedurl = encodeURIComponent(result.url);
                if (result.thumbnail_src) {
                    result.thumbnail_src = service_name + "/imgproxy?url=" + encodeURIComponent(result.thumbnail_src);
                }

                content.push(result);
            });
        }
        finishPage(content);
        return;
    }
}

function finishPage(content) {
    const headers = `200 OK\nContent-Type: text/html`;
    nunjucks.configure({ autoescape: true });
    const data = nunjucks.render(wtvshared.getServiceDep('wtv-search/results.njk', true), { content, request_headers, service_name });
    sendToClient(socket, headers, data);
}