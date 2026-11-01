class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#000000";
        this.styledata.link = "#4c58b6";
        this.styledata.vlink = "#519eb6";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = "#d6d6d6";
        this.styledata.listcol2 = "#d6d6d6";
        this.styledata.stylemedia = ["/clipart/styleMedia/AG00318_.gif"];
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
<BODY bgcolor="#deb1b1" link="#4c58b6" vlink="#519eb6">`;
        if (state === "previewing") {
            this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>`;
        }
        this.styledata.titheader = `<TABLE border=0 cellpadding=8>
<TR>
<TD><IMG src=clipart/styleMedia/AG00318_.gif align=left> </TD>
<TD>`;
        if (state === "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader += `<FONT size=+3 color=#003300>${title}</FONT>`;

        if (state === "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.titheader += `<P></TD>
</TR>
</TABLE>`;

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `
<CENTER>`;

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
