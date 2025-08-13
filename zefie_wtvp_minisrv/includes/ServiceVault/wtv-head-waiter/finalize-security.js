const minisrv_service_file = true;

if (socket.ssid && session_data) {
	if (request_headers["wtv-ticket"]) {
		if (request_headers["wtv-ticket"].length > 8) {
			session_data.data_store.wtvsec_login.DecodeTicket(request_headers["wtv-ticket"]);
			socket_sessions[socket.id].wtvsec.ticket_b64 = request_headers["wtv-ticket"];
			//socket_sessions[socket.id].secure == true;
		}
	} else if (socket_sessions[socket.id].wtvsec.ticket_b64 == null) {
		// TODO: client should have a ticket and send it back by now, if not we should handle this correctly
	}
}

headers = `200 OK
Connection: Keep-Alive
wtv-encrypted: true
wtv-ticket: `+socket_sessions[socket.id].wtvsec.ticket_b64+`
wtv-expire-all: htv-
wtv-home-url: wtv-home:/home?
wtv-visit: wtv-home:/splash?
Content-Type: text/html
`;