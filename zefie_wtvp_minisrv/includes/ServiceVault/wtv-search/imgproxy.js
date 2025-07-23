minisrv_service_file = true;
request_is_async = true;



async function handleRequest(request_headers) {
    const imageUrl = request_headers.query.url;
    if (!imageUrl) {
        var errpage = wtvshared.doErrorPage(400, "Missing url parameter");
        sendToClient(socket, errpage[0], errpage[1]);
        return;
    }

    try {
        const urlObj = new URL(imageUrl);
        const lib = urlObj.protocol === 'https:' ? https : http;
        const fetch = (lib, options) => new Promise((resolve, reject) => {
            const req = lib.request(imageUrl, options, (res) => {
                let data = [];
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => {
                    res.buffer = async () => Buffer.concat(data);
                    res.ok = res.statusCode >= 200 && res.statusCode < 300;
                    resolve(res);
                });
            });
            req.on('error', reject);
            req.end();
        });
        const imgRes = await fetch(lib, { method: 'GET', headers: { 'User-Agent': 'Mozilla/4.0 WebTV/2.6 (compatible; MSIE 4.0)' } });
        if (!imgRes.ok) {
            var errpage = wtvshared.doErrorPage(502, "Failed to fetch image");
            sendToClient(socket, errpage[0], errpage[1]);
            return;
        }
        const imgBuffer = await imgRes.buffer();

        const resized = await sharp(imgBuffer)
            .resize(50, 50, { fit: 'inside' })
            .toBuffer();

        headers = `200 OK
Content-Type: image/png`;
        data = resized;
        sendToClient(socket, headers, data);
    } catch (err) {
        var errpage = wtvshared.doErrorPage(500, "Error processing image: " + err.message);
        sendToClient(socket, errpage[0], errpage[1]);
    }
}

handleRequest(request_headers);

// Example usage: handleRequest(request_headers, response);