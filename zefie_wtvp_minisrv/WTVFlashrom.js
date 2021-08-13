class WTVFlashrom {

	fs = require('fs');
	https = require('https');
	use_zefie_server = true;
	bf0app_update = false;
	service_vaults = new Array();
	no_debug = false;
	service_name = "";
	minisrv_config = [];
	wtvshared = null;


	constructor(minisrv_config, service_vaults, service_name, use_zefie_server = true, bf0app_update = false, no_debug = false) {
		var { WTVShared } = require('./WTVShared.js');
		this.service_vaults = service_vaults;
		this.service_name = service_name;
		this.use_zefie_server = use_zefie_server;
		this.bf0app_update = bf0app_update;
		this.no_debug = no_debug;
		this.minisrv_config = minisrv_config;
		this.wtvshared = new WTVShared(minisrv_config);
	}

	async doLocalFlashROM(flashrom_file_path, request_path, callback, info_only = false) {
		// use local flashrom files;
		var self = this;
		try {
			this.fs.readFile(flashrom_file_path, null, function (err, data) {
				if (err) {
					errpage = wtvshared.doErrorPage(400)
					var headers = errpage[0];
					data = err.toString();
					callback(data, headers);
				} else {
					if (info_only) {
						callback(self.getFlashromInfo(data, request_path));
					} else {
						self.sendToClient(data, flashrom_file_path, callback);
					}
				}
			});
		} catch (e) {
			var errpage = wtvshared.doErrorPage(404, "The service could not find the requested ROM.")
			var headers = errpage[0];
			var data = errpage[1];
			callback(data, headers);
		}
	}

	formatPartNum(partnum) {
		if (partnum < 10) return "00" + partnum; // 1s
		else if (partnum >= 10 && partnum < 100) return "0" + partnum; // 10s
		else return partnum; // 100s
	}


	getFlashromInfo(data, path) {
		var flashrom_info = new Array();
		var flashrom_magic = "96031889";
		var part_header = new Buffer.alloc(32);
		data.copy(part_header, 0, 0, 32);
		flashrom_info.header_length = data.readUInt16BE(26);

		flashrom_info.is_bootrom = (/\.brom$/).test(path);

		// re-read entire header
		var part_header = new Buffer.alloc(flashrom_info.header_length);
		data.copy(part_header, 0, 0, flashrom_info.header_length);

		flashrom_info.magic = part_header.toString('hex', 0, 4);
		flashrom_info.valid_flashrom = false;
		if (flashrom_info.magic == flashrom_magic) flashrom_info.valid_flashrom = true;
		if (!flashrom_info.valid_flashrom) console.error(" * Warning! FlashROM File Magic (" + flashrom_info.magic + ") did not match expected magic (" + flashrom_magic + ")...");

		//if (this.minisrv_config.config.debug_flags.debug && !this.no_debug) console.log(" # FlashROM File Magic (" + flashrom_info.magic + "), expected magic (" + flashrom_magic + "), OK = " + flashrom_info.valid_flashrom + "...");
		flashrom_info.byte_progress = data.readUInt32BE(68);
		flashrom_info.compression_type = parseInt(part_header[16], 16);
		//if (this.minisrv_config.config.debug_flags.debug && !this.no_debug) console.log(" # Flashrom Part Compression Type:", flashrom_info.compression_type);
		flashrom_info.part_data_size = data.readUInt32BE(4);
		//if (this.minisrv_config.config.debug_flags.debug && !this.no_debug) console.log(" # Flashrom Part Data Size:", flashrom_info.part_data_size);
		flashrom_info.part_total_size = flashrom_info.part_data_size + flashrom_info.header_length;
		flashrom_info.total_parts_size = data.readUInt32BE(32);
		flashrom_info.percent_complete = ((((flashrom_info.byte_progress + flashrom_info.part_total_size) / flashrom_info.total_parts_size)) * 100).toFixed(1);

		if (this.minisrv_config.config.debug_flags.debug && !this.minisrv_config.config.debug_flags.quiet && !this.no_debug) console.log(" # Flashrom Part Size  :", flashrom_info.part_total_size);
		if (this.minisrv_config.config.debug_flags.debug && !this.minisrv_config.config.debug_flags.quiet && !this.no_debug) console.log(" # Flashrom Bytes Sent :", flashrom_info.byte_progress);
		if (this.minisrv_config.config.debug_flags.debug && !this.minisrv_config.config.debug_flags.quiet && !this.no_debug) console.log(" # Flashrom Bytes Sent+:", flashrom_info.byte_progress + flashrom_info.part_total_size, "(" + flashrom_info.percent_complete + "% complete)");
		if (this.minisrv_config.config.debug_flags.debug && !this.minisrv_config.config.debug_flags.quiet && !this.no_debug) console.log(" # Flashrom Total Size :", flashrom_info.total_parts_size);

		// read current part number bit from part header
		flashrom_info.part_number = data.readUInt16BE(28);

		if (this.minisrv_config.config.debug_flags.debug && !this.minisrv_config.config.debug_flags.quiet && !this.no_debug) console.log(" # Flashrom Curr Part Number :", flashrom_info.part_number);
		flashrom_info.is_last_part = ((flashrom_info.byte_progress + flashrom_info.part_total_size) == flashrom_info.total_parts_size) ? true : false;

		if (flashrom_info.is_last_part) {
			if (this.minisrv_config.config.debug_flags.debug && !this.minisrv_config.config.debug_flags.quiet && !this.no_debug) console.log(" # Flashrom Curr Part is Last:", flashrom_info.is_last_part);
		} else {
			flashrom_info.next_part_number = flashrom_info.part_number + 1;
			if (this.minisrv_config.config.debug_flags.debug && !this.minisrv_config.config.debug_flags.quiet && !this.no_debug) console.log(" # Flashrom Next Part Number :", flashrom_info.next_part_number);
		}

		if (this.minisrv_config.config.debug_flags.debug && this.minisrv_config.config.debug_flags.quiet) console.log(" # Sending", (flashrom_info.is_last_part) ? "Last Flashrom" : "Flashrom", "Part", flashrom_info.part_number, "- Bytes Sent:", flashrom_info.byte_progress + flashrom_info.part_total_size, "of", flashrom_info.total_parts_size, "(" + flashrom_info.percent_complete + " % complete)");
		// read current part display message from part header
		flashrom_info.message = new Buffer.from(part_header.toString('hex').substring(36 * 2, 68 * 2), 'hex').toString('ascii').replace(/[^0-9a-z\ \.\-]/gi, "");
		flashrom_info.rompath = `wtv-flashrom:/${path}`;

		if (flashrom_info.is_last_part && this.bf0app_update) {
			flashrom_info.next_rompath = null;
		} else if (flashrom_info.is_last_part && !this.bf0app_update) {
			flashrom_info.next_rompath = "wtv-flashrom:/lc2-download-complete?";
		} else {
			flashrom_info.next_part_number = this.formatPartNum(flashrom_info.part_number + 1);
			flashrom_info.next_rompath = flashrom_info.rompath.replace("part" + this.formatPartNum(flashrom_info.part_number), "part" + flashrom_info.next_part_number);
		}
		return flashrom_info;
	}

	async sendToClient(data, request_path, callback) {
		var headers = "200 OK\n";
		var flashrom_info = this.getFlashromInfo(data, request_path)
		if (flashrom_info.is_bootrom) headers += "Content-Type: binary/x-wtv-bootrom"; // maybe?
		else headers += "Content-Type: binary/x-wtv-flashblock";
		if (flashrom_info.next_rompath != null && this.bf0app_update) headers += "\nwtv-visit: " + flashrom_info.next_rompath;
		callback(data, headers);
	}

	async getFlashromMeta(request_path, callback) {
		// read 512 bytes of rom, and send result of getFlashromInfo
		// to callback (in data), without headers
		this.getFlashRom(request_path, callback, 512);
    }

	async getFlashRom(request_path, callback, length = 0) {
		var headers, flashrom_file_path = null;
		var self = this;
		Object.keys(self.service_vaults).forEach(function (g) {
			if (flashrom_file_path != null) return;
			flashrom_file_path = self.service_vaults[g] + "/" + self.service_name + "/" + request_path;
			if (!self.fs.existsSync(flashrom_file_path)) flashrom_file_path = null;
		});
		if (this.use_zefie_server && !flashrom_file_path) {
			// get flashrom files from archive.midnightchannel.net
			var options = {
				host: "archive.midnightchannel.net",
				path: "/zefie/files/wtv-flashrom/" + request_path,
				timeout: 5000,
				method: 'GET'
			}
			if (length > 0) {
				options.headers = {
					'Range': 'bytes=0-' + length
				}
			}

			const req = this.https.request(options, function (res) {
				var data_hex = '';
				res.setEncoding('hex');

				res.on('data', d => {
					data_hex += d;
				})

				res.on('end', function () {
					if (self.minisrv_config.config.debug_flags.debug) console.log(` * Zefie's FlashROM Server HTTP Status: ${res.statusCode} ${res.statusMessage}`)
					if (res.statusCode == 200) {
						var data = Buffer.from(data_hex, 'hex');
					} else if (res.statusCode == 206) {
						var data = self.getFlashromInfo(Buffer.from(data_hex, 'hex'), request_path);
					} else if (res.statusCode == 404) {
						console.log(request_path);
						var errpage = self.wtvshared.doErrorPage(404, "The service could not find the requested ROM on zefie's server.")
						headers = errpage[0];
						var data = errpage[1];
					} else {
						var errpage = self.wtvshared.doErrorPage(400)
						headers = errpage[0];
						var data = errpage[1];
					}
					if (!headers && res.statusCode != 206) {
						self.sendToClient(data, request_path, callback);
					} else {
						callback(data, headers);
					}
				});
			});
			req.end();
		} else {
			this.doLocalFlashROM(flashrom_file_path, request_path, callback, ((length != 0) ? true : false));
		}
	}
}

module.exports = WTVFlashrom;