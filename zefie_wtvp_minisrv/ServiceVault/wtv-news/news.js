var minisrv_service_file = true;

console.log('f')

async function throwError(e) {
    var errpage = wtvshared.doErrorPage(400, null, e.toString());
    sendToClient(socket, errpage[0], errpage[1]);
}


async function WebTVListGroup(group) {
    wtvnews.connectUsenet().then(() => {
        wtvnews.selectGroup(group).then(() => {
            wtvnews.listGroup(group).then((response) => {
                if (response.code == 211) {
                    NGCount = response.group.number;
                    NGArticles = response.group.articleNumbers;

                    wtvnews.getHeaderObj(NGArticles).then((messages) => {
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
<table href="wtv-mail:/sendmail?discuss=true&group=${request_headers.query.group}&discuss-prefix=wtv-news"
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
<td colspan=3 height=237 valign=bottom align=right >
<img src="wtv-forum:/images/BannerDiscuss.gif" width=50 height=165>	<tr><td colspan=3 absheight=36>
</table>
</sidebar>
<body
bgcolor="191919" text="42BD52" link="1bb0f1"
vlink="826f7e"
hspace=0
vspace=0
logo="wtv-forum:/images/news_logo.gif">

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
<TABLE width=446 cellspacing=0 cellpadding=0>
<tr>
<td rowspan=4 width=10 height=1>
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
                                var message = messages[k]
                                var message_date = message.headers.DATE;
                                data += `
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=10>
<td abswidth=426 height=42 valign=bottom>
<table cellspacing=0 cellpadding=0 href="wtv-news:/news?group=${request_headers.query.group}&article=${message.articleNumber}" id="${message.messageId}" nocolor selected>
<tr>
<td abswidth=426 maxlines=1>
<font color=1bb0f1>${(message.headers.SUBJECT) ? message.headers.SUBJECT : "(No Subject)"}
<tr>
<td maxlines=1>
<font size="-1" color=544f53><b>
${message.headers.FROM}, ${message.headers.DATE}                        
</b>
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
</TABLE>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=10 height=1 valign=top align=left>
<img src="wtv-home:/ROMCache/Spacer.gif" width=10 height=1>
<td height=33 width=256 valign=bottom>
</BODY>
</HTML>`;

                        sendToClient(socket, headers, data);
                    }).catch((e) => { throwError(e) });;
                }
            }).catch((e) => { throwError(e) });;
        }).catch((e) => { throwError(e) });;
    }).catch((e) => { throwError(e) });
}

async function WebTVShowMessage(client, group, article) {
    var connected = await clientConnect(client)
    if (connected) {
        response = await selectGroup(client, group);
        if (response) {
            response = await getArticle(client, article);
            console.log(response);
            if (response.code == 220) {
                headers = `200 OK
Content-type: text/html`;

                var message_colors = session_data.mailstore.defaultColors;

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
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=88 valign=middle align=left >
<table cellspacing=0 cellpadding=0><tr><td><shadow><font color=5b4b58 sizerange=medium>Previous</font></shadow></table>
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
<table bgcolor=3d2f3a cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=88 valign=middle align=left >
<table cellspacing=0 cellpadding=0><tr><td><shadow><font color=5b4b58 sizerange=medium>Next</font></shadow></table>
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
<table href="wtv-mail:/sendmail?discuss=true&message_subject=${("Re: " + response.article.headers.SUBJECT)}&group=${response.article.headers.NEWSGROUPS}"
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
${console.log(Date.parse(response.article.headers.DATE))}
${strftime("%a, %b %e, %Y, %I:%M%P", new Date(Date.parse(response.article.headers.DATE) / 1000))}
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
`;
                var message_body = response.article.body.join("\n");
                data += `
${wtvshared.htmlEntitize(message_body, true)}
<br>
<br>`;
                data += `<p>
`;
                /*
                if (message.attachments) {
                    message.attachments.forEach((v, k) => {
                        if (v) {
                            console.log("*****************", v['Content-Type']);
                            switch (v['Content-Type']) {
                                case "image/jpeg":
                                    data += `<img border=2 src="wtv-news:/get-attachment?message_id=${messageid}&attachment_id=${k}&group=${(message.to_group)}&wtv-title=Video%20Snapshot" width="380" height="290"><br><br>`;
                                    break;
                                case "audio/wav":
                                    data += `<table href="wtv-news:/get-attachment?message_id=${messageid}&attachment_id=${k}&group=${(message.to_group)}&wtv-title=Voice%20Mail" width=386 cellspacing=0 cellpadding=0>
<td align=left valign=middle><img src="wtv-mail:/ROMCache/FileSound.gif" align=absmiddle><font color="#189CD6">&nbsp;&nbsp;recording.wav (wav attachment)</font>
<td align=right valign=middle>
</table><br><br>
`;
                                    break;
                            }
                        }
                    });
                }
                if (message.url) {
                    data += `Included Page: <a href="${(message.url)}">${wtvshared.htmlEntitize(message.url_title).replace(/&apos;/gi, "'")}`;
                }
                */
                data += `
</table>
      </body>
</html>
`;
                sendToClient(socket, headers, data);
            } else {
                var errpage = wtvshared.doErrorPage(400, null, "No such article in group <b>"+group+"</b>");
                sendToClient(socket, errpage[0], errpage[1]);
            }
        } else {
            var errpage = wtvshared.doErrorPage(400, null, "No such group: <b>"+group+"</b>");
            sendToClient(socket, errpage[0], errpage[1]);
        }
    }
}

if (!minisrv_config.services[service_name].upstream_address || !minisrv_config.services[service_name].upstream_port) {
    var errpage = doErrorPage();
    headers = errpage[0];
    data = errpage[1];
} else {
    var request_is_async = true;
    if (request_headers.query.group) {
        if (request_headers.query.article) {
            WebTVShowMessage(request_headers.query.group, request_headers.query.article);
        } else {
            WebTVListGroup(request_headers.query.group);
        }
    }
}
 