var minisrv_service_file = true;

headers = `200 OK
wtv-backgroundmusic-load-playlist: wtv-music:/get-playlist
wtv-printer-model: -1,-1
wtv-printer-pen: 0,0,1,0
wtv-printer-setup: 0,0,1,0
wtv-language-header: en-US,en
Content-Type: text/html`

var settings_obj = new Array();
settings_obj["from-server"] = 1;
settings_obj["setup-advanced-options"] = 0;
settings_obj["setup-play-bgm"] = 0;
settings_obj["setup-bgm-tempo"] = -1;
settings_obj["setup-bgm-volume"] = 100;
settings_obj["setup-background-color"] = "c6c6c6";
settings_obj["setup-font-sizes"] = "medium";
settings_obj["setup-in-stereo"] = 1;
settings_obj["setup-keyboard"] = "alphabetical";
settings_obj["setup-link-color"] = "2222bb";
settings_obj["setup-play-songs"] = 1;
settings_obj["setup-play-sounds"] = 1;
settings_obj["setup-text-color"] = 0;
settings_obj["setup-visited-color"] = "8822bb";
settings_obj["setup-japan-keyboard"] = "roman";
settings_obj["setup-japan-softkeyboard"] = "norm"
settings_obj["setup-chat-access-level"] = 0;
settings_obj["setup-chat-on-nontrusted-pages"] = 1;
settings_obj["setup-tv-chat-level"] = 2;

data = "";

Object.keys(settings_obj).forEach(function (k, v) {
    data += k + "=" + escape(settings_obj[k]) + "&";
});

data = data.substring(0, (data.length - 1));