class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#ffffff";
        this.styledata.link = "#D26E81";
        this.styledata.vlink = "#CC3333";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = [
            "/clipart/styleMedia/so00483_.gif",
            "/clipart/styleMedia/so00482_.gif",
            "/clipart/styleMedia/so00130_.gif",
        ];
        this.styledata.headerimgL = "clipart/styleMedia/so00130_.gif";
        this.styledata.headerimgLheight = "68";
        this.styledata.headerimgLwidth = "74";
        this.styledata.headerimgR = null;
        this.styledata.headerimgRheight = null;
        this.styledata.headerimgRwidth = null;
        this.styledata.header = `<html>
<head>
<META NAME="generator" CONTENT="WebTV Page Builder (Rebuilt By JarHead)">
<META NAME="description" CONTENT="${desc}">
<title>${title}</title>
</head>
<body background="#255126" text="#ffffff" link="#D26E81" vlink="#CC3333" bgcolor="#255126">`;
        this.styledata.previewheader = `<html>
<head>
<META NAME="generator" CONTENT="WebTV Page Builder (Rebuilt By JarHead)">
<META NAME="description" CONTENT="${desc}">
<title>${title}</title>
</head>
<body bgcolor="black" text="#e68a34" link="#e64045">
<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>
`;
        this.styledata.titheader = `<center>
<table border="0" cellpadding="0" cellspacing="2" frame width="90%">
<tr>
<td><img src="clipart/styleMedia/so00483_.gif"></td>
<td >
<center>`;
        if (state == "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader +=
            `<font size="+3" color=` +
            this.styledata.text +
            `><b>${title}</b></font></center>`;

        if (state == "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.titheader += `</td>
<td><img src="clipart/styleMedia/so00483_.gif"></td>
</tr>
</table>
</center>`;

        this.styledata.afterblock1 = null;

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
