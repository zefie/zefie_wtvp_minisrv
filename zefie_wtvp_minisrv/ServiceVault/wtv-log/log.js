// write posted log data to disk. should be decrypted by this point (if it was encrypted) if the crypto stream didn't break

if (request_headers['post_data']) {
    var fullpath = __dirname + "/ServiceLogPost/" + Math.floor(new Date().getTime() / 1000) + "_" + query['type'];
    if (socket_session_data[socket.id].ssid) fullpath += "_" + socket_session_data[socket.id].ssid;
    
    fullpath = fullpath.replace(/\\/g, "/");
    fs.writeFileSync(fullpath, request_headers['post_data'].toString(CryptoJS.enc.Hex), "Hex");
    console.log("Wrote POST log data from", socket_session_data[socket.id].ssid, "to", fullpath, "on", socket.id);
}

headers = `200 OK
Connection: Keep-Alive
Content-length: 0`;

data = '';


