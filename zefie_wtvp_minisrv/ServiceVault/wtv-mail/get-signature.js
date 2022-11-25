var minisrv_service_file = true;

var errpage = null;

var messageid = request_headers.query.message_id || null;
if (!messageid) {
    // get user signature
    data = session_data.getSessionData("subscriber_signature");   
} else {
    // get message signature
    var message = session_data.mailstore.getMessageByID(messageid);
    if (!message) errpage = wtvshared.doErrorPage(400, "Invalid Message ID");
    data = message.signature;
}

if (request_headers.query.sanitize) {
    if (!data) data = '';
    var message_colors = session_data.mailstore.getSignatureColors(data)

    if (data.indexOf("<html>") >= 0) {
        data = wtvshared.sanitizeSignature(data).replace("<html>", `<html><body bgcolor=${message_colors.bgcolor} text=${message_colors.text} link=${message_colors.link} vlink=${message_colors.vlink} vspace=0 hspace=0>`);
    } else {
        data = `<body bgcolor=${message_colors.bgcolor} text=${message_colors.text} link=${message_colors.link} vlink=${message_colors.vlink} vspace=0 hspace=0>\n${wtvshared.sanitizeSignature(data)}`;
    }
    if (request_headers.query.showdemotext) {
        data += `<br>
<hr>This is a preview of your signature. The text below the line will not appear in your outgoing messages. 
It is provided to demonstrate what a message composed with this signature may look like.
<a href="client:donothing">This is what a link looks like</a>`;
    }
}
if (!errpage) {
    headers = `200 OK
wtv-trusted: false
Content-Type: text/html`
} 