var minisrv_service_file = true;
var message_snapshot_data = null;
var message_voicemail_data = null;

var intro_seen = ssid_sessions[socket.ssid].mailstore.checkMailIntroSeen();
if (!intro_seen && !request_headers.query.intro_seen) {
    // user is trying to bypass the intro screen
    headers = "300 OK\nLocation: wtv-mail:/DiplomaMail";
} else {
    var doClientError = function (msg) {
        var clientErrorMsg = new clientShowAlert({
            'image': minisrv_config.config.service_logo,
            'message': msg,
            'buttonlabel1': "Okay",
            'buttonaction1': "client:donothing",
            'noback': true,
        }).getURL();

        headers = "300 OK\nwtv-visit: " + clientErrorMsg;
    }

    if (request_headers.query.clear == "true") {
        ssid_sessions[socket.ssid].deleteSessionData("mail_draft");
        ssid_sessions[socket.ssid].deleteSessionData("mail_draft_attachments");
        headers = `300 OK
wtv-expire: wtv-mail:/listmail
wtv-expire: wtv-mail:/sendmail
Location: wtv-mail:/sendmail`;
    }

    var to_addr = request_headers.query.message_to || null;
    var msg_subject = request_headers.query.message_subject || null;
    var msg_body = request_headers.query.message_body || null;
    var to_name = request_headers.query.whatever_webtv_sends_this_as || null;
    var no_signature = false;
    if (request_headers.query.togglesign == "true") no_signature = false;
    var mail_draft_data = ssid_sessions[socket.ssid].getSessionData("mail_draft");
    var mail_draft_attachments = ssid_sessions[socket.ssid].getSessionData("mail_draft_attachments") || {};
    if (mail_draft_data) {
        ssid_sessions[socket.ssid].deleteSessionData("mail_draft");
        to_addr = mail_draft_data.to_addr;
        msg_subject = mail_draft_data.msg_subject;
        msg_body = mail_draft_data.msg_body;
        no_signature = mail_draft_data.no_signature;
    }
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

        var username = ssid_sessions[socket.ssid].getSessionData("subscriber_username");
        var userdisplayname = html_entities.encode(ssid_sessions[socket.ssid].getSessionData("subscriber_name"));
        var address = username + "@" + minisrv_config.config.service_name
        var notImplementedAlert = new clientShowAlert({
            'image': minisrv_config.config.service_logo,
            'message': "This feature is not available.",
            'buttonlabel1': "Okay",
            'buttonaction1': "client:donothing",
            'noback': true,
        }).getURL();

        if (request_headers.query.sendoff == "Send" || request_headers.query.saveoff || request_headers.query.get_snap || request_headers.query.get_gab) {
            var from_addr = address;
            var signature = ssid_sessions[socket.ssid].getSessionData("subscriber_signature") || null;
            if (request_headers.query.sendoff == "Send") {
                var attachments = [];


                if (message_snapshot_data) {
                    if (typeof message_snapshot_data == "object") {
                        attachments.push({ 'Content-Type': 'image/jpeg', data: new Buffer.from(message_snapshot_data).toString('base64') });
                    } else {
                        attachments.push({ 'Content-Type': 'image/jpeg', data: message_snapshot_data });
                    }
                }

                if (message_voicemail_data) {
                    if (typeof message_voicemail_data == "object") {
                        attachments.push({ 'Content-Type': 'audio/wav', data: new Buffer.from(message_voicemail_data).toString('base64') });
                    } else {
                        attachments.push({ 'Content-Type': 'audio/wav', data: new message_voicemail_data });
                    }
                }

                var messagereturn = ssid_sessions[socket.ssid].mailstore.sendMessageToAddr(from_addr, to_addr, msg_body, msg_subject, userdisplayname, to_name, signature, attachments);
                if (messagereturn !== true) {
                    var errpage = wtvshared.doErrorPage(400, messagereturn);
                    headers = errpage[0];
                    data = errpage[1];
                } else {
                    ssid_sessions[socket.ssid].deleteSessionData("mail_draft");
                    ssid_sessions[socket.ssid].deleteSessionData("mail_draft_attachments");
                    headers = `300 OK
wtv-expire: wtv-mail:/listmail
wtv-expire: wtv-mail:/sendmail
Location: wtv-mail:/listmail`;
                }

            } else if (request_headers.query.saveoff) {
                var mail_draft_data = {
                    to_addr: to_addr,
                    msg_subject: msg_subject,
                    msg_body: msg_body,
                    no_signature: no_signature
                }
                ssid_sessions[socket.ssid].setSessionData("mail_draft", mail_draft_data);
                headers = `200 OK
Content-type: text/html
wtv-expire: wtv-mail:/sendmail`;
            }
        } else {

            headers = `200 OK
Content-type: text/html`;
            var mail_draft_data = ssid_sessions[socket.ssid].getSessionData("mail_draft_attachments") || {};
            if (request_headers.query.snapping == "false") {
                headers += "\nwtv-expire: cache:snapshot.jpg";
                if (mail_draft_data.message_snapshot_data) mail_draft_data.message_snapshot_data = null;
                ssid_sessions[socket.ssid].setSessionData("mail_draft_attachments", mail_draft_data);
            }

            if (request_headers.query.gabbing == "false") {
                headers += "\nwtv-expire: cache:voicemail.wav";
                if (mail_draft_data.message_voicemail_data) mail_draft_data.message_voicemail_data = null;
                ssid_sessions[socket.ssid].setSessionData("mail_draft_attachments", mail_draft_data);
            }

            if (request_headers.query.message_snapshot_data) {
                mail_draft_data.message_snapshot_data = request_headers.query.message_snapshot_data
                ssid_sessions[socket.ssid].setSessionData("mail_draft_attachments", mail_draft_data);
            }

            if (request_headers.query.message_voicemail_data) {
                mail_draft_data.message_voicemail_data = request_headers.query.message_voicemail_data
                ssid_sessions[socket.ssid].setSessionData("mail_draft_attachments", mail_draft_data);
            }
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
</script>
<title>
Write an e-mail message
</title>
</head>
<body bgcolor="#171726" text="#82A9D9" link="#BDA73A" vlink="#62B362" vspace=0 hspace=0>
<form action="wtv-mail:/sendmail#focus" method="post" name=sendform >
<input type=hidden name="wtv-saved-message-id" value="writemessage-outbox">
<input type=hidden name="message_reply_all_cc" value="">
<input type=hidden name="saveoff" value="true" autosubmit="onleave">
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
<table cellspacing=0 cellpadding=0 href="wtv-mail:/listmail" >
<tr>
<td height=1>
<tr>
<td><shadow><font sizerange=medium color=#E6CD4A>Mail list</font></shadow>
</table>
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
</table>
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
<table cellspacing=0 cellpadding=0 href="client:showalert?sound=none&message=Are%20you%20sure%20you%20want%20to%20erase%20this%20entire%20message%3F&buttonlabel2=Don't%20Erase&buttonaction2=client:donothing&buttonlabel1=Erase&buttonaction1=wtv-mail:/sendmail%3Fclear%3Dtrue%26wtv-saved-message-id%3Dwritemessage-outbox" id=addressbook>
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
<img src="wtv-mail:/content/images/${ssid_sessions[socket.ssid].mailstore.getMailboxIcon()}" width=74 height=45 transparency=60>
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
Write an e-mail message
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
<table cellspacing=0 cellpadding=0 bgcolor="#1F2033">
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
<font color=#82A9D9>From:&nbsp;</font>
<td width=305 valign=top>
<font color=#82A9D9><table cellspacing=0 cellpadding=0 border=0>
<TR><TD maxlines="1">
${address}
</TD></TR>
</TABLE></font>
<font color=#82A9D9>(${userdisplayname})</font>
<tr>
<td height=13 valign=middle colspan=2>
<img src="wtv-mail:/content/images/sendmail_panel_dots.gif" width=385 height=2>
<tr>
<td width=80 valign=top align=right>
<a href="client:openaddresspanel">To:</a>&nbsp;
<td width=305 valign=top>
<textarea
bgcolor="#1F2033"
cursor=#BDA73A
nosoftbreaks
borderimage="file://ROM/Borders/textfield.alt1.bif"
nohardbreaks
selected
font=proportional
text=#82A9D9
name="message_to"
border=0
width=305 rows=1
growable
autoactivate
addresses
autoascii
nohighlight
>${(to_addr) ? to_addr : ''}</textarea>
<tr>
<td height=13 valign=middle colspan=2>
<img src="wtv-mail:/content/images/sendmail_panel_dots.gif" width=385 height=2>
<tr>
<td abswidth=83 valign=top align=right>
<font color=#82A9D9>Subject:&nbsp;</font>
<td width=305 valign=top>
<textarea
bgcolor="#1F2033"
cursor=#BDA73A
nosoftbreaks
borderimage="file://ROM/Borders/textfield.alt1.bif"
nohardbreaks
text=#82A9D9
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
bgcolor="#1F2033"
text=#82A9D9
cursor=#BDA73A
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
<body bgcolor=#1F2033
text=#82A9D9
link=#BDA73A
vlink=#62B362
vspace=0
hspace=0>`;
            if (ssid_sessions[socket.ssid].getSessionData("subscriber_signature") && ssid_sessions[socket.ssid].getSessionData("subscriber_signature") != "" && !no_signature) {
                data += ssid_sessions[socket.ssid].mailstore.sanitizeSignature(ssid_sessions[socket.ssid].getSessionData("subscriber_signature"));
            }
            data += `
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
            if (!ssid_sessions[socket.ssid].getSessionData("subscriber_signature") || ssid_sessions[socket.ssid].getSessionData("subscriber_signature") == "") {
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
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="10">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0" bgcolor="#1F2033" background="">
<tbody><tr>
<td rowspan="100" abswidth="10" bgcolor="191919">
<img src="wtv-star:/ROMCache/Spacer.gif" width="10" height="1">
</td><td colspan="9" abswidth="422" valign="bottom">
<img src="wtv-mail:/ROMCache/PaperTopFlat.gif" noprint="" width="422" height="6">
</td></tr><tr>
<td rowspan="100" abswidth="2" absheight="0" bgcolor="313131">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="14" absheight="0">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td colspan="2" abswidth="386">
</td><td rowspan="100" abswidth="14" absheight="0">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="3" absheight="0" bgcolor="0b0b0b">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="0f0f0f">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="131313">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="171717">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td colspan="2" absheight="15">`;
                if (!mail_draft_attachments.message_snapshot_data) {
                    data += `<input type="file" device="video" name="message_snapshot_data" src="cache:snapshot.jpg" invisible="" width="75%" height="75%">
<input type="hidden" name="message_snapshot_url" value="cache:snapshot.jpg">`;
                }

                data += `
</td></tr><tr>
<td colspan="2" align="center">
<img src="${(mail_draft_attachments.message_snapshot_data) ? 'wtv-mail:/sendmail?get_snap=true' : 'cache:snapshot.jpg'}" width="380" height="290">
</td></tr><tr>
<td colspan="2" abswidth="386" absheight="10">
</td></tr><tr>
<td colspan="2">
<table width="386" cellspacing="0" cellpadding="0">
<tbody><tr><td valign="middle">
</td><td valign="middle" align="right">
<a href="javascript:ErasingMedia('snapping')">
&nbsp;Detach&nbsp;<img src="wtv-mail:/ROMCache/RemoveButton.gif" width="25" height="25" align="absmiddle"></a>
</td></tr></tbody></table>
</td></tr><tr>
<td colspan="2" absheight="8">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="8">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr>
<td rowspan="100" abswidth="10">
<img src="wtv-star:/ROMCache/Spacer.gif" width="10" height="2">
</td><td abswidth="422">
<img src="wtv-mail:/ROMCache/PaperBase.gif" noprint="" width="422" height="6">
</td></tr><tr>
<td absheight="6">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="6">
</td></tr>`;
            }

            if ((request_headers.query.gabbing && request_headers.query.gabbing !== 'false') || mail_draft_attachments.message_voicemail_data) {
                data += `<tr>
<td absheight="10">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="10">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0" bgcolor="#1F2033" background="">
<tbody><tr>
<td rowspan="100" abswidth="10" bgcolor="191919">
<img src="wtv-star:/ROMCache/Spacer.gif" width="10" height="1">
</td><td colspan="9" abswidth="422" valign="bottom">
<img src="wtv-mail:/ROMCache/PaperTopFlat.gif" noprint="" width="422" height="6">
</td></tr><tr>
<td rowspan="100" abswidth="2" absheight="0" bgcolor="313131">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="14" absheight="0">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td colspan="2" abswidth="386">
</td><td rowspan="100" abswidth="14" absheight="0">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="3" absheight="0" bgcolor="0b0b0b">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="0f0f0f">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="131313">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td><td rowspan="100" abswidth="1" absheight="0" bgcolor="171717">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="1">
</td></tr><tr>
<td colspan="2" absheight="15">
<input type=file device=audio name=message_voicemail_data
src="cache:voicemail.wav" rate=8000 invisible>
${(!mail_draft_attachments.message_voicemail_data) ? '' : '<input type=hidden name=message_voicemail_url value="cache:voicemail.wav">'}
</td></tr><tr>
<td colspan="2" align="center">
<table width=386 cellspacing=0 cellpadding=0>
<td align=left valign=middle>
<a href="${(mail_draft_attachments.message_voicemail_data) ? 'wtv-mail:/sendmail?get_gab=true&wtv-title=Voice%20Mail' : 'cache:voicemail.wav'}" id=focus><img src="wtv-mail:/ROMCache/FileSound.gif" align=absmiddle></a>&nbsp;&nbsp;Recording
<td align=right valign=middle>
<a href="javascript:ErasingMedia('gabbing')">
&nbsp;Detach&nbsp;<img src="wtv-mail:/ROMCache/RemoveButton.gif" align=absmiddle height=25 width=25></a>
</table><tr>
<td colspan="2" absheight="8">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="8">
</td></tr></tbody></table>
<table cellspacing="0" cellpadding="0">
<tbody><tr>
<td rowspan="100" abswidth="10">
<img src="wtv-star:/ROMCache/Spacer.gif" width="10" height="2">
</td><td abswidth="422">
<img src="wtv-mail:/ROMCache/PaperBase.gif" noprint="" width="422" height="6">
</td></tr><tr>
<td absheight="6">
<img src="wtv-star:/ROMCache/Spacer.gif" width="1" height="6">
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