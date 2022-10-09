headers = `200 OK
Connection: Keep-Alive
wtv-encrypted: true
Expires: Wed, 09 Oct 1991 22:00:00 GMT
Content-Type: text/plain`


var email = session_data.getSessionData("messenger_email") + "%40" + session_data.getSessionData("messenger_domain");
var password = session_data.decryptPassword(session_data.getSessionData("messenger_password"));
var challenge = request_headers.request.split('?')[1];

if (request_headers.request.split('?')[1].substring(0, 3) != "ct=") {
	console.log(" *** Logging into Messenger via MSNP3")
	data = require('crypto').createHash('md5').update(request_headers.request.split('?')[1] + password).digest("hex");
} else {
	console.log(" *** Logging into Messenger via MSNP8")
	request_is_async = true; // Make us async
	const request = https.get('https://msnmsgr.escargot.chat/rdr/pprdr.asp', (response) => {
		let req_data = '';
		response.on('data', (chunk) => {
			req_data += chunk.toString();
		});

		response.on('end', () => {
			var passporturls = response.headers['passporturls'].split("DALogin=")[1];
			request.end();
			var options = {
				method: 'GET',
				headers: { "Authorization": "Passport1.4 OrgVerb=GET,OrgURL=http%3A%2F%2Fmessenger%2Emsn%2Ecom,sign-in=" + email + ",pwd=" + encodeURIComponent(password) + "," + challenge }
			}
			const request2 = https.get(passporturls, options, (response) => {
				let req_data = '';
				response.on('data', (chunk) => {
					req_data += chunk.toString();
				});

				response.on('end', () => {
					var pp = response.headers['authentication-info'];
					pp = pp.split("from-PP='")[1];
					pp = pp.split("'")[0];
					data = pp;
					sendToClient(socket, headers, data);
				});
			});
			request2.on('error', (error) => {
				console.log(' *** Error (Stage 1)', error);
			});

		});
	});

	request.on('error', (error) => {
		console.log(' *** Error (Stage 1)', error);
	});
}