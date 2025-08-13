const minisrv_service_file = true;

const docName = request_headers.query.docName;
const title = request_headers.query.blockTitle;
const caption = request_headers.query.textBlockText;
const size = request_headers.query.textBlockSize;
const style = request_headers.query.textBlockStyle;
const position = request_headers.query.newBlockNum;
const oldPosition = request_headers.query.oldBlockNum;
const editing = request_headers.query.editing;
let page;

if (editing == "true"){
	session_data.pagestore.editPhotoBlock(docName, request_headers.query.blockNum, request_headers.query.newBlockNum, null, null, request_headers.query.blockTitle, request_headers.query.photoBlockCaption);
	headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
wtv-expire-all: wtv-author:/get-photo?docName=${docName}&blockNum=${request_headers.query.blockNum}
Location: wtv-author:/show-blocks?docName=${docName}`
} else {
	const page = session_data.pagestore.loadPage(docName);
	const blockNum = request_headers.query.blockNum;
	if (request_headers.query.scrapbookID != undefined) {
		const image = session_data.pagestore.getScrapbookImage(parseInt(request_headers.query.scrapbookID));
		if (page.blocks[blockNum] != undefined)
			session_data.pagestore.editPhotoBlock(docName, request_headers.query.blockNum, request_headers.query.blockNum, image, "scrapbook", null, null);
		else
			session_data.pagestore.createPhotoBlock(docName, image, "scrapbook");
	} else {
		if (page.blocks[blockNum] != undefined)
			session_data.pagestore.editPhotoBlock(docName, request_headers.query.blockNum, request_headers.query.blockNum, request_headers.query.mediaPath, "clipart", null, null);
		else
			session_data.pagestore.createPhotoBlock(docName, request_headers.query.mediaPath, "clipart");
	}

	headers = `300 OK
wtv-expire-all: wtv-author:/block-preview
wtv-expire-all: wtv-author:/preview
wtv-expire-all: wtv-author:/show-blocks
wtv-expire-all: wtv-author:/edit-block
wtv-expire-all: wtv-author:/get-photo?docName=${docName}&blockNum=${request_headers.query.blockNum}
Location: wtv-author:/edit-block?docName=${docName}&blockNum=${request_headers.query.blockNum}&numOfBlocks=${page.blocks.length}`
}