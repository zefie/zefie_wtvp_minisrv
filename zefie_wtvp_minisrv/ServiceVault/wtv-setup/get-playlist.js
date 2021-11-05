var WTVBGMusic = require("./WTVBGMusic.js");
var wtvbgm = new WTVBGMusic(minisrv_config, ssid_sessions[socket.ssid])
var music_obj = wtvbgm.getMusicObj();

headers = `
200 OK
Connection: Keep-Alive
wtv-backgroundmusic-clear: no_zits
`;

Object.keys(music_obj.enableSongs).forEach(function (k) {
    if (!wtvbgm.isCategoryEnabled(wtvbgm.getSongCategory(music_obj.enableSongs[k]))) return;
    var song = wtvbgm.getSong(music_obj.enableSongs[k]);
    if (song) headers += "wtv-backgroundmusic-add: "+song['url']+"\n";
});

data = '';
