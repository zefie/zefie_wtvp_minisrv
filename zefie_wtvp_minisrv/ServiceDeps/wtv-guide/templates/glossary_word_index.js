class WTVTemplate {

    page_args = {};

    constructor(page_args) {
        this.page_args = page_args;
    }

    getTemplatePage() {
        var data = `<html>
<head>
<title>Web words: ${this.page_args.letter}</title>
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
Web words: ${this.page_args.letter}&nbsp;
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
Choose a word to see what it means.
<spacer type=vertical height=15><br>
<table cellpadding=0 cellspacing=0> <tr>
<td width=180>
<td width=10 rowspan=99>
<td width=180>
<tr>
<td>`;
        var table_split = Math.floor(this.page_args.words.length / 2);
        var words_rendered = 0;
        var self = this;
        console.log(this.page_args.words);
        Object.keys(this.page_args.words).forEach(function (k) {
            // test
            data += `<a href="wtv-guide:/help?topic=Glossary&subtopic=${self.page_args.letter}&page=${self.page_args.words[k].link}" selected>${self.page_args.words[k].word}</a><br>\n`
            words_rendered++;
            if (self.page_args.words.length % 2 != 0) {
                // odd so split later to put extra on first row
                if (words_rendered - 1 == table_split) data += `<td>`;
            } else {
                if (words_rendered == table_split) data += `<td>`;
            }
        });

        /*
<a href="wtv-guide:/help/Glossary/S/svideo" selected>S-Video</a><br>
<a href="wtv-guide:/help/Glossary/S/savebutton" >Save</a><br>
<a href="wtv-guide:/help/Glossary/S/screensaver" >screen saver</a><br>
<a href="wtv-guide:/help/Glossary/S/scrollbuttons" >Scroll buttons</a><br>
<a href="wtv-guide:/help/Glossary/S/search" >Search</a><br>
<a href="wtv-guide:/help/Glossary/S/searchengine" >search engine</a><br>
<a href="wtv-guide:/help/Glossary/S/sendbutton" >Send</a><br>
<a href="wtv-guide:/help/Glossary/S/server" >server</a><br>
<a href="wtv-guide:/help/Glossary/S/serviceprovider" >service provider</a><br>
<a href="wtv-guide:/help/Glossary/S/shockwave" >Shockwave</a><br>
<td>
<a href="wtv-guide:/help/Glossary/S/shortcuts" >shortcuts</a><br>
<a href="wtv-guide:/help/Glossary/S/site" >site</a><br>
<a href="wtv-guide:/help/Glossary/S/smartcards" >Smart cards</a><br>
<a href="wtv-guide:/help/Glossary/S/spam" >spam</a><br>
<a href="wtv-guide:/help/Glossary/S/ssl" >SSL</a><br>
<a href="wtv-guide:/help/Glossary/S/storage" >Storage</a><br>
<a href="wtv-guide:/help/Glossary/S/streaming" >streaming</a><br>
<a href="wtv-guide:/help/Glossary/S/surf" >surf</a><br>
<a href="wtv-guide:/help/Glossary/S/surfwatch" >SurfWatch</a><br>
*/
        data += `
</table>
<tr>
<td>
</table>
<tr>
<td valign=bottom align=right>
<form>
<font color=ffcf69><shadow>
<input type=button usestyle borderimage="file://ROM/Borders/ButtonBorder2.bif"
action="wtv-guide:/help?topic=Index&subtopic=Glossary"
value="Done"
width='110'
selected>
<spacer type=horizontal width=20>
</shadow></font>
</form>
</table>
</body>
`; 
        return data;
    }
}
module.exports = WTVTemplate;