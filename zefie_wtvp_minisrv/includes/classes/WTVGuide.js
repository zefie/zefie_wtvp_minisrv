class WTVGuide {
	minisrv_config = null;
	session_data = null;
	wtvshared = null;
	runScriptInVM = null;
	fs = require('fs');

	constructor(minisrv_config, session_data, socket, runScriptInVM) {
		if (!minisrv_config) throw ("minisrv_config required");
		if (!session_data) throw ("WTVClientSessionData required");
		const WTVShared = require("./WTVShared.js")['WTVShared'];
		this.minisrv_config = minisrv_config;
		this.session_data = session_data;
		this.wtvshared = new WTVShared(minisrv_config);
		this.runScriptInVM = runScriptInVM;
	}

	generatePage(topic, subtopic, page = null) {
		// sanitize a bit

		var template = null;
		var template_args = null;
		var data = false;

		switch (topic.toLowerCase()) {
			case "alerts":
				// Handle error alert pages using Nunjucks templates
				var template = this.wtvshared.getTemplate("wtv-guide", "templates/NunjucksTemplate.js", true);
				if (this.fs.existsSync(template)) {
					// Map error names to template files
					var errorTemplateMap = {
						"forbidden": topic + "/Forbidden.njk",
						"hostmissing": topic + "/HostMissing.njk",
						"internalservererror": topic + "/InternalServerError.njk",
						"notfound": topic + "/NotFound.njk",
						"serviceunavailable": topic + "/ServiceUnavailable.njk"
					};

					var templateName = errorTemplateMap[subtopic.toLowerCase()];
					if (templateName) {
						template_args = {
							template_name: templateName,
							minisrv_config: this.minisrv_config,
							session_data: this.session_data
						};
					}
				}
				if (template) break;

			case "glossary":
				var template =this.wtvshared.getTemplate("wtv-guide", "templates/glossary.js", true);
				var glossary_datafile =this.wtvshared.getTemplate("wtv-guide", "glossary.json", true);
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
							while (start = definition.indexOf(search), start >= 0) {
								var link_word_for_link = null;
								var link_word_start_letter = null;
								var link_word_override = null;
								var original_start, end = 0;
								var start = start + search.length;
								original_start = start;
								// handle <word="whatever">
								if (definition.charAt(start) != ">") {
									start++; // +1 to skip =
									end = definition.indexOf(">", start);
									if (end === -1) break; // malformed tag, exit loop
									link_word_override = definition.slice(start, end);
									// strip any quotes
									if (link_word_override.length > 0 && link_word_override.charAt(0).match(/[\"\']/)) link_word_override = link_word_override.slice(1);
									if (link_word_override.length > 0 && link_word_override.charAt(link_word_override.length - 1).match(/[\"\']/)) link_word_override = link_word_override.slice(0, link_word_override.length - 1);

									link_word_for_link = link_word_override.replace(/ /g, '').replace(/\'/g, '').replace(/\"/g, '').toLowerCase();
									if (link_word_for_link.length > 0) link_word_start_letter = link_word_for_link.charAt(0).toUpperCase();
									start = end + 1; // update start pos for rest of processing
								} else {
									start++;
								}
								end = definition.indexOf("</word>", start);
								if (end === -1) break; // malformed tag, exit loop
								var link_word = definition.slice(start, end);
								if (!link_word_for_link) link_word_for_link = link_word.replace(/ /g, '').replace(/\'/g,'').replace(/\"/g,'').toLowerCase();
								if (!link_word_start_letter && link_word_for_link.length > 0) link_word_start_letter = link_word_for_link.charAt(0).toUpperCase();
								if (!link_word_override) link_word_override = link_word;

								var link_url = `wtv-guide:/help?topic=Glossary&subtopic=${link_word_start_letter}&page=${link_word_for_link}&word=${encodeURIComponent(link_word_override)}`
								var new_definition = definition.slice(0, original_start - search.length) + `<a href="${link_url}">${link_word}</a>` + definition.slice(end + 7);
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
						var template =this.wtvshared.getTemplate("wtv-guide", "templates/glossary_word_index.js", true);
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
						var template =this.wtvshared.getTemplate("wtv-guide", "templates/glossary_index.js", true);
						var glossary_datafile =this.wtvshared.getTemplate("wtv-guide", "glossary.json", true);
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
					if (!page) prerendered = this.wtvshared.getTemplate("wtv-guide", "prerendered/" + topic + "/" + subtopic + ".js", true);
					else prerendered =this.wtvshared.getTemplate("wtv-guide", "prerendered/" + topic + "/" + subtopic + "/" + page + ".js", true);

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
				this.wtvshared.unloadModule(template);
			}

			// return generated page
			return data;
		} else return false;
	}
}

module.exports = WTVGuide;