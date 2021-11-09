var minisrv_service_file = true;

var settings_obj = ssid_sessions[socket.ssid].getSessionData("wtv-setup");
if (settings_obj === null) settings_obj = {};

settings_obj["from-server"] = 1;

// defaults
if (!settings_obj["setup-advanced-options"]) settings_obj["setup-advanced-options"] = 0;
if (!settings_obj["setup-play-bgm"]) settings_obj["setup-play-bgm"] = 0;
if (!settings_obj["setup-bgm-tempo"]) settings_obj["setup-bgm-tempo"] = -1;
if (!settings_obj["setup-bgm-volume"]) settings_obj["setup-bgm-volume"] = 100;
if (!settings_obj["setup-background-color"]) settings_obj["setup-background-color"] = "c6c6c6";
if (!settings_obj["setup-font-sizes"]) settings_obj["setup-font-sizes"] = "medium";
if (!settings_obj["setup-in-stereo"]) settings_obj["setup-in-stereo"] = 1;
if (!settings_obj["setup-keyboard"]) settings_obj["setup-keyboard"] = "alphabetical";
if (!settings_obj["setup-link-color"]) settings_obj["setup-link-color"] = "2222bb";
if (!settings_obj["setup-play-songs"]) settings_obj["setup-play-songs"] = 1;
if (!settings_obj["setup-play-sounds"]) settings_obj["setup-play-sounds"] = 1;
if (!settings_obj["setup-text-color"]) settings_obj["setup-text-color"] = 0;
if (!settings_obj["setup-visited-color"]) settings_obj["setup-visited-color"] = "8822bb";
if (!settings_obj["setup-japan-keyboard"]) settings_obj["setup-japan-keyboard"] = "roman";
if (!settings_obj["setup-japan-softkeyboard"]) settings_obj["setup-japan-softkeyboard"] = "roman"
if (!settings_obj["setup-chat-access-level"]) settings_obj["setup-chat-access-level"] = 0;
if (!settings_obj["setup-chat-on-nontrusted-pages"]) settings_obj["setup-chat-on-nontrusted-pages"] = 1;
if (!settings_obj["setup-tv-chat-level"]) settings_obj["setup-tv-chat-level"] = 2;

headers = `200 OK
wtv-backgroundmusic-load-playlist: wtv-setup:/get-playlist
wtv-printer-model: -1,-1
wtv-printer-pen: 0,0,1,0
wtv-printer-setup: 0,0,1,0
wtv-language-header: en-US,en
Content-Type: text/html`;

data = "";

Object.keys(settings_obj).forEach(function (k, v) {
    data += k + "=" + escape(settings_obj[k]) + "&";
});

data = data.substring(0, (data.length - 1));