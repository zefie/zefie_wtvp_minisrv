data = `
<html>
<head>
<title>Cut, copy, and paste</title>
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
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
</a>
<td width=453 valign=top>
<spacer type=vertical height=54><br>
<font size=+3><blackface>
Cut, copy, and paste&nbsp;
</blackface></font>
<tr>
<td align=right>
&nbsp;
</table>
<tr>
<td width=560 valign=top height=225>
<table cellpadding=0 cellspacing=0 width=560>
<tr>
<td width=25 height=17>
<td width=535>
<tr>
<td>
<td height=225 rowspan=2 valign=top>
<table cellpadding=0 cellspacing=0 height=225 width=535>
<tr>
<td height=15>
<tr>
<td>
<td valign=top>
You can also cut and paste individual words.
Again, move to the rectangle. Then hold down
<b>shift</b> and use the arrow keys to select
the text. To start over,
release the shift key and press an arrow key.
<p>
<center><form action='client:donothing'>
		<textarea
		bgcolor=#2A562A
		text=#efefef
		cursor=#cc9933
		font=proportional
		width=280
		rows=1
		autoactivate
		autoascii
		nohighlight>select only one word</textarea></form></center>
<p>
Try selecting just the word <i>only</i>, then
<b>cut</b> it by pressing <b>cmd-x</b>.
<tr>
<td width=35>
<td width=450>
<td width=50>
</table>
</table>
<tr>
<td valign=bottom align=right>
<form>
<font color=ffcf69><shadow>
<input type=button usestyle borderimage="file://ROM/Borders/ButtonBorder2.bif"
action="PasteWord"
value="Continue"
width='110'
selected>
<spacer type=horizontal width=20>
</shadow></font>
</form>
</table>
</body>
`; 