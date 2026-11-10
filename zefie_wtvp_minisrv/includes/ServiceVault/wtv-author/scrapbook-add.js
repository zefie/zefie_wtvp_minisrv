const minisrv_service_file = true;
request_is_async = true;

// FIXED 2026-11-10 (see CHANGES.txt):
// - This file is async (request_is_async = true), so it must answer with
//   sendToClient() on every path. Two paths set headers/data instead and
//   returned, so the client hung until the socket timed out.
// - handleError() could fire twice for one request (e.g. oversize, then
//   the stream 'error' event). It now sends once.
// - ?confirm=false used to fetch anyway ("false" is a truthy string).
// - The server fetched any user-supplied URL with no timeout and no
//   private-IP block (SSRF: it could be made to fetch 127.0.0.1 / LAN
//   hosts). Now http/https only, literal private/loopback/link-local
//   hosts and localhost are rejected, and the fetch times out in 15s.
// - isValidImageType() could throw on an array mediaPath, and the
//   extension check was case-sensitive (.JPG failed).

let responded = false;

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
    if (responded) return;
    responded = true;
    const errpage = wtvshared.doErrorPage(400, reason);
    sendToClient(socket, errpage[0], errpage[1]);
}

function isPrivateHost(host) {
    const h = (host || "").toLowerCase().replace(/^\[|\]$/g, '');
    if (h === "localhost" || h === "::1") return true;
    const parts = h.split('.');
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
        const a = parseInt(parts[0], 10), b = parseInt(parts[1], 10);
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 169 && b === 254) return true;
    }
    return false;
}

const mediaPath = Array.isArray(request_headers.query.mediaPath)
    ? request_headers.query.mediaPath[0]
    : request_headers.query.mediaPath;
if (!request_headers.query.mediaData && !mediaPath) {
    handleError("Missing mediaData or mediaPath parameter.");
} else {
    const id = session_data.getFreeScrapbookID();
    if (mediaPath) {
        if (request_headers.query.confirm !== 'true') {
            const confirmScrapbook = new clientShowAlert({
                'image': minisrv_config.config.service_logo,
                'message': "You are about to add an image to your scrapbook.<br><br>Do you wish to continue?",
                'buttonlabel1': "Continue",
                'buttonaction1': "wtv-author:/scrapbook-add?confirm=true&mediaPath=" + wtvshared.escape(mediaPath || ''),
                'buttonlabel2': "Cancel",
                'buttonaction2': "client:donothing"
            }).getURL();
            sendToClient(socket, {'Status': 302, 'Location': confirmScrapbook}, '');
        } else {
            function isValidImageType(contentType, url) {
                // Check content-type header or file extension
                if (contentType) {
                    const ct = String(contentType).toLowerCase().split(';')[0].trim();
                    return ct === 'image/jpeg' || ct === 'image/jpg' || ct === 'image/gif';
                }
                const u = String(url || "").toLowerCase();
                return u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.gif');
            }

            try {
                const parsedUrl = new URL(mediaPath);
                if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                    throw new Error('Only http and https URLs are allowed.');
                }
                if (isPrivateHost(parsedUrl.hostname)) {
                    throw new Error('That URL points at a private address.');
                }
                const protocol = parsedUrl.protocol === 'https:' ? https : http;

                const req = protocol.get(mediaPath, (res) => {
                    if (res.statusCode !== 200) {
                        handleError('URL does not exist or returned status ' + res.statusCode);
                        res.resume();
                        return;
                    }

                    const contentType = res.headers['content-type'];
                    const contentLength = parseInt(res.headers['content-length'], 10);

                    if (!isValidImageType(contentType, mediaPath)) {
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
                });
                req.setTimeout(15000, () => {
                    req.destroy();
                    handleError('Fetching the image timed out.');
                });
                req.on('error', (err) => {
                    handleError('Failed to fetch URL');
                });
            } catch (e) {
                handleError(e.message);
            }
        }
    } else {
        const result = session_data.addToScrapbook(id, "image/jpg", request_headers.query.mediaData);
        if (result) {
            // FIX: was headers/data on an async script, so this response
            // was never delivered. Answer with sendToClient like the
            // other success path.
            sendToClient(socket, {'Status': 302, 'wtv-expire-all': 'wtv-author:/scrapbook', 'Location': 'wtv-author:/scrapbook', 'wtv-visit': 'wtv-author:/scrapbook'}, '');
        } else {
            handleError('Failed to add image to scrapbook');
        }
    }
}
