// write posted log data to disk. should be decrypted by this point (if it was encrypted) if the crypto stream didn't break

request_is_async = true;
data = '';
var fullpath = __dirname + "/ServiceLogPost/" + Math.floor(new Date().getTime() / 1000) + "_" + request_headers.query.type;
if (socket.ssid) fullpath += "_" + socket.ssid;
fullpath += ".txt";

fullpath = fullpath.replace(/\\/g, "/");

if (request_headers.post_data) {
    headers = `200 OK
Connection: Keep-Alive
Content-length: 0`;

    var logdata_outstring = '';
    Object.keys(request_headers.query).forEach(function (k) {
        logdata_outstring += k + "=" + request_headers.query[k].toString() + "\r\n";
    });
    logdata_outstring += "\r\n";
    var logdata_outstring_hex = Buffer.from(logdata_outstring, 'utf8').toString('hex');
    logdata_outstring_hex += request_headers.post_data.toString(CryptoJS.enc.Hex);
    if (minisrv_config.services[service_name].write_logs_to_disk) {
        fs.writeFile(fullpath, logdata_outstring_hex, "Hex", function () {
            if (!minisrv_config.config.debug_flags.quiet) console.log(" * Wrote POST log data from", wtvshared.filterSSID(socket.ssid), "for", socket.id);
            sendToClient(socket, headers, data);
        });
    } else {
        sendToClient(socket, headers, data);
    }

} else {
    headers = `200 OK
Connection: Keep-Alive
Content-length: 0`;

    var logdata_outstring = '';
    Object.keys(request_headers.query).forEach(function (k) {
        logdata_outstring += k + "=" + request_headers.query[k].toString() + "\r\n";
    });
    var logdata_outstring_hex = Buffer.from(logdata_outstring, 'utf8').toString('hex');
    if (minisrv_config.services[service_name].write_logs_to_disk) {
        fs.writeFile(fullpath, logdata_outstring_hex, "Hex", function () {
            if (!minisrv_config.config.debug_flags.quiet) console.log(" * Wrote GET log data from", wtvshared.filterSSID(socket.ssid), "for", socket.id);
            sendToClient(socket, headers, data);
        });
    } else {
        sendToClient(socket, headers, data);
    }
}

