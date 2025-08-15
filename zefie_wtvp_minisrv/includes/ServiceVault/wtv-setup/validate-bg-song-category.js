const minisrv_service_file = true;

const wtvbgm = new WTVBGMusic(minisrv_config, session_data);

if (request_headers.query && session_data) {
    let music_obj = wtvbgm.getMusicObj();
    const old_music_obj = Object.assign({}, music_obj);
    if (request_headers.request_url.indexOf('?') >= 0) {
        const category = (request_headers.query.category) ? request_headers.query.category : null;

        if (category === null) music_obj.enableCategories = [];
        else {
            const cat = wtvbgm.categories[parseInt(category) - 1];
            if (cat) {
                const toRemove = [];
                Object.keys(music_obj.enableSongs).forEach(function (k) {
                    if (wtvbgm.getSongCategory(parseInt(music_obj.enableSongs[k])) === parseInt(category)) toRemove.push(k);
                });
                toRemove.forEach(function (v) {
                    music_obj.enableSongs.splice(v, 1, "");
                });
                const newEnableSongs = music_obj.enableSongs.filter(value => Object.keys(value).length !== 0);
                music_obj.enableSongs = newEnableSongs;
            }
        }
        const _qraw = request_headers.request_url.split('?')[1];
        if (_qraw.length > 0) {
            const qraw = _qraw.split("&");
            for (let i = 0; i < qraw.length; i++) {
                const qraw_split = qraw[i].split("=");
                if (qraw_split.length === 2) {
                    const k = qraw_split[0];
                    if (k === "enableCategory") music_obj['enableCategories'].push(decodeURIComponent(qraw[i].split("=")[1].replace(/\+/g, "%20")));
                    if (k === "enableSong") music_obj['enableSongs'].push(decodeURIComponent(qraw[i].split("=")[1].replace(/\+/g, "%20")));
                }
            }
        }
    }
    music_obj.enableCategories = [...new Set(music_obj.enableCategories.filter(value => Object.keys(value).length !== 0))];
    music_obj.enableSongs = [...new Set(music_obj.enableSongs.filter(value => Object.keys(value).length !== 0))];
    music_obj = Object.assign({}, music_obj)
    if ((Object.keys(music_obj.enableCategories).length !== Object.keys(old_music_obj.enableCategories).length) || (Object.keys(music_obj.enableSongs).length !== Object.keys(old_music_obj.enableSongs).length)) {
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
    const outdata = wtvshared.doErrorPage();
    headers = outdata[0];
    data = outdata[1];
}