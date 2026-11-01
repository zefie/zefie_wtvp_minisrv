class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#000000";
        this.styledata.link = "#180d4b";
        this.styledata.vlink = "#660000";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = "#e5f4ff";
        this.styledata.listcol2 = "#81c2d0";
        this.styledata.stylemedia = [
            "/clipart/styleMedia/stars.gif",
            "/clipart/Animals/Wildlife/an00348_.gif",
            "/clipart/Animals/Wildlife/an00974_.gif",
        ];
        this.styledata.headerimgL = "clipart/Animals/Wildlife/an00974_.gif";
        this.styledata.headerimgLheight = "75";
        this.styledata.headerimgLwidth = "88";
        this.styledata.headerimgR = null;
        this.styledata.headerimgRheight = null;
        this.styledata.headerimgRwidth = null;
        this.styledata.header = `<html>
<head>
<META NAME="generator" CONTENT="WebTV Page Builder (Rebuilt By JarHead)">
<META NAME="description" CONTENT="${desc}">
<title>${title}</title>
</head>
<body bgcolor="white" link="#180d4b" vlink="#660000" background="clipart/styleMedia/stars.gif">`;
        if (state === "previewing") {
            this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>`;
        }
        this.styledata.titheader = ``;
        if (state === "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader +=
            `<center><font size="6" color=` +
            this.styledata.text +
            `><b>${title}</b></font>`;

        if (state === "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.titheader += `<p><img src="clipart/Animals/Wildlife/an00348_.gif" width="277" height="273" align="bottom"> </p>
<p>&nbsp;</p>
</center>`;

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `<blockquote>`;

        this.styledata.footerstart = `</blockquote>
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
