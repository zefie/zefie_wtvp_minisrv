var content_dir = service_dir + '/content/';
var diskmap_dir = content_dir + '/diskmaps/';

if (initial_headers['post_data']) {
    console.log(initial_headers['post_data'].toString('CryptoJS.enc.Latin1'))
}

if (query['diskmap']) {
    if (fs.lstatSync(diskmap_dir + query['diskmap'] + ".txt")) {
        var diskmap_data = fs.readFileSync(diskmap_dir + query['diskmap'] + ".txt").toString();
        // try to parse diskmap and get an accurate timestamp for webtv versioning
        // check all files in the diskmap and return the timestamp of the most recently modified

        data = '';
        var latest_file_ts = 0;
        diskmap_data.split("\n").forEach(function (v) {
            if (v.indexOf(" sync ") != -1) {
                v = v.trim();
                var vcon = v.substring(v.indexOf("content/"));
                vcon = vcon.replace("content/", content_dir)
                var vconstat = Math.floor(fs.lstatSync(vcon).mtimeMs / 1000);
                if (vconstat > latest_file_ts) {
                    latest_file_ts = vconstat
                }
                // todo read client post and only give whats needed
                // instead of all that is available
                // vconstat has the mtime of each file, we need to parse the post_data
                data += v + "\n";
            } else {
                data += v + "\n";
            }
        });
        //data = diskmap_data.replace("!VERS!", latest_file_ts);
    }
}

headers = `200 OK
Content-type: text/download-list`

