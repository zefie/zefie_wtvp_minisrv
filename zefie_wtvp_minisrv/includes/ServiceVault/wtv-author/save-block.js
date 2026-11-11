const minisrv_service_file = true;

// FIXED 2026-11-10 (see CHANGES.txt):
// - caption/size/style/header were read raw and .length was called on them,
//   so a missing form field crashed the save before headers were set.
// - listItemText.filter() crashed when there was only one list item (a
//   plain string, not an array) or no list items at all.
// - The switch had no default, so an unknown/missing blockClass ended
//   with no headers set at all (400 "Headers were not defined").
// - The create-photo branch built Location from returnPageURL with no
//   fallback, giving a literal "undefined&numOfBlocks=N" URL.
const docName = request_headers.query.docName;
const title = request_headers.query.blockTitle || "";
const caption = request_headers.query.textBlockText || "";
let size = request_headers.query.textBlockSize || "";
let style = request_headers.query.textBlockStyle || "";
const position = request_headers.query.newBlockNum;
const oldPosition = request_headers.query.oldBlockNum;
const editing = request_headers.query.editing;
const blockClass = request_headers.query.blockClass;
const toArray = (v) => [].concat(v === undefined || v === null ? [] : v);
const cleanListItems = toArray(request_headers.query.listItemText)
	.filter(function(e){ return (e || "").replace(/(\r\n|\n|\r)/gm,"")});
switch(blockClass) {
	case "23":
		if (editing === "true") {
			const photo = request_headers.query.photoBlockPhoto;
			if (request_headers.query.toSnapshot === "true")
				session_data.pagestore.editPhotoBlock(docName, request_headers.query.blockNum, request_headers.query.newBlockNum, photo, "snapshot", request_headers.query.blockTitle, request_headers.query.photoBlockCaption);
			else
				session_data.pagestore.editPhotoBlock(docName, request_headers.query.blockNum, request_headers.query.newBlockNum, null, null, request_headers.query.blockTitle, request_headers.query.photoBlockCaption);
		headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: ${request_headers.query.returnPageURL || "wtv-author:/show-blocks?docName=" + docName}`
		} else {
			session_data.pagestore.createPhotoBlock(docName, request_headers.query.photoBlockPhoto, "snapshot");
			const page = session_data.pagestore.loadPage(docName);
			const fallback = "wtv-author:/show-blocks?docName=" + docName;
			const numBlocks = (page && Array.isArray(page.blocks)) ? page.blocks.length : 0;
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: ${(request_headers.query.returnPageURL || fallback) + "&numOfBlocks=" + numBlocks}`
		}
		break;
	case "21":
		if (caption.length === 0) {
			headers = "400 You must enter a caption. Please enter a caption and try again."
		} else {
			if (editing === "true") {
				if (size.length === 0)
					size = null;

				if (style.length === 0)
					style = null;
				session_data.pagestore.editTextBlock(docName, title, caption, size, style, position, oldPosition);
				headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`
			} else {
				if (size.length === 0)
					size = null;

				if (style.length === 0)
					style = null;
				session_data.pagestore.createTextBlock(docName, title, caption, size, style, position);
				headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/show-blocks?docName=${docName}`
			}
		}
		break;
	case "26":
		const header = request_headers.query.headingBlockText || ""
		size = request_headers.query.headingBlockSize || ""
		const dividerBefore = request_headers.query.headingBlockDividerBefore
		const dividerAfter = request_headers.query.headingBlockDividerAfter
		if (header.length === 0) {
			headers = "400 You must enter a header. Please enter a header and try again."
		} else {
			if (editing === "true") {
				session_data.pagestore.editHeaderBlock(docName, header, size, dividerBefore, dividerAfter, position, request_headers.query.blockNum);
				headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`
			} else {
				session_data.pagestore.createHeaderBlock(docName, header, size, dividerBefore, dividerAfter, position);
				headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/show-blocks?docName=${docName}`
			}
		}
	break;
	case "24":
		if (editing === "true") {
			session_data.pagestore.editListBlock(docName, title, cleanListItems, position, request_headers.query.blockNum);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`
		} else {
			session_data.pagestore.createListBlock(docName, title, cleanListItems, position);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/show-blocks?docName=${docName}`
		}
		break;
	case "25":
		if (editing === "true") {
			session_data.pagestore.editLinkBlock(docName, title, toArray(request_headers.query.listItemText), toArray(request_headers.query.linkItemURL), position, request_headers.query.blockNum);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`
		} else {
			session_data.pagestore.createLinkBlock(docName, title, toArray(request_headers.query.listItemText), toArray(request_headers.query.linkItemURL), position);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/show-blocks?docName=${docName}`
		}
		break;

	case "27":
		if (editing === "true") {
			session_data.pagestore.editBreakBlock(docName, position, request_headers.query.blockNum);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`
		} else {
			session_data.pagestore.createBreakBlock(docName, position);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/show-blocks?docName=${docName}`
		}
		break;
	default:
		headers = "400 Unknown block type."
		break;
}
data = "";
