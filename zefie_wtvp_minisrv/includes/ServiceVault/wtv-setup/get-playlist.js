const minisrv_service_file = true;

const wtvbgm = new WTVBGMusic(minisrv_config, session_data);
const music_obj = wtvbgm.getMusicObj();

headers = `
200 OK
Connection: Keep-Alive
wtv-backgroundmusic-clear: no_zits
`;

Object.keys(music_obj.enableSongs).forEach(function (k) {
    if (!wtvbgm.isCategoryEnabled(wtvbgm.getSongCategory(music_obj.enableSongs[k]))) return;
    const song = wtvbgm.getSong(music_obj.enableSongs[k]);
    if (song) headers += "wtv-backgroundmusic-add: "+song['url']+"\n";
});

data = '';
