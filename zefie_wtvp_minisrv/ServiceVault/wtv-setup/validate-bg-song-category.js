
if (request_headers.query && ssid_sessions[socket.ssid]) {
    if (request_headers.request_url.indexOf('?') >= 0) {
        var category = (request_headers.query.category) ? request_headers.query.category : null;
        var WTVBGMusic = require("./WTVBGMusic.js");
        var wtvbgm = new WTVBGMusic(minisrv_config, ssid_sessions[socket.ssid])
        var music_obj = wtvbgm.getMusicObj();

        if (category == null) music_obj.enableCategories = [];
        else {
            var cat = wtvbgm.categories[parseInt(category) - 1];
            if (cat) {
                var toRemove = [];
                Object.keys(music_obj.enableSongs).forEach(function (k) {
                    if (wtvbgm.getSongCategory(parseInt(music_obj.enableSongs[k])) == parseInt(category)) toRemove.push(k);
                });
                toRemove.forEach(function (v) {
                    music_obj.enableSongs.splice(v,1,"");
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
                    if (k == "enableSong")     music_obj['enableSongs'].push(unescape(qraw[i].split("=")[1].replace(/\+/g, "%20")));
                }
            }
        }
    }
    music_obj.enableCategories = [...new Set(music_obj.enableCategories)];
    music_obj.enableSongs = [...new Set(music_obj.enableSongs)];
    ssid_sessions[socket.ssid].setSessionData("wtv-bgmusic", Object.assign({}, music_obj));
    ssid_sessions[socket.ssid].saveSessionData();
    headers = `200 OK
Content-type: text/html
wtv-backgroundmusic-load-playlist: wtv-setup:/get-playlist`;
} else {
    var outdata = doErrorPage();
    headers = outdata[0];
    data = outdata[1];
}