data = `<html><head>
<script>
  <!-- navigation functions -->
  function doSubmit(gvnStr) {
    document.formInfo.action=gvnStr;
    document.formInfo.submit();
  }

function goToMainIndex() {
  indexStr = "wtv-guide:/help?topic=Index&subtopic=Main&page=1";
  history.go(indexStr);
  location.href = "wtv-tricks:/help?topic=Index&subtopic=Main&page=1";
}

  function tryApp() {
    location.href = unescape(document.formInfo.tryItUrl.value);
  }
</script>

<title>Billing</title>
</head>

<body hspace="0" vspace="0" fontsize="medium" noscroll="" vlink="#cccccc" text="#c6bd6c" link="#cccccc" bgcolor="#00292f">
	


<form name="formInfo" method="get">
	<input type="hidden" name="userName"> 
	<input type="hidden" name="ACHinfo">
	<input type="hidden" name="boxKind">
	<input type="hidden" name="tryItLabel">
	<input type="hidden" name="tryItUrl">
</form>



<script>
	if (document.formInfo.boxKind.value == 'Classic')
		boxtype = '!classic!'
	else if (document.formInfo.boxKind.value == 'Plus')
		boxtype = '!plus!'
	else if (document.formInfo.boxKind.value == 'BPS')
		boxtype = '!bps!'
	else if (document.formInfo.boxKind.value == 'EchoStar')
		boxtype = '!echostar!'
	else if (document.formInfo.boxKind.value == 'LC25')
		boxtype = '!lc25!'
	else
		boxtype = '!other!'
		
	if (boxtype != "!other!") {
		var allCookies = document.cookie;
		var pos = allCookies.indexOf("logon");
		if (pos == -1 ) {
			document.cookie = "logon=" + document.formInfo.userName.value + "; path=/; domain=webtv.net";
		}
		pos = allCookies.indexOf("boxtype");
		if (pos == -1 ) {
			document.cookie = "boxtype=" + document.formInfo.boxKind.value + "; path=/; domain=webtv.net";
		}
		pos = document.URL.indexOf("/forms/");
		if (pos == -1)
			document.cookie = "hcurl=" + document.URL + "; path=/; domain=webtv.net";
	}
</script>

<table cellspacing="0" cellpadding="0">
  <tbody><tr>
    <td width="560" valign="top" height="96">
      <table width="560" height="96" cellspacing="0" cellpadding="0" background="wtv-tricks:/ROMCache/helpMasthead.swf">
        <tbody><tr>
          <td rowspan="2" width="107" valign="top" height="96">
            <spacer type="vertical" height="7"><br>
            <spacer type="horizontal" width="7">
<a href='wtv-tricks:/home'>
<img src='wtv-tricks:/ROMCache/WebTVLogoJewel.gif' width=87 height=67>
          </spacer></spacer></td><td width="453" valign="top">
            <spacer type="vertical" height="54"><br>
            <spacer type="horizontal" width="108">
            <font size="+3" color="DDDDDD"><blackface>
                            Billing
            </blackface></font>
            <spacer type="vertical" height="0"><br>
        </spacer></spacer></spacer></td></tr><tr>
          <td align="right">
            <table cellspacing="0" cellpadding="0">
              <tbody><tr>
                <td width="12">
<script>
	if (boxtype != "!other!") {
		document.write("<img width=7 height=7 src='wtv-tricks:/ROMCache/UtilityBullet.gif' align=absmiddle>");
	}
</script>
                  <spacer type="horizontal" width="10">
                </spacer></td><td width="110" valign="top">
<script>
	if (boxtype != "!other!") {
		document.write("<a href='javascript:goToMainIndex()'>");
		document.write("<font size=2>Main index</font></a>");
	}
</script>
                </td><td width="12">
                  <img src="wtv-tricks:/ROMCache/UtilityBullet.gif" width="7" height="7" align="absmiddle"><spacer type="horizontal" width="10">
                </spacer></td><td width="130" valign="top">
                  <a href="javascript:doSubmit('http://askwebtv.webtv.net/index.asp')"><font size="2">Find an answer</font></a>
            </td></tr></tbody></table>
      </td></tr></tbody></table>
</td></tr></tbody></table>

<table frame="" width="560" height="235" cellspacing="2" cellpadding="0">
  <tbody><tr>
    <td width="60"><spacer type="horizontal" size="60"></spacer></td>
    <td valign="top"><font color="#dddddd"><br>
       </font><font color="#70954b"><b>
       <table frame="" width="487" cellspacing="0" cellpadding="0">
         <tbody><tr>
            <td width="250" height="10">
            </td><td width="20">
            </td><td width="250">
            </td><td width="20">
         </td></tr><tr>
           <td valign="top">

<script language="JAVASCRIPT">
var AnsBoxType = new Array();
var AnsHasEmail = new Array();
var MenuChoiceUrl = new Array();
var MenuChoiceUrlOther = new Array();
var MenuChoiceTitle = new Array();
var MenuChoiceSubhead = new Array();

var linkHTML1 = '<table width=250 selected href=';
	if (boxtype == '!other!')
var linkHTML2 = '><tr><td rowspan=2 valign=top><font color=#70954b>&#149;<td valign=top><b><font color=#70954b>';
	else
var linkHTML2 = '><tr><td rowspan=2 valign=top><font color=#70954b>&#128;<td valign=top><b><font color=#70954b>';
var linkHTML3 = '</font><tr><td valign=top><font color=#cccccc>';
var linkHTML4 = '</table><spacer type=vertical height=10><br>';

function writeLinkTable(ind) {
	document.write(linkHTML1);
	document.write(MenuChoiceUrl[ind]);
	document.write(linkHTML2);
	if (boxtype == '!other!')
		document.write('<a href=' + MenuChoiceUrlOther[ind] + '><font color=#70954b>' + MenuChoiceTitle[ind] + '</font></a>');
	else
		document.write(MenuChoiceTitle[ind]);
	document.write(linkHTML3);
	document.write(MenuChoiceSubhead[ind]);
	document.write(linkHTML4);
}

AnsHasEmail[0] = '';
AnsBoxType[0] = '';
MenuChoiceUrl[0] = "javascript:doSubmit('http://help.webtv.net/business/account.html')";
MenuChoiceUrlOther[0] = "'http://help.webtv.net/business/account.html'";
MenuChoiceTitle[0] = "Account information";
MenuChoiceSubhead[0] = "balance, payment info, updating";

AnsHasEmail[1] = '';
AnsBoxType[1] = '';
MenuChoiceUrl[1] = "javascript:doSubmit('http://help.webtv.net/business/billing.html')";
MenuChoiceUrlOther[1] = "'http://help.webtv.net/business/billing.html'";
MenuChoiceTitle[1] = "Billing";
MenuChoiceSubhead[1] = "cost, payment types, additional charges";

AnsHasEmail[2] = '';
AnsBoxType[2] = '';
MenuChoiceUrl[2] = "javascript:doSubmit('http://help.webtv.net/business/cancelservice.html')";
MenuChoiceUrlOther[2] = "'http://help.webtv.net/business/cancelservice.html'";
MenuChoiceTitle[2] = "Canceling the service";
MenuChoiceSubhead[2] = "how to cancel your subscription to WebTV";

AnsHasEmail[3] = '';
AnsBoxType[3] = '';
MenuChoiceUrl[3] = "javascript:doSubmit('http://help.webtv.net/business/giftcard.html')";
MenuChoiceUrlOther[3] = "'http://help.webtv.net/business/giftcard.html'";
MenuChoiceTitle[3] = "Gift Card";
MenuChoiceSubhead[3] = "Purchase the gift of WebTV";

vClassic = 4;
vPlus = 4;

bHasEmail = 0;

vHasEmail = 0;

if (boxtype == '!classic!')
   vCount = vClassic;
else
   vCount = vPlus;

if ((vCount % 2) == 0)
   vMid = vCount - 2;
else
   vMid = vCount - 3;
for(var loop = 0; loop < vCount; loop++) {
   if (AnsHasEmail[loop] == '' || showMail == '' || (showMail == 'true' && AnsHasEmail[loop] == 'True'))
      if (AnsBoxType[loop] == '' || AnsBoxType[loop].indexOf(boxtype) >= 0 || boxtype == '!other!') {
         writeLinkTable(loop);
         }
      if (loop == (vMid / 2)) {
         document.write("<td valign=top><td valign=top>");
         }
      }
</script>

		</spacer></spacer></td></tr></tbody></table>
	</b></font></td></tr></tbody></table>

<table width="560" cellspacing="0" cellpadding="0">
	<tbody><tr>
    <td valign="top" align="right">
      <form id="form1" name="form1">
      <font color="ffcf69"><shadow>
        <script>
			if (boxtype != "!other!") {
				<!-- draw Try It button if the info has been passed from the service -->
				appUrl = document.formInfo.tryItUrl.value;
				if (appUrl != "" ) {
					if ( appUrl.slice(0,10) == "wtv-tricks" ) {
						if ( document.formInfo.tryItLabel.value.length == 4 ) {
							document.write("<input onclick='tryApp()' value='Try " +  document.formInfo.tryItLabel.value + "' borderimage='file://ROM/Borders/ButtonBorder2.bif' type=button usestyle width=110>");
						} else {
							document.write("<input onclick='tryApp()' value='Try " +  document.formInfo.tryItLabel.value + "' borderimage='file://ROM/Borders/ButtonBorder2.bif' type=button usestyle>");
						}
						document.write("<spacer type=horizontal width=20>");
					}
				}
			}
        </script>
        <input selected="" onclick="history.go(-1)" value="Done" borderimage="file://ROM/Borders/ButtonBorder2.bif" type="button" usestyle="" id="button1" name="button1" width="110">
      </shadow></font>
      </form>
	  </td><td width="19">
	</td></tr><tr>
	  <td height="20">
</td></tr></tbody></table>


</body></html>
`;