class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#7ac2d5";
        this.styledata.link = "#a5a033";
        this.styledata.vlink = "#25a51f";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = [];
        this.styledata.headerimgL = null;
        this.styledata.headerimgLheight = null;
        this.styledata.headerimgLwidth = null;
        this.styledata.headerimgR = null;
        this.styledata.headerimgRheight = null;
        this.styledata.headerimgRwidth = null;
        this.styledata.header = `<html>
<head>
<META NAME="generator" CONTENT="WebTV Page Builder (Rebuilt By JarHead)">
<META NAME="description" CONTENT="${desc}">
<title>${title}</title>
</head>
<body text="#7ac2d5" bgcolor="#11144c" link="#a5a033" vlink="#25a51f">`;
        if (state === "previewing") {
            this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>`;
        }
        this.styledata.header += `
<center>
<font size="+3" color="#66ff66"><b>
<table width="100%" cellspacing="4" cellpadding="4" border="0">
<tbody><tr>
<td>`;
        this.styledata.titheader = ``;
        if (state === "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader +=
            `<font size="+4" color=` +
            this.styledata.text +
            `>${title}</font></td>
<td>`;

        if (state === "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.afterblock1 = `</tr>
</table>
</b></font></center>`;

        this.styledata.tabstart = ``;

        this.styledata.footerstart = `
<table border="0" cellpadding="0" cellspacing="2" width="100%">
<tr height=0>
<td height=0>
<spacer type=block width=30% height=0>
<td height=0>
<spacer type=block width=30% height=0>
<td height=0>
<spacer type=block width=30% height=0>
</tr>`;
        this.styledata.webtvfooter = wtvauthor.getCommonFooter();
        this.styledata.footerend = `</td>
</tr>
</table>
</BODY>
</HTML>`;
    }

    get() {
        return this.styledata;
    }
}

module.exports = PBTemplate;
