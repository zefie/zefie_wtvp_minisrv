var minisrv_service_file = true;

var mailstore_exists = false;

function mail_end_error(msg) {
    var errpage = wtvshared.doErrorPage("400", msg);
    headers = errpage[0];
    data = errpage[1];
}

var intro_seen = session_data.mailstore.checkMailIntroSeen();
if (!intro_seen && !request_headers.query.intro_seen) {
    // user is trying to bypass the intro screen
    headers = "300 OK\nLocation: wtv-mail:/DiplomaMail";
} else {
    if (!intro_seen && request_headers.query.intro_seen) {
        // User has come from intro 
        session_data.mailstore.setMailIntroSeen(true);
    }
    // check if mailstore exista
    mailstore_exists = session_data.mailstore.mailstoreExists();

    // create mailstore if it doesnt exist
    if (!mailstore_exists) mailstore_exists = session_data.mailstore.createMailstore();

    if (mailstore_exists) {
        // mailstore exists

        var default_limit = (minisrv_config.services[service_name].messages_per_page) ? minisrv_config.services[service_name].messages_per_page : 25; // user config or 25
        var mailbox = (request_headers.query.mailbox) ? parseInt(request_headers.query.mailbox) : 0;
        var limit = (request_headers.query.limit) ? parseInt(request_headers.query.limit) : default_limit;
        var reverse_sort = (request_headers.query.reverse_sort) ? true : false;
        var page = (request_headers.query.page) ? parseInt(request_headers.query.page) : 0;

        // get mailbox name
        var mailbox_name = session_data.mailstore.getMailboxById(parseInt(mailbox));

        // if false or null, then mailbox is invalid
        if (!mailbox_name) {
            mail_end_error("Invalid Mailbox ID");
        } else {
            // mailboxid is ok
            if (!session_data.mailstore.mailboxExists(mailbox)) {
                // mailbox does not yet exist, create it
                var mailbox_exists = session_data.mailstore.createMailbox(mailbox);
                if (!mailbox_exists) {
                    // failed to create mailbox for some reason
                    mail_end_error();
                } else {
                    if (mailbox === 0) {
                        // Just created Inbox for the first time, so create the welcome message
                        session_data.mailstore.createWelcomeMessage();
                    }
                }
            }
            var message_list = session_data.mailstore.listMessages(mailbox, limit, reverse_sort, (page * limit))
            var total_message_count = session_data.mailstore.countMessages(mailbox);
            var total_unread_message_count = session_data.mailstore.countUnreadMessages(mailbox);

            var message_list_string = null;
            if (total_message_count == 0) {
                message_list_string = "No new mail messages for ";
            } else {
                if (total_unread_message_count > 0) {
                    message_list_string = total_unread_message_count + " new mail message" + ((total_message_count != 1) ? 's' : '');
                    if (total_message_count - total_unread_message_count > 0) message_list_string += ", " + (total_message_count - total_unread_message_count) + " mail message" + (((total_message_count - total_unread_message_count) != 1) ? 's' : '') + " for ";
                } else {                   
                    message_list_string = total_message_count + " mail message" + ((total_message_count != 1) ? 's' : '') + " for ";
                }
            }

            var username = session_data.getSessionData("subscriber_username");
            var notImplementedAlert = new clientShowAlert({
                'image': minisrv_config.config.service_logo,
                'message': "This feature is not available.",
                'buttonlabel1': "Okay",
                'buttonaction1': "client:donothing",
                'noback': true,
            }).getURL();

            headers = `200 OK
Content-type: text/html`;

            data = `<sendpanel action="wtv-mail:/sendmail"
message="Write a new e-mail message"
label="Write">
<savepanel
action="wtv-mail:/listmail?mailbox_name=mbox"
message="View your saved e-mail messages"
label="View saved e-mail messages">
<HTML>
<head>
<title>${(mailbox_name === "Inbox") ? ' Mail list for ' + username : mailbox_name}   
</title>
</head>
<body bgcolor="#171726" text="#82A9D9" link="#BDA73A" vlink="#7A9FCC" fontsize="medium" vspace=0 hspace=0>
<sidebar width=109>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=104 height=420 bgcolor=#262E3D valign=top>
<table cellspacing=0 cellpadding=0>
<tr>
<td height=7 colspan=3>
<spacer type=vertical size=7>
<tr>
<td width=7>
<spacer type=horizontal size=7>
<td width=87 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<td width=10>
<spacer type=horizontal size=10>
</table>
<spacer type=vertical size=6>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="wtv-mail:/sendmail"
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Write</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="${notImplementedAlert}"
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Storage</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="wtv-mail:/addressbook"
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Addresses</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="${notImplementedAlert}"
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Clean up</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
</table>
<table width=109 cellspacing=0 cellpadding=0>
<tr>
<p>&nbsp;<p>
<br><spacer type=vertical size=2>
<tr>
<td valign=bottom bgcolor=#262E3D>
<table cellspacing=9><tr><td>
<font size=-1 color=#E6CD4A>Quick Tip:</font>
<spacer type=vertical size=5>
<!-- <a href="wtv-guide:/help?topic=Mail&subtopic=KnownTip"> -->
<div>
<img height=10 width=10 src="wtv-mail:/content/images/sidebardot.gif">
<font size=-1 color=#E6CD4A>indicates messages from known senders</div></font></td></tr></table>
<!-- </a> -->
</table>
<td width=5 bgcolor=#5B6C81>
</table>
</sidebar>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=451 colspan=2 align=center bgcolor=#5B6C81>
<spacer type=vertical size=13>
<tr>
<td height=8 bgcolor=#171726 colspan=2>
<img src="wtv-mail:/content/images/CornerTop.gif" width=8 height=8>
<tr>
<td bgcolor=#171726 width=451 valign=top>
<table cellspacing=0 cellpadding=0 width=451>
<tr>
<td bgcolor=#171726 width=13>
<spacer type=horizontal size=13>
<td height=80>
<img src="wtv-mail:/content/images/Mail.gif" width=87 height=45>
`;
        var icon_image = null;
        switch (mailbox_name) {
            case "Inbox":
                icon_image = session_data.mailstore.getMailboxIcon();
                break;
            case "Sent":
                icon_image = "MailboxSent.gif";
                break;
            case "Trash":
                icon_image = "MailboxDiscard.gif";
                break;
            default:
                icon_image = "MailboxStorage.gif";
                break;
        }

        data += `
<img src="wtv-mail:/content/images/${icon_image}" width=74 height=45 >
<td width=250 align=left><font sizerange=small>
</table>
<tr>
<td colspan=2>
<table cellspacing=0 cellpadding=0 bgcolor=#2C323D>
<tr>
<td width=451 absheight=25>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=13 absheight=25>
<spacer type=horizontal size=13>
<td width=269 maxlines=1>
<font sizerange=medium color=#D6D6D6><blackface> ${(mailbox_name === "Inbox") ? ' Mail list for ' + username : mailbox_name}
</blackface></font>
<td width=21>
<img src="wtv-mail:/content/images/widget.gif" width=16 height=16>
<td width=80 >
<spacer type=vertical size=1><br>
<a href="wtv-setup:/mail"><font sizerange=small color=#E6CD4A><b>Settings</b></font></a>
<td width=21>
<!--
<img src="wtv-mail:/content/images/widget.gif" width=16 height=16 noprint>
<td width=36>
<spacer type=vertical size=1><br>
<a href="wtv-guide:/help?topic=Mail&subtopic=Index&appName=Mail" ><img src="wtv-mail:/content/images/mail_help_image.gif" width=35 height=17 noprint></a>
<td width=13>
-->
<spacer type=horizontal size=13>
</table>
</table>
</table>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td bgcolor=#171726 width=13>
<spacer type=horizontal size=13>
<td bgcolor=#171726 width="438" valign="top">
<spacer type=vertical size=13><br>`;
        if (message_list) {

            data += `
<font sizerange=medium> ${message_list_string}
<table cellspacing=0 cellpadding=0 border=0>
<TR><TD maxlines="1">
${username}@${minisrv_config.config.service_name}
</TD></TR>
</TABLE>
</font><br>
<spacer type=vertical size=6>
<hr width=422 align=left>
<spacer type=vertical size=5>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=155>
<font sizerange=small color=#8897A6><b><spacer type=horizontal size=20>From</b></font>
<td width=230><font sizerange=small color=#8897A6><b>Subject</b></font>
<td width=47><font sizerange=small color=#8897A6><b>Date</b></font>
</table>
<spacer type=vertical size=1>
<hr width=422 align=left>
`;
            Object.keys(message_list).forEach(function (k) {
                var message = message_list[k];
                if (typeof message.subject == "object" && message.subject) message.subject = wtvshared.decodeBufferText(message.subject);
                message.known_sender = session_data.isAddressInAddressBook(message.from_addr);
                var message_font_open = "<font color=#7A9FCC>";
                var message_font_close = "</font>";
                if (message.unread) {
                    message_font_open = `<b><font color=#99E6FF>`;
                    message_font_close = "</font></b>"
                }
                data += `<spacer type=vertical size=5>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td href="readmail?message_id=${message.id}#next" id="id${message.id}" selected>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=20 align=center valign=middle>${(message.known_sender) ? '<img height=10 width=10 src="wtv-mail:/content/images/dot.gif">' : ''}
<td abswidth=130 maxlines=1>
${message_font_open}
${(message.from_name) ? message.from_name : message.from_addr}
${message_font_close}
<td abswidth=5>
<td abswidth=225 maxlines=1>
${message_font_open}
${(message.subject) ? wtvshared.htmlEntitize(message.subject) : "(No Subject)"}
${message_font_close}
<td abswidth=5>
<td abswidth=47 maxlines=1>
${message_font_open}
`;
                var message_date = new Date(message.date * 1000);
                data += (message_date.getMonth() + 1) + "/" + message_date.getDate() + "\n";
                data += `
${message_font_close}
</table>
<tr>
<td height=5>`;
            });
        } else {
            data += `
<font sizerange=medium> No ${(mailbox_name == "Inbox") ? `new e-mail messages for<table cellspacing=0 cellpadding=0 border=0>
<TR><TD maxlines="1">
${username}@${minisrv_config.config.service_name}
</TD></TR>
</TABLE>` : 'e-mail messages in mailbox ' + mailbox_name}
</font><br>
`;
        }
        data += `
<spacer type=vertical size=6>
</table>
</body>
</HTML>
`;


        }
    } else {
        mail_end_error("Access Denied");
    }
}