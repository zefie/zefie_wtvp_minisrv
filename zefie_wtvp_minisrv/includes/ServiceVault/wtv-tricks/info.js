var minisrv_service_file = true;

let client_caps = null;

if (socket.ssid != null) {
    if (session_data.capabilities) {
        client_caps = session_data.capabilities.get();
    }
}

headers = `200 OK
Content-Type: text/html`;

const versionMap = [
    { build: 0, vers: `1.0` },
    { build: 200, vers: `1.1` },
    { build: 300, vers: `1.2` },
    { build: 1000, vers: `1.3` },
    { build: 1090, vers: `1.3Retail` },
    { build: 1127, vers: `1.4Retail` },
    { build: 1150, vers: `1.4` },
    { build: 2000, vers: `2.0` },
    { build: 2100, vers: `2.0J` },
    { build: 2150, vers: `2.0.1J` },
    { build: 2200, vers: `2.0.1` },
    { build: 2300, vers: `2.0.3` },
    { build: 2500, vers: `2.0.5` },
    { build: 3000, vers: `2.1` },
    { build: 3065, vers: `2.1.1` },
    { build: 3070, vers: `2.1.5` },
    { build: 3250, vers: `2.1.7` },
    { build: 3450, vers: `Springboard2.2` },
    { build: 3600, vers: `2.0.2J` },
    { build: 3700, vers: `2.2.1J` },
    { build: 3800, vers: `2.2.5` },
    { build: 5000, vers: `2.3` },
    { build: 5200, vers: `Fiji` },
    { build: 5500, vers: `2.3.5` },
    { build: 5700, vers: `2.3.7` },
    { build: 5750, vers: `2.3.8` },
    { build: 5759, vers: `2.3.8-NAND` },
    { build: 6000, vers: `3.0` }, // WNI actually did this, i'm pretty sure they gave up
    { build: 32767, vers: `Private` },
];

function getVersion(givenBuild) {
    return (versionMap.at(versionMap.findIndex(({ build }) => build > givenBuild) - 1).vers);
}

const serviceIP = minisrv_config.config.service_ip;
const zTitle = `WebTV Services, (${minisrv_version_string})`;

const systemVersion = session_data.get("wtv-system-version");
const bootromVersion = session_data.get("wtv-client-bootrom-version");
const SSID = wtvshared.filterSSID(
    session_data.get("wtv-client-serial-number")
);
const romType = session_data.get("wtv-client-rom-type");
const chipVersionStr =
    "0x0" + parseInt(session_data.get("wtv-system-chipversion")).toString(16);
const sysConfigHex =
    "0x" + parseInt(session_data.get("wtv-system-sysconfig")).toString(16);
const capabilitiesTable = new WTVClientCapabilities().capabilities_table;


// halen's sysconfig/chipversion stuff
const soloVersion = (chipVersionStr & 0xf00000) >> 0x14;
const soloFab = (chipVersionStr & 0xf0000) >> 0x10;
const boardType = (sysConfigHex & 0x7000) >> 0xc;
const boardRev = (sysConfigHex & 0xf00) >> 8;
const boardRevB = (sysConfigHex & 0xf0) >> 4;

// determine box ASIC type
switch (chipVersionStr >> 0x18) {
    case 1:
        chip = "FIDO1";
        break;
    case 3:
        chip = `SOLO-${soloVersion}, fab ${soloFab}`;
        break;
    case 4:
        chip = `SOLO2-${soloVersion}, fab ${soloFab}`; // don't know much about this one
        break;
    default:
        chip = "?";
}

// ========================= LC2 SYSCONFIG DECODE START =========================

// determine box video type
if ((sysConfigHex & 8) == 0) video = "NTSC";
else video = "PAL";

// determine box storage type
if ((sysConfigHex & 4) == 0) storage = "disk";
else storage = "flash";

// determine box CPU endianness
if ((sysConfigHex & 0x80000) == 0) endianness = "little";
else endianness = "big";

