const minisrv_service_file = true;
const wtv_news_service_name = minisrv_config.services[service_name].usenet_service;
const wtvnews = new WTVNews(minisrv_config, wtv_news_service_name);
const service_config = minisrv_config.services[wtv_news_service_name];
if (service_config.local_nntp_port && wtvnewsserver) {
    const tls_options = {
        ca: this.wtvshared.getServiceDep('wtv-news/localserver_ca.pem'),
        key: this.wtvshared.getServiceDep('wtv-news/localserver_key.pem'),
        cert: this.wtvshared.getServiceDep('wtv-news/localserver_cert.pem'),
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
    const errpage = wtvshared.doErrorPage(400 + " " + e.toString(), null, e.toString());
    sendToClient(socket, errpage[0], errpage[1]);
}

function isToday (chkdate) {
    const today = new Date()
    return chkdate.getDate() === today.getDate() &&
        chkdate.getMonth() === today.getMonth() &&
        chkdate.getFullYear() === today.getFullYear()
}

async function WebTVListGroup(group) {
    const page_limit_default = 100;
    wtvnews.connectUsenet().then(() => {
        wtvnews.selectGroup(group).then((response) => {
            let limit_per_page = (request_headers.query.limit) ? parseInt(request_headers.query.limit) : page_limit_default;
            const page = (request_headers.query.chunk) ? parseInt(request_headers.query.chunk) : 0;
            let page_start = (limit_per_page * page) + 1;
            let page_end = (page + 1) * limit_per_page;
            if (page_end > response.group.high) {
                page_end = response.group.high;
                limit_per_page = (page_end - (limit_per_page / (page + 1))) + limit_per_page;
            }
            wtvnews.listGroup(group, page, limit_per_page).then((response) => {
                if (response.code === 211) {
                    let NGCount = response.group.number;
                    const NGArticles = response.group.articleNumbers;
                    page_start = (limit_per_page * page) + 1;
                    page_end = (page + 1) * limit_per_page;
                    wtvnews.getHeaderObj(NGArticles).then((messages) => {
                        NGCount = NGArticles.length;
                        messages = wtvnews.sortByResponse(messages);
                        wtvnews.quitUsenet();
                        headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire: News.aspx?group=${request_headers.query.group}`
                        data = `<HTML>
<HEAD>
<script language=javascript>
if (top.frames.length > 1)
top.location="news:${request_headers.query.group}";
</script>
<TITLE>${request_headers.query.group}</TITLE>
</HEAD>
<body bgcolor="191919" text="42BD52" link="1bb0f1" vlink="826f7e">
<table cellspacing=0 cellpadding=0>
<td height=31 valign=top>
<font size="+1" color="E7CE4A">
<blackface>
<shadow>
Group: ${request_headers.query.group}
</shadow>
</blackface>
</font>
</table>
<font size=4>
`
                        if (NGCount === 0 || isNaN(NGCount)) {
                            data += `This group has no postings`;
                        } else {
                            data += NGCount + " posting";
                            if (NGCount !== 1)
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
${(page > 0) ? `<a href="News.aspx?group=${group}&chunk=${page - 1}${(limit_per_page !== page_limit_default) ? `&limit=${limit_per_page}` : ''}"><img src="ListPrevious.gif"></a>` : `<img src="ListPrevious_D.gif">`}
<td rowspan=4 height=26 width=11>
<img src="ListLeftEdge.gif">
<td height=2 valign=top align=left bgcolor="2b2b2b">
<td rowspan=4 height=26 width=11>
<img src="ListRightEdge.gif">
<td rowspan=4 height=26 width=30>
${(page_end < NGCount) ? `<a href="News.aspx?group=${group}&chunk=${page + 1}${(limit_per_page !== page_limit_default) ? `&limit=${limit_per_page}` : ''}"><img src="ListNext.gif"></a>` : `<img src="ListNext_D.gif">`}
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
                                const message = messages[k].article;
                                const has_relation = (messages[k].relation !== null) ? true : false;
                                const date_obj = new Date(Date.parse(message.headers.DATE));
                                const date = (isToday(date_obj)) ? strftime("%I:%M %p", date_obj) : strftime("%b %d '%y", date_obj)
                                data += `
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=10>
<td abswidth=426 height=42 valign=bottom>
<table cellspacing=0 cellpadding=0  nocolor selected>
<tr>
${(has_relation) ? `<td abswidth=20 rowspan=2 valign=top><font size="+2">&#149;` : ''}
<td abswidth=426 maxlines=1>
<a href="News.aspx?group=${request_headers.query.group}&article=${message.articleNumber}" id="${message.messageId}">
<font color=1bb0f1>${(message.headers.SUBJECT) ? wtvshared.htmlEntitize(message.headers.SUBJECT) : "(No Subject)"}
</a>
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
                throwError("No such group");
            });
        }).catch((e) => {
            // selectGroup error
            throwError("No such group")
        });
    }).catch((e) => {
        // connect error
        throwError(e)
    });
}

async function WebTVShowMessage(group, article) {
    const theArticle = parseInt(article);
    wtvnews.connectUsenet().then(() => {
        wtvnews.selectGroup(group).then((response) => {
            wtvnews.getArticle(theArticle).then((response) => {
                wtvnews.quitUsenet();
                headers = `200 OK
Content-type: text/html`;
                let signature = null;
                let message_colors = session_data.mailstore.defaultColors;
                const display_signature = true; // todo make a toggle
                const message = wtvnews.parseAttachments(response);
                const message_body = message.text;
                let attachments = null;
                let signature_index = null;
                wtvnews.debug(message);
                if (message.attachments) attachments = message.attachments;
                if (attachments) {
                    if (Object.keys(attachments).length > 0) {
                        Object.keys(attachments).forEach((k) => {
                            if (attachments[k].filename === "wtv_signature.html" && attachments[k].content_type.match(/text\/html/)) {
                                signature = attachments[k].data;
                                signature_index = k;
                                return false;
                            }
                        });
                        if (signature_index) attachments.splice(signature_index, 1);
                    }
                }

                if (message_body.indexOf("<body")) {
                    const default_colors = session_data.mailstore.defaultColors;
                    message_colors = session_data.mailstore.getSignatureColors(message_body);
                    if ((message_colors === default_colors) && signature) message_colors = null;
                }
                if (!message_colors && signature) message_colors = session_data.mailstore.getSignatureColors(signature);

                if (signature) message_colors = session_data.mailstore.getSignatureColors(signature);

                data = `<head>
<sendpanel
action="/Post.aspx?message_forward_id=1&mailbox_name=inbox"
message="Forward this post to someone else."
label="Forward">
<title>
${(response.article.headers.SUBJECT) ? wtvshared.htmlEntitize(response.article.headers.SUBJECT) : '(No subject)'}
</title>
</head>
<print blackandwhite>
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
<tr>
<td valign=top>
From:
<td>`;
                              if (message.from_name !== message.from_addr) {
                                    data += `<a href="client:showalert?sound=none&message=Would%20you%20like%20to%20add%20%3Cblackface%3E${wtvshared.htmlEntitize(message.from_name)}%3C%2Fblackface%3E%20to%20your%20address%20list%3F&buttonlabel2=No&buttonaction2=client:donothing&buttonlabel1=Yes&buttonaction1=wtv-mail:/addressbook%3Faction%3Deditfromheader%26noresponse%3Dtrue%26nickname%3D${wtvshared.escape(wtvshared.escape(message.from_name))}%26address%3D${wtvshared.escape(wtvshared.escape(message.from_addr))}%26new_address%3Dtrue">${wtvshared.htmlEntitize(message.from_addr)} </a>`;
                                } else {
                data += `${wtvshared.htmlEntitize(response.article.headers.FROM)}`;
                                }

                data += `<tr>
<td nowrap valign=top>
<td>
<tr>
<td valign=top>Subject:
<td>${(response.article.headers.SUBJECT) ? wtvshared.htmlEntitize(response.article.headers.SUBJECT) : '(No subject)'}
</table>
<br><br>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=10 rowspan=99>

<tr>
<td>
`;
                let allow_html = false;
                let body_data = '';
                let attachment_data = '';
                let signature_data = '';

                if (message_body) {
                    if (message_body.indexOf("<html>") >= 0) {
                        allow_html = true;
                    }
                    body_data += (allow_html) ? wtvshared.sanitizeSignature(message_body) : wtvshared.htmlEntitize(message_body, true)
                    body_data += `<br><br>`;
                }

                if (signature) signature_data += wtvshared.sanitizeSignature(signature);


                if (attachments) {
                    if (attachments[0]) {
                        if (attachments[0].filename === "message.html") {
                            body_data += wtvshared.sanitizeSignature(attachments[0].data);
                            delete attachments[0];
                        }
                    }
                    const supported_images = /image\/(jpe?g|png|gif|x-wtv-bitmap)/;
                    const supported_audio = /audio\/(mp[eg|2|3]|midi?|wav|x-wav|mod|x-mod)/;
                    attachments.forEach((v, k) => {
                        if (v.content_type) {
                            if (v.content_type.match(supported_images))
                                attachment_data += `<img border=2 src="attachment.aspx?group=${group}&article=${article}&attachment_id=${k}&wtv-title=Video%20Snapshot"><br><br>`;
                            else if (v.content_type.match(supported_audio))
                                attachment_data += `<table href="attachment.aspx?group=${group}&article=${article}&attachment_id=${k}" width=386 cellspacing=0 cellpadding=0>
    <td align=left valign=middle><img src="FileSound.gif" align=absmiddle><font color="#189CD6">&nbsp;&nbsp;${(v.filename) ? (v.filename) : "Audio file"} (${v.content_type.split('/')[1]} attachment)</font>
    <td align=right valign=middle>
    </table><br><br>`;
                            else if (v.content_type.match("text/html"))
                                attachment_data += wtvshared.sanitizeSignature(v.data);
                            else
                                attachment_data += `<table width=386><td><td align=left valign=middle><font color="#565656"><i>A file ${(v.filename) ? `(${v.filename}) ` : ''}that WebTV cannot use, with type ${v.content_type} is attached to this message.</i></font>`
                        }
                    });
                }
                /*
                if (message.url) {
                    data += `Included Page: <a href="${(message.url)}">${wtvshared.htmlEntitize(message.url_title).replace(/&apos;/gi, "'")}`;
                }
                */
                data += body_data;
                data += signature_data + "<p>";
                data += attachment_data;
                data += "</table></body></html>";
                sendToClient(socket, headers, data);

            }).catch((e) => {
                // no such article
                const post_unavailable_file = this.wtvshared.getServiceDep('wtv-news/post-unavailable.html');
                console.log(e);
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
            wtvnews.quitUsenet();
            headers = `200 OK
Content-type: text/html
wtv-expire-all: News.aspx?search=`;

            data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>${(response.length === 0) ? "No " : ""}Discussion groups found</TITLE>
</HEAD>
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
${(response.length === 0) ? "No " : ""}Discussion groups found
</table>
<td abswidth=20>
<tr>
<td>
<td WIDTH=198 HEIGHT=200 VALIGN=top ALIGN=left>`;

            if (response.length === 0) {
                data += `There are no discussion groups that match your request. Do you want to look for something else?`;
            } else {
                response.forEach((group) => {
                    data += `<hr width=436>
<IMG src="wtv-home:/ROMCache/Spacer.gif" width=1 height=6><br>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=10>
<td width=426>	<table  selected cellspacing=0 cellpadding=0>
<tr>
<td abswidth=401 height=19 valign=top>
<a href="News.aspx?group=${group.name}"><shadow><b>${group.name}</b></shadow></a>
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
<form action="News.aspx">
<input name="search" bgcolor=#202020 cursor=#cc9933 text="E7CE4A" font=proportional value="${request_headers.query.search}" SIZE=28 MAXLENGTH=100>
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
    const errpage = wtvshared.doErrorPage();
    headers = errpage[0];
    data = errpage[1];
} else {
    request_is_async = true;
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
 