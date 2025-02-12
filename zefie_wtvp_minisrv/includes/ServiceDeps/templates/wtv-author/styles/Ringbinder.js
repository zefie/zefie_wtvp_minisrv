class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#000000";
        this.styledata.link = "#180d4b";
        this.styledata.vlink = "#660000";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = ["/clipart/styleMedia/ringbinder.gif"];
        this.styledata.headerimgL = null;
        this.styledata.headerimgLheight = null;
        this.styledata.headerimgLwidth = null;
        this.styledata.headerimgR = null;
        this.styledata.headerimgRheight = null;
        this.styledata.headerimgRwidth = null;
        this.styledata.header = `<html><head>
<meta http-equiv="content-type" content="text/html; charset=windows-1252">
<meta name="generator" content="WebTV Page Builder (Rebuilt By JarHead)">
<meta name="description" content="${desc}">
<title>${title}</title>
</head>
<body text="black" link="#552768" bgcolor="white" vlink="#333333" background="clipart/styleMedia/ringbinder.gif">`;
        if (state == "previewing") {
            this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>
`;
        }
        this.styledata.header += `<TABLE border=0 cellspacing=0 cellpadding=0>`;
        this.styledata.titheader = `<TR>
<TD width=80 rowspan=2></TD>
<TD >
<CENTER>
<FONT size=7>`;
        if (state == "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader +=
            `<font color=` + this.styledata.text + `><b>${title}</B>`;
        if (state == "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.titheader += `</FONT></CENTER>
</TD>
</TR>
<TR>
<TD valign=top>
<FONT size=6 color=#666666><B>`;

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = "";

        this.styledata.footerstart = `
<table width="100%" cellspacing="2" cellpadding="0" border="0">
<tbody><tr height="0">
<td height="0">
<spacer type="block" width="30%" height="0">
</spacer></td><td height="0">
<spacer type="block" width="30%" height="0">
</spacer></td><td height="0">
<spacer type="block" width="30%" height="0">
</spacer></tr>`;
        this.styledata.webtvfooter = wtvauthor.getCommonFooter();
        this.styledata.footerend = `
</td>
</tr>
</table>
</B></FONT></P>
<P>&nbsp;</TD>
</TR>
</TABLE>
</BODY>
</HTML>`;
    }

    get() {
        return this.styledata;
    }
}

module.exports = PBTemplate;
