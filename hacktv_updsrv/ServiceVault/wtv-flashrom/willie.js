// willie is just a graphical frontend to a list of ROMs
// the rest of the scripts should work if you manually link to a ROM, and actually have it.


const options = new URL('http://wtv.zefie.com/willie.php?flash='+getSessionData(socket_session_data[socket.id].ssid, 'wtv-client-rom-type'))
var data_ready = false;
data = '';
const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`)

  res.on('data', d => {
	data += d;    
  })
  
  res.on('end', function () {
	data_ready = true;
  });
});

headers = "200 OK\nContent-type: text/html";