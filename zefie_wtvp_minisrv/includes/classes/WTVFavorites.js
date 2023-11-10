class WTVFavorites {

    fs = require('fs');
    path = require('path');
    uuid = require('uuid');

    ssid = null;
    minisrv_config = [];
    wtvshared = null;
    wtvmime = null;
    wtvclient = null;
    WTVClientSessionData = null;
    favFileExt = ".zfav";
	favstore_dir = null;
	folderArr = []; 
	messageArr = [];
	
	constructor(minisrv_config, wtvclient) {
        if (!minisrv_config) throw ("minisrv_config required");
		if (!wtvclient) throw ("WTVClientSessionData required");
        var WTVShared = require("./WTVShared.js")['WTVShared'];
        var WTVMime = require("./WTVMime.js");
        this.WTVClientSessionData = require("./WTVClientSessionData.js");
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        this.wtvmime = new WTVMime(minisrv_config);
        this.wtvclient = wtvclient;
        this.ssid = wtvclient.ssid;
		this.folderArr = this.folderArr; 
		this.messageArr = this.messageArr; 
    }

	checkFavIntroSeen() {
        return (this.wtvclient.getSessionData("subscriber_fav_intro_seen")) ? this.wtvclient.getSessionData("subscriber_fav_intro_seen") : false;
    }

    setFavIntroSeen(seen) {
        this.wtvclient.setSessionData("subscriber_fav_intro_seen", (seen) ? true : false);
    }
	
	favstoreExists() {
        if (!this.isguest) {
            if (this.favstore_dir === null) {
                // set favstore directory local var so we don't call the function every time
                var userstore_dir = this.wtvclient.getUserStoreDirectory();

                // FavStore
                var store_dir = "FavStore" + this.path.sep;
                this.favstore_dir = userstore_dir + store_dir;
            }
            return this.fs.existsSync(this.favstore_dir);
        }
        return null;
    }

	folderExists(foldername) {
        var folder_dir = null;
        if (this.favstoreExists()) {
            if (!foldername) return null;

            var folder_dir = foldername + this.path.sep;
            var store_dir = this.favstore_dir + folder_dir;
        }
        return (store_dir !== null) ? this.fs.existsSync(store_dir) : false;
    }
	
	getFolderDir(foldername) {
        var folder_dir = null;
        if (this.favstoreExists()) {
            if (!foldername) return null;

            var folder_dir = foldername + this.path.sep;
            var store_dir = this.favstore_dir + folder_dir;
        }
        return store_dir;
	}
	
	createTemplateFolder(folder) {
		// create emply folder
		this.createFolder(folder)
		var folder_templates = this.minisrv_config.favorites.folder_templates;
		// populate it if a template exists
		var self = this;
		if (folder_templates[folder]) {
			Object.keys(folder_templates[folder]).forEach(function (k) {
				self.createFavorite(folder_templates[folder][k].title, folder_templates[folder][k].url, folder, (folder_templates[folder][k].image_type == "image/wtv-bitmap") ? btoa(folder_templates[folder][k].image) : folder_templates[folder][k].image, folder_templates[folder][k].image_type);
            })
        } 
	}
		
	createDefaultFolders() {
		var brandId = this.ssid.charAt(8);
		this.createTemplateFolder("Recommended");
		if (brandId == 7)
			this.createTemplateFolder("Personal (Samsung)");
		else
			this.createTemplateFolder("Personal");
		
		if (brandId == 0)
			this.createTemplateFolder("Sony");
	}	
	
	createFavstore() {
        if (this.favstoreExists() === false) {
            if (!this.fs.existsSync(this.favstore_dir)) this.fs.mkdirSync(this.favstore_dir, { recursive: true });
			this.createDefaultFolders();
			this.wtvclient.setSessionData("subscriber_fav_images", true)
            return true;
        }
        return false;
    }
	
	createFolder(foldername) {
        var folder_exists = this.folderExists(foldername);
        if (folder_exists === false) {
            var folderdir = foldername + this.path.sep;
            var store_dir = this.favstore_dir + folderdir;
            if (!this.fs.existsSync(store_dir)) this.fs.mkdirSync(store_dir, { recursive: true });
            return true;
        }
        return folder_exists;
    }
	
	getFolders() {
        var path = this.favstore_dir;
		var self = this;
		return this.fs.readdirSync(path).filter(function (file) {
			self.folderArr.push(file);
			return self.folderArr;
		});
    }
	
	createFavoriteID() {
        return this.uuid.v1();
    }
	
	createFavorite(title, url, folder, image, imagetype) {
		var folderpath = this.getFolderDir(folder);
		var favoriteid = this.createFavoriteID();
		var favoritefile = favoriteid + this.favFileExt;
		var favoritefileout = folderpath + favoritefile;
		if (imagetype != "url")
			image = atob(image);

		title = decodeURIComponent(title).replaceAll("+", " ");
		url = decodeURIComponent(url)
		var favoritedata = {
			"title": title,
			"url": url,
			"folder": folder,
			"image": image,
			"imagetype": imagetype,
			"id": favoriteid
		}
		try {
			if (this.fs.existsSync(favoritefileout)) {
				console.log(" * ERROR: Favorite with this UUID (" + favoriteid + ") already exists (should never happen). Favorite lost.");
				return false;
			}

			// encode favorite into json
			var result = this.fs.writeFileSync(favoritefileout, JSON.stringify(favoritedata));
			if (!result) return false;

		} catch (e) {
			console.error(" # FavErr: Favorite Store failed\n", e, "\n", favoritefileout, "\n", favorite, "\n");
		}
		return false;
	}
	
	listFavorites(folder) {
		var folderpath = this.getFolderDir(folder);
		var self = this;
		self.messageArr = [];
		this.fs.readdirSync(folderpath)
			.map(function (v) {
				var favorite_data_raw = null;
				var favoritepath = folderpath + self.path.sep + v;
				if (self.fs.existsSync(favoritepath)) favorite_data_raw = self.fs.readFileSync(favoritepath);
				if (favorite_data_raw) {
					var favorite_data = JSON.parse(favorite_data_raw);
					self.messageArr.push(favorite_data);
				}

			})
		return self.messageArr;
	}
	
	getFavorite(folder, favoriteid) {
		var folder_path = this.getFolderDir(folder);
		var folder_file = favoriteid + this.favFileExt;
		var folder_file_in = folder_path + this.path.sep + folder_file;
		var folder_data_raw = null;

		if (this.fs.existsSync(folder_file_in)) folder_data_raw = this.fs.readFileSync(folder_file_in);
		else console.error(" # FavErr: could not find ", folder_file_in);

		if (folder_data_raw) {
			var folder_data = JSON.parse(folder_data_raw);
			folder_data.folder_path = folder_path;
			folder_data.folder_file = folder_file;
			if (folder_data) {
				folder_data.id = favoriteid;

				return folder_data;
			}
			else console.error(" # FavErr: could not parse json in ", folder_file_in);
		}
		return false;
	}
	
	deleteFolder(folder){
		var dir = this.getFolderDir(folder);
		if (dir) {
			try {
				this.fs.rm(dir, { recursive: true });
				return true;
			} catch (e) {
				return false;
			}
		}
		return false;
	}
	
	checkFolderName(folder) {
		return /^([a-z0-9\-\_\ ]{3,})$/i.test(folder);
    }
	
	deleteFavorite(favoriteid, folder) {
        var folderdir = this.getFolderDir(folder);
		this.fs.unlinkSync(folderdir + favoriteid + ".zfav", { recursive: true });
    }
	
	clearFolder(folder) {
		const { readdirSync, rmSync } = require('fs');
        var dir = this.getFolderDir(folder);
		readdirSync(dir).forEach(f => rmSync(`${dir}${f}`));
    }
	
	updateFavorite(favoritedata, folder) {
        // encode message into json
        var favoriteout = new Object();
		var folderpath = this.getFolderDir(folder);
        Object.assign(favoriteout, favoritedata);
        delete favoriteout.folderpath;
        delete favoriteout.favoritefile;
        var result = this.fs.writeFileSync(folderpath + favoritedata.id + ".zfav", JSON.stringify(favoriteout));
        if (!result) return false;
    }
	
	changeFavoriteName(favoriteid, folder, name) {
        var favorite = this.getFavorite(folder, favoriteid);
        if (!favorite) return false;

        favorite.title = name;
        this.updateFavorite(favorite, folder);
        return true;
    }
	
	moveFavorite(oldfolder, newfolder, favoriteid) {
        var favorite = this.getFavorite(oldfolder, favoriteid);
        if (!favorite) return false;
		
		var newfolderdata = this.listFavorites(newfolder);
		var newfoldernum = newfolderdata.length
		
		if (newfoldernum > 17)
			return;

        favorite.folder = newfolder;
        this.updateFavorite(favorite, oldfolder);
		var favoriteout = new Object();
		var folderpath = this.getFolderDir(newfolder);
        Object.assign(favoriteout, favorite);
        delete favoriteout.folderpath;
        delete favoriteout.favoritefile;
        this.fs.writeFileSync(folderpath + favorite.id + ".zfav", JSON.stringify(favoriteout));
		this.deleteFavorite(favoriteid, oldfolder)
        return true;
    }
	
	createShortcutKey() {
            var favoritefileout = this.favstore_dir + "KeyStore.zfav";
			var keydata = {};
			
			keydata.F1 = {
				folder: "none",
				id: "none"
			}
			keydata.F2 = {
				folder: "none",
				id: "none"
			}
			keydata.F3 = {
				folder: "none",
				id: "none"
			}
			keydata.F4 = {
				folder: "none",
				id: "none"
			}
			keydata.F5 = {
				folder: "none",
				id: "none"
			}
			keydata.F6 = {
				folder: "none",
				id: "none"
			}
			keydata.F7 = {
				folder: "none",
				id: "none"
			}

            try {
                // encode favorite into json
                var result = this.fs.writeFileSync(favoritefileout, keydata);
                if (!result) return false;

            } catch (e) {
                console.error(" # FavErr: Key Store failed\n", e, "\n", favoritefileout);
            }
            return false;
    }
	
	updateShortcutKey(oldkey, newkey, folder, id) {
            var folderpath = this.getFolderDir(folder);
            var favoritefileout = this.favstore_dir + "KeyStore.zfav";
			var keydata = {};
			
			keydata = this.fs.readFileSync(favoritefileout)
			console.log(newkey)
			switch(newkey) {
			case "F1":
			keydata.F1.folder = folder;
			break
			case "F2":
			keydata.F2 = {
				folder: folder,
				id: id
			}
			break;
			case "F3":
			keydata.F3 = {
				folder: folder,
				id: id
			}
			break;
			case "F4":
			keydata.F4 = {
				folder: folder,
				id: id
			}
			break;
			case "F5":
			keydata.F5 = {
				folder: folder,
				id: id
			}
			break;
			case "F6":
			keydata.F6 = {
				folder: folder,
				id: id
			}
			break;
			case "F7":
			keydata.F7 = {
				folder: folder,
				id: id
			}
			break;
			}
			if (oldkey == "none")
			{
				//no
			} else {
				keydata[oldkey].folder = null;
				keydata[oldkey].id = null;
			}
			
            try {
                // encode favorite into json
                var result = this.fs.writeFileSync(favoritefileout, keydata);
                if (!result) return false;

            } catch (e) {
                console.error(" # FavErr: Key Store failed\n", e, "\n", favoritefileout);
            }
            return false;
    }
}
module.exports = WTVFavorites;
