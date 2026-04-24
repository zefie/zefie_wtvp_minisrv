const net = require('net');

class WTVGopher {
    // Adapted from WebTV Redialed's Gopher support
    constructor(...[minisrv_config, service_name, wtvshared, sendToClient, wtvmime]) {
        this.minisrv_config = minisrv_config;
        this.wtvshared = wtvshared;
        this.wtvmime = wtvmime;
        this.sendToClient = sendToClient;
        this.logGopher = minisrv_config.services[service_name].log_raw_gopher || false;
    }

    looksLikeMenu(gopherData) {
        const lines = gopherData.split(/\r?\n/);

        let checked = 0;
        let menuLines = 0;

        for (const line of lines) {
            if (!line || line === ".") continue;

            checked++;
            let typeOffset = 0;
            let type = " ";
            while ((type === " " || type == "\t") && typeOffset <= 10) {
                type = line[typeOffset];
                typeOffset++;
            }         
            const rest = line.slice(1);

            if (
                rest.includes("\t") &&
                rest.split("\t").length >= 3 &&
                /^[0-9A-Za-z+gIihs]$/.test(type)
            ) {
                menuLines++;
            }

            if (checked >= 5) break;
        }

        return menuLines >= 2 || (lines.length <= 2 && menuLines == 1);
    }

    processGopherData(gopherData) {
        // currently looking at textfile, don't process into HTML
        if (!this.looksLikeMenu(gopherData)) {
            return `<pre>${gopherData}</pre>`;
        }

        // okay, we're not a textfile, now do the menu shit
        let pageTitle = "Gopher Menu"
        const lines = gopherData.split("\r\n");

        let html = "";

        for (const line of lines) {
            if (!line || line === ".") continue;

            const type = line[0];
            const parts = line.slice(1).split("\t");

            const text = parts[0] || "";
            const selector = parts[1];
            const host = parts[2];
            const port = parts[3] || 70;
            var url = `gopher://${host}:${port}${selector}`;

            // determine page title from first line
            const firstline = line[0].slice(1).trim();

            if (line[0] === "i" && firstline.length > 0) {
                pageTitle = line.slice(1).trim();
                html = `<title>${pageTitle}</title><pre>\n`;
            } else if (pageTitle === "Gopher Menu") {
                for (const line of lines) {
                    if (!line || line === ".") continue;

                    let typeOffset = 0;
                    let type = " ";
                    while ((type === " " || type == "\t") && typeOffset <= 10) {
                        type = line[typeOffset];
                        typeOffset++;
                    }
                    const parts = line.slice(1).split("\t");
                    const text = parts[0]?.trim();

                    if (text && text.length > 0) {
                        pageTitle = text;
                        html = `<title>${pageTitle}</title><pre>\n`;
                        break;
                    }
                }
            }
            switch (type) {
                case "i": // informational / "just text"
                    html += `${text}\n`;
                break;

                case "0": // text file
                case "1": // directory
                    html += `<a href="${url}">${text}</a>\n`;
                    break;
                case "3": // error, otherwise just plain text
                    html += `${text}<br>\n`;
                case "h": // HTML link
                    if (selector?.startsWith("URL:")) {
                    const httpUrl = selector.slice(4);
                    html += `<a href="${httpUrl}">${text}</a>\n`;
                    }
                    break;
                
                case "7": // search
                    html += `<form action="${url}" method="get">
<label for="search">${text}</label>
<input type="search" name="q" required>
</form>`;
                    break;
                case "g":
                case "I":
                case "p":
                    url = `gopher://${host}:${port}${selector}?type=${type}`;
                    html += `<a href="${url}">${text}</a>\n`;
                    break;

                default:
                    html += `${text} (unsupported type ${type})\n`;
            }
        }

        html += "</pre>";
        return html;
    }

