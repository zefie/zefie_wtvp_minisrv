var minisrv_service_file = true;

var mailstore_exists = false;

function mail_end_error(msg) {
    var errpage = doErrorPage("400", msg);
    headers = errpage[0];
    data = errpage[1];
}

var intro_seen = ssid_sessions[socket.ssid].mailstore.checkMailIntroSeen();
if (!intro_seen && !request_headers.query.intro_seen) {
    // user is trying to bypass the intro screen
    headers = "300 OK\nLocation: wtv-mail:/DiplomaMail";
} else {
    if (!request_headers.query.message_id) {
        mail_end_error("Message ID Required");
    } else {
        var messageid = request_headers.query.message_id;
        var message = ssid_sessions[socket.ssid].mailstore.getMessageByID(messageid);
        if (!message) {
            mail_end_error("Invalid Message ID");
        } else {
            ssid_sessions[socket.ssid].mailstore.setMessageReadStatus(messageid);
            var notImplementedAlert = new clientShowAlert({
                'image': minisrv_config.config.service_logo,
                'message': "This feature is not available.",
                'buttonlabel1': "Okay",
                'buttonaction1': "client:donothing",
                'noback': true,
            }).getURL();

            if (request_headers.query.message_delete) {
                ssid_sessions[socket.ssid].mailstore.deleteMessage(messageid);
                headers = `300 OK
wtv-expire: wtv-mail:/listmail
Location: wtv-mail:/listmail`;
            } else {

                headers = `200 OK
Content-type: text/html`;
                var message_colors = ssid_sessions[socket.ssid].mailstore.getSignatureColors(message.signature);

                if (typeof message.subject == "object" && message.subject) message.subject = wtvshared.decodeBufferText(message.subject);
                data = `<wtvnoscript>
<sendpanel
action	= "wtv-mail:/sendmail?message_forward_id=14&mailbox_name=inbox"
message	= "Forward this message to someone else."
label	= "Forward">
<savepanel
action	= "client:showsplash?image=wtv-mail:/ROMCache/OpenMailbox3.gif&message=Saving%20to%20storage&showpage=true&action=wtv-mail:/readmail%3Fmailbox_name%3Dinbox%26message_move%3Dmbox%26message_id%3D14%26selected%3Dsave"
message	= "Save this message with your stored mail."
label	= "Save"
xnocancel>
<HTML>
<head>
<title>
${(message.subject) ? wtvshared.htmlEntitize(message.subject) : '(No subject)'}
</title>
</head>
<body
bgcolor="${message_colors.bgcolor}"
text="${message_colors.text}"
link="${message_colors.link}" vlink="${message_colors.vlink}" vspace=0 hspace=0>
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
<table cellspacing=0 cellpadding=0 href="wtv-mail:/listmail?mailbox=0#id${messageid}"
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Mail list</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#596C75 href="${notImplementedAlert}">Previous</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 id=next href="${notImplementedAlert}" >
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Next</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="client:showsplash?image=wtv-mail:/content/images/OpenMailbox3.gif&message=Discarding%20Message&showpage=true&action=wtv-mail%3A%2Freadmail%3Fmessage_delete%3Dtrue%26message_id%3D${messageid}%26mailbox_name%3DInbox%26selected%3Ddelete"
xnocancel
id=delete
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Discard</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="client:showsplash?image=wtv-mail:/content/images/OpenMailbox3.gif&message=Saving%20Message&showpage=true&action=wtv-mail:/readmail%3Fmessage_move%3DSaved%26mailbox_name%3DInbox%26message_id%3D${messageid}%26selected%3Dsave"
xnocancel
id=save
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Save</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="wtv-mail:/sendmail?message_reply_id=${messageid}&mailbox_name=Inbox&selected=body&reply_all=false"
xnocancel
id=save
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Reply</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valign=middle>
<table cellspacing=0 cellpadding=0 href="wtv-mail:/sendmail?message_forward_id=${messageid}&mailbox_name=Inbox"
xnocancel
id=save
>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Forward</font></shadow>
</table>
<td width=5>
<tr>
<td bgcolor=#4A525A height=2 width=104 colspan=3>
</table>
<td width=5 bgcolor=#5B6C81>
</table>
</sidebar>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=451 colspan=2 align=center bgcolor=#5B6C81>
<spacer type=vertical size=13>
<tr>
<td height=8 bgcolor=${message_colors.bgcolor} colspan=2>
<img src="wtv-mail:/content/images/CornerTop.gif" width=8 height=8>
<tr>
<td bgcolor=${message_colors.bgcolor} width=451 valign=top>
<table cellspacing=0 cellpadding=0 width=451>
<tr>
<td bgcolor=${message_colors.bgcolor} width=13>
<spacer type=horizontal size=13>
<td height=9>
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
<td width=370 maxlines=1>
<font sizerange=medium color=#D6D6D6><blackface>
E-mail message
</blackface></font>
<td width=21>
<!--
<img src="wtv-mail:/content/images/widget.gif" width=16 height=16 noprint>
<td width=36>
<spacer type=vertical size=1><br>
<a href="wtv-guide:/help?topic=Mail&subtopic=Index&appName=Mail" ><img src="wtv-mail:/content/images/mail_help_image.gif" width=35 height=17 noprint></a>
-->
<td width=13>
<spacer type=horizontal size=13>
</table>
</table>
</table>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=13 rowspan=2>
<td height=15>
<spacer type=vertical size=15>
<td width=13 rowspan=2>
<tr>
<td abswidth=425>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td valign=top>
From:
<td width=10>
<td>`;
                if (message.from_name != message.from_addr) {
                    data += `${wtvshared.htmlEntitize(message.from_addr)} <a href="client:showalert?sound=none&message=To%20add%20%3Cblackface%3E${escape(escape(message.from_name))}%3C%2Fblackface%3E%20to%20your%20Address%20book,%20choose%20%3Cb%3EAdd%3C%2Fb%3E.&buttonlabel2=Cancel&buttonaction2=client:donothing&buttonlabel1=Add&buttonaction1=wtv-mail:/addressbook%3Faction%3Deditfromheader%26noresponse%3Dtrue%26nickname%3D${escape(escape(message.from_name))}%26address%3D${escape(escape(message.from_addr))}%26new_address%3Dtrue">(${wtvshared.htmlEntitize(message.from_name)})</a>`;
                } else {
                    data += `${wtvshared.htmlEntitize(message.from_addr)}`;
                }

                data += `<tr>
<td valign=top>
Date:
<td>
<td>
${strftime("%a, %b %e, %Y, %I:%M %P", new Date(message.date * 1000))} (UTC)
<tr>
<td valign=top>
To:
<td>
<td>
${wtvshared.htmlEntitize(message.to_addr)} ${(message.to_name) ? '(' + wtvshared.htmlEntitize(message.to_name) + ')' : ''}
<tr>
<td nowrap valign=top>
Subject: <td>
<td>`;
              
                data += `
${(message.subject) ? wtvshared.htmlEntitize(message.subject) : '(No subject)'}
<tr>
<td height=10>
<spacer type=vertical size=10>
</table>
<input type=hidden name=message_safe value=true>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=425>
<p>`;
                if (typeof message.body === "object" && message.body) {
                    message.body = wtvshared.decodeBufferText(message.body);
                }
                data += `
${wtvshared.htmlEntitize(message.body, true)}
<br>
<br>`;
                if (message.signature) {
                    data += wtvshared.sanitizeSignature(message.signature);
                }
                data += `<p>
`;
                if (message.attachments) {
                    message.attachments.forEach((v, k) => {
                        if (v) {
                            console.log("*****************", v['Content-Type']);
                            switch (v['Content-Type']) {
                                case "image/jpeg":
                                    data += `<img border=2 src="wtv-mail:/get-attachment?message_id=${messageid}&attachment_id=${k}&wtv-title=Video%20Snapshot" width="380" height="290"><br><br>`;
                                    break;
                                case "audio/wav":
                                    data += `<table href="wtv-mail:/get-attachment?message_id=${messageid}&attachment_id=${k}&wtv-title=Voice%20Mail" width=386 cellspacing=0 cellpadding=0>
<td align=left valign=middle>
<img src="ROMCache/FileSound.gif" align=absmiddle>&nbsp;&nbsp;Recording
<td align=right valign=middle>
</table><br><br>
`;
                                    break;
                            }
                        }
                    });
                }
                if (message.url) {
                    data += `Included Page: <a href="${(message.url)}">${wtvshared.htmlEntitize(message.url_title).replace(/&apos;/gi, "'")}</a>`;
                }
                data += `<p>
<p>
</table>
</table>
</body>
</HTML>
`;
            }
        }
    }
}