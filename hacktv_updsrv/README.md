# wtv minisrv node.js

The ***wtv minisrv***, or "***hacktv_updsrv***" project is an ambitious node.js project to have a mini WebTV server that supports wtv-encryption for advanced level access.

This open source server is not yet ready for public use, but is available for anyone wanting to try to help advance it.

Current status:
- Can encrypt and decrypt SECURE ON and arbitrary encrypted data
- Can handle psuedo encryption (box sends SECURE ON but does not encrypt)
- Can handle client "relogin" and "reconnect" events

Current issues:
- Probably can't handle more than one box at a time
- Power cycling box and re-connecting via ConnectSetup may invalidate encryption until server is restarted
- wtv-update:/update does not yet function as intended

Feature Todo:
- Test and enable flashrom flashing functionality (at least for LC2 and higher)
- Proper wtv-star (generic service error page) support.
- (maybe) implement HTTP proxy (needs to be able to defluff most of the web, think retro WAP converter)
- (maybe) enable "internet mode" (let user outside of minisrv)
- (maybe) wtvchat stuff
- (probably not) url tokenizer