    async handleGopherRequest(socket, request_headers) {
        if (this.minisrv_config.config.debug_flags.show_headers) {
            console.log("Gopher: Client Request on socket ID",
                socket.id,
                await this.wtvshared.decodePostData(
                    this.wtvshared.filterRequestLog(this.wtvshared.filterSSID(request_headers))
                ));
        }

        // crlf for sending at the end of a request
        const crlf = "0D0A"
        const crlf_bytes = Buffer.from(crlf, 'hex');
        // chunk stuff for gopher-to-html conversion
        let chunks = [];

        var request_data = new Array();
        request_data.method = request_headers.request.split(' ')[0];

        const rawUrl = decodeURIComponent(request_headers.request.split(' ')[1]).replaceAll('\\', '/');
        const [pathPart, queryPart] = rawUrl.split('?');
        var request_url_split = pathPart.split('/');

        let queryParams = {};
        if (queryPart) {
            for (const kv of queryPart.split('&')) {
                const [k, v] = kv.split('=');
                queryParams[k] = decodeURIComponent(v || "");
            }
        }

        request_data.host = request_url_split[2];
        if (request_data.host.indexOf(':') > 0) {
            request_data.port = request_data.host.split(':')[1];
            request_data.host = request_data.host.split(':')[0];
        } else {
            request_data.port = 70;
        }

        for (var i = 0; i < 3; i++) request_url_split.shift();
        request_data.path = "/" + request_url_split.join('/');
        // vars for determining if a link is an image
        const imageTypes = ["g", "I", "p"];
        let requestType = null;
        if (queryParams.type && imageTypes.includes(queryParams.type)) {
            requestType = queryParams.type;
        }
        const isImageDownload = !!requestType;

        const client = new net.Socket();
        client.setTimeout(3000);

        // make the initial request to the server
        client.connect(request_data.port, request_data.host, () => {
            let gopherRequest = "";

            // if user requested path
            if (request_data.path.length >= 2) {
                gopherRequest = request_data.path;
            }

            // if user requested type 7 (search)
            if (queryParams.q) {
                const query = queryParams.q.replace(/\+/g, ' ');
                gopherRequest += "\t" + query;
            }

            client.write(gopherRequest + crlf_bytes);
        });

        // "holy shit we got data guys"
        client.on("data", chunk => {
            chunks.push(chunk);
        });

        // datastream end, time to process it
        client.on("end", () => {
            const gopherData = Buffer.concat(chunks).toString("utf-8");
            if (this.logGopher) {
                console.log("Gopher: Data received from server for socket ID", socket.id);
                console.log("Gopher: Data length:", Buffer.concat(chunks).length);
                console.log("isImageDownload:", isImageDownload);
                console.log("Gopher Data:\n", gopherData);
            }

            // are we downloading an image?
            if (isImageDownload) {
                const imageData = Buffer.concat(chunks);
                const mimetype = this.wtvmime.detectMimeTypeFromBuffer(imageData);

                const headers = {
                    "Status": "200 OK",
                    "Content-Type": mimetype
                }

                this.sendToClient(socket, headers, imageData);
                return;
            } else {
                // convert gophermap to html
                const htmlData = this.processGopherData(gopherData);
                // since gopher doesn't exactly have "headers" and by this point we're probably already fine to just say it's okay, we're just sending back the bare minimum to prevent screaming
                const headers = {
                    "Status": "200 OK",
                    "Content-Type": "text/html"
                }
                this.sendToClient(socket, headers, htmlData);
            }
        });

        // blew up?
        // todo: figure out what error actually looks like and if appropriate to send to client (or just "Connection failed" or smth)
        client.on('error', (err) => {
            console.error('Gopher error: ' + err);
            let friendlyErr = err.toString();
            if (friendlyErr.includes('ETIMEDOUT')) {
                friendlyErr = "Connection timed out";
            } else if (friendlyErr.includes('ECONNREFUSED')) {
                friendlyErr = "Connection refused";
            } else if (friendlyErr.includes('ENOTFOUND')) {
                friendlyErr = "Host not found";
            }
            this.sendToClient(socket, {"Status": "400 Gopher Error: " + friendlyErr}, friendlyErr);
        });
    }
}

module.exports = WTVGopher;