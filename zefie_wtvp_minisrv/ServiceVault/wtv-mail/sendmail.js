var minisrv_service_file = true;

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

    var to_addr = request_headers.query.message_to || null;
    var msg_subject = request_headers.query.message_subject || null;
    var msg_body = request_headers.query.message_body || null;
    var to_name = request_headers.query.whatever_webtv_sends_this_as || null;
    var no_signature = request_headers.query.no_signature || false;
    var mail_draft_data = ssid_sessions[socket.ssid].getSessionData("mail_draft");
    if (mail_draft_data) {
        ssid_sessions[socket.ssid].deleteSessionData("mail_draft")
        to_addr = mail_draft_data.to_addr;
        msg_subject = mail_draft_data.msg_subject;
        msg_body = mail_draft_data.msg_body;
        no_signature = mail_draft_data.no_signature;
    }


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

    if (request_headers.query.sendoff == "Send" || request_headers.query.saveoff) {
        var from_addr = address;
        var signature = ssid_sessions[socket.ssid].getSessionData("subscriber_signature") || null;
        if (request_headers.query.sendoff == "Send") {
            var messagereturn = ssid_sessions[socket.ssid].mailstore.sendMessageToAddr(from_addr, to_addr, msg_body, msg_subject, userdisplayname, to_name, signature);
            if (messagereturn !== true) {
                var errpage = wtvshared.doErrorPage(400, messagereturn);
                headers = errpage[0];
                data = errpage[1];
            } else {
                headers = `300 OK
    wtv-expire: wtv-mail:/listmail
    Location: wtv-mail:/listmail`;
            }
        } else {
            var mail_draft_data = {
                to_addr: to_addr,
                msg_subject: msg_subject,
                msg_body: msg_body,
                no_signature: no_signature
            }
            ssid_sessions[socket.ssid].setSessionData("mail_draft", mail_draft_data);
            headers = `200 OK
Content-type text/html
wtv-expire: wtv-mail:/sendmail`;
        }
    } else {

        headers = `200 OK
Content-type text/html`;

        data = `<html>
<head>
<display poweroffalert >
<script language=javascript>
function Submit() {	window.open("client:showsplash?message=Sending%20Message&animation=file://ROM/Animations/mail.ani&action=client:submitform%3Fname%3Dsendform%26submitname%3Dsendoff%26submitvalue%3DSend");
}
function ErasingMedia(victim) {	var myURL;
myURL = "client:submitform?name=sendform&submitvalue=false" + "&submitname=" + victim;
if (victim == "gabbing") {	document.forms.sendform.elements.message_voicemail_data.disabled = true;
}
if (victim == "snapping") {	document.forms.sendform.elements.message_snapshot_data.disabled = true;
}
window.open(myURL);	}
function DoneSnapping() {	var myURL;
myURL = "client:submitform?name=sendform&submitname=snapping&submitvalue=cache%3Asnapshot.jpg";
window.open(myURL);	}
function DoneGabbing() {	var myURL;
myURL = "client:submitform?name=sendform&submitname=gabbing&submitvalue=cache%3Avoicemail.jpg";
window.open(myURL);	}
</script>
<sendpanel
action="javascript:Submit()"
message="Send this message now"
label="Send message"
>
<savepanel message="Messages that you are writing cannot be saved. Send it to yourself if you would like a copy." >
<title>
Write a message
</title>
</head>
<print blackandwhite>
<sidebar width=114 height=420 align=left>
<table cellspacing=0 cellpadding=0 bgcolor=333b5a>
<tr>
<td colspan=3 width=104 absheight=4>
<td rowspan=100 width=10 height=420 valign=top align=left bgcolor=191919>
<img src="wtv-mail:/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0 width=100%>
<tr>
<td abswidth=6>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1>
<td align=center>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="wtv-mail:/listmail"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Mail list</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="client:openaddresspanel" id=addressbook
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Address</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="client:videocapture?notify=javascript%3ADoneSnapping()&device=video&width=75%25&height=75%25&name=cache%3Asnapshot.jpg&donebuttonlabel=Add%20to%20Message&open"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Photo</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="client:soundcapture?notify=javascript%3ADoneGabbing()&device=audio&rate=8000&name=cache%3Avoicemail.wav&donebuttonlabel=Add%20to%20Message&open"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Recording</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="client:showalert?sound=none&message=Are%20you%20sure%20you%20want%20to%20erase%20the%20changes%20to%20this%20message%3F&buttonlabel2=Don't%20Erase&buttonaction2=client:donothing&buttonlabel1=Erase&buttonaction1=wtv-mail:/sendmail%3Fclear%3Dtrue%26wtv-saved-message-id%3Dwritemessage-outbox#focus"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Erase</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="client:submitform?name=sendform&submitname=spelling&submitvalue=true"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Spelling</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="wtv-guide:/help/Mail/Write/Writing"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=333b5a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Help</font></shadow>
</table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=515b84>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=81 valign=bottom align=right>
<tr><td colspan=3 absheight=36>
</table>
</sidebar>
<body instructions="wtv-guide:/helpindex?title=Index_Mail"
bgcolor=191919
text=42BD52
link=189CD6
vlink=189CD6
vspace=0
hspace=0
>            
<table cellspacing=0 cellpadding=0>
<tr>
<td height=16 valign=top align=left>
<tr>
<td height=47 valign=top>
<font size=+1 color="E7CE4A">
<blackface>
<shadow>
<a id=focus></a>
<img src="wtv-home:/ROMCache/Spacer.gif" width=4 height=2>
Write a message
</shadow>
</blackface>
</font>
</table>
<form action="wtv-mail:/sendmail#focus" method="post" name=sendform >
<input type=hidden name="wtv-saved-message-id" value="writemessage-outbox">
<input type=hidden name="message_reply_all_cc" value="">
<input type=hidden name="saveoff" value="true" autosubmit="onleave">
<table cellspacing=0 cellpadding=0 bgcolor="242424"
background=""
>
<tr>
<td rowspan=100 abswidth=10 bgcolor=191919>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=1>
<td colspan=9 abswidth=422 valign=bottom>
<img src="wtv-mail:/ROMCache/PaperTop.gif" noprint width=422 height=26>
<tr>
<td rowspan=100 abswidth=2 absheight=0 bgcolor=313131>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<td rowspan=100 abswidth=14 absheight=0>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<td colspan=2 abswidth=386>
<td rowspan=100 abswidth=14 absheight=0>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<td rowspan=100 abswidth=3 bgcolor=0b0b0b absheight=0>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<td rowspan=100 abswidth=1 bgcolor=0f0f0f absheight=0>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<td rowspan=100 abswidth=1 bgcolor=131313 absheight=0>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<td rowspan=100 abswidth=1 bgcolor=171717 absheight=0>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr absheight=30>
<td abswidth=80 valign=top align=right>
<font color="42BD52">
From:&nbsp;
<td abswidth=306>
<font color="42BD52">
${address}
(${userdisplayname})</font>
<tr>
<td colspan=2 absheight=5>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=5>
<tr absheight=4>
<td colspan=2>
<img src="wtv-mail:/ROMCache/DottedLine.gif" width=386 height=2>
<tr>
<td colspan=2 absheight=5>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=5>
<tr height=30>
<td abswidth=80 valign=top align=right>
<a href="client:openaddresspanel">
To:</a>&nbsp;
<td abswidth=306>
<textarea
bgcolor="242424"
cursor=#cc9933
nosoftbreaks
borderimage="file://ROM/Borders/textfield.alt1.bif"
nohardbreaks
selected
font=proportional
text="42BD52"
name="message_to"
border=0
width=306 rows=1
growable
autoactivate
addresses
autoascii
nohighlight
>${(to_addr) ? to_addr : ''}</textarea>
<tr>
<td colspan=2 absheight=5>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=5>
<tr absheight=4>
<td colspan=2>
<img src="wtv-mail:/ROMCache/DottedLine.gif" width=386 height=2>
<tr>
<td colspan=2 absheight=5>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=5>
<tr height=30>
<td abswidth=80 valign=top align=right nowrap>
<font color="42BD52">
Subject:&nbsp;
<td abswidth=306>
<textarea
bgcolor="242424"
cursor=#cc9933
nosoftbreaks
borderimage="file://ROM/Borders/textfield.alt1.bif"
nohardbreaks
text="42BD52"
name="message_subject" font=proportional
border=0
width=306 rows=1
growable
autoactivate
maxlength=70
nohighlight
autohiragana
>${(msg_subject) ? msg_subject : ''}</textarea>
<tr>
<td colspan=2 absheight=5>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=5>
<tr absheight=4>
<td colspan=2>
<img src="wtv-mail:/ROMCache/DottedLine.gif" width=386 height=2>
<tr>
<td colspan=2 absheight=5>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=5>
<tr>
<td colspan=2 absheight=10>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=10>
<tr>
<td colspan=2 abswidth=386 !!xabswidth=386>
<textarea nosoftbreaks
bgcolor="242424"
text="42BD52"
cursor=#cc9933
name="message_body" font=proportional
border=0
rows=5
width=386
nohighlight
autoactivate
growable>${(msg_body) ? msg_body : ''}</textarea>
<input type=hidden name="no_signature" value="true">
<tr>
<td colspan=2 absheight=8>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=8>
</table>
<table cellspacing=0 cellpadding=0>
<tr>
<td rowspan=100 abswidth=10>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=2>
<td abswidth=422>
<img src="wtv-mail:/ROMCache/PaperBase.gif" noprint
width=422 height=6>
<tr>
<td absheight=6>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=6>
</table>`;
        if (!ssid_sessions[socket.ssid].getSessionData("subscriber_signature") || ssid_sessions[socket.ssid].getSessionData("subscriber_signature") == "") {
            data += `<input type=hidden name="no_signature" value="true" ${(no_signature) ? 'checked="checked"' : ''}> <td abswidth=13>`;
        } else {
            data += `<input type=checkbox name="no_signature"> <td abswidth=13> Disable Signature`;
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
<td width=305 valign=top>
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
</form>
</table>
</body>
</HTML>
`;
    }
}