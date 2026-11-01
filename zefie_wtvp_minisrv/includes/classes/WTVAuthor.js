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
		let pagenum = 0;
		let pagefile = null;
		const pagestorepath = this.pagestore_dir;
		// All this shit is to work around the part where I don't use UUIDs to store pages, which is bad
		const pages = this.fs.readdirSync(pagestorepath)
		if (pages.length === 0) {
			pagenum = 0;
		} else {
			let pagelen = pages.length;
			if (pagelen < 0) pagelen = 0;
			this.debug("createPage","pages",pages)
			let pagenums = [];
			for(let i = 0; i < pagelen; i++) {
				const toarr = pages[i].slice(0, pages[i].indexOf('.')); 
				pagenums.push(parseInt(toarr));
			}
			pagenums = pagenums.sort()
			this.debug("createPage", "pagenums", pagenums)
			pagenum = parseInt(pagenums[pagelen - 1]);
			this.debug("createPage", "pagenum", pagenum)
			this.debug("createPage", "pagelen", pagelen)
		}
		if (pages.length === 0) {
			pagenum = 0
			pagefile = pagenum + this.pageFileExt;
		} else {
			pagefile = (pagenum + 1) + this.pageFileExt;
		}
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
		let returnval = pages.length
		this.fs.writeFileSync(pagefileout, JSON.stringify(pagedata));
		if (returnval !== 0) {
			const npages = this.fs.readdirSync(pagestorepath)
			returnval = npages.length - 1;
		}
		return returnval;
	}
	
	loadPage(pagenum) {
		this.pagestoreExists()
		const page_file = this.listPages();
		const page_data_raw = page_file[pagenum];

		if (page_data_raw) {
			return page_data_raw;
		}
        return false;
	}
	
	setStyle(style, title, desc, state, docName) {
		// There's probably a better way to do this involving external files for each style, but no
		this.debug("setStyle", "this.wtvshared.makeSafeStringPath(style) (before load)", this.wtvshared.makeSafeStringPath(style));
		const template_data_file = this.wtvshared.getTemplate("wtv-author", "styles/" + this.wtvshared.makeSafeStringPath(style) + ".js", true);
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

		switch(type) {
			case "snapshot":
				templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/snapshot_publish_block.njk', true);
				block = this.nunjucks.render(templatePath, templateData);

				// Write the image file
				this.fs.writeFile(destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + '/media/captureA' + number + '.jpg', new Buffer.from(thisblock.photo, 'base64'), err => {
					if (err) {
						console.error(err);
					}
					// file written successfully
				});
				break;
			
			case "clipart":
				// Create directory and copy file
				this.fs.mkdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + "/" + Buffer.from(thisblock.photo, 'base64').toString().slice(0, Buffer.from(thisblock.photo, 'base64').toString().lastIndexOf("/")), { recursive: true });
				this.fs.copyFile('includes/ServiceVault/wtv-author/' + Buffer.from(thisblock.photo, 'base64').toString(), destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + "/" + Buffer.from(thisblock.photo, 'base64').toString(), (err) => {
					if (err) throw err;
				});
				
				templatePath = this.wtvshared.getServiceDep('wtv-author/blocks/clipart_publish_block.njk', true);
				block = this.nunjucks.render(templatePath, templateData);
				break;
		}
		return block;
	}
	
	generatePage(state, pagenum, page) {
		const pagedata = this.loadPage(pagenum);
		let title;
		// Should probably have a better way to know if the page has no title
		if (pagedata.title === "(Untitled)" && state === "editing")
			title = "<i>Choose this to add a title to your document</i>"
		else
			title = pagedata.title
		// Set the page style with too many paramaters
		this.setStyle(pagedata.style, title, pagedata.description, state, pagenum);
		let html = this.header
		if (page === 1) {
			if (pagedata.showtitle === true){
					html += this.titheader
			}
		}
		html += this.tabstart
		// This generates blocks on separate pages in the most neat and optimized way possible (i think, i hate past jar)
		if (page !== 1) {
			for (let i = pagedata.pagebreaks[page - 2]; i < (pagedata.pagebreaks[page - 1] || pagedata.blocks.length); i++) {
				html += this.generateBlock(i, pagenum, state)
			} 
		} else if (pagedata.pagebreaks.length !== 0){
			for (let i = 0; i < pagedata.pagebreaks[0]; i++) {
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
		const pageout = new Object();
		const pagepath = this.pagestore_dir;
        Object.assign(pageout, pagedata);
		const pagestorepath = this.pagestore_dir;
		const pages = this.fs.readdirSync(pagestorepath)
		const page = pages[pagenum]
		const result = this.fs.writeFileSync(pagepath + page, JSON.stringify(pageout));
		if (pagedata.published === true && callPublish) {
			this.publishPage(pagenum, pagedata.inlist, false)
        }
        if (!result) return false;
	}
	
	editMetadata(title, description, showtitle, pagenum) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;

        pagedata.title = title;
		pagedata.description = description;
		pagedata.showtitle = !showtitle;
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
			const files = this.fs.readdirSync(pagestorepath)
			this.debug("listPages","files",files)
            files.map(function (v) {
				if (v.endsWith(self.pageFileExt)) {
					// oh yeah it's because any non-JSON file in pagestore will throw an error and break everything
					let page_data_raw = null;
					const pagepath = pagestorepath + self.path.sep + v;
					if (self.fs.existsSync(pagepath)) page_data_raw = self.fs.readFileSync(pagepath);
					if (page_data_raw) {
						const page_data = JSON.parse(page_data_raw);
						self.pageArr.push(page_data);
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

        const blocks = pagedata.blocks;
		blocks.splice(position, 1);
        this.editPage(pagedata, pagenum);
		if (block.type === "break")
			this.generateBreakList(pagenum)
        return true;
	}

	getPublishDomain() {
		if (this.minisrv_config.services['wtv-author'].public_domain) {
			return this.minisrv_config.services['wtv-author'].public_domain;
		} else {
			if (this.minisrv_config.services['wtv-author'].publish_mode === "service") {
				const target_service = this.minisrv_config.services[this.minisrv_config.services['wtv-author'].publish_dest];
				if (target_service) {
					return target_service.host + ":" + target_service.port;
				}
			} else {
				return this.minisrv_config.services['wtv-author'].host + ":" + this.minisrv_config.services['wtv-author'].port;
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
		const destDir = this.getPublishDir();
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
		const destDir = this.getPublishDir();
		let publishname, fileout;

		if (pagedata.published !== true) {
			publishname = pagedata.title.slice(0, 50).replaceAll(" ", "").replace(/[^A-Za-z0-9]/g, "-");
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
		for (let i = 1; i < pagedata.pagebreaks.length + 2; i++) {
			const pagehtml = this.generatePage("publishing", pagenum, i)
			if (i === 1)
				fileout = "index.html"
			else
				fileout = "page" + i + ".html"
			this.fs.writeFile(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname + '/' + fileout, pagehtml, err => {
				if (err) {
					console.error(err);
				}
				// file written successfully
			});
		}
		for (let i = 0; i < this.stylemedia.length; i++) {
			this.fs.mkdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname + this.stylemedia[i].slice(0, this.stylemedia[i].lastIndexOf("/")), { recursive: true })
			this.fs.copyFile('includes/ServiceVault/wtv-author' + this.stylemedia[i], destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname + this.stylemedia[i], (err) => {
				if (err) throw err;
			});
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
		
		this.fs.writeFile(this.getPublishDir() + this.wtvclient.session_store.subscriber_username + '/index.html', html, err => {
			if (err) {
				console.error(err);
			}
			// file written successfully
		});
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
		const page_file = this.fs.readdirSync(pagestorepath)
		const page_file_out = page_file[pagenum]

		this.unpublishPage(pagenum);
		if (typeof page_file_out !== 'undefined') {
			this.fs.unlinkSync(this.pagestore_dir + page_file_out, { recursive: true });
		}
	}

	deleteUser(user_id) {;
		this.wtvclient.switchUserID(user_id, false, false, false);
		const pagelist = this.listPages();
		for (let i = 0; i < pagelist.length; i++) {
			this.deletePage(i);
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
        return true;
	}
	
	editTextBlock(pagenum, title, caption, size, style, position, oldposition) {		
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
			
		pagedata.blocks[oldposition].title = title
		pagedata.blocks[oldposition].caption = caption
		pagedata.blocks[oldposition].size = size
		pagedata.blocks[oldposition].style = style

		if (oldposition !== position)
			this.wtvshared.moveObjectKey(pagedata.blocks,oldposition,position);
		
        this.editPage(pagedata, pagenum);
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
        return true;
	}
	
	editPhotoBlock(pagenum, oldposition, position, photo, type, title, caption) {
	
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
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
			this.wtvshared.moveObjectKey(blocks, oldposition,position);
		}

        this.editPage(pagedata, pagenum);
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
        return true;
	}
	
	editHeaderBlock(pagenum, text, size, dividerBefore, dividerAfter, position, oldposition) {
		
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
			
		pagedata.blocks[oldposition].text = text
		pagedata.blocks[oldposition].size = size
		pagedata.blocks[oldposition].dividerBefore = dividerBefore
		pagedata.blocks[oldposition].dividerAfter = dividerAfter

		if (oldposition !== position)
			this.wtvshared.moveObjectKey(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
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
        return true;
	}
	
	editListBlock(pagenum, title, items, position, oldposition) {
	
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
			
		pagedata.blocks[oldposition].title = title
		pagedata.blocks[oldposition].items = items

		if (oldposition !== position)
			this.wtvshared.moveObjectKey(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
        return true;
	}
	
	createLinkBlock(pagenum, title, listItems, linkItems, position) {
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
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
        return true;
	}
	
	editLinkBlock(pagenum, title, listItems, linkItems, position, oldposition) {
		
		const pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
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
			this.wtvshared.moveObjectKey(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
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
			this.wtvshared.moveObjectKey(pagedata.blocks, oldposition, position);

        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	generateBreakList(pagenum) {
		const pagedata = this.loadPage(pagenum)
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