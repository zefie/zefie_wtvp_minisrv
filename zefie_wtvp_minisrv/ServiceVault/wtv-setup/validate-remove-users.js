var minisrv_service_file = true;

if (Object.keys(ssid_sessions[socket.ssid].listPrimaryAccountUsers()).length == 1) {
	errpage = wtvshared.doErrorPage(400, "There are no more users to remove.");
}
else if (ssid_sessions[socket.ssid].user_id != 0) errpage = wtvshared.doErrorPage(400, "You are not authorized to remove users from this account.");

var usersToRemove = [];
Object.keys(request_headers.query).forEach(function (k) {
	if (k.substr(0, 4) === "user" && request_headers.query[k] === "on") {
		usersToRemove.push(parseInt(k.replace("user", "")));
	}
});

if (usersToRemove.length === 0) errpage = wtvshared.doErrorPage(400, "No users were specified for removal.");

if (errpage) {
	headers = errpage[0];
	data = errpage[1];
} else {
	if (!request_headers.query.confirm_remove) {
		var message = '';
		if (usersToRemove.length == 1) {
			var userSession = new WTVClientSessionData(minisrv_config, socket.ssid);
			userSession.switchUserID(usersToRemove[0]);
			var userName = userSession.getSessionData("subscriber_username");
			message = `Removing <b>${userName}</b> will permanently remove all of <b>${userName}</b>'s e-mail and favorites as well. You will not be able to restore <b>${userName}</b>.`;
		} else {
			message = "Removing the selected users will permanently remove their e-mail and favorites as well. You will not be able to restore the users.";
		}
		var removeurl = request_headers.request_url;
		if (removeurl.indexOf('?') >= 0) {
			removeurl = removeurl.substring(0, removeurl.indexOf('?'));
		}
		removeurl += "?";

		Object.keys(usersToRemove).forEach(function (k) {
			removeurl += "user" + usersToRemove[k] + "=on&";
		});
		removeurl += "confirm_remove=true";

		var confirmAlert = new clientShowAlert({
			'image': minisrv_config.config.service_logo,
			'message': message,
			'buttonlabel1': "Don't Remove",
			'buttonaction1': "client:donothing",
			'buttonlabel2': "Remove",
			'buttonaction2': removeurl,
			'noback': true,
		}).getURL();
		headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-setup:/remove-users
wtv-expire-all: wtv-setup:/accounts
wtv-visit: ${confirmAlert}
Location: ${confirmAlert}`
	} else {
		Object.keys(usersToRemove).forEach(function (k) {
			ssid_sessions[socket.ssid].removeUser(usersToRemove[k]);
		})
		var num_accounts = ssid_sessions[socket.ssid].getNumberOfUserAccounts();
		var gourl = "wtv-setup:/remove-users?";
		if (num_accounts == 1) gourl = "wtv-setup:/accounts?";

		headers = `300 OK
Connection: Keep-Alive
Content-Type: text/html
wtv-expire-all: wtv-setup:/remove-users
wtv-expire-all: wtv-setup:/accounts
wtv-visit: ${gourl}
Location: ${gourl}`
	}
}