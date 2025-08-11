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
        const WTVShared = require("./WTVShared.js")['WTVShared'];
        const WTVMime = require("./WTVMime.js");
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
                const userstore_dir = this.wtvclient.getUserStoreDirectory();

                // FavStore
                const store_dir = "FavStore" + this.path.sep;
                this.favstore_dir = userstore_dir + store_dir;
            }
            return this.fs.existsSync(this.favstore_dir);
        }
        return null;
    }

	folderExists(foldername) {
        let folder_dir, store_dir = null;
		if (this.favstoreExists()) {
            if (!foldername) return null;

            folder_dir = foldername + this.path.sep;
            store_dir = this.favstore_dir + folder_dir;
        }
		if (store_dir) {
			if (this.fs.existsSync(store_dir)) {
				if (this.fs.statSync(store_dir).isDirectory()) {
					return store_dir;
				}
			}
		}
        return false;
    }
	
	getFolderDir(foldername) {
        let folder_dir, store_dir = null;
        if (this.favstoreExists()) {
            if (!foldername) return null;

            folder_dir = foldername + this.path.sep;
            store_dir = this.favstore_dir + folder_dir;
        }
        return store_dir;
	}
	
	createTemplateFolder(folder) {
		// create emply folder
		this.createFolder(folder)
		const folder_templates = this.minisrv_config.favorites.folder_templates;
		// populate it if a template exists
		const self = this;
		if (folder_templates[folder]) {
			Object.keys(folder_templates[folder]).forEach(function (k) {
				self.createFavorite(folder_templates[folder][k].title, folder_templates[folder][k].url, folder, (folder_templates[folder][k].image_type == "image/wtv-bitmap") ? atob(folder_templates[folder][k].image) : folder_templates[folder][k].image, folder_templates[folder][k].image_type);
            })
        } 
	}
		
	createDefaultFolders() {
		const brandId = this.ssid.charAt(8);
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
        const folder_exists = this.folderExists(foldername);
        if (folder_exists === false) {
            const folderdir = foldername + this.path.sep;
            const store_dir = this.favstore_dir + folderdir;
            if (!this.fs.existsSync(store_dir)) this.fs.mkdirSync(store_dir, { recursive: true });
            return true;
        }
        return folder_exists;
    }
	
	getFolders() {
        const path = this.favstore_dir;
		const self = this;
		return this.fs.readdirSync(path).filter(function (file) {
			if (self.folderExists(file)) {
				self.folderArr.push(file);
				return self.folderArr;
			}
		});
    }
	
	createFavoriteID() {
        return this.uuid.v1();
    }
	
	createFavorite(title, url, folder, image, imagetype) {
		const folderpath = this.getFolderDir(folder);
		const favoriteid = this.createFavoriteID();
		const favoritefile = favoriteid + this.favFileExt;
		const favoritefileout = folderpath + favoritefile;
		if (imagetype != "url")
			image = btoa(image);

		title = decodeURIComponent(title).replaceAll("+", " ");
		url = decodeURIComponent(url)
		const favoritedata = {
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
			const result = this.fs.writeFileSync(favoritefileout, JSON.stringify(favoritedata));
			if (!result) return false;

		} catch (e) {
			console.error(" # FavErr: Favorite Store failed\n", e, "\n", favoritefileout, "\n", favorite, "\n");
		}
		return false;
	}
	
	listFavorites(folder) {
		const folderpath = this.getFolderDir(folder);
		const self = this;
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


	getFavoriteById(favoriteid) {
		const folders = this.getFolders();
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];
			const favorites = this.listFavorites(folder);
			for (let j = 0; j < favorites.length; j++) {
				if (favorites[j].id === favoriteid) {
					return favorites[j];
				}
			}
		}
		return false;
	}
		
	getFavorite(folder, favoriteid) {
		const folder_path = this.getFolderDir(folder);
		const folder_file = favoriteid + this.favFileExt;
		const folder_file_in = folder_path + this.path.sep + folder_file;
		let folder_data_raw = null;

		if (this.fs.existsSync(folder_file_in)) folder_data_raw = this.fs.readFileSync(folder_file_in);
		else console.error(" # FavErr: could not find ", folder_file_in);

		if (folder_data_raw) {
			const folder_data = JSON.parse(folder_data_raw);
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
		const dir = this.getFolderDir(folder);
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
        const folderdir = this.getFolderDir(folder);
		this.fs.unlinkSync(folderdir + favoriteid + ".zfav", { recursive: true });
    }
	
	clearFolder(folder) {
		const { readdirSync, rmSync } = require('fs');
        const dir = this.getFolderDir(folder);
		readdirSync(dir).forEach(f => rmSync(`${dir}${f}`));
    }
	
	updateFavorite(favoritedata, folder) {
        // encode message into json
        const favoriteout = new Object();
		const folderpath = this.getFolderDir(folder);
        Object.assign(favoriteout, favoritedata);
        delete favoriteout.folderpath;
        delete favoriteout.favoritefile;
        const result = this.fs.writeFileSync(folderpath + favoritedata.id + ".zfav", JSON.stringify(favoriteout));
        if (!result) return false;
    }
	
	changeFavoriteName(favoriteid, folder, name) {
        const favorite = this.getFavorite(folder, favoriteid);
        if (!favorite) return false;

        favorite.title = name;
        this.updateFavorite(favorite, folder);
        return true;
    }
	
	moveFavorite(oldfolder, newfolder, favoriteid) {
        const favorite = this.getFavorite(oldfolder, favoriteid);
        if (!favorite) return false;
		
		const newfolderdata = this.listFavorites(newfolder);
		const newfoldernum = newfolderdata.length
		
		if (newfoldernum > 17)
			return;

        favorite.folder = newfolder;
        this.updateFavorite(favorite, oldfolder);
		const favoriteout = new Object();
		const folderpath = this.getFolderDir(newfolder);
        Object.assign(favoriteout, favorite);
        delete favoriteout.folderpath;
        delete favoriteout.favoritefile;
        this.fs.writeFileSync(folderpath + favorite.id + ".zfav", JSON.stringify(favoriteout));
		this.deleteFavorite(favoriteid, oldfolder)
        return true;
    }


	isFavoriteAShortcut(favoriteid) {
		const favoritefileout = this.favstore_dir + "KeyStore.zfav";
		if (!this.fs.existsSync(favoritefileout)) {
			this.createShortcutKey();
		}
		const keydata = JSON.parse(this.fs.readFileSync(favoritefileout));
		const keys = Object.keys(keydata);
		for (let i = 0; i < keys.length; i++) {
			if (keydata[keys[i]].id == favoriteid) {
				return { key: keys[i], folder: keydata[keys[i]].folder };
			}
		}
		return false;
	}

	getShortcutKey(key) {
		const favoritefileout = this.favstore_dir + "KeyStore.zfav";
		if (!this.fs.existsSync(favoritefileout)) {
			this.createShortcutKey();
		}
		const keydata = JSON.parse(this.fs.readFileSync(favoritefileout));
		if (key && keydata[key]) {
			return { folder: keydata[key].folder, id: keydata[key].id };
		}
	}
	
	createShortcutKey() {
            const favoritefileout = this.favstore_dir + "KeyStore.zfav";
			const keydata = {};
			
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
                const result = this.fs.writeFileSync(favoritefileout, JSON.stringify(keydata));
                if (!result) return false;

            } catch (e) {
                console.error(" # FavErr: Key Store failed\n", e, "\n", favoritefileout);
            }
            return false;
    }
	
	updateShortcutKey(oldkey, newkey, folder, id) {
            const favoritefileout = this.favstore_dir + "KeyStore.zfav";
			if (!this.fs.existsSync(favoritefileout)) {
				this.createShortcutKey();
			}
			const keydata = JSON.parse(this.fs.readFileSync(favoritefileout));
			switch(newkey) {
				case "F1":
					keydata.F1 = {
						folder: folder,
						id: id
					};
					break;
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
			if (oldkey != "none") {
				keydata[oldkey].folder = null;
				keydata[oldkey].id = null;
			}
			
            try {
                // encode favorite into json
                const result = this.fs.writeFileSync(favoritefileout, JSON.stringify(keydata));
                if (!result) return false;

            } catch (e) {
                console.error(" # FavErr: Key Store failed\n", e, "\n", favoritefileout);
            }
            return false;
    }
}
module.exports = WTVFavorites;
