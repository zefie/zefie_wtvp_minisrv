const minisrv_service_file = true;

// write posted log data to disk. should be decrypted by this point (if it was encrypted) if the crypto stream didn't break

request_is_async = true;
data = '';
let fullpath = __dirname + "/ServiceLogPost/" + Math.floor(new Date().getTime() / 1000) + "_" + request_headers.query.type;
if (socket.ssid) fullpath += "_" + socket.ssid;
fullpath += ".txt";

fullpath = fullpath.replace(/\\/g, "/");

if (request_headers.post_data) {
    headers = `200 OK
Connection: Keep-Alive
Content-length: 0`;

    let logdata_outstring = '';
    Object.keys(request_headers.query).forEach(function (k) {
        logdata_outstring += k + "=" + request_headers.query[k].toString() + "\r\n";
    });
    logdata_outstring += "\r\n";
    let logdata_outstring_hex = Buffer.from(logdata_outstring, 'utf8').toString('hex');
    logdata_outstring_hex += request_headers.post_data.toString(CryptoJS.enc.Hex);
    if (minisrv_config.services[service_name].write_logs_to_disk) {
        if (minisrv_config.services[service_name].dont_save_chat_logs && request_headers.query.type === 'chat') {
            sendToClient(socket, headers, data);
        } else {
            fs.writeFile(fullpath, logdata_outstring_hex, "Hex", function () {
                if (!minisrv_config.config.debug_flags.quiet) console.log(" * Wrote POST log data from", wtvshared.filterSSID(socket.ssid), "for", socket.id);
                sendToClient(socket, headers, data);
            });
        }
        fs.readdir(__dirname + "/ServiceLogPost/", function (err, files) {
            if (err) {
                if (!minisrv_config.config.debug_flags.quiet) console.error("Error reading log directory:", err);
                return;
            }
            const ssid = socket.ssid ? socket.ssid.toString() : '';
            const count = files.filter(function (file) {
                return ssid && file.includes(ssid);
            }).length;
            if (count > minisrv_config.services[service_name].max_logs_per_ssid) {
                const ssidFiles = files
                    .filter(function (file) {
                        return ssid && file.includes(ssid);
                    })
                    .map(function (file) {
                        return {
                            name: file,
                            time: fs.statSync(__dirname + "/ServiceLogPost/" + file).mtime.getTime()
                        };
                    })
                    .sort(function (a, b) {
                        return a.time - b.time;
                    });

                if (ssidFiles.length > 0) {
                    const oldestFile = ssidFiles[0].name;
                    fs.unlink(__dirname + "/ServiceLogPost/" + oldestFile, function (err) {
                        if (err && !minisrv_config.config.debug_flags.quiet) {
                            console.error("Error deleting oldest log file:", err);
                        }
                    });
                }
            }
        });
    } else {
        sendToClient(socket, headers, data);
    }

} else {
    headers = `200 OK
Connection: Keep-Alive
Content-length: 0`;

    let logdata_outstring = '';
    Object.keys(request_headers.query).forEach(function (k) {
        logdata_outstring += k + "=" + request_headers.query[k].toString() + "\r\n";
    });
    const logdata_outstring_hex = Buffer.from(logdata_outstring, 'utf8').toString('hex');
    if (minisrv_config.services[service_name].write_logs_to_disk) {
        fs.writeFile(fullpath, logdata_outstring_hex, "Hex", function () {
            if (!minisrv_config.config.debug_flags.quiet) console.log(" * Wrote GET log data from", wtvshared.filterSSID(socket.ssid), "for", socket.id);
            sendToClient(socket, headers, data);
        });
    } else {
        sendToClient(socket, headers, data);
    }
}

