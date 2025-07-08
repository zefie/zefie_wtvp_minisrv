var minisrv_service_file = true;

var timezone = "-0000";
if (session_data.isRegistered()) {
    timezone = session_data.getSessionData("timezone") || timezone;
    if (request_headers.query.timezone) {
        timezone = request_headers.query.timezone;
        session_data.setSessionData("timezone", timezone);
    }
}

strf = strftime.timezone(timezone)

headers = `200 OK
Connection: Keep-Alive
wtv-expire-all: wtv-
wtv-expire-all: http
wtv-client-time-zone: GMT -0000
wtv-client-time-dst-rule: false
wtv-client-date: ${strf("%a, %d %b %Y %H:%M:%S", new Date(new Date().setUTCSeconds(new Date().getUTCSeconds())))}
Content-Type: text/html`



html = `<HTML>
<HEAD>
<TITLE>
Set Timezone
</TITLE>
<DISPLAY nosave skipback noscroll>
</HEAD>
<sidebar width=110> <table cellspacing=0 cellpadding=0 BGCOLOR="30364D">
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=420 valign=top align=left>
<img src="wtv-home:/ROMCache/Shadow.gif" width=6 height=420>
<tr>
<td abswidth=6>
<td abswidth=92 absheight=76>
<table href="wtv-home:/home" absheight=76 cellspacing=0 cellpadding=0>
<tr>
<td align=right>
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</table>
<td abswidth=6>
<tr><td absheight=5 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor="1C1E28">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor="4D5573">
<img src="wtv-home:/ROMCache/Spacer.gif" width=1 height=1>
</table>
<tr><td absheight=37>
<tr><td absheight=263 align=right colspan=3>
<img src="ROMCache/AccountBanner.gif" width=53 height=263>
<tr><td absheight=41>
</table>
</sidebar>
<BODY BGCOLOR="#191919" TEXT="#44cc55" LINK="189CD6" VLINK="189CD6" HSPACE=0 VSPACE=0 FONTSIZE="large"
>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=14>
<td abswidth=416 absheight=80 valign=center>
<font size="+2" color="E7CE4A"><blackface><shadow>
Set Timezone
<td abswidth=20>
<tr>
<td>
<td absheight=244 valign=top align=left>
<form action="wtv-setup:/timezone" method="post">
Current system time: <clock></clock><br><br>
Your current timezone is set to: <b>${timezone}</b><br><br>`;


const timezones = [
    ["UTC-12:00", "-1200"], ["UTC-11:00", "-1100"], ["UTC-10:00", "-1000"], ["UTC-09:00", "-0900"], ["UTC-08:00", "-0800"],
    ["UTC-07:00", "-0700"], ["UTC-06:00", "-0600"], ["UTC-05:00", "-0500"], ["UTC-04:00", "-0400"], ["UTC-03:00", "-0300"],
    ["UTC-02:00", "-0200"], ["UTC-01:00", "-0100"], ["UTC&#177;00:00", "-0000"], ["UTC+01:00", "+0100"], ["UTC+02:00", "+0200"],
    ["UTC+03:00", "+0300"], ["UTC+04:00", "+0400"], ["UTC+05:00", "+0500"], ["UTC+06:00", "+0600"], ["UTC+07:00", "+0700"],
    ["UTC+08:00", "+0800"], ["UTC+09:00", "+0900"], ["UTC+10:00", "+1000"], ["UTC+11:00", "+1100"], ["UTC+12:00", "+1200"]
];

html += `<select name="timezone" onchange="this.form.submit()">\n`;
for (const tz of timezones) {
    html += `  <option value="${tz[1]}" ${tz[1] === timezone ? 'selected' : ''}>${tz[0]}</option>\n`;
}
html += `</select>`;

html += `</form>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=0 VALIGN=top ALIGN=left>
<tr>
<TD>
<td colspan=3 height=2 valign=middle align=center bgcolor="2B2B2B">
<spacer type=block width=436 height=1>
<tr>
<TD>
<td colspan=4 height=1 valign=top align=left>
<tr>
<TD>
<td colspan=3 height=2 valign=top align=left bgcolor="0D0D0D">
<spacer type=block width=436 height=1>
<TR>
<TD>
<TD COLSPAN=4 HEIGHT=4 VALIGN=top ALIGN=left>
<TR>
<TD>
<TD COLSPAN=2 VALIGN=top ALIGN=left>
<tr>
<TD COLSPAN=2 VALIGN=top ALIGN=right>
<FORM action="wtv-setup:/setup">
<FONT COLOR="#E7CE4A" SIZE=-1><SHADOW>
<INPUT TYPE=SUBMIT BORDERIMAGE="file://ROM/Borders/ButtonBorder2.bif" Value=Done NAME="Done" USESTYLE WIDTH=103>
</SHADOW></FONT></FORM>
<TD>
</TABLE>
</BODY>
</HTML>
`;

data = html;