const minisrv_service_file = true;

if (!minisrv_config.services['mms']) {
    throw ("ERROR: mms service not defined in config!");
}


const mmsVaults = [];
// Check mms service vault for .wma, .wmv, and .asf files
if (minisrv_config.config.ServiceVaults) {
    Object.keys(minisrv_config.config.ServiceVaults).forEach(function (k) {
        const service_vault = wtvshared.getAbsolutePath(minisrv_config.config.ServiceVaults[k]);
        mmsVaults.push(service_vault + "/mms");
    })
} else {
    throw ("ERROR: No Service Vaults defined!");
}

// Detect subdirectory structure of this catchall.js file and strip it from requests
// e.g., if at /ServiceVault/wtv-music/asxgen/catchall.js, extract "ragen"
// if at /ServiceVault/wtv-music/asx/gen/catchall.js, extract "asx/gen"
let subDirPath = '';
const currentDir = path.dirname(__filename);
const serviceVaultIdx = currentDir.indexOf('ServiceVault');
if (serviceVaultIdx !== -1) {
    const afterVault = currentDir.substring(serviceVaultIdx + 12); // 12 = length of 'ServiceVault'
    const parts = afterVault.split(path.sep).filter(p => p);
    if (parts.length > 1) {
        // parts[0] is the service name (e.g., 'wtv-music'), parts[1+] are the subdirs
        const subdirs = parts.slice(1);
        subDirPath = '/' + subdirs.join('/');
    }
}

const url_path = request_headers.request_url.split('?')[0];
const pathParts = url_path.split('/').filter(p => p);
const serviceName = pathParts.length > 0 ? pathParts[0] : '';
let remainingPath = '/' + pathParts.slice(1).join('/');
const hadTrailingSlash = request_headers.request_url.endsWith('/');

let strippedSubDir = ''; // Store what was stripped for link rebuilding
// Strip the subdirectory structure from the request path
if (subDirPath) {
    if (remainingPath.startsWith(subDirPath + '/')) {
        // Has something after the subdirectory, e.g., /ragen/classicrom
        strippedSubDir = subDirPath;
        remainingPath = remainingPath.substring(subDirPath.length);
    } else if (remainingPath === subDirPath || remainingPath === subDirPath + '/') {
        // Just the subdirectory itself, e.g., /ragen or /ragen/
        strippedSubDir = subDirPath;
        remainingPath = '/';
    }
}


// Restore trailing slash if original URL had one
if (hadTrailingSlash && !remainingPath.endsWith('/')) {
    remainingPath += '/';
}

const filename = remainingPath.endsWith('/') ? '' : remainingPath.split('/').pop().replace('.asx', '');
const directory = remainingPath.endsWith('/') ? remainingPath.replace(/\/$/, '') : remainingPath.substring(0, remainingPath.lastIndexOf('/'));

let fileFound = false;
const extensions = ['.asf', '.wma', '.wmv'];
let resolvedPath = null;

// Check if request is for a directory listing (no filename or ends with /)
if (!filename || (request_headers.request_url.endsWith('/') && minisrv_config.services['mms'].allow_indexing !== false)) {
    const listingDir = filename ? directory : directory || '/';
    const allFiles = [];
    
    for (const mmsVault of mmsVaults) {
        const targetDir = path.join(mmsVault, listingDir);
        if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
            const files = fs.readdirSync(targetDir);
            files.forEach(file => {
                const fullPath = path.join(targetDir, file);
                if (fs.statSync(fullPath).isFile() && (file.endsWith('.wma') || file.endsWith('.wmv') || file.endsWith('.asf'))) {
                    const baseFileName = file.substring(0, file.lastIndexOf('.'));
                    allFiles.push(baseFileName + '.asx');
                } else if (fs.statSync(fullPath).isDirectory()) {
                    allFiles.push(file + '/');
                }
            });
        }
    }
    
    if (allFiles.length > 0) {
        headers = `200 OK
Content-type: text/html`;
        data = `<html>
<body bgcolor="#110e1f" text="#44a1cc" link="36d5ff" vlink="36d5ff" vspace=0>
<display nosave nosend>
<title>Windows Media on this Service</title>
<sidebar width=110>
<table cellspacing=0 cellpadding=0 BGCOLOR="30364D">
<tr>
<td colspan=3 abswidth=104 absheight=4>
<td rowspan=99 width=6 absheight=580 valign=top align=left>
<img src="/ROMCache/Shadow.gif" width=6 height=580>
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
<img src="/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor="4D5573">
<img src="/ROMCache/Spacer.gif" width=1 height=1>
</table>

<tr><td absheight=26 align=right colspan=3>
<table href="${(request_headers.query.debugUDP) ? "?" : "?debugUDP=1"}" width="100%" cellspacing="0" cellpadding="0">
<tr><td>
<table cellspacing="0" cellpadding="0">
<tr><td><shadow><font size="-1" color="E7CE4A">
&nbsp;${(request_headers.query.debugUDP) ? "Use TCP" : "Debug UDP"}
</table>
</td></tr></table>


<tr><td absheight=5 colspan=3>
<table cellspacing=0 cellpadding=0>
<tr><td abswidth=104 absheight=2 valign=middle align=center bgcolor="1C1E28">
<img src="/ROMCache/Spacer.gif" width=1 height=1>
<tr><td abswidth=104 absheight=1 valign=top align=left>
<tr><td abswidth=104 absheight=2 valign=top align=left bgcolor="4D5573">
<img src="/ROMCache/Spacer.gif" width=1 height=1>
</table>

<tr><td absheight=433 align=right colspan=3>
<img src="/ROMCache/winmed.gif" width=96 height=80>&nbsp;
<tr><td absheight=150>
</table>
</sidebar>
<br>
<br>
<h1>Windows Media on this Service</h1><ul>${(directory === "") ? "" : `<li><a href="../">../</a></li>\n`}${allFiles.map(f => `<li><a href="${(directory === "") ? f : `${strippedSubDir}${directory}/${f}`}${(request_headers.query.debugUDP) ? "?debugUDP=1" : ""}">${f}</a></li>`).join("\n")}</ul></body></html>`;
    } else {
        headers = `404 Not Found
Content-type: text/html`;
        data = `<html><body><h1>No files found</h1></body></html>`;
    }
} else {
    // Original file search logic
    for (const mmsVault of mmsVaults) {
        for (const ext of extensions) {
            const filePath = path.join(mmsVault, directory, filename + ext);
            if (fs.existsSync(filePath)) {
                fileFound = true;
                resolvedPath = filePath;
                break;
            }
        }
        if (fileFound) break;
    }

    if (!fileFound) {
        headers = `404 Not Found
Content-type: text/html`;
    } else {
        const filePath = path.join(directory || '/', filename + path.extname(resolvedPath));
        let proto = "mmst://";
        if (request_headers.query.debugUDP) {
            proto = "mms://"
        }
        const mmsURL = `${proto}${minisrv_config.config.service_ip}:${minisrv_config.services['mms'].port}${filePath.replace(/\\/g, '/')}`;
		const title = (request_headers.query['wtv-title']) ? request_headers.query['wtv-title'] : minisrv_config.config.service_name+" media";
        headers = `200 OK
Content-type: video/x-ms-asf`
        data = `<ASX version="3.0">
  <TITLE>${title} media</TITLE>
  <ENTRY>
    <TITLE>${title}</TITLE>
    <REF HREF="${mmsURL}" />
  </ENTRY>
</ASX>`;		
    }
}