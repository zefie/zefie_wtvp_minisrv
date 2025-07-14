var minisrv_service_file = true;

var mailto = request_headers.request_url;
mailto = mailto.substring(mailto.indexOf(":") + 1);
mailto = mailto.split("?")[0];
var subject = request_headers.query.subject || "";
var body = request_headers.query.body || "";

session_data.deleteSessionData("mail_draft");
session_data.deleteSessionData("mail_draft_attachments");

// We will have to add Carbon Copy headers eventually, but we do get a pass on Blind Carbon Copy since that was never supported
headers = `302 Moved temporarily
Content-Type: text/html
wtv-expire: wtv-mail:/sendmail
Location: wtv-mail:/sendmail?message_to=${mailto}&message_subject=${subject}&message_body=${body}`;
