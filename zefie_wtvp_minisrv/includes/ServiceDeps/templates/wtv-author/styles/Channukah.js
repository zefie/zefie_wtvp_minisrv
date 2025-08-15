class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.text = "#14122f";
        this.styledata.link = "#ae1b27";
        this.styledata.vlink = "#4e4397";
        this.styledata.headcol = this.styledata.text;
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = [
            "/clipart/styleMedia/so00511w_.gif",
            "/clipart/Special_Occasions/Holidays/so00470_.gif",
        ];
        this.styledata.headerimgL =
            "clipart/Special_Occasions/Holidays/so00470_.gif";
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
<body bgcolor="#464de3" text="#14122f" link="#ae1b27" vlink="#4e4397">
<center>
<table border="0" cellpadding="8" cellspacing="0" frame>`;
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
<center>
<table border="0" cellpadding="8" cellspacing="0" frame>
`;
        this.styledata.titheader = `<tr bgcolor="#464de3">
<td bgcolor="#464de3">
<img height="63" width="54" src="clipart/styleMedia/so00511w_.gif">
</td>
<td bgcolor="#464de3" >
<center>`;
        if (state === "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`;
        }
        this.styledata.titheader += `<b><font size="7" color="#e6e1e1">${title}</font></b></center>`;

        if (state === "editing") {
            this.styledata.titheader += `</a>`;
        }

        this.styledata.titheader += `</td>
<td bgcolor="#464de3">
<img height="63" width="54" src="clipart/styleMedia/so00511w_.gif">
</td>
</tr>`;

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `<tr>
<td bgcolor="#464de3">&nbsp; <p>&nbsp;</td>
<td bgcolor="#e1dee3">`;

        this.styledata.footerstart = `<p>&nbsp;
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
