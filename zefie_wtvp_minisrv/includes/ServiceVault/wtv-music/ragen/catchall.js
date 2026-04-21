const minisrv_service_file = true;

if (!minisrv_config.services['pnm']) {
    throw ("ERROR: pnm service not defined in config!");
}


const pnmVaults = [];
// Check pnm service vault for .ra and .rm files
if (minisrv_config.config.ServiceVaults) {
    Object.keys(minisrv_config.config.ServiceVaults).forEach(function (k) {
        const service_vault = wtvshared.getAbsolutePath(minisrv_config.config.ServiceVaults[k]);
        pnmVaults.push(service_vault + "/pnm");
    })
} else {
    throw ("ERROR: No Service Vaults defined!");
}

const url_path = request_headers.request_url.split('?')[0];
const pathParts = url_path.split('/').filter(p => p);
const serviceName = pathParts.length > 0 ? pathParts[0] : '';
const remainingPath = '/' + pathParts.slice(1).join('/');
const filename = remainingPath.split('/').pop().replace('.ram', '');
const directory = remainingPath.endsWith('/') || !filename ? remainingPath.replace(/\/$/, '') : remainingPath.substring(0, remainingPath.lastIndexOf('/'));


let fileFound = false;
const extensions = ['.ra', '.rm'];
let resolvedPath = null;

// Check if request is for a directory listing (no filename or ends with /)
if (!filename || (request_headers.request_url.endsWith('/') && minisrv_config.services['pnm'].allow_indexing !== false)) {
    const listingDir = filename ? directory : directory || '/';
    const allFiles = [];
    
    for (const pnmVault of pnmVaults) {
        const targetDir = path.join(pnmVault, listingDir);
        console.log("DEBUG: Listing files in", targetDir);
        if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
            const files = fs.readdirSync(targetDir);
            files.forEach(file => {
                const fullPath = path.join(targetDir, file);
                if (fs.statSync(fullPath).isFile() && (file.endsWith('.ra') || file.endsWith('.rm'))) {
                    const baseFileName = file.substring(0, file.lastIndexOf('.'));
                    allFiles.push(baseFileName + '.ram');
                }
            });
        }
    }
    
    if (allFiles.length > 0) {
        headers = `200 OK
Content-type: text/html`;
        data = `<html><body><h1>RealAudio Files on this minisrv</h1><ul>${allFiles.map(f => `<li><a href="${f}">${f}</a></li>`).join('')}</ul></body></html>`;
    } else {
        headers = `404 Not Found
Content-type: text/html`;
        data = `<html><body><h1>No files found</h1></body></html>`;
    }
} else {
    // Original file search logic
    for (const pnmVault of pnmVaults) {
        for (const ext of extensions) {
            const filePath = path.join(pnmVault, filename + ext);
            console.log("DEBUG: Checking for file", filePath);
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
        headers = `200 OK
Content-type: audio/x-pn-realaudio`
        data = `pnm://${minisrv_config.config.service_ip}:${minisrv_config.services['pnm'].port}/${filename + path.extname(resolvedPath)}`;
    }
}