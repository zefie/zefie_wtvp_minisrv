const net = require('net');
const dns = require('dns');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const { get } = require('http');
const WTVShared = require('./WTVShared.js').WTVShared;

class WTVIRC {
    /*
        * @constructor
        * @class WTVIRC
        * zefIRCd - A node.js IRC server implementation
        * Tested with WebTV, KvIRC and mIRC.
        * Supports unencrypted and encrypted (SSL) connections on the same port.
        * It supports basic commands like NICK, USER, JOIN, PART, PRIVMSG, NOTICE, TOPIC, AWAY, MODE, KICK, and PING.
        * Basic IRCOp functionality is included.
        * hybridircd compatible server link protocol (tested with Anope IRC Services, and partially with hybridircd itself).
        * Channel modes are supported, including invite-only, topic protection, password protection, and user modes (op/halfop/voice), and more.
        * SSL only channel mode +Z is supported. As is usermode +Z (no DMs from non-SSL users)
        * 
        * TODO: Test for crashes with arbitrary data, or malformed commands (especially SSL handshake, or server interface).
        * 
        * @param {Object} minisrv_config - The configuration object for minisrv.
        * @param {string} [host='localhost'] - The host to bind the IRC server to.
        * @param {number} [port=6667] - The port to bind the IRC server to.
        * @param {boolean} [debug=false] - Whether to enable debug mode for logging.
    */ 
    constructor(minisrv_config, host = 'localhost', port = 6667, debug = false) {
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        this.version = '0.2.7';
        // Try to get git commit from environment variable or file, fallback to null if not available
        this.git_commit = this.getGitRevision();
        if (this.git_commit) {
            this.version += `-${this.git_commit}`;
        }
        this.host = host;
        this.port = port;
        this.debug = debug;
        this.server = null;
        this.clients = [];
        this.channelData = new Map();
        this.usernames = new Map(); // nickname -> username
        this.usertimestamps = new Map(); // nickname -> timestamp since last message
        this.usermodes = new Map(); // nickname -> Array of modes (e.g. ['w', 'i'])
        this.usersignontimestamps = new Map(); // nickname -> timestamp since user signed on
        this.nicknames = new Map(); // socket -> nickname
        this.awaymsgs = new Map(); // nickname -> away message        
        this.servers = new Map(); // socket -> server information
        this.serverusers = new Map(); // server -> Set of users connected to this server
        this.reservednicks = [];
        this.klines = [];
        this.accounts = new Map(); // nickname -> account name
        this.hostnames = new Map(); // nickname -> hostname
        this.realhosts = new Map(); // nickname -> real IP address  
        this.uniqueids = new Map(); // nickname -> unique ID mapping
        this.userinfo = new Map(); // nickname -> user info (e.g. real name)
        this.logdata = [];
        this.max_log_lines = 50;
        this.default_channel_modes = ['n','t'];
        this.default_user_modes = ['x'];
        this.server_start_time = this.getDate();        
        this.allowed_common_characters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9','_','-'];
        this.allowed_chan_characters = [...this.allowed_common_characters, '.'];
        this.allowed_nick_characters = [...this.allowed_common_characters, '[',']','{','}','\\','|','^','-','~'];
        this.irc_config = minisrv_config.config.irc || {};
        this.channelprefixes = this.irc_config.channel_prefixes || ['#'];
        this.servername = this.irc_config.server_hostname || 'irc.local';
        this.network = this.irc_config.network || 'minisrv';
        this.oper_username = this.irc_config.oper_username || 'minisrv';
        this.oper_password = this.irc_config.oper_password || 'changeme573';
        this.oper_enabled = this.irc_config.oper_enabled || this.debug || false; // Default to off to prevent accidental use with default credentials
        this.irc_motd = this.irc_config.motd || [
            'Welcome to the zefIRCd IRC server, powered by minisrv.',
            'This server is powered by Node.js, and the minisrv project.',
            '',
            'For more information, visit:',
            'https://github.com/zefie/zefie_wtvp_minisrv'
        ];
        this.nicklen = this.irc_config.nick_len || 31;
        this.maxbans = this.irc_config.max_bans || 100;
        this.maxlimit = this.irc_config.max_limit || 50;
        this.maxexcept = this.irc_config.max_except || 100;
        this.maxinvite = this.irc_config.max_invite || 100;
        this.maxkeylen = this.irc_config.max_keylen || 24;
        this.channellimit = this.irc_config.channel_limit || 10;
        this.channellen = this.irc_config.channel_len || 32;
        this.topiclen = this.irc_config.topic_len || 255;
        this.kicklen = this.irc_config.kick_len || 255;
        this.awaylen = this.irc_config.away_len || 200;
        this.enable_tls = this.irc_config.enable_ssl || false;
        this.maxtargets = this.irc_config.max_targets || 4;
        this.socket_timeout = 75; // Default socket timeout to 75 seconds, most clients will send PINGs every 60 seconds, so this should be enough to catch lost connections
        this.server_hello = this.irc_config.server_hello || `zefIRCd v${this.version} IRC server powered by minisrv`;
        this.enable_eval = this.debug || false; // Enable eval in debug mode only
        this.serverId = this.irc_config.server_id || '00A'; // Default server ID, can be overridden in config
        this.allow_public_vhosts = this.irc_config.allow_public_vhosts || true; // If true, users can set their host to a virtual host that is not a real hostname or IP address, if false, only opers can.
        this.kick_insecure_users_on_secure = this.irc_config.kick_insecure_users_on_secure || true; // If true, users without SSL connections will be kicked from a channel when +Z is applied
        this.hide_version = this.irc_config.hide_version || false; // If true, the server will not send its version in the MOTD
        this.clientpeak = 0;
        this.globalpeak = 0;
        this.socketpeak = 0;
        this.modeparamlimit = 5; // Technically we have no limit, but this is a good default for most IRC clients
        this.max_message_len = 512; // RFC2812 standard maximum message length (including \r\n)
        this.reject_overlength_messages = this.irc_config.reject_overlength_messages || true; // If true, messages longer than max_message_len will be rejected, if false, they will be truncated to max_message_len
        this.totalConnections = 0;
        this.supported_channel_modes = "Ibe,k,l,CNOQRSTVZcimnprt";
        this.supported_user_modes = "BRZciorswxz";
        this.supported_prefixes = ["ohv", "@%+"];
        this.supported_client_caps = ['chghost', 'away-notify', 'echo-message', 'invite-notify', 'multi-prefix', 'userhost-in-names', 'account-notify', 'extended-join'];
        this.supported_server_caps = ['TBURST', 'EOB', 'IE', 'EX'];
        this.enable_webtv_command_hacks = this.irc_config.enable_webtv_command_hacks || true;
        this.supported_webtv_command_hacks = ["MODE", "KICK"]; // You could technically add any command currently supported by the IRCd here, such as OPER, KILL, KLINE, etc.
        this.session_store_path = this.wtvshared.getAbsolutePath(this.minisrv_config.config.SessionStore + path.sep + 'minisrv_internal_irc');
        this.klines_path = this.session_store_path + path.sep + 'klines.json';
        this.caps = [
            `AWAYLEN=${this.awaylen} CASEMAPPING=rfc1459 BOT=B CHANMODES=${this.supported_channel_modes} CHANNELLEN=${this.channellen} CHANTYPES=${this.channelprefixes.join('')} PREFIX=(${this.supported_prefixes[0]})${this.supported_prefixes[1]} USERMODES=${this.supported_user_modes} MAXLIST=b:${this.maxbans},e:${this.maxexcept},i:${this.maxinvite},k:${this.maxkeylen},l:${this.maxlimit}`,
            `CHARSET=ascii MODES=${this.modeparamlimit} EXCEPTS=e INVEX=I NETWORK=${this.network} CHANLIMIT=${this.channelprefixes.join('')}:${this.channellimit} NICKLEN=${this.nicklen} TOPICLEN=${this.topiclen} KICKLEN=${this.kicklen}`
        ];
    }

