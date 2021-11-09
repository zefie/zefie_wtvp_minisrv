var music_obj = {};
ssid_sessions[socket.ssid].setSessionData("wtv-bgmusic", Object.assign({}, music_obj));
ssid_sessions[socket.ssid].saveSessionData();
headers = `300 OK
Location: wtv-setup:/choose-bg-songs`;

