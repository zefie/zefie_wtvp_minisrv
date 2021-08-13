# wtv minisrv node.js

The ***wtv minisrv***, or "***zefie_wtvp_minisrv***" project is a node.js project that provides a mini WebTV Server, aiming for full WTVP (WebTV Protocol) support.
This open source server is in beta status. Use at your own risk.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

### Current status:
- Supports most known WebTV service encryption scenarios, for full trusted box access
- Can handle client "relogin" and "reconnect" events
- Suports `.js` service files with synchronous or asynchronous requests
- Supports multiple simultaneous users
- WebTV-compatible HTTP(S) Proxy (via minisrv, or using an external proxy for enhanced features (such as [WebOne](https://github.com/atauenis/webone))
- WebTV cookie support (wtv-cookie) for HTTP(s)
- Flashrom flashing support for all known units (including bf0app 'Old Classic')
- Can flash anything on [Ultra Willies](https://wtv.zefie.com/willie.php) with optional `use_zefie_server` flag set on `wtv-flashrom` service.
- `wtv-disk:/sync` for Download-o-Rama style file downloading
- Custom Tellyscripts *(not yet customizable though)*
- Flat file client session store and registration system
- wtv-lzpf compression support by eMac (99.9%)

### Current issues:
- Mis-configuring wtv-disk:/sync DiskMaps may cause units to delete contents of partitions (need more info)

### Won't fix:
- wtv-encryption stream breaks when two different sessions have the same SSID (eg spoofing, won't fix (production did it too))
- ~~No intentions to support user accounts, registration, or any form of database system~~ *(I guess this was a lie, but we still don't use a database!)*

### Feature Todo:
- wtv-setup and bgm support
- TellyScript generation and/or manipulation without external dependancies
- ~~wtv-cookie full support~~ ***Done [v0.9.13](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.13)***
- ~~Flashrom flashing for bf0app old classic~~ ***Done [v0.9.9](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.9)***
- ~~SSID/IP black/whitelisting (including tying SSID to an IP or multiple IPs)~~ ***Done [v0.9.4](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.4)***
- ~~Flashrom flashing functionality (at least for LC2 and higher)~~ ***Done [v0.8.0](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.8.0)***
- ~~Implement HTTP proxy (needs to be able to defluff most of the web, think retro WAP converter)~~ ***Done [v0.7.1](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.7.1)***

### How To Use:
- Install [node.js](https://nodejs.org/en/download/). Be sure to say `Yes` when asked about `Chocolatey`.
- Download a snapshot (either of master, or of any commit/branch/relase/tag etc)
- Extract zip somewhere and enter that directory with a command prompt
- Enter `zefie_wtvp_minisrv` subdirectory
- Verify you are in the same directory as `app.js`, then run `npm install`
- Check any configuration. Create your override `user_config.json`. Especally `service_ip`. See [user_config_README.md](user_config_README.md) and [user_config.example.json](zefie_wtvp_minisrv/user_config.example.json) for more information.
  - **Note:** The intended use is for all custom config to be in `user_config.json` and any custom service files to go in `UserServiceVault`.  If you do not care about potential issues with future `git pull`, and will manually add new upstream `config.json` entries, you could use the standard `ServiceVault` and `config.json`
- Run `node app.js`
- If you have trouble running it on Windows, try a Linux machine, Windows may need a full development enviroment or extra steps.
- Test with a WebTV Viewer or connect with a real box
- To connect with a real box, you will need to open ports in your firewall and have a way to connect your WebTV (and preferably reroute 10.0.0.1 to the server)
- See [ServiceVault.md](ServiceVault.md) for a brief introduction to how the service files work

### How to Support the Project
- [Report Bugs](https://github.com/zefie/zefie_wtvp_minisrv/issues)
- [Add a Feature and send a Pull Request](https://github.com/zefie/zefie_wtvp_minisrv/pulls)
- Write and submit better documentation than I created (see Pull Request above)
- [Support financially on Patreon](https://www.patreon.com/zefie)
