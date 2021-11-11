var minisrv_service_file = true;

if (request_headers.query && session_data) {

    if (request_headers.request_url.indexOf('?') >= 0) {
        var category = (request_headers.query.category) ? request_headers.query.category : null;
        var music_obj = wtvbgm.getMusicObj();
        var old_music_obj = Object.assign({}, music_obj);

        if (category == null) music_obj.enableCategories = [];
        else {
            var cat = wtvbgm.categories[parseInt(category) - 1];
            if (cat) {
                var toRemove = [];
                Object.keys(music_obj.enableSongs).forEach(function (k) {
                    if (wtvbgm.getSongCategory(parseInt(music_obj.enableSongs[k])) == parseInt(category)) toRemove.push(k);
                });
                toRemove.forEach(function (v) {
                    music_obj.enableSongs.splice(v, 1, "");
                });
                var newEnableSongs = music_obj.enableSongs.filter(value => Object.keys(value).length !== 0);
                music_obj.enableSongs = newEnableSongs;
            }
        }
        var qraw = request_headers.request_url.split('?')[1];
        if (qraw.length > 0) {
            qraw = qraw.split("&");
            for (let i = 0; i < qraw.length; i++) {
                var qraw_split = qraw[i].split("=");
                if (qraw_split.length == 2) {
                    var k = qraw_split[0];
                    if (k == "enableCategory") music_obj['enableCategories'].push(unescape(qraw[i].split("=")[1].replace(/\+/g, "%20")));
                    if (k == "enableSong") music_obj['enableSongs'].push(unescape(qraw[i].split("=")[1].replace(/\+/g, "%20")));
                }
            }
        }
    }
    music_obj.enableCategories = [...new Set(music_obj.enableCategories.filter(value => Object.keys(value).length !== 0))];
    music_obj.enableSongs = [...new Set(music_obj.enableSongs.filter(value => Object.keys(value).length !== 0))];
    music_obj = Object.assign({}, music_obj)
    if ((Object.keys(music_obj.enableCategories).length != Object.keys(old_music_obj.enableCategories).length) || (Object.keys(music_obj.enableSongs).length != Object.keys(old_music_obj.enableSongs).length)) {
        // something changed
        session_data.setSessionData("wtv-bgmusic", music_obj);
        session_data.saveSessionData();
        headers = `200 OK
Content-type: text/html
wtv-backgroundmusic-load-playlist: wtv-setup:/get-playlist`;
    } else {
        // nothing changed
        headers = `200 OK
Content-type: text/html`;
    }
} else {
    var outdata = doErrorPage();
    headers = outdata[0];
    data = outdata[1];
}