var minisrv_service_file = true;

var mailstore_exists = false;

function mail_end_error(msg) {
    var errpage = doErrorPage("400", msg);
    headers = errpage[0];
    data = errpage[1];
}

// check if mailstore exists (returns null if guest)
mailstore_exists = ssid_sessions[socket.ssid].mailstore.mailstoreExists();

// create mailstore if it doesnt exist (also returns null if guest)
if (!mailstore_exists) mailstore_exists = ssid_sessions[socket.ssid].mailstore.createMailstore();

if (mailstore_exists) {
    // mailstore exists and user is not guest

    var default_limit = (minisrv_config.services[service_name].messages_per_page) ? minisrv_config.services[service_name].messages_per_page : 25; // user config or 25
    var mailbox = (request_headers.query.mailbox) ? parseInt(request_headers.query.mailbox) : 0;
    var limit = (request_headers.query.limit) ? parseInt(request_headers.query.limit) : default_limit;
    var reverse_sort = (request_headers.query.reverse_sort) ? true : false;
    var page = (request_headers.query.page) ? parseInt(request_headers.query.page) : 0;

    // get mailbox name
    var mailbox_name = ssid_sessions[socket.ssid].mailstore.getMailboxById(parseInt(mailbox));

    // if false or null, then mailbox is invalid
    if (!mailbox_name) {
        mail_end_error("Invalid Mailbox ID");
    } else {
        // mailboxid is ok
        if (!ssid_sessions[socket.ssid].mailstore.mailboxExists(mailbox)) {
            // mailbox does not yet exist, create it
            var mailbox_exists = ssid_sessions[socket.ssid].mailstore.createMailbox(mailbox);
            if (!mailbox_exists) {
                // failed to create mailbox for some reason
                mail_end_error();
            } else {
                if (mailbox === 0) {
                    // Just created Inbox for the first time, so create the welcome message
                    ssid_sessions[socket.ssid].mailstore.createWelcomeMessage();
                }
            }
        }
        var message_list = ssid_sessions[socket.ssid].mailstore.listMessages(mailbox, limit, reverse_sort, (page * limit))
        var total_message_count = ssid_sessions[socket.ssid].mailstore.countMessages(mailbox);
        var username = ssid_sessions[socket.ssid].getSessionData("subscriber_username");
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
<table cellspacing=0 cellpadding=0 href="${notImplementedAlert}"
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
<table cellspacing=0 cellpadding=0 href="wtv-mail:/folders"
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
<table cellspacing=0 cellpadding=0 href="${notImplementedAlert}"
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
                switch (total_message_count) {
                    case 0:
                        icon_image = "OpenMailbox0.gif";
                        break;
                    case 1:
                        icon_image = "OpenMailbox1.gif";
                        break;
                    default:
                        icon_image = "OpenMailbox2.gif";
                        break;
                }
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
<font sizerange=medium> ${total_message_count} e-mail message${(total_message_count != 1) ? 's' : ''} for
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
                console.log(message);
                data += `<spacer type=vertical size=5>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td href="readmail?message_id=${message.id}#next" id="id${message.id}" selected>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=20 align=center valign=middle>${(message.known_sender) ? '<img height=10 width=10 src="wtv-mail:/content/images/dot.gif">' : ''}
<td abswidth=130 maxlines=1>
<font color=#7A9FCC>
${(message.from_name) ? message.from_name : message.from_addr}
</font>
<td abswidth=5>
<td abswidth=225 maxlines=1>
<font color=#7A9FCC>
${(message.subject) ? message.subject : "(No Subject)"}
</font>
<td abswidth=5>
<td abswidth=47 maxlines=1>
<font color=#7A9FCC>
`;
                var message_date = new Date(message.date * 1000);
                data += (message_date.getMonth() + 1) + "/" + message_date.getDate() + "\n";
                data += `
</font>
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
</TABLE>` : 'e-mail messages in mailbox '+mailbox_name}
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