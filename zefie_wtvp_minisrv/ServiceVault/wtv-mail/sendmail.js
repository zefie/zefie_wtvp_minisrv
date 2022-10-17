var minisrv_service_file = true;

var message_snapshot_data = null;
var message_voicemail_data = null;
var intro_seen = session_data.mailstore.checkMailIntroSeen();
if (!intro_seen && !request_headers.query.intro_seen) {
    // user is trying to bypass the intro screen
    headers = "300 OK\nLocation: wtv-mail:/DiplomaMail?came-from=" + encodeURIComponent(request_headers.request_url);
} else if (request_headers.query.clear == "true") {
} else if (request_headers.query.clear == "true") {
    if (request_headers.Referer)
        gourl = request_headers.Referer.replace(/[\?\&]clear\=true/, '');
    else
        gourl = "wtv-mail:/sendmail"
    if (request_headers.query.saveoff) delete request_headers.query.saveoff;
    session_data.deleteSessionData("usenet_draft");
    session_data.deleteSessionData("usenet_draft_attachments");
    session_data.deleteSessionData("mail_draft");
    session_data.deleteSessionData("mail_draft_attachments");
    if (request_headers.query.message_to) delete request_headers.query.message_to;
    if (request_headers.query.message_subject) delete request_headers.query.message_subject;
    if (request_headers.query.message_body) delete request_headers.query.message_body;
    if (request_headers.query.message_url) delete request_headers.query.message_url;
    if (request_headers.query.message_title) delete request_headers.query.message_title;
    if (request_headers.query.message_reply_all_cc) delete request_headers.query.message_reply_all_cc;
    if (request_headers.query['wtv-saved-message-id']) delete request_headers.query['wtv-saved-message-id'];

    headers = `300 OK
wtv-expire-all: wtv-mail:/listmail
wtv-expire-all: wtv-mail:/sendmail
Location: ${gourl}`;
} else {
    var doClientError = function (msg) {
        var clientErrorMsg = new clientShowAlert({
            'image': minisrv_config.config.service_logo,
            'message': msg,
            'buttonlabel1': "Okay",
            'buttonaction1': "client:donothing",
            'noback': true,
        }).getURL();

        return "200 OK\nwtv-visit: " + clientErrorMsg;
    }

    var newsgroup = null;
    if (wtvshared.parseBool(request_headers.query.discuss)) {
        newsgroup = request_headers.query.group || request_headers.query.message_to || null;
    }

    var gourl = "wtv-mail:/sendmail";
    var msg_subject, to_addr, to_name;

    if (newsgroup !== null) {
        var to_addr = newsgroup;
        var pageTitle = "Post to " + newsgroup;
        var article = request_headers.query.article || null;
        var gourl = gourl + "?group=" + newsgroup;

    } else {
        var to_addr = request_headers.query.message_to || null;
        var pageTitle = "Write an e-mail message";
        if (request_headers.query.message_reply_id) {
            reply_message = session_data.mailstore.getMessageByID(request_headers.query.message_reply_id);
            if (reply_message) {
                msg_subject = "Re: " + reply_message.subject;
                to_addr = reply_message.to_addr;
                to_name = reply_message.to_name;
            }
        }
    }

    var msg_subject = msg_subject || request_headers.query.message_subject || null;
    var msg_body = request_headers.query.message_body || null;
    var to_name = to_name || request_headers.query.whatever_webtv_sends_this_as || null;
    var msg_url = request_headers.query.message_url || null;
    var msg_url_title = request_headers.query.message_title || null;
    var no_signature = false;


    mail_draft_data = {};
    mail_draft_attachments = {};
    if (!wtvshared.parseBool(request_headers.query.discuss)) {
        mail_draft_data = session_data.getSessionData("mail_draft");
        mail_draft_attachments = session_data.getSessionData("mail_draft_attachments") || {};
        if (mail_draft_data && !wtvshared.parseBool(request_headers.query.discuss)) {
            session_data.deleteSessionData("mail_draft");
            if (mail_draft_data.to_addr) to_addr = request_headers.query.message_to || mail_draft_data.to_addr;
            if (mail_draft_data.msg_subject) msg_subject = request_headers.query.message_subject || mail_draft_data.msg_subject;
            if (mail_draft_data.msg_body) msg_body = request_headers.query.message_body || mail_draft_data.msg_body;
            if (mail_draft_data.no_signature) no_signature = mail_draft_data.no_signature;
            if (mail_draft_data.msg_url) msg_url = request_headers.query.message_url || mail_draft_data.msg_url;
            if (mail_draft_data.msg_url_title) msg_url_title = request_headers.query.message_title || mail_draft_data.msg_url_title;
        }
    } else {
        mail_draft_data = session_data.getSessionData("usenet_draft");
        mail_draft_attachments = session_data.getSessionData("usenet_draft_attachments") || {};
        if (mail_draft_data && !wtvshared.parseBool(request_headers.query.discuss)) {
            session_data.deleteSessionData("usenet_draft");
            if (mail_draft_data.to_addr) to_addr = request_headers.query.message_to || mail_draft_data.to_addr;
            if (mail_draft_data.msg_subject) msg_subject = request_headers.query.message_subject || mail_draft_data.msg_subject;
            if (mail_draft_data.msg_body) msg_body = request_headers.query.message_body || mail_draft_data.msg_body;
            if (mail_draft_data.no_signature) no_signature = mail_draft_data.no_signature;
            if (mail_draft_data.article) article = article || mail_draft_data.article;
        }
    }

    if (request_headers.query.togglesign == "true") no_signature = false;
    if (request_headers.query.togglesign == "false") no_signature = true;

    if (mail_draft_attachments) {
        if (mail_draft_attachments.message_snapshot_data) message_snapshot_data = mail_draft_attachments.message_snapshot_data;
        else if (request_headers.query.message_snapshot_data) message_snapshot_data = request_headers.query.message_snapshot_data;
        if (mail_draft_attachments.message_voicemail_data) message_voicemail_data = mail_draft_attachments.message_voicemail_data;
        else if (request_headers.query.message_voicemail_data) message_voicemail_data = request_headers.query.message_voicemail_data;
    }

    if (message_snapshot_data && request_headers.query.get_snap) {
        headers = `200 OK
Content-Type: image/jpeg`;
        data = message_snapshot_data;
    } else if (message_voicemail_data && request_headers.query.get_gab) {
        headers = `200 OK
Content-Type: audio/wav`;
        data = message_voicemail_data;
    } else {

        var username = session_data.getSessionData("subscriber_username");
        var userdisplayname = wtvshared.htmlEntitize(session_data.getSessionData("subscriber_name"));
        var address = username + "@" + minisrv_config.config.service_name //minisrv_config.config.domain_name
        var notImplementedAlert = new clientShowAlert({
            'image': minisrv_config.config.service_logo,
            'message': "This feature is not available.",
            'buttonlabel1': "Okay",
            'buttonaction1': "client:donothing",
            'noback': true,
        }).getURL();

        if ((typeof request_headers.query.sendoff !== 'undefined' && request_headers.query.sendoff != false) || request_headers.query.saveoff || request_headers.query.get_snap || request_headers.query.get_gab) {
            var from_addr = address;
            var signature = session_data.getSessionData("subscriber_signature") || null;
            if (typeof request_headers.query.sendoff !== 'undefined' && request_headers.query.sendoff != false) {
                var attachments = [];


                if (message_snapshot_data) {
                    var attachment = {
                        'Content-Type': 'image/jpeg',
                        'filename': 'snapshot.jpg'
                    }
                    if (typeof message_snapshot_data == "object") {
                        attachment.data = new Buffer.from(message_snapshot_data).toString('base64');
                        attachment.is_base64 = true;
                    } else
                        attachment.data = message_snapshot_data;

                    attachments.push(attachment);
                }

                if (message_voicemail_data) {
                    var attachment = {
                        'Content-Type': 'audio/wav',
                        'filename': 'voicemail.wav'
                    }

                    if (typeof message_voicemail_data == "object") {
                        attachment.data = new Buffer.from(message_voicemail_data).toString('base64');
                        attachment.is_base64 = true;
                    } else
                        attachment.data = message_voicemail_data;

                    attachments.push(attachment);
                }

                if (newsgroup !== null) {
                    var request_is_async = true;
                    var local_service_name = request_headers.query['discuss-prefix'] || "wtv-news"
                    const wtvnews = new WTVNews(minisrv_config, local_service_name);
                    var service_config = minisrv_config.services[local_service_name];
                    if (wtvnewsserver) {
                        var tls_path = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + '/wtv-news');
                        var tls_options = {
                            ca: this.fs.readFileSync(tls_path + '/localserver_ca.pem'),
                            key: this.fs.readFileSync(tls_path + '/localserver_key.pem'),
                            cert: this.fs.readFileSync(tls_path + '/localserver_cert.pem'),
                            checkServerIdentity: () => { return null; }
                        }
                        if (wtvnewsserver.username)
                            wtvnews.initializeUsenet("127.0.0.1", service_config.local_nntp_port, tls_options, wtvnewsserver.username, wtvnewsserver.password);
                        else
                            wtvnews.initializeUsenet("127.0.0.1", service_config.local_nntp_port, tls_options);
                    } else {
                        if (service_config.upstream_auth)
                            wtvnews.initializeUsenet(service_config.upstream_address, service_config.upstream_port, service_config.upstream_tls || null, service_config.upstream_auth.username || null, service_config.upstream_auth.password || null);
                        else
                            wtvnews.initializeUsenet(service_config.upstream_address, service_configupstream_port, service_config.upstream_tls || null);
                    }
                    from_addr = userdisplayname + " <" + from_addr + ">";
                    news_headers = null;
                    if (signature && signature != "" && !no_signature) {
                        var signature_tuple = null;
                        if (signature.indexOf('<html>') >= 0) {
                            attachments.push({
                                "Content-Type": 'text/html',
                                "data": signature,
                                "use_base64": false,
                                "filename": "wtv_signature.html"
                            });
                        } else {
                            if (msg_body) msg_body += "\n" + signature;
                            else msg_body = signature;
                        }
                    }

                    if (attachments.length > 0) {
                        // usenet attachments
                        var tuples = [{
                            "mime": 'text/plain',
                            "content": msg_body || '',
                            "use_base64": false
                        }];
                        if (signature_tuple) tuples.push(signature_tuple);
                        attachments.forEach((attachment) => {
                            var tuple = {};
                            tuple.mime = attachment['Content-Type'];
                            tuple.content = attachment.data;
                            tuple.use_base64 = (typeof attachment.use_base64 === 'boolean') ? attachment.use_base64 : true;
                            tuple.is_base64 = (typeof attachment.is_base64 === 'boolean') ? attachment.is_base64 : false;
                            tuple.filename = attachment.filename || null;
                            tuples.push(tuple);
                        });
                        var multipart_data = wtvmime.generateMultipartMIME(tuples);
                        news_headers = {
                            "Content-Type": multipart_data.content_type,
                            "MIME-Version": multipart_data.mime_version,
                            "User-Agent": minisrv_version_string + " for WebTV",
                            "Content-Language": "en-US"
                        }
                        msg_body = multipart_data.content.toString();
                    } 
                    wtvnews.postToGroup(newsgroup, from_addr, msg_subject, msg_body, article, news_headers).then(() => {
                        session_data.deleteSessionData("usenet_draft");
                        session_data.deleteSessionData("usenet_draft_attachments");
                        headers = `300 OK
wtv-expire-all: wtv-news:/news?group=${newsgroup}
wtv-expire-all wtv-mail:/sendmail
Location: wtv-news:/news?group=${newsgroup}`;
                        sendToClient(socket, headers, '');
                    }).catch((e) => {
                        var err = this.wtvshared.doErrorPage(500, null, e.toString())
                        sendToClient(socket, err[0], err[1]);
                    });


                } else {
                    var messagereturn = session_data.mailstore.sendMessageToAddr(from_addr, to_addr, msg_body, msg_subject, userdisplayname, to_name, signature, attachments, msg_url, msg_url_title);
                    if (messagereturn !== true) {
                        var errpage = wtvshared.doErrorPage(400, messagereturn);
                        headers = errpage[0];
                        data = errpage[1];
                    } else {
                        session_data.deleteSessionData("mail_draft");
                        session_data.deleteSessionData("mail_draft_attachments");
                        headers = `300 OK
wtv-expire-all: wtv-mail:/listmail
wtv-expire-all: wtv-mail:/sendmail
Location: wtv-mail:/listmail`;
                    }
                }

            } else if (request_headers.query.saveoff) {
                var mail_draft_data = {
                    to_addr: to_addr,
                    msg_subject: msg_subject,
                    msg_body: msg_body,
                    no_signature: no_signature,
                    msg_url: msg_url,
                    msg_url_title: msg_url_title,
                }
                if (newsgroup) mail_draft_data.article = article;
                session_data.setSessionData((newsgroup) ? "usenet_draft" : "mail_draft", mail_draft_data);
                headers = `200 OK
Content-type: text/html
wtv-expire-all: wtv-mail:/sendmail`;
            }
            } else {

            headers = `200 OK
Content-type: text/html`;
            var mail_draft_data = session_data.getSessionData((newsgroup) ? "usenet_draft_attachments" : "mail_draft_attachments") || {};
            if (request_headers.query.snapping == "false") {
                headers += "\nwtv-expire-all: cache:snapshot.jpg";
                if (mail_draft_data.message_snapshot_data) mail_draft_data.message_snapshot_data = null;
                session_data.setSessionData((newsgroup) ? "usenet_draft_attachments" : "mail_draft_attachments", mail_draft_data);
            }

            if (request_headers.query.gabbing == "false") {
                headers += "\nwtv-expire-all: cache:voicemail.wav";
                if (mail_draft_data.message_voicemail_data) mail_draft_data.message_voicemail_data = null;
                session_data.setSessionData((newsgroup) ? "usenet_draft_attachments" : "mail_draft_attachments", mail_draft_data);
            }

            if (request_headers.query.message_snapshot_data) {
                mail_draft_data.message_snapshot_data = request_headers.query.message_snapshot_data
                session_data.setSessionData((newsgroup) ? "usenet_draft_attachments" : "mail_draft_attachments", mail_draft_data);
            }

            if (request_headers.query.message_voicemail_data) {
                mail_draft_data.message_voicemail_data = request_headers.query.message_voicemail_data
                session_data.setSessionData((newsgroup) ? "usenet_draft_attachments" : "mail_draft_attachments", mail_draft_data);
            }
            var message_colors = null;
            if (no_signature) message_colors = session_data.mailstore.getSignatureColors(null, true);
            else message_colors = session_data.mailstore.getSignatureColors(session_data.getSessionData("subscriber_signature"), true);

            data = `<HTML>
<head>
<display poweroffalert >
<sendpanel
action="javascript:Submit()"
message="Send this message now"
label="Send message">
<savepanel message="Messages that you are writing cannot be saved. Send it to yourself if you would like a copy.">
<script language=javascript>
function Submit() {	if (document.sendform.message_to.value == "") {	location = "client:showalert?message=Your%20message%20could%20not%20be%20sent.%3Cp%3E%0AYou%20must%20specify%20an%20addressee%20in%20the%20%3Cblackface%3ETo%3A%3C%2Fblackface%3E%20area.%0A&buttonLabel1=Continue%0A&buttonAction1=client%3Adonothing&buttonLabel2=";
} else {	location = "client:showsplash?message=Sending%20Message&animation=file://ROM/Animations/mail.ani&action=client:submitform%3Fname%3Dsendform%26submitname%3Dsendoff%26submitvalue%3DSend";
}
}
function ErasingMedia(victim) {	var myURL;
myURL = "client:submitform?name=sendform&submitvalue=false" + "&submitname=" + victim;
if (victim == "gabbing") {	document.forms.sendform.elements.message_voicemail_data.disabled = true;
}
if (victim == "snapping") {	document.forms.sendform.elements.message_snapshot_data.disabled = true;
}
location = myURL;
location.reload();	}
function Signing(desiredState) {	var myURL;
myURL="client:submitform?name=sendform&submitvalue="+desiredState+"&submitname=togglesign";
location = myURL;
location.reload();
}
function DoneSnapping() {	location = "client:submitform?name=sendform&submitname=snapping&submitvalue=true";
location.reload();	}
function DoneGabbing() {	var myURL;
myURL = "client:submitform?name=sendform&submitname=gabbing&submitvalue=cache%3Avoicemail.wav";
location = "client:submitform?name=sendform&submitname=gabbing&submitvalue=true";
location.reload();	}
function clearDraft() {
    location = "client:submitform?name=sendform&submitname=clear&submitvalue=true";
    location.reload();
}
</script>
<title>
${pageTitle}
</title>
</head>
<body bgcolor="#171726" text="${message_colors.text}" link="${message_colors.link}" vlink="${message_colors.vlink}" vspace=0 hspace=0>
<form action="wtv-mail:/sendmail#focus" method="post" name=sendform >
<input type=hidden name="wtv-saved-message-id" value="writemessage-outbox">
<input type=hidden name="message_reply_all_cc" value="">
${(request_headers.query.article) ? `<input type="hidden" name="article" value="${request_headers.query.article}">` : ''}
<input type=hidden name="saveoff" value="true" autosubmit="onleave">
<input type=hidden name="discuss" value="${wtvshared.parseBool(request_headers.query.discuss)}">
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
<tr>	<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valgn=middle>
<table cellspacing=0 cellpadding=0 href="`
            if (newsgroup) {
                data += "wtv-news:/news?group=" + newsgroup;
            } else {
                data += "wtv-mail:/listmail";
            }
data += `"><tr>
<td height=1>
<tr>`;
            if (newsgroup) {
                data += `<td><shadow><font sizerange=medium color=#E6CD4A>Group list</font></shadow>`;
            } else {
                data += `<td><shadow><font sizerange=medium color=#E6CD4A>Mail list</font></shadow>`;
            }

data += `</table>`;
            if (!newsgroup) {
                data += `
<td width=5>
<tr>	<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valgn=middle>
<table cellspacing=0 cellpadding=0 href="client:openaddresspanel" id=addressbook>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Address</font></shadow>
</table>`;
            }
data += `
<td width=5>
<tr>	<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valgn=middle>
<table cellspacing=0 cellpadding=0 href="client:videocapture?notify=javascript%3ADoneSnapping()&device=video&width=100%25&height=100%25&name=cache%3Asnapshot.jpg&donebuttonlabel=Add%20to%20Message&open" id=addressbook>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Photo</font></shadow>
</table>
<td width=5>
<tr>	<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valgn=middle>
<table cellspacing=0 cellpadding=0 href="client:soundcapture?notify=javascript%3ADoneGabbing()&device=audio&rate=8000&name=cache%3Avoicemail.wav&donebuttonlabel=Add%20to%20Message&open" id=addressbook>

<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Recording</font></shadow>
</table>
<td width=5>
<tr>	<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valgn=middle>
<table cellspacing=0 cellpadding=0 href="client:showalert?sound=none&message=Are%20you%20sure%20you%20want%20to%20erase%20this%20entire%20message%3F&buttonlabel2=Don't%20Erase&buttonaction2=client:donothing&buttonlabel1=Erase&buttonaction1=javascript:clearDraft()" id=addressbook>
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Erase</font></shadow>
</table>
<td width=5>
<tr>	<td bgcolor=#4A525A height=2 width=104 colspan=3>
<tr>
<td width=10 height=26>
<td width=89 valgn=middle>
</table>
<td width=5 bgcolor=#5B6C81>
</table>
</sidebar>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=451 colspan=2 align=center bgcolor=#5B6C81>
<spacer type=vertical size=4>
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
<img src="wtv-mail:/content/images/${session_data.mailstore.getMailboxIcon()}" width=74 height=45 transparency=60>
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
<td width=370 maxlines=1>
<font sizerange=medium color=#D6D6D6><blackface>
${pageTitle}
</blackface></font>
<!--
<td width=21>
<img src="wtv-mail:/content/images/widget.gif" width=16 height=16 noprint>
<td width=36>
<spacer type=vertical size=1><br>
<a href="wtv-guide:/help?topic=Mail&subtopic=Index&appName=Mail" ><img src="wtv-mail:/content/images/mail_help_image.gif" width=35 height=17 noprint></a> -->
<td width=13>
<spacer type=horizontal size=13>
</table>
</table>
</table>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td bgcolor=#171726 width=13>
<spacer type=horizontal size=13>
<td bgcolor=#171726 width=438 valign=top>
<spacer type=vertical size=5><br>
<table cellspacing=0 cellpadding=0 bgcolor="${message_colors.bgcolor}">
<tr>
<td absheight=2 colspan=5 bgcolor=#495360>
<tr>
<td abswidth=2 bgcolor=#495360>
<td absheight=13 colspan=3>
<td abswidth=2 bgcolor=#000000>
<tr>
<td abswidth=2 bgcolor=#495360>
<td abswidth=13>
<td abswidth=385>
<table cellspacing=0 cellpadding=0>	<tr>
<td width=80 valign=top align=right>
<font color=${message_colors.text}>From:&nbsp;</font>
<td width=305 valign=top>
<font color=${message_colors.text}><table cellspacing=0 cellpadding=0 border=0>
<TR><TD maxlines="1">
${address}
</TD></TR>
</TABLE></font>
<font color=${message_colors.text}>(${userdisplayname})</font>
<tr>
<td height=13 valign=middle colspan=2>
<img src="wtv-mail:/content/images/sendmail_panel_dots.gif" width=385 height=2>
<tr>
<td width=80 valign=top align=right>`;
            if (!request_headers.query.discuss) {
                data += '<a href="client:openaddresspanel">To:</a>';
            } else {
                data += 'To:';
            }
            data += `&nbsp;
<td width=305 valign=top>
<textarea
bgcolor="${message_colors.bgcolor}"
cursor="${message_colors.cursor}"
nosoftbreaks
borderimage="file://ROM/Borders/textfield.alt1.bif"
nohardbreaks
selected
font=proportional
text=${message_colors.text}
name="message_to"
border=0
width=305 rows=1
growable
autoactivate
addresses
autoascii
nohighlight`;
            if (newsgroup) { data += "\nreadonly" }
data += `
>${(to_addr) ? to_addr : ''}</textarea>
<tr>
<td height=13 valign=middle colspan=2>
<img src="wtv-mail:/content/images/sendmail_panel_dots.gif" width=385 height=2>
<tr>
<td abswidth=83 valign=top align=right>
<font color=${message_colors.text}>Subject:&nbsp;</font>
<td width=305 valign=top>
<textarea
bgcolor="${message_colors.bgcolor}"
cursor="${message_colors.cursor}"
nosoftbreaks
borderimage="file://ROM/Borders/textfield.alt1.bif"
nohardbreaks
text=${message_colors.text}
name="message_subject" font=proportional
border=0
width=305 rows=1
growable
autoactivate
maxlength=70
nohighlight
autohiragana
>${(msg_subject) ? msg_subject : ''}</textarea>
<tr>
<td height=13 valign=middle colspan=2>
<img src="wtv-mail:/content/images/sendmail_panel_dots.gif" width=385 height=2>
<tr>
<td width=305 colspan=2>
<textarea nosoftbreaks
bgcolor="${message_colors.bgcolor}"
text="${message_colors.text}"
cursor="${message_colors.cursor}"
name="message_body" font=proportional
border=0
rows=4
width=386
nohighlight
autoactivate
autohiragana
growable
nextdown="Send">${(msg_body) ? msg_body : ''}</textarea>
</table>
<body bgcolor=${message_colors.bgcolor}
text=${message_colors.text}
link=${message_colors.link}
vlink=${message_colors.vlink}
vspace=0
hspace=0>`;
            if (session_data.getSessionData("subscriber_signature") && session_data.getSessionData("subscriber_signature") != "" && !no_signature) {
                data += wtvshared.sanitizeSignature(session_data.getSessionData("subscriber_signature"));
            }
            if (msg_url) {
                data += `<input type="hidden" name="message_url" value="${msg_url}">
<input type="hidden" name="message_title" value="${msg_url_title}">
Included Page: <a href="${msg_url}">${wtvshared.htmlEntitize(msg_url_title).replace(/&apos;/gi, "'")}</a>`;
            }
            data += `
<td abswidth=13>
<td abswidth=2 bgcolor=#000000>
<tr>
<td abswidth=2 bgcolor=#495360>
<td absheight=13 colspan=3>
<td abswidth=2 bgcolor=#000000>
<tr>
<td absheight=2 colspan=5 bgcolor=#000000>
</table>
<tr>
<td width=13 bgcolor=#171726>
<td width=438 bgcolor=#171726>
<spacer type=vertical size=5><br>
<table cellspacing=0 cellpadding=0 border=0>
<tr>
<td width=305 valign=top>`;
            if (!session_data.getSessionData("subscriber_signature") || session_data.getSessionData("subscriber_signature") == "") {
                data += `<input type = hidden name = "togglesign" value = "false"> <td abswidth=13 > `;
            } else if (no_signature) {
                data += `<a href="javascript:Signing('true')">
<img src="wtv-mail:/content/images/RemoveButton.gif" align=absmiddle height=25 width=25>&nbsp;Add signature&nbsp;</a>
<br>`;
            } else {
                data += `<a href="javascript:Signing('false')">
<img src="wtv-mail:/content/images/RemoveButton.gif" align=absmiddle height=25 width=25>&nbsp;Remove signature&nbsp;</a>
<br>`;
            }
            data += `
<td align=right valign=top width=110> <FONT COLOR="#E7CE4A"><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" action="javascript:Submit()"
value="Send"
name="Send"
id="Send"
xnocancel
width=103
USESTYLE NOARGS>
</SHADOW></FONT>
</table>
<spacer type=vertical size=5>
`;

            if ((request_headers.query.snapping && request_headers.query.snapping !== 'false') || mail_draft_attachments.message_snapshot_data) {
                data += `<tr>
<td absheight="10">
<img src="ROMCache/Spacer.gif" width="1" height="10">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0" bgcolor="${message_colors.bgcolor}" background="">
<tbody><tr>
<td rowspan="100" abswidth="10" bgcolor="191919">
<img src="ROMCache/Spacer.gif" width="10" height="1">
</td><td colspan="9" abswidth="422" valign="bottom">
<img src="ROMCache/PaperTopFlat.gif" noprint="" width="422" height="6">
</td></tr><tr>
<td rowspan="100" abswidth="2" absheight="0" bgcolor="313131">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="14" absheight="0">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td colspan="2" abswidth="386">
</td><td rowspan="100" abswidth="14" absheight="0">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="3" absheight="0" bgcolor="0b0b0b">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="0f0f0f">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="131313">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="171717">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td colspan="2" absheight="15">`;
                if (!mail_draft_attachments.message_snapshot_data) {
                    data += `<input type="file" device="video" name="message_snapshot_data" src="cache:snapshot.jpg" invisible="" width="75%" height="75%">
<input type="hidden" name="message_snapshot_url" value="cache:snapshot.jpg">`;
                }

                data += `
</td></tr><tr>
<td colspan="2" align="center">
<img src="${(mail_draft_attachments.message_snapshot_data) ? 'wtv-mail:/sendmail?get_snap=true' : (request_headers.query.message_snapshot_url) ? request_headers.query.message_snapshot_url : 'cache:snapshot.jpg'}" width="380" height="290">
</td></tr><tr>
<td colspan="2" abswidth="386" absheight="10">
</td></tr><tr>
<td colspan="2">
<table width="386" cellspacing="0" cellpadding="0">
<tbody><tr><td valign="middle">
</td><td valign="middle" align="right">
<a href="javascript:ErasingMedia('snapping')">
&nbsp;Detach&nbsp;<img src="ROMCache/RemoveButton.gif" width="25" height="25" align="absmiddle"></a>
</td></tr></tbody></table>
</td></tr><tr>
<td colspan="2" absheight="8">
<img src="ROMCache/Spacer.gif" width="1" height="8">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr>
<td rowspan="100" abswidth="10">
<img src="ROMCache/Spacer.gif" width="10" height="2">
</td><td abswidth="422">
<img src="ROMCache/PaperBase.gif" noprint="" width="422" height="6">
</td></tr><tr>
<td absheight="6">
<img src="ROMCache/Spacer.gif" width="1" height="6">
</td></tr>`;
            }

            if ((request_headers.query.gabbing && request_headers.query.gabbing !== 'false') || mail_draft_attachments.message_voicemail_data) {
                data += `<tr>
<td absheight="10">
<img src="ROMCache/Spacer.gif" width="1" height="10">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0" bgcolor="${message_colors.bgcolor}" background="">
<tbody><tr>
<td rowspan="100" abswidth="10" bgcolor="191919">
<img src="ROMCache/Spacer.gif" width="10" height="1">
</td><td colspan="9" abswidth="422" valign="bottom">
<img src="ROMCache/PaperTopFlat.gif" noprint="" width="422" height="6">
</td></tr><tr>
<td rowspan="100" abswidth="2" absheight="0" bgcolor="313131">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="14" absheight="0">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td colspan="2" abswidth="386">
</td><td rowspan="100" abswidth="14" absheight="0">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="3" absheight="0" bgcolor="0b0b0b">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="0f0f0f">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="131313">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="171717">
<img src="ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td colspan="2" absheight="15">
<input type=file device=audio name=message_voicemail_data
src="cache:voicemail.wav" rate=8000 invisible>
${(!mail_draft_attachments.message_voicemail_data) ? '' : '<input type=hidden name=message_voicemail_url value="cache:voicemail.wav">'}
</td></tr><tr>
<td colspan="2" align="center">
<table width=386 cellspacing=0 cellpadding=0>
<td align=left valign=middle>
<a href="${(mail_draft_attachments.message_voicemail_data) ? 'wtv-mail:/sendmail?get_gab=true&wtv-title=Voice%20Mail' : 'cache:voicemail.wav'}" id=focus><img src="ROMCache/FileSound.gif" align=absmiddle></a>&nbsp;&nbsp;Recording
<td align=right valign=middle>
<a href="javascript:ErasingMedia('gabbing')">
&nbsp;Detach&nbsp;<img src="ROMCache/RemoveButton.gif" align=absmiddle height=25 width=25></a>
</table><tr>
<td colspan="2" absheight="8">
<img src="ROMCache/Spacer.gif" width="1" height="8">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr>
<td rowspan="100" abswidth="10">
<img src="ROMCache/Spacer.gif" width="10" height="2">
</td><td abswidth="422">
<img src="ROMCache/PaperBase.gif" noprint="" width="422" height="6">
</td></tr><tr>
<td absheight="6">
<img src="ROMCache/Spacer.gif" width="1" height="6">
</td></tr>`;
            }
            data += `
</form>
</tbody>
</table>
</body>
</HTML>
`;
        }
    }
}