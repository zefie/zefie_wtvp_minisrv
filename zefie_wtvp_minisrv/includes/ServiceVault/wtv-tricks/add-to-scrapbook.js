var minisrv_service_file = true;
var request_is_async = true;


function handleError(reason) {
    var errpage = wtvshared.doErrorPage(400, reason);
    sendToClient(socket, errpage[0], errpage[1]);
}

if (!request_headers.query.url) {
    handleError('No URL provided');
} else {
    var url = request_headers.query.url;
    function isValidImageType(contentType, url) {
        // Check content-type header or file extension
        if (contentType) {
            return contentType === 'image/jpeg' || contentType == 'image/jpg' || contentType === 'image/gif';
        }
        return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.gif');
    }

    try {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        protocol.get(url, (res) => {
            if (res.statusCode !== 200) {
                handleError('URL does not exist or returned status ' + res.statusCode);
                res.resume();
                return;
            }

            const contentType = res.headers['content-type'];
            const contentLength = parseInt(res.headers['content-length'], 10);

            if (!isValidImageType(contentType, url)) {
                handleError('URL is not a JPEG or GIF image');
                res.resume();
                return;
            }

            if (contentLength && contentLength > 1024 * 1024) {
                handleError('Image is larger than 1MB');
                res.resume();
                return;
            }

            let data = [];
            let totalLength = 0;
            res.on('data', (chunk) => {
                totalLength += chunk.length;
                if (totalLength > 1024 * 1024) {
                    handleError('Image is larger than 1MB');
                    res.destroy();
                    return;
                }
                data.push(chunk);
            });

            res.on('end', () => {
                if (totalLength > 1024 * 1024) return;
                data = Buffer.concat(data);
                var id = session_data.pagestore.getFreeScrapbookID();
                var result = session_data.pagestore.addToScrapbook(id, contentType, data);
                if (result) {
                    var successScrapbook = new clientShowAlert({
                        'image': minisrv_config.config.service_logo,
                        'message': "The image has been added to your scrapbook. Would you like to view your scrapbook now?",
                        'buttonlabel1': "No",
                        'buttonaction1': "client:donothing",
                        'buttonlabel2': "Yes",
                        'buttonaction2': "wtv-author:/scrapbook",
                    }).getURL();
                    sendToClient(socket, {'Status': 302, 'Location': successScrapbook, 'wtv-visit': successScrapbook}, '');
                } else {
                    handleError('Failed to add image to scrapbook');
                }
            });

            res.on('error', (err) => {
                handleError('Error downloading image');
            });
        }).on('error', (err) => {
            handleError('Failed to fetch URL');
        });
    } catch (e) {
        handleError(e.message);
    }
}