class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#3f3a89";
        this.styledata.link = "#6a298c";
        this.styledata.vlink = "#6a298c";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = [
            "/clipart/styleMedia/j0172489.gif",
            "/clipart/Special_Occasions/Wedding/so00527_.gif",
        ];
        this.styledata.headerimgL =
            "clipart/Special_Occasions/Wedding/so00527_.gif";
        this.styledata.headerimgLheight = "76";
        this.styledata.headerimgLwidth = "92";
        this.styledata.headerimgR = null;
        this.styledata.headerimgRheight = null;
        this.styledata.headerimgRwidth = null;
        this.styledata.header = `<html>
<head>
<META NAME="generator" CONTENT="WebTV Page Builder (Rebuilt By JarHead)">
<META NAME="description" CONTENT="${desc}">
<title>${title}</title>
</head>
<body bgcolor="#97bfbb" text="#3f3a89" link="#6a298c" vlink="#6a298c">`;
        if (state === "previewing") {
            this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>`;
        }
        this.styledata.titheader = `<center>
<table border="0" cellpadding="0" cellspacing="2" frame width="90%">
<tr>
<td><img src="clipart/styleMedia/j0172489.gif" height="122" width="123"></td>
<td >
<center>`;
        if (state === "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader += `<FONT size=+3 color=#${this.styledata.text}><b>${title}</b></FONT></center>`;

        if (state === "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.titheader += `</td>
</tr>
</table>
</center>`;

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `
<CENTER>
<P>`;

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
