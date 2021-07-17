# wtv minisrv node.js

The ***wtv minisrv***, or "***hacktv_updsrv***" project is a node.js project that provides a mini WebTV Server, with wtv-encryption support for advanced level box access.

This open source server is in alpha status. Use at your own risk.

### Current status:
- Can encrypt and decrypt SECURE ON and arbitrary encrypted data
- Can handle psuedo encryption (box sends SECURE ON but does not encrypt)
- Can handle client "relogin" and "reconnect" events
- Can now use `.async.js` files with asynchronous requests
- Can handle more than one box at a time
- Support for HTTP Proxy (direct, or enhanced with an external proxy such as [WebOne](https://github.com/atauenis/webone))

### Current issues:
- May not run on non-development Windows machines (VS2019 with node and python)
- Breaks when two different boxes have the same SSID (spoofing, won't fix (production did it too))
- Power cycling box and re-connecting via ConnectSetup may invalidate encryption until server is restarted
- wtv-update:/update does not yet function as intended

### Feature Todo:
- Test and enable flashrom flashing functionality (at least for LC2 and higher)
- (maybe) Proper wtv-star (generic service outage page) support (maybe useful for allowing a unit to multiple sub-minisrvs).
- (maybe) implement HTTP proxy (needs to be able to defluff most of the web, think retro WAP converter)
- (maybe) enable "internet mode" (let user outside of minisrv)
- (maybe) wtvchat stuff
- (probably not) url tokenizer

### How To Use:
- Install [node.js](https://nodejs.org/en/download/). Be sure to say `Yes` when asked about `Chocolatey`.
- If you have trouble running it on Windows, try a Linux machine, Windows may need a full development enviroment or extra steps.
- Download a snapshot (either of master, or of any commit/branch/relase/tag etc)
- Extract zip somewhere and enter that directory with a command prompt
- Enter `hacktv_updsrv` subdirectory
- Verify you are in the same directory as `app.js`, then tun `npm install`
- Check any configuration (services.json)
- Run `node app.js`
- Test with a WebTV Viewer or connect with a real box
- To connect with a real box, you will need to open ports in your firewall and have a way to connect your WebTV (and preferably reroute 10.0.0.1 to the server)
