const minisrv_service_file = true;

let errpage, message;
const messageid = request_headers.query.message_id;
const attachment_id = request_headers.query.attachment_id;
if (!attachment_id && attachment_id != 0) errpage = wtvshared.doErrorPage(400, "Attachment ID required.");
else {
    message = session_data.mailstore.getMessageByID(messageid);
    if (!message) errpage = wtvshared.doErrorPage(400, "Invalid Message ID");
    else {
        if (!message.attachments) message.attachments = []; // backwards compat
        if (attachment_id > message.attachments.length) errpage = wtvshared.doErrorPage(400, "Invalid Attachment ID");       
    }
}

if (!errpage) {
    headers = `200 OK
Content-Type: ${message.attachments[attachment_id]['Content-Type']}`;
    data = new Buffer.from(message.attachments[attachment_id]['data'], 'base64');
}