class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "e4ece6";
        this.styledata.link = "eceb9f";
        this.styledata.vlink = "#e1903c";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = ["/clipart/styleMedia/tile12.gif"];
        this.styledata.headerimgL = null;
        this.styledata.headerimgLheight = null;
        this.styledata.headerimgLwidth = null;
        this.styledata.headerimgR = null;
        this.styledata.headerimgRheight = null;
        this.styledata.headerimgRwidth = null;
        this.styledata.header = `<html>
<head>
<meta name="generator" content="WebTV Page Builder (Rebuilt By JarHead)">
<meta name="description" content="${desc}">
<title>${title}</title>
</head>
<body text="#e4ece6" link="#eceb9f" vlink="#e1903c" background="clipart/styleMedia/tile12.gif">
<center>`;
        if (state == "previewing") {
            this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>`;
        }
        this.styledata.titheader = ``;
        if (state == "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader +=
            `
<font size="+3" color=` +
            this.styledata.text +
            `><b>${title}</b></font>`;
        if (state == "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `<p>`;

        this.styledata.footerstart = `
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
        this.styledata.footerend = `
</td>
</tr>
</tbody></table>


<div style="position: static !important;"></div></body></html>`;
    }

    get() {
        return this.styledata;
    }
}

module.exports = PBTemplate;