// determine box CPU type
if ((sysConfigHex & 0x100000) == 0) cpu = 5230;
else cpu = 4640;

// determine box CPU clock multiplier
if ((sysConfigHex & 0x20000) == 0) cpuMult = 3;
else cpuMult = 2;

// determine smartcard 0 support
if ((sysConfigHex & 0x400000) == 0) sc0 = "supported";
else sc0 = "not supported";

//determine smartcard 1 support
if ((sysConfigHex & 0x200000) == 0) sc1 = "supported";
else sc1 = "not supported";

// ========================= FCS SYSCONFIG DECODE START =========================

/*  "I don't even know how it works."
    -Bruce Leak, Thursday, October 12, 1995 1:53:28 AM */

// determine box CPU output bufs
if ((sysConfigHex & 0x2000) == 0) outputBufs = 100;
else outputBufs = 50;

// determine box SGRAM speed
function getSGSpeed() {
    let SGRAMand = sysConfigHex & 0xc00000;
    if (SGRAMand == 0x400000) return 66;
    else if (0x400000 < SGRAMand)
        if (SGRAMand == 0x800000) return 77;
        else if (SGRAMand == 0xc00000) return 83; // potentially incorrect but looks like it should return 83MHz on known existing hardware
        else if (SGRAMand == 0) return 100;
}

// determine box audio chip type
if ((sysConfigHex & 0xc0000) == 0xc0000) audio = "AKM4310/4309";
else audio = "Unknown";

// determine box audio clock source
if ((sysConfigHex & 0x20000) == 0) audioClk = "SPOT";
else audioClk = "External";

// determine box video chip
function getVideoChip() {
    let videoChipAnd = sysConfigHex & 0x600;

    if (videoChipAnd == 0x200) return "Bt851";
    else if (videoChipAnd < 0x201 && videoChipAnd !== 0) return "Unknown";
    else if (videoChipAnd == 0x400) return "Bt852";
    else return "Philips7187/Bt866";
}

// determine box video type
if ((sysConfigHex & 0x800) == 0) videoB = "PAL";
else videoB = "NTSC";

// determine box video clock source
if ((sysConfigHex & 0x10000) == 0) videoClk = "External";
else videoClk = "SPOT";

// determine box board type
switch (sysConfigHex & 0xc) {
    case 8:
        boardTypeB = "Trial";
        break;
    case 0xc:
        boardTypeB = "FCS";
        break;
    default:
        boardTypeB = "Unknown Type";
}

// determine bank 0 type
if (sysConfigHex < 0) bank0Type = "Mask";
else bank0Type = "Flash";

// determine bank 0 mode
if ((sysConfigHex & 0x40000000) == 0) bank0Mode = "Normal";
else bank0Mode = "PageMode";

// determine bank 1 type
if ((sysConfigHex & 0x8000000) == 0) bank1Type = "Flash";
else bank1Type = "Mask";

// determine bank 1 mode
if ((sysConfigHex & 0x40000000) == 0) bank1Mode = "Normal";
else bank1Mode = "PageMode";

