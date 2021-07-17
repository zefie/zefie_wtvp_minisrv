var challenge_response, challenge_header = '';
var gourl;

if (socket_session_data[socket.id].ssid !== null) {
	if (request_headers['wtv-ticket']) {
		if (request_headers['wtv-ticket'].length > 8) {
			DecodeTicket(request_headers['wtv-ticket']);
			socket_session_data[socket.id].wtvsec.ticket_b64 = request_headers['wtv-ticket'];
			//socket_session_data[socket.id].secure == true;
		}
	} else if (socket_session_data[socket.id].wtvsec.ticket_b64 == null) {
		// TODO: client should have a ticket and send it back by now, if not we should handle this correctly
	}
}

headers = `200 OK
Connection: Keep-Alive
wtv-encrypted: true
wtv-ticket: `+socket_session_data[socket.id].wtvsec.ticket_b64+`
wtv-expire-all: htv-
wtv-home-url: wtv-home:/home?
wtv-visit: wtv-home:/splash?
Content-Type: text/html
`;