class PBTemplate {
    styledata = {};

    constructor(wtvauthor, title, desc, state, docName) {
        this.styledata.link = "#00ffff";
        this.styledata.vlink = "#ccffff";
        this.styledata.text = "#ffffff";
        this.styledata.headcol = "#ffffff";
        this.styledata.listcol1 = null;
        this.styledata.listcol2 = null;
        this.styledata.stylemedia = [
            "/clipart/styleMedia/oceantile.gif",
            "/clipart/Animals/Fish_n_Sealife/an01053_.gif",
            "/clipart/Animals/Fish_n_Sealife/an00312_.gif",
            "/clipart/Animals/Fish_n_Sealife/na00299_.gif",
        ];
        this.styledata.headerimgL = "/clipart/Animals/Fish_n_Sealife/an01053_.gif";
        this.styledata.headerimgLheight = "68";
        this.styledata.headerimgLwidth = "32";
        this.styledata.headerimgR = null;
        this.styledata.headerimgRheight = null;
        this.styledata.headerimgRwidth = null;
        this.styledata.header = `<html><head>
<meta name="generator" content="WebTV Page Builder (Rebuilt by JarHead)">
<meta name="description" content="${desc}">
<title>${title}</title>
</head>
<body vlink="#CCFFFF" text="#FFFFFF" link="#00FFFF" bgcolor="#7189ae" background="clipart/styleMedia/oceantile.gif">`;
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
        this.styledata.titheader += `
<center>
<table border="0" cellpadding="0" cellspacing="2" frame width="90%">
<tr>
<td><img height="69" width="69" src="clipart/Animals/Fish_n_Sealife/na00299_.gif"></td>
<td >
<center>
`;
        if (state == "editing") {
            this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">`;
        }
        this.styledata.titheader +=
            `
<font size="+3" color=` +
            this.styledata.text +
            `><b>${title}</b></font></center>
`;
        if (state == "editing") {
            this.styledata.titheader += `</a>`;
        }
        this.styledata.titheader += `
</td>
<td><img height="69" width="78" src="clipart/Animals/Fish_n_Sealife/an00312_.gif"></td>
</tr>
</table>
</center>
`;

        this.styledata.afterblock1 = null;

        this.styledata.tabstart = `<p>`;

        this.styledata.footerstart = `</td>
</tr>
</tbody></table>
</center>
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
</center>


<div style="position: static !important;"></div></body></html>`;
    }

    get() {
        return this.styledata;
    }
}

module.exports = PBTemplate;