data = `<html>
<!--- *=* Copyright 1996, 1997 WebTV Networks, Inc. All rights reserved. --->
<display nosave nosend skipback>
<title>${minisrv_config.config.service_name} Info</title>

<sidebar width=20%>
		<img src="wtv-tricks:/images/About_bg.jpg">
</sidebar>

<body bgcolor="#191919" text="#44cc55" link="36d5ff" vlink="36d5ff" vspace=0>
<br>
<br>
<br>

<h1>${minisrv_config.config.service_name} Info</h1>

<table>
<tr>
		<td height=20>
<tr>
		<td valign=top align=right><shadow>Connected to:</shadow>
		<td width=10>
		<td valign=top>${minisrv_config.config.service_name} Service
<tr>
		<td valign=top align=right><shadow>Host/Port:</shadow>
		<td width=10>
		<td valign=top>${serviceIP}/${minisrv_config.services[service_name].port}
<tr>
		<td valign=top align=right width=150><shadow>Service:</shadow>
		<td width=10>
		<td valign=top>${zTitle}
<tr>
		<td valign=top align=right><shadow>Client:</shadow>
		<td width=10>
		<td valign=top>&vers; (Build ${systemVersion} [${getVersion(systemVersion)}])
<tr>
		<td valign=top align=right><shadow>Boot:</shadow>
		<td width=10>
		<td valign=top>&wtv-bootvers; (Build ${bootromVersion} [${getVersion(bootromVersion)}])
<tr>
		<td height=20)
<tr>
		<td valign=top align=right><shadow>Silicon serial ID:</shadow>
		<td width=10>
		<td valign=top>${SSID}
<tr>
		<td valign=top align=right><shadow>Connected at:</shadow>
		<td width=10>
		<td valign=top>&rate;
<tr>
        <td valign=top align=right><shadow>POP Number:</shadow>
        <td width=10>
        <td valign=top>&phone;
<tr>
		<td valign=top align=right><shadow>Client IP number:</shadow>
		<td width=10>
		<td valign=top>${socket.remoteAddress}
`;
    if (session_data.getSessionData("registered")) {
        data += `<tr>
		<td valign=top align=right><shadow>Subscriber Name:</shadow>
		<td width=10>
		<td valign=top>${session_data.getSessionData("subscriber_name")}
<tr>
		<td valign=top align=right><shadow>Subscriber Username:</shadow>
		<td width=10>
		<td valign=top>${session_data.getSessionData("subscriber_username")}`;
    }

    data += `<tr>
		<td height=20>
<tr>
		<td valign=top align=right><shadow>ROM type:</shadow>
		<td width=10>
		<td valign=top>${romType}
<tr>
		<td valign=top align=right><shadow>Modem f/w (when available):</shadow>
		<td width=10>
		<td valign=top>&modem;
<tr>
		<td valign=top align=right><shadow>Chip version:</shadow>
		<td width=10>
		<td valign=top>${chipVersionStr} (${chip})`;
    if (sysConfigHex !== "0xNaN")
        data += `
<tr>
		<td valign=top align=right><shadow>SysConfig:</shadow>
		<td width=10>
		<td valign=top>${sysConfigHex}`;
    data += `
</table>

<table>
<tr>
		<td height=20>
<tr>
		<td valign=top align=right width=175><shadow>Client capabilities:</shadow>
		<td width=10>
		<td valign=top>
</table>
<table>
`;

    // start loop

    Object.keys(capabilitiesTable).forEach(function (k) {
        data += `<tr>
		<td valign=top align=right>${capabilitiesTable[k][1]}
		<td width=10>
		`;
        if (client_caps[capabilitiesTable[k][0]]) data += "<td valign=top>True\n";
        else data += "<td valign=top>False\n";
    });

    // end loop

    data += `
</table>
<pre>`
    // TODO: finish FCS decode
    if (romType == "bf0app" && sysConfigHex !== "0xNaN") {
        data += `CPU Clk Mult = 2x Bus Clk, CPU output bufs @ ${outputBufs}%
ROM Bank 0:  ${bank0Type}, ${bank0Mode}, 120ns/60ns
ROM Bank 1:  ${bank1Type}, ${bank1Mode}, 150ns/75ns
SGRAM:  ${getSGSpeed()}MHz
Audio:  ${audio}, ${audioClk} Clk
Video:  ${getVideoChip()}, ${videoB}, ${videoClk} Clk
Board:  ${boardTypeB}, Rev = ${0xf - (boardRevB)} (${boardRevB})`;
    } else if (sysConfigHex !== "0xNaN") {
        data += `Video = ${video}, storage = ${storage}
CPU type = ${cpu}, ${endianness}-endian
CPU clock mult = ${cpuMult}x
SmartCard 0 ${sc0}, SmartCard 1 ${sc1}
Board type = ${boardType}, board rev = ${boardRev}`;
    }
    data += `
</pre>
<br>
</body></html>`;