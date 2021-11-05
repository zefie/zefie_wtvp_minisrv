var music_obj = {};
ssid_sessions[socket.ssid].setSessionData("wtv-bgmusic", music_obj);
ssid_sessions[socket.ssid].saveSessionData();
headers = `300 OK
Location: wtv-setup:/choose-bg-songs
wtv-backgroundmusic-load-playlist: wtv-setup:/get-playlist`;
