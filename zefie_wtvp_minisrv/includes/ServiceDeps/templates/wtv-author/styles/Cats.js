class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.link = "#0000EE";
        this.styledata.vlink = "#551A8B";
        this.styledata.text = "#000000";
        this.styledata.headcol = "#eeeeee";
        this.styledata.listcol1 = "#eeeeee";
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = ["/clipart/styleMedia/CAT.gif"];
        this.styledata.headerimgL = null;
        this.styledata.headerimgLheight = null;
        this.styledata.headerimgLwidth = null;
        this.styledata.headerimgR = null;
        this.styledata.headerimgRheight = null;
        this.styledata.headerimgRwidth = null;
        this.styledata.header = `<html><head>
<meta name="generator" content="WebTV Page Builder (Rebuilt by JarHead)">
<meta name="description" content="${desc}">
<title>${title}</title>
</head>
<body bgcolor="#eeeeee">`;
        if (state == "previewing") {
            this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>`;
        }
        this.styledata.header += `
<table width="100%" cellspacing="4" cellpadding="4" border="0">
<tbody>`;

        this.styledata.titheader = ``;
        if (state == "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader += `<center>
<font size="7" color="#000000"><b>${title}</b></font></center>`;
        if (state == "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `</td>
</tr><tr height="316">
<td width="101" height="316" background="clipart/styleMedia/CAT.gif"></td>
<td valign="top" height="316" bgcolor="#669999">`;

        this.styledata.footerstart = `<p>&nbsp;</p></td>
</tr>
</tbody></table>
<table width="100%" cellspacing="2" cellpadding="0" border="0">
<tbody><tr height="0">
<td height="0">
<spacer type="block" width="30%" height="0">
</spacer></td><td height="0">
<spacer type="block" width="30%" height="0">
</spacer></td><td height="0">
<spacer type="block" width="30%" height="0">
</spacer></td></tr>`;
        this.styledata.webtvfooter = wtvauthor.getCommonFooter();
        this.styledata.footerend = `</td>
</tr>
</tbody></table>


<div style="position: static !important;"></div></body></html>`;
    }

    get() {
        return this.styledata;
    }
}

module.exports = PBTemplate;
