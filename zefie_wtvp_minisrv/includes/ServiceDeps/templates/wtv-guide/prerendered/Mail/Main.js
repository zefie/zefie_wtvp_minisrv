data = `
<html>
<head>
<title>Help: Mail</title>
<display noscroll>
<script language='Javascript'>
var cat = new Array();
var subCat = new Array();
var subCatUrl = new Array();
var ind = 0;
ind++;
cat[ind] = "Writing e-mail";
subCat[ind] = new Array();
subCatUrl[ind] = new Array();
subInd = 0;
subInd++;
subCat[ind][subInd] = "How to write a message";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Write&page=Writing";
subInd++;
subCat[ind][subInd] = "Adding pictures to e-mail";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Write&page=Writing";
subInd++;
subCat[ind][subInd] = "Adding sounds to e-mail";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Write&page=Writing";
subInd++;
subCat[ind][subInd] = "Your e-mail signature";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Signature&page=Signature";
subInd++;
subCat[ind][subInd] = "Cut, copy and paste";
subCatUrl[ind][subInd] = "topic=Tips&subtopic=CutPaste&page=Start";
subInd++;
subCat[ind][subInd] = "Carbon copies (cc)";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=CarbCops&page=CarbCops";
ind++;
cat[ind] = "Address book";
subCat[ind] = new Array();
subCatUrl[ind] = new Array();
subInd = 0;
subInd++;
subCat[ind][subInd] = "What is the Address book?";
subCatUrl[ind][subInd] = "topic=Addressbook&subtopic=WhatIs";
subInd++;
subCat[ind][subInd] = "Adding to the Address book";
subCatUrl[ind][subInd] = "topic=Addressbook&subtopic=AddTo";
ind++;
cat[ind] = "Reading e-mail";
subCat[ind] = new Array();
subCatUrl[ind] = new Array();
subInd = 0;
subInd++;
subCat[ind][subInd] = "How to read your e-mail";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Reading";
subInd++;
subCat[ind][subInd] = "Saving a message";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Saving";
subInd++;
subCat[ind][subInd] = "Forwarding a message";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Forward";
subInd++;
subCat[ind][subInd] = "Fetching remote e-mail";
subCatUrl[ind][subInd] = "topic=MailPOP&subtopic=Index";
ind++;
cat[ind] = "Replying to e-mail";
subCat[ind] = new Array();
subCatUrl[ind] = new Array();
subInd = 0;
subInd++;
subCat[ind][subInd] = "Replying to a message";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Reply&page=Reply";
subInd++;
subCat[ind][subInd] = "Attaching the original";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Attach&page=Attach";
subInd++;
subCat[ind][subInd] = "Reply all";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=ReplyAll";
ind++;
cat[ind] = "Storage";
subCat[ind] = new Array();
subCatUrl[ind] = new Array();
subInd = 0;
subInd++;
subCat[ind][subInd] = "Storage overview";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Storage";
subInd++;
subCat[ind][subInd] = "Discarding e-mail";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Discard";
subInd++;
subCat[ind][subInd] = "Saving messages you send";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=SaveSent";
subInd++;
subCat[ind][subInd] = "Reading saved messages";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=ReadingSaved";
subInd++;
subCat[ind][subInd] = "Recovering discarded messages";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=Recover";
subInd++;
subCat[ind][subInd] = "When your Mail list fills up";
subCatUrl[ind][subInd] = "topic=Mail&subtopic=FullMailbox";
function doDone() {	str = document.pageInfo.leaveInstructMenu.value;
goBackToUrl(str);
}
function tryApp() {	location.href = "wtv-tricks:/mail";
}
var jsVisibleCat;
var jsSelectCat;
var selectSubcat;
function drawAll() {	jsVisibleCat = document.indexForm.indexCat.value;
if (jsVisibleCat == "") jsVisibleCat = 0;
jsSelectCat = document.indexForm.selectCat.value;
if (jsSelectCat == "") jsSelectCat = 1;
jsSelectSubcat = document.indexForm.indexSubcat.value;
if (jsSelectSubcat == "") jsSelectSubcat = 0;
var embedDoc = document.embedArea.document;
embedDoc.open();
embedDoc.write( '<body hspace=0 vspace=0 text="E6E6E6" link="E6E6E6" vlink="E6E6E6"fontsize="medium" bgcolor=00292f>' );
embedDoc.write( '<table cellspacing="0" cellpadding="0">' );
embedDoc.write( '<tbody><tr>' );
embedDoc.write( '<td width="560" valign="top" height="96">' );
embedDoc.write( '<table width="560" height="96" cellspacing="0" cellpadding="0" background="wtv-guide:/ROMCache/helpMasthead.swf">' );
embedDoc.write( '<tbody><tr>' );
embedDoc.write( '<td rowspan="2" width="107" valign="top" height="96">' );
embedDoc.write( '<spacer type="vertical" height="7"><br>' );
embedDoc.write( '<spacer type="horizontal" width="7">' );
embedDoc.write( '<a href="wtv-home:/home">' );
embedDoc.write( '<img src="wtv-home:/ROMCache/WebTVLogoJewel.gif" width="87" height="67">' );
embedDoc.write( '</a>' );
embedDoc.write( '</spacer></spacer></td><td width="453" valign="top">' );
embedDoc.write( '<spacer type="vertical" height="52"><br>' );
embedDoc.write( '<spacer type="horizontal" width="106">' );
embedDoc.write( '<font size="+3" color="DDDDDD"><blackface>' );
embedDoc.write( 'Mail' );
embedDoc.write( "</blackface></font>" );
embedDoc.write( "<tr>" );
embedDoc.write( "<td align=right>" );
embedDoc.write( "&nbsp;" );
embedDoc.write( "</table>" );

embedDoc.write( "<tr>" );
embedDoc.write( "<td width=560 valign=top height=225>" );
embedDoc.write( "<table cellpadding=0 cellspacing=0 width=560>" );
embedDoc.write( "<tr>" );
embedDoc.write( "<td width=25 height=5>" );
embedDoc.write( "<td width=535>" );
embedDoc.write( "<tr>" );
embedDoc.write( '<td>' );
embedDoc.write( '<td height=225 rowspan=2 valign=top>' );
embedDoc.write( '<table width=100%>' );
embedDoc.write( '<tr>' );
embedDoc.write( '<td height=24>' );
embedDoc.write( '<font color=aaaaaa>Choose a topic:' );
embedDoc.write( '<tr>' );
embedDoc.write( '<td height=1 bgcolor=aaaaaa gradcolor=00292f gradangle=90>' );
embedDoc.write( '<tr>' );
embedDoc.write( '<td height=0>' );
embedDoc.write( '</table>' );
embedDoc.write( '<table cellpadding=0 cellspacing=0 height=225 width=535>' );

embedDoc.write( '<td height=0>' );
embedDoc.write( '<tr>' );
embedDoc.write( '<td>' );
embedDoc.write( '<td valign=top>' );
embedDoc.write( '<table><tr><td colspan=2>' );
embedDoc.write( '<tr><td>' );
embedDoc.write( '</table>' );
embedDoc.write( '<tr><td valign=top height=224 width=205>' );
embedDoc.write( '<table cellspacing=0 cellpadding=0 width=205>' );
embedDoc.write( '<tr><td height=2 width=15><td width=175><td width=15>' );
for (var i = 1; i < cat.length; i++) {	if (i == jsVisibleCat) {	embedDoc.write( '<tr><td bgcolor=141A19><td height=27 bgcolor=141A19>');
if (i == jsSelectCat) {	embedDoc.write( '<a href="client:donothing" nextRight="cat' + i + '1" id="cat' + i + '" selected>');
} else {	embedDoc.write( '<a href="client:donothing" nextRight="cat' + i + '1" id="cat' + i + '">');
}
embedDoc.write( cat[i] + '</a>');
embedDoc.write( '<td align=right bgcolor=141A19><font color=395A31>&#128;&nbsp;');
} else {	embedDoc.write( '<tr><td height=27><font color=395A31>&#128;<td>' );
if (i == jsSelectCat) {	embedDoc.write( '<a href="javascript:showSection(' + i + ')" selected>' + cat[i] + '</a>');
} else {	if (jsVisibleCat == 0) {	embedDoc.write( '<a href="javascript:showSection(' + i + ')">' + cat[i] + '</a>');
} else {	embedDoc.write( '<a href="javascript:showSection(' + i + ')" onMouseOver="hideSection(' + i + ');"><font color=6e6e7e>' + cat[i] + '</a>');
}
}
embedDoc.write( '<td>&nbsp;');
}
}
embedDoc.write( '</table>' );
embedDoc.write( '<td valign=top width=313>' );
embedDoc.write( '<table width=313 height=' + (27*(cat.length-1)+2) + ' cellspacing=0 cellpadding=0>' );
embedDoc.write( '<tr><td height=2 width=2><td width=25><td width=284><td width=2>' );
if ( jsVisibleCat != 0 ) {	embedDoc.write( '<tr><td rowspan=99 bgcolor=141A19>' );
embedDoc.write( '<td height=2 colspan=2 bgcolor=141A19>' );
embedDoc.write( '<td rowspan=99 bgcolor=141A19>' );
embedDoc.write( '<tr><td height=3>' );
for (var i = 1; i < subCat[jsVisibleCat].length; i++) {	embedDoc.write( '<tr><td height=24 valign=top align=center><font color=395A31>&#128;' );
embedDoc.write( '<td>' );
if (i == jsSelectSubcat) {	embedDoc.write( '<a href="javascript:goToPage('+ jsVisibleCat +','+ i +')" onMouseOver="setSubSection(' + i + ');" nextLeft="cat' + jsVisibleCat + '" id="cat' + jsVisibleCat + i +'" selected>' + subCat[jsVisibleCat][i]);
} else {	embedDoc.write( '<a href="javascript:goToPage('+ jsVisibleCat +','+ i +')" onMouseOver="setSubSection(' + i + ');" nextLeft="cat' + jsVisibleCat + '" id="cat' + jsVisibleCat + i +'">' + subCat[jsVisibleCat][i]);
}
embedDoc.write( '</a>' );
}
embedDoc.write( '<tr><td><spacer type=vertical height=3><br>' );
embedDoc.write( '<tr><td colspan=2 height=2 bgcolor=141A19>' );
} else {	embedDoc.write( '<tr><td><td><spacer type=horizontal width=25><td><spacer type=horizontal width=284><td>' );
}
embedDoc.write( '</table>' );
embedDoc.write( '<tr><td height=3>' );
embedDoc.write( '</table>' );
embedDoc.write( '<tr><td colspan=3 valign=bottom height=0 align=right>' );
embedDoc.write( '<spacer type=vertical height=260>' );
embedDoc.write( "<a href='wtv-guide:/topic=help&subtopic=Mail&page=mail'><img src='wtv-guide:/ROMCache/HelpDoneButton.gif' width='110' height='33'></a> " );
embedDoc.write( '<spacer type=horizontal width=20>' );
embedDoc.write( '</table>');
embedDoc.write( '</body>' );
embedDoc.close();
}
function showSection(gvnNum) {	document.indexForm.indexCat.value = gvnNum;
document.indexForm.selectCat.value = "0";
document.indexForm.indexSubcat.value = "1";
drawAll();
}
function setSubSection(gvnNum) {	document.indexForm.selectCat.value = "0";
document.indexForm.indexSubcat.value = gvnNum;
}
function hideSection(gvnNum) {	document.indexForm.indexCat.value = "0";
document.indexForm.selectCat.value = gvnNum;
document.indexForm.indexSubcat.value = "0";
drawAll();
}
function goToPage(a,b) {	str = subCatUrl[a][b];
if (str.substring(0,4) == "faq:") {	goToStr = str.substring(4,str.length);
goToHelpCenter(goToStr);
} else if (str.substring(0,9) == "non-help:") {	goToStr = str.substring(9,str.length);
goToUrl(goToStr);
} else if (str.substring(0,7) == "newFAQ:") {	goToStr = str.substring(7,str.length);
goToFAQURL(goToStr);
} else {	goToStr = ('wtv-guide:/help?' + str);
goToUrl(goToStr);
}
}
function preDrawPage() {	var embedDoc = document.embedArea.document;
embedDoc.open();
embedDoc.write( '<body text=D2D2D3 link=D2D2D3 vlink=D2D2D3>' );
embedDoc.write( '<table width=560 height=384 cellspacing=0 cellpadding=0>' );
embedDoc.write( '<tr><td colspan=4 width=560 height=80 bgcolor=5A5A52 valign=top>' );
embedDoc.write( '<table width=560 height=80 cellspacing=0 cellpadding=0>' );
embedDoc.write( '<tr><td width=107 height=80 valign=top rowspan=2>' );
embedDoc.write( '<spacer type=vertical height=7><br>' );
embedDoc.write( '<spacer type=horizontal width=7>' );
embedDoc.write( '<td width=453 valign=top>' );
embedDoc.write( '<spacer type=vertical height=48><br>' );
embedDoc.write( '<spacer type=horizontal width=90>' );
embedDoc.write( '<font size=+3 color=D6D6D6>' );
embedDoc.write( '<blackface>Mail&nbsp;</blackface></font>' );
embedDoc.write( '</table>' );
embedDoc.write( "<tr><td width=15 bgcolor=5A5A52 rowspan=4>" );
embedDoc.write( "<td width=15 bgColor=2D3131 valign=top>" );
embedDoc.write( "<td width=518 height=25 bgColor=2D3131 gradColor=141A19 gradAngle=90 align=right>" );
embedDoc.write( "<td width=12 bgcolor=141A19>" );
embedDoc.write( '<tr><td><td width=518 height=234>' );
embedDoc.write( '<tr><td height=45>' );
embedDoc.write( '</table>');
embedDoc.write( '</body>' );
embedDoc.close();
}
function noBackHelp(gvnStr) {	str = ( "wtv-guide:/nobackSubtopic?topic=Mail&subtopic=Instructions&endUrl=" + escape(gvnStr) )
location.href = str;
}
function goToHelpUrl(gvnTop,gvnSub,gvnPag) {	str = getHelpUrl(gvnTop,gvnSub,gvnPag);
goToUrl(str);
}
function goToFAQURL(targetURL) {	document.location = targetURL;
}
function goToUrl(gvnStr) {	document.pageInfo.action=gvnStr;
document.pageInfo.submit();
}
function goToHelpCenter(gvnStr) {	document.helpCenterInfo.action= ("http://127.0.0.1/HelpCenter/" + gvnStr);
document.helpCenterInfo.submit();
}
function goBackToUrl(gvnStr, wholeString) {	/*
If the URL is at the beginning of any item in the backlist,
go back to it. If not, just go to it. If wholeString is
specified, it looks for perfect matches of the whole string.
*/
ind = gvnStr.indexOf("wtv-token");
if (ind > -1) {	gvnStr = gvnStr.substring(0,ind);
}
window.message("gvnStr=" + gvnStr);
foundInBackList = false;
for (i=history.length; i--; i>0 ) {	if ( wholeString != null ) {	testStr = history[i];
} else {	str = history[i];
testStr = str.substring(0, gvnStr.length);
}
if ( testStr == gvnStr ) {	i++;
foundInBackList = true;
break;
}
}
if (foundInBackList == true) {	history.go(i-history.length);
} else {	goToUrl(gvnStr);
}
}
function getHelpUrl(gvnTop,gvnSub,gvnPag) {	if (gvnTop == 'Index')
tmpStr = ('wtv-guide:/help?topic=' + gvnTop);
else
tmpStr = ('wtv-guide:/help?topic=' + gvnTop);
if (gvnSub != "")
tmpStr += ('&subtopic=' + gvnSub);
if (gvnPag != "")
tmpStr += ('&page=' + gvnPag);
return tmpStr;
}
function endDiploma() {	location.href = document.pageInfo.doneUrl.value;
}
function noBackDiploma() {	noBackHelp(document.pageInfo.doneUrl.value);
}
</script>
</head>
<body hspace=0 vspace=0 text="E6E6E6" link="E6E6E6" vlink="E6E6E6"fontsize="medium" bgcolor=00292f onLoad='drawAll();'>
<embed name="embedArea" src="file://ROM/HTMLs/Empty.html" nobackground>
<form name='pageInfo' method='post'>
</form>
<form name="indexForm">
<input type='label' size=0 noselect name="indexCat">
<input type='label' size=0 noselect name="selectCat">
<input type='label' size=0 noselect name="indexSubcat">
</form>
</body>

`; 