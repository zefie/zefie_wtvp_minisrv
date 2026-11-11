class WTVAuthor {

    fs = require('fs');
    path = require('path');
    uuid = require('uuid');

    ssid = null;
    minisrv_config = [];
    wtvshared = null;
    wtvclient = null;
    pageFileExt = ".page";
	pagestore_dir = null;
	pageArr = []; 
	blockArr = [];
	header = null;
	previewheader = null;
	titheader = null;
	tabstart = null;
	footerstart = null;
	webtvfooter = null;
	footerend = null;
	link = "#0000EE";
	vlink = "#551A8B";
	text = "#000000";
	headcol = this.text
	listcol1 = null;
	listcol2 = null;
	stylemedia = [];
	headerimgL = null;
	headerimgLheight = null;
	headerimgLwidth = null;
	afterblock1 = null;
	debug = require('debug')('WTVAuthor')
	nunjucks = null;
	
	constructor(minisrv_config, wtvclient) {
        if (!minisrv_config) throw ("minisrv_config required");
		if (!wtvclient) throw ("WTVClientSessionData required");
        const WTVShared = require('./WTVShared.js')['WTVShared'];
		const nunjucks = require('nunjucks');
		this.nunjucks = nunjucks;
        const WTVMime = require('./WTVMime.js');
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        this.wtvmime = new WTVMime(minisrv_config);
        this.wtvclient = wtvclient;
        this.ssid = wtvclient.ssid;
		this.pageArr = this.pageArr; 
		this.blockArr = this.blockArr; 
    }
	
	checkPageIntroSeen() {
        return (this.wtvclient.getSessionData("subscriber_page_intro_seen")) ? this.wtvclient.getSessionData("subscriber_page_intro_seen") : false;
    }

    setPageIntroSeen(seen) {
        this.wtvclient.setSessionData("subscriber_page_intro_seen", (seen) ? true : false);
    }
	
	pagestoreExists() {
		if (this.pagestore_dir === null) {
			// set pagestore directory local var so we don't call the function every time
			const userstore_dir = this.wtvclient.getUserStoreDirectory();
			// PageStore
			const store_dir = "PageStore" + this.path.sep;
			this.pagestore_dir = userstore_dir + store_dir;			
		}
		return this.fs.existsSync(this.pagestore_dir);
    }
	
	createPagestore() {
		if (this.pagestoreExists() === false) {
			try {
				if (!this.fs.existsSync(this.pagestore_dir)) this.fs.mkdirSync(this.pagestore_dir, { recursive: true });
				return true;
			} catch { }
        }
        return false;
    }

	createPage(style) {
		this.pagestoreExists()
		if (!this.fs.existsSync(this.pagestore_dir)) this.createPagestore();
		// FIX: .sort() with no comparator sorts lexicographically, so with
		// pages 0..10 it picked 9 as the max and tried to recreate 10.page
		// ("Page already exists. Page lost."). Sort numerically.
		const pages = this.sortedPageFiles();
		let pagenum = -1;
		if (pages.length !== 0) {
			const pagenums = pages
				.map((f) => parseInt(f.slice(0, f.indexOf('.')), 10))
				.filter((n) => !isNaN(n))
				.sort((a, b) => a - b);
			this.debug("createPage", "pagenums", pagenums)
			pagenum = pagenums.length ? pagenums[pagenums.length - 1] : -1;
			this.debug("createPage", "pagenum", pagenum)
		}
		const pagefile = (pagenum + 1) + this.pageFileExt;
		const pagefileout = this.pagestore_dir + pagefile;
		// JSON data structure
		const pagedata = {
			"style": style,
			"title": "(Untitled)",
			"description": "(no description)",
			"pagebreaks": [],
			"showtitle": true,
			"inlist": true,
			"published": false,
			"publishdate": null,
			"publishname": null,
			"blocks": []
		}
		if (this.fs.existsSync(pagefileout)) {
			console.error(" * ERROR: Page already exists (should never happen). Page lost.");
			return false;
		}

		// Encode page data into JSON
		this.fs.writeFileSync(pagefileout, JSON.stringify(pagedata));
		// FIX: return the new page's index in the numerically-sorted list
		// (what loadPage(docName) actually uses), not pages.length - 1,
		// which is wrong whenever a page was deleted and left a gap.
		return this.sortedPageFiles().indexOf(pagefile);
	}
	
	loadPage(pagenum) {
		this.pagestoreExists()
		const page_file = this.listPages();
		// FIX: docName is an index into the page list. listPages() is now
		// sorted numerically, so the index is stable (was readdir order:
		// "10.page" sorted before "2.page", and a deleted page shifted
		// every index after it).
		const idx = parseInt(pagenum, 10);
		if (isNaN(idx) || idx < 0 || idx >= page_file.length) return false;
		const page_data_raw = page_file[idx];

		if (page_data_raw) {
			return page_data_raw;
		}
        return false;
	}

	// FIX: page files in numeric order ("0.page", "1.page", "2.page",
	// ... "10.page"), not readdir/alphabetical order.
	sortedPageFiles() {
		this.pagestoreExists();
		const pagestorepath = this.pagestore_dir;
		if (!this.fs.existsSync(pagestorepath)) return [];
		return this.fs.readdirSync(pagestorepath)
			.filter((v) => v.endsWith(this.pageFileExt))
			.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
	}

	// FIX: write a page file without the publish side-effect.
	// editPage() used to do this inline and returned false on every
	// success (writeFileSync returns undefined, and `if (!result)` is
	// therefore always true).
	savePage(pagedata, pagenum) {
		try {
			const pages = this.sortedPageFiles();
			const idx = parseInt(pagenum, 10);
			if (isNaN(idx) || idx < 0 || idx >= pages.length) return false;
			this.fs.writeFileSync(this.pagestore_dir + pages[idx], JSON.stringify(pagedata));
			return true;
		} catch (e) {
			console.error(" * WTVAuthor.savePage failed:", e);
			return false;
		}
	}

	// FIX: WTVShared.moveObjectKey() returns a NEW plain object and does
	// not mutate the array, so calling it (and discarding the result, as
	// every edit*Block did) never actually moved a block. Move in place.
	moveBlock(blocks, from, to) {
		from = parseInt(from, 10); to = parseInt(to, 10);
		if (isNaN(from) || isNaN(to) || from === to) return;
		if (!Array.isArray(blocks) || from < 0 || from >= blocks.length) return;
		if (to < 0) to = 0;
		if (to >= blocks.length) to = blocks.length - 1;
		const [item] = blocks.splice(from, 1);
		blocks.splice(to, 0, item);
	}

	// FIX: getScrapbookImage() was called by add-media-to-block.js but
	// never existed on WTVAuthor, so adding a scrapbook picture crashed.
	// Scrapbook images live in session_data.scrapbookDir(), listed by
	// session_data.listScrapbook(). Return the raw image bytes (a Buffer)
	// so createPhotoBlock() base64-encodes them exactly like a snapshot.
	// Returns null when the image cannot be found.
	getScrapbookImage(scrapbookID) {
		try {
			if (typeof this.wtvclient.getScrapbookImage === 'function') {
				return this.wtvclient.getScrapbookImage(scrapbookID);
			}
			const dir = (typeof this.wtvclient.scrapbookDir === 'function')
				? this.wtvclient.scrapbookDir() : null;
			if (!dir) return null;
			const want = String(scrapbookID);
			const files = this.fs.readdirSync(dir);
			// Match "12", "12.jpg", "12.jpeg", "12.gif", etc.
			const match = files.find((f) => {
				const base = f.replace(/\.(jpg|jpeg|gif|png)$/i, '');
				return base === want;
			});
			if (!match) return null;
			return this.fs.readFileSync(this.path.join(dir, match));
		} catch (e) {
			console.error(" * WTVAuthor.getScrapbookImage failed:", e);
			return null;
		}
	}
	
	setStyle(style, title, desc, state, docName) {
		// There's probably a better way to do this involving external files for each style, but no
		this.debug("setStyle", "this.wtvshared.makeSafeStringPath(style) (before load)", this.wtvshared.makeSafeStringPath(style));
		// FIX: reset every style field first. Before this, a template that
		// failed to load left the previous page's header/footer/colours/
		// stylemedia in place (or null on the first page), so a page could
		// silently render with the wrong theme.
		this.text = "#000000";
		this.link = "#0000EE";
		this.vlink = "#551A8B";
		this.headcol = this.text;
		this.listcol1 = null;
		this.listcol2 = null;
		this.stylemedia = [];
		this.headerimgL = null;
		this.headerimgLheight = null;
		this.headerimgLwidth = null;
		this.headerimgR = null;
		this.headerimgRheight = null;
		this.headerimgRwidth = null;
		this.header = `<html><head><title>${title}</title></head><body>`;
		this.previewheader = null;
		this.titheader = "";
		this.afterblock1 = null;
		this.tabstart = "";
		this.footerstart = "";
		this.webtvfooter = "";
		this.footerend = `</body></html>`;
		// FIX: pages created before this fix stored the style as "America",
		// but the template file is American.js. Try the alias so those
		// pages keep their theme instead of falling back to the default.
		let styleName = this.wtvshared.makeSafeStringPath(style);
		if (styleName === "America") styleName = "American";
		const template_data_file = this.wtvshared.getTemplate("wtv-author", "styles/" + styleName + ".js", true);
		if (!template_data_file) {
			console.error(" * WTVAuthor.setStyle: no template for style", style);
		}
		if (template_data_file) {
			this.debug("setStyle", "template_data_file", template_data_file);
			const PBTemplate = require(template_data_file);
			const pbtemplate = new PBTemplate(this, title, desc, state, docName);
			const template_data = pbtemplate.get();
			const self = this;
			Object.keys(template_data).forEach((k) => {
				self[k] = template_data[k];
            })
			this.debug("setStyle", "this.stylemedia", this.stylemedia);
        }
	}
	
	generateBlock(number, page, state) {
		const pagedata = this.loadPage(page);
		// FIX: a missing page or block used to throw and kill the whole
		// page render. Skip the block instead.
		if (!pagedata || !Array.isArray(pagedata.blocks) || !pagedata.blocks[number]) return "";
		const thisblock = pagedata.blocks[number];
		const type = thisblock.type;
		const numofblocks = pagedata.blocks.length;

		// Configure nunjucks with custom filters
		const env = this.nunjucks.configure({ autoescape: false });
		env.addFilter('base64_decode', function(str) {
			return Buffer.from(str, 'base64').toString();
		});

		const templateData = {
			state: state,
			page: page,
			number: number,
			thisblock: thisblock,
			numofblocks: numofblocks,
			headcol: this.headcol,
			text_color: this.text,
			headerimgL: this.headerimgL,
			headerimgLwidth: this.headerimgLwidth,
			headerimgLheight: this.headerimgLheight,
			listcol1: this.listcol1,
			listcol2: this.listcol2
		};

		let templatePath;
		let block = "";

		switch(type) {
			case "text":
				templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/text_block.njk', true);
				block = this.nunjucks.render(templatePath, templateData);
				break;
				
			case "snapshot":
			case "scrapbook":
				if (state === "publishing") {
					block = this.generatePublishImageBlock(number, page);
				} else {
					templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/snapshot_block.njk', true);
					block = this.nunjucks.render(templatePath, templateData);
				}
				break;
			
			case "clipart":
				if (state === "publishing") {
					block = this.generatePublishImageBlock(number, page);
				} else {
					templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/clipart_block.njk', true);
					block = this.nunjucks.render(templatePath, templateData);
				}
				break;
			
			case "heading":
				templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/heading_block.njk', true);
				block = this.nunjucks.render(templatePath, templateData);
				break;
		
		case "list":
			templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/list_block.njk', true);
			block = this.nunjucks.render(templatePath, templateData);
			break;
		
		case "link":
			templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/link_block.njk', true);
			block = this.nunjucks.render(templatePath, templateData);
			break;
			
		default:
			block = "";
			break;
		}
		
		return block;
	}
	// Separate function for generating image blocks when publishing because there is no possibly better way to do this
	generatePublishImageBlock(number, page) {
		const destDir = this.getPublishDir();
		const pagedata = this.loadPage(page);
		// FIX: a missing page/block used to throw here and abort publish.
		if (!pagedata || !Array.isArray(pagedata.blocks) || !pagedata.blocks[number] || !destDir) return "";
		const thisblock = pagedata.blocks[number];
		const type = thisblock.type;

		// Configure nunjucks with custom filters
		const env = this.nunjucks.configure({ autoescape: false });
		env.addFilter('base64_decode', function(str) {
			return Buffer.from(str, 'base64').toString();
		});

		const templateData = {
			number: number,
			thisblock: thisblock,
			headcol: this.headcol
		};

		let block = "";
		let templatePath;

		// FIX: scrapbook photos are base64 JPEG data, exactly like a
		// snapshot (get-photo.js reads both the same way). There used to
		// be no "scrapbook" case here, so a scrapbook block published as
		// "" - visible in the editor/preview, missing on the published
		// page. That was the Halloween empty-page bug.
		// FIX: writes/copies are now synchronous and guarded. The old
		// async copyFile callback did `throw err`, which crashes the
		// whole minisrv process if one image file is missing.
		const writePublishImage = (filename) => {
			try {
				if (!thisblock.photo) return;
				const mediaDir = destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + '/media/';
				this.fs.mkdirSync(mediaDir, { recursive: true });
				this.fs.writeFileSync(mediaDir + filename, Buffer.from(thisblock.photo, 'base64'));
			} catch (e) {
				console.error(" * WTVAuthor.generatePublishImageBlock: could not write", filename, e);
			}
		};

		switch(type) {
			case "snapshot":
			case "scrapbook":
				templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/snapshot_publish_block.njk', true);
				if (templatePath) block = this.nunjucks.render(templatePath, templateData);
				// Write the image file
				writePublishImage('captureA' + number + '.jpg');
				break;

			case "clipart":
				// Create directory and copy file
				try {
					const photoPath = Buffer.from(thisblock.photo, 'base64').toString();
					const photoDir = photoPath.slice(0, photoPath.lastIndexOf("/"));
					if (photoDir) this.fs.mkdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + "/" + photoDir, { recursive: true });
					this.fs.copyFileSync('includes/ServiceVault/wtv-author/' + photoPath, destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + "/" + photoPath);
				} catch (e) {
					console.error(" * WTVAuthor.generatePublishImageBlock: could not copy clipart image:", e);
				}

				templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/clipart_publish_block.njk', true);
				if (templatePath) block = this.nunjucks.render(templatePath, templateData);
				break;
		}
		return block;
	}
	
	generatePage(state, pagenum, page) {
		const pagedata = this.loadPage(pagenum);
		// FIX: was a TypeError on pagedata.title for a bad/missing docName.
		if (!pagedata) throw new Error("Page not found: " + pagenum);
		if (!Array.isArray(pagedata.blocks)) pagedata.blocks = [];
		if (!Array.isArray(pagedata.pagebreaks)) pagedata.pagebreaks = [];
		let title;
		// Should probably have a better way to know if the page has no title
		if (pagedata.title === "(Untitled)" && state === "editing")
			title = "<i>Choose this to add a title to your document</i>"
		else
			title = pagedata.title
		// Set the page style with too many paramaters
		this.setStyle(pagedata.style, title, pagedata.description, state, pagenum);
		// FIX: Halloween/Christmas/Easter/Channukah put the preview banner
		// in previewheader, but generatePage() never read it, so previewing
		// those styles showed no banner. Other styles build the banner
		// into header when state is "previewing", so only use
		// previewheader when it was actually set.
		let html = (state === "previewing" && this.previewheader) ? this.previewheader : this.header
		if (page === 1) {
			if (pagedata.showtitle === true){
					html += this.titheader
			}
		}
		html += this.tabstart
		// This generates blocks on separate pages in the most neat and optimized way possible (i think, i hate past jar)
		// FIX: pagebreaks go stale when blocks are inserted/deleted, so
		// clamp them into range. A stale pagebreaks[0] of 0 used to render
		// page 1 with zero blocks (an "empty" published page).
		const breaks = pagedata.pagebreaks
			.map((b) => Math.max(0, Math.min(parseInt(b, 10) || 0, pagedata.blocks.length)))
			.filter((b, i, a) => a.indexOf(b) === i)
			.sort((a, b) => a - b);
		if (page !== 1) {
			const startIdx = (breaks[page - 2] !== undefined) ? breaks[page - 2] : 0;
			const endIdx = (breaks[page - 1] !== undefined) ? breaks[page - 1] : pagedata.blocks.length;
			for (let i = startIdx; i < endIdx; i++) {
				html += this.generateBlock(i, pagenum, state)
			}
		} else if (breaks.length !== 0){
			for (let i = 0; i < breaks[0]; i++) {
				html += this.generateBlock(i, pagenum, state)
				if (this.afterblock1 && i === 0) {
					html += this.afterblock1
				}
			}
		} else {
			for (let i = 0; i < pagedata.blocks.length; i++) {
				html += this.generateBlock(i, pagenum, state)
				if (this.afterblock1 && i === 0) {
					html += this.afterblock1
				}
			}
		}
		html += this.footerstart
		// Add the footer if we're not in edit mode
		html += this.getPaginationFooter(state, pagedata, page, pagenum)
		html += this.footerend
		return html;
	}
	
	editPage(pagedata, pagenum, callPublish = true) {
		// just stolen from favorites lmao
		if (!pagedata) return false;
		const pageout = new Object();
        Object.assign(pageout, pagedata);
		// FIX: savePage() uses the numerically-sorted file list and
		// returns true on success (writeFileSync returns undefined, so
		// the old `if (!result) return false` returned false every time).
		const result = this.savePage(pageout, pagenum);
		if (!result) return false;
		if (pagedata.published === true && callPublish) {
			this.publishPage(pagenum, pagedata.inlist, false)
        }
        return true;
	}
	
	editMetadata(title, description, showtitle, pagenum) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;

        pagedata.title = title;
		pagedata.description = description;
		// FIX: save-title.js passes request_headers.query.hideTitle, which
		// is the STRING "true" or "false". !"false" is false, so a page
		// whose title should show was saved with showtitle=false.
		pagedata.showtitle = !(showtitle === true || showtitle === "true");
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	listPages() {
		// i don't remember why, but i'm pretty sure this function sucks
		const pagestore = this.pagestoreExists();
		if (!pagestore) this.createPagestore();
		const userstore_dir = this.wtvclient.getUserStoreDirectory();

        // PageStore
        const store_dir = "PageStore" + this.path.sep;
        this.pagestore_dir = userstore_dir + store_dir;
        const pagestorepath = this.pagestore_dir;
        const self = this;
		self.pageArr = [];
		if (self.fs.existsSync(pagestorepath)) {
			// FIX: numeric sort (see loadPage) and skip a corrupt .page
			// file instead of letting JSON.parse throw and break the
			// whole index for every user.
			const files = this.sortedPageFiles();
			this.debug("listPages","files",files)
            files.map(function (v) {
				if (v.endsWith(self.pageFileExt)) {
					let page_data_raw = null;
					const pagepath = pagestorepath + self.path.sep + v;
					if (self.fs.existsSync(pagepath)) page_data_raw = self.fs.readFileSync(pagepath);
					if (page_data_raw) {
						try {
							const page_data = JSON.parse(page_data_raw);
							self.pageArr.push(page_data);
						} catch (e) {
							console.error(" * WTVAuthor.listPages: skipping corrupt page file", v, e);
						}
					}
				}
            })
		}
		return self.pageArr;
    }
	
	deleteBlock(pagenum, position) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;

		const block = pagedata.blocks[position];
		if (!block) return false;

        const blocks = pagedata.blocks;
		blocks.splice(position, 1);
        this.editPage(pagedata, pagenum);
		// FIX: deleting ANY block before a break shifts every break index
		// after it, not just deleting the break itself.
		this.generateBreakList(pagenum)
        return true;
	}

	getPublishDomain() {
		const author = (this.minisrv_config.services || {})['wtv-author'] || {};
		if (author.public_domain) {
			return this.minisrv_config.services['wtv-author'].public_domain;
		} else {
			if (author.publish_mode === "service") {
				const target_service = this.minisrv_config.services[author.publish_dest];
				if (target_service) {
					return target_service.host + ":" + target_service.port;
				}
			} else {
				return author.host + ":" + author.port;
			}
        } 
    }

	getPoweredBy() {
		if (this.minisrv_config.services['wtv-author'].powered_by_url) {
			return this.minisrv_config.services['wtv-author'].powered_by_url;
		} else {
			return this.getPublishDomain();
		}
	}

	getPublishDir() {
		let destDir = false;
		if (this.minisrv_config.services['wtv-author'].publish_mode === "service") {
			const target_service = this.minisrv_config.services[this.minisrv_config.services['wtv-author'].publish_dest];
			if (target_service) {
				if (!target_service.pc_services) {
					console.error("Invalid service configuration: publish_dest is not a pc service.");
					return false;
				}
				if (!target_service.servicevault_dir) {
					target_service.servicevault_dir = this.minisrv_config.services['wtv-author'].publish_dest;
				}
				if (target_service.service_vaults) {
					destDir = target_service.service_vaults[0] + this.path.sep + target_service.servicevault_dir + this.path.sep;
				} else {
					destDir = this.minisrv_config.config.ServiceVaults[0] + this.path.sep + target_service.servicevault_dir + this.path.sep;
				}
			}
		} else if (this.minisrv_config.services['wtv-author'].publish_mode === "directory") {
			destDir = this.minisrv_config.services['wtv-author'].publish_dest;
		} else {
			console.error("Invalid service configuration: invalid publish_mode.");
			return false;
		}
		return destDir;
    }


	unpublishPage(pagenum) {
		const pagedata = this.loadPage(pagenum)
		if (!pagedata) return "Page not found.";
		const destDir = this.getPublishDir();
		if (!destDir) return "Publish destination is not configured.";
		if (pagedata.published !== true) {
			return "This page is not published."
		}
		const publishname = pagedata.publishname;
		if (this.fs.existsSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname)) {
			try {
				this.fs.rmSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname, { recursive: true })
				pagedata.published = false;
				this.editPage(pagedata, pagenum, false);
				const pages = this.listPages()
				const publishedPagesCount = pages.filter(page => page.published).length;
				if (publishedPagesCount === 0) {
					this.fs.rmSync(destDir + this.wtvclient.session_store.subscriber_username, { recursive: true });
				}
				this.generatePageList()
				return true;
			} catch { }
		}
		return false;
    }

	publishPage(pagenum, listpublicly) {
		// this was done in a rush and probably also sucks
		// remember to increment the "hours wasted here" comment at the top of the file
		const pagedata = this.loadPage(pagenum)
		if (!pagedata) return "Page not found.";
		const destDir = this.getPublishDir();
		if (!destDir) return "Publish destination is not configured.";
		let publishname, fileout;

		if (pagedata.published !== true) {
			publishname = (pagedata.title || "Untitled").slice(0, 50).replaceAll(" ", "").replace(/[^A-Za-z0-9]/g, "-");
			pagedata.publishname = publishname;
			this.editPage(pagedata, pagenum);
			if (this.fs.existsSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname)) {
				return "You already have a published page with a name similar to this one. Try changing the name of this page and try again.";
			}
		} else {
			publishname = pagedata.publishname;
		}
		pagedata.publishname = publishname;
		this.fs.mkdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname, { recursive: true })
		this.fs.mkdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname + "/clipart/styleMedia/", { recursive: true })
		this.fs.mkdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname + "/media/", { recursive: true })
		for (let i = 1; i < (pagedata.pagebreaks || []).length + 2; i++) {
			const pagehtml = this.generatePage("publishing", pagenum, i)
			if (i === 1)
				fileout = "index.html"
			else
				fileout = "page" + i + ".html"
			// FIX: was async fs.writeFile with a callback, so publishPage
			// returned true (and the congrats page was shown) before the
			// files were actually on disk.
			try {
				this.fs.writeFileSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname + '/' + fileout, pagehtml);
			} catch (e) {
				console.error(" * WTVAuthor.publishPage: could not write", fileout, e);
				return "Could not write the published page.";
			}
		}
		for (let i = 0; i < this.stylemedia.length; i++) {
			// FIX: was async copyFile with `throw err` in the callback,
			// which crashes the whole minisrv process on one missing
			// image. Log it and keep publishing the rest.
			try {
				this.fs.mkdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname + this.stylemedia[i].slice(0, this.stylemedia[i].lastIndexOf("/")), { recursive: true })
				this.fs.copyFileSync('includes/ServiceVault/wtv-author' + this.stylemedia[i], destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname + this.stylemedia[i]);
			} catch (e) {
				console.error(" * WTVAuthor.publishPage: could not copy style image", this.stylemedia[i], e);
			}
		}
		const strftime = require('strftime');
		pagedata.publishdate = strftime("%a, %b %d, %Y, %I:%M%P", new Date(new Date().toUTCString()))
		pagedata.published = true;
		pagedata.inlist = listpublicly;
		pagedata.publishname = publishname;
		this.editPage(pagedata, pagenum, false);
		this.generatePageList()
		return true;
	}
	
	generatePageList() {
		// this one's pretty ok i think, but it should have screenshots of each page
		const pagelist = this.listPages();
		
		// Filter published pages that should be listed
		const publishedPages = pagelist.filter(page => page.published === true && page.inlist === true);
		
		const templatePath = this.wtvshared.getServiceDep('wtv-author/page_list.njk', true);
		this.nunjucks.configure({ autoescape: false });
		
		const html = this.nunjucks.render(templatePath, {
			subscriber_name: this.wtvclient.session_store.subscriber_name,
			published_pages: publishedPages
		});
		
		try {
			this.fs.writeFileSync(this.getPublishDir() + this.wtvclient.session_store.subscriber_username + '/index.html', html);
		} catch (e) {
			console.error(" * WTVAuthor.generatePageList: could not write index.html", e);
		}
	}
	
	deletePage(pagenum) {
		// i hate fs operations
		const pagestore = this.pagestoreExists()
		const userstore_dir = this.wtvclient.getUserStoreDirectory();
		this.debug("deletePage","userstore_dir",userstore_dir)

        // PageStore
    	const store_dir = "PageStore" + this.path.sep;
        this.pagestore_dir = userstore_dir + store_dir;
        const pagestorepath = this.pagestore_dir;
		const page_file = this.sortedPageFiles()
		const page_file_out = page_file[pagenum]

		this.unpublishPage(pagenum);
		if (typeof page_file_out !== 'undefined') {
			this.fs.unlinkSync(this.pagestore_dir + page_file_out, { recursive: true });
		}
	}

	deleteUser(user_id) {;
		this.wtvclient.switchUserID(user_id, false, false, false);
		// FIX: deleting index i while the list shrinks skips every other
		// page (after deleting 0, old 1 becomes 0, but i moves to 1).
		while (this.listPages().length > 0) {
			this.deletePage(0);
		}
		const userstore_dir = this.wtvclient.getUserStoreDirectory();
		const store_dir = "PageStore" + this.path.sep;
        this.pagestore_dir = userstore_dir + store_dir;
		this.wtvclient.switchUserID(0, false, false, false);
	}

	// these totally couldn't have been made into one function nah that's impossible
	createTextBlock(pagenum, title, caption, size, style, position) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		const newblock = {
			"type": "text",
			"title": title,
			"caption": caption,
			"size": size,
			"style": style
		}

        const blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}

	editTextBlock(pagenum, title, caption, size, style, position, oldposition) {		
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		if (!pagedata.blocks[oldposition]) return false;
			
		pagedata.blocks[oldposition].title = title
		pagedata.blocks[oldposition].caption = caption
		pagedata.blocks[oldposition].size = size
		pagedata.blocks[oldposition].style = style

		if (oldposition !== position)
			this.moveBlock(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}

	createPhotoBlock(pagenum, photo, type) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		const base64photo = new Buffer.from(photo).toString('base64')
		
		const newblock = {
			"type": type,
			"title": null,
			"caption": null,
			"photo": base64photo
		}

        const blocks = pagedata.blocks
		blocks.push(newblock);
        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}

	editPhotoBlock(pagenum, oldposition, position, photo, type, title, caption) {
	
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		if (!pagedata.blocks[oldposition]) return false;
		
		const blocks = pagedata.blocks
		
		if (photo !== null) {
			const base64photo = new Buffer.from(photo).toString('base64')
			blocks[oldposition].photo = base64photo
		}
			
		if (type !== null) {
			blocks[oldposition].type = type
		}
		
		if (title !== null)
			blocks[oldposition].title = title
		
		if (caption !== null)
			blocks[oldposition].caption = caption
		
		if (oldposition !== position) {
			this.moveBlock(blocks, oldposition, position);
		}

        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}

	createHeaderBlock(pagenum, text, size, dividerBefore, dividerAfter, position) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		const newblock = {
			"type": "heading",
			"text": text,
			"size": size,
			"dividerBefore": dividerBefore,
			"dividerAfter": dividerAfter
		}

        const blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	editHeaderBlock(pagenum, text, size, dividerBefore, dividerAfter, position, oldposition) {
		
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		if (!pagedata.blocks[oldposition]) return false;
			
		pagedata.blocks[oldposition].text = text
		pagedata.blocks[oldposition].size = size
		pagedata.blocks[oldposition].dividerBefore = dividerBefore
		pagedata.blocks[oldposition].dividerAfter = dividerAfter

		if (oldposition !== position)
			this.moveBlock(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	createListBlock(pagenum, title, items, position) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		const newblock = {
			"type": "list",
			"title": title,
			"items": items
		}

        const blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	editListBlock(pagenum, title, items, position, oldposition) {
	
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		if (!pagedata.blocks[oldposition]) return false;
			
		pagedata.blocks[oldposition].title = title
		pagedata.blocks[oldposition].items = items

		if (oldposition !== position)
			this.moveBlock(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	createLinkBlock(pagenum, title, listItems, linkItems, position) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		listItems = listItems || [];
		linkItems = linkItems || [];
		
		const items = [];
		loop:
		for (let i = 0; i < linkItems.length; i++) {
			const url = linkItems[i]
			const name = listItems[i]

			if (url === "http://") {
				continue loop;
			} else {
				const subblock = {
					"name": name,
					"url": url
				}
				items.push(subblock)
			}
		}
		
		const newblock = {
			"type": "link",
			"title": title,
			"items": items
		}

        const blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	editLinkBlock(pagenum, title, listItems, linkItems, position, oldposition) {
		
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		listItems = listItems || [];
		linkItems = linkItems || [];
		if (!pagedata.blocks[oldposition]) return false;
		
		const items = [];
		loop:
		for (let i = 0; i < linkItems.length; i++) {
			const url = linkItems[i]
			const name = listItems[i]

			if (url === "http://") {
				continue loop;
			} else {
				const subblock = {
					"name": name,
					"url": url
				}
				items.push(subblock)
			}
		}
			
		pagedata.blocks[oldposition].title = title
		pagedata.blocks[oldposition].items = items

		if (oldposition !== position)
			this.moveBlock(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	createBreakBlock(pagenum, position) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		const newblock = {
			"type": "break"
		}

        const blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	editBreakBlock(pagenum, position, oldposition) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;

		if (oldposition !== position)
			this.moveBlock(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	generateBreakList(pagenum) {
		const pagedata = this.loadPage(pagenum)
		if (!pagedata || !Array.isArray(pagedata.blocks)) return;
		const breaks = [];
		for (let i = 0; i < pagedata.blocks.length; i++) {
			const type = pagedata.blocks[i].type
			if (type === "break")
				breaks.push(i)
		}
		pagedata.pagebreaks = breaks;
		this.editPage(pagedata, pagenum);
	}

	getCommonFooter() {
		const template = this.wtvshared.getServiceDep('wtv-author/common_footer.njk', true);
		this.nunjucks.configure({ autoescape: true });
		return this.nunjucks.render(template, {
			powered_by: this.getPoweredBy(),
			service_name: this.minisrv_config.config.service_name		
		});
    }

	getPaginationFooter(state, pagedata, page, pagenum) {
		const template = this.wtvshared.getServiceDep('wtv-author/pagination_footer.njk', true);
		this.nunjucks.configure({ autoescape: false });
		return this.nunjucks.render(template, {
			state: state,
			pagedata: pagedata,
			page: parseInt(page),
			pagenum: pagenum,
			powered_by: this.getPoweredBy(),
			service_name: this.minisrv_config.config.service_name
		});
	}
}
module.exports = WTVAuthor;