# wtv minisrv node.js

The ***wtv minisrv***, or "***zefie_wtvp_minisrv***" project is a node.js project that provides a mini WebTV Server, aiming for full WTVP (WebTV Protocol) support.
This open source server is in alpha status. Use at your own risk.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

### Current status:
- Supports most known WebTV service encryption scenarios, for full trusted box access
- Can handle client "relogin" and "reconnect" events
- Suports `.js` service files with synchronous or asynchronous requests
- Supports multiple simultaneous users
- WebTV-compatible HTTP Proxy (via minisrv, or using an external proxy for enhanced features (such as [WebOne](https://github.com/atauenis/webone))
- wtv-flashrom for LC2 and newer boxes (bf0app unsupported, need test unit)
- Can flash anything on [Ultra Willies](https://wtv.zefie.com/willie.php) with optional `use_zefie_server` flag set on `wtv-flashrom` service.
- wtv-update:/sync for Download-o-Rama style file downloading

### Current issues:
- HTTPS Proxying untested, likely needs SSL spoofing with self-signed solution

### Won't fix:
- wtv-encryption stream breaks when two different sessions have the same SSID (eg spoofing, won't fix (production did it too))
- No intentions to support user accounts, registration, or any form of database system

### Feature Todo:
- ~~(maybe) implement HTTP proxy (needs to be able to defluff most of the web, think retro WAP converter)~~ ***Done***
- ~~(maybe) enable "internet mode" (let user outside of minisrv)~~ ***Done***
- ~~Flashrom flashing functionality (at least for LC2 and higher)~~ ***Done***
- Flashrom flashing for bf0app old classic (need donor unit)
- SSID/IP black/whitelisting (including tying SSID to an IP or multiple IPs)
- wtv-lzpf support
- (maybe) Proper wtv-star (generic service outage page) support (maybe useful for allowing a unit to multiple sub-minisrvs).
- (maybe) wtvchat stuff
- (probably not) url tokenizer (eg wtv-token-blabla, was mostly to secure service URLs from unintended access, which this server does not aim to do)

### How To Use:
- Install [node.js](https://nodejs.org/en/download/). Be sure to say `Yes` when asked about `Chocolatey`.
- If you have trouble running it on Windows, try a Linux machine, Windows may need a full development enviroment or extra steps.
- Download a snapshot (either of master, or of any commit/branch/relase/tag etc)
- Extract zip somewhere and enter that directory with a command prompt
- Enter `zefie_wtvp_minisrv` subdirectory
- Verify you are in the same directory as `app.js`, then run `npm install`
- Check any configuration, and modify to your liking. Especally `service_ip` (config can be found in `services.json`)
- Run `node app.js`
- Test with a WebTV Viewer or connect with a real box
- To connect with a real box, you will need to open ports in your firewall and have a way to connect your WebTV (and preferably reroute 10.0.0.1 to the server)
- See [ServiceVault.md](ServiceVault.md) for a brief introduction to how the service files work
