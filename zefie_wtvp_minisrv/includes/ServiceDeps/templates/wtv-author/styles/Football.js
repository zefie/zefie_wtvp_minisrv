class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#ffffcc";
        this.styledata.link = "yellow";
        this.styledata.vlink = "#ffcc99";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = [
            "/clipart/styleMedia/footballfield.gif",
            "/clipart/styleMedia/football.gif",
        ];
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
<body background="clipart/styleMedia/footballfield.gif" text="#ffffcc" bgcolor="white" link="yellow" alink="#ccffcc" vlink="#ffcc99">
<center>`;
        if (state === "previewing") {
            this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>`;
        }
        this.styledata.titheader = `<img src="clipart/styleMedia/football.gif" width="283" height="55" align="bottom"><p>`;
        if (state === "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader +=
            `<H1><font size="6" color=` +
            this.styledata.text +
            `>${title}</font></H1>`;

        if (state === "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `<p>`;

        this.styledata.footerstart = `</center>
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
