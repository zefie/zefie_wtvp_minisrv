// no wildcard (yet?)
const groups_to_sync = [
	"webtv.users"
]



const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
var classPath = __dirname + "/includes/";
const { WTVShared } = require(classPath + "WTVShared.js");
const wtvshared = new WTVShared(); // creates minisrv_config
classPath = wtvshared.getAbsolutePath(classPath, __dirname);
const minisrv_config = wtvshared.getMiniSrvConfig();
const WTVNews = require(classPath + "/WTVNews.js");
const WTVNewsServer = require(classPath + "/WTVNewsServer.js");
var data_path = wtvshared.getAbsolutePath(minisrv_config.config.SessionStore + '/minisrv_internal_nntp');
const service_name = "wtv-news";

if (!minisrv_config.services[service_name].upstream_address) {
	console.error("minisrv config not configured with usenet upstream");
	process.exit(1);
}

if (!minisrv_config) {
	console.error("Something went wrong loading minisrv config");
	process.exit(1);
}

if (!minisrv_config.config.debug_flags.quiet) console.log(" *** Successfully read minisrv configuration....");


const service_config = minisrv_config.services[service_name];
const wtvnewsserver = new WTVNewsServer(minisrv_config, minisrv_config.services['wtv-news'].local_server_port, false, null, null, false);

const wtvnews = new WTVNews(minisrv_config, service_name);

if (service_config.upstream_auth) {
	wtvnews.initializeUsenet(service_config.upstream_address, service_config.upstream_port, service_config.upstream_tls || null, service_config.upstream_auth.username || null, service_config.upstream_auth.password || null);
} else {
	wtvnews.initializeUsenet(service_config.upstream_address, service_configupstream_port, service_config.upstream_tls || null);
}



function verifyMessage(group, articleNumber, article) {
	var g = wtvnewsserver.getGroupPath(group);
	var file = g + path.sep + articleNumber + ".newz";
	if (!fs.existsSync(file)) return false;
	var old_data = fs.readFileSync(file);
	var new_data = JSON.stringify(article.article);

	var old_data_hash = crypto.createHash('md5').update(old_data).digest("hex");
	var new_data_hash = crypto.createHash('md5').update(new_data).digest("hex");
	return (old_data_hash === new_data_hash);
}

function deleteMissing(group, articles) {
	var g = wtvnewsserver.getGroupPath(group);
	try {
		fs.readdirSync(g).forEach(file => {
			var articleNumber = parseInt(file.split('.')[0]);
			file = g + path.sep + file;
			if (!articles.find(e => (e == articleNumber))) {
				console.log(" * ", group, "article", articleNumber, "deleted from upstream, removing locally")
				fs.rmSync(file);
			}
		});
		return true;
	} catch (e) {
		console.log(e);
		return false;
	}
}

wtvnews.connectUsenet().then((res) => {
	if (res) {
		groups_to_sync.forEach((group) => {
			console.log(group);
			wtvnews.selectGroup(group).then((res) => {
				var range = {
					start: res.group.low,
					end: res.group.high
				}
				wtvnews.listGroup(group, null, null, range).then((res) => {
					if (res.group.articleNumbers) {
						var promises = [];
						wtvnewsserver.createGroup(group);
						var meta = wtvnewsserver.getMetadata(group);
						meta.last_article_id = res.group.high;
						wtvnewsserver.saveMetadata(group, meta);
						//deleteMissing(group, res.group.articleNumbers)
						res.group.articleNumbers.forEach((article) => {
							promises.push(new Promise((resolve, reject) => {
								wtvnews.getArticle(article, false).then((message) => {
									res = wtvnewsserver.createArticle(group, article, message);
									if (res) {
										if (res == "exists") {
											console.log(" * ", group, "article", article, "already exists")
										} else {
											console.log(" * Created", group, "article", article, res)
										}
										resolve(true)
									} else {
										console.log(" ! Failed to create file for ", group, "article", article, "with error", res);
										resolve(false)
									}
								});
							}));
						})
						Promise.all(promises).then(() => {
							wtvnews.quitUsenet();
							process.exit(0);
						});
					} else {
						wtvnews.quitUsenet();
					}
                })
			});
        })
    }
});
