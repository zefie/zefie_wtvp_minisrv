var minisrv_service_file = true;

const wtvnews = new WTVNews(minisrv_config, service_name);
var service_config = minisrv_config.services[service_name];
if (service_config.local_nntp_port && wtvnewsserver) {
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
        wtvnews.initializeUsenet(service_config.upstream_address, service_config.upstream_port, service_config.upstream_tls || null);
}
 
async function throwError(e) {
    console.log(e);
    var errpage = wtvshared.doErrorPage(400, null, e.toString());
    sendToClient(socket, errpage[0], errpage[1]);
}

function isToday (chkdate) {
    const today = new Date()
    return chkdate.getDate() == today.getDate() &&
        chkdate.getMonth() == today.getMonth() &&
        chkdate.getFullYear() == today.getFullYear()
}

async function WebTVListGroup(group) {
    var page_limit_default = 100;
    wtvnews.connectUsenet().then(() => {
        wtvnews.selectGroup(group).then(() => {
            var limit_per_page = (request_headers.query.limit) ? parseInt(request_headers.query.limit) : page_limit_default;
            var page = (request_headers.query.chunk) ? parseInt(request_headers.query.chunk) : 0;

            wtvnews.listGroup(group, page, limit_per_page).then((response) => {
                if (response.code == 211) {
                    NGCount = response.group.number;
                    NGArticles = response.group.articleNumbers;
                    page_start = (limit_per_page * page) + 1;
                    page_end = (page + 1) * limit_per_page;
                    if (page_end > NGCount) page_end = NGCount;
                    wtvnews.getHeaderObj(NGArticles).then((messages) => {
                        messages = wtvnews.sortByResponse(messages);
                        wtvnews.quitUsenet();
                        headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire: wtv-news:/news?group=${request_headers.query.group}`
                        data = `<HTML>
<HEAD>
<script language=javascript>
if (top.frames.length > 1)
top.location="news:${request_headers.query.group}";
</script>
<TITLE>${request_headers.query.group}</TITLE>
</HEAD>
<body bgcolor="191919" text="42BD52" link="1bb0f1" vlink="826f7e" hspace=0 vspace=0 logo="wtv-news:/images/news_logo.gif">
<sidebar width=114 height=420 align=left>
<table cellspacing=0 cellpadding=0 bgcolor=3d2f3a>
<tr>
<td colspan=3 width=104 absheight=4>
<td rowspan=100 width=10 height=420 valign=top align=left bgcolor=191919>
<img src="wtv-mail:/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table href="wtv-news:/lobby"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1>
<shadow><font sizerange=medium color="E7CE4A">Lobby</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table href="wtv-mail:/sendmail?discuss=true&group=${request_headers.query.group}&discuss-prefix=${service_name}"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1>
<shadow><font sizerange=medium color="E7CE4A">Post</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Discuss&subtopic=Index&appName=Discuss"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1>
<shadow><font sizerange=medium color="E7CE4A">Help</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=207 valign=bottom align=right >
<img src="wtv-news:/images/BannerDiscuss.gif" width=50 height=165>	<tr><td colspan=3 absheight=36>
</table>
</sidebar>

<table cellspacing=0 cellpadding=0>
<tr>
<td rowspan=100 width=10 height=384 valign=top align=left>
<td height=16 width=416 valign=top align=left>
<td rowspan=100 width=20 height=384 valign=top align=left>
<tr>
<td height=31 valign=top>
<font size="+1" color="E7CE4A">
<blackface>
<shadow>
Group: ${request_headers.query.group}
</shadow>
</blackface>
</font>
</table>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=6>
<td width=180 valign=bottom align=right>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=10 height=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=1>
<td height=33 width=256 valign=bottom>
<font size=4>
`
                        if (NGCount == 0) {
                            data += `This group has no postings`;
                        } else {
                            data += NGCount + " posting";
                            if (NGCount != 1)
                                data += "s"
                        }
                        data += `
</font>
<br>
<img src="wtv-home:/ROMCache/Spacer.gif" width=0 height=8>
`;
                        if (NGCount > 0) {
                            data += `
<td width=180 valign=bottom align=right>
<table cellspacing=0 cellpadding=0>
<td rowspan=4 height=26 width=30>
${(page > 0) ? `<a href="wtv-news:/news?group=${group}&chunk=${page - 1}${(limit_per_page != page_limit_default) ? `&limit=${limit_per_page}` : ''}"><img src="wtv-news:/images/ListPrevious.gif"></a>` : `<img src="wtv-news:/images/ListPrevious_D.gif">`}
<td rowspan=4 height=26 width=11>
<img src="wtv-news:/images/ListLeftEdge.gif">
<td height=2 valign=top align=left bgcolor="2b2b2b">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<td rowspan=4 height=26 width=11>
<img src="wtv-news:/images/ListRightEdge.gif">
<td rowspan=4 height=26 width=30>
${(page_end < NGCount) ? `<a href="wtv-news:/news?group=${group}&chunk=${page + 1}${(limit_per_page != page_limit_default) ? `&limit=${limit_per_page}` : ''}"><img src="wtv-news:/images/ListNext.gif"></a>` : `<img src="wtv-news:/images/ListNext_D.gif">`}
<td rowspan=4 width=5>
<tr>
<td height=2 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td height=20 valign=middle align=center>
${page_start}-${page_end}
<tr>
<td height=2 valign=top align=left bgcolor="000000">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=5 height=3>
</table>	`;
                        }
                        data += `</table>
<TABLE width=446 cellspacing=0 cellpadding=0>
<tr>
<td rowspan=4>
<tr>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=1>
<td height=2 width=436 bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td height=1>
<tr>
<td height=2 bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td height=6>
</TABLE>`
                        if (NGCount > 0) {

                            Object.keys(messages).forEach(function (k) {
                                var message = messages[k].article;
                                var has_relation = (messages[k].relation !== null) ? true : false;
                                var date_obj = new Date(Date.parse(message.headers.DATE));
                                var date = (isToday(date_obj)) ? strftime("%I:%M %p", date_obj) : strftime("%b %d", date_obj)
                                data += `
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=10>
<td abswidth=426 height=42 valign=bottom>
<table cellspacing=0 cellpadding=0 href="wtv-news:/news?group=${request_headers.query.group}&article=${message.articleNumber}" id="${message.messageId}" nocolor selected>
<tr>
${(has_relation) ? `<td abswidth=20 rowspan=2 valign=top><font size="+2">&#149;` : ''}
<td abswidth=426 maxlines=1>
<font color=1bb0f1>${(message.headers.SUBJECT) ? message.headers.SUBJECT : "(No Subject)"}
<tr>
<td maxlines=1>
<font size="-1" color=544f53><b>
${(message.headers.FROM.indexOf(' ') > 0) ? message.headers.FROM.split(' ')[0] : message.headers.FROM}, ${date}
</table>
<td abswidth=10>
</table>`;
                            });
                        }
                        data += `
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=6><br>
<TABLE width=446 cellspacing=0 cellpadding=0>
<tr>
<td rowspan=4 width=10 height=1>
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td height=1>
<tr>
<td height=2 bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td height=6>
</TABLE>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=10 height=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=1>
<td height=33 width=256 valign=bottom>
</BODY>
</HTML>`;

                        sendToClient(socket, headers, data);
                    }).catch((e) => {
                        // getHeaderObj err
                        throwError(e)
                    });;
                }
            }).catch((e) => {
                // listGroup error
                throwError(e)
            });;
        }).catch((e) => {
            // selectGroup error
            throwError(e)
        });
    }).catch((e) => {
        // connect error
        throwError(e)
    });
}

async function WebTVShowMessage(group, article) {
    var article = parseInt(article);
    wtvnews.connectUsenet().then(() => {
        wtvnews.selectGroup(group).then((response) => {
            wtvnews.getArticle(article).then((response) => {
                wtvnews.quitUsenet();
                headers = `200 OK
Content-type: text/html
wtv-expire-all: wtv-news:/news?group=${group}&article=`;
                var signature = null;
                var message_colors = session_data.mailstore.defaultColors;
                var display_signature = true; // todo make a toggle
                var message = wtvnews.parseAttachments(response);
                var message_body = message.text;
                var attachments = null;
                var signature_index = null;
                if (message.attachments) attachments = message.attachments;
                Object.keys(attachments).forEach((k) => {
                    if (attachments[k].filename == "wtv_signature.html" && attachments[k].content_type.match(/text\/html/)) {
                        signature = attachments[k].data;
                        signature_index = k;
                        return false;
                    }
                });
                attachments.splice(signature_index, 1);
                console.log(signature)

                if (signature) message_colors = session_data.mailstore.getSignatureColors(signature);

                data = `<head>
<sendpanel
action="wtv-mail:/sendmail?message_forward_id=1&mailbox_name=inbox"
message="Forward this post to someone else."
label="Forward">
<title>
${(response.article.headers.SUBJECT) ? wtvshared.htmlEntitize(response.article.headers.SUBJECT) : '(No subject)'}
</title>
</head>
<print blackandwhite>
<sidebar width=114 height=420 align=left>
<table cellspacing=0 cellpadding=0 bgcolor=3d2f3a>
<tr>
<td colspan=3 width=104 absheight=4>
<td rowspan=100 width=10 height=420 valign=top align=left bgcolor=${message_colors.bgcolor}>
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
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table selected href="wtv-news:/news?group=${group}"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Group</font></shadow>
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
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0${(response.prev_article) ? ` href="wtv-news:/news?group=${request_headers.query.group}&article=${response.prev_article}"` : ''}>
<tr>
<td abswidth=5>
<td abswidth=88 valign=middle align=left >
<table cellspacing=0 cellpadding=0><tr><td><shadow><font color="${(response.prev_article) ? "#E7CE4A" : "#5b4b58"}" sizerange=medium>Previous</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left >
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0${(response.next_article) ? ` href="wtv-news:/news?group=${request_headers.query.group}&article=${response.next_article}"` : ''}>
<tr>
<td abswidth=5>
<td abswidth=88 valign=middle align=left >
<table cellspacing=0 cellpadding=0><tr><td><shadow><font color="${(response.next_article) ? "#E7CE4A" : "#5b4b58"}" sizerange=medium>Next</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=202434>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table
xnocancel
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font color=5b4b58 sizerange=medium>Next New</font></shadow>
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
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="5b4b58">Mail to</font></shadow>
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
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="wtv-mail:/sendmail?discuss=true&message_subject=${encodeURIComponent("Re: " + response.article.headers.SUBJECT)}&group=${response.article.headers.NEWSGROUPS}&discuss-prefix=${service_name}&article=${request_headers.query.article}"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1><shadow><font sizerange=medium color="E7CE4A">Respond</font></shadow>
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
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=26>
<table href="wtv-guide:/helpindex?title=Index_Mail&topic=2&subtopic=1"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
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
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=81 valign=bottom align=right>
<tr><td colspan=3 absheight=36>
</table>
</sidebar>
<body bgcolor=${message_colors.bgcolor}
text=${message_colors.text}
link=${message_colors.link}
vlink=${message_colors.vlink}
vspace=0
hspace=0>          
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=10 rowspan=99>
<td height=16>
<td rowspan=99>&nbsp;&nbsp;
<td>
<td abswidth=20 rowspan=99>
<tr>
<td colspan=3 height=39 valign=top>
<font color="E7CE4A" size=+1><blackface><shadow>
Post
<tr>
<td valign=top>
Group:
<td>
${wtvshared.htmlEntitize(response.article.headers.NEWSGROUPS)}
<tr>
<td valign=top>
Date: <td>
${strftime("%a, %b %e, %Y, %I:%M%P", new Date(Date.parse(response.article.headers.DATE)))}
<font size=-1> </font>
<tr>
<td valign=top>
From:
<td>`;
                //              if (message.from_name != message.from_addr) {
                //                    data += `<a href="client:showalert?sound=none&message=Would%20you%20like%20to%20add%20%3Cblackface%3E${wtvshared.htmlEntitize(message.from_name)}%3C%2Fblackface%3E%20to%20your%20address%20list%3F&buttonlabel2=No&buttonaction2=client:donothing&buttonlabel1=Yes&buttonaction1=wtv-mail:/addressbook%3Faction%3Deditfromheader%26noresponse%3Dtrue%26nickname%3D${escape(escape(message.from_name))}%26address%3D${escape(escape(message.from_addr))}%26new_address%3Dtrue">${wtvshared.htmlEntitize(message.from_addr)} </a>`;
                //                } else {
                data += `${wtvshared.htmlEntitize(response.article.headers.FROM)}`;
                //                }

                data += `<tr>
<td nowrap valign=top>
<td>
</table>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=10 rowspan=99>
<td><br><br><br><font color=E7CE4A>
${(response.article.headers.SUBJECT) ? wtvshared.htmlEntitize(response.article.headers.SUBJECT) : '(No subject)'}<br><br>
</font>
<td abswidth=20 rowspan=99>
<tr>
<td>
`                
                data += `
${wtvshared.htmlEntitize(message_body, true)}
<br>
<br>`;
                if (signature) data += wtvshared.sanitizeSignature(signature);
                data += "<p>";

                if (attachments) {
                    var supported_images = /image\/(jpe?g|png|gif|x-wtv-bitmap)/;
                    var supported_audio = /audio\/(mp[eg|2|3]|midi?|wav|x-wav|mod|x-mod)/;
                    attachments.forEach((v, k) => {
                        if (v.content_type) {
                            if (v.content_type.match(supported_images))
                                data += `<img border=2 src="wtv-news:/get-attachment?group=${group}&article=${article}&attachment_id=${k}&wtv-title=Video%20Snapshot"><br><br>`;
                            else if (v.content_type.match(supported_audio))
                                data += `<table href="wtv-news:/get-attachment?group=${group}&article=${article}&attachment_id=${k}&wtv-title=${(v.filename) ? encodeURIComponent(v.filename) : "Audio%20file"}" width=386 cellspacing=0 cellpadding=0>
    <td align=left valign=middle><img src="wtv-news:/ROMCache/FileSound.gif" align=absmiddle><font color="#189CD6">&nbsp;&nbsp;${(v.filename) ? (v.filename) : "Audio file"} (${v.content_type.split('/')[1]} attachment)</font>
    <td align=right valign=middle>
    </table><br><br>`;
                            else
                                data += `<table width=386><td><td align=left valign=middle><font color="#565656"><i>A file ${(v.filename) ? `(${v.filename}) ` : ''}that WebTV cannot use, with type ${v.content_type} is attached to this message.</i></font>`
                        }
                    });
                }
                /*
                if (message.url) {
                    data += `Included Page: <a href="${(message.url)}">${wtvshared.htmlEntitize(message.url_title).replace(/&apos;/gi, "'")}`;
                }
                */
                data += "</table></body></html>";
                sendToClient(socket, headers, data);

            }).catch((e) => {
                // no such article
                var post_unavailable_file = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + '/wtv-news/post-unavailable.html');
                if (fs.existsSync(post_unavailable_file)) {
                    headers = "200 OK\nContent-type: text/html";
                    data = fs.readFileSync(post_unavailable_file).toString('ascii').replace("${group}", group).replace("${minisrv_config.config.service_logo}", minisrv_config.config.service_logo).replace("${message_colors.bgcolor}",session_data.mailstore.defaultColors.bgcolor);
                    sendToClient(socket, headers, data);
                } else {
                    throwError(e);
                }
            });
        }).catch((e) => {
            // no such group
            throwError(e);
        });
    }).catch((e) => {
        //no connection
        throwError(e);
    });
}

function WebTVSearchGroups(search) {
    wtvnews.connectUsenet().then(() => {
        wtvnews.listGroups(search).then((response) => {
            console.log('WebTVSearchGroups listGroups response', response)
            wtvnews.quitUsenet();
            headers = `200 OK
Content-type: text/html
wtv-expire-all: wtv-news:/news?search=`;

            data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>${(response.length == 0) ? "No " : ""}Discussion groups found</TITLE>
</HEAD>
<sidebar width=114 height=420 align=left>
<table cellspacing=0 cellpadding=0 bgcolor=3d2f3a>
<tr>
<td colspan=3 width=104 absheight=4>
<td rowspan=100 width=10 height=420 valign=top align=left bgcolor=191919>
<img src="wtv-mail:/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=93 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table href="wtv-news:/news?category=1"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1>
<shadow><font sizerange=medium color="E7CE4A">All groups</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td abswidth=6 >
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Discuss&subtopic=Index&appName=Discuss"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left>
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td absheight=1>
<tr>
<td maxlines=1>
<shadow><font sizerange=medium color="E7CE4A">Help</font></shadow></table>
</table>
<td abswidth=5>
<tr>
<td colspan=3 absheight=2 valign=middle align=center bgcolor=231d22>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=1 valign=top align=left <img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 absheight=2 valign=top align=left bgcolor=5b4b58>
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr>
<td colspan=3 height=237 valign=bottom align=right >
<img src="wtv-news:/images/BannerDiscuss.gif" width=50 height=165>
<tr><td colspan=3 absheight=36>
</table>
</sidebar>
<body
bgcolor="191919" text="42BD52" link="189CD6"
vlink="189CD6"
hspace=0
vspace=0>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=10>
<td colspan=3>
<table cellspacing=0 cellpadding=0>
<tr>
<td valign=center absheight=80>
<font size="+2" color="E7CE4A"><blackface><shadow>
${(response.length == 0) ? "No " : ""}Discussion groups found
</table>
<td abswidth=20>
<tr>
<td>
<td WIDTH=198 HEIGHT=200 VALIGN=top ALIGN=left>`;

            if (response.length == 0) {
                data += `There are no discussion groups that match your request. Do you want to look for something else?`;
            } else {
                response.forEach((group) => {
                    data += `<hr width=436>
<IMG src="wtv-home:/ROMCache/Spacer.gif" width=1 height=6><br>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=10>
<td width=426>	<table href="wtv-news:/news?group=${group.name}" selected cellspacing=0 cellpadding=0>
<tr>
<td abswidth=401 height=19 valign=top>
<shadow><b>${group.name}</table>
<td width=10>

`
                    if (group.description) {
                        data += `<tr><td colspan=3 width=10 height=6><tr><td width=10><td colspan=99><i><font color=828282>${group.description}</font></i>`
                    }
                    data += "</table>";
                });
            }

            data += `
</table>
<TABLE width=446 cellspacing=0 cellpadding=0>
<tr>
<td rowspan=3 width=10 height=1>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=1>
<td height=2 width=436 bgcolor="2B2B2B">
<img src="wtv-home:/ROMCache/Spacer.gif" width=436 height=1>
<tr>
<td height=1>
<tr>
<td height=2 bgcolor="0D0D0D">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</TABLE>
<table cellspacing=0 cellpadding=0>
<tr>
<td rowspan=2 abswidth=10>
<td absheight=10>
<tr>
<td abswidth=416 valign=top align=left>
Do you want to look for something else?<br>
<img src="/ROMCache/Spacer.gif" width=1 height=4>
<form action="wtv-news:search">
<input name="search" bgcolor=#202020 cursor=#cc9933 text="E7CE4A" font=proportional value="" SIZE=28 MAXLENGTH=100>
&nbsp;
<font color=E7CE4A><shadow>
<input type=submit borderimage="file://ROM/Borders/ButtonBorder2.bif" value="Look for" usestyle>
</shadow></font>
</form>
</table>
</BODY>
</HTML>`;
            sendToClient(socket, headers, data);
        }).catch((e) => {
            // listGroups error
            throwError(e);
        });

    }).catch((e) => {
        // no connection
        throwError(e);
    });
}


if (!wtvnews.client) {
    var errpage = doErrorPage();
    headers = errpage[0];
    data = errpage[1];
} else {
    var request_is_async = true;
    if (request_headers.query.search) {
        WebTVSearchGroups(request_headers.query.search)
    } else if (request_headers.query.group) {
        if (request_headers.query.article) {
            WebTVShowMessage(request_headers.query.group, request_headers.query.article);
        } else {
            WebTVListGroup(request_headers.query.group);
        }
    } else {
        // redirect to lobby if no understandable queries passed
        headers = "300 OK\nLocation: wtv-news:/lobby";
        sendToClient(socket, headers, null);
    }
}
 