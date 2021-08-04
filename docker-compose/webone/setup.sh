#!/bin/bash
get_latest_release() {
  curl --silent "https://api.github.com/repos/$1/releases/latest"
}

debfile=$(get_latest_release atauenis/webone | \
grep "browser_download_url" | \
grep "amd64" | \
grep "deb" | \
sed -E 's/.*"([^"]+)".*/\1/')

if [ ! -z "${debfile}" ]; then
	curl --silent -L "${debfile}" -o /tmp/webone.deb
	if [ ! -f /bin/systemctl ]; then
		# Create dummy systemctl
		touch /bin/systemctl
		chmod +x /bin/systemctl
	fi
	apt-get install --yes /tmp/webone.deb
	rm /tmp/webone.deb
fi
