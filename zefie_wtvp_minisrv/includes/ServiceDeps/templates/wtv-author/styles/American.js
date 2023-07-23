class PBTemplate {
	styledata = {};

	constructor(wtvauthor, title, desc, state, docName) {
		var styledata = {};
		this.styledata.text = "#000000"
		this.styledata.link = "#180d4b"
		this.styledata.vlink = "#660000"
		this.styledata.headcol = this.styledata.text
		this.styledata.listcol1 = "#ff7c76"
		this.styledata.listcol2 = "#81c2d0"
		this.styledata.stylemedia = ["/clipart/styleMedia/us_flag.gif", "/clipart/Flags/fl00050_.gif"];
		this.styledata.headerimgL = "clipart/Flags/fl00050_.gif";
		this.styledata.headerimgLheight = "68";
		this.styledata.headerimgLwidth = "66";
		this.styledata.header = `<html><head>
<meta http-equiv="content-type" content="text/html; charset=windows-1252">
<meta name="generator" content="WebTV Page Builder (Rebuilt By JarHead)">
<meta name="description" content="${desc}">
<title>${title}</title>
</head>
<body vlink="#660000" link="#180d4b" bgcolor="#eeeeee" background="clipart/styleMedia/us_flag.gif">`
		if (state == "previewing") {
			this.styledata.header += `<TABLE cellspacing=0 cellpadding=0 bgcolor=#1e4261 border=1 width=100%>
<TR><TD valign=middle align=center><FONT color=#D1D1D1>
You are previewing your page. Press <B>Back</B>
to return to editing it.
</FONT>
</TABLE>`
		}
		this.styledata.titheader = ``
		if (state == "editing") {
			this.styledata.titheader += `<a href="wtv-author:/edit-title?docName=${docName}&titleOnly=true">
`
		}
		this.styledata.titheader += `<center>
<font size="6" color=` + this.styledata.text + `><b>${title}</b></font>
</center>`
		if (state == "editing") {
			this.styledata.titheader += `</a>`
		}

		this.styledata.titheader += ` <p>&nbsp;</p>`

		this.styledata.afterblock1 = null;

		this.styledata.tabstart = `<blockquote>
<table>`;

		this.styledata.footerstart = `</blockquote>
<table width="100%" cellspacing="2" cellpadding="0" border="0">
<tbody><tr height="0">
<td height="0">
<spacer type="block" width="30%" height="0">
</spacer></td><td height="0">
<spacer type="block" width="30%" height="0">
</spacer></td><td height="0">
<spacer type="block" width="30%" height="0">
</spacer></td></tr>`
		this.styledata.webtvfooter = wtvauthor.getCommonFooter();
		this.styledata.footerend = `
</td>
</tr>
</tbody></table>


<div style="position: static !important;"></div></body></html>`
		return styledata;
	}

	get() {
		return this.styledata;
	}
}

module.exports = PBTemplate;