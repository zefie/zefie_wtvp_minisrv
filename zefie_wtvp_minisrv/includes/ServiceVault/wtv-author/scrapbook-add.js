const minisrv_service_file = true;
request_is_async = true;

function addToScrapbook(id, contentType, data) {
    const result = session_data.addToScrapbook(id, contentType, data);
    if (result) {
        const successScrapbook = new clientShowAlert({
            'image': minisrv_config.config.service_logo,
            'message': "The image has been added to your scrapbook. Would you like to view your scrapbook now?",
            'buttonlabel1': "No",
            'buttonaction1': "client:donothing",
            'buttonlabel2': "Yes",
            'buttonaction2': "wtv-author:/scrapbook",
        })
        const files = session_data.listScrapbook();
        const pageNum = Math.ceil(files.length / 6);
        if (pageNum > 1) {
            successScrapbook.buttonaction2 += '?pageNum=' + pageNum;
        }
        sendToClient(socket, {'Status': 302, 'wtv-expire-all': 'wtv-author:/scrapbook', 'Location': successScrapbook.getURL()}, '');
    } else {
        handleError('Failed to add image to scrapbook');
    }
}

function handleError(reason) {
    const errpage = wtvshared.doErrorPage(400, reason);
    sendToClient(socket, errpage[0], errpage[1]);
}
if (!request_headers.query.mediaData && !request_headers.query.mediaPath) {
    const errpage = wtvshared.doErrorPage(400, "Bad Request", "Missing mediaData or mediaPath parameter.");
    headers = errpage[0];
    data = errpage[1];    
} else {
    const id = session_data.getFreeScrapbookID();
    if (request_headers.query.mediaPath) {
        if (!request_headers.query.confirm) {
            const confirmScrapbook = new clientShowAlert({
                'image': minisrv_config.config.service_logo,
                'message': "You are about to add an image to your scrapbook.<br><br>Do you wish to continue?",
                'buttonlabel1': "Continue",
                'buttonaction1': "wtv-author:/scrapbook-add?confirm=true&mediaPath=" + encodeURIComponent(request_headers.query.mediaPath || ''),
                'buttonlabel2': "Cancel",
                'buttonaction2': "client:donothing"
            }).getURL();
            sendToClient(socket, {'Status': 302, 'Location': confirmScrapbook}, '');
        } else {
            function isValidImageType(contentType, url) {
                // Check content-type header or file extension
                if (contentType) {
                    return contentType === 'image/jpeg' || contentType == 'image/jpg' || contentType === 'image/gif';
                }
                return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.gif');
            }

            try {
                const parsedUrl = new URL(request_headers.query.mediaPath);
                const protocol = parsedUrl.protocol === 'https:' ? https : http;

                protocol.get(request_headers.query.mediaPath, (res) => {
                    if (res.statusCode !== 200) {
                        handleError('URL does not exist or returned status ' + res.statusCode);
                        res.resume();
                        return;
                    }

                    const contentType = res.headers['content-type'];
                    const contentLength = parseInt(res.headers['content-length'], 10);

                    if (!isValidImageType(contentType, request_headers.query.mediaPath)) {
                        handleError('URL is not a JPEG or GIF image');
                        res.resume();
                        return;
                    }

                    if (contentLength && contentLength > 1024 * 1024 * 4) {
                        handleError('Image is larger than 4MB');
                        res.resume();
                        return;
                    }

                    let data = [];
                    let totalLength = 0;
                    res.on('data', (chunk) => {
                        totalLength += chunk.length;
                        if (totalLength > 1024 * 1024 * 4) {
                            handleError('Image is larger than 4MB');
                            res.destroy();
                            return;
                        }
                        data.push(chunk);
                    });

                    res.on('end', () => {
                        if (totalLength > 1024 * 1024 * 4) return;
                        if (totalLength > 1024 * 1024) {
                            sharp(Buffer.concat(data))
                                .resize(640, 480, {
                                    fit: 'inside',
                                    withoutEnlargement: true
                                })
                                .jpeg({ quality: 75 })
                                .toBuffer()
                                .then(resizedBuffer => {
                                    data = resizedBuffer;
                                    addToScrapbook(id, "image/jpg", data);
                                })
                                .catch(err => {
                                    handleError('Failed to resize image');
                                    return;
                                });
                        } else {
                            data = Buffer.concat(data);
                            addToScrapbook(id, contentType, data);
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
    } else {
        const result = session_data.addToScrapbook(id, "image/jpg", request_headers.query.mediaData);
        if (result) {
            headers = `300 OK
Content-Type: text/html
wtv-expire-all: wtv-author:/scrapbook
Location: wtv-author:/scrapbook
wtv-visit: wtv-author:/scrapbook`;
        } else {
            handleError('Failed to add image to scrapbook');
        }
    }
}