    start() {
        this.loadKLinesFromFile();

        if (this.enable_tls) {
            this.supported_client_caps.push('tls');
        }
        if (this.irc_config.channels) {
            for (const channel of this.irc_config.channels) {                
                this.createChannel(channel.name);
                if (channel.modes && Array.isArray(channel.modes)) {
                    this.channelData.get(channel.name).modes = [...channel.modes];
                }
                if (channel.topic) {
                    this.channelData.get(channel.name).topic = channel.topic;
                }
            }
        }
        this.server_start_time = this.getDate();
        this.server = net.createServer(async socket => {
            
            // Detect SSL handshake and wrap socket if needed
            socket.once('data', async firstChunk => {
                this.totalConnections++;
                socket.removeAllListeners('data');
                socket.pause();
                socket.on('error', (err) => {
                    this.debugLog('error', `Socket error: ${err.message}`);
                    this.terminateSession(socket, true);
                });
                socket.on('timeout', () => {
                    this.debugLog('warn', `Socket timeout for ${socket.remoteAddress}`);
                    this.terminateSession(socket, true);
                });
                // Check if the first byte indicates SSL/TLS handshake (0x16 for TLS Handshake)
                if (Buffer.isBuffer(firstChunk) ? firstChunk[0] === 0x16 : firstChunk.charCodeAt(0) === 0x16) {
                    if (!this.enable_tls) {
                        // If SSL is not enabled, close the socket
                        await this.safeWriteToSocket(socket, `:${this.servername} 421 * :TLS is not enabled on this server\r\n`);
                        this.terminateSession(socket, true);
                        return;
                    }

                    // SSL detected, upgrade socket to TLS
                    const keyBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.key));
                    const certBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.cert));
                    const secureSocket = new tls.TLSSocket(socket, {
                        isServer: true,
                        ALPNProtocols: ['irc'],
                        secureContext: tls.createSecureContext({
                            key: keyBuffer,
                            cert: certBuffer,
                        }),
                    });
                    socket.push(firstChunk);   

                    secureSocket.on('error', (err) => {
                        this.debugLog('error', `Secure socket error: ${err.message}`);
                        this.terminateSession(secureSocket, true);
                    });
                    
                    secureSocket.on('close', () => {
                        this.terminateSession(secureSocket, false);
                    });                    

                    // Only start processing after handshake is complete
                    secureSocket.on('secure', async () => {
                        this.debugLog('info', 'Secure connection (SSL) established with '+ socket.remoteAddress);
                        socket.removeAllListeners();
                        await this.initializeSocket(secureSocket, true);
                        
                    });                    
                    secureSocket.resume();              
                    return;
                } else {
                    // Not SSL, re-emit the data event for normal processing       
                    await this.initializeSocket(socket);
                    socket.emit('data', firstChunk.toString('ascii'));
                    socket.resume();
                    this.clientpeak = Math.max(this.clientpeak, this.clients.length);
                    return;
                }
            });
        });
        this.server.listen(this.port, this.host, () => {
            this.debugLog('info', `zefIRCd ${this.version} server started on port ${this.host}:${this.port}`);
        });        
    }

    async safeWriteToSocket(socket, data) {
        if (!socket || !data) {
            this.debugLog('error', 'writeToSocket called with invalid parameters:', socket, data);
            return;
        }
        if (typeof data !== 'string') {
            data = data.toString('ascii');
        }
        if (data.length > this.max_message_len) {
            data = data.substring(0, this.max_message_len - 2) + '\r\n';
            this.debugLog('warn', `Data length exceeds max_message_len (${this.max_message_len}), truncating: ${data.length} > ${this.max_message_len}`);
        }
        while (socket.writable === false) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        socket.write(data);
    }
            

    async initializeSocket(socket, secure = false, oldSocket = null) {
        if (this.debug) {
            // debug output for socket data
            const originalWrite = socket.write;
            socket.write = function (...args) {
                var log_args = args.map(arg => {
                    if (typeof arg === 'string') {
                        return arg.replace(/\r\n/g, '').replace(/\n/g, '');
                    }
                    return arg;
                });
                console.log('<', ...log_args);
                return originalWrite.apply(socket, args);
            };
        }
        if (oldSocket) {
            socket.registered = oldSocket.registered;
            socket.nickname = oldSocket.nickname;
            socket.username = oldSocket.username;
            socket.isserver = oldSocket.isserver;
            socket.is_srv_authorized = oldSocket.is_srv_authorized;
            socket.signedoff = oldSocket.signedoff;
            socket.hostname_resolved = oldSocket.hostname_resolved;
            socket.realhost = oldSocket.realhost;
            socket.client_version = oldSocket.client_version;
            socket.client_caps = oldSocket.client_caps || [];
            socket.host = oldSocket.host;
            socket.timestamp = oldSocket.timestamp;
            socket.uniqueId = oldSocket.uniqueId;
        } else {
            socket.registered = false;
            socket.nickname = '';
            socket.username = '';
            socket.isserver = false;
            socket.is_srv_authorized = false;
            socket.signedoff = false;
            socket.hostname_resolved = false;
            socket.realhost = socket.remoteAddress;
            socket.client_version = '';
            socket.client_caps = [];
            socket.host = this.filterHostname(socket, socket.remoteAddress);
            socket.timestamp = this.getDate();            
            socket.uniqueId = `${this.serverId}${this.generateUniqueId(socket)}`;
        }
        
        socket.secure = secure;
        socket.upgrading_to_tls = false;
        socket.error_count = 0;
        socket.lastseen = this.getDate();
        await this.doInitialHandshake(socket);
        
        socket.on('data', async data => {
            socket.lastseen = this.getDate();
            await this.processSocketData(socket, data);
        });

        socket.on('end', () => {
            this.terminateSession(socket, false);
        });

        socket.on('error', () => {
            this.terminateSession(socket, true);
        });

        socket.on('close', () => {
            this.terminateSession(socket, false);
        });

        // Start a loop to check for idle clients and send PING if needed
        socket._idleInterval = setInterval(async () => {
            if (socket.signedoff) {
                clearInterval(socket._idleInterval);
                return;
            }
            const now = this.getDate();
            if ((now - socket.lastseen) > this.socket_timeout + 10) {
                // Over 10 seconds has passed since we sent our PING, assume lost
                this.debugLog('warn', `Socket ${socket.remoteAddress} has been idle for too long, terminating session`);
                if (socket.nickname) {
                    await this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} QUIT :Ping timeout (${now - socket.lastseen} seconds)\r\n`, socket);
                    await this.broadcastToAllServers(`:${socket.uniqueId} QUIT :Ping timeout (${now - socket.lastseen} seconds)\r\n`, serverSocket);
                }
                socket.signedoff = true;
                this.terminateSession(socket, true);
                return;
            } else if ((now - socket.lastseen) > this.socket_timeout) {
                // Client has been idle for too long, send PING
                if (socket.isserver) {
                    await this.safeWriteToSocket(socket, `:${this.serverId} PING ${this.serverId} ${this.servername}\r\n`);
                } else {
                    await this.safeWriteToSocket(socket, `PING :${this.servername}\r\n`);
                }
                return;
            }
        }, 10000); // check every 5 seconds

        this.clients.push(socket);
        this.clientpeak = Math.max(this.clientpeak, this.clients.length);
    }        

    async processServerData(socket, line) {
        // Handle server-specific commands
        const parts = line.split(' ');
        if (parts[0] == `:${socket.uniqueId}`) {
            parts.shift(); // Remove the unique ID prefix
        }
        if (parts.length < 1) return; // Invalid command
        const command = parts[0].toUpperCase();
        switch (command) {
            case 'PASS':
                // Handle PASS command from server
                if (parts.length < 2) {
                    this.debugLog('warn', 'Invalid PASS command from server');
                    return;
                }
                const password = parts[1];
                const servers = this.irc_config.servers || {};
                let matchedServer = null;
                Object.entries(servers).forEach(async ([key, serverObj]) => {
                    if (serverObj.password && serverObj.password === password) {
                        matchedServer = serverObj;
                        this.debugLog('info', `Server ${serverObj.name || key} matched with provided password`);
                        await this.safeWriteToSocket(socket, `PASS ${serverObj.password}\r\n`);
                        socket.is_srv_authorized = true;                        
                        var totalSockets = this.clients.length + this.servers.size;
                        this.socketpeak = Math.max(this.socketpeak, totalSockets);
                        return;
                    }
                });
                if (!matchedServer) {
                    this.debugLog('warn', 'Invalid server password provided');
                    await this.safeWriteToSocket(socket, `:${this.servername} :ERROR :Invalid server password\r\n`);
                    socket.error_count++;
                    setTimeout((socket) => {
                        if (socket) {
                            socket.error_count--;
                        }
                    }, 60000);
                    if (socket.error_count >= 5) {
                        await this.safeWriteToSocket(socket, `:${this.servername} :ERROR :Too many errors, disconnecting\r\n`);
                        this.terminateSession(socket, true);
                    }
                    return;
                }                    
                socket.serverinfo = matchedServer
                return;
            case 'CAPAB':
                if (!this.checkRegistered(socket, true)) {
                    break;
                }
                // Handle CAPAB command from server
                if (parts.length < 2) {
                    this.debugLog('warn', 'Invalid CAPAB command from server');
                    break;
                }
                var capabilities = parts.slice(1).join(' ').slice(1); // Remove leading ':'
                capabilities = capabilities.split(' ');
                this.debugLog('info', `Received CAPAB from server: ${capabilities.join(' ')}`);
                var output_reply = [];
                for (const cap of capabilities) {
                    if (this.supported_server_caps.includes(cap)) {
                        output_reply.push(cap);
                    } else {
                        this.debugLog('warn', `Unsupported server capability: ${cap}`);
                    }
                }
                await this.safeWriteToSocket(socket, `CAPAB :${output_reply.join(' ')}\r\n`);
                break;
            case 'SERVER':
                if (!this.checkRegistered(socket, true)) {
                    break;
                }
                // Handle SERVER command from server
                if (parts.length < 6) {
                    this.debugLog('warn', 'Invalid SERVER command from server');
                    break;
                }
                var serverName = parts[1];
                var serverNumber = parts[2];
                var serverId = parts[3];
                var serverExtra = parts[4]
                var serverInfo = parts.slice(5).join(' ');
                socket.isserver = true;
                this.clients = this.clients.filter(c => c !== socket);
                this.clientpeak = this.clientpeak - 1;
                socket.registered = true;
                socket.servername = serverName;
                socket.uniqueId = serverId;
                socket.serverIdent = line;
                this.servers.set(socket, serverName)
                await this.safeWriteToSocket(socket, `SERVER ${this.servername} 1 ${this.serverId} + :${this.server_hello}\r\n`);
                for (const [sock, nickname] of this.nicknames.entries()) {
                    if (!sock || !nickname) continue;
                    const uniqueId = sock.uniqueId;
                    const signonTime = Math.floor(this.usersignontimestamps.get(nickname) || this.getDate());
                    const userModes = this.getUserModes(nickname);
                    const username = this.usernames.get(nickname) || '';
                    await this.safeWriteToSocket(socket, `:${this.serverId} UID ${nickname} 1 ${signonTime} +${userModes} ${username} ${sock.host} ${sock.realhost} ${sock.remoteAddress} ${uniqueId} * :${sock.userinfo}\r\n`);
                }
                for (const [channel, channelObj] of this.channelData.entries()) {
                    const modes = channelObj.modes;
                    for (const user of channelObj.users) {                        
                        let userPrefix = '';
                        if (channelObj.ops.has(user)) {
                            userPrefix = '@';
                        } else if (channelObj.halfops.has(user)) {
                            userPrefix = '%';
                        } else if (channelObj.voices.has(user)) {
                            userPrefix = '+';
                        }
                        const userUniqueId = this.uniqueids.get(user);
                        if (userUniqueId) {
                            await this.safeWriteToSocket(socket, `:${this.serverId} SJOIN ${this.getDate()} ${channel} +${modes.join('')} :${userPrefix}${userUniqueId}\r\n`);
                        }
                    }
                }

                await this.broadcastToAllServers(socket.serverIdent, socket);
                // Send EOB to the server
                await this.safeWriteToSocket(socket, `:${this.serverId} EOB \r\n`);
                break;
            case 'SVINFO':
                if (!this.checkRegistered(socket, true)) {
                    break;
                }
                // Handle SVINFO command from server
                if (parts.length < 4) {
                    this.debugLog('warn', 'Invalid SVINFO command from server');
                    return;
                }
                const serverInfoMessage = `:${this.serverId} SVINFO 6 6 0 ${this.getDate()}\r\n`;
                await this.safeWriteToSocket(socket, serverInfoMessage);
                break
            case 'PING':
                // Respond to PING with PONG
                var pong = parts.slice(1).join(' ');
                if (pong.startsWith(':')) {
                    pong = pong.slice(1); // Remove leading ':'
                }
                await this.safeWriteToSocket(socket, `:${this.serverId} PONG ${pong}\r\n`);
                break;
            case 'PONG':
                // Ignore PONG from server
                break;
            case 'RESV':
                if (!this.checkRegistered(socket)) {
                    break;
                }
                // Handle RESV command from server
                if (parts.length < 2) {
                    this.debugLog('warn', 'Invalid RESV command from server');
                    break;
                }
                const targetMask = parts[1];
                const expiry = parseInt(parts[2]) || 0;
                const reservedNick = parts[3];
                var reason = parts.slice(4).join(' ') || '';
                if (!this.reservednicks.includes(reservedNick)) {
                    this.reservednicks.push(reservedNick);
                }
                if (expiry > 0) {
                    setTimeout(() => {
                        const index = this.reservednicks.indexOf(reservedNick);
                        if (index !== -1) {
                            this.reservednicks.splice(index, 1);
                            this.debugLog('info', `Reservation for ${reservedNick} expired`);
                        }
                    }, expiry * 1000);
                }
                await this.broadcastToAllServers(`:${socket.servername} RESV ${targetMask} ${expiry} ${reservedNick} :${reason}\r\n`, socket);
                break;
            case 'UID':
                if (!this.checkRegistered(socket)) {
                    break;
                }
                // Handle UID command from server
                if (parts.length < 10) {
                    this.debugLog('warn', 'Invalid UID command from server');
                    break;
                }
                var nickname = parts[1];
                const server_Id = parts[2];
                const timestamp = parseInt(parts[3]) || 0;
                const userModes = parts[4].replace("/\+/g","").split('');
                var username = parts[5];
                var hostname = parts[6];
                const ipaddress = parts[7];
                const ipaddress2 = parts[8];
                const userUniqueId = parts[9];
                var userinfo = parts.slice(10).join(' ').slice(1); // Remove leading ':'
                this.addRemoteServerUser(socket, nickname);
                this.addUserUniqueId(nickname, userUniqueId);
                this.globalpeak = Math.max(this.globalpeak, this.countGlobalUsers());
                this.usersignontimestamps.set(nickname, timestamp);
                this.usernames.set(nickname, username);
                this.hostnames.set(nickname, hostname);
                this.realhosts.set(nickname, ipaddress2);
                this.userinfo.set(nickname, userinfo);
                for (const mode of userModes) {
                    this.setUserMode(nickname, mode, true);
                }
                await this.broadcastToAllServers(`:${socket.servername} UID ${nickname} ${server_Id} ${timestamp} +${userModes.join('')} ${username} ${hostname} ${ipaddress} ${ipaddress2} ${userUniqueId} * :${userinfo}\r\n`, socket);
                break;
            case 'SVSHOST':
                if (!this.checkRegistered(socket)) {
                    break;
                }
                // Handle SVSHOST command from server
                if (parts.length < 4) {
                    this.debugLog('warn', 'Invalid SVSHOST command from server');
                    break;
                }
                var uniqueId = parts[1];
                var hostname = parts[3];
                var targetSocket = this.findSocketByUniqueId(uniqueId);
                if (!targetSocket) {
                    this.debugLog('warn', `No socket found for unique ID ${uniqueId}`);
                    break;
                }
                this.hostnames.set(this.findUserByUniqueId(uniqueId), hostname);
                targetSocket.host = hostname;
                if (targetSocket.client_caps && targetSocket.client_caps.includes('CHGHOST')) {
                    await this.safeWriteToSocket(targetSocket, `:${targetSocket.nickname}!${targetSocket.username}@${targetSocket.host} CHGHOST ${targetSocket.username} ${targetSocket.host}\r\n`);
                }
                await this.safeWriteToSocket(targetSocket, `:${this.servername} 396 ${targetSocket.nickname} ${targetSocket.host} :is now your visible host\r\n`);
                await this.broadcastToAllServers(`:${socket.servername} SVSHOST ${uniqueId} ${hostname}\r\n`, socket);
                break;
            case 'SVSACCOUNT':
                if (!this.checkRegistered(socket)) {
                    break;
                }
                if (parts.length < 4) {
                    this.debugLog('warn', 'Invalid SVSACCOUNT command from server');
                    break;
                }
                var uniqueId = parts[1];
                var accountName = parts[3];
                var nickname = this.findUserByUniqueId(uniqueId);
                if (!nickname) {
                    this.debugLog('warn', `No user found for unique ID ${uniqueId}`);
                    break;
                }
                if (accountName === '*') {
                    // Remove account association
                    this.accounts.delete(nickname);
                } else {
                    this.accounts.set(nickname, accountName);
                }
                var targetSocket = this.findSocketByUniqueId(uniqueId);
                if (!targetSocket) {
                    this.debugLog('warn', `No socket found for unique ID ${uniqueId}`);
                    break;
                }
                if (targetSocket.client_caps && targetSocket.client_caps.includes('account-notify')) {
                    await this.safeWriteToSocket(targetSocket, `:${targetSocket.nickname}!${targetSocket.username}@${targetSocket.host} ACCOUNT ${accountName}\r\n`);
                }
                break;
            case 'SVSNICK':
                if (!this.checkRegistered(socket)) {
                    break;
                }
                // Handle SVSNICK command from server
                if (parts.length < 5) {
                    this.debugLog('warn', 'Invalid SVSNICK command from server');
                    break;
                }
                var oldNick = this.findUserByUniqueId(parts[1]);
                var newNick = parts[3];
                var targetSocket = this.findSocketByUniqueId(parts[1]);
                await this.broadcastUser(oldNick, `:${oldNick}!${this.usernames.get(oldNick)}@${targetSocket.host} NICK :${newNick}\r\n`);
                this.processNickChange(targetSocket, newNick);
                await this.broadcastToAllServers(line, socket);
                break;
            case 'SJOIN':
                if (!this.checkRegistered(socket)) {
                    break;
                }
                var channel = parts[2];
                var modes = parts[3];
                var uniqueId = parts[4];
                if (uniqueId.startsWith(':')) {
                    uniqueId = uniqueId.slice(1); // Remove leading ':'
                }                
                if (!uniqueId) {
                    await this.broadcastToAllServers(`:${socket.servername} SJOIN ${this.getDate()} ${channel} +${modes} :\r\n`, socket);
                    break;
                }
                while (['@', '%', '+'].includes(uniqueId[0])) {
                    uniqueId = uniqueId.slice(1);
                }
                var userSocket = this.findSocketByUniqueId(uniqueId);
                var nickname = this.findUserByUniqueId(uniqueId);
                var username = this.usernames.get(nickname) || nickname;
                var hostname = this.hostnames.get(nickname)
                if (!this.channelData.has(channel)) {
                    this.createChannel(channel);
                }
                if (!this.channelData.get(channel).users.has(nickname)) {
                    this.channelData.get(channel).users.add(nickname);
                }
                if (nickname && username && hostname) {
                    await this.broadcastChannel(channel, `:${nickname}!${username}@${hostname} JOIN ${channel}\r\n`, userSocket);
                }
                await this.broadcastToAllServers(`:${socket.servername} SJOIN ${this.getDate()} ${channel} +${modes} :${uniqueId}\r\n`, socket);
                break;
            case 'SQUIT':
                await this.broadcastToAllServers(`:${socket.servername} SQUIT ${parts[1]} :${parts.slice(2).join(' ').slice(1)}\r\n`, socket);
                this.servers.delete(socket);
                break;
            case (command.match(/^\d{3}$/) || {}).input:
                if (!this.checkRegistered(socket)) {
                    break;
                }
                // Numeric reply from server
                // Numeric replies are usually in the format: <numeric> <nickname> :<message>
                var senderID = parts[1]
                var targetSocket = this.findSocketByUniqueId(senderID);
                if (!targetSocket) {
                    this.debugLog('warn', `No socket found for unique ID ${senderID}`);
                    break;
                }                
                var responded = false;
                switch (command) {
                    case '307':
                        // WHOIS AWAY reply
                        if (parts.length < 3) {
                            this.debugLog('warn', 'Invalid WHOIS AWAY reply from server');
                            break;
                        }
                        var whoisNick = parts[2];
                        var awayMessage = parts.slice(3).join(' ');
                        if (awayMessage.startsWith(':')) {
                            awayMessage = awayMessage.slice(1);
                        }                        
                        await this.safeWriteToSocket(targetSocket, `:${socket.servername} 307 ${whoisNick} ${whoisNick} :${awayMessage}\r\n`);
                        responded = true;
                        break;
                    case '311':
                        // WHOIS reply
                        var whoisNick = parts[2];
                        var whoisUser = parts[3];
                        var whoisHost = parts[4];
                        var whoisServer = parts[5];
                        var whoisRealname = parts.slice(6).join(' ');
                        if (whoisRealname.startsWith(':')) {
                            whoisRealname = whoisRealname.slice(1);
                        }                        
                        await this.safeWriteToSocket(targetSocket, `:${socket.servername} 311 ${whoisNick} ${whoisNick} ${whoisUser} ${whoisHost} ${whoisServer} :${whoisRealname}\r\n`);
                        responded = true;
                        break;
                    case '312':
                        // WHOIS SERVER reply
                        var serverID = parts[1];
                        var whoisNick = parts[2];
                        var serverName = parts[2];
                        var serverInfo = parts.slice(3).join(' ');
                        if (serverInfo.startsWith(':')) {
                            serverInfo = serverInfo.slice(1);
                        }
                        await this.safeWriteToSocket(targetSocket, `:${socket.servername} 312 ${whoisNick} ${serverName} :${serverInfo}\r\n`);
                        responded = true;
                        break;
                    case '313':
                        // WHOIS operator reply
                        if (parts.length < 3) {
                            this.debugLog('warn', 'Invalid WHOIS operator reply from server');
                            break;
                        }
                        var whoisNick = parts[2];
                        var message = parts.slice(3).join(' ');
                        if (message.startsWith(':')) {
                            message = message.slice(1);
                        }      
                        await this.safeWriteToSocket(targetSocket, `:${socket.servername} 313 ${whoisNick} ${whoisNick} :${message}\r\n`);
                        responded = true;
                        break;
                    case '317':
                        // WHOIS idle reply
                        if (parts.length < 4) {
                            this.debugLog('warn', 'Invalid WHOIS idle reply from server');
                            break;
                        }
                        var whoisNick = parts[2];
                        var idleTime = parts[3];
                        var signonTime = parts[4];
                        await this.safeWriteToSocket(targetSocket, `:${socket.servername} 317 ${whoisNick} ${whoisNick} ${idleTime} ${signonTime} :seconds idle, signon time\r\n`);
                        responded = true;
                        break;
                    case '318':
                        // WHOIS end of reply
                        if (parts.length < 2) {
                            this.debugLog('warn', 'Invalid WHOIS end of reply from server');
                            break;
                        }
                        var whoisNick = parts[1];
                        await this.safeWriteToSocket(targetSocket, `:${socket.servername} 318 ${whoisNick} :End of WHOIS list\r\n`);
                        responded = true;
                        break;
                }
                if (responded) {
                    break;
                }
                if (parts.length < 4) {
                    this.debugLog('warn', 'Invalid numeric reply from server');
                    break;
                }
                const numericCode = parts[0];
                const targetID = parts[1];
                var numericMessage = parts.slice(3).join(' ');
                if (numericMessage.startsWith(':')) {
                    numericMessage = numericMessage.slice(1); // Remove leading ':'
                }

                if (!targetSocket) {
                    this.debugLog('warn', `No socket found for target unique ID ${targetID}`);
                    break;
                }
                await this.safeWriteToSocket(targetSocket, `:${socket.serverinfo.name} ${numericCode} ${targetID} :${numericMessage}\r\n`);
                break;
            default:
                if (!this.checkRegistered(socket)) {
                    break;
                }
                if (command.startsWith(':')) {
                    // part out the line to "sourceUniqueId command targetUniqueId :message"
                    var sourceUniqueId = parts[0].slice(1); // Remove the leading ':'
                    var nickname = this.findUserByUniqueId(sourceUniqueId);
                    if (!nickname) {
                        this.debugLog('warn', `No nickname found for unique ID ${sourceUniqueId}`);
                        break;
                    }
                    var srvCommand = parts[1];
                    switch (srvCommand) {
                        case 'QUIT':
                            var user_name = this.usernames.get(nickname) || nickname;
                            var message = parts.slice(2).join(' ').slice(1); // Remove leading ':'                        
                            // Remove user from the server's user list
                            const serverUsers = this.serverusers.get(socket);
                            if (serverUsers && typeof serverUsers.delete === 'function') {
                                const nickToRemove = this.findUserByUniqueId(sourceUniqueId);
                                serverUsers.delete(nickToRemove);
                                this.cleanupUserSession(nickToRemove);
                            }
                            await this.broadcastToAllServers(`:${nickname}!${user_name}@${this.servername} QUIT :${message}\r\n`, socket);
                            break;
                        case 'JOIN':
                            var channel = this.findChannel(parts[3]);
                            if (!channel || !this.channelData.has(channel)) {
                                channel = parts[3];
                                this.createChannel(channel);
                            }
                            var userSocket = this.findSocketByUniqueId(sourceUniqueId);
                            if (!userSocket) {
                                this.debugLog('warn', `No socket found for source unique ID ${sourceUniqueId}`);
                                break;
                            }
                            var username = this.usernames.get(nickname) || nickname;
                            if (!this.channelData.get(channel).users.has(nickname)) {
                                this.channelData.get(channel).users.add(nickname);
                            }
                            await this.broadcastChannelJoin(channel, userSocket);
                            await this.broadcastToAllServers(`:${sourceUniqueId} JOIN ${channel}\r\n`, socket);
                            break;
                        case 'PART':
                            var channel = this.findChannel(parts[2]);
                            if (!channel) {
                                this.debugLog('warn', `No channel found for PART command: ${parts[2]}`);
                                break;
                            }
                            if (this.channelData.get(channel).ops.has(nickname)) {
                                this.channelData.get(channel).ops.delete(nickname);
                            }
                            if (this.channelData.get(channel).halfops.has(nickname)) {
                                this.channelData.get(channel).halfops.delete(nickname);
                            }
                            if (this.channelData.get(channel).voices.has(nickname)) {
                                this.channelData.get(channel).voices.delete(nickname);
                            }

                            var username = this.usernames.get(nickname) || nickname;
                            var hostname = this.hostnames.get(nickname);                            
                            await this.broadcastChannel(channel, `:${nickname}!${username}@${hostname} PART ${channel} :${parts.slice(4).join(' ')}\r\n`, userSocket);
                            if (this.channelData.has(channel) && this.channelData.get(channel).users.size === 0) {
                                this.deleteChannel(channel);
                            }
                            await this.broadcastToAllServers(`:${sourceUniqueId} PART ${channel} :${parts.slice(4).join(' ')}\r\n`, socket);
                            break;
                        case 'GLOBOPS':
                            var message = parts.slice(3).join(' ');
                            await this.broadcastToAllServers(`:${sourceUniqueId} GLOBOPS :${message}`, socket);
                            break;
                        case 'TBURST':
                            // Handle TBURST command from server
                            if (parts.length < 6) {
                                this.debugLog('warn', `Invalid TBURST command from server: ${line}`);
                                break;
                            }
                            var channel = parts[3];
                            var topic = parts.slice(6).join(' ');
                            if (topic.startsWith(':')) {
                                topic = topic.slice(1);
                            }
                            if (!this.channelData.has(channel)) {
                                this.createChannel(channel);
                            }
                            this.channelData.get(channel).topic = topic;
                            await this.broadcastChannel(channel, `:${nickname} TOPIC ${channel} :${topic}\r\n`);
                            await this.broadcastToAllServers(`:${sourceUniqueId} TBURST ${channel} :${topic}\r\n`, socket);
                            break;
                        case 'KILL':
                            // Handle KILL command from server
                            if (parts.length < 3) {
                                this.debugLog('warn', `Invalid KILL command from server: ${line}`);
                                break;
                            }
                            var targetUniqueId = parts[2];
                            var targetSocket = this.findSocketByUniqueId(targetUniqueId);
                            var targetNickname = this.findUserByUniqueId(targetUniqueId);
                            var sourceUsername = this.usernames.get(nickname) || nickname;
                            var reason = parts.slice(3).join(' ');
                            await this.safeWriteToSocket(targetSocket, `:${nickname}!${sourceUsername}@${socket.serverinfo.name} KILL ${targetNickname} :${reason}\r\n`);
                            await this.broadcastUser(targetNickname, `:${nickname}!${sourceUsername}@${socket.serverinfo.name} KILL ${targetNickname} :${reason}\r\n`, targetSocket);
                            await this.broadcastToAllServers(`:${sourceUniqueId} KILL ${targetUniqueId} :${reason}\r\n`, socket);
                            await this.broadcastConnection(socket, `Killed: ${reason}`);
                            this.terminateSession(targetSocket, true);
                            break;
                        case 'MODE':
                            var targetUniqueId = parts[2];
                            if (this.channelprefixes.some(prefix => targetUniqueId.startsWith(prefix))) {
                                var targetChannel = this.findChannel(targetUniqueId)
                                if (!targetChannel) {
                                    this.debugLog('warn', `No channel found for MODE command: ${line}`);
                                    break;
                                }
                                // It's a channel, broadcast to all users in the channel
                                if (this.channelData.has(targetChannel)) {
                                    var modes = parts[3];
                                    await this.processChannelModes(nickname, targetChannel, modes, parts.slice(4), socket);
                                }
                                break;
                            }                        
                            var targetSocket = this.findSocketByUniqueId(targetUniqueId);
                            if (!targetSocket) {
                                this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
                                break;
                            }
                            await this.safeWriteToSocket(targetSocket, `:${targetSocket.nickname} MODE ${targetSocket.nickname} ${parts.slice(2).join(' ')}\r\n`);
                            if (this.clientIsWebTV(targetSocket) && this.enable_webtv_command_hacks) {
                                await this.sendWebTVNoticeTo(targetSocket, `The network has set your user mode: ${parts.slice(3).join(' ')}`);
                            }
                            await this.broadcastToAllServers(`:${sourceUniqueId} MODE ${targetUniqueId} ${parts.slice(3).join(' ')}\r\n`, socket);                        
                            break;
                        case 'NICK':
                            if (parts.length < 3) {
                                this.debugLog('warn', 'Invalid NICK command from server');
                                break;
                            }
                            var targetSocket = this.findSocketByUniqueId(sourceUniqueId);
                            if (!targetSocket) {
                                this.debugLog('warn', `No socket found for source unique ID ${sourceUniqueId}`);
                                break;
                            }
                            var oldNick = targetSocket.nickname;
                            var newNick = parts[2];    
                            
                            if (this.nicknames.has(newNick)) {
                                await this.safeWriteToSocket(targetSocket, `:${this.servername} 433 ${oldNick} ${newNick} :Nickname is already in use\r\n`);
                                break;
                            }
                            this.processNickChange(targetSocket, newNick);
                            await this.broadcastUser(oldNick, `:${targetSocket.nickname}!${targetSocket.username}@${targetSocket.host} NICK :${newNick}\r\n`, targetSocket);
                            await this.broadcastToAllServers(`:${sourceUniqueId} NICK ${newNick}\r\n`, socket);
                            break;
                        case 'TOPIC':
                            if (parts.length < 3) {
                                this.debugLog('warn', 'Invalid TOPIC command from server');
                                break;
                            }
                            var channel = this.findChannel(parts[2]);
                            if (!channel || !this.channelData.has(channel)) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                break;
                            }                            
                            var topic = parts.slice(3).join(' ');
                            if (topic.startsWith(':')) {
                                topic = topic.slice(1); // Remove leading ':'
                            }
                            this.channelData.get(channel).topic = topic;
                            var username = this.usernames.get(nickname) || nickname;
                            var hostname = this.hostnames.get(nickname) || '';
                            await this.broadcastChannel(channel, `:${nickname}!${username}@${hostname} TOPIC ${channel} :${topic}\r\n`, targetSocket);
                            await this.broadcastToAllServers(`:${sourceUniqueId} TOPIC ${channel} :${topic}\r\n`, socket);
                            break;                                                    
                        case 'PRIVMSG':
                        case 'NOTICE':
                            var targetUniqueId = parts[2];
                            var message = parts.slice(3).join(' ');
                            if (message.startsWith(':')) {
                                message = message.slice(1); // Remove leading ':'
                            }
                            var sourceSocket = this.findSocketByUniqueId(sourceUniqueId);
                            if (!sourceSocket) {
                                this.debugLog('warn', `No socket found for source unique ID ${sourceUniqueId}`);
                                break;
                            }
                            var sourceUsername = this.usernames.get(nickname) || nickname;
                            const host = this.hostnames.get(nickname) || socketSource.host;
                            if (this.channelprefixes.some(prefix => targetUniqueId.startsWith(prefix))) {
                                // It's a channel, broadcast to all users in the channel except the source
                                if (this.channelData.has(targetUniqueId)) {
                                    const users = this.channelData.get(targetUniqueId).users;
                                    for (const user of users) {
                                        const userSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                                        if (userSocket && userSocket.uniqueId !== sourceUniqueId) {
                                            const host = this.hostnames.get(user) || socketSource.host;
                                            await this.sendThrottled(userSocket, [`:${nickname}!${sourceUsername}@${host} ${srvCommand} ${targetUniqueId} :${message}\r\n`], 30);
                                            await this.broadcastToAllServers(`:${sourceUniqueId} ${srvCommand} ${targetUniqueId} :${message}\r\n`, socket);
                                        }
                                    }
                                }
                                break;
                            }
                            var targetSocket = this.findSocketByUniqueId(targetUniqueId);
                            if (!targetSocket) {
                                this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
                                break;
                            }
                            var targetNickname = this.getUsernameFromUniqueId(targetUniqueId); 
                            if (message.startsWith(':')) {
                                message = message.slice(1); // Remove leading ':'
                            }
                            if (this.clientIsWebTV(targetSocket)) {
                                srvCommand = 'PRIVMSG';
                            }
                            await this.sendThrottled(targetSocket, [`:${nickname}!${sourceUsername}@${host} ${srvCommand} ${targetNickname} :${message}\r\n`], 30);
                            await this.broadcastToAllServers(`:${sourceUniqueId} ${srvCommand} ${targetUniqueId} :${message}\r\n`, socket);
                            break;
                        case "WHOIS":
                            if (parts.length < 3) {
                                this.debugLog('warn', 'Invalid WHOIS command from server');
                                break;
                            }
                            var targetUniqueId = parts[2];
                            var targetSocket = this.findSocketByUniqueId(targetUniqueId);
                            if (!targetSocket) {
                                this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
                                break;
                            }
                            var targetUniqueId = parts[2];
                            var whoisNick = this.findUserByUniqueId(targetUniqueId);
                            if (!whoisNick) {
                                whoisNick = parts[3].slice(1); // Remove leading ':'
                            }
                            const whoisSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s).toLowerCase() === whoisNick.toLowerCase());
                            if (whoisSocket) {
                                whoisNick = whoisSocket.nickname;
                                const whois_username = this.usernames.get(whoisNick);
                                var userinfo = this.userinfo.get(whoisNick) || whoisSocket.userinfo || '';
                                var output_lines = [];
                                output_lines.push(`:${this.serverId} 311 ${targetUniqueId} ${whoisNick} ${whois_username} ${whoisSocket.host} * :${userinfo}\r\n`);
                                if (this.awaymsgs.has(whoisNick)) {
                                    output_lines.push(`:${this.serverId} 301 ${targetUniqueId} ${whoisNick} :${this.awaymsgs.get(whoisNick)}\r\n`);
                                }
                                const userChannels = [];
                                for (const [ch, channelObj] of this.channelData.entries()) {
                                    if (channelObj.users.has(whoisNick)) {
                                        let prefix = '';
                                        var chanops = this.channelData.get(ch).ops;
                                        var chanhalfops = this.channelData.get(ch).halfops;
                                        var chanvoices = this.channelData.get(ch).voices;
                                        const modes = this.channelData.get(ch).modes;
                                        if ((modes.includes('p') || modes.includes('s')) && (!this.channelData.has(ch) || !this.channelData.get(ch).users.has(socket.nickname))) {
                                            continue; // Skip listing this channel if it's private/secret and user is not in it
                                        }
                                        if (chanops.has(whoisNick)) {
                                            prefix = '@';
                                        } else if (chanhalfops.has(whoisNick)) {
                                            prefix = '%';
                                        } else if (chanvoices.has(whoisNick)) {
                                            prefix = '+';
                                        }
                                        userChannels.push(prefix + ch);
                                    }
                                }
                                output_lines.push(`:${this.serverId} 312 ${targetUniqueId} ${whoisNick} ${this.servername} :zefIRCd v${this.version}\r\n`);
                                if (this.isIRCOp(whoisNick)) {
                                    output_lines.push(`:${this.serverId} 313 ${targetUniqueId} ${whoisNick} :is an IRC operator\r\n`);
                                }
                                if (usermodes && this.getUserModes(whoisNick).includes('s')) {
                                    output_lines.push(`:${this.serverId} 671 ${targetUniqueId} ${whoisNick} :is using a secure connection\r\n`);
                                }
                                if (usermodes && this.getUserModes(whoisNick).includes('r')) {
                                    output_lines.push(`:${this.serverId} 307 ${targetUniqueId} ${whoisNick} :is a registered nick\r\n`);
                                }
                                var now = this.getDate();
                                var userTimestamp = whoisSocket.lastspoke || now;
                                var idleTime = now - userTimestamp;
                                output_lines.push(`:${this.serverId} 317 ${targetUniqueId} ${whoisNick} ${idleTime} ${this.usersignontimestamps.get(whoisNick) || 0} :seconds idle, signon time\r\n`);
                                if (userChannels.length > 0) {
                                    output_lines.push(`:${this.serverId} 319 ${targetUniqueId} ${whoisNick} :${userChannels.join(' ')}\r\n`);
                                }
                                output_lines.push(`:${this.serverId} 318 ${targetUniqueId} ${whoisNick} :End of /WHOIS list\r\n`);
                                await this.sendThrottled(socket, output_lines);
                            }
                            break;
                        case "SVSJOIN":
                            if (parts.length < 3) {
                                this.debugLog('warn', 'Invalid SVSJOIN command from server');
                                break;
                            }
                            var targetUniqueId = parts[2];
                            var channelName = this.findChannel(parts[3]);
                            var targetSocket = this.findSocketByUniqueId(targetUniqueId);
                            var username = this.usernames.get(targetSocket.nickname) || socket.nickname;
                            var hostname = this.hostnames.get(targetSocket.nickname) || '';
                            if (!channelName ||!this.channelData.has(channelName)) {
                                channelName = parts[3];
                                this.createChannel(channelName);
                            }
                            if (!this.channelData.get(channelName).users.has(targetSocket.nickname)) {
                                this.channelData.get(channelName).users.add(targetSocket.nickname);
                            }
                            await this.broadcastChannelJoin(channelName, targetSocket);
                            //this.broadcastToAllServers(`:${sourceUniqueId} SVSJOIN ${channelName} ${targetUniqueId}\r\n`, socket);
                            var chan_modes = this.channelData.get(channelName).modes;
                            let modeString = '';
                            let modeParams = [];
                            for (const m of chan_modes) {
                                if (m === 'k' && this.channelData.get(channelName).key) {
                                    modeString += 'k';
                                    modeParams.push(this.channelData.get(channelName).key);
                                } else if (m === 'l' && this.channelData.get(channelName).limit) {
                                    modeString += 'l';
                                    modeParams.push(this.channelData.get(channelName).limit);
                                } else if (typeof m === 'string' && m.length === 1 && m !== 'k' && m !== 'l') {
                                    modeString += m;
                                }
                            }
                            if (modeString.length > 0) {
                                await this.safeWriteToSocket(targetSocket, `:${this.servername} 324 ${nickname} ${channelName} +${modeString}${modeParams.length ? ' ' + modeParams.join(' ') : ''}\r\n`);
                            }
                            await this.broadcastToAllServers(`:${this.serverId} SJOIN ${this.getDate()} ${channelName} +${modeString}${modeParams.length ? ' ' + modeParams.join(' ') : ''} ${targetUniqueId}\r\n`);
                            break;
                        case "SVSMODE":
                            if (parts.length < 4) {
                                this.debugLog('warn', 'Invalid SVSMODE command from server');
                                break;
                            }
                            var targetUniqueId = parts[2];
                            var targetSocket = this.findSocketByUniqueId(targetUniqueId);
                            var targetNickname = targetSocket.nickname;
                            var modes = parts[4].split('');
                            let adding = true;
                            for (const char of modes.join('')) {
                                if (char === '+') {
                                    adding = true;
                                } else if (char === '-') {
                                    adding = false;
                                } else {
                                    if (adding) {
                                        this.setUserMode(targetNickname, char, true);
                                    } else {
                                        this.setUserMode(targetNickname, char, false);
                                    }
                                }
                            }                            
                            var username = this.usernames.get(nickname);
                            var hostname = this.hostnames.get(nickname);
                            await this.safeWriteToSocket(targetSocket, `:${nickname}!${username}@${hostname} MODE ${targetSocket.nickname} ${modes.join('')}\r\n`);
                            await this.broadcastToAllServers(`:${sourceUniqueId} SVSMODE ${targetUniqueId} ${modes.join('')}\r\n`, socket);
                            break;                    
                        default:
                            if (!this.checkRegistered(socket)) {
                                break;
                            }
                            this.debugLog('warn', `Unhandled server command from ${sourceUniqueId} to ${targetUniqueId}: ${srvCommand} ${message}`);
                    }            
            } 
        }
    }

    async processSocketData(socket, data) {
        if (socket.signedoff) {
            return;
        }
        if (socket.upgrading_to_tls) {
            socket.removeAllListeners()
            socket.pause();
            socket.on('error', (err) => {
                this.debugLog('error', 'Error during TLS upgrade: ' + err.message);
                this.terminateSession(socket, true);
            });
            
            if (Buffer.isBuffer(data) ? data[0] === 0x16 : data.charCodeAt(0) === 0x16) {
                if (!this.enable_tls) {
                    // If SSL is not enabled, close the socket
                    await this.safeWriteToSocket(socket, `:${this.servername} 421 * :TLS is not enabled on this server\r\n`);
                    this.terminateSession(socket, true);
                    return;
                }

                // SSL detected, upgrade socket to TLS
                const keyBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.key));
                const certBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.cert));
                // Remove from this.clients if present
                
                this.clients = this.clients.filter(c => c !== socket);
                const secureSocket = new tls.TLSSocket(socket, {
                    isServer: true,
                    ALPNProtocols: ['irc'],
                    secureContext: tls.createSecureContext({                        
                        key: keyBuffer,
                        cert: certBuffer,
                    }),
                });
                socket.push(data);

                secureSocket.on('error', (err) => {
                    this.terminateSession(secureSocket, true);
                });
                
                secureSocket.on('close', () => {
                    this.terminateSession(secureSocket, false);
                });                    

                // Only start processing after handshake is complete
                secureSocket.on('secure', async () => {
                    this.debugLog('info', 'Secure connection (STARTTLS) established with '+ socket.remoteAddress);
                    socket.removeAllListeners('error');
                    await this.initializeSocket(secureSocket, true, socket);
                    // Remove the original socket from clients
                    this.clients = this.clients.filter(c => c !== socket);
                    this.clientpeak = Math.max(this.clientpeak, this.clients.length);                    
                });                 
                secureSocket.resume();
            } else {
                socket.resume();
                await this.safeWriteToSocket(socket, `:${this.servername} 421 * :Invalid TLS handshake\r\n`);
                this.terminateSession(socket, true);
            }
            socket.upgrading_to_tls = false;
            return;
        }
        // Ensure data is a string
        if (typeof data !== 'string') {
            if (Buffer.isBuffer(data)) {
                data = data.toString('ascii');
            } else if (data && typeof data.toString === 'function') {
                data = data.toString();
            } else {
                return; // Invalid data, ignore
            }
        }
        const lines = data.split(/\r\n|\n/).filter(Boolean);
        for (let line of lines) {
            if (this.debug) {
                console.log(`> ${line}`);
            }
            if (socket.isserver) {
                await this.processServerData(socket, line);
                continue;
            }            
            // Check for server prefix (e.g., :00B) and extract command
            let prefix = null;
            if (line.startsWith(':')) {
                const spaceIdx = line.indexOf(' ');
                
                if (spaceIdx > 0) {
                    prefix = line.slice(1, spaceIdx);
                    if (!socket.uniqueId) {
                        socket.uniqueId = prefix;
                    } else if (socket.uniqueId !== prefix) {
                        if (!socket.isserver) {
                            socket.uniqueId = prefix;
                        } else {
                            this.debugLog('warn', `Socket uniqueId mismatch: ${socket.uniqueId} !== ${prefix}`);
                            this.debugLog('warn', line);
                            continue;
                        }
                    }
                }
                this.processServerData(socket, line);
                continue;
            }

            // initial commands before we assign socket.isserver = true
            const serverCommands = ['PASS', 'CAPAB', 'SERVER', 'SVINFO'];
            const firstWord = line.trim().split(' ')[0].toUpperCase();
            if (!prefix && serverCommands.includes(firstWord)) {
                this.processServerData(socket, line);
                continue;
            }


            const [command, ...params] = line.trim().split(' ');
            switch (command.toUpperCase()) {
                case 'OPER':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!this.oper_enabled) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 491 ${socket.nickname} :This server does not support IRC operators\r\n`);
                        break;
                    }
                    if (params.length < 2) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} OPER :Not enough parameters\r\n`);
                        break;
                    }
                    const [operName, operPassword] = params;
                    if (operName !== this.oper_username) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 491 ${socket.nickname} :No permission\r\n`);
                        this.debugLog('warn', `Invalid oper name attempt: ${operName} from ${socket.nickname} (${socket.username}@${socket.realhost})`);
                        break;
                    }
                    if (operPassword !== this.oper_password) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 464 ${socket.nickname} :Password incorrect\r\n`);
                        this.debugLog('warn', `Invalid oper password attempt from ${socket.nickname} (${socket.username}@${socket.realhost}) (using oper name ${operName})`);
                        break;
                    }
                    this.setUserMode(socket.nickname, 'o', true);
                    await this.safeWriteToSocket(socket, `:${this.servername} 381 ${socket.nickname} :You are now an IRC operator\r\n`);
                    await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +o\r\n`);
                    await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +o\r\n`);
                    this.debugLog('info', `IRC operator ${socket.nickname} (${socket.username}@${socket.realhost}) has logged in with oper name ${operName}`);
                    break;
                case 'UPTIME':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    const uptime = this.getDate() - this.server_start_time;
                    const days = Math.floor(uptime / 86400);
                    const hours = Math.floor((uptime % 86400) / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = uptime % 60;
                    await this.safeWriteToSocket(socket, `:${this.servername} 242 ${socket.nickname} :Server uptime is ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds\r\n`);
                    break;
                case 'KICK':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    var channel = this.findChannel(params[0]);                    
                    var targetNick = this.findUser(params[1]);
                    if  (!channel || !targetNick) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[1]} :No such nick/channel\r\n`);
                        break;
                    }
                    // Check if the user is a channel operator
                    if (this.channelData.get(channel).ops instanceof Set && this.channelData.get(channel).ops.has(socket.nickname)) {
                        // Allow kick
                    } else if (this.channelData.get(channel).halfops instanceof Set && this.channelData.get(channel).halfops.has(socket.nickname)) {
                        // Only allow kick if the target is NOT a channel operator
                        if (this.channelData.get(channel).ops instanceof Set && this.channelData.get(channel).ops.has(targetNick)) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :You cannot kick a channel operator\r\n`);
                            break;
                        }
                        // Allow kick
                    } else {
                        await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
                        break;
                    }                  
                    if (params.length < 2) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} KICK :Not enough parameters\r\n`);
                        break;
                    }
                    socket.lastspoke = this.getDate();


                    if (!this.channelData.has(channel)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                        break;
                    }                      
                    if (!this.channelData.get(channel).users.has(targetNick)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 441 ${socket.nickname} ${targetNick} :They aren't on that channel\r\n`);
                        break;
                    }
                    // Check if channel mode +Q (no kicks) is set
                    var chan_modes = this.channelData.get(channel).modes;
                    if (chan_modes.includes('Q')) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :Cannot kick users, channel is +Q (no kicks allowed)\r\n`);
                        break;
                    }
                    this.channelData.get(channel).users.delete(targetNick);
                    var targetSocket = Array.from(this.clients).find(s => this.nicknames.get(s) === targetNick);
                    if (params.length > 2) {
                        let reason = params.slice(2).join(' ');
                        if (reason.startsWith(':')) {
                            reason = reason.slice(1);
                        }
                        await this.safeWriteToSocket(targetSocket, `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick} :${reason}\r\n`);
                        await this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick} :${reason}\r\n`);
                        await this.broadcastToAllServers(`:${socket.uniqueId} KICK ${channel} ${targetSocket.uniqueId} :${reason}\r\n`);
                        break;
                    } else {
                        await this.safeWriteToSocket(targetSocket, `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick}\r\n`);
                        await this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick}\r\n`);
                        await this.broadcastToAllServers(`:${socket.uniqueId} KICK ${channel} ${targetSocket.uniqueId}\r\n`);
                    }
                    break;
                case 'TOPIC':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (params.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} TOPIC :Not enough parameters\r\n`);
                        break;
                    }
                    var channel = this.findChannel(params[0]);
                    if (!channel) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${params[0]} :No such channel\r\n`);
                        break;
                    }
                    var chan_modes = this.channelData.get(channel).modes;
                    if (chan_modes.includes('t')) {
                        if (this.channelData.get(channel).ops instanceof Set && this.channelData.get(channel).ops.has(socket.nickname)) {
                            // Allow topic
                        } else {
                            await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
                            break;
                        }
                    }
                    socket.lastspoke = this.getDate();
                    if (!this.channelData.has(channel)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                        break;
                    }                        
                    if (params.length > 1) {
                        var topic = params.slice(1).join(' ');
                        if (topic.startsWith(':')) {
                            topic = topic.slice(1);
                        }
                        this.channelData.get(channel).topic = topic;
                        await this.safeWriteToSocket(socket, `:${this.servername} 332 ${socket.nickname} ${channel} :${topic}\r\n`);                        
                        await this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} TOPIC ${channel} :${topic}\r\n`);
                        await this.broadcastToAllServers(`:${socket.uniqueId} TOPIC ${channel} :${topic}\r\n`);
                    } else {
                        const topic = this.channelData.get(channel).topic;
                        await this.safeWriteToSocket(socket, `:${this.servername} 331 ${socket.nickname} ${channel} :${topic}\r\n`);
                    }
                    break;
                case 'AWAY':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    socket.lastspoke = this.getDate();
                    if (params.length > 0) {
                        if (params.length > this.awaylen) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 417 ${socket.nickname} ${channel} :Away message is too long\r\n`);
                            break;
                        }
                        await this.safeWriteToSocket(socket, `:${this.servername} 306 ${socket.nickname} :You are now marked as away\r\n`);
                        let awayMsg = params.join(' ');
                        if (awayMsg.startsWith(':')) {
                            awayMsg = awayMsg.slice(1);
                        }
                        this.awaymsgs.set(socket.nickname, awayMsg);
                        await this.broadcastUserIfCap(socket, `:${socket.nickname}!${socket.username}@${socket.host} AWAY :${awayMsg}\r\n`, socket, 'away-notify');
                        await this.broadcastToAllServers(`:${socket.uniqueId} AWAY :${awayMsg}\r\n`);
                    } else {
                        await this.safeWriteToSocket(socket, `:${this.servername} 305 ${socket.nickname} :You are no longer marked as away\r\n`);                        
                        this.awaymsgs.delete(socket.nickname);
                        await this.broadcastUserIfCap(socket, `:${socket.nickname}!${socket.username}@${socket.host} AWAY\r\n`, socket, 'away-notify');
                        await this.broadcastToAllServers(`:${socket.uniqueId} AWAY\r\n`);
                    }
                    break;
                case 'CAP':
                    // Attempt to map any client caps with our supported caps
                    if (params[0] && params[0].toUpperCase() === 'LS') {
                        const capsString = this.supported_client_caps.map(cap => cap.toLowerCase()).join(' ');
                        await this.safeWriteToSocket(socket, `:${this.servername} CAP ${socket.uniqueId} LS :${capsString}\r\n`);
                    }
                    if (params[0] && params[0].toUpperCase() === 'REQ') {
                        socket.client_caps = params.slice(1).map(cap => {
                            if (cap.startsWith(':')) {
                                return cap.slice(1).toLowerCase();
                            }
                            return cap.toLowerCase();
                        });
                        var supportedCaps = this.supported_client_caps.filter(cap => socket.client_caps.includes(cap.toLowerCase()));
                        if (params.length > 1) {
                            // params[1] is the first cap, may be prefixed with ':'
                            // Remove ':' from first cap if present
                            let reqCaps = params.slice(1).map(cap => cap.startsWith(':') ? cap.slice(1).toLowerCase() : cap.toLowerCase());
                            // Only include supported caps, in the order requested
                            supportedCaps = reqCaps.filter(cap => this.supported_client_caps.includes(cap));
                        }
                        await this.safeWriteToSocket(socket, `:${this.servername} CAP ${socket.uniqueId} ACK :${supportedCaps.join(' ').toLowerCase()}\r\n`);
                        this.debugLog('info', `Client with uniqueId ${socket.uniqueId} requested capabilities: ${supportedCaps.join(', ')}`);
                    }                    
                    break;                
                case 'MODE':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (params.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} MODE :Not enough parameters\r\n`);
                        break;
                    }
                    var isChannel = true;
                    channel = this.findChannel(params[0]);
                    if (!channel) {
                        isChannel = false;
                        channel = this.findUser(params[0]);
                    }
                    if (!channel) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[0]} :No such nick/channel\r\n`);
                        break;
                    }
                    if (!this.channelData.has(channel)) {
                        isChannel = false;
                    }
                    // Check if 'channel' is actually a user (nickname) instead of a channel name
                    let isUser = false;
                    for (const prefix of this.channelprefixes) {
                        if (channel.startsWith(prefix)) {
                            isUser = false;
                            break;
                        } else {
                            isUser = true;
                        }
                    }
                    if (!isChannel && !isUser) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${channel} :No such channel or user\r\n`);
                        break;
                    }
                    const mode = params[1];
                    if (isUser) {
                        // User mode handling
                        if (!this.isIRCOp(socket.nickname) && channel !== socket.nickname) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 502 ${socket.nickname} :Cannot set modes on other users\r\n`);
                        } else {

                            var usermodes = this.getUserModes(channel);
                            if (!mode) { 
                                // List user modes
                                if (usermodes.length === 0) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 324 ${socket.nickname} ${channel} :No modes set\r\n`);
                                } else {
                                    const modes = usermodes.map(m => (m.startsWith('+') ? m : '+' + m)).join(' ');
                                    await this.safeWriteToSocket(socket, `:${this.servername} 324 ${socket.nickname} ${channel} :${modes}\r\n`);
                                }
                            } else if (mode.startsWith('+x')) {
                                if (usermodes.includes('x')) {
                                    break;
                                }
                                this.setUserMode(socket.nickname, 'x', true);
                                socket.host = this.filterHostname(socket, socket.realhost);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +x\r\n`);
                                if (socket.client_caps && socket.client_caps.includes('CHGHOST')) {
                                    await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} CHGHOST ${socket.username} ${socket.host}\r\n`);
                                }
                                await this.safeWriteToSocket(socket, `:${this.servername} 396 ${socket.nickname} ${socket.host} :is now your visible host\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +x\r\n`);
                            } else if (mode.startsWith('-x')) {
                                if (!usermodes.includes('x')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'x', false);
                                socket.host = socket.realhost
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -x\r\n`);
                                if (socket.client_caps && socket.client_caps.includes('CHGHOST')) {
                                    await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} CHGHOST ${socket.username} ${socket.host}\r\n`);
                                }
                                await this.safeWriteToSocket(socket, `:${this.servername} 396 ${socket.nickname} ${socket.host} :is now your visible host\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} -x\r\n`);
                            } else if (mode.startsWith('+w')) {
                                if (usermodes.includes('w')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'w', true);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +w\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +w\r\n`);
                            } else if (mode.startsWith('-w')) {
                                if (!usermodes.includes('w')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'w', false);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -w\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} -w\r\n`);
                            } else if (mode.startsWith('+c')) {
                                if (!this.isIRCOp(socket.nickname)) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                                    this.debugLog('warn', `User ${socket.nickname} attempted to set +c mode without being an IRC operator`);
                                    break;
                                }
                                if (usermodes.includes('c')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'c', true);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +c\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +c\r\n`);
                            } else if (mode.startsWith('-c')) {
                                if (!this.isIRCOp(socket.nickname)) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                                    this.debugLog('warn', `User ${socket.nickname} attempted to unset +c mode without being an IRC operator`);
                                    break;
                                }
                                if (!usermodes.includes('c')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'c', false);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -c\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} -c\r\n`);
                            } else if (mode.startsWith('+i')) {
                                if (usermodes.includes('i')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'i', true);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +i\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +i\r\n`);
                            } else if (mode.startsWith('-i')) {
                                if (!usermodes.includes('i')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'i', false);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -i\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} -i\r\n`);
                            } else if (mode.startsWith('+s')) {
                                if (usermodes.includes('s')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 's', true);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +s\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +s\r\n`);
                            } else if (mode.startsWith('-s')) {
                                if (!usermodes.includes('s')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 's', false);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -s\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} -s\r\n`);
                            } else if (mode.startsWith('+B')) {
                                if (usermodes.includes('B')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'B', true);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +B\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +B\r\n`);
                            } else if (mode.startsWith('-B')) {
                                if (!usermodes.includes('B')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'B', false);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -B\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} -B\r\n`);                                
                            } else if (mode.startsWith('+R')) {
                                if (usermodes.includes('R')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'R', true);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +R\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +R\r\n`);
                            } else if (mode.startsWith('-R')) {
                                if (!usermodes.includes('R')) {
                                    break;
                                }                                
                                this.setUserMode(socket.nickname, 'R', false);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -R\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} -R\r\n`);
                            } else if (mode.startsWith('+z') || mode.startsWith('-z')) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :is set by the server and cannot be changed\r\n`);
                            } else if (mode.startsWith('+r') || mode.startsWith('-r')) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :is set by the server and cannot be changed\r\n`);
                            } else if (mode.startsWith('+Z')) {
                                if (!socket.secure) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :You must be secure to set this mode\r\n`);
                                    break;
                                }
                                if (usermodes.includes('Z')) {
                                    break;
                                }
                                this.setUserMode(socket.nickname, 'Z', true);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +Z\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +Z\r\n`);
                            } else if (mode.startsWith('-Z')) {
                                if (!socket.secure) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :You must be secure to set this mode\r\n`);
                                    break;
                                }
                                if (!usermodes.includes('Z')) {
                                    break;
                                }
                                this.setUserMode(socket.nickname, 'Z', false);
                                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -Z\r\n`);
                                await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} -Z\r\n`);
                            } else {
                                await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :is unknown mode char to me\r\n`);
                            }
                        }
                        break;
                    }
                    if (!mode) {
                        // List channel modes
                        if (!this.checkRegistered(socket)) {
                            break;
                        }
                        let validPrefix = this.channelprefixes.some(prefix => channel.startsWith(prefix));
                        if (!validPrefix) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 476 ${socket.nickname} ${channel} :Bad channel mask\r\n`);
                            break;
                        }
                        if (!this.channelData.has(channel)) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                            break;
                        }
                        var chan_modes = this.channelData.get(channel).modes;

                        chan_modes = chan_modes.map(mode => {
                            if (typeof mode === 'string' && !mode.startsWith('+')) {
                                return '+' + mode;
                            }
                            return mode;
                        });
                        if (chan_modes.length > 0) {
                            var params2 = [];
                            // Batch all modes into a single 324 reply
                            var modeString =
                                chan_modes.map(m => {
                                    // For modes with parameters (like k <key> or l<limit>)
                                    if (typeof m === 'string' && (m === '+k' || m === '+l')) {
                                        if (m === '+l') {
                                            params2.push(this.channelData.get(channel).limit);
                                        } else if (m === '+k') {
                                            params2.push(this.channelData.get(channel).key);
                                        }
                                        return m.replace(/^\+/, '');
                                    }
                                    return m.replace(/^\+/, ''); // Remove leading '+' for other modes
                                })
                                .join('');
                            params2.forEach(param => {
                                if (param) {
                                    modeString += ` ${param}`;
                                }
                            });
                            await this.safeWriteToSocket(socket, `:${this.servername} 324 ${socket.nickname} ${channel} +${modeString}\r\n`);
                        } else {
                            await this.safeWriteToSocket(socket, `:${this.servername} 324 ${socket.nickname} ${channel}\r\n`);
                        }
                        await this.safeWriteToSocket(socket, `:${this.servername} 329 ${socket.nickname} ${channel} ${this.channelData.get(channel).timestamp || M}\r\n`);
                        break;
                    } else {
                        // Process channel mode changes
                        await this.processChannelModes(socket.nickname, channel, mode, params.slice(2), socket);
                        break;
                    } 
                case 'NICK':
                    var old_nickname = socket.nickname;
                    var new_nickname = params[0];
                    if (new_nickname.startsWith(':')) {
                        new_nickname = new_nickname.slice(1);
                    }
                    if (!new_nickname || new_nickname.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 431 * :No nickname\r\n`);
                        break;
                    }
                    if (new_nickname.length > this.nicklen) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 432 * ${new_nickname} :Erroneus nickname (too long)\r\n`);
                        break;
                    }                    
                    if (this.findUser(new_nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 433 * ${new_nickname} :Nickname is already in use\r\n`);
                        break; 
                    }
                    for (const prefix of this.channelprefixes) {
                        if (new_nickname.startsWith(prefix)) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 432 * ${new_nickname} :Erroneus nickname (you are not a channel)\r\n`);
                            return;
                        }
                    }
                    for (let i = 0; i < new_nickname.length; i++) {
                        if (!this.allowed_nick_characters.includes(new_nickname[i])) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 432 * ${new_nickname} :Erroneus nickname (invalid character)\r\n`);
                            return;
                        }
                    }
                    if (this.reservednicks && Array.isArray(this.reservednicks)) {
                        if (this.reservednicks.some(nick => nick.toLowerCase() === new_nickname.toLowerCase())) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 432 * ${new_nickname} :This nickname is reserved\r\n`);
                            break;
                        }
                    }
                    // Prevent nick change if user is in any channel with +N mode
                    let inNoNickChangeChannel = false;
                    for (const [ch, channelObj] of this.channelData.entries()) {
                        if (channelObj.users.has(socket.nickname)) {
                            const chanModes = this.channelData.get(ch).modes;
                            if (chanModes.includes('N')) {
                                inNoNickChangeChannel = true;
                                break;
                            }
                        }
                    }
                    if (inNoNickChangeChannel) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 447 * :You cannot change your nickname while in a +N (no nick change) channel\r\n`);
                        break;
                    }

                    if (!socket.nickname) {
                        // If no nickname is set, set it now
                        socket.nickname = new_nickname;
                        this.nicknames.set(socket, socket.nickname);
                    } else if (socket.nickname != new_nickname) {                        
                        this.processNickChange(socket, new_nickname);
                        if (socket.registered) {
                            await this.safeWriteToSocket(socket, `:${old_nickname}!${socket.username}@${socket.host} NICK :${new_nickname}\r\n`);
                            await this.broadcastUser(socket.nickname, `:${old_nickname}!${socket.username}@${socket.host} NICK :${new_nickname}\r\n`, socket);                        
                            await this.broadcastToAllServers(`:${socket.uniqueId} NICK ${new_nickname} :${this.getDate()}\r\n`);
                        }
                    }
                    if (!socket.registered && socket.nickname && socket.username) {
                        var totalSockets = this.clients.length + this.servers.size;
                        var totalSockets = this.clients.length + this.servers.size;
                        this.socketpeak = Math.max(this.socketpeak, totalSockets);                        
                        this.usernames.set(socket.nickname, socket.username);
                        socket.lastspoke = this.getDate();
                        this.usersignontimestamps.set(socket.nickname, socket.timestamp);
                        this.doLogin(socket.nickname, socket);
                    }
                    break;
                case 'USER':
                    if (params.length < 4) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} USER :Not enough parameters\r\n`);
                        this.addSocketError(socket);
                        break;
                    }
                    socket.username = params[0];
                    socket.userinfo = params.slice(3).join(' ').replace(/^:/, '');
                    if (!socket.registered && socket.nickname && socket.username) {
                        var totalSockets = this.clients.length + this.servers.size;
                        this.socketpeak = Math.max(this.socketpeak, totalSockets);                        
                        this.usernames.set(socket.nickname, socket.username);
                        socket.lastspoke = this.getDate();
                        this.usersignontimestamps.set(socket.nickname, socket.timestamp);
                        this.doLogin(socket.nickname, socket);
                    }
                    break;
                case 'JOIN':
                    var key = null;
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    channel = params[0];
                    if (params.length == 2) {
                        key = params[1];
                    }
                    if (channel.includes(',')) {
                        var channels = channel.split(',');
                    } else {
                        var channels = [channel];
                    }
                    for (var ch of channels) {
                        // Simulate a JOIN command for each channel
                        for (let i = 0; i < ch.length; i++) {
                            if (i == 0 && !this.channelprefixes.includes(ch[0])) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                                return;
                            } 
                            if (this.channelprefixes.includes(ch[1])) {
                                ch = ch.slice(1); // Remove double prefix
                            }
                            for (let j = 0; j < ch.slice(1).length; j++) {
                                if (!this.allowed_chan_characters.includes(ch.slice(1)[j])) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                                    return;
                                }
                            }                            
                        }
                        if (this.getUserChannelCount(socket.nickname) >= this.channellimit) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 405 ${socket.nickname} ${ch} :Too many channels\r\n`);
                            continue; // Skip joining this channel
                        }     
                        var validChannel = false;
                        this.channelprefixes.forEach(prefix => {
                            if (ch.startsWith(prefix)) {
                                validChannel = true;
                            }
                        });
                        if (!validChannel) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                            continue; // Skip this channel
                        }
                        if (ch.length < 2 || ch.length > this.channellen) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                            continue; // Skip this channel
                        }
                        let foundChannel = null;
                        for (const existingChannel of this.channelData.keys()) {
                            if (existingChannel.toLowerCase() === ch.toLowerCase()) {
                                foundChannel = existingChannel;
                                break;
                            }
                        }
                        if (foundChannel) {
                            ch = foundChannel;
                        } else {
                            this.createChannel(ch, socket.nickname);
                        }

                        var joinLine = '';
                        if (key) {
                            joinLine = `JOIN ${ch} ${key}`;
                        } else {
                            joinLine = `JOIN ${ch}`;
                        }                                               
                        const [command, ...params] = joinLine.trim().split(' ');
                        
                        const chmodes = this.channelData.get(ch).modes;
                        if (this.isBanned(ch, socket)) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 474 ${socket.nickname} ${ch} :Cannot join channel (+b)\r\n`);
                            continue; // Skip joining this channel
                        }
                        // Check if the user is in too many channels                       
                        if (chmodes.includes('k')) {
                            const channelKey = this.channelData.get(ch).key;
                            // The key must be provided as the second parameter in the JOIN command
                            // params[1] is the key for the first channel, params[2] for the second, etc.
                            // For simplicity, assume only one channel per JOIN or the key is always params[1]
                            const providedKey = params[1];
                            if (!providedKey || providedKey !== channelKey) {
                                var code = (this.clientIsWebTV(socket) ? 474 : 475);
                                await this.safeWriteToSocket(socket, `:${this.servername} ${code} ${socket.nickname} ${ch} :Cannot join channel (+k)\r\n`);
                                continue; // Skip joining this channel
                            }
                        }
                        if (chmodes.includes('l')) {
                            // Channel has a user limit (+l)
                            const limit = this.channelData.get(ch).limit;
                            if (limit !== null && this.channelData.get(ch).users.size >= limit) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 471 ${socket.nickname} ${ch} :Cannot join channel (+l)\r\n`);
                                continue; // Skip joining this channel
                            }
                        }
                        if (chmodes.includes('i')) {
                            // Channel is invite-only (+i)
                            const invited = this.channelData.get(ch).inviteexceptions;
                            let isInvited = false;
                            for (const inviteMask of invited) {
                                isInvited = checkMask(inviteMask, socket);
                                if (isInvited) {
                                    break; // Stop checking if we found a match
                                }
                            }
                            if (!this.channelData.get(ch).invites.has(socket.nickname) && !isInvited) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 473 ${socket.nickname} ${ch} :Cannot join channel (+i)\r\n`);
                                continue; // Skip joining this channel
                            }
                            if (!this.channelData.get(ch).invites.has(socket.nickname)) {
                                this.channelData.get(ch).invites.delete(socket.nickname);
                            }
                        }
                        if (chmodes.includes('O')) {
                            if (!this.isIRCOp(socket.nickname)) {
                                var code = (this.clientIsWebTV(socket) ? 474 : 404);
                                await this.safeWriteToSocket(socket, `:${this.servername} ${code} ${socket.nickname} ${ch} :Cannot join channel (+O)\r\n`);
                                continue; // Skip joining this channel
                            }
                        }
                        if (chmodes.includes('S')) {
                            // Channel is restricted to users with a secure connection (+S)
                            if (!socket.secure) {
                                var code = (this.clientIsWebTV(socket) ? 474 : 468);
                                await this.safeWriteToSocket(socket, `:${this.servername} ${code} ${socket.nickname} ${ch} :Cannot join channel (+S)\r\n`);
                                continue; // Skip joining this channel
                            }
                        }
                        if (chmodes.includes('R')) {
                            // Channel is registered users only (+R)
                            if (!this.getUserModes(socket.nickname).includes('r')) {
                                var code = (this.clientIsWebTV(socket) ? 474 : 447);
                                await this.safeWriteToSocket(socket, `:${this.servername} ${code} ${socket.nickname} ${ch} :Cannot join channel (+R)\r\n`);
                                continue; // Skip joining this channel
                            }
                        }

                        // If we reach here, the user can join the channel
                        // Reuse the JOIN logic for each channel
                        // Only run the code after $PLACEHOLDER$ for each channel
                        // (excluding the code before $PLACEHOLDER$ to avoid duplicate checks)
                        // You can refactor this logic into a helper if needed
                        socket.lastspoke = this.getDate();
                        if (!this.channelData.has(ch)) {
                            this.createChannel(ch, socket.nickname);
                        }
                        var channelObj = this.channelData.get(ch);
                        channelObj.users.add(socket.nickname);
                        await this.broadcastChannelJoin(ch, socket);

                        let modes = channelObj.modes;         
                        let prefix = '';
                        if (channelObj.ops.has(socket.nickname)) {
                            if (socket.client_caps.includes('multi-prefix')) {
                                prefix += '@';
                            } else {
                                prefix = '@';
                            }
                        }
                        if (channelObj.halfops.has(socket.nickname)) {
                             if (socket.client_caps.includes('multi-prefix')) {
                                prefix += '%';
                            } else {
                                if (!prefix) {
                                    prefix = '%';
                                }
                            }
                        }
                        if (channelObj.voices.has(socket.nickname)) {
                            if (socket.client_caps.includes('multi-prefix')) {
                                prefix += '+';
                            } else {
                                if (!prefix) {
                                    prefix = '+';
                                }
                            }
                        }
                        await this.broadcastToAllServers(`:${this.serverId} SJOIN ${this.getDate()} ${ch} +${modes.join('')} :${prefix}${socket.uniqueId}\r\n`);
                        if (channelObj.topic) {
                            const topic = channelObj.topic;
                            if (topic) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 332 ${socket.nickname} ${ch} :${topic}\r\n`);
                            }
                        }
                        var users = this.getUsersInChannel(ch);
                        var output_lines = [];
                        var prefixRegex = new RegExp(`^[${this.supported_prefixes[1]}]`);
                        if (users.length > 0) {
                            users.sort((a, b) => {
                                // Remove any prefixes for comparison                                
                                const cleanA = a.replace(prefixRegex, '');
                                const cleanB = b.replace(prefixRegex, '');
                                // Get privilege for each user
                                var channelObj = this.channelData.get(ch);
                                function getPriv(user) {
                                    if (channelObj.ops.has(user)) return 1;
                                    if (channelObj.halfops.has(user)) return 2;
                                    if (channelObj.voices.has(user)) return 3;
                                    return 4;
                                }
                                const privA = getPriv(cleanA);
                                const privB = getPriv(cleanB);
                                if (privA !== privB) return privA - privB;
                                // If same privilege, sort alphabetically (case-insensitive)
                                return cleanA.localeCompare(cleanB, undefined, { sensitivity: 'base' });
                            });
                            if (socket.client_caps.includes('userhost-in-names')) {
                                const userHosts = users.map(user => {
                                    var nick = this.findUser(user.replace(prefixRegex, ''));
                                    var username = this.usernames.get(nick) || 'unknown';
                                    var host = this.hostnames.get(nick) || 'unknown';
                                    return `${user}!${username}@${host}`;
                                });
                                output_lines.push(`:${this.servername} 353 ${socket.nickname} = ${ch} :${userHosts.join(' ')}\r\n`);
                            } else {
                                output_lines.push(`:${this.servername} 353 ${socket.nickname} = ${ch} :${users.join(' ')}\r\n`);
                            }
                        }
                        output_lines.push(`:${this.servername} 366 ${socket.nickname} ${ch} :End of /NAMES list\r\n`);
                        await this.sendThrottled(socket, output_lines, 0);
                        if (this.isReservedChannel(ch)) {
                            if (this.checkIfReservedChannelOp(socket, ch)) {
                                this.channelData.get(ch).ops.add(socket.nickname);
                                await this.broadcastChannel(ch, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${ch} +o ${socket.nickname}\r\n`);
                            }
                        }
                        var awaymsg = this.awaymsgs.get(socket.nickname);
                        if (awaymsg) {
                            await this.broadcastUserIfCap(socket, `:${socket.nickname}!${socket.username}@${socket.host} AWAY :${awaymsg}\r\n`, socket, 'away-notify');
                        }
                        if (
                            this.irc_config &&
                            Array.isArray(this.irc_config.channels)
                        ) {
                            const channel_data = this.irc_config.channels.find(cfg => cfg.name === ch);
                            if (channel_data && channel_data.intro) {
                                // Send intro messages (array of lines) to the joining user only
                                for (const line of channel_data.intro) {
                                    await this.safeWriteToSocket(socket, `:${ch}!system@${this.servername} PRIVMSG ${ch} :${line}\r\n`);
                                }
                            }
                        }                        
                        if (this.clientIsWebTV(socket) && this.enable_webtv_command_hacks) {
                            var output_lines = [];
                            var channelObj = this.channelData.get(ch);
                            output_lines.push("You have joined " + ch);
                            output_lines.push("Current channel modes: +" + channelObj.modes.join(''));
                            let isOp = channelObj.ops.has(socket.nickname);
                            let isHalfOp = channelObj.halfops.has(socket.nickname);
                            let isVoice = channelObj.voices.has(socket.nickname);
                            if (isOp) {
                                output_lines.push("You are a channel operator (@) in " + ch);
                            } else if (isHalfOp) {
                                output_lines.push("You are a channel half-operator (%) in " + ch);
                            } else if (isVoice) {
                                output_lines.push("You are voiced (+) in " + ch);
                            }
                            this.sendWebTVSpoofedActionTo(socket, ch, output_lines);
                        }
                    }
                    break;
                case 'NAMES':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (params.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} NAMES :Not enough parameters\r\n`);
                        break;
                    }
                    channel = this.findChannel(params[0]);
                    if (!channel || !this.channelData.has(channel)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                        break;
                    }
                    var users = this.getUsersInChannel(channel);
                    var output_lines = [];
                    if (users.length > 0) {
                        if (socket.client_caps.includes('userhost-in-names')) {
                            const userHosts = users.map(user => {
                                var prefixRegex = new RegExp(`^[${this.supported_prefixes[1]}]`);
                                var nick = this.findUser(user.replace(prefixRegex, ''));
                                var username = this.usernames.get(nick) || 'unknown';
                                var host = this.hostnames.get(nick) || 'unknown';
                                return `${user}!${username}@${host}`;
                            });
                            output_lines.push(`:${this.servername} 353 ${socket.nickname} = ${ch} :${userHosts.join(' ')}\r\n`);
                        } else {
                            output_lines.push(`:${this.servername} 353 ${socket.nickname} = ${ch} :${users.join(' ')}\r\n`);
                        }
                    }
                    output_lines.push(`:${this.servername} 366 ${socket.nickname} ${channel} :End of /NAMES list\r\n`);
                    await this.sendThrottled(socket, output_lines);
                    break;
                case 'PART':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    channel = this.findChannel(params[0]);
                    if (!this.channelData.has(channel) || !this.channelData.get(channel).users.has(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 442 ${socket.nickname} ${channel} :You're not on that channel\r\n`);
                        break;
                    }
                    if (this.channelData.get(channel).ops.has(socket.nickname)) {
                        this.channelData.get(channel).ops.delete(socket.nickname);
                    }
                    if (this.channelData.get(channel).halfops.has(socket.nickname)) {
                        this.channelData.get(channel).halfops.delete(socket.nickname);
                    }
                    if (this.channelData.get(channel).voices.has(socket.nickname)) {
                        this.channelData.get(channel).voices.delete(socket.nickname);
                    }                                        
                    socket.lastspoke = this.getDate();
                    if (params.length == 2) {
                        let reason = params.join(' ');
                        if (reason.startsWith(':')) {
                            reason = reason.slice(1);
                        }
                        await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel} :${reason}\r\n`);
                        await this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel} :${reason}\r\n`, socket);
                    } else {
                        await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel}\r\n`);
                        await this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel}\r\n`, socket);
                    }
                    if (this.channelData.has(channel)) {
                        this.channelData.get(channel).users.delete(socket.nickname);
                        if (this.channelData.get(channel).users.size === 0) {
                            this.deleteChannel(channel);
                        }
                    }
                    await this.broadcastToAllServers(`:${socket.uniqueId} PART ${channel}\r\n`);
                    break;
                case 'INVITE':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (params.length < 2) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} INVITE :Not enough parameters\r\n`);
                        break;
                    }
                    const invitee = this.findUser(params[0]);
                    channel = this.findChannel(params[1]);
                    if (!invitee || !channel) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[0]} :No such nick/channel\r\n`);
                        break;
                    }
                    if (!this.channelData.has(channel)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                        break;
                    }
                    if (!this.channelData.get(channel).ops.has(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.socket.nickname} ${channel} :You're not channel operator\r\n`);
                        break;
                    }
                    if (!this.nicknames.has(socket)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${invitee} :No such nick/channel\r\n`);
                        break;
                    }
                    const inviteeSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === invitee);
                    if (!inviteeSocket) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${invitee} :No such nick/channel\r\n`);
                        break;
                    }
                    if (!this.channelData.has(channel) || !this.channelData.get(channel).users.has(invitee)) {
                        if (this.channelData.get(channel).modes.includes('V')) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :Cannot invite users, channel is +V (no invites allowed)\r\n`);
                            break;
                        }
                        const invited = this.channelData.get(channel).invites;
                        invited.add(invitee);
                        await this.safeWriteToSocket(socket, `:${this.servername} 341 ${socket.nickname} ${invitee} ${channel} :Invited to channel\r\n`);
                        await this.broadcastUserIfCapAndChanOp(socket, `:${socket.nickname}!${socket.username}@${socket.host} INVITE ${invitee} ${channel}`, socket, 'invite-notify', channel);
                        await this.safeWriteToSocket(inviteeSocket, `:${this.servername} 341 ${socket.nickname} ${invitee} ${channel} :You have been invited to join ${channel}\r\n`);
                        break;
                    } else {
                        await this.safeWriteToSocket(socket, `:${this.servername} 443 ${socket.nickname} ${invitee} ${channel} :${invitee} is already on that channel\r\n`);
                        break;
                    }
                case 'LIST':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }                    let channelsToList;
                    if (params.length > 0 && params[0]) {
                        channelsToList = params[0].split(',').filter(ch => ch.length > 0);
                    } else {
                        channelsToList = Array.from(this.channelData.keys());
                    }
                    await this.safeWriteToSocket(socket, `:${this.servername} 321 ${socket.nickname} :Channel :Users :Topic\r\n`);
                    for (const channel of channelsToList) {
                        if (!this.channelprefixes.some(prefix => channel.startsWith(prefix))) {
                            continue; // Skip invalid channel names
                        }
                        var modes = this.channelData.get(channel).modes;
                        if (modes.includes('p')) {
                            if (!this.channelData.has(channel) || !this.channelData.get(channel).users.has(socket.nickname)) {
                                continue; // Skip if user is not in the channel
                            }
                        }
                        if (modes.includes('s')) {
                            if (!this.channelData.has(channel) || !this.channelData.get(channel).users.has(socket.nickname)) {
                                continue; // Skip if user is not in the channel
                            }
                        }
                        const users = this.getUsersInChannel(channel);
                        const topic = this.channelData.get(channel).topic;
                        await this.safeWriteToSocket(socket, `:${this.servername} 322 ${socket.nickname} ${channel} ${users.length} :${topic}\r\n`);
                    }
                    await this.safeWriteToSocket(socket, `:${this.servername} 323 ${socket.nickname} :End of /LIST\r\n`);
                    break;
                case 'WHO':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!params[0]) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} WHO :Not enough parameters\r\n`);
                        break;
                    }
                    const target = this.findChannel(params[0]);
                    if (!target) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[0]} :No such nick/channel\r\n`);
                        break;
                    }

                    var isChannel = false;
                    for (const prefix of this.channelprefixes) {
                        if (target.startsWith(prefix)) {
                            isChannel = true;
                            break;
                        }
                    }
                    if (isChannel) {
                        // WHO for channel
                        const modes = this.channelData.get(target).modes
                        if ((modes.includes('p') || modes.includes('s')) && (!this.channelData.has(target) || !this.channelData.get(target).users.has(socket.nickname))) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                            break;
                        }
                        if (this.channelData.has(target)) {
                            const users = this.channelData.get(target).users;
                            for (const user of users) {
                                let cleanUser = user;
                                if (!user) {
                                    continue; // Skip empty users
                                }
                                if (['@', '%', '+'].includes(cleanUser[0])) {
                                    cleanUser = cleanUser.slice(1);
                                }
                                var hostname = this.hostnames.get(cleanUser);
                                var username = this.usernames.get(cleanUser) || cleanUser;
                                var whoisSocket = Array.from(this.nicknames.keys()).find(
                                    s => this.nicknames.get(s).toLowerCase() === cleanUser.toLowerCase()
                                );
                                if (!whoisSocket) {
                                    // try to get server socket
                                    whoisSocket = this.getRemoteServerUserSocket(cleanUser);                                    
                                }
                                var userSecure = false;
                                if (whoisSocket) {
                                    userSecure = whoisSocket.secure;
                                }
                                let prefix = '';
                                var channelObj = this.channelData.get(target);                              
                                if (channelObj.ops.has(cleanUser)) {
                                    prefix = '@';
                                } else if (channelObj.halfops.has(cleanUser)) {
                                    prefix = '%';
                                } else if (channelObj.voices.has(cleanUser)) {
                                    prefix = '+';
                                }
                                var userinfo = this.userinfo.get(cleanUser) || cleanUser;
                                var flags = `${(this.awaymsgs.has(cleanUser)) ? 'G' : 'H'}${(this.isIRCOp(cleanUser)) ? '*' : ''}${(userSecure) ? 'z' : ''}`
                                var secondsIdle = (this.getDate() - whoisSocket.lastspoke);
                                await this.safeWriteToSocket(socket, `:${this.servername} 352 ${socket.nickname} ${target} ${username} ${hostname} ${this.servername} ${cleanUser} ${flags} 0 ${secondsIdle} 0 :${userinfo}\r\n`);
                            }
                        }
                        await this.safeWriteToSocket(socket, `:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                    } else {
                        // WHO for nickname
                        var output_lines = [];
                        if (target.includes('*') || target.includes('?')) {
                            // Wildcard mask search for nicknames
                            const maskRegex = new RegExp('^' + target.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
                            let found = false;
                            for (const [sock, nick] of this.nicknames.entries()) {
                                if (maskRegex.test(nick)) {
                                    if (this.getUserModes(nick).includes('s')) {
                                        continue;
                                    }
                                    found = true;
                                    output_lines.push(`:${this.servername} 352 ${socket.nickname} * ${nick} ${sock.host} ${this.servername} ${nick} ${(this.awaymsgs.has(nick)) ? 'G' : 'H'}${(sock.secure) ? 'z' : ''} :0 ${sock.userinfo}\r\n`);
                                }
                            }
                            if (!found) {
                                output_lines.push(`:${this.servername} 401 ${socket.nickname} ${target} :No such nick/channel\r\n`);
                            }
                            output_lines.push(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                            await this.sendThrottled(socket, output_lines);
                            break;
                        } else {
                            var whoisSocket = Array.from(this.nicknames.keys()).find(
                                s => this.nicknames.get(s).toLowerCase() === target.toLowerCase()
                            );
                            if (whoisSocket) {
                                if (this.getUserModes(whoisSocket.nickname).includes('s')) {
                                    // Skip invisible users
                                    output_lines.push(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                                    break;
                                }
                                output_lines.push(`:${this.servername} 352 ${socket.nickname} * ${whoisSocket.nickname} ${whoisSocket.host} ${this.servername} ${whoisSocket.nickname} ${(this.awaymsgs.has(target)) ? 'G' : 'H'}${(whoisSocket.secure) ? 'z' : ''} :0 ${whoisSocket.userinfo}\r\n`);
                            } else {
                                output_lines.push(`:${this.servername} 401 ${socket.nickname} ${target} :No such nick/channel\r\n`);
                            }
                            output_lines.push(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                            await this.sendThrottled(socket, output_lines);
                            break;
                        }
                    }
                    break;
                case 'PRIVMSG':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    socket.lastspoke = this.getDate();
                    if (params[0]) {
                        const target = params[0];
                        let targets = target.includes(',') ? target.split(',') : [target];
                        if (targets.length > this.maxtargets) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 407 ${socket.nickname} :Too many targets. Maximum allowed is ${this.maxtargets}\r\n`);
                            return;
                        }
                        for (var t of targets) {
                            if (t === this.servername) {
                                var msg = line.slice(line.indexOf(':', 1) + 1);
                                if (msg.startsWith("\x01VERSION")) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} NOTICE ${socket.nickname} :${this.servername} zefIRCd ${this.version} - zefIRCd IRC server - a part of the zefie minisrv project\r\n`);
                                    break;
                                }
                                if (msg.startsWith("\x01PING")) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} NOTICE ${socket.nickname} :\x01PING ${this.getDate()}\r\n`);
                                    break;
                                }
                                if (msg.startsWith("\x01TIME")) {
                                    const dateObj = new Date();
                                    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                    const pad = n => n.toString().padStart(2, '0');
                                    const formattedDate = `${dayNames[dateObj.getDay()]} ${monthNames[dateObj.getMonth()]} ${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())} ${dateObj.getFullYear()}`;
                                    await this.safeWriteToSocket(socket, `:${this.servername} NOTICE ${socket.nickname} :\x01TIME ${formattedDate}\x01\r\n`);
                                    break;
                                }
                            }
                            let isChan = false;
                            for (const prefix of this.channelprefixes) {
                                if (t.startsWith(prefix)) {
                                    isChan = true;
                                    t = this.findChannel(t);
                                    break;
                                }
                            }
                            if (!t) {
                                t = this.findUser(t);
                                isChan = false;
                            }                            
                            if (!t) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${t} :No such nick/channel\r\n`);
                                continue;
                            }
                            var channelObj = this.channelData.get(t);                            
                            var msg = line.slice(line.indexOf(':', 1) + 1);
                            if (isChan) {
                                // Channel message
                                if (channelObj.modes.includes('m')) {
                                    // Channel is moderated (+m)
                                    
                                    if (!channelObj.voices.has(socket.nickname && !channelObj.ops.has(socket.nickname) && !channelObj.halfops.has(socket.nickname))) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+m)\r\n`);
                                        continue;
                                    }
                                }
                                if (channelObj.modes.includes('n')) {
                                    // Channel is no-external-messages (+n)
                                    if (!channelObj.users.has(socket.nickname)) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+n)\r\n`);
                                        continue;
                                    }
                                }
                                if (channelObj.modes.includes('c')) {
                                    // Block all IRC control codes (ASCII 0x00-0x1F except \r and \n)
                                    if (/[\x00-\x09\x0B\x0C\x0E-\x1F]/.test(msg)) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+c)\r\n`);
                                        continue;
                                    }
                                }
                                if (channelObj.modes.includes('C')) {
                                    // channel blocks CTCP, detect if the message contains CTCPS
                                    if (msg.includes('\x01')) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+C)\r\n`);
                                        continue;
                                    }
                                }
                                if (channelObj.modes.includes('O')) {
                                    if (!this.isIRCOp(socket.nickname)) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+O)\r\n`);
                                    }
                                }
                            }
                            if (isChan) {
                                if (!this.channelData.has(t)) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${t} :No such channel\r\n`);
                                    continue;
                                }
                                if (this.clientIsWebTV(socket) && msg.startsWith('/') && this.enable_webtv_command_hacks) {
                                    var wtvcmd = msg.slice(1).split(' ');
                                    if (wtvcmd[0].length > 0) {
                                        if (this.supported_webtv_command_hacks.includes(wtvcmd[0].toUpperCase())) {
                                            var wtvstr = `${wtvcmd[0].toUpperCase()} ${wtvcmd.splice(1).join(' ')}\r\n`;
                                            this.processSocketData(socket, wtvstr);
                                        }
                                    }
                                    continue;
                                }                                
                                await this.broadcastChannel(t, `:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${t} :${msg}\r\n`, socket);
                                await this.broadcastToAllServers(`:${socket.uniqueId} PRIVMSG ${t} :${msg}\r\n`);
                            } else {
                                if (this.awaymsgs.has(t)) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 301 ${socket.nickname} ${t} :${this.awaymsgs.get(t)}\r\n`);
                                }
                                var targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s).toLowerCase() === t.toLowerCase());
                                if (!targetSock) {
                                    // check remote servers
                                    targetSock = this.getRemoteServerUserSocket(t);
                                    if (targetSock) {
                                        const sender_id = this.getUniqueId(socket.nickname);
                                        const unique_id = this.getUniqueId(t);
                                        targetSock.write(`:${sender_id} PRIVMSG ${unique_id} :${msg}\r\n`);
                                        break;
                                    }
                                }
                                if (!targetSock) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${t} :No such nick/channel\r\n`);
                                    continue;
                                }
                                var targetUserModes = this.getUserModes(t);
                                var usermodes = this.getUserModes(socket.nickname);
                                if (targetUserModes.includes('R')) {
                                    if (!usermodes.includes('r')) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 447 ${socket.nickname} ${t} :Cannot send to user (+R)\r\n`);
                                        continue;
                                    }
                                }
                                if (targetUserModes.includes('Z') && !socket.secure) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to user (+Z)\r\n`);
                                    continue;
                                }
                                if (!usermodes || usermodes === true) {
                                    usermodes = [];
                                }
                                if (usermodes.includes('Z') && !targetUserModes.includes('Z')) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to non-+Z user while you are +Z\r\n`);
                                    continue;
                                }
                                targetSock.write(`:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${targetSock.nickname} :${msg}\r\n`);
                                if (socket.client_caps.includes('echo-message')) {
                                    await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${targetSock.nickname} :${msg}\r\n`);
                                }
                            }
                        }
                        return;
                    }
                    break;
                case 'NOTICE':
                    if (!this.checkRegistered(socket, false, true) && params[0] !== this.servername) {                        
                        break;
                    }
                    socket.lastspoke = this.getDate();
                    if (params[0]) {
                        const target = params[0];
                        let targets = target.includes(',') ? target.split(',') : [target];
                        if (targets.length > this.maxtargets) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 407 ${socket.nickname} :Too many targets. Maximum allowed is ${this.maxtargets}\r\n`);
                            return;
                        }
                        for (const t of targets) {
                            let isChan = false;
                            if (t === this.servername) { 
                                // client responding to a system message
                                var msg = line.slice(line.indexOf(':', 1) + 1);
                                if (msg.startsWith('\x01VERSION')) {
                                    socket.client_version = msg.replace('\x01VERSION ', '').replace('\x01', '');
                                    break;
                                }
                            }
                            for (const prefix of this.channelprefixes) {
                                if (t.startsWith(prefix)) {
                                    isChan = true;
                                    t = this.findChannel(t);
                                    break;
                                }
                            }
                            if (!t) {
                                t = this.findUser(t);
                                isChan = false;
                            }                            
                            if (!t) {
                                await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${t} :No such nick/channel\r\n`);
                                continue;
                            }
                            var channelObj = this.channelData.get(t);
                            var msg = line.slice(line.indexOf(':', 1) + 1);
                            if (isChan) {
                                if (!this.channelData.has(t)) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${t} :No such channel\r\n`);
                                    continue;
                                }
                                // Channel notice
                                if (channelObj.modes.includes('n')) {
                                    // Channel is no-external-messages (+n)
                                    if (!this.channelData.get(t).users.has(socket.nickname)) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+n)\r\n`);
                                        continue;
                                    }
                                }
                                if (channelObj.modes.includes('c')) {
                                    // channel blocks color, detect if the message contains color codes
                                    if (/[\x00-\x09\x0B\x0C\x0E-\x1F]/.test(msg)) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+c)\r\n`);
                                        continue;
                                    }
                                }
                                if (channelObj.modes.includes('C')) {
                                    // channel blocks CTCP, detect if the message contains CTCPS
                                    if (msg.includes('\x01')) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+C)\r\n`);
                                        continue;
                                    }
                                }
                                if (channelObj.modes.includes('T')) {
                                    if (
                                        !channelObj.ops.has(socket.nickname) &&
                                        !channelObj.halfops.has(socket.nickname) &&
                                        !channelObj.voices.has(socket.nickname)
                                    ) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${t} :Cannot send to channel (+T)\r\n`);
                                        continue;
                                    }
                                }
                                if (channelObj.modes.includes('O')) {
                                    if (!this.isIRCOp(socket.nickname)) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+O)\r\n`);
                                    }
                                }                                
                                await this.broadcastChannel(t, `:${socket.nickname}!${socket.username}@${socket.host} NOTICE ${t} :${msg}\r\n`, socket);
                                await this.broadcastToAllServers(`:${socket.uniqueId} NOTICE ${t} :${msg}\r\n`);
                            } else {
                                // Assume it's a nick, check if it exists
                                var targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s).toLowerCase() === t.toLowerCase());
                                if (!targetSock) {
                                    // check remote servers
                                    targetSock = this.getRemoteServerUserSocket(t);
                                    if (targetSock) {
                                        const sender_id = this.getUniqueId(socket.nickname);
                                        const unique_id = this.getUniqueId(t);
                                        targetSock.write(`:${sender_id} PRIVMSG ${unique_id} :${msg}\r\n`);
                                        break;
                                    }
                                }                                
                                if (!targetSock) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${t} :No such nick/channel\r\n`);
                                    continue;
                                }
                                var targetUserModes = this.getUserModes(t);
                                var usermodes = this.getUserModes(socket.nickname);
                                if (targetUserModes.includes('R')) {
                                    if (!usermodes.includes('r')) {
                                        await this.safeWriteToSocket(socket, `:${this.servername} 447 ${socket.nickname} ${t} :Cannot send to user (+R)\r\n`);
                                        continue;
                                    }
                                }
                                if (targetUserModes.includes('Z') && !socket.secure) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to user (+Z)\r\n`);
                                    continue;
                                }
                                if (!usermodes || usermodes === true) {
                                    usermodes = [];
                                }
                                if (usermodes.includes('Z') && !targetUserModes.includes('Z')) {
                                    await this.safeWriteToSocket(socket, `:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to non-+Z user while you are +Z\r\n`);
                                    continue;
                                }
                                var cmd = 'NOTICE';
                                if (this.clientIsWebTV(targetSock)) {
                                    cmd = 'PRIVMSG'; // WebTV clients do not support NOTICE, use PRIVMSG instead
                                }
                                targetSock.write(`:${socket.nickname}!${socket.username}@${socket.host} ${cmd} ${targetSock.nickname} :${msg}\r\n`);
                                if (socket.client_caps.includes('echo-message')) {
                                    await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${targetSock.nickname} :${msg}\r\n`);
                                }
                            }
                        }
                        return;                   
                    }
                    break;
                case 'SYSTEM':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `SYSTEM command attempted by non-IRCOp: ${socket.nickname}`);
                        break;
                    }
                    var type = params[0] ? params[0].toUpperCase() : '';
                    var output_lines = [];
                    switch (type) {
                        case "HELP":
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :Available commands:\r\n`);
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :  HELP - Show this help message\r\n`);
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :  LOG - Show server log data\r\n`);
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :  KLINES - Show KLINE data\r\n`);
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :  CHANNELS - Show channel data\r\n`);
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :End of help data\r\n`);
                            break;
                        case "LOG":
                            this.logdata.forEach((logEntry) => {
                                output_lines.push(`:${this.servername} 200 ${socket.nickname} :${logEntry}\r\n`);
                            });
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :End of log data\r\n`);
                            break;
                        case "KLINES":
                            if (this.klines.length === 0) {
                                output_lines.push(`:${this.servername} 200 ${socket.nickname} :No KLINES found\r\n`);
                                break;
                            }
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :KLINE data:\r\n`);
                            for (const kline of this.klines) {
                                output_lines.push(`:${this.servername} 200 ${socket.nickname} :Mask: ${kline.mask}, Expiry: ${kline.expiry}, Reason: ${kline.reason}\r\n`);
                            }
                            output_lines.push(`:${this.servername} 200 ${socket.nickname} :End of KLINE data\r\n`);
                            break;                            
                        case 'CHANNELS':
                            for (const [channelName, channelObj] of this.channelData.entries()) {
                                output_lines.push(`:${this.servername} 200 :Channel: ${channelName}\r\n`);
                                for (const [key, value] of Object.entries(channelObj)) {
                                    let valStr;
                                    if (value instanceof Set) {
                                        valStr = Array.from(value).join(', ');
                                    } else if (typeof value === 'object' && value !== null) {
                                        valStr = JSON.stringify(value);
                                    } else {
                                        valStr = String(value);
                                    }
                                    output_lines.push(`:${this.servername} 200 :  ${key}: ${valStr}\r\n`);
                                }
                            }
                            break;
                        default:
                            output_lines.push(`:${this.servername} 500 ${socket.nickname} :Unknown debug command\r\n`);
                            break;
                    }
                    await this.sendThrottled(socket, output_lines);
                    break;
                case 'PING':
                    await this.safeWriteToSocket(socket, `PONG ${params.join(' ')}\r\n`);
                    break;
                case 'KLINE':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `KLINE command attempted by non-IRCOp: ${socket.nickname}`);
                        break;
                    }
                    if (params.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} KLINE :Not enough parameters\r\n`);
                        break;
                    }
                    var targetMask = params[0];
                    var expiry = this.getDate() + 3600;
                    var reasonParam = 1;
                    if (!isNaN(parseInt(targetMask))) {
                        expiry = this.getDate() + parseInt(targetMask);
                        targetMask = params[1];
                        reasonParam = 2;
                    }
                    if (this.klines.findIndex(k => k.mask === targetMask) !== -1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 200 ${socket.nickname} ${targetMask} :KLINE already exists for this mask\r\n`);
                        break;
                    }
                    var reason = params.slice(reasonParam).join(' ') || '';
                    var kline = {
                        "mask": targetMask,
                        "expiry": expiry,
                        "reason": reason
                    }
                    this.klines.push(kline);
                    this.saveKLinesToFile();
                    if (reason) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 381 ${socket.nickname} :KLINE added for ${targetMask} (duration ${expiry - this.getDate()} seconds) [${reason}]\r\n`);
                    } else {
                        await this.safeWriteToSocket(socket, `:${this.servername} 381 ${socket.nickname} :KLINE added for ${targetMask} (duration ${expiry - this.getDate()} seconds)\r\n`);
                    }
                    await this.scanUsersForKLines();
                    break;
                case 'UNKLINE':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `UNKLINE command attempted by non-IRCOp: ${socket.nickname}`);
                        break;
                    }
                    if (params.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} UNKLINE :Not enough parameters\r\n`);
                        break;
                    }
                    var targetMask = params[0];
                    if (this.klines.findIndex(k => k.mask === targetMask) == -1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 200 ${socket.nickname} ${targetMask} :No such KLINE\r\n`);
                        break;
                    }
                    const klineIndex = this.klines.findIndex(k => k.mask === targetMask);
                    if (klineIndex !== -1) {
                        this.klines.splice(klineIndex, 1);
                    }
                    await this.safeWriteToSocket(socket, `:${this.servername} 381 ${socket.nickname} :KLINE removed for ${targetMask}\r\n`);
                    break;
                case 'WHOIS':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (params.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} WHOIS :Not enough parameters\r\n`);
                        break;
                    }
                    var whoisNick = params[0];
                    var nickCheck = this.findUser(whoisNick);
                    if (nickCheck) {
                        whoisNick = nickCheck;
                        var whoisSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s)=== whoisNick);
                        const whois_username = this.usernames.get(whoisNick);
                        var userinfo = this.userinfo.get(whoisNick) || whoisSocket.userinfo || 'unknown';
                        await this.safeWriteToSocket(socket, `:${this.servername} 311 ${socket.nickname} ${whoisNick} ${whois_username} ${whoisSocket.host} * :${userinfo}\r\n`);
                        if (this.awaymsgs.has(whoisNick)) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 301 ${socket.nickname} ${whoisNick} :${this.awaymsgs.get(whoisNick)}\r\n`);
                        }
                        const userChannels = [];

                        var output_lines = [];
                        for (const [ch, channelObj] of this.channelData.entries()) {
                            if (channelObj.users.has(whoisNick)) {
                                let prefix = '';
                                var chanops = channelObj.ops;
                                var chanhalfops = channelObj.halfops;
                                var chanvoices = channelObj.voices;
                                var modes = channelObj.modes;

                                if ((modes.includes('p') || modes.includes('s')) && (!this.channelData.has(ch) || !this.channelData.get(ch).users.has(socket.nickname))) {
                                    continue; // Skip listing this channel if it's private/secret and user is not in it
                                }
                                 if (chanops.has(whoisNick)) {
                                    if (socket.client_caps.includes('multi-prefix')) {
                                        prefix += '@';
                                    } else {
                                        prefix = '@';
                                    }
                                } 
                                if (chanhalfops.has(whoisNick)) {
                                    if (socket.client_caps.includes('multi-prefix')) {
                                        prefix += '%';
                                    } else {
                                        if (!prefix) {
                                            prefix = '%';
                                        }
                                    }
                                } 
                                if (chanvoices.has(whoisNick)) {
                                    if (socket.client_caps.includes('multi-prefix')) {
                                        prefix += '+';
                                    } else {
                                        if (!prefix) {
                                            prefix = '+';
                                        }
                                    }
                                }
                                userChannels.push(prefix + ch);
                            }
                        }
                        output_lines.push(`:${this.servername} 312 ${socket.nickname} ${whoisNick} ${this.servername} :zefIRCd-${this.version}\r\n`);
                        if (this.isIRCOp(whoisNick)) {
                            output_lines.push(`:${this.servername} 313 ${socket.nickname} ${whoisNick} :is an IRC operator\r\n`);
                        }
                        usermodes = this.getUserModes(whoisNick);
                        if (usermodes && usermodes.includes('s')) {
                            output_lines.push(`:${this.servername} 671 ${socket.nickname} ${whoisNick} :is using a secure connection\r\n`);
                        }
                        if (usermodes && usermodes.includes('r')) {
                            output_lines.push(`:${this.servername} 307 ${socket.nickname} ${whoisNick} :is a registered nick\r\n`);
                        }
                        if (usermodes && usermodes.includes('B')) {
                            output_lines.push(`:${this.servername} 335 ${socket.nickname} ${whoisNick} :is a bot\r\n`);
                        }
                        var now = this.getDate();
                        var userTimestamp = whoisSocket.lastspoke || now;
                        var idleTime = now - userTimestamp;
                        output_lines.push(`:${this.servername} 317 ${socket.nickname} ${whoisNick} ${idleTime} ${this.usersignontimestamps.get(whoisNick) || 0} :seconds idle, signon time\r\n`);
                        if (userChannels.length > 0) {
                            output_lines.push(`:${this.servername} 319 ${socket.nickname} ${whoisNick} :${userChannels.join(' ')}\r\n`);
                        }
                        output_lines.push(`:${this.servername} 318 ${socket.nickname} ${whoisNick} :End of /WHOIS list\r\n`);
                        await this.sendThrottled(socket, output_lines);
                    } else {
                        // Check if whoisNick is a remote server user
                        let foundRemote = false;
                        for (const [srvSocket, users] of this.serverusers.entries()) {
                            if (users && typeof users.has === 'function'
                                ? Array.from(users).some(u => typeof u === 'string' && u.toLowerCase() === whoisNick.toLowerCase())
                                : Array.isArray(users) && users.some(u => typeof u === 'string' && u.toLowerCase() === whoisNick.toLowerCase())
                            ) {
                                // Found remote user
                                const sender_id = this.getUniqueId(socket.nickname);
                                const unique_id = this.getUniqueId(whoisNick);
                                await this.safeWriteToSocket(srvSocket, `:${sender_id} WHOIS :${unique_id}\r\n`);
                                foundRemote = true;
                                break;
                            }
                        }
                        if (!foundRemote) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${whoisNick} :No such nick/channel\r\n`);
                        }
                    }
                    break;
                case 'EVAL':
                    // VERY DANGEROUS
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `EVAL command attempted by non-IRCOp: ${socket.nickname}`);
                        break;
                    }
                    if (!this.enable_eval) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} :Eval is disabled\r\n`);
                        break;
                    }
                    try {
                        const result = eval(params.join(' '));
                        await this.safeWriteToSocket(socket, `:${this.servername} 200 ${socket.nickname} :${result}\r\n`);
                    } catch (error) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 500 ${socket.nickname} :Error evaluating expression\r\n`);
                    }
                    break;
                case 'KILL':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `KILL command attempted by non-IRCOp: ${socket.nickname}`);
                        break;
                    }
                    if (params.length < 2) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} KILL :Not enough parameters\r\n`);
                        break;
                    }
                    const target_nick = this.findUser(params[0]);
                    if (!target_nick) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[0]} :No such nick/channel\r\n`);
                        break;
                    }

                    const killReason = params.slice(1).join(' ');
                    let cleanKillReason = killReason;
                    if (cleanKillReason.startsWith(':')) {
                        cleanKillReason = cleanKillReason.slice(1);
                    }
                    var targetSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === target_nick);
                    if (!targetSocket) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${target_nick} :No such nick/channel\r\n`);
                        break;
                    }

                    // Broadcast the KILL message to all users
                    await this.broadcastUser(target_nick, `:${socket.nickname}!${socket.username}@${socket.host} KILL ${target_nick} :${cleanKillReason}\r\n`);
                    this.terminateSession(targetSocket, true);
                    break;
                case 'QUIT':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    for (const [ch, channelObj] of this.channelData.entries()) {
                        if (channelObj.users.has(socket.nickname)) {
                            channelObj.ops.delete(socket.nickname);
                            channelObj.halfops.delete(socket.nickname);
                            channelObj.voices.delete(socket.nickname);
                        }
                    }
                    if (params.length > 0) {
                        let reason = params.join(' ');
                        if (reason.startsWith(':')) {
                            reason = reason.slice(1);
                        }
                        await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} QUIT :${reason}\r\n`);
                        await this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} QUIT :${reason}\r\n`, socket);
                        await this.broadcastToAllServers(`:${socket.uniqueId} QUIT :${reason}\r\n`);
                        await this.broadcastConnection(socket, `Quit: ${reason}`);
                        socket.signedoff = true;
                    } else {
                        await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} QUIT\r\n`);
                        await this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} QUIT\r\n`, socket);
                        await this.broadcastToAllServers(`:${socket.uniqueId} QUIT :Client disconnected\r\n`);
                        await this.broadcastConnection(socket, 'Quit: Client disconnected');
                        socket.signedoff = true;
                    }
                    this.terminateSession(socket, true);
                    break;
                case 'MOTD':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    await this.doMOTD(socket.nickname, socket);
                    break;
                case 'VERSION':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    await this.safeWriteToSocket(socket, `:${this.servername} 351 ${socket.nickname} ${this.servername} zefIRCd ${this.version} :zefIRCd IRC server - a part of the zefie minisrv project\r\n`);
                    break;
                case 'WALLOPS':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `WALLOPS command attempted by non-IRCOp: ${socket.nickname}`);
                        break;
                    }
                    if (params.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} WALLOPS :Not enough parameters\r\n`);
                        break;
                    }
                    var wallopsMessage = params.join(' ');
                    if (wallopsMessage.startsWith(':')) {
                        wallopsMessage = wallopsMessage.slice(1);
                    }
                    await this.broadcastWallops(`:${socket.nickname}!${socket.username}@${socket.host} WALLOPS :${wallopsMessage}\r\n`);
                case 'VHOST':
                    if (!this.checkRegistered(socket)) {
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname) && !this.allow_public_vhosts) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `VHOST command attempted by non-IRCOp: ${socket.nickname}`);
                        break;
                    }
                    if (params.length < 1) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} VHOST :Not enough parameters\r\n`);
                        break;
                    }
                    const newVHost = params[0];
                    if (!newVHost || !/^[a-zA-Z0-9.-]+$/.test(newVHost)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 501 ${socket.nickname} :Invalid VHost format\r\n`);
                        break;
                    }
                    // Prevent setting VHost to an IP address (IPv4 or IPv6)
                    const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
                    const ipv6Pattern = /^([a-fA-F0-9:]+:+)+[a-fA-F0-9]+$/;
                    if (ipv4Pattern.test(newVHost) || ipv6Pattern.test(newVHost)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 501 ${socket.nickname} :VHost cannot be an IP address\r\n`);
                        break;
                    }
                    dns.lookup(newVHost, async (err, address) => {
                        if (!err && address) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 501 ${socket.nickname} :VHost must not resolve to a real IP (resolved to: ${address})\r\n`);
                            return;
                        }
                        // Set the new VHost for the socket
                        socket.host = newVHost;
                        if (socket.client_caps && socket.client_caps.includes('CHGHOST')) {
                            await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} CHGHOST ${socket.username} ${socket.host}\r\n`);
                        }                        
                        await this.safeWriteToSocket(socket, `:${this.servername} 396 ${socket.nickname} :Your VHost has been changed to ${socket.host}\r\n`);
                    });
                    break;
                case 'STARTTLS':                   
                    socket.upgrading_to_tls = true;
                    await this.safeWriteToSocket(socket, `:${this.servername} 670 ${socket.uniqueId} :STARTTLS successful, go ahead with TLS handshake\r\n`);
                    break;
                default:
                    // Ignore unknown commands
                    break;
            }
        }
    }

    deleteChannel(channel) {
        // Cleans up the channel from all lists
        if (!this.isReservedChannel(channel)) {
            this.channelData.delete(channel);
            this.debugLog('info', `Channel ${channel} deleted`);
        }
    }

    cleanupUserSession(nickname) {
        this.usersignontimestamps.delete(nickname);
        this.usernames.delete(nickname);
        this.usermodes.delete(nickname);
        this.awaymsgs.delete(nickname); 
        this.accounts.delete(nickname); 
        this.userinfo.delete(nickname); 
        this.deleteUserUniqueId(nickname);         
        for (const [ch, channelObj] of this.channelData.entries()) {
            if (channelObj.users.has(nickname)) {
                channelObj.users.delete(nickname);
            }
            if (channelObj.ops.has(nickname)) {
                channelObj.ops.delete(nickname);
            }
            if (channelObj.halfops.has(nickname)) {
                channelObj.halfops.delete(nickname);
            }
            if (channelObj.voices.has(nickname)) {
                channelObj.voices.delete(nickname);
            }
            if (channelObj.invites.has(nickname)) {
                channelObj.invites.delete(nickname);
            }
            if (channelObj.users.size === 0) {
                this.deleteChannel(ch);
            }            
        }
    }
        

    async terminateSession(socket, close = false) {
        // Cleans up the user session and removes them from all channels
        const nickname = this.nicknames.get(socket);
        if (nickname) {
            if (!socket.signedoff) {
                var serverSocket = null;
                for (const [srvSocket, users] of this.serverusers.entries()) {
                    if (users && typeof users.has === 'function' && users.has(nickname)) {               
                        // Don't send QUIT to this server, as it owns the user
                        serverSocket = srvSocket;
                        continue;
                    }
                }
                await this.broadcastUser(nickname, `:${nickname}!${socket.username}@${socket.host} QUIT :Client disconnected\r\n`, socket);
                await this.broadcastToAllServers(`:${socket.uniqueId} QUIT :Client disconnected\r\n`, serverSocket);
                socket.signedoff = true; // Just in case
            }
            this.cleanupUserSession(nickname);
            this.nicknames.delete(socket);
        }
        if (socket.isserver) {
            const srvUsers = this.serverusers.get(socket) || [];
            for (const nickname of srvUsers) {
                // Remove all user data for this server
                this.debugLog('debug', `Removing user ${nickname} from server ${socket.servername}`);
                if (users && typeof users.delete === 'function') {
                    users.delete(nickname);
                }
                this.cleanupUserSession(nickname);                        
            }
            this.servers.delete(socket);
            this.serverusers.delete(socket);
        } else {
            this.clients.filter(c => c !== socket);
        }        
        if (socket._idleInterval) {
            clearInterval(socket._idleInterval);
        }
        if (close) {
            socket.end();
        }
    }

    async sendWebTVNotice(message) {
        // Send a WebTV Global Notice to all WebTV clients
        await this.broadcastToAllWebTVClients(`:${this.servername} NOTICE * :${message}\r\n`);
    }

    async sendWebTVNoticeTo(socket, message) {
        // Sends a WebTV Global Notice to the specified socket        
        if (Array.isArray(message)) {
            message = message.map(line => `:${this.servername} NOTICE * :${line}\r\n`);
            await this.sendThrottled(socket, message);
            return;
        }
        await this.safeWriteToSocket(socket, `:${this.servername} NOTICE * :${message}\r\n`);
    }

    async sendWebTVSpoofedActionTo(socket, channel, message) {
        if (!Array.isArray(message)) {
            message = [message];
        }
        if (this.clientIsWebTV(socket)) {        
            message.forEach(async (line) => {
                const msg = line.split(' ');
                const firstWord = msg[0];
                const action = msg.slice(1).join(' ');
                const message = [`:${firstWord}!system@webtv PRIVMSG ${channel} :\x01ACTION ${action}\x01\r\n`];
                await this.sendThrottled(socket, message);
            });
            return;
        }
    }

    getUserChannelCount(username) {
        // returns the number of channels a user is in
        let count = 0;
        for (const [channel, channelObj] of this.channelData.entries()) {
            if (channelObj.users.has(username)) {
                count++;
            }
        }
        return count;
    }

    getUsersInChannel(channel) {
        // Returns an array of users in a specific channel, with modes applied        
        if (this.channelData.has(channel)) {
            const channelObj = this.channelData.get(channel);
            const ops = channelObj.ops || new Set();
            const halfops = channelObj.halfops || new Set();
            const voices = channelObj.voices || new Set();
            return Array.from(channelObj.users).map(user => {
                if (ops.has(user)) return '@' + user;
                if (halfops.has(user)) return '%' + user;
                if (voices.has(user)) return '+' + user;
                return user;
            });
        }
    }

    async broadcastUser(username, message, exceptSocket = null) {
        // Broadcast a message to all users in any channels that the specified user is in, except the one specified 
        const alreadyNotified = [];
        for (const [channel, channelObj] of this.channelData.entries()) {
            if (channelObj.users.has(username)) {
                for (const user of channelObj.users) {
                    const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                    if (alreadyNotified.includes(sock)) {
                        continue;
                    }
                    if (sock && sock !== exceptSocket) {
                        await this.safeWriteToSocket(sock, message);
                        alreadyNotified.push(sock);
                    }
                }
            }
        }
    }

    async broadcastChannel(channel, message, exceptSocket = null) {
        // Broadcast a message to all users in a specific channel, except the one specified
        const alreadyNotified = [];
        if (this.channelData.has(channel)) {
            const channelObj = this.channelData.get(channel);
            for (const user of channelObj.users) {
                // +Z (secureonly): Restricts private message (PRIVMSG) or notice (NOTICE) reception/sending to users with a secure connection (TLS).
                if (channelObj.modes.includes('Z') && (message.includes('PRIVMSG') || message.includes('NOTICE'))) {
                    const user_modes = this.getUserModes(user);
                    if (user_modes.includes('z')) {
                        const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                        if (alreadyNotified.includes(sock)) {
                            continue;
                        }
                        if (sock && sock !== exceptSocket) {
                            await this.safeWriteToSocket(sock, message);
                            alreadyNotified.push(sock);
                        }
                    }
                }
                else {
                    const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                    if (alreadyNotified.includes(sock)) {
                        continue;
                    }                    
                    if (sock && sock !== exceptSocket) {
                        sock.write(message);
                        alreadyNotified.push(sock);
                    }
                }
            }
        }
    }

    async broadcastChannelWebTV(channel, message, exceptSocket = null) {
        // Broadcast a message to all WebTV users in a specific channel, except the one specified
        const alreadyNotified = [];
        if (this.channelData.has(channel)) {
            const channelObj = this.channelData.get(channel);
            for (const user of channelObj.users) {
                const socket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                if (alreadyNotified.includes(socket)) {
                    continue;
                }
                // Only send to WebTV clients
                if (socket && socket !== exceptSocket && this.clientIsWebTV(socket)) {
                    this.sendWebTVSpoofedActionTo(socket, channel, message)
                    alreadyNotified.push(socket);
                }
            }
        }
    }

    async broadcastChannelJoin(channel, sourceSocket, exceptSocket = null) {
        // Broadcast a channel join message to all users in the channel, except the one specified
        channel = this.findChannel(channel);
        if (!channel) {
            this.debugLog('warn', `Attempted to broadcast join to non-existent channel: ${channel}`);
            return;
        }
        if (this.channelData.has(channel)) {
            const channelObj = this.channelData.get(channel);
            for (const user of channelObj.users) {
                const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                if (sock && sock !== exceptSocket) {
                    if (sock.client_caps && sock.client_caps.includes('extended-join')) {
                        var account = this.accounts.get(sourceSocket.nickname) || '*';
                        var userinfo = this.userinfo.get(sourceSocket.nickname) || '';
                        await this.safeWriteToSocket(sock, `:${sourceSocket.nickname}!${sourceSocket.username}@${sourceSocket.host} JOIN ${channel} ${account} :${userinfo}\r\n`);
                    } else {
                        await this.safeWriteToSocket(sock,`:${sourceSocket.nickname}!${sourceSocket.username}@${sourceSocket.host} JOIN ${channel}\r\n`);
                    }
                }
            }
        } else {
            this.debugLog('warn', `Attempted to broadcast join to non-existent channel: ${channel}`);
        }
    }

    async broadcastToAllServers(message, exceptSocket = null) {
        // Broadcast a message to all server sockets, except the one specified
        for (const [srvSocket, serverName] of this.servers.entries()) {
            if (srvSocket && srvSocket !== exceptSocket) {
                await this.safeWriteToSocket(srvSocket, message);
            }
        }
    }    
  
    async broadcastWallops(message) {
        // Broadcast a message to all users with 'w' or 'o' user modes
        for (const [socket, nickname] of this.nicknames.entries()) {
            const usermodes = this.getUserModes(nickname);
            if (usermodes.includes('w') || usermodes.includes('o')) {
                await this.safeWriteToSocket(socket, message);
            }
        }
    }

    async broadcastToAllClients(message, exceptSocket = null) {
        // Broadcast a message to all connected clients, except the one specified
        for (const client of this.clients) {
            if (client !== exceptSocket) {
                await this.safeWriteToSocket(client, message);
            }
        }
    }

    async broadcastToAllWebTVClients(message, exceptSocket = null) {
        // Broadcast a message to all connected WebTV clients, except the one specified
        for (const client of this.clients) {
            if (client !== exceptSocket && this.clientIsWebTV(client)) {
                await this.safeWriteToSocket(client, message);
            }
        }
    }    

    isIRCOp(nickname) {
        // Check if the user is an IRC operator
        if (!this.getUserModes(nickname)) return false;
        const modes = this.getUserModes(nickname);
        if (Array.isArray(modes)) {
            return modes.includes('o');
        }
        return false;
    }

    isSpyingOnConnections(nickname) {
        if (!this.getUserModes(nickname)) return false;
        const modes = this.getUserModes(nickname);
        if (Array.isArray(modes)) {
            return modes.includes('c');
        }
        return false;
    }

    createChannel(channel, creator) {
        // Create a new channel with the specified creator
        if (!this.channelData.has(channel)) {
            this.channelData.set(channel, {
                users: new Set(),
                ops: new Set([creator]),
                halfops: new Set(),
                voices: new Set(),
                topic: '',
                bans: new Set(),
                exemptions: new Set(),
                invites: new Set(),
                modes: [...this.default_channel_modes],
                mlock: [],
                limit: null,
                key: null,
                timestamp: this.getDate()
            });
        }
    }

    checkMask(mask, socket) {
        // Check if a mask matches a user's socket
        const host = socket.host;
        const realhost = socket.realhost;
        const realaddress = socket.remoteAddress;
        const nickname = this.nicknames.get(socket);
        var fullMask = `*!*@${host}`;
        var fullMask2 = `*!*@${realhost}`;
        var fullMask3 = `*!*@${realaddress}`;
        if (nickname) {
            const userIdent = this.usernames.get(nickname) || nickname;
            fullMask = `${nickname}!${userIdent}@${host}`;
            fullMask2 = `${nickname}!${userIdent}@${realhost}`;
            fullMask3 = `${nickname}!${userIdent}@${realaddress}`;
        }
        

        // If mask does not contain '!', treat as nickname or username only
        if (!mask.includes('!')) {
            // Wildcard match for just the nickname or username
            // Try matching against both nickname and username
            const maskRegex = new RegExp('^' + mask.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
            return maskRegex.test(nickname) || maskRegex.test(userIdent);
        }

        // If mask contains '!', match against full mask (nick!user@host)
        // Split mask into nick, user, host
        const [maskNick, rest] = mask.split('!', 2);
        const [maskUser, maskHost] = (rest || '').split('@', 2);

        // Split fullMask into nick, user, host
        const [fullNick, fullRest] = fullMask.split('!', 2);
        const [fullUser, fullHost] = (fullRest || '').split('@', 2);

        // Build regex for each part, defaulting to '*' if missing
        const nickRegex = new RegExp('^' + (maskNick || '*').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
        const userRegex = new RegExp('^' + (maskUser || '*').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
        const hostRegex = new RegExp('^' + (maskHost || '*').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
        var matches = nickRegex.test(fullNick) && userRegex.test(fullUser) && hostRegex.test(fullHost);
        if (!matches && fullMask2) {
            // Try matching against the real host if available
            const [fullNick2, fullRest2] = fullMask2.split('!', 2);
            const [fullUser2, fullHost2] = (fullRest2 || '').split('@', 2);
            matches = nickRegex.test(fullNick2) && userRegex.test(fullUser2) && hostRegex.test(fullHost2);
        }
        if (!matches && fullMask3) {
            // Try matching against the real IP if available
            const [fullNick3, fullRest3] = fullMask3.split('!', 2);
            const [fullUser3, fullHost3] = (fullRest3 || '').split('@', 2);
            matches = nickRegex.test(fullNick3) && userRegex.test(fullUser3) && hostRegex.test(fullHost3);
        }
        return matches;
    }

    filterHostname(socket, hostname) {
        // Masks the user's hostname or IP for privacy
        const username = this.nicknames.get(socket);
        var modes = null;
        if (username) {
            modes = this.getUserModes(username);
        }
        if (modes) {
            if (Array.isArray(modes) && modes.includes('x')) {
                // Masked hostname for +x users
                if (typeof hostname === 'string') {
                    // Mask everything except the first and last octet for IPv4
                    // Mask IP-like subdomains (e.g., 1-1-1-1.domain.com)
                    const ipSubdomainMatch = hostname.match(/^(\d+)-(\d+)-(\d+)-(\d+)\./);
                    if (ipSubdomainMatch) {
                        return `${ipSubdomainMatch[1]}-x-x-${ipSubdomainMatch[4]}.${hostname.split('.').slice(1).join('.')}`;
                    }
                    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
                    if (ipv4Match) {
                        return `${ipv4Match[1]}.x.x.${ipv4Match[4]}`;
                    }
                    // For hostnames, mask all but the first and last label
                    const parts = hostname.split('.');
                    if (parts.length > 2) {
                        return `${parts[0]}.x.${parts[parts.length - 1]}`;
                    }
                    // Otherwise, just return 'hidden.host'
                    return 'hidden.host';
                }
            }
        }
        return hostname;
    }

    isBanned(channel, socket) {
        // Check if a user is banned from a channel
        const nickname = this.nicknames.get(socket);
        channel = this.findChannel(channel);
        if (!channel) {
            return false;
        }
        if (this.channelData.has(channel).bans) {
            const bans = this.channelData.get(channel).bans;
            // Check if the user's mask matches any ban mask
            let isUserBanned = false;
            for (const banMask of bans) {
                isUserBanned = this.checkMask(banMask, socket);
                if (isUserBanned) {
                    if (this.channelexemptions.has(channel)) {
                        const exemptions = this.channelexemptions.get(channel);
                        for (const exemptMask of exemptions) {
                            isUserBanned = !this.checkMask(exemptMask, socket);
                            if (!isUserBanned) {
                                break;
                            }
                        }
                    }
                }
            }
            return isUserBanned;
        }
        return false;
    }

    findSocketByUniqueId(uniqueId) {
        // Find a socket related to a unique ID
        for (const [socket, nickname] of this.nicknames.entries()) {
            if (socket.uniqueId === uniqueId) {
                // client socket
                return socket;
            }
        }
        for (const [srvSocket, users] of this.serverusers.entries()) {
            const searchID = this.findUserByUniqueId(uniqueId);
            if (users.has(searchID)) {
                // server socket
                return srvSocket;
            }
        }        
        return null;
    }

    findUserByUniqueId(uniqueId) {
        // Find a user by their unique ID
        var uniqueids = this.uniqueids || new Map();
        if (!uniqueids || uniqueids === true) {
            uniqueids = new Map();        
        }
        for (const [nickname, id] of uniqueids.entries()) {
            if (id === uniqueId) {
                return nickname;
            }
        }
        for (const [socket, users] of this.serverusers.entries()) {
            for (const user of users) {
                if (this.getUniqueId(user) === uniqueId) {
                    return user;
                }
            }
        }
        return null;
    }

    addUserUniqueId(nickname, uniqueId) {
        // Add or update the unique ID for a user
        if (!this.uniqueids || this.uniqueids === true) {
            this.uniqueids = new Map();
        }
        this.uniqueids.set(nickname, uniqueId);
    }

    deleteUserUniqueId(nickname) {
        // Remove the unique ID for a user
        if (this.uniqueids && this.uniqueids.has(nickname)) {
            this.uniqueids.delete(nickname);
        }
    }

    async doMOTD(nickname, socket = null) {
        // Sends the Message of the Day (MOTD) to the user
        var output_lines = [];
        output_lines.push(`:${this.servername} 375 ${nickname} :${this.servername} message of the day\r\n`);
        if (!this.irc_config.hide_version) {
            output_lines.push(`:${this.servername} 372 ${nickname} :This is zefIRCd v${this.version}, running on minisrv v${this.minisrv_config.version}\r\n`);
        }
        if (typeof this.irc_motd === 'string' && this.irc_motd.length > 0) {
            output_lines.push(`:${this.servername} 372 ${nickname} :${this.irc_motd}\r\n`);
        } else if (Array.isArray(this.irc_motd) && this.irc_motd.length > 0) {
            for (var line of this.irc_motd) {
                if (line === '') {
                    line = '-';
                }
                output_lines.push(`:${this.servername} 372 ${nickname} :- ${line}\r\n`);
            }
        } else {
            output_lines.push(`:${this.servername} 372 ${nickname} :No message of the day is set\r\n`);
        }
        output_lines.push(`:${this.servername} 376 ${nickname} :End of /MOTD command\r\n`);
        if (socket) {
            await this.sendThrottled(socket, output_lines);
        } else {
            return output_lines;
        }
    }

    isReservedChannel(channel) {
        // Check if the channel is a reserved channel
        if (this.irc_config.channels && Array.isArray(this.irc_config.channels)) {
            return this.irc_config.channels.some(ch => ch.name === channel);
        }
        return false;
    }

    checkIfReservedChannelOp(socket, channel) {
        // Check if the channel is a reserved channel and if the user is an operator for that channel
        if (this.isReservedChannel(channel)) {
            const reservedChannel = this.irc_config.channels.find(ch => ch.name === channel);
            // reservedChannel.ops is an array of masks
            if (reservedChannel && reservedChannel.ops && Array.isArray(reservedChannel.ops)) {
                for (const mask of reservedChannel.ops) {
                    if (this.checkMask(mask, socket)) {
                        return true; // User is an operator for this reserved channel
                    }
                }
            }
        }
        return false; // User is not an operator for this reserved channel
    }

    isRemoteServerUser(socket, username) {
        // Check if the user is a remote server user
        var serverUsers = this.serverusers.get(socket) || new Set();
        if (!serverUsers || serverUsers === true) {
            serverUsers = new Set();
        }
        for (const user of serverUsers) {
            if (typeof user === 'string' && user.toLowerCase() === username.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    addRemoteServerUser(socket, username) {
        // Add a remote server user to the serverusers map
        if (!this.serverusers.has(socket)) {
            this.serverusers.set(socket, new Set());
        }
        this.serverusers.get(socket).add(username);
    }

    getRemoteServerUserSocket(username) {
        // Find the socket of a remote server user by username
        for (const [socket, users] of this.serverusers.entries()) {
            for (const user of users) {
                if (typeof user === 'string' && user.toLowerCase() === username.toLowerCase()) {
                    return socket;
                }
            }
        }
        return null;
    }

    

    getUsernameFromUniqueId(uniqueId) {
        // Find the username associated with a unique ID
        for (const [socket, nickname] of this.nicknames.entries()) {
            if (socket.uniqueId === uniqueId) {
                return nickname;
            }
        }
        for (const [nick, id] of this.uniqueids.entries()) {
            if (id === uniqueId) {
                return nick;
            }
        }
        return null;
    }

    getUniqueId(username) {
        // Find the unique ID for a given username
        const socket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s).toLowerCase() === username.toLowerCase());
        if (socket) {
            return socket.uniqueId;
        } else {
            for (const [nick, id] of this.uniqueids.entries()) {
                if (nick.toLowerCase() === username.toLowerCase()) {
                    return id;
                }
            }
        }
        return null;
    }

    countGlobalUsers() {
        // Counts the total number of users across all clients and server users
        let globalUsers = this.clients.length;
        for (const users of this.serverusers.values()) {
            if (users && typeof users.size === 'number') {
                globalUsers += users.size;
            } else if (Array.isArray(users)) {
                globalUsers += users.length;
            }
        }
        return globalUsers;
    }

    processNickChange(socket, newNick) {        
        // Handles nickname changes, assumes the newNick is already validated
        // Update all channel user lists to use channelData
        for (const [ch, channelObj] of this.channelData.entries()) {
            if (channelObj.users.has(socket.nickname)) {
                channelObj.users.delete(socket.nickname);
                channelObj.users.add(newNick);
            }
        }
        this.usernames.set(newNick, this.usernames.get(socket.nickname) || socket.nickname);
        this.usernames.delete(socket.nickname);
        this.nicknames.set(socket, newNick);
        this.nicknames.delete(socket.nickname);
        this.addUserUniqueId(newNick, socket.uniqueId);
        this.deleteUserUniqueId(socket.nickname);
        this.usermodes.set(newNick, this.getUserModes(socket.nickname) || []);
        this.usermodes.delete(socket.nickname);
        if (this.awaymsgs.has(socket.nickname)) {
            this.awaymsgs.set(newNick, this.awaymsgs.get(socket.nickname) || '');
            this.awaymsgs.delete(socket.nickname);
        }
        this.usersignontimestamps.set(newNick, this.usersignontimestamps.get(socket.nickname) || this.getDate());
        this.usersignontimestamps.delete(socket.nickname);
        socket.nickname = newNick;
    }

    generateUniqueId(socket) {
        // Generate a unique ID
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (this.uniqueids.has(id)) {
            // If the ID already exists, generate a new one
            return this.generateUniqueId(socket);
        }
        return id;
    }

    async sendThrottled(socket, lines, delayMs = 1) {
        for (const line of lines) {
            await new Promise(res => setTimeout(res, delayMs));
            if (socket.writable) {
                await this.safeWriteToSocket(socket, line);
            }
        }
    }

    getDate() {
        // Returns the current timestamp in seconds
        return Math.floor(Date.now() / 1000)
    }

    findChannel(channel) {
        // Normalize the channel name to lowercase for case-insensitive comparison
        let foundChannel = null;
        for (const existingChannel of this.channelData.keys()) {
            if (existingChannel.toLowerCase() === channel.toLowerCase()) {
                foundChannel = existingChannel;
                break;
            }
        }
        return foundChannel;
    }

    findUser(username) {
        // Normalize the username to lowercase for case-insensitive comparison
        let foundUser = null;
        if (typeof username !== 'string') {
            return null;
        }
        for (const [socket, nick] of this.nicknames.entries()) {
             if (nick.toLowerCase() === username.toLowerCase()) {
                foundUser = nick;
                break;
            }
        }
        return foundUser;
    }

    clientIsWebTV(socket) {
        // Check if the client is a WebTV client based on the client version
        if (socket.client_version.includes('WebTV')) {
            return true;
        }
        return false;
    }

    async broadcastUserIfCap(socket, message, exceptSocket = null, client_cap) {
        if (socket.client_caps.includes(client_cap)) {
            await this.broadcastUser(socket.nickname, message, exceptSocket);
        }
    }

    async broadcastUserIfCapAndChanOp(socket, message, exceptSocket = null, client_cap, channel) {
        if (socket.client_caps.includes(client_cap)) {
            // Check if the user is an operator in the specified channel
            channel = this.findChannel(channel);
            if (!channel) {
                this.debugLog('warn', `Attempted to broadcast to channel ${channel} that does not exist.`);
                return;
            }
            const channelObj = this.channelData.get(channel);
            const isOp = channelObj.ops.has(socket.nickname) || false;
            const isHalfOp = channelObj.halfops.has(socket.nickname) || false;
            if (isOp || isHalfOp) {
                await this.broadcastUser(socket.nickname, message, exceptSocket);
            }
        }
    }

    async broadcastConnection(clientSocket, quitMsg = null) {
        // Broadcasts a connection message to all clients with mode +c
        for (const [index, socket] of this.clients.entries()) {
            if (socket !== clientSocket && this.isSpyingOnConnections(socket.nickname)) {
                if (quitMsg) {
                    await this.sendWebTVNoticeTo(socket, `*** Notice --- Client exiting: ${clientSocket.nickname} (${clientSocket.username}@${clientSocket.host}) [${clientSocket.remoteAddress}] [${quitMsg}]`);
                    this.debugLog('info', `Client exiting: ${clientSocket.nickname} (${clientSocket.username}@${clientSocket.host}) [${clientSocket.remoteAddress}] [${quitMsg}]`);
                } else {
                    await this.sendWebTVNoticeTo(socket, `*** Notice --- Client connecting: ${clientSocket.nickname} (${clientSocket.username}@${clientSocket.host}) [${clientSocket.remoteAddress}] {users} [${clientSocket.userinfo}] <${clientSocket.uniqueId}>`);
                    this.debugLog('info', `Client connecting: ${clientSocket.nickname} (${clientSocket.username}@${clientSocket.host}) [${clientSocket.remoteAddress}] {users} [${clientSocket.userinfo}] <${clientSocket.uniqueId}>`);
                }
            }
        }         
    }

    getUserModes(nickname) {
        // Returns the user modes for a given nickname
        let foundSocket = null;
        for (const [socket, nick] of this.nicknames.entries()) {
            if (nick.toLowerCase() === nickname.toLowerCase()) {
                foundSocket = socket;
                nickname = socket.nickname; // Ensure we use the correct nickname
                break;
            }
        }
        if (!foundSocket) {
            // Also search this.serverusers for remote users (case-insensitive)
            for (const [srvSocket, users] of this.serverusers.entries()) {
                if (users && typeof users.forEach === 'function') {
                    for (const user of users) {
                        if (typeof user === 'string' && user.toLowerCase() === nickname.toLowerCase()) {
                            foundSocket = srvSocket;
                            nickname = user;
                            break;
                        }
                    }
                } else if (Array.isArray(users)) {
                    for (const user of users) {
                        if (typeof user === 'string' && user.toLowerCase() === nickname.toLowerCase()) {
                            foundSocket = srvSocket;
                            nickname = user;
                            break;
                        }
                    }
                }
                if (foundSocket) break;
            }
        }
        if (!foundSocket) {
            return null;
        }
        var modes = this.usermodes.get(nickname);
        if (!modes || modes === true) {
            this.usermodes.set(nickname, [...this.default_user_modes]);
        }
        return this.usermodes.get(nickname);
    }

    setUserMode(nickname, mode, adding) {
        // Sets a user mode for a given nickname
        const modes = this.getUserModes(nickname);
        if (adding) {
            if (!modes.includes(mode)) {
                modes.push(mode);
            }
        } else {
            const index = modes.indexOf(mode);
            if (index !== -1) {
                modes.splice(index, 1);
            }
        }
    }

    async getHostname(socket) {
        // Resolve the hostname for a socket, using reverse DNS lookup
        if (socket && socket.remoteAddress) {
            try {
                var hostname = socket.remoteAddress
                hostname = await new Promise((resolve) => {
                    dns.reverse(socket.remoteAddress, (err, hostnames) => {
                        if (!err && hostnames && hostnames.length > 0) {
                            socket.hostname_resolved = true;
                            this.safeWriteToSocket(socket, `:${this.servername} NOTICE AUTH :*** Hostname found: ${hostnames[0]}\r\n`);
                            resolve(hostnames[0]);
                        } else {
                            if (!err) {
                                err = 'Domain name not found';
                            }
                            socket.hostname_resolved = true;
                            this.safeWriteToSocket(socket, `:${this.servername} NOTICE AUTH :*** Could not resolve your hostname: ${err}; using your IP address (${socket.remoteAddress}) instead.\r\n`);
                            resolve(socket.remoteAddress);
                        }
                    });
                });
            } catch (e) {
                this.debugLog('error', `Error resolving hostname for ${socket.remoteAddress}: ${e}`);
                socket.hostname_resolved = true;
                await this.safeWriteToSocket(socket, `:${this.servername} NOTICE AUTH :*** Could not resolve your hostname: ${e}; using your IP address (${socket.remoteAddress}) instead.\r\n`);
            }
            return hostname;
        }
    }

    async doInitialHandshake(socket) {
        // Perform the initial handshake with the client
        // We pause the socket to prevent sending data before the hostname is resolved
        await this.safeWriteToSocket(socket, `:${this.servername} NOTICE AUTH :*** Looking up your hostname\r\n`);
        socket.pause();
        socket.host = await this.getHostname(socket);
        socket.resume();
        socket.realhost = socket.host;        
    }

    async scanSocketForKLine(socket) {
        for (const kline of this.klines) {
            if (this.checkMask(kline.mask, socket)) {
                if (kline.expiry && kline.expiry > this.getDate()) {
                    if (kline.reason) {
                        await this.safeWriteToSocket(socket, `:${this.servername} KILL ${socket.nickname} :K-lined: ${kline.reason}\r\n`);
                        await this.broadcastToAllServers(`:${socket.uniqueId} KILL ${socket.uniqueId} :K-lined: ${kline.reason}\r\n`, socket);
                    } else {
                        await this.safeWriteToSocket(socket, `:${this.servername} KILL ${socket.nickname} :K-lined\r\n`);
                        await this.broadcastToAllServers(`:${socket.uniqueId} KILL ${socket.uniqueId} :K-lined\r\n`, socket);
                    }
                    this.terminateSession(socket, true);
                    return true;
                } else {
                    const klineIndex = this.klines.findIndex(k => k.mask === kline.mask);
                    if (klineIndex !== -1) {
                        this.klines.splice(klineIndex, 1);
                    }
                    this.saveKLinesToFile();
                }
            }
        }
        return false;        
    }

    async scanUsersForKLines() {
        for (const kline of this.klines) {
            for (const socket of this.nicknames.keys()) {
                if (this.checkMask(kline.mask, socket)) {
                    if (kline.expiry && kline.expiry > this.getDate()) {
                        if (kline.reason) {
                            await this.safeWriteToSocket(socket, `:${this.servername} KILL ${socket.nickname} :K-lined: ${kline.reason}\r\n`);
                            await this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} KILL :K-lined: ${kline.reason}\r\n`);
                        } else {
                            await this.safeWriteToSocket(socket, `:${this.servername} KILL ${socket.nickname} :K-lined\r\n`);
                            await this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} KILL :K-lined\r\n`);
                        }
                        await this.broadcastToAllServers(`:${socket.uniqueId} KILL ${socket.uniqueId} :K-lined: ${kline.reason}\r\n`, socket);
                        this.terminateSession(socket, true);
                    } else {
                        const klineIndex = this.klines.findIndex(k => k.mask === kline.mask);
                        if (klineIndex !== -1) {
                            this.klines.splice(klineIndex, 1);
                        }
                        this.saveKLinesToFile();
                    }
                }
            }
        }
    }

    saveKLinesToFile() {
        // Ensure the session store directory exists
        if (!fs.existsSync(this.session_store_path)) {
            fs.mkdirSync(this.session_store_path, { recursive: true });
        }
        // Save the KLines to a file
        fs.writeFileSync(this.klines_path, JSON.stringify(this.klines, null, 2));        
    }

    loadKLinesFromFile() {
        // Load KLines from a file if it exists
        if (fs.existsSync(this.klines_path)) {
            const data = fs.readFileSync(this.klines_path, 'utf8');
            this.klines = JSON.parse(data);
        }
    }

    getGitRevision() {
        try {
            var gitPath = __dirname + path.sep + ".." + path.sep + ".." + path.sep + ".." + path.sep + ".git" + path.sep
            const rev = fs.readFileSync(gitPath + "HEAD").toString().trim();
            if (rev.indexOf(':') === -1) {
                return rev;
            } else {
                return fs.readFileSync(gitPath + rev.substring(5)).toString().trim().substring(0, 8) + "-" + rev.split('/').pop();
            }
        } catch (e) {
            return null;
        }
    }    

    isChannelOp(nickname, channel) {
        // Check if the user is a channel operator
        channel = this.findChannel(channel);
        if (!channel) {
            return false; // Channel not found
        }
        const channelOps = this.channelData.get(channel).ops;
        if (channelOps === true) {
            return false;
        }
        if (channelOps.has(nickname)) {
            return true; // User is a channel operator
        }
        // Check if the user is an IRC operator
        if (this.isIRCOp(nickname)) {
            return true; // IRC operator is considered a channel operator
        }
    }

    isChannelHalfOp(nickname, channel) {
        // Check if the user is a channel half-operator
        channel = this.findChannel(channel);
        if (!channel) {
            return false; // Channel not found
        }
        const channelHalfOps = this.channelData.get(channel).halfops;
        if (channelHalfOps === true) {
            return false;
        }
        if (channelHalfOps.has(nickname)) {
            return true; // User is a channel half-operator
        }
        // Check if the user is an IRC operator
        if (this.isIRCOp(nickname)) {
            return true; // IRC operator is considered a channel half-operator
        }
    }


    processChannelModeParams(channel, mode, target) {
        if (!target) {
            this.debugLog('warn', `No target specified for mode ${mode} on channel ${channel}`);
            return false;
        }
        if (mode === '+o' || mode === '-o') {
            var channelOps = this.channelData.get(channel).ops;
            if (mode === '+o') {
                if (!channelOps.has(target)) {
                    channelOps.add(target);
                    return true;
                }
            } else if (mode === '-o') {
                if (channelOps.has(target)) {
                    channelOps.delete(target);
                    return true;
                }
            }
        } else if (mode === '+h' || mode === '-h') {
            var channelHalfOps = this.channelData.get(channel).halfops;
            if (mode === '+h') {
                if (!channelHalfOps.has(target)) {
                    channelHalfOps.add(target);
                    return true;
                }
            } else if (mode === '-h') {
                if (channelHalfOps.has(target)) {
                    channelHalfOps.delete(target);
                    return true;
                }
            }
        } else if (mode === '+v' || mode === '-v') {
            var channelVoices = this.channelData.get(channel).voices;
            if (mode === '+v') {
                if (!channelVoices.has(target)) {
                    channelVoices.add(target);
                    return true;
                }
            } else if (mode === '-v') {
                if (channelVoices.has(target)) {
                    channelVoices.delete(target);
                    return true;
                }
            }
        } else if (mode === '+b' || mode === '-b') {
            var channelBans = this.channelData.get(channel).bans;
            if (mode === '+b') {
                if (!channelBans.includes(target)) {
                    channelBans.push(target);
                    return true;
                }
            } else if (mode === '-b') {
                if (channelBans.includes(target)) {
                    channelBans = channelBans.filter(ban => ban !== target);
                    return true;
                }
            }
        } else if (mode === '+e' || mode === '-e') {
            var channelExemptions = this.channelData.get(channel).exemptions;
            if (mode === '+e') {
                if (!channelExemptions.includes(target)) {
                    channelExemptions.push(target);
                    return true;
                }
            } else if (mode === '-e') {
                if (channelExemptions.includes(target)) {
                    channelExemptions = channelExemptions.filter(exception => exception !== target);
                    return true;
                }
            }
        } else if (mode === '+I' || mode === '-I') {
            var channelInvites = this.channelData.get(channel).inviteexemptions;
            if (mode === '+I') {
                if (!channelInvites.includes(target)) {
                    channelInvites.push(target);
                    return true;
                }
            } else if (mode === '-I') {
                if (channelInvites.includes(target)) {
                    channelInvites = channelInvites.filter(invite => invite !== target);
                    return true;
                }
            }
        } else if (mode === '+l' || mode === '-l') {
            if (mode === '+l') {
                var result = this.setChannelMode(channel, 'l', true);
                if (result === false && this.channelData.get(channel).limit === parseInt(target)) {
                    return false; // Mode already set with the same limit
                }
                this.channelData.get(channel).limit = parseInt(target);
                return true;
            } else {
                var result = this.setChannelMode(channel, 'l', false);
                if (result === false && this.channelData.get(channel).limit === null) {
                    return false; // Mode already unset
                }
                this.channelData.get(channel).limit = null;
                return true;
            }
        } else if (mode === '+k' || mode === '-k') {
            if (mode === '+k') {
                var result = this.setChannelMode(channel, 'k', true);
                if (result === false && this.channelData.get(channel).key === target) {
                    return false; // Mode already set with the same key
                }
                this.channelData.get(channel).key = target;
                return true;
            } else {                
                var result = this.setChannelMode(channel, 'k', false);
                if (result === false && !this.channelData.get(channel).key) {
                    return false; // Mode already unset
                }
                this.channelData.get(channel).key = null;
                return true;
            }
        } 
    }

    async processChannelModes(nickname, channel, modes, params, socket) {
        // Split modes into array and process each character        
        let modeChars = modes.split('');
        let validModes = [];
        let supportedChannelModes = (this.supported_channel_modes.split(',').join('') + this.supported_prefixes[0]).split('');
        var serverModeMsg = '';
        var target = null;
        if (socket.isserver) {
            let sourceUniqueId = this.uniqueids.get(nickname);
            serverModeMsg = `:${sourceUniqueId} MODE ${channel} `;
        } else {
            if (!this.checkRegistered(socket)) {
                return;
            }
            serverModeMsg = `:${socket.uniqueId} MODE ${channel} `;
        }
        var username = this.usernames.get(nickname);
        var hostname = this.hostnames.get(nickname);

        let modeMsg = `:${nickname}!${username}@${hostname} MODE ${channel} `;
        let WTVMsg = `${nickname} has set channel mode `;
        let addingFlag = false;
        let paramIndex = 0;        
        if (!socket.isserver) {
            if (modeChars.includes('o')) {
                if (!this.isIRCOp(nickname) && !this.isChannelOp(nickname, channel)) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 482 ${nickname} ${channel} :You're not a channel operator\r\n`);
                    return;
                }
            }
            else if (modeChars.includes('O')) {
                if (!this.isIRCOp(nickname))
                {
                    await this.safeWriteToSocket(socket, `:${this.servername} 482 ${nickname} ${channel} :You're not an IRC operator\r\n`);
                    return;
                }
            } else if (modes === 'b') {
                // Get the list of channel bans
                var output_lines = [];
                if (this.channelData.has(channel).bans) {
                    const bans = this.channelData.has(channel).bans;
                    for (const ban of bans) {
                        output_lines.push(`:${this.servername} 367 ${nickname} ${channel} ${ban}\r\n`);
                    }
                }
                output_lines.push(`:${this.servername} 368 ${nickname} ${channel} :End of channel ban list\r\n`);
                await this.sendThrottled(socket, output_lines);
                return;
            } else if (modes === 'e') {
                // Get the list of channel exemptions
                var output_lines = [];
                if (this.channelData.has(channel).exemptions) {
                    const exemptions = this.channelData.has(channel).exemptions;
                    for (const exemption of exemptions) {
                        output_lines.push(`:${this.servername} 348 ${nickname} ${channel} ${exemption}\r\n`);
                    }
                }
                output_lines.push(`:${this.servername} 349 ${nickname} ${channel} :End of channel exception list\r\n`);
                await this.sendThrottled(socket, output_lines);
                return;
            } else if (modes === 'I') {
                // Get the list of channel invites masks
                var output_lines = [];
                if (this.channelData.has(channel).invites) {
                    const invites = this.channelData.has(channel).invites;
                    for (const invite of invites) {
                        output_lines.push(`:${this.servername} 336 ${nickname} ${channel} ${invite}\r\n`);
                    }
                }
                output_lines.push(`:${this.servername} 337 ${nickname} ${channel} :End of channel invite list\r\n`);
                await this.sendThrottled(socket, output_lines);
                return;
            } else {
                if (!this.isIRCOp(nickname) && !this.isChannelOp(nickname, channel) && !this.isChannelHalfOp(nickname, channel)) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 482 ${nickname} ${channel} :You're not a channel operator\r\n`);
                    return;
                }
            }
        }
        for (let j = 0; j < modeChars.length; j++) {
            let param = null;
            let modeStr = '';
            let mc = modeChars[j];
            if (mc === '+') {
                addingFlag = true;
                modeMsg += '+';
                WTVMsg += '+';
                serverModeMsg += '+';
                continue;
            } else if (mc === '-') {
                addingFlag = false;
                modeMsg += '-';
                WTVMsg += '-';
                serverModeMsg += '-';
                continue;
            }
            if (!supportedChannelModes.includes(mc)) {
                if (!socket.isserver) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 472 ${nickname} ${channel} :Unknown channel mode char: ${mc}\r\n`);
                }
                continue;
            }
            modeStr += mc;
            // Modes that require a parameter
            if ([...this.supported_prefixes[0], 'I', 'b', 'e', 'l', 'k'].includes(mc)) {
                var plusminus = (addingFlag) ? "+" : "-";
                param = params[paramIndex];
                if (socket.isserver) {
                    target = this.findUserByUniqueId(param);
                } else {
                    target = this.findUser(param);
                }
                if ((!target && !socket.isserver) || !this.channelData.get(channel).users.has(target)) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 401 ${nickname} ${param} :No such nick/channel\r\n`);
                    return;
                }
                var result = this.processChannelModeParams(channel, plusminus + mc, target, socket);
                paramIndex++;
                if (!result) {
                    if (params.length > 0) {
                        params.shift();
                    }
                }
            } else {
                var result = this.setChannelMode(channel, mc, addingFlag);
                if (addingFlag) {
                    if (mc === 'S' && this.kick_insecure_users_on_secure) {
                        // Kick users who do not have user mode +z
                        const usersInChannel = this.channelData.get(channel).users;
                        for (const user of usersInChannel) {
                            const userSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                            if (userSocket && !userSocket.secure) {
                                await this.safeWriteToSocket(userSocket, `:${nickname}!${username}@${socket.host} KICK ${channel} ${userSocket.nickname} :Channel is now +S (SSL-only, +z usermode required)\r\n`);
                                await this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} KICK ${channel} ${userSocket.nickname} :Channel is now +S (SSL-only, +z usermode required)\r\n`, userSocket);
                                await this.broadcastToAllServers(`:${sourceUniqueId} KICK ${channel} ${userSocket.uniqueId} :Channel is now +S (SSL-only, +z usermode required)\r\n`);
                                this.channelData.get(channel).users.delete(userSocket.nickname);
                            }
                        }
                    }                                                    
                }
            }
            if (result) {
                WTVMsg += mc;
                validModes.push(mc);
                if (modeStr.length > 0) {
                    modeMsg += modeStr;
                    serverModeMsg += modeStr;
                }
            }
        }
        if (params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                if (socket.isserver) {
                    modeMsg += ' ' + this.findUserByUniqueId(params[i]);
                } else {
                    modeMsg += ' ' + params[i];
                    WTVMsg += ' ' + params[i];
                }
                serverModeMsg += ' ' + params[i];
            }
        }
        if (modeMsg.endsWith('-') || modeMsg.endsWith('+')) {
            return;
        }
        modeMsg += '\r\n';
        if (validModes.length > 0) {
            await this.broadcastChannel(channel, modeMsg);
            await this.broadcastChannelWebTV(channel, WTVMsg);
            await this.broadcastToAllServers(serverModeMsg, socket);
        }
    }

    async addSocketError(socket) {
        socket.error_count++;
        if (socket.error_count >= 5) {
            if (socket.writable) {
                await this.safeWriteToSocket(socket, `:${this.servername} :ERROR :Too many errors, disconnecting\r\n`);
            }
            this.terminateSession(socket, true);
            return;
        }        
        setTimeout((socket) => {
            if (socket) {
                socket.error_count--;
            }
        }, 60000);
    }

    async checkRegistered(socket, allowUnregistered = false, silent = false) {
        var retval = false
        if (socket.isserver) {
            if (!socket.is_srv_authorized && (!socket.registered && !allowUnregistered)) {
                if (socket.writable && !silent) {
                    await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Unauthorized\r\n`);
                }
                this.addSocketError(socket);
            } else {
                retval = true; // Server is authorized
            }
        }
        if (!socket.registered && (!socket.registered && !allowUnregistered)) {
            if (socket.writable && !silent) {
                await this.safeWriteToSocket(socket, `:${this.servername} 451 ${socket.uniqueId} :You have not registered\r\n`);
            }
            this.addSocketError(socket);
        } else {
            retval = true; // User is registered        
        }
        return retval;
    }

    setChannelMode(channel, mode, adding) {
        // Updates the channel modes for a given channel
        const modes = this.channelData.get(channel).modes;
        if (!modes) {
            return false; // Channel not found
        }
        if (adding) {
            if (!modes.includes(mode)) {
                modes.push(mode);
                return true;
            }
        } else {
            const index = modes.indexOf(mode);
            if (index !== -1) {
                modes.splice(index, 1);
                return true;
            }
        }
        return false; // Mode not changed
    }

    debugLog(type = 'debug', ...message) {
        const parsedMessage = message.map(m =>
            typeof m === 'object' ? JSON.stringify(m) : String(m)
        ).join(' ');

        // Logs debug messages to the console if debugging is enabled
        switch (type) {
            case 'debug':
                this.logdata.push(`[DEBUG] ${parsedMessage}`);
                if (this.debug) {
                    console.log(`[DEBUG] ${parsedMessage}`);
                }
                break;
            case 'warn':
                this.logdata.push(`[WARN] ${parsedMessage}`);
                if (this.debug) {
                    console.warn(`[WARN] ${parsedMessage}`);
                }
                break;
            case 'error':
                this.logdata.push(`[ERROR] ${parsedMessage}`);
                if (this.debug) {
                    console.error(`[ERROR] ${parsedMessage}`);
                }
                break;
            case 'info':
                this.logdata.push(`[INFO] ${parsedMessage}`);
                if (this.debug) {
                    console.info(`[INFO] ${parsedMessage}`);
                }
                break;
            default:
                this.logdata.push(`[LOG] ${parsedMessage}`);
                if (this.debug) {
                    console.log(`[LOG] ${parsedMessage}`);
                }
         }
        if (this.logdata.length > this.max_log_lines) {
            this.logdata.shift();
        }
    }

    async doLogin(nickname, socket) {
        if (await this.scanSocketForKLine(socket)) {
            return; // If the socket is K-lined, exit early
        }
        this.addUserUniqueId(nickname, socket.uniqueId);
        this.hostnames.set(nickname, socket.host);
        this.realhosts.set(nickname, socket.realhost);
        await this.safeWriteToSocket(socket, `:${this.servername} PRIVMSG ${socket.nickname} :\x01VERSION\x01\r\n`);
        let waited = 0;
        while (socket.client_version === '' && waited < 3000) {
            await new Promise(res => setTimeout(res, 100));
            waited += 100;
        }
        var output_lines = []
        output_lines.push(`:${this.servername} NOTICE AUTH :Welcome to \x02${this.network}\x0F\r\n`);
        output_lines.push(`:${this.servername} 001 ${nickname} :Welcome to the IRC server, ${nickname}\r\n`);
        output_lines.push(`:${this.servername} 002 ${nickname} :Your host is ${this.servername}, running version zefIRCd v${this.version}\r\n`);
        output_lines.push(`:${this.servername} 003 ${nickname} :This server is ready to accept commands\r\n`);
        // Sort supported_channel_modes and supported_user_modes alphabetically with capitals first
        function sortModesAlphaCapsFirst(modes) {
            // Remove commas, split to chars, sort, then re-insert commas if needed
            // If input is comma-separated groups, sort each group
            return modes
            .split(',')
            .map(group => {
                return group
                .split('')
                .sort((a, b) => {
                    // Capital letters first, then lowercase, then numbers/symbols
                    if (a === b) return 0;
                    const isACap = a >= 'A' && a <= 'Z';
                    const isBCap = b >= 'A' && b <= 'Z';
                    const isALower = a >= 'a' && a <= 'z';
                    const isBLower = b >= 'a' && b <= 'z';
                    if (isACap && !isBCap) return -1;
                    if (!isACap && isBCap) return 1;
                    if (isALower && !isBLower) return -1;
                    if (!isALower && isBLower) return 1;
                    return a.localeCompare(b);
                })
                .join('');
            })
            .join(',');
        }
        let channelModesParts = this.supported_channel_modes.split(',');
        if (channelModesParts.length > 1) {
            let modesToSort = channelModesParts.slice(0, -1).join('').split('');
            modesToSort.push(...this.supported_prefixes[0].split(''));
            modesToSort = Array.from(new Set(modesToSort)); // remove duplicates
            modesToSort.sort();
            var sortedModesWithParams = modesToSort.join('');
        }
        var channelModes = this.supported_channel_modes.split(',').join('') + this.supported_prefixes[0];
        var sortedChannelModes = sortModesAlphaCapsFirst(channelModes).replace(/,/g, '');
        var sortedUserModes = sortModesAlphaCapsFirst(this.supported_user_modes);
        output_lines.push(`:${this.servername} 004 ${nickname} ${this.servername} zefIRCd-${this.version} ${sortedUserModes} ${sortedChannelModes} ${sortedModesWithParams}\r\n`);
        for (const caps of this.caps) {
            output_lines.push(`:${this.servername} 005 ${caps}\r\n`);
        }
        socket.registered = true;
        output_lines.push(`:${this.servername} 042 ${nickname} ${socket.uniqueId} :your unique ID\r\n`);

        output_lines.push(...(await this.doMOTD(nickname)));        

        const visibleClients = Array.from(this.nicknames.values()).filter(nick => {
            const modes = this.usermodes.get(nick) || [];
            return !modes.includes('i');
        });
        const invisibleClients = Array.from(this.nicknames.values()).filter(nick => {
            const modes = this.usermodes.get(nick) || [];
            return modes.includes('i');
        });
        const operClients = Array.from(this.nicknames.values()).filter(nick => {
            const modes = this.usermodes.get(nick) || [];
            return modes.includes('o');
        });        
        const serverCount = this.servers.size + 1; // Include this server
        output_lines.push(`:${this.servername} 251 ${nickname} :There are ${visibleClients.length} visible users and ${invisibleClients.length} invisible users on this server\r\n`);
        if (operClients.length > 0) {
            output_lines.push(`:${this.servername} 252 ${nickname} ${operClients.length} :operator(s) online\r\n`);
        }
        if (this.channelData.size > 0) {
            output_lines.push(`:${this.servername} 253 ${nickname} ${this.channelData.size} :channels formed\r\n`);
        }
        output_lines.push(`:${this.servername} 255 ${nickname} :I have ${this.clients.length} clients and ${serverCount} servers\r\n`);
        output_lines.push(`:${this.servername} 265 ${nickname} :Current Local Users: ${this.clients.length}  Max: ${this.clientpeak}\r\n`);
        const globalUsers = this.countGlobalUsers();
        this.globalpeak = Math.max(this.globalpeak, this.countGlobalUsers());
        var totalSockets = this.clients.length + this.servers.size;
        this.socketpeak = Math.max(this.socketpeak, totalSockets);

        output_lines.push(`:${this.servername} 266 ${nickname} :Current Global Users: ${globalUsers}  Max: ${this.globalpeak}\r\n`);
        output_lines.push(`:${this.servername} 250 ${nickname} :Highest connection count: ${this.socketpeak} (${this.clientpeak} clients) (${this.totalConnections} connections received)\r\n`);
        var usermodes = this.usermodes.get(nickname);
        if (!usermodes || usermodes === true) {
            usermodes = [];
        }
        for (const mode of this.default_user_modes) {
            if (!usermodes.includes(mode)) {
                usermodes.push(mode);
            }
        }
        if (socket.secure) {
            usermodes.push('z');
        }
        this.usermodes.set(nickname, [...usermodes]);
        if (usermodes.includes('x')) {
            socket.host = this.filterHostname(socket, socket.realhost);
            if (socket.client_caps && socket.client_caps.includes('CHGHOST')) {
                output_lines.push(`:${socket.nickname}!${socket.username}@${socket.host} CHGHOST ${socket.username} ${socket.host}\r\n`);
            }
            output_lines.push(`:${this.servername} 396 ${socket.nickname} ${socket.host} :is now your visible host\r\n`);            
        }
        output_lines.push(`:${this.servername} 221 ${nickname} :+${this.usermodes.get(nickname).join('')}\r\n`);
        await this.sendThrottled(socket, output_lines);
        for (const [srvSocket, serverName] of this.servers.entries()) {
            if (srvSocket) {
                // Compose UID message for this client
                const nickname = socket.nickname;
                const username = socket.username || this.usernames.get(socket.nickname) || socket.nickname;
                const uniqueId = socket.uniqueId;
                const signonTime = socket.timestamp || this.getDate();
                const userModes = (this.usermodes.get(nickname) || []).join('');
                const userinfo = socket.userinfo || '';
                await this.safeWriteToSocket(srvSocket, `:${this.serverId} UID ${nickname} 1 ${signonTime} +${userModes} ${username} ${socket.host} ${socket.realhost} ${socket.remoteAddress} ${uniqueId} * ${nickname} :${userinfo}\r\n`);
            }
        } 
        await this.broadcastConnection(socket);
    }
}

module.exports = WTVIRC;