class WTVTemplate {

    page_args = {};

    constructor(page_args) {
        this.page_args = page_args;
    }

    getTemplatePage() {
        var data = `<html>
<head>
<title>Web words: Index</title>
<display
noscroll
showwhencomplete
>
</head>
<body hspace=0 vspace=0
text='E6E6E6' link='E6E6E6' vlink='E6E6E6'
fontsize='medium'
bgcolor=00292f
>
<table cellspacing=0 cellpadding=0>
<tr>
<td width=560 height=96 valign=top>
<table background="wtv-guide:/ROMCache/help/common/helpMastheadBlank.swf" width=560 height=96 cellspacing=0 cellpadding=0>
<tr>
<td width=107 height=96 valign=top rowspan=2>
<spacer type=vertical height=7><br>
<spacer type=horizontal width=7>
<a href='wtv-home:/home'>
<img src="${this.page_args.minisrv_config.config.service_logo}" width=87 height=67>
</a>
<td width=453 valign=top>
<spacer type=vertical height=54><br>
<font size=+3><blackface>
Web words&nbsp;
</blackface></font>
<tr>
<td align=right>
&nbsp;
</table>
<tr>
<td width=560 valign=top height=225>
<table cellpadding=0 cellspacing=0 height=234 width=518>
<tr>
<td height=15 width=33>
<tr>
<td>
<td valign=top>
<table cellpadding=0 cellspacing=0>
<tr>
<td height=12 width=40>
<tr>
<td colspan=99>
<font color="#E6E6E6">
Choose the first letter of the word you are looking for.
<spacer type=vertical height=20><br>
<tr><td height=32>`;
        var i = 0;
        var j = 0;
        var self = this;
        Object.keys(this.page_args.letters).forEach(function (k) {
            data += `<td width=40>\n<a href="wtv-guide:/help?topic=Glossary&subtopic=${self.page_args.letters[k]}" selected><blackface>${self.page_args.letters[k]}</blackface></a>\n`
            i++;
            j++;
            if (i == 8 && self.page_args.letters.length != (j + 1)) {
                // add new <tr> every 8 entries, but only if its not the last entry
                i = 0;
                data += `<tr><td height=32>\n`;
            }
        })
        data += `</table>
</table>
<tr>
<td valign=bottom align=right>
<form>
<font color=ffcf69><shadow>
<input type=button usestyle borderimage="file://ROM/Borders/ButtonBorder2.bif"
action="wtv-guide:/help"
value="Done"
width='110'
selected>
<spacer type=horizontal width=20>
</shadow></font>
</form>
</table>
</body>`
        return data;
    }
}
module.exports = WTVTemplate;