const minisrv_service_file = true;

const music_obj = {};
session_data.setSessionData("wtv-bgmusic", music_obj);
session_data.saveSessionData();
headers = `300 OK
Location: wtv-setup:/choose-bg-songs
wtv-backgroundmusic-load-playlist: wtv-setup:/get-playlist`;
