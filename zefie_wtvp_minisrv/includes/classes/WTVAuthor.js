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
	
	constructor(minisrv_config, wtvclient) {
        if (!minisrv_config) throw ("minisrv_config required");
		if (!wtvclient) throw ("WTVClientSessionData required");
        var WTVShared = require('./WTVShared.js')['WTVShared'];
        var WTVMime = require('./WTVMime.js');
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
			var userstore_dir = this.wtvclient.getUserStoreDirectory();
			// PageStore
			var store_dir = "PageStore" + this.path.sep;
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
			var pagestorepath = this.pagestore_dir;
			// All this shit is to work around the part where I don't use UUIDs to store pages, which is bad
			var pages = this.fs.readdirSync(pagestorepath)
			if (pages.length == 0) {
				pagenum = 0;
			} else {
				var pagelen = pages.length;
				if (pagelen < 0) pagelen = 0;
				this.debug("createPage","pages",pages)
				var pagenums = [];
				for(let i = 0; i < pagelen; i++) {
					var toarr = pages[i].slice(0, pages[i].indexOf('.')); 
					pagenums.push(parseInt(toarr));
				}
				pagenums = pagenums.sort()
				this.debug("createPage", "pagenums", pagenums)
				var pagenum = parseInt(pagenums[pagelen - 1]);
				this.debug("createPage", "pagenum", pagenum)
				this.debug("createPage", "pagelen", pagelen)
			}
			if (pages.length == 0) {
				pagenum = 0
				var pagefile = pagenum + this.pageFileExt;
			} else {
				var pagefile = (pagenum + 1) + this.pageFileExt;
			}
            var pagefileout = this.pagestore_dir + pagefile;
			// JSON data structure
            var pagedata = {
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
				var returnval = pages.length
                var result = this.fs.writeFileSync(pagefileout, JSON.stringify(pagedata));
			if (returnval != 0) {
				var npages = this.fs.readdirSync(pagestorepath)
				var returnval = npages.length - 1;
			}
		return returnval;
	}
	
	loadPage(pagenum) {
		this.pagestoreExists()
            var page_file = this.listPages();
            var page_data_raw = page_file[pagenum];

            if (page_data_raw) {
                    return page_data_raw;
            }
        return false;
	}
	
	setStyle(style, title, desc, state, docName) {
		// There's probably a better way to do this involving external files for each style, but no
		this.debug("setStyle", "this.wtvshared.makeSafeStringPath(style) (before load)", this.wtvshared.makeSafeStringPath(style));
		var template_data_file = this.wtvshared.getTemplate("wtv-author", "styles/" + this.wtvshared.makeSafeStringPath(style) + ".js", true);
		if (template_data_file) {
			this.debug("setStyle", "template_data_file", template_data_file);
			const PBTemplate = require(template_data_file);
			var pbtemplate = new PBTemplate(this, title, desc, state, docName);
			var template_data = pbtemplate.get();
			var self = this;
			Object.keys(template_data).forEach((k) => {
				self[k] = template_data[k];
            })
			this.debug("setStyle", "this.stylemedia", this.stylemedia);
        }
	}
	
	generateBlock(number, page, state) {
		var block;
		var pagedata = this.loadPage(page)
		var thisblock = pagedata.blocks[number]
		var type = thisblock.type
		var numofblocks = pagedata.blocks.length
		// Generate HTML for each type of block
		switch(type) {
			case "text":
				if (state == "editing") {
					block = `<table href=wtv-author:/edit-block?docName=${page}&blockNum=${number}>`
				} else {
					block = `<table>`
				}
				block += `<tbody><tr><td>`
				
				block += "<font color=" + this.headcol + "<h3 align=left>" + thisblock.title + "</h3></font>"
				
				if (thisblock.caption)
					block += "<p align=left><font color=" + this.text
					if (thisblock.size)
						block +=  " size=" + thisblock.size + ">"
					else
						block += ">"
					
					if (thisblock.style)
						block += "<" + thisblock.style + ">"
					
					block += thisblock.caption + "</p>"
					
					if (thisblock.style)
						block += "</" + thisblock.style + ">"
				
				block += "</font></td></tr></tbody></table>"
				break;
				
			case "snapshot":
			case "scrapbook":
				if (state == "publishing") {
					block = this.generatePublishImageBlock(number, page)
					break;
				} else {
					block = `<font size="6" color="#ffffcc"><b>`
				if (state == "editing") {
					block += `<TABLE href=wtv-author:/edit-block?docName=${page}&blockNum=${number}&numOfBlocks=${numofblocks} nocolor width=100%>`
				} else {
					block += `<TABLE nocolor width=100%>`
				}
				block += `<tbody><tr>
<td>
<center>`
				if (thisblock.title)
					block += `<TR>
<TD align=center>
<font color=${this.headcol}>
<H3>
${thisblock.title}
</H3>
</font>
</TD>
</TR>`
				block += `<TR>
<TD>`
				
				block += `<CENTER>
<IMG SRC="wtv-author:/get-photo?docName=${page}&blockNum=${number}">
</CENTER>
</TD>
</TR>
<TR>
<TD valign=top>`
				if (state == "editing" && thisblock.caption == null || state == "editing" && thisblock.caption.length == 0)
					block += "<i>Choose this to change the image or add an optional caption.</i>"
				else if (thisblock.caption != null)
					block += `${thisblock.caption}`
block += `</td>
</tr>
</tbody></table>
</b></font><p></p>
<p>&nbsp;</p>`
			break;
				}
			
			case "clipart":
				if (state == "publishing") {
					block = this.generatePublishImageBlock(number, page)
					break;
				} else {
				block = `<p>`
				if (state == "editing")
					block += `<TABLE href=wtv-author:/edit-block?docName=${page}&blockNum=${number}&numOfBlocks=${pagedata.blocks.length} nocolor width=100%>`
				else
					block += `<TABLE nocolor width=100%>`
				if (thisblock.title)
					block += `<TR>
<TD align=center>
<font color=${this.headcol}>
<H3>
${thisblock.title}
</H3>
</font>
</TD>
</TR>`
				block += `<TR>`
				if (state == "editing")
					block += `<td>`
				else
					block += "<td>"
				
				block += `<CENTER>
<IMG SRC="wtv-author:/${atob(thisblock.photo)}">
</CENTER>
</TD>
</TR>
<TR>
<TD valign=top>`
				if (state == "editing" && thisblock.caption == null || state == "editing" && thisblock.caption.length == 0)
					block += "<i>Choose this to change the image or add an optional caption.</i>"
				else if (thisblock.caption != null)
					block += `${thisblock.caption}`
block += `
</TD>
</TR>
</TABLE>
</p>`
			break;
				}
			
			case "heading":
			
			block = `<center>
<h2>`
			if (state == "editing")
				block += `<table href=wtv-author:/edit-block?docName=${page}&blockNum=${number}&numOfBlocks=${pagedata.blocks.length} frame="" width="90%" cellspacing="8" cellpadding="0" border="0">`
			else
				block += `<table frame="" width="90%" cellspacing="8" cellpadding="0" border="0">`
			
			block += `<tbody><tr>`
			if (this.headerimgL) {
				block += `<td><img src="${this.headerimgL}" width="${this.headerimgLwidth}" height="${this.headerimgLheight}"> </td>`
			}
			block += `
<td center=""><font color=${this.headcol}>`
			if (thisblock.dividerBefore == "on")
				block += `<h2>
<hr>
</h2>`

block += `<${thisblock.size}>${thisblock.text}</${thisblock.size}>`
if (thisblock.dividerAfter == "on")
				block += `<h2>
<hr>
</h2>`

block += `</td>
</font>
</tr>
</tbody></table></h2>
</center>`
		break;
		
		case "list":
			
			block = `<center>`
			if (state == "editing")
				block += `<table nocolor="" cellspacing="0" cellpadding="0" href=wtv-author:/edit-block?docName=${page}&blockNum=${number}&numOfBlocks=${pagedata.blocks.length}>`
			else
				block += `<table nocolor="" cellspacing="0" cellpadding="0">`
			
			block += `<tbody><tr><td>
<font color=${this.headcol}>
<h3>
${thisblock.title}
</h3>
</font>
</td></tr><tr><td height="0"><spacer type="block" width="80">    </spacer></td></tr>`
			for (let i = 0; i < thisblock.items.length; i++) {
				block += `<tr>`
			if (this.listcol1 != null) {
				if(i % 2 == 0) {
					block += `<td bgcolor=${this.listcol1}>`
				} else {
					if (this.listcol2 != null) {
						block += `<td bgcolor=${this.listcol2}>`
					} else {
						block += `<td bgcolor=${this.listcol1}>`
					}
				}
			} else {
				block += `<td>`
			}
block += `<ul type="DISC">
<li>
${thisblock.items[i]}
</li>
</ul>
</td>
</tr>`
}
			
block += `</td>
</tr></tbody></table>
</center>`
		break;
		
		case "link":
			
			block = `<center>`
			if (state == "editing")
				block += `<table nocolor="" cellspacing="0" cellpadding="0" href=wtv-author:/edit-block?docName=${page}&blockNum=${number}&numOfBlocks=${pagedata.blocks.length}>`
			else
				block += `<table nocolor="" cellspacing="0" cellpadding="0">`
			
			block += `<tbody><tr><td>
<font color=${this.headcol}>
<h3>
${thisblock.title}
</h3>
</font>
</td></tr><tr><td height="0"><spacer type="block" width="80">    </spacer></td></tr>`
			for (let i = 0; i < thisblock.items.length; i++) {
				block += `<tr>`
			if (this.listcol1 != null) {
				if(i % 2 == 0) {
					block += `<td bgcolor=${this.listcol1}>`
				} else {
					if (this.listcol2 != null) {
						block += `<td bgcolor=${this.listcol2}>`
					} else {
						block += `<td bgcolor=${this.listcol1}>`
					}
				}
			} else {
				block += `<td>`
			}
block += `<ul type="DISC">
<li>
<a href="${thisblock.items[i].url}">`
if (thisblock.items[i].name != "" && thisblock.items[i].name != undefined)
	block += `${thisblock.items[i].name}`
else
	block += `${thisblock.items[i].url}`
block += `</a>
</li>
</ul>
</td>
</tr>`
}
			
block += `</tbody></table>
</center>`
		break;
		default:
		block = ""
		break;
		}
		return block;
	}
	// Separate function for generating image blocks when publishing because there is no possibly better way to do this
	generatePublishImageBlock(number, page) {
		var block;
		var destDir = this.getPublishDir();
		var pagedata = this.loadPage(page)
		var thisblock = pagedata.blocks[number]
		var type = thisblock.type
		var numofblocks = pagedata.blocks.length
		switch(type) {
				
			case "snapshot":
				block = `<p><TABLE nocolor width=100%>`
				if (thisblock.title)
					block += `<TR>
<TD align=center>
<font color=${this.headcol}>
<H3>
${thisblock.title}
</H3>
</font>
</TD>
</TR>`
				block += `<TR>
<TD>`
				
				block += `<CENTER>
<IMG SRC="media/captureA${number}.jpg">
</CENTER>
</TD>
</TR>
<TR>
<TD valign=top>`
				if (thisblock.caption != null)
					block += `${thisblock.caption}`
block += `
</TD>
</TR>
</TABLE>
</p>`
this.fs.writeFile(destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + '/media/captureA' + number + '.jpg', new Buffer.from(thisblock.photo, 'base64'), err => {
		if (err) {
			console.error(err);
		}
		// file written successfully
		});
			break;
			
			case "clipart":
				this.fs.mkdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + "/" + atob(thisblock.photo).slice(0, atob(thisblock.photo).lastIndexOf("/")), { recursive: true })
				this.fs.copyFile('includes/ServiceVault/wtv-author/' + atob(thisblock.photo), destDir + this.wtvclient.session_store.subscriber_username + '/' + pagedata.publishname + "/" + atob(thisblock.photo), (err) => {
				if (err) throw err;
				});
				block = `<p><TABLE nocolor width=100%>`
				if (thisblock.title)
					block += `<TR>
<TD align=center>
<font color=${this.headcol}>
<H3>
${thisblock.title}
</H3>
</font>
</TD>
</TR>`
				block += `<TR><td><CENTER>
<IMG SRC="${atob(thisblock.photo)}">
</CENTER>
</TD>
</TR>
<TR>
<TD valign=top>`
				if (thisblock.caption != null)
					block += `${thisblock.caption}`
block += `
</TD>
</TR>
</TABLE>
</p>`
			break;
		}
		return block;
	}
	
	generatePage(state, pagenum, page) {
		var pagedata = this.loadPage(pagenum);
		var title
		// Should probably have a better way to know if the page has no title
		if (pagedata.title == "(Untitled)" && state == "editing")
			title = "<i>Choose this to add a title to your document</i>"
		else
			title = pagedata.title
		// Set the page style with too many paramaters
		this.setStyle(pagedata.style, title, pagedata.description, state, pagenum);
		var html = this.header
		if (page == 1) {
			if (pagedata.showtitle == true){
					html += this.titheader
			}
		}
		html += this.tabstart
		// This generates blocks on separate pages in the most neat and optimized way possible (i think, i hate past jar)
		if (page != 1) {
			for (let i = pagedata.pagebreaks[page - 2]; i < (pagedata.pagebreaks[page - 1] || pagedata.blocks.length); i++) {
				var type = pagedata.blocks[i].type
				html += this.generateBlock(i, pagenum, state)
			} 
		} else if (pagedata.pagebreaks.length != 0){
			for (let i = 0; i < pagedata.pagebreaks[0]; i++) {
				var type = pagedata.blocks[i].type
				html += this.generateBlock(i, pagenum, state)
				if (this.afterblock1 && i == 0) {
					html += this.afterblock1
				}
			}
		} else {
			for (let i = 0; i < pagedata.blocks.length; i++) {
				var type = pagedata.blocks[i].type
				html += this.generateBlock(i, pagenum, state)
				if (this.afterblock1 && i == 0) {
					html += this.afterblock1
				}
			}
		}
		html += this.footerstart
		// Add the footer if we're not in edit mode
		if (state != "editing")
			if (page == 1 && pagedata.pagebreaks.length != 0) {
				html += `<tr>
<td colspan="3">
<hr>
</td>
</tr>
<tr>
<td width="30%" valign="middle">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
</b></font></td>
<td width="30%" valign="middle">
<center>
<font size="-2" face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular"><i>
<a href="http://${this.getPoweredBy()}">Powered by ${this.minisrv_config.config.service_name}</a>
</i></font></center>
</td>
<td width="30%" valign="middle" align="right">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
<a href="`
// Oh god this sucks, it's for the "next page" thing at the bottom of the page
if (state == "previewing" || state == "publishing")
if (state == "publishing")
	html += `page${parseInt(page) + 1}.html`
else 
	html += `wtv-author:/preview?docName=${pagenum}&pageNum=${parseInt(page) + 1}`
html += `">next page</a>
</b></font></td>

</tr>
<tr>
<td colspan="3">
<hr>`
			} else if (page != 1 && pagedata.pagebreaks.length + 1 == parseInt(page)) {
			html += `<tr>
<td colspan="3">
<hr>
</td>
</tr>
<tr>
<td width="30%" valign="middle">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
<a href="`
if (state == "previewing" || state == "publishing")
if (state == "publishing")
	if (parseInt(page) == 2)
		html += `index.html`
	else
		html += `page${parseInt(page) - 1}.html`
else 
	html += `wtv-author:/preview?docName=${pagenum}&pageNum=${parseInt(page) - 1}`
html += `">previous page</a>
</b></font></td>
<td width="30%" valign="middle">
<center>
<font size="-2" face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular"><i>
<a href="http://${this.getPoweredBy()}">Powered by ${this.minisrv_config.config.service_name}</a>
</i></font></center>
</td>
<td width="30%" valign="middle" align="right">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
</b></font></td>

</tr>
<tr>
<td colspan="3">
<hr>`
			} else if (page != 1 && pagedata.pagebreaks.length + 1 > parseInt(page)) {
			html += `<tr>
<td colspan="3">
<hr>
</td>
</tr>
<tr>
<td width="30%" valign="middle">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
<a href="`
if (state == "previewing")
	html += `wtv-author:/preview?docName=${pagenum}&pageNum=${parseInt(page) - 1}`
else if (state == "publishing")
	if (parseInt(page) == 2)
		html += `index.html`
	else
		html += `page${parseInt(page) - 1}.html`

html += `">previous page</a>
</b></font></td>
<td width="30%" valign="middle">
<center>
<font size="-2" face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular"><i>
<a href="http://${this.getPoweredBy()}">Powered by ${this.minisrv_config.config.service_name}</a>
</i></font></center>
</td>
<td width="30%" valign="middle" align="right">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
<a href="`
if (state == "previewing")
	html += `wtv-author:/preview?docName=${pagenum}&pageNum=${parseInt(page) + 1}`
else if (state == "publishing")
	html += `page${parseInt(page) + 1}.html`
html += `">next page</a>
</b></font></td>

</tr>
<tr>
<td colspan="3">
<hr>`
			} else {
				html += `<tr>
<td colspan="3">
<hr>
</td>
</tr>
<tr>
<td width="30%" valign="middle">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
</b></font></td>
<td width="30%" valign="middle">
<center>
<font size="-2" face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular"><i>
<a href="http://${this.getPoweredBy()}">Powered by ${this.minisrv_config.config.service_name}</a>
</i></font></center>
</td>
<td width="30%" valign="middle" align="right">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
</b></font></td>

</tr>
<tr>
<td colspan="3">
<hr>`
			}
		html += this.footerend
	return html;
	}
	
	editPage(pagedata, pagenum, callPublish = true) {
		// just stolen from favorites lmao
		var pageout = new Object();
		var pagepath = this.pagestore_dir;
        Object.assign(pageout, pagedata);
		var pagestorepath = this.pagestore_dir;
		var pages = this.fs.readdirSync(pagestorepath)
		var page = pages[pagenum]
		var result = this.fs.writeFileSync(pagepath + page, JSON.stringify(pageout));
		if (pagedata.published == true && callPublish) {
			this.publishPage(pagenum, pagedata.inlist, false)
        }
        if (!result) return false;
	}
	
	editMetadata(title, description, showtitle, pagenum) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		if (showtitle == "true")
			var showtitle2 = false
		else
			var showtitle2 = true

        pagedata.title = title
		pagedata.description = description
		pagedata.showtitle = showtitle2
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	listPages() {
		// i don't remember why, but i'm pretty sure this function sucks
		var pagestore = this.pagestoreExists();
		if (!pagestore) this.createPagestore();
		var userstore_dir = this.wtvclient.getUserStoreDirectory();

        // PageStore
        var store_dir = "PageStore" + this.path.sep;
        this.pagestore_dir = userstore_dir + store_dir;
        var pagestorepath = this.pagestore_dir;
        var self = this;
		self.pageArr = [];
        var files = this.fs.readdirSync(pagestorepath)
		this.debug("listPages","files",files)
            files.map(function (v) {
				// oh yeah it's because any non-JSON file in pagestore will throw an error and break everything
				var page_data_raw = null;
                var pagepath = pagestorepath + self.path.sep + v;
				if (self.fs.existsSync(pagepath)) page_data_raw = self.fs.readFileSync(pagepath);
                if (page_data_raw) {
                    var page_data = JSON.parse(page_data_raw);
					self.pageArr.push(page_data);
                }
                
            })
		return self.pageArr;
    }
	
	deleteBlock(pagenum, position) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var block = pagedata.blocks[position]

        var blocks = pagedata.blocks
		blocks.splice(position, 1);
        this.editPage(pagedata, pagenum);
		if (block.type == "break")
			this.generateBreakList(pagenum)
        return true;
	}

	getPublishDomain() {
		if (this.minisrv_config.services['wtv-author'].public_domain) {
			return this.minisrv_config.services['wtv-author'].public_domain;
		} else {
			if (this.minisrv_config.services['wtv-author'].publish_mode == "service") {
				var target_service = this.minisrv_config.services[this.minisrv_config.services['wtv-author'].publish_dest];
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
		var destDir = false;
		if (this.minisrv_config.services['wtv-author'].publish_mode == "service") {
			var target_service = this.minisrv_config.services[this.minisrv_config.services['wtv-author'].publish_dest];
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
					destDir = minisrv_config.config.ServiceVaults[0] + this.path.sep + target_service.servicevault_dir + this.path.sep;
				}
			}
		} else if (this.minisrv_config.services['wtv-author'].publish_mode == "directory") {
			destDir = this.minisrv_config.services['wtv-author'].publish_dest;
		} else {
			console.error("Invalid service configuration: invalid publish_mode.");
			return false;
		}
		return destDir;
    }


	unpublishPage(pagenum) {
		var pagedata = this.loadPage(pagenum)
		var destDir = this.getPublishDir();
		if (pagedata.published != true) {
			return "This page is not published."
		}
		var publishname = pagedata.publishname;
		if (this.fs.existsSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname)) {
			try {
				this.fs.rmdirSync(destDir + this.wtvclient.session_store.subscriber_username + '/' + publishname, { recursive: true })
				pagedata.published = false;
				this.editPage(pagedata, pagenum, false);
				this.generatePageList()
				return true;
			} catch { }
		}
		return false;
    }

	publishPage(pagenum, listpublicly) {
		// this was done in a rush and probably also sucks
		// remember to increment the "hours wasted here" comment at the top of the file
		var pagedata = this.loadPage(pagenum)
		var destDir = this.getPublishDir();
		var publishname = null;

		if (pagedata.published != true) {
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
			var pagehtml = this.generatePage("publishing", pagenum, i)
			if (i == 1)
				var fileout = "index.html"
			else
				var fileout = "page" + i + ".html"
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
		var strftime = require('strftime');
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
		var pagelist = this.listPages()
		var html = `<HTML>
<HEAD>
<SCRIPT language="JavaScript">
var	gIsWebTV = false;
var AppName = new String;
AppName = window.navigator.appName;
if (AppName.indexOf("WebTV") >= 0 )
gIsWebTV = true;
</SCRIPT>
<TITLE>${this.wtvclient.session_store.subscriber_name}</TITLE>
</HEAD>
<body
background="/ROMCache/ExternalBackground.gif"
bgcolor=#1e4261
text=AEBFD1 link=B8BDC7
vlink=B8BDC7
hspace=0
vspace=0
>
<table cellspacing=0 cellpadding=0 width=100%>
<tr>
<td width=22 rowspan=100><td><td><td><td><td width=22 rowspan=100>
<tr>
<td height=12>
<tr>
<td height=25 valign=top colspan=4>
<font size=+1 color=D1D1D1>Pages of ${this.wtvclient.session_store.subscriber_name}</font>
<tr>
<td height=14>
<tr><td height=10>`;
	loop:
	for (let i = 0; i < pagelist.length; i++) {
		if (pagelist[i].published == true && pagelist[i].inlist == true) {
			html += `<tr><td>
<td width=5>
<td>
<table>
<tr><td colspan=2><font color=AEBFD1><B>
<a href=${pagelist[i].publishname}/index.html>${pagelist[i].title}</a>
</B></font>
<tr>
<td width=12>
<td><font size=-1>${pagelist[i].description}</font>
</table>
<tr><td height=10>
<tr><td height=10>`
			} else {
				continue loop;
			}
		}
		html += `</table>
</BODY>
</HTML>`
		
		this.fs.writeFile(this.getPublishDir() + this.wtvclient.session_store.subscriber_username + '/index.html', html, err => {
		if (err) {
			console.error(err);
		}
		// file written successfully
		});
	}
	
	deletePage(pagenum) {
		// i hate fs operations
		var pagestore = this.pagestoreExists()
		var userstore_dir = this.wtvclient.getUserStoreDirectory();
		this.debug("deletePage","userstore_dir",userstore_dir)

        // PageStore
        var store_dir = "PageStore" + this.path.sep;
        this.pagestore_dir = userstore_dir + store_dir;
        var pagestorepath = this.pagestore_dir;
		var page_file = this.fs.readdirSync(pagestorepath)
		var page_file_out = page_file[pagenum]
		this.unpublishPage(pagenum);
		this.fs.unlinkSync(this.pagestore_dir + page_file_out, { recursive: true });
	}
	// these totally couldn't have been made into one function nah that's impossible
	createTextBlock(pagenum, title, caption, size, style, position) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var newblock = {
				"type": "text",
				"title": title,
				"caption": caption,
				"size": size,
				"style": style
            }

        var blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	editTextBlock(pagenum, title, caption, size, style, position, oldposition) {		
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var newblock = {
				"type": "text",
				"title": title,
				"caption": caption,
				"size": size,
				"style": style
            }
			
		pagedata.blocks[oldposition].title = title
		pagedata.blocks[oldposition].caption = caption
		pagedata.blocks[oldposition].size = size
		pagedata.blocks[oldposition].style = style
		
		if (oldposition != position)
			moveArrayKey(pagedata.blocks,oldposition,position);
		
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	createPhotoBlock(pagenum, photo, type) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		var base64photo = new Buffer.from(photo).toString('base64')
		
		var newblock = {
				"type": type,
				"title": null,
				"caption": null,
				"photo": base64photo
            }

        var blocks = pagedata.blocks
		blocks.push(newblock);
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	editPhotoBlock(pagenum, oldposition, position, photo, type, title, caption) {
	
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var blocks = pagedata.blocks
		
		if (photo != null) {
			var base64photo = new Buffer.from(photo).toString('base64')
			blocks[oldposition].photo = base64photo
		}
			
		if (type != null) {
			blocks[oldposition].type = type
		}
		
		if (title != null)
			blocks[oldposition].title = title
		
		if (caption != null)
			blocks[oldposition].caption = caption
		
		if (oldposition != position) {
			moveArrayKey(blocks, oldposition,position);
		}

        this.editPage(pagedata, pagenum);
        return true;
	}
	
	createHeaderBlock(pagenum, text, size, dividerBefore, dividerAfter, position) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var newblock = {
				"type": "heading",
				"text": text,
				"size": size,
				"dividerBefore": dividerBefore,
				"dividerAfter": dividerAfter
            }

        var blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	editHeaderBlock(pagenum, text, size, dividerBefore, dividerAfter, position, oldposition) {
		
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var newblock = {
				"type": "heading",
				"text": text,
				"size": size,
				"dividerBefore": dividerBefore,
				"dividerAfter": dividerAfter
            }
			
		pagedata.blocks[oldposition].text = text
		pagedata.blocks[oldposition].size = size
		pagedata.blocks[oldposition].dividerBefore = dividerBefore
		pagedata.blocks[oldposition].dividerAfter = dividerAfter
		
		if (oldposition != position)
			moveArrayKey(pagedata.blocks, oldposition,position);
		
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	createListBlock(pagenum, title, items, position) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var newblock = {
				"type": "list",
				"title": title,
				"items": items
            }

        var blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	editListBlock(pagenum, title, items, position, oldposition) {
	
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var newblock = {
				"type": "list",
				"title": title,
				"items": items
            }
			
		pagedata.blocks[oldposition].title = title
		pagedata.blocks[oldposition].items = items
		
		if (oldposition != position)
			moveArrayKey(pagedata.blocks,oldposition,position);
		
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	createLinkBlock(pagenum, title, listItems, linkItems, position) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var items = [];
		loop:
		for (let i = 0; i < linkItems.length; i++) {
			var url = linkItems[i]
			var name = listItems[i]
			
			if (url == "http://") {
				continue loop;
			} else {
				var subblock = {
				"name": name,
				"url": url
				}
				items.push(subblock)
			}
		}
		
		var newblock = {
				"type": "link",
				"title": title,
				"items": items
            }

        var blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	editLinkBlock(pagenum, title, listItems, linkItems, position, oldposition) {
		
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var items = [];
		loop:
		for (let i = 0; i < linkItems.length; i++) {
			var url = linkItems[i]
			var name = listItems[i]
			
			if (url == "http://") {
				continue loop;
			} else {
				var subblock = {
				"name": name,
				"url": url
				}
				items.push(subblock)
			}
		}
			
		pagedata.blocks[oldposition].title = title
		pagedata.blocks[oldposition].items = items
		
		if (oldposition != position)
			moveArrayKey(pagedata.blocks,oldposition,position);
		
        this.editPage(pagedata, pagenum);
        return true;
	}
	
	createBreakBlock(pagenum, position) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		var newblock = {
				"type": "break"
            }

        var blocks = pagedata.blocks
		blocks.splice(position, 0, newblock);
        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	editBreakBlock(pagenum, position, oldposition) {
		var pagedata = this.loadPage(pagenum);
        if (!pagedata) return false;
		
		if (oldposition != position)
			moveArrayKey(pagedata.blocks,oldposition,position);
		
        this.editPage(pagedata, pagenum);
		this.generateBreakList(pagenum);
        return true;
	}
	
	generateBreakList(pagenum) {
		var pagedata = this.loadPage(pagenum)
		var breaks = [];
		for (let i = 0; i < pagedata.blocks.length; i++) {
			var type = pagedata.blocks[i].type
			if (type == "break")
				breaks.push(i)
		}
		pagedata.pagebreaks = breaks;
		this.editPage(pagedata, pagenum);
	}

	getCommonFooter() {
		return `<tr>
<td colspan="3">
<hr>
</td>
</tr>
<tr>
<td width="30%" valign="middle">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
</b></font></td>
<td width="30%" valign="middle">
<center>
<font size="-2" face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular"><i>
<a href="http://${this.getPublishDomain()}">Powered by ${this.minisrv_config.config.service_name}</a>
</i></font></center>
</td>
<td width="30%" valign="middle" align="right">
<font face="Arial,Helvetica,Geneva,Swiss,SunSans-Regular">
<b>
</b></font></td>

</tr>
<tr>
<td colspan="3">
<hr>`;
    }
}
module.exports = WTVAuthor;