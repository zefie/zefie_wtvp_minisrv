class WTVGuide {
	minisrv_config = null;
	session_data = null;
	wtvshared = null;
	runScriptInVM = null;
	fs = require('fs');

	constructor(minisrv_config, session_data, socket, runScriptInVM) {
		if (!minisrv_config) throw ("minisrv_config required");
		if (!session_data) throw ("WTVClientSessionData required");
		var WTVShared = require('./WTVShared.js')['WTVShared'];
		this.minisrv_config = minisrv_config;
		this.session_data = session_data;
		this.wtvshared = new WTVShared(minisrv_config);
		this.runScriptInVM = runScriptInVM;
	}

	unloadModule(moduleName) {
		// for handling template classes
		var solvedName = require.resolve(moduleName),
			nodeModule = require.cache[solvedName];
		if (nodeModule) {
			for (var i = 0; i < nodeModule.children.length; i++) {
				var child = nodeModule.children[i];
				deleteModule(child.filename);
			}
			delete require.cache[solvedName];
		}
	}

	generatePage(topic, subtopic, page = null) {
		// sanitize a bit

		var template = null;
		var template_args = null;
		var data = false;

		switch (topic.toLowerCase()) {
			case "glossary":
				var template = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + "/wtv-guide/templates/glossary.js");
				var glossary_datafile = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + "/wtv-guide/glossary.json");
				if (!this.fs.existsSync(template)) break;
				if (!this.fs.existsSync(glossary_datafile)) break;

				var glossary = JSON.parse(this.fs.readFileSync(glossary_datafile));
				if (glossary[subtopic.toUpperCase()]) {
					if (page) {
						// glossary word
						if (glossary[subtopic.toUpperCase()][page.toLowerCase()]) {
							var word = glossary[subtopic.toUpperCase()][page.toLowerCase()].word;
							var definition = glossary[subtopic.toUpperCase()][page.toLowerCase()].definition;
							// replace <word>the word</word> with a nice convienent link
							var search = "<word";
							while (definition.indexOf(search) >= 0) {
								var link_word_for_link, link_word_start_letter, link_word_override = null;
								var original_start, end = 0;
								var start = definition.indexOf(search) + search.length;
								original_start = start;
								// handle <word="whatever">
								console.log("start:", start)
								console.log("debug > position:", definition.substr(start, 1));
								if (definition.substr(start, 1) != ">") {
									console.log("debug: detecting word in tag")
									start++; // +1 to skip =
									end = definition.indexOf(">", start);
									console.log("debug > position 2:", definition.indexOf(">", start));
									link_word_override = definition.substring(start, end);
									// strip any quotes
									if (link_word_override.substr(0, 1).match(/[\"\']/)) link_word_override = link_word_override.substring(1);
									if (link_word_override.substr(link_word_override.length - 1, 1).match(/[\"\']/)) link_word_override = link_word_override.substr(0, link_word_override.length - 1);

									link_word_for_link = link_word_override.replace(/ /g, '').replace(/\'/g, '').replace(/\"/g, '').toLowerCase();
									link_word_start_letter = link_word_for_link.substr(0, 1).toUpperCase();
									start = end + 1; // update start pos for rest of processing
								} else {
									console.log("debug: generating word")
									start++;
								}
								console.log("end:", end)
								end = definition.indexOf("</word>", start);
								var link_word = definition.substring(start, end);
								if (!link_word_for_link) link_word_for_link = link_word.replace(/ /g, '').replace(/\'/g,'').replace(/\"/g,'').toLowerCase();
								if (!link_word_start_letter) link_word_start_letter = link_word.substr(0, 1).toUpperCase();
								if (!link_word_override) link_word_override = link_word;

								var link = `wtv-guide:/help?topic=Glossary&subtopic=${link_word_start_letter}&page=${link_word_for_link}&word=${encodeURIComponent(link_word_override)}`
								var new_definition = definition.substring(0, original_start - search.length) + `<a href="${link}">${link_word}</a>` + definition.substring(end + 7);
								console.log("start:", start)
								console.log("end:", end)
								console.log("link_word:", link_word)
								console.log("link_word_for_link:", link_word_for_link);
								console.log("link_word_start_letter:", link_word_start_letter);
								console.log("link:", link)
								console.log("new_definition:", new_definition)
								definition = new_definition;
							}
							// replaces <boxname> with the friendly name of the type of unit the user has
							while (definition.indexOf("<boxname>") >= 0) {
								var romtype = this.session_data.get("wtv-client-rom-type");
								var boxname = "";
								if (romtype == "US-WEBSTAR-disk-0MB-16MB-softmodem-CPU5230" || romtype == "US-DTV-disk-0MB-32MB-softmodem-CPU5230") boxname = "satellite receiver"
								else if (this.session_data.hasCap("client-has-tv-experience")) boxname = "WebTV Plus receiver";
								else boxname = "WebTV Internet terminal";
								definition = definition.replace(/\<boxname\>/g, boxname);
							}
							// replaces <boxname_plus> with either "WebTV" or "WebTV Plus" depending on user box type
							while (definition.indexOf("<boxname_plus>") >= 0) {
								var boxname = "WebTV";
								if (this.session_data.hasCap("client-has-tv-experience")) boxname += " Plus";
								definition = definition.replace(/\<boxname\_plus\>/g, boxname);
							}
							// replaces <webhome> with either "Home" or "Web Home" depending on user box type
							while (definition.indexOf("<webhome>") >= 0) {
								var homename = "Home";
								if (this.session_data.hasCap("client-has-tv-experience")) homename = "Web " + homename;
								definition = definition.replace(/\<webhome\>/g, homename);
							}
							template_args = {
								minisrv_config: this.minisrv_config,
								word: word,
								definition: definition
							}
						}
					} else {
						// glossary letter word index
						var template = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + "/wtv-guide/templates/glossary_word_index.js");
						var isPlusBox = false;
						if (this.session_data.hasCap("client-has-tv-experience")) isPlusBox = true;
						var worddb = [];
						Object.keys(glossary[subtopic.toUpperCase()]).forEach(function (k) {
							if (glossary[subtopic.toUpperCase()][k].plusonly && !isPlusBox) return;
							var thisword = glossary[subtopic.toUpperCase()][k];
							thisword.link = k;
							worddb.push(thisword);
                        })

						template_args = {
							minisrv_config: this.minisrv_config,
							letter: subtopic.toUpperCase(),
							words: worddb
                        }
                    }
				}
				if (template) break;

			case "index":
				switch (subtopic.toLowerCase()) {
					case "glossary":
						var template = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + "/wtv-guide/templates/glossary_index.js");
						console.log(template);
						var glossary_datafile = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + "/wtv-guide/glossary.json");
						if (!this.fs.existsSync(template)) break;
						if (!this.fs.existsSync(glossary_datafile)) break;

						var glossary = JSON.parse(this.fs.readFileSync(glossary_datafile));
						var letters = [];
						Object.keys(glossary).forEach(function (k) { letters.push(k); });
						template_args = {
							minisrv_config: this.minisrv_config,
							letters: letters
						}
				}
				if (template) break;


			default:
				// fallback to old js file method
				try {
					var prerendered = null;
					if (!page) prerendered = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + "/wtv-guide/prerendered/" + topic + "/" + subtopic + ".js");
					else prerendered = this.wtvshared.getAbsolutePath(this.minisrv_config.config.ServiceDeps + "/wtv-guide/prerendered/" + topic + "/" + subtopic + "/" + page + ".js");

					if (!this.fs.existsSync(prerendered)) break;


					var prerendered_jscode = this.fs.readFileSync(prerendered);
					if (!prerendered_jscode) break;
					prerendered_jscode = prerendered_jscode.toString('ascii');
					var contextObj = {
						"session_data": this.session_data
					}
					var vmResult = this.runScriptInVM(prerendered_jscode, contextObj);
					if (vmResult.data) return vmResult.data;
				} catch (e) {
					console.log(e);
                }
				break;

		}
		if (template && template_args) {
			if (!data) {
				var WTVTemplate = require(template); // load template class
				try {
					var wtvt = new WTVTemplate(template_args); // initialize template with our args
					data = wtvt.getTemplatePage(); // execute template function
				} catch (e) {
					console.log(" * wtv-template error:", e)
				}
				// unload and clean up module
				this.unloadModule(template);
			}

			// return generated page
			return data;
		} else return false;
	}
}

module.exports = WTVGuide;