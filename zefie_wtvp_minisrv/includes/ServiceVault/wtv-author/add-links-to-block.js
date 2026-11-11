const minisrv_service_file = true;

// NEW FILE 2026-11-10 (see CHANGES.txt):
// fill-from-favorites.js posts the favorites form here, but this route
// never existed, so "Add from Favorites -> Done" went nowhere (404).
// This handler builds a link block from the selected favorites and
// returns to the page editor. It accepts the standard link-block fields
// (listItemText / linkItemURL, one value per favorite, or a single value
// for one favorite) and, as a fallback, any query fields whose names
// contain "url" paired with a matching "name"/"title" field.
// NOTE: untested against the real wtv-favorite:/serve-raw-favorites
// form - if Done still does nothing, tell Muse what field names that
// form posts and this handler can be matched to them exactly.
const docName = request_headers.query.docName;
const blockNum = request_headers.query.blockNum;

const toArray = (v) => [].concat(v === undefined || v === null ? [] : v);
let listItems = toArray(request_headers.query.listItemText);
let linkItems = toArray(request_headers.query.linkItemURL);

if (linkItems.length === 0) {
	// Fallback: collect any *_url / *_name style fields.
	const keys = Object.keys(request_headers.query);
	const urlKeys = keys.filter((k) => /url/i.test(k) && request_headers.query[k]);
	urlKeys.forEach((uk) => {
		const nameKey = keys.find((k) => /name|title/i.test(k) && k.replace(/url/i, '') === uk.replace(/url/i, ''));
		linkItems.push(request_headers.query[uk]);
		listItems.push(nameKey ? request_headers.query[nameKey] : request_headers.query[uk]);
	});
}

if (!docName || linkItems.length === 0) {
	headers = `400 No favorites were selected. Please go back, mark one or more favorites, and try again.`
	data = "";
} else {
	const page = session_data.pagestore.loadPage(docName);
	if (!page) {
		headers = `400 Page not found.`
		data = "";
	} else {
		if (page.blocks[blockNum] !== undefined)
			session_data.pagestore.editLinkBlock(docName, "", listItems, linkItems, blockNum, blockNum);
		else
			session_data.pagestore.createLinkBlock(docName, "", listItems, linkItems, blockNum);
		headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`
		data = "";
	}
}
