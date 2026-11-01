const minisrv_service_file = true;

function getSortedLogFiles(ssid) {
    const logDir = path.join(__dirname, './ServiceLogPost');
    const files = fs.readdirSync(logDir)
        .filter(file => file.endsWith('.txt') && file.includes(ssid))
        .map(file => ({
            name: file,
            time: fs.statSync(path.join(logDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)
        .map(file => file.name);

    return files;
}

// Example usage
const ssid = socket.ssid; // Replace with the actual SSID
const sortedFiles = getSortedLogFiles(ssid);
console.log(sortedFiles);
const notImplementedAlert = new clientShowAlert({
	'image': minisrv_config.config.service_logo,
	'message': "This feature is not available.",
	'buttonlabel1': "Okay",
	'buttonaction1': "client:donothing",
	'noback': true,
}).getURL();

headers = `300 OK
Content-type: text/html
Location: ${notImplementedAlert}
`

