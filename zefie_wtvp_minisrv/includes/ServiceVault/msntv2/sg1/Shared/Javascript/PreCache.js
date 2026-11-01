window.attachEvent("onload", PreCacheOnload);

function PreCacheOnload()
{
	// Give the page a chance to draw anything modified from the normal onload handler
	window.setTimeout(PreCacheStart, 100);
}

function PreCacheStart()
{
	// Look for <LINK rel=next href=...>
	var linkTags = document.all.tags("link");
	if (linkTags) {
		var len = linkTags.length;
		for (var i = 0; i < len; i++) {
			var tag = linkTags[i];
			if (tag.rel && tag.rel == "next" && tag.href) {
				var request = new ActiveXObject("Microsoft.XMLHTTP");
				try {
					request.open("GET", tag.href, true);
					request.send();
				}
				catch(exception) {
				}
			}
		}
	}
}

