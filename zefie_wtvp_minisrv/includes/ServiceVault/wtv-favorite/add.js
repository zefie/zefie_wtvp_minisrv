const minisrv_service_file = true;

request_is_async = true;

const max_redirects = 3;
let redirects = 0;

function hex_to_ascii(POST)
{
	const hex = POST.toString();
	let str = '';
	for (let n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.slice(n, n + 2), 16));
	}
	return str;
}
let POST, image;

if (request_headers.post_data) {
	POST = request_headers.post_data;
	image = hex_to_ascii(POST);
}

function getTitle(url) {
	return new Promise(function (resolve, reject) {
		let page_title = "Web Page";
		const request_type = (url.slice(0, 5) == "https") ? "https" : "http";
		let proxy_agent = null;
		switch (request_type) {
			case "https":
				proxy_agent = require('https');
				break;
			case "http":
				proxy_agent = require('http');;
				break;
		}
		if (proxy_agent) {
			const options = {
				method: 'GET'
			}
			const request = proxy_agent.get(url, options, (response) => {
				let req_data = '';
				if (response.statusCode == 301 || response.statusCode == 302) {
					redirects++;
					if (redirects < max_redirects) resolve(getTitle(response.headers.location));
					else reject(`Too many redirects. Max: ${max_redirects}, Current: ${redirects}`);
				}
				response.on('data', (chunk) => {
					req_data += chunk.toString();
				});

				response.on('end', () => {
					const match = req_data.match(/<title>([^<]*)<\/title>/) // regular expression to parse contents of the <title> tag
					if (match && typeof match[1] === 'string') page_title = match[1];
					resolve(page_title);
				});
			});

			request.on('error', (error) => {
				console.log(' *** Error getting title for wtv-favorite', error);
				reject();
			});
		}
	});
}

async function saveFavorite(favstore, title, folder, imagetype, favurl) {
	let headers, data = '';
	if (!favstore.favstoreExists()) {
		// create favstore if the user hasn't already navigated to favorites
		favstore.createFavstore();
	}
	if (favstore.favstoreExists()) {
		const default_folder = "Personal"; // default to "Personal"
		let favoritenum = 0;

		if (!folder) folder = default_folder;
		if (!favstore.folderExists(folder)) {
			// user did not define a folder, and the default folder does not exist
			// so choose the user's first available folder
			const favfolders = favstore.getFolders();
			if (favfolders.length > 0) folder = favfolders[0];
		}
		if (!folder) {
			// user has no folders, forcefully recreate "Personal"
			folder = default_folder;
			favstore.createTemplateFolder(folder);
		}

		const favarray = favstore.listFavorites(folder);
		favoritenum = Object.keys(favarray).length;


		if (!title) {
			try {
				await getTitle(favurl).then(function (res) {
					title = res;
					if (!minisrv_config.config.debug_flags.quiet) console.log(" * Client sent favorite-url without title, got title:", title);
				});
			} catch (e) {
				console.error(" * Error: Client sent favorite-url without title, and we could not get the title from the server:", e);
            }
		}

		if (!image) {
			imagetype = "url";
			image = "canned/favorite_default.gif"
		}

		if (favoritenum == minisrv_config.services[service_name].max_favorites_per_folder) {
			headers = `400 You can only have ${minisrv_config.services[service_name].max_favorites_per_folder} favorites in a folder. Discard some favorites or choose a different folder, then try again.`
		} else {

			const createresult = favstore.createFavorite(title, favurl, folder, image, imagetype);
			if (!createresult) { // true if fail
				headers = `200 OK
wtv-expire: wtv-favorite:/serve-browser?favorite_folder_name=${folder}`
			} else {
				const err = wtvshared.doErrorPage(500);
				headers = err[0];
				data = err[1];
            }

			sendToClient(socket, headers, data);
		}
	} else {
		const err = wtvshared.doErrorPage(500);
		headers = err[0];
		data = err[1];
		sendToClient(socket, headers, data);
	}
}


const title = request_headers.query['favorite-title'];
let folder = request_headers.query['favorite-category'];
if (folder) folder = folder.replaceAll("+", " ")
const imagetype = request_headers.query['favorite-thumbnail-type']
const favurl = request_headers.query['favorite-url'];

saveFavorite(session_data.favstore, title, folder, imagetype, favurl);