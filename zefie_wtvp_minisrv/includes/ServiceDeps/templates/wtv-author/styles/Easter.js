class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#000000";
        this.styledata.link = "#000000";
        this.styledata.vlink = "#000000";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = [
            "/clipart/Animations/AG00397_.gif",
            "/clipart/styleMedia/easter.gif",
            "/clipart/Animations/AG00398_.gif",
        ];
        this.styledata.headerimgL = "clipart/Animations/AG00397_.gif";
        this.styledata.headerimgLheight = "163";
        this.styledata.headerimgLwidth = "102";
        this.styledata.headerimgR = "clipart/Animations/AG00398_.gif";
        this.styledata.headerimgRheight = "163";
        this.styledata.headerimgRwidth = "102";
        this.styledata.header = `<html>
<head>
<META NAME="generator" CONTENT="WebTV Page Builder (Rebuilt By JarHead)">
<META NAME="description" CONTENT="${desc}">
<title>${title}</title>
</head>
<body bgcolor="#66cccc">
<center>`;
        this.styledata.previewheader = `<html>
<head>
<META NAME="generator" CONTENT="WebTV Page Builder (Rebuilt By JarHead)">
<META NAME="description" CONTENT="${desc}">
<title>${title}</title>
</head>
<body bgcolor="#66cccc">
<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>
<center>
`;
        this.styledata.titheader = `<table border="0">
<tr>
<td width="102">
<center>
<img src="clipart/Animations/AG00397_.gif" width="102" height="163" align="bottom"></center>
</td>
<td>
<center>
<font size="7"><img src="clipart/styleMedia/easter.gif" width="239" height="75" align="bottom"></font></center>
</td>
<td width="102">
<center>
<img src="clipart/Animations/AG00398_.gif" width="102" height="163" align="bottom"></center>
</td>
</tr>
<tr>
<td colspan=3 >
<center>
`;
        if (state === "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader += `<font size="6" color="#000000"><b>${title}</b></font></center>`;

        if (state === "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.titheader += `</tr>
</table>`;

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `<P>`;

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
