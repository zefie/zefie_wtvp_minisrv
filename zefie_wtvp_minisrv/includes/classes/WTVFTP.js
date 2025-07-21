class WTVFTP {
    wtvshared = null;
    wtvmime = null;
    minisrv_config = null;
    sendToClient = null;
    request_headers = null;
    ftp = null;
    url = null;

    constructor(minisrv_config, sendToClient) {
        this.minisrv_config = minisrv_config;
        this.sendToClient = sendToClient;        
        const WTVShared = require("./WTVShared.js")['WTVShared'];
        const WTVMime = require("./WTVMime.js");
        this.url = require('url');
        this.ftp = require('ftp');
        this.wtvshared = new WTVShared();
        this.wtvmime = new WTVMime();
    }

    handleFTPRequest(socket, request_headers) {
        // Handle the FTP request here
        // Assume request_headers.url contains the FTP URL
        this.request_headers = request_headers;
        const ftpUrl = request_headers.request_url;
        const parsed = this.url.parse(ftpUrl);

        // Extract user, pass, and host
        let user = null;
        let pass = null;
        let host = parsed.hostname;

        if (parsed.auth) {
            const [username, password] = parsed.auth.split(':');
            user = username;
            pass = password || null;
        }

        // Example usage: log the parsed values
        

        // You can now use user, pass, and host as needed
        if (!user && !pass) {
            user = "anonymous";
            pass = "anonymous@eff.org";
        }
        console.log(`User: ${user}, Pass: ${pass}, Host: ${host}`);

        const ftpClient = new this.ftp();
        const port = parsed.port ? parseInt(parsed.port, 10) : 21;
        const path = decodeURIComponent(parsed.pathname || '/');
        let dir = path;
        let filename = null;

        // Determine if path is a file or directory
        if (path && path !== '/') {
            const parts = path.split('/');
            if (parts[parts.length - 1] && !path.endsWith('/')) {
            filename = parts.pop();
            dir = parts.join('/') || '/';
            }
        }

        ftpClient.on('ready', () => {
            if (filename) {
                var totalsize = 0;
            // Change to directory and get file
            ftpClient.cwd(dir, (err) => {
                if (err) {
                this.sendToClient(socket, { 'Status': '500 Failed to change directory', 'Content-Type': 'text/plain' }, 'Failed to change directory');
                ftpClient.end();
                return;
                }
                ftpClient.get(filename, (err, stream) => {
                if (err) {
                    this.sendToClient(socket, { 'Status': '404 File not found', 'Content-Type': 'text/plain' }, 'File not found');
                    ftpClient.end();
                    return;
                }
                const chunks = [];
                stream.on('data', (chunk) => {
                    chunks.push(chunk);
                    totalsize += chunk.length;
                    if (totalsize > 1024 * 1024 * 4) {
                        this.sendToClient(socket, { 'Status': '413 The file chosen contains too much information to be used.', 'Content-Type': 'text/plain' }, 'File too large');
                        ftpClient.end();
                        return;
                    }
                });
                stream.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const mime = this.wtvmime.detectMimeTypeFromBuffer(buffer);
                    this.sendToClient(
                        socket,
                        {
                            'Status': 200,
                            'Content-Type': mime || 'application/octet-stream',
                            'Content-Disposition': `attachment; filename="${filename}"`
                        },
                        buffer
                    );
                    ftpClient.end();
                });
                stream.on('error', () => {
                    this.sendToClient(socket, { 'Status': '500 Error reading file', 'Content-Type': 'text/plain' }, 'Error reading file');
                    ftpClient.end();
                });
                });
            });
            } else {
            // List directory
            ftpClient.list(dir, (err, list) => {
                if (err) {
                this.sendToClient(socket, { 'Status': '500 Failed to list directory', 'Content-Type': 'text/plain' }, 'Failed to list directory');
                ftpClient.end();
                return;
                }
                const html = this.formatDirectoryListing(list);
                this.sendToClient(socket, { 'Status': '200 OK', 'Content-Type': 'text/html' }, html);
                ftpClient.end();
            });
            }
        });

        ftpClient.on('error', (err) => {
            this.sendToClient(socket, { 'Status': '500 FTP connection error', 'Content-Type': 'text/plain' }, 'FTP connection error');
        });

        ftpClient.connect({
            host: host,
            port: port,
            user: user,
            password: pass
        });
    }

    formatDirectoryListing(list) {
        // Format the directory listing as needed
        let html = `<html>
        <head>
            <title>FTP Directory Listing</title>
            <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f4f4f4; }
            </style>
        </head>
        <body>
            <h2>FTP Directory Listing</h2>
            <table>
            <thead>
                <tr>
                <th> </th>
                <th>Type</th>
                <th>Size</th>
                <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(item => {
                const dateStr = item.date
                    ? item.date.toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                      })
                    : '';
                return `
                <tr>
                    <td>${item.type === 'd' ? '<img src="wtv-star:/ROMCache/DirectoryIcon.png" width=16 height=16>' : '<img src="wtv-star:/ROMCache/FileIcon.png" width=16 height=16>'}</td>
                    <td><a href="${this.request_headers.request_url}${item.name}${item.type === 'd' ? '/' : ''}">${item.name}</a></td>
                    <td>${item.size !== undefined ? this.wtvshared.formatBytes(item.size) : ''}</td>
                    <td>${dateStr}</td>
                </tr>
                `;
                }).join('')}
            </tbody>
            </table>
        </body>
        </html>`;
        return html;
    }
}

module.exports = WTVFTP;