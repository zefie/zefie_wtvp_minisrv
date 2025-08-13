const minisrv_service_file = true;

try {
    let relativePath = request_headers.request_url;
    if (relativePath.indexOf('?') > -1) relativePath = relativePath.split('?')[0];
    while (relativePath.endsWith('/')) relativePath = relativePath.slice(0, relativePath.length - 1);

    const dir = service_name + relativePath;
    const num_per_page = 25;
    const dirs = ['<tr><td>Directory</td><td><a href="' + relativePath + '/..">Parent Directory</a></td><td>-</td><td>-</td></tr > '];
    const files = [];
    let vault_found = false;
    

    // Iterate through each service vault to find the first occurrence
    for (let i = 0; i < service_vaults.length; i++) {        
        const vaultPath = path.join(service_vaults[i], dir || '');
        if (!fs.existsSync(vaultPath)) continue;

        try {
            vault_found = true;
            const entries = fs.readdirSync(vaultPath);

            entries.forEach(entry => {
                if (entry === path.basename(__filename)) return;

                // Check if entry exists in all service vaults
                let found = false;
                let checkPath = "";
                for (let j = 0; j < service_vaults.length; j++) {
                    checkPath = path.join(service_vaults[j], dir || '', entry);
                    if (fs.existsSync(checkPath)) {
                        found = true;
                        break;
                    }
                }

                // Skip if not found in all
                if (!found) return;

                const fullPath = checkPath;
                const stats = fs.statSync(fullPath);
                const isDir = stats.isDirectory();
                const mimeType = (isDir) ? "Directory" : wtvmime.getContentType(fullPath)[1];
                let readableSize = '-';
                // Get file size with unit
                if (!isDir) {
                    const fileSize = stats.size;
                    const units = ['Bytes', 'KB', 'MB', 'GB'];
                    const unitSize = Math.floor(Math.log(fileSize) / Math.log(1024));
                    readableSize = (fileSize / Math.pow(1024, unitSize)).toFixed(2) + units[unitSize];
                }
                // Get last modified time
                const mtime = stats.mtime.toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                // Check if modified recently
                const currentTime = Date.now();
                const tenSecondsAgo = currentTime - 10000;
                const isModifiedRecently = stats.mtime.getTime() > tenSecondsAgo;

                // Create clickable link
                const link = isDir ?
                    `<a href="${relativePath}/${entry}">${entry}</a>` :
                    `<a href="${relativePath}/${path.basename(fullPath)}">${entry}</a>`;

                // Generate icon and timestamp display
                const icon = mimeType;
                const timestampDisplay = isModifiedRecently ?
                    `<span style="color: #666;">${mtime}</span>` :
                    `${mtime}`;

                if (isDir) dirs.push(`<tr><td>${icon}</td><td>${(isModifiedRecently) ? entry : link}</td><td>${readableSize}</td><td>${timestampDisplay}</td></tr>`);
                else files.push(`<tr><td>${icon}</td><td>${(isModifiedRecently) ? entry : link}</td><td>${readableSize}</td><td>${timestampDisplay}</td></tr>`);
            });
        } catch (err) {
            console.error('Error:', err);
            continue;
        }
    }

    if (!vault_found) {
        const errpage = wtvshared.doErrorPage(404);
        headers = errpage[0];
        data = errpage[1];
    } else {

        // Pagination logic
        const totalFiles = files.length;
        const max_pages = Math.ceil(totalFiles / num_per_page);
        let current_page = 1; // Default to first page
        if (totalFiles > 0) {
            current_page = parseInt(request_headers.query.page || 1);
            if (current_page < 1) current_page = 1;
            if (current_page > max_pages) current_page = max_pages;
        }

        const start_index = (current_page - 1) * num_per_page;
        const end_index = current_page * num_per_page;
        const merged_files = dirs.concat(files);
        const paginatedFiles = merged_files.slice(start_index, end_index);

        const paginationHtml = `
    <div style="text-align: center; margin-top: 20px;">
        <form action="" method="get" style="display: inline;">
        <input type=button onclick="window.location.href='?page=1'" ${(current_page === 1) ? 'disabled' : ''} value="First"></input>
        <input type=button onclick="window.location.href='?page=${Math.max(current_page - 1, 1)}'" ${(current_page === 1) ? 'disabled' : ''} value="Previous"></input>
        <span style="margin: 0 10px;">Page ${current_page} of ${max_pages}</span>
        <input type=button onclick="window.location.href='?page=${Math.min(current_page + 1, max_pages)}'" ${(current_page === max_pages) ? 'disabled' : ''} value="Next"></input>
        <input type=button onclick="window.location.href='?page=${max_pages}'" ${(current_page === max_pages) ? 'disabled' : ''} value="Last"></input>
        </form>
    </div>`;

        data = `
<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
    <title>Directory Index</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #121212;
            color: #ffffff;
        }
        a, a:hover, a:active {
            color: #1e90ff;
            text-decoration: none;
        }
        a:visited { color: #8a2be2; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #333; }
        tr:hover { background-color: #2a2a2a; }
    </style>
</head>
<body bgcolor="#121212" text="#ffffff" link="#1e90ff" vlink="#8a2be2">
    <h2>Directory Index of ${relativePath}</h2>
    <hr>
    <table>
        <tr><th>Type</th><th>Name</th><th>Size</th><th>Last Modified</th></tr>
        ${paginatedFiles.join('')}
    </table>
    ${paginationHtml}
    <script>
        function toggleTheme() { ... }
    </script>
</body>
</html>`;

        headers = `200 OK\nContent-Type: text/html`;

    }
} catch (err) {
    console.error('Error:', err);
    const errpage = wtvshared.doErrorPage(404);
    headers = errpage[0];
    data = errpage[1];
}
