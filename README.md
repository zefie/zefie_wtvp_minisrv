# wtv minisrv node.js

The ***wtv minisrv***, or "***zefie_wtvp_minisrv***" project is a WebTV Server written in node.js.
The project aims to provides an easy-to-use WebTV Server, with full WTVP (WebTV Protocol) support.
This open source server is in beta status. Use at your own risk.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

### Current status:
- DB-less flat file client session store and registration system
- Supports multiple simultaneous users
- Supports all known WebTV service encryption scenarios, for full trusted box access
- Supports nearly all WebTV clients (still some issues with early alpha builds)
- Suports `.js` service files with synchronous or asynchronous requests
- Supports `.cgi` and/or `.php` scripts via CGI system
- WebTV-compatible HTTP(S) Proxy (via minisrv, or using an external proxy for enhanced features (such as [WebOne](https://github.com/atauenis/webone))
- WebTV cookie support (wtv-cookie) for HTTP(s)
- [ProtoWeb](https://protoweb.org/) Support via `proto://`
- Flashrom flashing support for all known units (including bf0app 'Old Classic')
- Can flash anything on [Ultra Willies](https://wtv.zefie.com/willie.php) with optional `use_zefie_server` flag set on `wtv-flashrom` service.
- `wtv-disk:/sync` for Download-o-Rama style file downloading
- Custom Tellyscript Generation
- wtv-lzpf compression support by eMac (99.9%)
- wtv-favorites support
- wtv-news support (WIP)
- wtv-mail (within same server only)
- "PC Services" (node express with minisrv custom script processing)
- "ViewerGen" Generate "WebTV Viewer" (Windows WebTV Sim) with unique SSIDs

### Feature Todo:
- Finish wtv-news, complete with upstream integration support (cross-minisrv usenet)
- Finish wtv-guide
- Finish Scrapbook
- Polish account transfer system (#16)
- MAYBE: Create proper web-slimming proxy (WTVProxy.js?)
- ~~TellyScript generation and/or manipulation without external dependancies~~ ***Done [v0.9.60](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.60)***
- ~~Add wtv-author (Pagebuilder)~~ ***Done [v0.9.59](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.59)***
- ~~wtv-setup and bgm support~~ ***Done [v0.9.23](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.23)***
- ~~wtv-cookie full support~~ ***Done [v0.9.13](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.13)***
- ~~Flashrom flashing for bf0app old classic~~ ***Done [v0.9.9](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.9)***
- ~~SSID/IP black/whitelisting (including tying SSID to an IP or multiple IPs)~~ ***Done [v0.9.4](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.9.4)***
- ~~Flashrom flashing functionality (at least for LC2 and higher)~~ ***Done [v0.8.0](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.8.0)***
- ~~Implement HTTP proxy (needs to be able to defluff most of the web, think retro WAP converter)~~ ***Done [v0.7.1](https://github.com/zefie/zefie_wtvp_minisrv/releases/tag/v0.7.1)***

### How To Use:
- Install [node.js](https://nodejs.org/en/download/) v16 or newer. If on Windows, be sure to say `Yes` when asked about `Chocolatey`.
- Install git (if on Windows, install from [Git for Windows](https://gitforwindows.org/)
- Clone the repository
- Enter `zefie_wtvp_minisrv` subdirectory
- Enter `zefie_wtvp_minisrv` subdirectory again (there are 2 after a git clone)
- Verify you are in the same directory as `app.js`, then run `npm install`
- Check any configuration. Create your override `user_config.json`. Especally `service_ip`. See [user_config_README.md](user_config_README.md) and [user_config.example.json](zefie_wtvp_minisrv/user_config.example.json) for more information.
  - **Note:** The intended use is for all custom config to be in `user_config.json` and any custom service files to go in `UserServiceVault`.  If you do not care about potential issues with future `git pull`, and will manually add new upstream `config.json` entries, you could use the standard `ServiceVault` and `config.json`
- Run `npm start`
- Test with a WebTV Viewer, MAME, or connect with a real box

### Customization:
- See [ServiceVault.md](ServiceVault.md) for a brief introduction to how the service files work

### Connection notes:
- To connect with a real box, you will need to open ports in your firewall and have a way to connect your WebTV (and preferably reroute 10.0.0.1 and 10.0.128.1 to the server)
- To connect with MAME you will need to set up [touchppp](https://github.com/wtvemac/touchppp) (I recommend an Alpine Linux VM).
- Most WebTV connection scenarios can handle a PPP session that doesn't require authentication. However flashing ROMs on the bf0app Old Classic REQUIRES the server accept PPP auth, and the auth must be valid.
- Configuring firewalls and real boxes is outside the scope of this guide, but there are plenty of enthusiasts on the [WebTV Discord](https://zef.pw/wtvdiscord) that will likely help you.

### How to Support the Project
- [Report Bugs](https://github.com/zefie/zefie_wtvp_minisrv/issues)
- [Add a Feature and send a Pull Request](https://github.com/zefie/zefie_wtvp_minisrv/pulls)
- Write and submit better documentation than I created (see Pull Request above)
- **Content Creators**: Shout out this project, and my YouTube Channel (https://www.youtube.com/zefievideo)
- Financially Support:
   - **Companies**: Reach out to biz@zefie.net to sponsor this project
   - [Subscribe on Patreon](https://www.patreon.com/zefie)
   - One-Time Support: 
      - [CashApp $altimit](https://cash.app/$altimit)
      - Chime: $zefie
      - [Credit Card or PayPal (powered by StreamElements)](https://zef.pw/ttv-tip)