minisrv_service_file = true;
request_is_async = true;

proxyUrl = minisrv_config.services[service_name].wrp_url;
if (!proxyUrl.endsWith('/')) {
    proxyUrl += '/';
}

if (!request_headers.query.url) {
    headers = `200 OK
Content-Type: text/html`;
    data = `
<html>
<head>
    <title>Web Rendering Proxy</title>
</head>
<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff">
    <h1>Web Rendering Proxy</h1>
    <p>Welcome to the Web Rendering Proxy.<br>Please provide a valid URL to render.</p>
    <form method="POST" action="wtv-proxy:/proxy">
        <label for="url"> URL:</label>
        <input type="text" id="url" name="url" value="https://" size=38>
        <input type="hidden" name="z" value="1.0">
        <input type="hidden" name="t" value="jpg">
        <input type="hidden" name="c" value="256">
        <input type="hidden" name="m" value="ismap">
        <input type="submit" value="Go">
    </form>
</body>
</html>`
    sendToClient(socket, headers, data);
} else {
    if (request_headers.query.err) {
        finishPage(`<h1>Error</h1><p>${request_headers.query.err}</p>`).join('<br>');
    } else {
        const params = new URLSearchParams({
            url: request_headers.query.url,
            z: request_headers.query.z || '1.0',
            t: request_headers.query.t || 'jpg',
            c: request_headers.query.c || '256',
            m: request_headers.query.m || 'ismap'
        });
        const fullUrl = proxyUrl + '?' + params.toString();
        const urlObj = new URL(fullUrl);
        const lib = urlObj.protocol === 'https:' ? https : http;
        if (request_headers.query.id) {
            finishPage(`<a href="/map/${request_headers.query.id}.map"><img src="/img/${request_headers.query.id}.${params.get('t')}" ISMAP></a>`);
        } else {
            function fetch(url) {
                return new Promise((resolve, reject) => {
                    lib.get(url, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => resolve({ text: () => Promise.resolve(data) }));
                    }).on('error', reject);
                });
            }
            fetch(fullUrl)
                .then(response => response.text())
                .then(text => { process(text); })
                .catch(err => { finishPage(`Error fetching page: ${err.message}`); });
        }
    }
}


function process(content) {
    if (content.startsWith('<HTML')) {
        // success page
        // Find all <a href="..."><img src="..."></a> and extract the URLs
        const aHrefMatch = content.match(/<a\s+href="([^"]+)"/i);
        const imgSrcMatch = content.match(/<img\s+src="([^"]+)"/i);
        const links = [];
        if (aHrefMatch && imgSrcMatch) {
            links.push({
                href: aHrefMatch[1],
                img: imgSrcMatch[1]
            });
        }
        finishPage(links.map(link => `<a href="${link.href}"><img src="${link.img}" ISMAP></a>`).join('<br>'));
        // You can now use the `links` array as needed

    } else {
        var idx = content.indexOf('<BR>');
        content = content.substring(0, idx);
        finishPage(content);
    }
}

function finishPage(content) {
    headers = `200 OK
Content-Type: text/html`;
    data = `
<html>
<head>
    <title>Web Rendering Proxy</title>
</head>
<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff">
    <form method="POST" action="wtv-proxy:/proxy">
        <label for="url">URL:</label>
        <input type="text" id="url" name="url" value="${request_headers.query.url}" size=30>
        <input type="hidden" name="z" value="${request_headers.query.z || '1.0'}">
        <input type="hidden" name="t" value="${request_headers.query.t || 'jpg'}">
        <input type="hidden" name="c" value="${request_headers.query.c || '216'}">
        <input type="submit" value="Go">
        <input type="submit" name="Fn" value="Bk">
        <input type="submit" name="Fn" value="Re">
        <hr>
        ${content}
    </form>
<hr>
<center>
<a href="/proxy">Start Over</a>
</center>
</body>
</html>`;
    sendToClient(socket, headers, data);
}