var minisrv_service_file = true;

var errpage = null;

var messageid = request_headers.query.message_id;
var attachment_id = request_headers.query.attachment_id;
if (!attachment_id && attachment_id != 0) errpage = wtvshared.doErrorPage(400, "Attachment ID required.");
else {
    var message = ssid_sessions[socket.ssid].mailstore.getMessageByID(messageid);
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
    fs.writeFileSync("D:\\test.jpg", data);
}