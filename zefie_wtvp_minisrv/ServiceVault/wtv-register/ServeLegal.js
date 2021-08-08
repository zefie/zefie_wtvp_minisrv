const WTVReg = require("./WTVRegister.js")
var WTVRegister = new WTVReg(minisrv_config.config.service_owner);

headers = `200 OK
Content-Type: text/html`;

data = `<html>
<head>
<title>
</title>
<display nooptions
>
</head>
<sidebar width=110 bgcolor=#5b6c81 fontsize="large" font color="#171726" absheight=300> <table width=150 height=450 cellspacing=0 cellpadding=2 BGCOLOR="#171726">
<tr>
<td align=middle valign=top bgcolor="#5b6c81" border=0 abswidth="200" height="80"><font color="#171726" >
<img src="${minisrv_config.config.service_logo}">
<p><br>	<font size=-1 color="#171726">	<i>	To read <br>more of this <br>agreement, press <b>scroll down</b>
<br><br>
<form name="theForm"
action="client:goback">
<input type=hidden name=any-promotions value="">
<input type=hidden name=subscriber-card-type value="">
<input type=hidden name=qString value="">
<input type=hidden name=passport-force-create value="false">
<input type=hidden name=passport-allow-existing-at-registration value="false">
<input type=hidden name=passport-allow-existing-at-add-user value="false">
<input type=hidden name=passport-supported value="false">
</i></font><p>
<font size="-1" color="#E7CE4A">
<shadow>
<img src="wtv-register:/ROMCache/Spacer.gif" width=18 height=1><p>
<input type=submit Value="Go Back"
name="Agree" borderimage="file://ROM/Borders/ButtonBorder2.bif" usestyle width=100
selected>
</shadow>
</font>
</form>
</tr>
</table>
</sidebar>
<BODY bgcolor="#171726" hspace=0 vspace=0 fontsize=large text=#d1d3d3 link=#FFEA9C vlink=#FFEA9C>
<form name="theForm" action="client:goback">
<input type=hidden name=any-promotions value="">
<input type=hidden name=subscriber-card-type value="">
<input type=hidden name=qString value="">
<input type=hidden name=passport-force-create value="false">
<input type=hidden name=passport-allow-existing-at-registration value="false">
<input type=hidden name=passport-allow-existing-at-add-user value="false">
<input type=hidden name=passport-supported value="false">
<BODY bgcolor="#171726" hspace=0 vspace=0 fontsize=large text=#d1d3d3>
<TABLE width=450 height=200 ALIGN=left VALIGN=BOTTOM vspace=0 hspace=0 cellspacing=0 cellpadding=0>
<tr>
<td colspan= 8 height="30">
<tr>
<td abswidth=20 bgcolor="#171726">
<td height=202 width= 300 bgcolor="#171726" colspan=6 valign=top align=left>
<P ALIGN="CENTER">TERMS OF SERVICE AND NOTICES</P>
<P ALIGN="CENTER">Version Release Date 8/7/2021</P>
<P align="center"><b>${minisrv_config.config.service_name.toUpperCase()} SERVICE USER AGREEMENT</b></P>
<P>&nbsp;</P>
<P>This ${minisrv_config.config.service_name} Mini service ("${minisrv_config.config.service_name} service") is operated by
${(minisrv_config.config.service_owner != "a minisrv user") ? minisrv_config.config.service_owner : "an anonymous user"}<br><br>

Your registration and use of the ${minisrv_config.config.service_name} service constitutes your acceptance of the terms, conditions, and notices set forth in this Agreement. 
${WTVRegister.getServiceOperator().toUpperCase()} RESERVES THE RIGHT TO MODIFY THIS AGREEMENT AT ANY TIME, IN ITS SOLE DISCRETION, BY POSTING CHANGES ONLINE.
YOU ARE RESPONSIBLE FOR REGULARLY REVIEWING THIS AGREEMENT IN ORDER TO OBTAIN TIMELY NOTICE OF SUCH MODIFICATIONS.
THIS INCLUDES ANY AND ALL CHANGES TO SERVICE OPERATION AND EQUIPMENT, AND USER RIGHTS AND RESPONSIBILITIES.
YOUR CONTINUED USE OF THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE FOLLOWING ANY SUCH CHANGE TO THIS AGREEMENT CONSTITUTES YOUR ACCEPTANCE OF THIS 
AGREEMENT AS MODIFIED BY THE POSTED CHANGES. IF ANY OF THE CHANGES MADE TO THIS AGREEMENT ARE UNACCEPTABLE TO YOU, YOU MUST IMMEDIATELY TERMINATE YOUR
${minisrv_config.config.service_name.toUpperCase()} SERVICE ACCOUNT ("ACCOUNT"), AS PROVIDED BELOW. 
This Agreement takes effect on the date on which you accept this Agreement and continues until your ${minisrv_config.config.service_name}
service membership is terminated either by you or by ${WTVRegister.getServiceOperator(true)}.</P>
<P>
<p><b>Statement of Privacy</b></p>
<p>${WTVRegister.getServiceOperator()} may collect information that identifies your WebTV client device.
Types of data that may be collected, overseen by ${WTVRegister.getServiceOperator(true)}, or logged to disk are:<br><br>
<ul>
<li>- Client SSID</li>
<li>- Chosen Account and IRC Name</li>
<li>- Service URLs accessed, including data submitted during requests</li>
<li>- HTTP and HTTPS URLs accessed, including data submitted during requests</li>
<li>- Any other information you voluntarely submit to the ${minisrv_config.config.service_name} service</li>
</ul>
<table></table>
<p><a name="use"><b>1. <u>Use of the ${minisrv_config.config.service_name} service</u></b></a>
<P><B>2.1 Personal and Non-Commercial Use.</B> The ${minisrv_config.config.service_name} service is offered solely for your personal and non-commercial use.
Any commercial use of the ${minisrv_config.config.service_name} service, or the resale of any of its services or content, is expressly prohibited.
You agree to use all of the ${minisrv_config.config.service_name} service to post, send and receive messages and material that are appropriate.
These services are public so any communications you post or transmit are not private and can be printed and used by others.</P>

<P><B>1.2 Unlawful or Prohibited Use.</B> As a condition of your use of the
${minisrv_config.config.service_name} service, you warrant that you will not use the ${minisrv_config.config.service_name} service for any purpose
that is unlawful or prohibited by this Agreement. You agree to abide by all
applicable local, state, national and international laws and regulations in
your use of the ${minisrv_config.config.service_name} service. You are solely responsible for all acts or
omissions that occur under your Account, including the content of your transmissions through the ${minisrv_config.config.service_name} service. You may not modify,
copy, distribute, transmit, display, perform, reproduce, publish, license,
create derivative works from, transfer, or sell any information, software or
services obtained from or through ${minisrv_config.config.service_name}.</P>

<P><B>1.3 Restrictions on General Use.</B> You agree that when using the ${minisrv_config.config.service_name} service, you will not:
<ul>
<li type=disc> - Use the ${minisrv_config.config.service_name} service or any communication service in connection with surveys, contests, sweepstakes, lotteries, games of chance, pyramid schemes, chain letters, junk email, spamming or any duplicative or unsolicited messages to parties with whom you have no prior relationship (commercial or otherwise).
<li type=disc> - Defame, abuse, harass, stalk, threaten or otherwise violate the legal rights of others, such as, but not limited to, the rights of privacy and publicity.
<li type=disc> - Publish, post, upload, transmit, distribute or disseminate any inappropriate, profane, defamatory, infringing, obscene, indecent or unlawful topic, name, material, file or information.
<li type=disc> - Advertise or offer to sell or buy any goods or services for any non-personal purpose.
<li type=disc> - Download any file or other material posted by another user of a service that you know, or reasonably should know, cannot be legally distributed in such manner.
<li type=disc> - Falsify or delete any author attributions, legal or other proper notices or proprietary designations or labels of the origin or source of software or other material contained in a file that is transmitted or uploaded.
<li type=disc> - Send unsolicited e-mail or instant messages through third-party mail servers to relay your message or hide the origin of your message or any other message to others.
<li type=disc> - Use your e-mail account in the text of unsolicited email messages or Web sites as an address to which others can respond.
<li type=disc> - Mass-post, cross-post, or post off-topic messages to any newsgroup or bulletin board service.
<li type=disc> - Use simultaneous, unattended, or continuous connections to the ${minisrv_config.config.service_name} service with your account.
<li type=disc> - Harvest or otherwise collect information about others, including e-mail addresses, without their consent.
<li type=disc> - Create a false identity for the purpose of misleading others as to the identity of the sender or the origin of a message.
<li type=disc> - Use, download, or otherwise copy, or provide (whether or not for a fee) to a person or entity that is not a ${minisrv_config.config.service_name} service user any directory of ${minisrv_config.config.service_name} service users, or any other user or usage information.
<li type=disc> - Transmit or upload any file that contains software or other material protected by intellectual property laws, rights of privacy or publicity, or any other applicable law unless you own or control the rights thereto, have the legal right to do so, or have received all necessary consents.
<li type=disc> - Transmit or upload any file that contains viruses, Trojan horses, worms, time bombs, cancelbots, corrupted files, malicious scripts, or any other harmful or deleterious software or programs that may damage the operation of any computer network or other property.
<li type=disc> - Interfere with or disrupt networks connected to the ${minisrv_config.config.service_name} service or violate the regulations, policies, or procedures of such networks.
<li type=disc> - Use the ${minisrv_config.config.service_name} service in any manner that could damage, disable, overburden, or impair the ${minisrv_config.config.service_name} service (or the network(s) connected to the ${minisrv_config.config.service_name} service).
<li type=disc> - Attempt to gain or gain unauthorized access to any part of the ${minisrv_config.config.service_name} service, other accounts, Internet units, computer systems or networks connected to the ${minisrv_config.config.service_name} service, through hacking, password mining or by any other means.
<li type=disc> - Violate any applicable laws or regulations including, without limitation, laws regarding the transmission of technical data, software or hardware exported from the United States and/or Canada.
<li type=disc> - Interfere with another member's use and enjoyment of the ${minisrv_config.config.service_name} service or another individual's or entity's use and enjoyment of similar services.
<li type=disc> - View, intercept, or attempt to intercept e-mail or other private communication not intended for you.
<li type=disc> - Violate any posted guidelines or codes relating to the use of the ${minisrv_config.config.service_name} service or a particular service.
</ul>
<P>Without limiting any of ${WTVRegister.getServiceOperator(true)}'s rights to terminate your Account as described elsewhere in this Agreement, ${WTVRegister.getServiceOperator(true)}
may immediately terminate your Account at any time without notice for violation of any of the foregoing rules, as it determines in their sole discretion.

<p>Always use caution when giving out any personal information about yourself or your children. ${WTVRegister.getServiceOperator()} does not control or endorse the content,
 messages or information found in any service or advertising content on ${minisrv_config.config.service_name} service, therefore, ${WTVRegister.getServiceOperator(true)}
 specifically disclaims any liability with regard to the services or advertising content and any actions resulting from your participation in any service or
 offers from advertising content providers. Managers and hosts of such services and advertising content are not authorized ${minisrv_config.config.service_name}
 service spokespersons, and their views do not necessarily reflect those of ${WTVRegister.getServiceOperator()}.</P>

<P><B>1.4 Right to Monitor and Disclose.</B> ${WTVRegister.getServiceOperator()} has no obligation to monitor any member's use of the
 ${minisrv_config.config.service_name} service or retain the content of any user session. However, ${WTVRegister.getServiceOperator(true)} reserves the right at all times
 and without notice to delete any content, remove any materials, monitor, review, retain and/or disclose any content or other information in ${WTVRegister.getServiceOperator(true)}'s
 possession, however obtained, about or related to you and your use of the ${minisrv_config.config.service_name} service. ${WTVRegister.getServiceOperator()} reserves the
 right at all times to disclose any information that ${WTVRegister.getServiceOperator(true)} deems necessary to satisfy any applicable law, regulation, legal process or
 governmental request, or to edit, refuse to post or to remove any information or materials, in whole or in part, in ${WTVRegister.getServiceOperator(true)}'s sole discretion.

<P><B>1.5 Links to Other Websites.</B> THE LINKS INCLUDED WITHIN THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE AND/OR ITS RELATED WEB SITES
 MAY LET YOU LEAVE THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE AND VISIT NON-RELATED SITES ("LINKED SITES"). THE LINKED SITES ARE NOT UNDER THE CONTROL OF ${WTVRegister.getServiceOperator().toUpperCase()}
 AND ${WTVRegister.getServiceOperator().toUpperCase()} IS NOT RESPONSIBLE FOR THE CONTENTS OF ANY LINKED SITE, INCLUDING ANY LINK CONTAINED IN A LINKED SITE,
 OR ANY CHANGES OR UPDATES TO A LINKED SITE. ${WTVRegister.getServiceOperator().toUpperCase()} IS NOT RESPONSIBLE FOR WEBCASTING OR ANY OTHER FORM OF TRANSMISSION RECEIVED
 FROM ANY LINKED SITE, NOR IS ${WTVRegister.getServiceOperator().toUpperCase()} RESPONSIBLE IF THE LINKED SITE IS NOT WORKING PROPERLY. ${WTVRegister.getServiceOperator().toUpperCase()}
 PROVIDES THESE LINKS TO YOU ONLY AS A CONVENIENCE, AND THE INCLUSION OF ANY LINK DOES NOT IMPLY ENDORSEMENT BY ${WTVRegister.getServiceOperator().toUpperCase()}
 OF THE LINKED SITE OR ANY ASSOCIATION WITH THE LINKED SITE'S OPERATORS, NOR DOES IT CREATE AN OBLIGATION ON THE PART OF ${WTVRegister.getServiceOperator().toUpperCase()}
 TO MAINTAIN OR PRESERVE SUCH LINK.</P>

<P><B>1.6 Dealings with Third Parties.</B>
 You are subject to all the terms specified by the Linked Sites you visit. If another party reports that you have violated its terms of service agreement,
 ${WTVRegister.getServiceOperator(true)} may treat your violation as a violation of this Agreement. Any dealings with third parties (including advertisers)
 included within the ${minisrv_config.config.service_name} service or participation in promotions,
 including the delivery of and the payment for goods and services, and any other terms, conditions, warranties or representations associated with such dealings or promotions,
 are solely between you and the advertiser or other third party. ${WTVRegister.getServiceOperator()} will not be responsible or liable for any aspect of any such dealings or promotions,
 nor will ${WTVRegister.getServiceOperator(true)} be responsible for any purchases or charges incurred by you or any Secondary User through use of the
 ${minisrv_config.config.service_name} service.</P>

<P><B>1.7 Copyrighted Materials, Software and Intellectual Property.</B>
 You agree to hold ${WTVRegister.getServiceOperator(true)} harmless for any improper use of copyrighted materials accessed through the ${minisrv_config.config.service_name}
 service by you. ${WTVRegister.getServiceOperator()} bears no responsibility for, and you agree to assume all risks regarding, the alteration, falsification, misrepresentation,
 reproduction, or distribution of copyrighted materials without the proper permission of the copyright owner. Furthermore, you agree and acknowledge that ${WTVRegister.getServiceOperator(true)},
 its partners and its suppliers retain title to and ownership of all software and intellectual property that is part of the ${minisrv_config.config.service_name} service.
 You will not acquire any right, title or interest in the same except for the limited rights expressly granted to you in this Agreement.</P>

<P><B>1.8 Posting to ${minisrv_config.config.service_name} service.</B> ${WTVRegister.getServiceOperator()} does not claim ownership of the materials, feedback and suggestions
 you provide to ${WTVRegister.getServiceOperator(true)} or post, upload, input, or submit to ${WTVRegister.getServiceOperator(true)} operated Web Site or its associated services ("Submission").
 However, by posting, uploading, inputting, providing, or submitting your Submission, you grant ${WTVRegister.getServiceOperator(true)} and its affiliates permission to use
 your Submission in connection with the operation of their Internet businesses including, without limitation, the rights to: </P>
<P>
&nbsp;&nbsp;&nbsp a. use, copy, distribute, transmit, publicly display, publicly perform, reproduce, edit, translate, reformat, create derivative works from, transfer, or sell your Submission;
<br>
&nbsp;&nbsp;&nbsp b. sublicense to third parties the unrestricted right to exercise any of the foregoing rights granted with respect to your Submission.
<P>
The foregoing grants shall include the right to exploit any proprietary rights in your Submission, including but not limited to rights under copyright,
 trademark, service mark or patent laws under any relevant jurisdiction. No compensation will be paid with respect to the use of your Submission.
 ${WTVRegister.getServiceOperator()} is under no obligation to post or use any Submission you may provide and may remove any Submission at any time, in
 ${WTVRegister.getServiceOperator(true)}'s sole discretion. By posting, uploading, inputting, providing, or submitting your Submission, you warrant and represent
 that you own or otherwise control all of the rights to your Submission, as described in this section including, without limitation, all the legal rights
 necessary for you to provide, post, upload, input, or submit the Submission. This section is inapplicable to any personally identifiable information that
 you provide in connection with your registration for the ${minisrv_config.config.service_name} service. For terms and conditions governing use of such information,
please refer to the ${minisrv_config.config.service_name} Service Statement of Privacy at the bottom of this document. This privacy statement is controlling and
overrides any conflicting language contained in these Terms of Service concerning use of such information.
<P>&nbsp;</P>
<p><a name="termination"><b>2. <u>Termination of Service</u></b></a>
<P><B>2.1 Termination.</B> You may terminate your Account at any time, with or without cause, by visiting your Account Settings within the ${minisrv_config.config.service_name} service.
 ${WTVRegister.getServiceOperator()}, at their sole discretion, may also delete your Account upon request. Termination via the service shall be effective immediately, while terimation via
 manual contact may take longer. For guaranteed termination, you should use the option provided within the ${minisrv_config.config.service_name} service.

<P><B>2.2 User Information Unavailable After Termination.</B> Upon termination,
the registration and user information for you will no longer be available to you from ${WTVRegister.getServiceOperator()}.
This includes e-mail, address book information and other stored user preferences on the ${minisrv_config.config.service_name} service. If you wish to retain such information,
you must make your own copies prior to the termination of your Account. Upon termination, all stored data is immediately destroyed, and unrecoverable.
 In the event that ${WTVRegister.getServiceOperator()} retains backups, restoration MAY be possible, but should not be expected.
 If your Account is terminated for abuse, your Internet unit will be designated as "suspended" and will not be cleared for re-registration with the
 ${minisrv_config.config.service_name} service for a period of one year or longer, in the sole discretion of ${WTVRegister.getServiceOperator()}.
 ${minisrv_config.config.service_name} service will not be able to retrieve or forward to you any e-mail from your account in any format.</P>
<P>&nbsp;</P>
<p><a name="service"><b>3. <u>Service Operation and Equipment</u></b></a>
<P><B>3.1 Provision and Use of Equipment.</B> The ${minisrv_config.config.service_name} service may only be accessed with an authorized Internet unit.
 Only products labeled with a ${minisrv_config.config.service_name}, or WebTV&reg; product logo or trademark may be used to access the ${minisrv_config.config.service_name}
 service. You agree that in the event of any malfunction of your Internet unit, you will repair it to the best of your ability. If the unit is problematic, and cannot be repaired,
 you agree to NOT continue to use the malfunctioning device with the ${minisrv_config.config.service_name} service.</P>
<P><B>3.2 Account Limitations and Transfers</B> The ${minisrv_config.config.service_name} service can only associate your account with ONE Internet receiver at a time. In the event
 that the Internet receiver associated to your account is no longer suitable for use on the ${minisrv_config.config.service_name} service, you will need to either (i) create a new
account; or (ii) contact ${WTVRegister.getServiceOperator(true)} and ask to transfer your account to your new Internet receiver. Please be aware that in order to transfer your account,
 ${WTVRegister.getServiceOperator(true)} will need to know both the SSID (Silicon Serial Identifier) of the old Internet receiver, and the new Interner reciever. ${WTVRegister.getServiceOperator()} may
 also require additional verification from you to prove that the account belongs to you.
<P><B>3.3 Limited Storage Space.</B> The amount of storage space per user on the ${minisrv_config.config.service_name} service is limited. Some messages may not be
 processed due to space constraints or outbound message limitations. You agree that ${WTVRegister.getServiceOperator()} is not responsible or liable for any deletion or
 failure to store messages or other information. You agree to delete old messages from the ${minisrv_config.config.service_name} service in order to make room in
 your mailboxes for new messages. From time to time, ${WTVRegister.getServiceOperator()} may delete old messages from your mailbox that are older than a certain date
 or that exceed certain storage limitations.</P>

<P><B>3.4 Right to Suspend the ${minisrv_config.config.service_name}service.</B> ${WTVRegister.getServiceOperator()} may, in its sole discretion and without prior notice:
 (i) restrict or limit access to the ${minisrv_config.config.service_name} service; or (ii) terminate an account or user sessions at any time.
 The above described actions are not ${WTVRegister.getServiceOperator()}'s exclusive remedies, and, notwithstanding any action taken or failure thereof, ${WTVRegister.getServiceOperator()}
 may take any other legal or technical action it deems appropriate. Users who violate ${WTVRegister.getServiceOperator()}'s systems or network security may also incur
 criminal and/or civil liability.</P>
<P><B>3.5 Updates to the ${minisrv_config.config.service_name} service.</B> ${WTVRegister.getServiceOperator()} has the right to update or modify the ${minisrv_config.config.service_name}
 service from time to time without notice, including, but not limited to, access procedures, menu structures, commands, documentation, features, functionality
 and services offered. Updates will be offered at no cost.

<P><B>3.6 Complaints About ${WTVRegister.getServiceOperator()} Users.</B> All complaints regarding any ${minisrv_config.config.service_name} service user must
be sent directly to <b>${WTVRegister.getServiceOperator()}</b> along with a copy of any e-mail, posting or other proof of offensive conduct in violation of this Agreement.</P>

<P>&nbsp;</P>
<p><a name="disclaimer"><b>4. <u>Disclaimer, Warranties and Indemnification</u></b></a>
<P><B>4.1 Disclaimer and Warranties.</B> You specifically agree that ${WTVRegister.getServiceOperator()}
shall not be responsible for unauthorized access to or alteration of your
transmissions or data, any material or data sent or received or not sent or
received, or any transactions entered into through or using the ${minisrv_config.config.service_name} service.
You specifically agree that ${WTVRegister.getServiceOperator()} is not responsible or liable for any act
or omission of any third party including but not limited to any threatening,
defamatory, obscene, offensive or illegal content or conduct of any other
party or any infringement of another's rights, including intellectual property
rights. You specifically agree that ${WTVRegister.getServiceOperator()} is not responsible for any
content sent using and/or included in the ${minisrv_config.config.service_name} service by you or any third
party. YOUR USE OF THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE AND ALL ${WTVRegister.getServiceOperator().toUpperCase()} SOFTWARE AND SERVICES
IS AT YOUR OWN RISK. ${WTVRegister.getServiceOperator().toUpperCase()}, ITS RESELLERS, DISTRIBUTORS AND/OR SUPPLIERS
MAKE NO REPRESENTATIONS ABOUT THE SUITABILITY, RELIABILITY, USABILITY,
AVAILABILITY, TIMELINESS, LACK OF VIRUSES OR OTHER HARMFUL COMPONENTS AND
ACCURACY OF THE INFORMATION, SOFTWARE, PRODUCTS, SERVICES AND RELATED GRAPHICS
CONTAINED WITHIN THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE FOR ANY PURPOSE. ALL SUCH INFORMATION,
SOFTWARE, PRODUCTS, SERVICES AND RELATED GRAPHICS ARE PROVIDED "AS IS" WITHOUT
WARRANTY OF ANY KIND. THE INFORMATION, SOFTWARE, PRODUCTS, AND SERVICES INCLUDED IN OR AVAILABLE
THROUGH THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE MAY INCLUDE INACCURACIES OR TYPOGRAPHICAL ERRORS.
ADVICE RECEIVED VIA THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE SHOULD NOT BE RELIED UPON FOR PERSONAL,
MEDICAL, LEGAL OR FINANCIAL DECISIONS AND YOU SHOULD CONSULT AN APPROPRIATE
PROFESSIONAL FOR SPECIFIC ADVICE TAILORED TO YOUR SITUATION. ${WTVRegister.getServiceOperator().toUpperCase()},
ITS RESELLERS, DISTRIBUTORS AND/OR SUPPLIERS DO NOT WARRANT THAT ACCESS TO
OR USE OF THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE, THAT MEMBERS
WILL BE ABLE TO ACCESS THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE AT ANY TIME OR IN ANY GEOGRAPHIC AREA,
OR THAT THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE OR ${WTVRegister.getServiceOperator().toUpperCase()} SOFTWARE OR SERVICES WILL MEET ANY
PARTICULAR CRITERIA OF PERFORMANCE OR QUALITY. ${WTVRegister.getServiceOperator().toUpperCase()}, ITS RESELLERS,
DISTRIBUTORS AND/OR SUPPLIERS HEREBY DISCLAIM ALL WARRANTIES AND CONDITIONS
WITH REGARD TO THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE AND ALL RELATED SOFTWARE, INFORMATION,
PRODUCTS, SERVICES AND GRAPHICS, INCLUDING ALL IMPLIED WARRANTIES AND
CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, WORKMANLIKE
EFFORT, TITLE, AND NON-INFRINGEMENT. IN NO EVENT SHALL ${WTVRegister.getServiceOperator().toUpperCase()}, ITS
RESELLERS, DISTRIBUTORS AND/OR SUPPLIERS BE LIABLE FOR ANY DIRECT, INDIRECT,
PUNITIVE, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, OR ANY DAMAGES
WHATSOEVER, INCLUDING, WITHOUT LIMITATION, DAMAGES FOR LOSS OF USE, DATA, OR
PROFITS, ARISING OUT OF OR IN ANY WAY CONNECTED WITH THE USE OR PERFORMANCE
OF THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE, ${WTVRegister.getServiceOperator().toUpperCase()} SOFTWARE OR RELATED WEB SITES, ANY DELAY OR
INABILITY TO USE THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE, ANY ${WTVRegister.getServiceOperator().toUpperCase()} SOFTWARE, OR RELATED WEB
SITES, THE PROVISION OF OR FAILURE TO PROVIDE SERVICES, LOST, DAMAGED, OR
DESTROYED E-MAIL OR THE FAILURE TO DELIVER ANY E-MAIL, OR FOR ANY INFORMATION,
SOFTWARE, PRODUCTS, SERVICES AND RELATED GRAPHICS OBTAINED THROUGH THE ${minisrv_config.config.service_name.toUpperCase()}
SERVICE, OR OTHERWISE ARISING OUT OF THE USE OF THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE, WHETHER
BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY OR OTHERWISE, EVEN IF
${WTVRegister.getServiceOperator().toUpperCase()} OR ANY OF ITS SUPPLIERS HAS BEEN ADVISED OF THE POSSIBILITY OF
DAMAGES.
${WTVRegister.getServiceOperator().toUpperCase()}'S LIABILITY TO YOU FOR BREACH OF THIS AGREEMENT IS LIMITED TO THE
AMOUNT ACTUALLY PAID BY YOU TO ${WTVRegister.getServiceOperator().toUpperCase()} FOR ACCESS TO AND USE OF THE ${minisrv_config.config.service_name.toUpperCase()}
SERVICE. YOU HEREBY RELEASE ${WTVRegister.getServiceOperator().toUpperCase()} FROM ANY AND ALL OBLIGATIONS, LIABILITIES,
AND CLAIMS IN EXCESS OF THIS LIMITATION. BECAUSE SOME STATES/JURISDICTIONS
DO NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY FOR CONSEQUENTIAL OR
INCIDENTAL DAMAGES, THE ABOVE LIMITATION MAY NOT APPLY TO YOU. IF YOU ARE
DISSATISFIED WITH ANY PORTION OF THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE, OR WITH ANY OF THESE
TERMS OF USE, YOUR SOLE AND EXCLUSIVE REMEDY IS TO NOT REGISTER FOR A ${minisrv_config.config.service_name.toUpperCase()}
SERVICE ACCOUNT OR TO TERMINATE YOUR ${minisrv_config.config.service_name.toUpperCase()} SERVICE ACCOUNT. ${WTVRegister.getServiceOperator().toUpperCase()} MAY,
IN ITS SOLE DISCRETION AND WITHOUT PRIOR NOTICE (I) RESTRICT OR LIMIT ACCESS
TO THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE; (II) TERMINATE A USER ACCOUNT OR USER SESSIONS AT ANY
TIME; OR (III) DISCONTINUE OR MODIFY ANY OR ALL ASPECTS OF THE ${minisrv_config.config.service_name.toUpperCase()} SERVICE OR ITS SERVICES.
</P>
<P><B>4.2 Indemnification</B> You agree to indemnify, defend, and hold ${WTVRegister.getServiceOperator()}, its parents, subsidiaries, members, affiliates,
 officers, directors, employees, and agents harmless from any claim, demand, liability, expense, or damage, including costs and reasonable
 attorneys' fees, asserted by any third party relating to or arising out of your use of or conduct on the ${minisrv_config.config.service_name} service.
${WTVRegister.getServiceOperator()} will notify you within a reasonable period of time of any claim for which ${WTVRegister.getServiceOperator()} seeks indemnification and will
afford you the opportunity to participate in the defense of such claim, provided that your participation will not be conducted in a manner prejudicial
to ${WTVRegister.getServiceOperator()}'s interests, as reasonably determined by ${WTVRegister.getServiceOperator()}.</P>
<P>&nbsp;</P>
<p><a name="notices"><b>5. <u>Notices; Consent.</u></b></a>
<p>Notices given by ${WTVRegister.getServiceOperator()} to you may be given by e-mail via the ${minisrv_config.config.service_name} service,
 by a general posting on the ${minisrv_config.config.service_name} service, or by conventional mail. Notices given by you to ${minisrv_config.config.service_name} must
 be given by e-mail via the ${minisrv_config.config.service_name} service or directly from ${WTVRegister.getServiceOperator()} via other forms of communication.
<p>
<P>&nbsp;</P>
<p><a name="spam"><b>6. <u>No "Spam"; Damages.</u></b></a>
<p>${WTVRegister.getServiceOperator()} may immediately terminate any account that it determines, in its sole discretion, is transmitting or is otherwise connected
 with any "spam" or other unsolicited bulk e-mail. In addition, because damages are often difficult to quantify, if actual damages cannot be reasonably calculated,
 you agree to pay ${WTVRegister.getServiceOperator()} liquidated damages of five dollars (U.S. $5.00) for each piece of "spam" or unsolicited bulk e-mail transmitted from or otherwise connected
 with your account. Otherwise you agree to pay ${WTVRegister.getServiceOperator()}'s actual damages, to the extent such actual damages can be reasonably calculated.
 You agree that ${WTVRegister.getServiceOperator()} may seek legal ramifications for such damages.</p>
<P>&nbsp;</P>
<p><a name="provisions"><b>7. <u>Additional Provisions</u></b></a>
<P><B>7.1 Disclosure of Information.</B> ${WTVRegister.getServiceOperator()} reserves the right to disclose any information necessary without your prior permission,
 if ${WTVRegister.getServiceOperator()} has a good faith belief that such action is necessary to (1) comply with governmental,
 court and law enforcement requests or requirements; (2) protect and defend the rights or property of ${WTVRegister.getServiceOperator()},
 its affiliated companies, the ${minisrv_config.config.service_name} service or the users of the ${minisrv_config.config.service_name} service, whether or not required
 to do so by law; (3) enforce this Agreement; (4) protect the personal safety of users of the ${minisrv_config.config.service_name} service or the public.
 ${WTVRegister.getServiceOperator()}'s performance of this Agreement is subject to existing laws and legal process, and nothing contained in this Agreement
 is in derogation of ${WTVRegister.getServiceOperator()}'s right to comply with governmental, court and law enforcement requests or requirements relating
 to your use of the ${minisrv_config.config.service_name} service. You are advised that certain unauthorized uses of the ${minisrv_config.config.service_name}
 service, including but not limited to admissions of illegal behavior or the posting of pornography, may result in additional fees, fines or charges,
 the suspension or termination of your Account, and/or civil or criminal liability. In addition, ${WTVRegister.getServiceOperator()} may, in its discretion, report incidents
 of child pornography to the Cyber Tip Line at the National Center for Missing and Exploited Children.</P>

<P><B>7.2 Entire Agreement.</B> This Agreement, including the Statement of Privacy, and any other notices and disclaimers posted on the service,
 constitutes the entire agreement between ${WTVRegister.getServiceOperator()} and you, the Primary User, with respect to your use of the ${minisrv_config.config.service_name}
 service and your Account (excluding the use of any software which may be subject to an end-user license agreement), and it supersedes all prior or
 contemporaneous communications and proposals, whether oral or written, between ${WTVRegister.getServiceOperator()} and you with respect to the ${minisrv_config.config.service_name} service.</P>

<P><B>7.3 Enforcement.</B> In the event that any portion of this Agreement is held to be unenforceable, the unenforceable portion shall be construed
 in accordance with applicable law to reflect the original intentions of the parties and the remaining provisions shall remain in full force and effect.
 ${WTVRegister.getServiceOperator()}'s failure to insist upon or enforce strict performance of any provision of this Agreement does not mean that ${WTVRegister.getServiceOperator()}
 has waived any provision or right in this Agreement.</P>
<P><b>7.4 Assignment.</b> ${WTVRegister.getServiceOperator()} may assign this Agreement, in whole or in part, at any time with or without notice to you. You may not assign or transfer this Agreement.
<P><b>7.5 Miscellaneous.</b> A printed copy of this Agreement and of any notice given by ${WTVRegister.getServiceOperator()} in electronic form shall be
 admissible in judicial or administrative proceedings based upon or relating to this Agreement to the same extent and subject to the same conditions
 as other business documents and records originally generated and maintained in printed form. You and ${WTVRegister.getServiceOperator()} agree that any cause of
 action arising out of or related to the ${minisrv_config.config.service_name} service must commence within one (1) year after the cause of action arises;
 otherwise, such cause of action is permanently barred. The section titles in the Agreement are provided solely for the convenience of the parties and have
 no legal or contractual significance.</P>
<P><b>7.6 Agreement Drawn in English.</B> The parties to this Agreement confirm that it is their wish that this Agreement, as well as all other documents
 relating to it, have been and shall be drawn up in the English language only. Any conflict between this Agreement and any translations provided
 by ${WTVRegister.getServiceOperator()} or its partners or providers in other languages, either orally or in printed form, shall be resolved in favor of this English language version.
 Les parties aux présentes confirment leur volonté que cette convention, de même que tous les documents qui s'y rattachent, soient rédigés en langue anglaise.</P>
<P><B>8. <u>Copyright and Trademark Notices</u></B>
<P><B>8.1 Copyright and Trademark.</B> All contents of the ${minisrv_config.config.service_name} service are: Copyright © ${new Date().getFullYear()} ${WTVRegister.getServiceOperator()}
 and/or its suppliers, All rights reserved.
<P><B>8.2 Notices and Procedure for Making Claims of Copyright Infringement.</B>
Pursuant to Title 17, United States Code, Section 512(c)(2), notifications of claimed copyright infringement should be sent to the ${WTVRegister.getServiceOperator()}.
<P>END of TERMS of SERVICE</P>
<p>
<p>
<CENTER><B>${minisrv_config.config.service_name} Service Privacy Statement</B></font><br>
<B><font size="-1">(Release date August 7, 2021)</B></CENTER></font>
<P>&nbsp;</P>
<p>The ${minisrv_config.config.service_name} service is a limited Internet access service for television brought to you by ${WTVRegister.getServiceOperator(true)}. ${WTVRegister.getServiceOperator()}
 is committed to maintaining the privacy and accuracy of your personal information.
<p>This Privacy Statement describes how ${WTVRegister.getServiceOperator(true)} treats information received about you when you use the ${minisrv_config.config.service_name} service. Please read it carefully.
<p><b>Collection and Use of Personal Information</b><br>
When you register as a primary user of the ${minisrv_config.config.service_name} service, ${WTVRegister.getServiceOperator()} will request information that personally identifies
 you or allows us to contact you, such as your name, and e-mail address. Personal information is also collected at other times by specifically requesting it from you,
 such as when you request other promotional material, when we ask you to complete customer surveys, and in other circumstances when you interact with the
 ${minisrv_config.config.service_name}service or our employees, agents and contractors working to provide the ${minisrv_config.config.service_name} service to you.
 Information collected by ${WTVRegister.getServiceOperator(true)} may be combined with information obtained from other ${WTVRegister.getServiceOperator(true)} operations and other services.
<p>${WTVRegister.getServiceOperator()} collects, stores and processes personal information for the following purposes:
<ul>
<li>To service accounts, process or collect payments, and otherwise operate and deliver the ${minisrv_config.config.service_name} service.
<li>To assist you with questions about use of the ${minisrv_config.config.service_name} service.
<li>To conduct both business and individual surveys to be used for the purposes set forth in the survey.
<li>To alert you to new products, product upgrades, special offers and other information related to the ${minisrv_config.config.service_name} service.
<li>To inform you of other products or services available from ${WTVRegister.getServiceOperator(true)} and its affiliates and external business partners.
</ul>
<p><b>With Whom Personal Information Is Shared</b><br>
Personal information collected by ${WTVRegister.getServiceOperator(true)} may be combined with information obtained from other ${WTVRegister.getServiceOperator(true)} operations and other services.
 This combined information may be shared with business units within ${WTVRegister.getServiceOperator(true)}. ${WTVRegister.getServiceOperator()} may also share your personal information with
 third parties for their use to provide services to ${WTVRegister.getServiceOperator(true)} in the operation and delivery of the ${minisrv_config.config.service_name} service,
 such as to process or collect payments, service ${minisrv_config.config.service_name} service accounts, or provide the products and services associated with the
 ${minisrv_config.config.service_name} service. Third parties to whom we provide this personal information are prohibited from using it except to provide these services.
 These third parties are also required to maintain the confidentiality of the personal information we provide to them.
<p>Occasionally we may send you information or special offerings about products or services from ${WTVRegister.getServiceOperator(true)} or third parties that we believe may be of
 interest to you.
<p>Except under the circumstances described above, or as described below under "Other Situations in which Personal and/or Operating Information May Be Disclosed,"
 ${WTVRegister.getServiceOperator(true)} does not disclose your personal information to third parties. <p><b>How To Access and Modify Personal Information</b><br>
<p><b>How We Help Protect Children's Privacy</b><br>
${WTVRegister.getServiceOperator()} currently does not knowingly collect or use personal information from children under 13 on the ${minisrv_config.config.service_name} service.
 Should a child on the ${minisrv_config.config.service_name} service whom we know to be under 13 send personal information to us,
 we will only use that information to respond directly to that child or seek parental consent. Parents are ultimately responsible for the use of the
 ${minisrv_config.config.service_name} service by their children. We encourage parents to talk to their children about safe and responsible use of their
 personal information while using the Internet. <p><b>Collection and Use of Operating Information</b><br>
 ${WTVRegister.getServiceOperator()} collects and stores operating information, which consists of the electronic instructions and data communicated from your
 set-top device to the ${minisrv_config.config.service_name} service. Operating information includes the websites you have chosen to access.
 The ${minisrv_config.config.service_name} service may also contain electronic images known as "Web beacons" that allow us to count users who
 have visited a particular area of the service. On certain ${minisrv_config.config.service_name} service receivers (known as "Plus" receivers),
 you may select television channels using the ${minisrv_config.config.service_name}service or with the remote control for the ${minisrv_config.config.service_name} receiver.
 ${WTVRegister.getServiceOperator()} does not collect any information regarding these television channels selected by you however.
<p>We use operating information to effectively operate the ${minisrv_config.config.service_name} service and enhance your experience on the Internet.
 For example, we store the websites that you have selected to be part of your list of favorite sites so that you can access them quickly.
 We also store the most recent websites that you have visited to make browsing more efficient. Operating information may also be used to customize
 the advertising, content, information and services that are delivered to your set top device.
<p>${WTVRegister.getServiceOperator()} also uses operating information to understand how our system is being used and navigated.
 For example, we process aggregated operating information concerning the number of visits to certain websites, the use of certain features,
 such as "Mail" and "Search," and the number of set-top devices that are exposed to certain advertisements placed by advertisers on our system.
 In general, the collection and use of operating information allows us to analyze the use of the ${minisrv_config.config.service_name} service to continue to develop and provide
 improved advertising, content, features and services that are of the most interest to our subscribers. <p><b>With Whom Operating Information Is Shared</b><br>
We may provide operating information to third parties for their use to provide services to us in the operation and delivery of the ${minisrv_config.config.service_name} service.
 These third parties are prohibited from using this operating information except to provide these services. They are also required to maintain the confidentiality
 of the operating information we provide to them. <p>We may also provide operating information in anonymous form to third parties. This anonymous information contains
 no personal information about any of our individual subscribers. Except under the circumstances described above, or as described below under
 "Other Situations in which Personal and/or Operating Information May Be Disclosed," we will only share operating information with third parties if the operating
 information is in anonymous form. <p><b>How We Help Protect Personal and Operating Information</b><br>
We take reasonable steps to help protect personal and operating information. We use technologies and processes such as encryption, access control procedures,
 network firewalls and physical security. These technologies and methods limit unauthorized access to information collected through the ${minisrv_config.config.service_name}
 service. <p>Furthermore, most operating information is maintained in databases that are separate from those containing personal information, and only 
 ${WTVRegister.getServiceOperator()} or authorized agents carrying out permitted business functions are permitted to access this information.

<p>You should explain this privacy statement to others that use the ${minisrv_config.config.service_name} service through your account, including other members of your household.
If you allow others to access the ${minisrv_config.config.service_name} service through your account, including other members of your household,
 please understand that you are responsible for the actions of those individuals. <p><b>Other Situations in which Personal and/or Operating Information May Be Disclosed</b><br>
 ${WTVRegister.getServiceOperator()} may disclose personal or operating information if required to do so by law or in the good-faith belief that such action is necessary or
 appropriate to (a) conform to the edicts of the law or comply with legal process served on ${WTVRegister.getServiceOperator(true)}, (b) protect and defend the rights or property
 of ${WTVRegister.getServiceOperator(true)}, the ${minisrv_config.config.service_name} service, or users of the ${minisrv_config.config.service_name} service, whether
 or not required to do so by law, or (c) protect the personal safety of users of the ${minisrv_config.config.service_name} service or the public.
 ${WTVRegister.getServiceOperator()} reserves the right to contact and disclose personal information to appropriate authorities at its discretion when it appears that
 activities that are illegal or violate the ${minisrv_config.config.service_name} Service User Agreement are taking place within the context of a user account.
<p><b>Cookies</b><br>
Cookies are pieces of information that a website creates for record-keeping purposes. The ${minisrv_config.config.service_name} service does not create or use cookies,
but the websites you access, might create cookies and transfer these cookies to ${minisrv_config.config.service_name} service servers. Cookies can make your experience
 on the Internet more useful by storing information about your preferences and choices on a particular site. This enables websites to customize delivery of their website
 content and advertisements. ${WTVRegister.getServiceOperator()} does not control the use of cookies by other website operators, website page builders or their advertisers.
 <p><b>Changes to the ${minisrv_config.config.service_name} Service Privacy Statement</b><br>
${WTVRegister.getServiceOperator()} may make changes to this statement from time to time. We will post changes to our privacy statement here, so be sure to check back periodically.
We will also notify you of significant changes by e-mail or in other ways. <p>
</BODY>
</HTML>
</tr>
<tr>
<td valign= bottom height=15 colspan=7>
<hr size=5 valign=bottom>
</tr>
<tr>
<td border=2 absheight=50 colspan=5 bgcolor="#171726" valign=top align=left style="margin-right:50">
<td bgcolor="#171726" height=50 abswidth=100 valign=top align=right style="padding-right:13">
</form>
<td abswidth=13 absheight=50 bgcolor="#171726">
</tr>
</table>
</body>
</html>
`