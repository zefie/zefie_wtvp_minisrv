const minisrv_service_file = true;

const docName = request_headers.query.docName;
const title = request_headers.query.blockTitle;
const caption = request_headers.query.textBlockText;
let size = request_headers.query.textBlockSize;
let style = request_headers.query.textBlockStyle;
const position = request_headers.query.newBlockNum;
const oldPosition = request_headers.query.oldBlockNum;
const editing = request_headers.query.editing;
const blockClass = request_headers.query.blockClass;
switch(blockClass) {
	case "23":
		if (editing == "true") {
			const photo = request_headers.query.photoBlockPhoto;
			if (request_headers.query.toSnapshot == "true")
				session_data.pagestore.editPhotoBlock(docName, request_headers.query.blockNum, request_headers.query.newBlockNum, photo, "snapshot", request_headers.query.blockTitle, request_headers.query.photoBlockCaption);
			else
				session_data.pagestore.editPhotoBlock(docName, request_headers.query.blockNum, request_headers.query.newBlockNum, null, null, request_headers.query.blockTitle, request_headers.query.photoBlockCaption);
		const page = session_data.pagestore.loadPage(docName);
		headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: ${request_headers.query.returnPageURL || "wtv-author:/show-blocks?docName=" + docName}`
		} else {
			session_data.pagestore.createPhotoBlock(docName, request_headers.query.photoBlockPhoto, "snapshot");
			const page = session_data.pagestore.loadPage(docName);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: ${request_headers.query.returnPageURL + "&numOfBlocks=" + page.blocks.length}`
		}
		break;
	case "21":
		if (caption.length == 0) {
			headers = "400 You must enter a caption. Please enter a caption and try again."
		} else {
			if (editing == "true") {
				if (size.length == 0)
					size = null;
			
				if (style.length == 0)
					style = null;
				session_data.pagestore.editTextBlock(docName, title, caption, size, style, position, oldPosition);
				headers = `300 OK
	wtv-expire-all: wtv-author:/block-preview
	wtv-expire-all: wtv-author:/preview
	wtv-expire-all: wtv-author:/show-blocks
	wtv-expire-all: wtv-author:/edit-block
	Location: wtv-author:/show-blocks?docName=${docName}`
			} else {
				if (size.length == 0)
					size = null;
			
				if (style.length == 0)
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
		const header = request_headers.query.headingBlockText
		size = request_headers.query.headingBlockSize
		const dividerBefore = request_headers.query.headingBlockDividerBefore
		const dividerAfter = request_headers.query.headingBlockDividerAfter
		if (header.length == 0) {
			headers = "400 You must enter a header. Please enter a header and try again."
		} else {
			if (editing == "true") {
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
		if (editing == "true") {
			const listItems = request_headers.query.listItemText.filter(function(e){ return e.replace(/(\r\n|\n|\r)/gm,"")});
			session_data.pagestore.editListBlock(docName, title, listItems, position, request_headers.query.blockNum);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`
		} else {
			const listItems = request_headers.query.listItemText.filter(function(e){ return e.replace(/(\r\n|\n|\r)/gm,"")});
			session_data.pagestore.createListBlock(docName, title, listItems, position);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/show-blocks?docName=${docName}`
		}
		break;
	case "25":
		if (editing == "true") {
			const listItems = request_headers.query.listItemText;
			const linkItems = request_headers.query.linkItemURL;
			session_data.pagestore.editLinkBlock(docName, title, listItems, linkItems, position, request_headers.query.blockNum);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
Location: wtv-author:/show-blocks?docName=${docName}`
		} else {
			const listItems = request_headers.query.listItemText;
			const linkItems = request_headers.query.linkItemURL;
			session_data.pagestore.createLinkBlock(docName, title, listItems, linkItems, position);
			headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
Location: wtv-author:/show-blocks?docName=${docName}`
		}
		break;
	
	case "27":
		if (editing == "true") {
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
}
