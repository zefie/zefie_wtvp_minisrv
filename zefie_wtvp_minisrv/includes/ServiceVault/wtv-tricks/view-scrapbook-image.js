const minisrv_service_file = true;
request_is_async = true;

function handleError(reason) {
    const errpage = wtvshared.doErrorPage(400, reason);
    sendToClient(socket,  errpage[0], errpage[1]);
}

async function handleImage() {
    if (!request_headers.query.id) {
        handleError('No image ID specified');
    } else {
        data = session_data.getScrapbookImage(request_headers.query.id);
        if (!data) {
            handleError('Image not found');
        } else {
            try {
                if (request_headers.query.width) {
                    // Scale the image to the specified width without losing aspect ratio, without using wtvshared
                    const width = parseInt(request_headers.query.width, 10);
                    data = await sharp(data).resize({ width, withoutEnlargement: true }).toBuffer();
                }
                headers = `200 OK
Content-Type: ${session_data.getScrapbookImageType(request_headers.query.id)}
Content-Length: ${data.length}`
                sendToClient(socket, headers, data);
            } catch (error) {
                handleError('Error processing image');
                console.error('Image processing error:', error);
            }
        }
    }
}

handleImage();