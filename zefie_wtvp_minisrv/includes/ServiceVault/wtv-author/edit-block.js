var minisrv_service_file = true;

var docName = request_headers.query.docName
var pagedata = session_data.pagestore.loadPage(docName);
var blockNum = pagedata.blocks.length
var oldBlockNum = request_headers.query.blockNum

var blockType = pagedata.blocks[oldBlockNum].type
var photo;
var thumbnail;
if (pagedata.blocks[oldBlockNum].photo) {
	console.log(pagedata.blocks[oldBlockNum].photo);
	photo = wtvshared.atob(pagedata.blocks[oldBlockNum].photo)
	thumbnail = photo.replace('clipart/', 'clipart/icons/');
}

headers = `200 OK
Connection: Keep-Alive
Content-Type: text/html`

switch(blockType) {
	case "text":

data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<script language=javascript>
function EscapeQuotes(inString)
{	var outString = new String;
var i;
var theStr = new String(inString);
if (theStr.indexOf('"') == -1)
return theStr;
for (i = 0; i < theStr.length; i++)
{	if (theStr.charAt(i) == '"')
outString += '&quot;';
else
outString += theStr.charAt(i);
}
return outString;
}
function StripSoftReturnsAndEscape(inString)
{	var outString = new String;
var i;
var theStr = new String(inString);
var len = theStr.length;
if (theStr.indexOf('\r') == -1 && theStr.indexOf('<') == -1)
return theStr;
for (i = 0; i < len; i++)
{	switch (theStr.charAt(i))
{	case '<':
outString += "&lt;";
break;
case '>':
outString += "&gt";
break;
case '\r':
break;
default:
outString += theStr.charAt(i);
}
}
return outString;
}
function StripSoftReturns(inString)
{	var outString = new String;
var i;
var theStr = new String(inString);
var len = theStr.length;
if (theStr.indexOf('\r') == -1)
return theStr;
for (i = 0; i < len; i++)
{	if (theStr.charAt(i) != '\r')
outString += theStr.charAt(i);
}
return outString;
}
var gInitialValue = "${pagedata.blocks[oldBlockNum].caption}";
function GetRadioGroupValue(radioGroup)
{	for (var i = 0; i < radioGroup.length; i++)
if (radioGroup[i].checked)
return radioGroup[i].value;
}
function WriteEmbed(whichEmbed, whatText)
{	whichEmbed.document.open();
whichEmbed.document.write('<FORM name=theForm><FONT color=CACA4A');
textSize = GetRadioGroupValue(document.theForm.textBlockSize);
textStyle = GetRadioGroupValue(document.theForm.textBlockStyle);
if (textSize != "")
whichEmbed.document.write('<FONT size=' + textSize + '>');
if (textStyle != "")
whichEmbed.document.write('<' + textStyle + '>');
whichEmbed.document.write( '<TEXTAREA name="textBlockText" useStyle
nosoftbreaks
bgcolor=192133
cursor=#cc9933
autoactivate
autohiragana
growable
width=100%
cols=45 rows=5>');
whichEmbed.document.write(whatText);
whichEmbed.document.write('</TEXTAREA></FORM>');
whichEmbed.document.close();
}
function ReWrite()
{	return WriteEmbed(document.textEmbed, StripSoftReturnsAndEscape(document.textEmbed.document.theForm.textBlockText.value));
}
function SubmitForm()
{	document.theForm.textBlockText.value = StripSoftReturns(document.textEmbed.document.theForm.textBlockText.value);
document.theForm.submit();
}
</SCRIPT>
<TITLE>
Add text
</TITLE>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="client:showalert?sound=none&message=Would%20you%20like%20to%20remove%20this%20entire%20item%3F&buttonlabel1=Don't%20Remove&buttonaction1=client:donothing&buttonlabel2=Remove&buttonaction2=wtv-author%3A%2Fdelete-block%3F
docName%3D${docName}%26blockNum%3D${oldBlockNum}" ID=RemoveButton
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Remove</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
onLoad="WriteEmbed(document.textEmbed, gInitialValue)"
>
<form name=theForm action="wtv-author:save-block">
<input name=docName type=hidden value=${docName}>
<input name=blockNum type=hidden value=${blockNum}>
<input name=oldBlockNum type=hidden value=${oldBlockNum}>
<input name=editing type=hidden value=true>
<input name=blockClass type=hidden value=21>
<table cellspacing=0 cellpadding=0 height=100% width=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td abswidth=15 rowspan=100>
<tr>
<td absheight=34 valign=bottom>
<font size=+1 color=D1D1D1><blackface>
Add text to your document
</blackface></font>
<tr>
<td absheight=10>
<tr>
<td absheight=28 valign=bottom>
<font color=AEBFD1> Type a title (optional): </font>
<tr>
<td absheight=28>
<input type=text name="blockTitle" value="${pagedata.blocks[oldBlockNum].title}" width=100% text=CACA4A bgcolor=192133 font=proportional autoactivate>
<tr>
<td absheight=28 valign=bottom>
<font color=AEBFD1> Type your text here: </font>
<tr>
<td valign=top align=left>
<input type=hidden name="textBlockText">
<EMBED name=textEmbed src="file://ROM/HTMLs/Empty.html" width=100% nobackground>
<P>
<TABLE valign=top>
<TR>
<TD>Text size:`
var textsize = pagedata.blocks[oldBlockNum].size

if (textsize == "-1")
{
	data += `<TD><INPUT type=radio value=-1 name=textBlockSize checked onClick=ReWrite()>
<font size=-1>Small</font></TD>
<TD><INPUT type=radio name=textBlockSize onClick=ReWrite()>
Medium</TD>
<TD><INPUT type=radio value=+1 name=textBlockSize onClick=ReWrite()>
<font size=+1>Large</font></TD>`
} else if (textsize == "+1")
{
	data += `<TD><INPUT type=radio value=-1 name=textBlockSize onClick=ReWrite()>
<font size=-1>Small</font></TD>
<TD><INPUT type=radio name=textBlockSize onClick=ReWrite()>
Medium</TD>
<TD><INPUT type=radio value=+1 name=textBlockSize checked onClick=ReWrite()>
<font size=+1>Large</font></TD>`
} else {
	data += `<TD><INPUT type=radio value=-1 name=textBlockSize onClick=ReWrite()>
<font size=-1>Small</font></TD>
<TD><INPUT type=radio name=textBlockSize checked onClick=ReWrite()>
Medium</TD>
<TD><INPUT type=radio value=+1 name=textBlockSize onClick=ReWrite()>
<font size=+1>Large</font></TD>`
}

data += `
<TR>
<TD>Text style:`
var textstyle = pagedata.blocks[oldBlockNum].style

if (textstyle == "B")
{
	data += `
<TD><INPUT type=radio name=textBlockStyle onClick=ReWrite()>
Plain</TD>
<TD><INPUT type=radio value=B name=textBlockStyle checked onClick=ReWrite()>
<B>Bold</B></TD>
<TD><INPUT type=radio value=I name=textBlockStyle onClick=ReWrite()>
<I>Italic</I></TD>
</TABLE>`
} else if (textstyle == "I") {
	data += `
<TD><INPUT type=radio name=textBlockStyle onClick=ReWrite()>
Plain</TD>
<TD><INPUT type=radio value=B name=textBlockStyle onClick=ReWrite()>
<B>Bold</B></TD>
<TD><INPUT type=radio value=I name=textBlockStyle checked onClick=ReWrite()>
<I>Italic</I></TD>
</TABLE>`
} else {
	data += `
<TD><INPUT type=radio name=textBlockStyle checked onClick=ReWrite()>
Plain</TD>
<TD><INPUT type=radio value=B name=textBlockStyle onClick=ReWrite()>
<B>Bold</B></TD>
<TD><INPUT type=radio value=I name=textBlockStyle onClick=ReWrite()>
<I>Italic</I></TD>
</TABLE>`
}
data += `
<tr>
<td>
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td>
<table>
<tr><td>
<FONT color=D1D1D1>
<SPACER type=block width=30>
<input type=text width=150 name=position usestyle value="item 0 (of 1)" border=0 noselect nobackground>
<input type=hidden name=newBlockNum value=${oldBlockNum}>
</FONT>
<tr>
<td align=center>
<a href=javascript:MoveUp()><IMG src="/ROMCache/moveup.gif"></a>
<a href=javascript:MoveDown()><IMG src="/ROMCache/movedown.gif"></a>
</table>
<SCRIPT>
WritePositionString();
function MoveUp()
{	if (document.theForm.newBlockNum.value > 0)
{	document.theForm.newBlockNum.value--;
WritePositionString();
}
}
function MoveDown()
{	if (document.theForm.newBlockNum.value < (${blockNum}-1))
{	document.theForm.newBlockNum.value++;
WritePositionString();
}
}
function WritePositionString()
{	var blockNum = parseInt(document.theForm.newBlockNum.value) + 1;
document.theForm.position.value = "moving item...";
tempStr = "document.theForm.position.value='item " + blockNum + " (of ${blockNum})'";
setTimeout(tempStr, 500);
}
</SCRIPT>
</td>
<td>
<td width=144 height=36 align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:SubmitForm()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Done</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</table>
</form>
</table>
</BODY>
</HTML>
`
break;

	case "snapshot":
	case "clipart":
	case "text":
	if (request_headers.query.photoBlockChangeImage) {
		data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>
Change a picture
</TITLE>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
>
<form action="wtv-author:/save-block" method="post" name="theForm">
<input name=docName type=hidden value="${docName}">
<input name=blockNum type=hidden value="${oldBlockNum}">
<input name=blockClass type=hidden value="23">
<input name=editing type=hidden value="true">
<input name=toSnapshot type=hidden value=true>
<input name=returnPageURL type=hidden
value="wtv-author:/edit-block?docName=${docName}&blockNum=${oldBlockNum}">
<table cellspacing=0 cellpadding=0 width=100%
>
<tr>
<td abswidth=10 rowspan=100>
<tr>
<td absheight=34 valign=bottom colspan=4>
<font size=+1 color=D1D1D1><blackface>
Change a picture
</blackface></font>
<tr>
<td absheight=10>
<tr>
<td>
<table>
<tr>
<td height=25 valign=bottom colspan=2>
<font color=AEBFD1> Get a new picture from: </font>
<tr>
<td abswidth=26 rowspan=10 absheight=1>
<SCRIPT language="JavaScript">
function ReplaceImage()
{	document.theForm.photoBlockPhoto.disabled = false;
//document.theForm.photoBlockDeleteImage.value = 0;
document.theForm.submit();
}
</SCRIPT>
<input type=file device=video name=photoBlockPhoto src="cache:snapshot.jpg" invisible disabled=true>
`
if (session_data.hasCap("client-can-do-av-capture")) {
	data += `<tr>
<td height=32>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=client:videocapture?notify=javascript%3AReplaceImage()&device=video&width=50%25&height=50%25&name=cache%3Asnapshot.jpg&donebuttonlabel=Add%20to%20page&open
nextLeft=RemoveButton
><font effect=shadow><B>Video capture</B></font></a>`
}
data += `
<tr>
<td height=32>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:/scrapbook?addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D9%26blockClass%3D23&docName=${docName}&blockNum=${oldBlockNum}
><font effect=shadow><B>Your scrapbook</B></font></a>
<tr>
<td height=32>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:/clipbook?addMediaURL=wtv-author%3A%2Fadd-media-to-block%3FdocName%3D${docName}%26blockNum%3D9%26blockClass%3D23&docName=${docName}&blockNum=${oldBlockNum}
><font effect=shadow><B>Art Gallery</B></font></a>
<tr>
<td height=32>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=wtv-author:/edit-block?docName=${docName}&blockNum=${oldBlockNum}&blockClass=23&photoBlockEditMain
><font effect=shadow><B>Leave the picture as is</B></font></a>
</table>
</table>
</form>
</BODY>
</HTML>
`
	} else {
	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>Change Picture & Caption</TITLE>
<SCRIPT>
function ChangeImage()
{	document.theForm.returnPageURL.disabled = false;
document.theForm.returnPageURL.value = "wtv-author:/edit-block?docName=${docName}&photoBlockChangeImage=true&blockNum=" +
document.theForm.newBlockNum.value;
document.theForm.submit();
}
function DisplayViewOption(showIt)
{	document.viewOptionEmbed.document.open();
if (showIt)
{	document.viewOptionEmbed.document.write('
<BODY text=AEBFD1 link=B8BDC7 vlink=B8BDC7>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>`
if (blockType == "snapshot") {
	data += `<a href=wtv-author:/get-photo?docName=${docName}&blockNum=${oldBlockNum}
><font effect=shadow><B>View this picture</B></font></a>
</BODY>`
} else if (blockType == "clipart")
	data += `<a href=wtv-author:/${photo}
><font effect=shadow><B>View this picture</B></font></a>
</BODY>`
data += `
');
}
document.viewOptionEmbed.document.close();
if (showIt)
document.location = "#blockTitle";
else
setTimeout('document.location = "#ReplacePicture"', 150);
}
</SCRIPT>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="client:showalert?sound=none&message=Would%20you%20like%20to%20remove%20this%20entire%20item%3F&buttonlabel1=Don't%20Remove&buttonaction1=client:donothing&buttonlabel2=Remove&buttonaction2=wtv-author%3A%2Fdelete-block%3FdocName%3D${docName}%26blockNum%3D${oldBlockNum}" ID=RemoveButton
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Remove</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
>
<form action="wtv-author:/save-block" method="post" name="theForm">
<input name=type type=hidden value="photo">
<input name=editing type=hidden value="true">
<input name=docName type=hidden value="${docName}">
<input name=blockNum type=hidden value="${oldBlockNum}">
<input name=blockClass type=hidden value="23">
<input name=returnPageURL type=hidden disabled>	<table cellspacing=0 cellpadding=0 width=100% height=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td><td abswidth=10 rowspan=100>
<tr>
<td absheight=34 valign=bottom colspan=4>
<font size=+1 color=D1D1D1><blackface> Change picture & caption </blackface></font>
<tr>
<td absheight=10>
<tr>
<td colspan=2>
<table cellspacing=0 cellpadding=0>
<tr>
<td height=100 valign=middle rowspan=5>`
if (blockType == "snapshot") {
	data += `<img src=wtv-author:/get-photo?docName=${docName}&blockNum=${oldBlockNum} width=131 height=100 border=1 onError="DisplayViewOption(false)">`
} else if (blockType == "clipart") {
	data += `<img src=wtv-author:/${thumbnail} width=64 height=64 border=1 onError="DisplayViewOption(false)">`
}
data += `
<td rowspan=4 width=30>
<td>&nbsp;
<tr>
<td>
<img src=wtv-author:/ROMCache/pointer.gif align=absmiddle width=13 height=22 hspace=0>
<a href=javascript:ChangeImage() ID=ReplacePicture
><font effect=shadow><B>Replace this picture</B></font></a>
<tr><td height=4>
<tr>
<td>
<EMBED name=viewOptionEmbed src="file://ROM/HTMLs/Empty.html" width=100% nobackground>
<SCRIPT language=JavaScript>
DisplayViewOption(true);
</SCRIPT>
<tr>
<td>&nbsp;	</table>
<tr>
<td colspan=2 absheight=28 valign=bottom>
<font color=AEBFD1> Type a title (optional): </font>
<tr>
<td colspan=2 absheight=28>
<input type=text name="blockTitle" id="blockTitle" value="`
if (pagedata.blocks[oldBlockNum].title != null)
	data += `${pagedata.blocks[oldBlockNum].title}`
data += `" selected width=100% text=CACA4A bgcolor=192133 font=proportional autoactivate>
<tr>
<td colspan=2 absheight=28 valign=bottom>
<font color=AEBFD1> Type a caption (optional): </font>
<tr>
<td valign=top align=left colspan=2>
<TEXTAREA name="photoBlockCaption" nosoftbreaks
bgcolor=192133
text=CACA4A
cursor=#cc9933
font=proportional
autoactivate
autohiragana
growable
width=100%
value="`
if (pagedata.blocks[oldBlockNum].caption != null)
	data += `${pagedata.blocks[oldBlockNum].caption}`
data += `"
cols=45 rows=3></TEXTAREA>
<tr>
<td colspan=2>
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td>
<table>
<tr><td>
<FONT color=D1D1D1>
<SPACER type=block width=25>
<input type=text width=150 name=position usestyle value="item 1 (of 1)" border=0 noselect nobackground>
<input type=hidden name=newBlockNum value=${oldBlockNum}>
</FONT>
<tr>
<td align=center>
<a href=javascript:MoveUp()><IMG src="/ROMCache/moveup.gif"></a>
<a href=javascript:MoveDown()><IMG src="/ROMCache/movedown.gif"></a>
</table>
<SCRIPT>
WritePositionString();
function MoveUp()
{	if (document.theForm.newBlockNum.value > 0)
{	document.theForm.newBlockNum.value--;
WritePositionString();
}
}
function MoveDown()
{	if (document.theForm.newBlockNum.value < (${blockNum}-1))
{	document.theForm.newBlockNum.value++;
WritePositionString();
}
}
function WritePositionString()
{	var blockNum = parseInt(document.theForm.newBlockNum.value) + 1;
document.theForm.position.value = "moving item...";
tempStr = "document.theForm.position.value='item " + blockNum + " (of ${blockNum})'";
setTimeout(tempStr, 500);
}
</SCRIPT>
</td>
<td>
<td width=144 height=36 align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:document.theForm.submit()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Done</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</table>
</form>
</BODY>
</HTML>
`
	}
	break;

	case "heading":
	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<script language=javascript>
function EscapeQuotes(inString)
{	var outString = new String;
var i;
var theStr = new String(inString);
if (theStr.indexOf('"') == -1)
return theStr;
for (i = 0; i < theStr.length; i++)
{	if (theStr.charAt(i) == '"')
outString += '&quot;';
else
outString += theStr.charAt(i);
}
return outString;
}
function StripSoftReturnsAndEscape(inString)
{	var outString = new String;
var i;
var theStr = new String(inString);
var len = theStr.length;
if (theStr.indexOf('\r') == -1 && theStr.indexOf('<') == -1)
return theStr;
for (i = 0; i < len; i++)
{	switch (theStr.charAt(i))
{	case '<':
outString += "&lt;";
break;
case '>':
outString += "&gt";
break;
case '\r':
break;
default:
outString += theStr.charAt(i);
}
}
return outString;
}
function StripSoftReturns(inString)
{	var outString = new String;
var i;
var theStr = new String(inString);
var len = theStr.length;
if (theStr.indexOf('\r') == -1)
return theStr;
for (i = 0; i < len; i++)
{	if (theStr.charAt(i) != '\r')
outString += theStr.charAt(i);
}
return outString;
}
var gInitialValue = "${pagedata.blocks[oldBlockNum].text}";
function GetRadioGroupValue(radioGroup)
{	for (var i = 0; i < radioGroup.length; i++)
if (radioGroup[i].checked)
return radioGroup[i].value;
}
function WriteEmbed(whichEmbed, whatText)
{	whichEmbed.document.open();
whichEmbed.document.write('<FORM name=theForm><FONT color=CACA4A');
textSize = GetRadioGroupValue(document.theForm.headingBlockSize);
if (textSize != "")
whichEmbed.document.write('<' + textSize + '>');
whichEmbed.document.write( '<TEXTAREA name="headingBlockText"
useStyle
nosoftbreaks
bgcolor=192133
cursor=#cc9933
font=proportional
autoactivate
autohiragana
growable
width=100%
cols=45 rows=3>');
whichEmbed.document.write(whatText);
whichEmbed.document.write('</TEXTAREA></FORM>');
whichEmbed.document.close();
}
function ReWrite()
{	return WriteEmbed(document.textEmbed, StripSoftReturnsAndEscape(document.textEmbed.document.theForm.headingBlockText.value));
}
function SubmitForm()
{	document.theForm.headingBlockText.value = StripSoftReturns(document.textEmbed.document.theForm.headingBlockText.value);
document.theForm.submit();
}
</SCRIPT>
<TITLE>
Add a heading
</TITLE>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="client:showalert?sound=none&message=Would%20you%20like%20to%20remove%20this%20entire%20item%3F&buttonlabel1=Don't%20Remove&buttonaction1=client:donothing&buttonlabel2=Remove&buttonaction2=wtv-author%3A%2Fdelete-block%3FdocName%3D${docName}%26blockNum%3D${oldBlockNum}" ID=RemoveButton
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Remove</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
onLoad="WriteEmbed(document.textEmbed, gInitialValue)"
>
<form name=theForm action="wtv-author:save-block">
<input name=editing type=hidden value=true>
<input name=docName type=hidden value=${docName}>
<input name=blockNum type=hidden value=${oldBlockNum}>
<input name=blockClass type=hidden value=26>
<table cellspacing=0 cellpadding=0 width=100% height=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td abswidth=15 rowspan=100>
<tr>
<td absheight=34 valign=bottom>
<font size=+1 color=D1D1D1><blackface>
Add a heading to your document
</blackface></font>
<tr>
<td absheight=10>
<tr>
<td absheight=28 valign=top>
<font color=AEBFD1> Type your heading here: </font>
<tr>
<td valign=top align=left>
<input type=hidden name="headingBlockText">
<EMBED name=textEmbed src="file://ROM/HTMLs/Empty.html" width=100% nobackground>
<tr>
<td>
<TABLE>
<TR>
<TD>Text size:`
	if (pagedata.blocks[oldBlockNum].size == "H3")
	data += `<TD><INPUT type=radio value=H3 name=headingBlockSize checked onClick=ReWrite()>
<FONT size=-1>Small</FONT></TD>
<TD><INPUT type=radio value=H2 name=headingBlockSize onClick=ReWrite()>
Medium</TD>
<TD><INPUT type=radio value=H1 name=headingBlockSize onClick=ReWrite()>
<FONT size=+1>Large</FONT></TD>`
	else if (pagedata.blocks[oldBlockNum].size == "H1")
		data += `<TD><INPUT type=radio value=H3 name=headingBlockSize onClick=ReWrite()>
<FONT size=-1>Small</FONT></TD>
<TD><INPUT type=radio value=H2 name=headingBlockSize onClick=ReWrite()>
Medium</TD>
<TD><INPUT type=radio value=H1 name=headingBlockSize checked onClick=ReWrite()>
<FONT size=+1>Large</FONT></TD>`
	else
		data += `<TD><INPUT type=radio value=H3 name=headingBlockSize onClick=ReWrite()>
<FONT size=-1>Small</FONT></TD>
<TD><INPUT type=radio value=H2 name=headingBlockSize checked onClick=ReWrite()>
Medium</TD>
<TD><INPUT type=radio value=H1 name=headingBlockSize onClick=ReWrite()>
<FONT size=+1>Large</FONT></TD>`
data += `
<TR>
<TD>Add a divider line:</TD>
<TD colspan=3><INPUT type=checkbox name=headingBlockDividerBefore `
	if (pagedata.blocks[oldBlockNum].dividerBefore == "on")
		data += "checked"
	data += `>
Before the heading</TD>
</TR>
<TR>
<TD></TD>
<TD colspan=3><INPUT type=checkbox name=headingBlockDividerAfter `
	if (pagedata.blocks[oldBlockNum].dividerAfter == "on")
		data += "checked"
	data += `>
After the heading</TD>
</TR>
</TABLE>
<tr>
<td height=80>
<tr>
<td valign=bottom>
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td>
<table>
<tr><td>
<FONT color=D1D1D1>
<SPACER type=block width=25>
<input type=text width=150 name=position usestyle value="item 1 (of 1)" border=0 noselect nobackground>
<input type=hidden name=newBlockNum value=${oldBlockNum}>
</FONT>
<tr>
<td align=center>
<a href=javascript:MoveUp()><IMG src="/ROMCache/moveup.gif"></a>
<a href=javascript:MoveDown()><IMG src="/ROMCache/movedown.gif"></a>
</table>
<SCRIPT>
WritePositionString();
function MoveUp()
{	if (document.theForm.newBlockNum.value > 0)
{	document.theForm.newBlockNum.value--;
WritePositionString();
}
}
function MoveDown()
{	if (document.theForm.newBlockNum.value < (${blockNum}-1))
{	document.theForm.newBlockNum.value++;
WritePositionString();
}
}
function WritePositionString()
{	var blockNum = parseInt(document.theForm.newBlockNum.value) + 1;
document.theForm.position.value = "moving item...";
tempStr = "document.theForm.position.value='item " + blockNum + " (of ${blockNum})'";
setTimeout(tempStr, 500);
}
</SCRIPT>
</td>
<td>
<td width=144 height=36 align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:SubmitForm()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Done</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</table>
</form>
</BODY>
</HTML>
`
	break;
	
	case "list":
	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>
Add a list
</TITLE>
<script language=javascript>
var kNumToAdd = 1;	// number of new fields to add at a time
var kNumToStart = 4;
function SetListItems()
{`

	for (let i = 0; i < pagedata.blocks[oldBlockNum].items.length; i++) {
		data += `ListElements[${i}] = "${pagedata.blocks[oldBlockNum].items[i]}";
`
	}
data +=`WriteEmbed(document.listEmbed)
}
function EscapeQuotes(inString)
{	var outString = new String;
var i;
var theStr = new String(inString);
if (theStr.indexOf('"') == -1)
return theStr;
for (i = 0; i < theStr.length; i++)
{	if (theStr.charAt(i) == '"')
outString += '&quot;';
else
outString += theStr.charAt(i);
}
return outString;
}
function WriteEmbed(whichEmbed)
{	var	i;
var numBlankFields = 0;
whichEmbed.document.open();
whichEmbed.document.write(
'<form action="wtv-author:save-block" name=theForm>
<input name=docName type=hidden value="${docName}">
<input name=blockNum type=hidden value="${oldBlockNum}">
<input name=blockTitle type=hidden>' +
'<input name=blockClass type=hidden value=24>' +
'<input name=editing type=hidden value=true>' +
'<FONT color=AEBFD1><UL>');
for (i = 0; i < ListElements.length; i++)
whichEmbed.document.write('<LI> <input type=text name=listItemText text=CACA4A
bgcolor=192133 autoactivate font=proportional width=100% value="' + EscapeQuotes(ListElements[i]) + '"></LI>');
if (i < 25)
numBlankFields = (i == 0 ? kNumToStart : kNumToAdd);
for (i = 0; i < numBlankFields; i++)	// add some blank lines
{	whichEmbed.document.write('<LI> <input type=text name=listItemText text=CACA4A
bgcolor=192133 autoactivate font=proportional width=100%></LI>');
}
whichEmbed.document.write('<input type=hidden name=newBlockNum>');
whichEmbed.document.write('</UL></FONT></form>');
whichEmbed.document.close();
}
function SaveFields(whichEmbed)
{	var	numItems = whichEmbed.document.theForm.listItemText.length;
for (var i = 0; i < numItems; i++)
ListElements[i] = whichEmbed.document.theForm.listItemText[i].value;
}
function MakeMoreRoom(whichEmbed)
{	var	numPreviousItems = whichEmbed.document.theForm.listItemText.length;
if (numPreviousItems >= 25)
return alert("You can't have more than 25 items in a list.");
SaveFields(whichEmbed);
WriteEmbed(whichEmbed);
// Focus on the first new field
SelectIt(numPreviousItems);
//setTimeout("SelectIt(" + numPreviousItems + ")", 150);
//whichEmbed.document.theForm.listItemText[numPreviousItems-1].focus();
//alert(numPreviousItems);
}
function SelectIt(whichItem)
{	setTimeout("document.listEmbed.document.theForm.listItemText[" + whichItem + "].focus()", 150);
}
function SubmitForm()
{	var	embeddedForm = document.listEmbed.document.theForm;
var submitURL = embeddedForm.action + "?";
embeddedForm.newBlockNum.value = document.theForm.newBlockNum.value;
embeddedForm.blockTitle.value = document.theForm.blockTitle.value;
// Because of a bug in Classic, can't simply submit the embedded form...
for (var index = 0; index < embeddedForm.elements.length; index++)
{	submitURL += embeddedForm.elements[index].name + "=" +
escape(embeddedForm.elements[index].value) + "&";
}
location = submitURL;
//embeddedForm.Submit();
}
var ListElements = new Array(
);
</SCRIPT>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="client:showalert?sound=none&message=Would%20you%20like%20to%20remove%20this%20entire%20item%3F&buttonlabel1=Don't%20Remove&buttonaction1=client:donothing&buttonlabel2=Remove&buttonaction2=wtv-author%3A%2Fdelete-block%3FdocName%3D${docName}%26blockNum%3D${oldBlockNum}" ID=RemoveButton
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Remove</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
onLoad="SetListItems()"
>
<form name=theForm>
<table cellspacing=0 cellpadding=0 width=100% height=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td abswidth=15 rowspan=100>
<tr>
<td absheight=34 valign=bottom>
<font size=+1 color=D1D1D1><blackface>
Add a list to your document
</blackface></font>
<tr>
<td absheight=10>
<tr>
<td absheight=28 valign=bottom>
<font color=AEBFD1> Type a title (optional): </font>
<tr>
<td absheight=28>
<input type=text name="blockTitle" value="${pagedata.blocks[oldBlockNum].title}" selected width=100% text=CACA4A bgcolor=192133 font=proportional autoactivate>
<tr>
<td absheight=28 valign=bottom>
<font color=AEBFD1> Type your list here: </font>
<tr>
<td valign=top>
<EMBED name=listEmbed transition=crossfade src="file://ROM/HTMLs/Empty.html" width=100% nobackground>
<tr>
<td align=right valign=top>
<TABLE cellspacing=0 cellpadding=0 href="javascript:MakeMoreRoom(document.listEmbed)" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Add a line</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
<tr><td height=20>
<tr>
<td valign=bottom>
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td>
<table>
<tr><td>
<FONT color=D1D1D1>
<SPACER type=block width=30>
<input type=text width=150 name=position usestyle value="item 0 (of 1)" border=0 noselect nobackground>
<input type=hidden name=newBlockNum value=${oldBlockNum}>
</FONT>
<tr>
<td align=center>
<a href=javascript:MoveUp()><IMG src="/ROMCache/moveup.gif"></a>
<a href=javascript:MoveDown()><IMG src="/ROMCache/movedown.gif"></a>
</table>
<SCRIPT>
WritePositionString();
function MoveUp()
{	if (document.theForm.newBlockNum.value > 0)
{	document.theForm.newBlockNum.value--;
WritePositionString();
}
}
function MoveDown()
{	if (document.theForm.newBlockNum.value < (${blockNum}-1))
{	document.theForm.newBlockNum.value++;
WritePositionString();
}
}
function WritePositionString()
{	var blockNum = parseInt(document.theForm.newBlockNum.value) + 1;
document.theForm.position.value = "moving item...";
tempStr = "document.theForm.position.value='item " + blockNum + " (of ${blockNum})'";
setTimeout(tempStr, 500);
}
</SCRIPT>
</td>
<td>
<td width=144 height=36 align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:SubmitForm()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Done</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</table>
</form>
</BODY>
</HTML>
`
	break;
	
	case "link":
	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>
Add a list of links
</TITLE>
<script language=javascript>
var kNumToAdd = 1;	// number of new fields to add at a time
var kNumToStart = 4;
var ListElements = new Array(0);
function SetListItems()
{
`

	for (let i = 0; i < pagedata.blocks[oldBlockNum].items.length; i++) {
		data += `ListElements[${i}] = new Object;`
		if (pagedata.blocks[oldBlockNum].items[i].name == undefined)
			data += `ListElements[${i}].desc = "";`
		else
			data += `ListElements[${i}].desc = "${pagedata.blocks[oldBlockNum].items[i].name}";`
		
		data += `ListElements[${i}].url = "${pagedata.blocks[oldBlockNum].items[i].url}";
`
	}
data +=`WriteEmbed(document.listEmbed)
}
function EscapeQuotes(inString)
{	var outString = new String;
var i;
var theStr = new String(inString);
if (theStr.indexOf('"') == -1)
return theStr;
for (i = 0; i < theStr.length; i++)
{	if (theStr.charAt(i) == '"')
outString += '&quot;';
else
outString += theStr.charAt(i);
}
return outString;
}
function WriteEmbed(whichEmbed)
{	var i;
var numBlankFields = 0;
whichEmbed.document.open();
whichEmbed.document.write(
'<BODY><basefont size=1><form action="wtv-author:save-block" name=theForm>
<input name=docName type=hidden value="${docName}">
<input name=blockNum type=hidden value="${oldBlockNum}">
<input name=editing type=hidden value="true">
<input name=blockTitle type=hidden>' +
'<input name=blockClass type=hidden value=25>' +
'<input name=returnPageURL type=hidden disabled>' +
'<TABLE width=100%><TR>
<TD width=50%><font color=AEBFD1> Description </font></TD>
<TD width=50%><font color=AEBFD1> Web address (URL)</TD></TR>');
var numItems = ListElements.length;
if (numItems > 25)	//
numItems = 25;
for (i = 0; i < numItems; i++)
{	whichEmbed.document.write('<TR>
<TD><font size=2 color=CACA4A><input type=text autoactivate usestyle bgcolor=192133 maxlength=1000 name=listItemText id=listItemText value="' + EscapeQuotes(ListElements[i].desc) + '" ></font></TD>
<TD><font size=2 color=CACA4A><input type=text autoactivate usestyle bgcolor=192133 maxlength=1000 name=linkItemURL value="' + EscapeQuotes(ListElements[i].url) + '" ></font></TD></TR>');
}
if (i < 25)
numBlankFields = (i == 0 ? kNumToStart : kNumToAdd);
for (i = 0; i < numBlankFields; i++)	// add some blank lines
{	whichEmbed.document.write('<TR><TD><font size=2 color=CACA4A><input type=text autoactivate usestyle bgcolor=192133 maxlength=1000 name=listItemText');
if (i == numBlankFields-1)
whichEmbed.document.write(' nextDown=AddLine');
whichEmbed.document.write(' id=listItemText ></font></TD>
<TD><font size=2 color=CACA4A><input type=text autoactivate usestyle bgcolor=192133 maxlength=1000 name=linkItemURL value="http://" ></font></TD></TR>');
}
whichEmbed.document.write('</TABLE><input type=hidden name=newBlockNum>');
whichEmbed.document.write('</form></BODY>');
whichEmbed.document.close();
}
function SaveFields(whichEmbed)
{	var	numItems = whichEmbed.document.theForm.listItemText.length;
for (var i = 0; i < numItems; i++)
{	if (ListElements[i] == null)
ListElements[i] = new Object;
ListElements[i].desc = whichEmbed.document.theForm.listItemText[i].value;
ListElements[i].url = whichEmbed.document.theForm.linkItemURL[i].value;
}
}
function MakeMoreRoom(whichEmbed)
{	var	numPreviousItems = whichEmbed.document.theForm.listItemText.length;
if (numPreviousItems >= 25)
return alert("You can't have more than 25 links in a list.");
SaveFields(whichEmbed);
WriteEmbed(whichEmbed);
// Focus on the first new field
SelectIt(numPreviousItems);
//setTimeout("SelectIt(" + numPreviousItems + ")", 150);
//whichEmbed.document.theForm.listItemText[numPreviousItems-1].focus();
//alert(numPreviousItems);
}
function SelectIt(whichItem)
{	setTimeout("document.listEmbed.document.theForm.listItemText[" + whichItem + "].focus()", 150);
}
function SubmitForm()
{	var	embeddedForm = document.listEmbed.document.theForm;
var submitURL = embeddedForm.action + "?";
embeddedForm.newBlockNum.value = document.theForm.newBlockNum.value;
embeddedForm.blockTitle.value = document.theForm.blockTitle.value;
// Because of a bug in Classic, can't simply submit the embedded form...
for (var index = 0; index < embeddedForm.elements.length; index++)
{	submitURL += embeddedForm.elements[index].name + "=" +
escape(embeddedForm.elements[index].value) + "&";
}
location = submitURL;
//embeddedForm.Submit();
}
function SubmitThenAddFavs()
{	var	embeddedForm = document.listEmbed.document.theForm;
var	numPreviousItems = embeddedForm.listItemText.length;
if (numPreviousItems >= 25)
return alert("You can't have more than 25 links in a list.");
embeddedForm.returnPageURL.disabled = false;
embeddedForm.returnPageURL.value = "wtv-author:/fill-from-favorites?docName=${docName}&blockNum=${oldBlockNum}";
SubmitForm();
}
</SCRIPT>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="client:showalert?sound=none&message=Would%20you%20like%20to%20remove%20this%20entire%20item%3F&buttonlabel1=Don't%20Remove&buttonaction1=client:donothing&buttonlabel2=Remove&buttonaction2=wtv-author%3A%2Fdelete-block%3FdocName%3D${docName}%26blockNum%3D${oldBlockNum}" ID=RemoveButton
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Remove</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
onLoad="SetListItems()"
>
<form name=theForm>
<table cellspacing=0 cellpadding=0 width=100% height=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td><td abswidth=15 rowspan=100>
<tr>
<td absheight=34 valign=bottom colspan=2>
<font size=+1 color=D1D1D1><blackface>
Add a list of links to your document
</blackface></font>
<tr>
<td absheight=10>
<tr>
<td absheight=28 valign=bottom colspan=2>
<font color=AEBFD1> Type a title (optional): </font>
<tr>
<td absheight=28 colspan=2>
<input type=text name="blockTitle" value="${pagedata.blocks[oldBlockNum].title}" selected width=100% text=CACA4A bgcolor=192133 font=proportional autoactivate nextDown="listItemText">
<tr>
<td absheight=28 valign=bottom colspan=2>
<font color=AEBFD1> Type the description and address of your links: </font>
<tr>
<td valign=top colspan=2>
<EMBED name=listEmbed transition=crossfade src="file://ROM/HTMLs/Empty.html" width=100% nobackground>
<tr>
<td align=left valign=top>
<TABLE cellspacing=0 cellpadding=0 href="javascript:MakeMoreRoom(document.listEmbed)" id=AddLine>
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Add a line</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
<td valign=top align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:SubmitThenAddFavs()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines="1" width="170" align="center">
<font sizerange=medium color="0F283F">Add from Favorites</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
<tr><td height=30>
<tr>
<td valign=bottom>
<table>
<tr><td>
<FONT color=D1D1D1>
<SPACER type=block width=30>
<input type=text width=150 name=position usestyle value="item 0 (of 1)" border=0 noselect nobackground>
<input type=hidden name=newBlockNum value=${oldBlockNum}>
</FONT>
<tr>
<td align=center>
<a href=javascript:MoveUp()><IMG src="/ROMCache/moveup.gif"></a>
<a href=javascript:MoveDown()><IMG src="/ROMCache/movedown.gif"></a>
</table>
<SCRIPT>
WritePositionString();
function MoveUp()
{	if (document.theForm.newBlockNum.value > 0)
{	document.theForm.newBlockNum.value--;
WritePositionString();
}
}
function MoveDown()
{	if (document.theForm.newBlockNum.value < (${blockNum}-1))
{	document.theForm.newBlockNum.value++;
WritePositionString();
}
}
function WritePositionString()
{	var blockNum = parseInt(document.theForm.newBlockNum.value) + 1;
document.theForm.position.value = "moving item...";
tempStr = "document.theForm.position.value='item " + blockNum + " (of ${blockNum})'";
setTimeout(tempStr, 500);
}
</SCRIPT>
</td>
<td width=144 height=36 align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:SubmitForm()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Done</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</form>
</BODY>
</HTML>
`
	break;
	
	case "break":
	data = `<HTML>
<HEAD>
<DISPLAY fontsize=medium>
<TITLE>
Break pages</TITLE>
</HEAD>
<sidebar width=122 height=420 align=left>
<table cellspacing=0 cellpadding=0 height=385>
<TR>
<td width=3>
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td absHEIGHT=4>&nbsp;
<td abswidth=2 bgColor=#8A99B0 rowspan=99>
<td width=4 rowspan=99>
<td backGround="wtv-author:/ROMCache/grad_tile.gif" width=16 rowspan=99>
</TR>
<tr>
<td>
<td align=right height=69 width=93 href="wtv-home:/home">
<img src="${minisrv_config.config.service_logo}" width=87 height=67>
<tr><td absheight=5>&nbsp;
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="client:showalert?sound=none&message=Would%20you%20like%20to%20remove%20this%20entire%20item%3F&buttonlabel1=Don't%20Remove&buttonaction1=client:donothing&buttonlabel2=Remove&buttonaction2=wtv-author%3A%2Fdelete-block%3FdocName%3D${docName}%26blockNum%3D${oldBlockNum}" ID=RemoveButton
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Remove</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td abswidth=93 absheight=26 >
<table href="wtv-guide:/help?topic=Publish&subtopic=Index&appName=Page%20Builder"
cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td abswidth=90 valign=middle align=left><table cellspacing=0 cellpadding=0><tr><td maxlines=1><font sizerange=medium color="C2CCD7">Help</font></table>
</table>
<TR>
<td colspan=5 absheight=2 valign=middle align=center bgcolor=#8A99B0>&nbsp;
<tr>
<td>
<td valign=bottom align=right > <img src="wtv-author:/ROMCache/pagebuilder.gif" height=124 width=78>&nbsp;
</table>
</sidebar>
<body
bgcolor=#1e4261
background=wtv-author:/ROMCache/blue_tile_128.gif text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
>
<form name=theForm action="wtv-author:save-block">
<input name=editing type=hidden value=true>
<input name=docName type=hidden value=${docName}>
<input name=blockNum type=hidden value="${oldBlockNum}">
<input name=blockClass type=hidden value=27>
<table cellspacing=0 cellpadding=0 height=100% width=100%
>
<tr>
<td abswidth=10 rowspan=100><td><td abswidth=15 rowspan=100>
<tr>
<td absheight=34 valign=bottom>
<font size=+1 color=D1D1D1><blackface>
Break one page into two
</blackface></font>
<tr>
<td absheight=10>
<tr>
<td align=center>
<IMG src="/ROMCache/newpagebig.gif">
<tr>
<td>
<table cellspacing=0 cellpadding=0 width=100%>
<tr><td>
<table>
<tr><td>
<FONT color=D1D1D1>
<SPACER type=block width=25>
<input type=text width=150 name=position usestyle value="item 9 (of 10)" border=0 noselect nobackground>
<input type=hidden name=newBlockNum value=${oldBlockNum}>
</FONT>
<tr>
<td align=center>
<a href=javascript:MoveUp()><IMG src="/ROMCache/moveup.gif"></a>
<a href=javascript:MoveDown()><IMG src="/ROMCache/movedown.gif"></a>
</table>
<SCRIPT>
WritePositionString();
function MoveUp()
{	if (document.theForm.newBlockNum.value > 0)
{	document.theForm.newBlockNum.value--;
WritePositionString();
}
}
function MoveDown()
{	if (document.theForm.newBlockNum.value < (${blockNum}-1))
{	document.theForm.newBlockNum.value++;
WritePositionString();
}
}
function WritePositionString()
{	var blockNum = parseInt(document.theForm.newBlockNum.value) + 1;
document.theForm.position.value = "moving item...";
tempStr = "document.theForm.position.value='item " + blockNum + " (of ${blockNum})'";
setTimeout(tempStr, 500);
}
</SCRIPT>
</td>
<td>
<td width=144 height=36 align=right>
<TABLE cellspacing=0 cellpadding=0 href="javascript:document.theForm.submit()" >
<TR>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_left.gif" height=31 width=17>
<TD background="wtv-author:/ROMCache/biff_center.gif" height=31>
<table cellspacing=0 cellpadding=0>
<tr>
<td abswidth=5>
<td maxlines=1>
<font sizerange=medium color="0F283F">Done</font>
<td abswidth=5>
</table>
<TD width=17><IMG src="wtv-author:/ROMCache/biff_right.gif" height=31 width=18>
</TABLE>
</table>
</table>
</form>
</table>
</BODY>
</HTML>
`
	break;
}