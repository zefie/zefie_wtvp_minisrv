const net = require('net');
const dns = require('dns');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const { get } = require('http');
const WTVShared = require('./WTVShared.js').WTVShared;
const clientCommands = require('./WTVIRC_ClientCommands.js');
const serverCommands = require('./WTVIRC_ServerCommands.js');

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
    constructor(...[minisrv_config, service_name, wtvshared, sendToClient, net, crypto]) {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        this.service_config = minisrv_config.services[service_name] || {};
        this.wtvshared = wtvshared;
        this.version = '0.2.7';
        this.git_commit = this.getGitRevision();
        if (this.git_commit) {
            this.version += `-${this.git_commit}`;
        }
        this.debug = this.service_config.debug || false;
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
        this.irc_config = this.service_config || {};
        this.channelprefixes = this.irc_config.channel_prefixes || ['#'];
        this.servername = this.irc_config.server_hostname || 'irc.local';
        this.network = this.irc_config.network || 'minisrv';
        this.oper_username = this.irc_config.oper_username || 'minisrv';
        this.oper_password = this.irc_config.oper_password || 'changeme573_PLEASE_CHANGE_THIS_PASSWORD';
        this.oper_enabled = this.irc_config.oper_enabled || false;
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
        this.socket_timeout = 75;
        this.server_hello = this.irc_config.server_hello || `zefIRCd v${this.version} IRC server powered by minisrv`;
        this.serverId = this.irc_config.server_id || '00A';
        this.allow_public_vhosts = this.irc_config.allow_public_vhosts || false;
        this.kick_insecure_users_on_secure = this.irc_config.kick_insecure_users_on_secure || true;
        this.hide_version = this.irc_config.hide_version || false;
        this.clientpeak = 0;
        this.globalpeak = 0;
        this.socketpeak = 0;
        this.modeparamlimit = 5;
        this.max_message_len = 512;
        this.reject_overlength_messages = this.irc_config.reject_overlength_messages || true;
        this.totalConnections = 0;
        this.supported_channel_modes = "Ibe,k,l,CNOQRSTVZcimnprt";
        this.supported_user_modes = "BRZciorswxz";
        this.supported_prefixes = ["ohv", "@%+"];
        this.supported_client_caps = ['chghost', 'away-notify', 'echo-message', 'invite-notify', 'multi-prefix', 'userhost-in-names', 'account-notify', 'extended-join'];
        this.supported_server_caps = ['TBURST', 'EOB', 'IE', 'EX'];
        this.enable_webtv_command_hacks = this.irc_config.enable_webtv_command_hacks || true;
        this.supported_webtv_command_hacks = ["MODE", "KICK"];
        
        this.rate_limit_enabled = this.irc_config.rate_limit_enabled !== undefined ? this.irc_config.rate_limit_enabled : true;
        this.max_messages_per_second = this.irc_config.max_messages_per_second || 20;
        this.message_counts = new Map();
        
        this.failed_auth_attempts = new Map();
        this.max_auth_attempts = this.irc_config.max_auth_attempts || 3;
        this.auth_lockout_duration = this.irc_config.auth_lockout_duration || 300;
        
        this.connections_per_ip = new Map();
        this.max_connections_per_ip = this.irc_config.max_connections_per_ip || 3;
        
        this.security_log_enabled = this.irc_config.security_log_enabled || true;
        this.security_events = [];
        this.session_store_path = this.wtvshared.getAbsolutePath(this.minisrv_config.config.SessionStore + path.sep + 'minisrv_internal_irc');
        this.klines_path = this.session_store_path + path.sep + 'klines.json';
        this.caps = [
            `AWAYLEN=${this.awaylen} CASEMAPPING=rfc1459 BOT=B CHANMODES=${this.supported_channel_modes} CHANNELLEN=${this.channellen} CHANTYPES=${this.channelprefixes.join('')} PREFIX=(${this.supported_prefixes[0]})${this.supported_prefixes[1]} USERMODES=${this.supported_user_modes} MAXLIST=b:${this.maxbans},e:${this.maxexcept},i:${this.maxinvite},k:${this.maxkeylen},l:${this.maxlimit}`,
            `CHARSET=ascii MODES=${this.modeparamlimit} EXCEPTS=e INVEX=I NETWORK=${this.network} CHANLIMIT=${this.channelprefixes.join('')}:${this.channellimit} NICKLEN=${this.nicklen} TOPICLEN=${this.topiclen} KICKLEN=${this.kicklen}`
        ];
    }

    listen(port, host = '0.0.0.0') {
        this.host = host;
        this.port = port;
        this.start();
        return this.server;
    }

    getDate() {
        return Math.floor(Date.now() / 1000);
    }

    getGitRevision() {
        try {
            const headPath = path.join(__dirname, '..', '..', '.git', 'HEAD');
            if (fs.existsSync(headPath)) {
                const head = fs.readFileSync(headPath, 'utf8').trim();
                if (head.startsWith('ref: ')) {
                    const ref = head.substring(5);
                    const hashPath = path.join(__dirname, '..', '..', '.git', ref);
                    if (fs.existsSync(hashPath)) {
                        const hash = fs.readFileSync(hashPath, 'utf8').trim();
                        return hash.substring(0, 7);
                    }
                } else {
                    return head.substring(0, 7);
                }
            }
            return null;
        } catch (e) {
            return null;
        }
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
                    const channelData = this.channelData.get(channel.name);
                    if (channelData) {
                        channelData.modes = [...channel.modes];
                    }
                }
                if (channel.topic) {
                    const channelData = this.channelData.get(channel.name);
                    if (channelData) {
                        channelData.topic = channel.topic;
                    }
                }
            }
        }
        this.server_start_time = this.getDate();
        this.server = net.createServer(async socket => {
            socket.once('data', async firstChunk => {
                this.totalConnections++;
                
                const clientIP = socket.remoteAddress;
                const currentConnections = this.connections_per_ip.get(clientIP) || 0;
                if (currentConnections >= this.max_connections_per_ip) {
                    this.debugLog('warn', `Connection limit exceeded for IP ${clientIP}`);
                    socket.write(`:${this.servername} ERROR :Too many connections from your IP\r\n`);
                    socket.end();
                    return;
                }
                this.connections_per_ip.set(clientIP, currentConnections + 1);
                
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
                if (Buffer.isBuffer(firstChunk) ? firstChunk[0] === 0x16 : firstChunk.charCodeAt(0) === 0x16) {
                    if (!this.enable_tls) {
                        this.debugLog('warn', `Client from ${socket.remoteAddress} attempted TLS connection, but TLS is disabled`);
                        await this.safeWriteToSocket(socket, `:${this.servername} 421 * :TLS is not enabled on this server\r\n`);
                        this.terminateSession(socket, true);
                        return;
                    }

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

                    secureSocket.on('secure', async () => {
                        this.debugLog('info', 'Secure connection (SSL) established with '+ socket.remoteAddress);
                        socket.removeAllListeners();
                        await this.initializeSocket(secureSocket, true);
                    });                    
                    secureSocket.resume();              
                    return;
                } else {
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
            data = data.slice(0, this.max_message_len - 2) + '\r\n';
            this.debugLog('warn', `Data length exceeds max_message_len (${this.max_message_len}), truncating: ${data.length} > ${this.max_message_len}`);
        }
        
        let waitCount = 0;
        const maxWaitIterations = 1000;
        while (socket.writable === false && waitCount < maxWaitIterations) {
            await new Promise(resolve => setTimeout(resolve, 10));
            waitCount++;
        }
        
        if (socket.writable === false) {
            this.debugLog('error', 'Socket not writable after timeout, aborting write');
            return;
        }
        socket.write(data);
    }

    checkRateLimit(socket) {
        if (!this.rate_limit_enabled || socket.isserver || this.isIRCOp(socket.nickname)) {
            return true;
        }
        
        const now = Date.now();
        const socketId = socket.remoteAddress + ':' + socket.remotePort;
        
        if (!this.message_counts.has(socketId)) {
            this.message_counts.set(socketId, { count: 1, resetTime: now + 1000 });
            return true;
        }
        
        const rateLimitData = this.message_counts.get(socketId);
        
        if (now > rateLimitData.resetTime) {
            rateLimitData.count = 1;
            rateLimitData.resetTime = now + 1000;
            return true;
        }
        
        if (rateLimitData.count >= this.max_messages_per_second) {
            return false;
        }
        
        rateLimitData.count++;
        return true;
    }

    checkAuthAttempts(socket) {
        const ip = socket.realhost || socket.remoteAddress;
        const now = Date.now();
        
        if (!this.failed_auth_attempts.has(ip)) {
            return true;
        }
        
        const authData = this.failed_auth_attempts.get(ip);
        if (authData.lockoutUntil && now < authData.lockoutUntil) {
            return false;
        }
        
        return true;
    }

    recordAuthFailure(socket) {
        const ip = socket.realhost || socket.remoteAddress;
        const now = Date.now();
        
        if (!this.failed_auth_attempts.has(ip)) {
            this.failed_auth_attempts.set(ip, { count: 1, lockoutUntil: null });
            return;
        }
        
        const authData = this.failed_auth_attempts.get(ip);
        authData.count++;
        
        if (authData.count >= this.max_auth_attempts) {
            authData.lockoutUntil = now + (this.auth_lockout_duration * 1000);
            this.debugLog('warn', `IP ${ip} locked out for ${this.auth_lockout_duration} seconds due to failed auth attempts`);
        }
    }

    clearAuthFailures(socket) {
        const ip = socket.realhost || socket.remoteAddress;
        this.failed_auth_attempts.delete(ip);
    }

    sanitizeInput(input, type = 'general') {
        if (typeof input !== 'string') {
            return '';
        }
        
        input = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        switch (type) {
            case 'nickname':
                return input.replace(/[^A-Za-z0-9\[\]\\`_^{|}]/g, '').slice(0, this.nicklen);
            
            case 'channel':
                if (!input.startsWith('#')) return '';
                return input.replace(/[^A-Za-z0-9#\-_.]/g, '').slice(0, this.channellen);
            
            case 'message':
                return input.slice(0, 512);
            
            case 'username':
                return input.replace(/[^A-Za-z0-9\-_.]/g, '').slice(0, 32);
            
            default:
                return input.slice(0, 512);
        }
    }

    validateCommand(command, params) {
        if (!command || typeof command !== 'string') {
            return false;
        }
        
        if (!/^[A-Z]+$/.test(command)) {
            return false;
        }
        
        if (command.length > 20) {
            return false;
        }
        
        if (params && Array.isArray(params)) {
            for (const param of params) {
                if (typeof param !== 'string' || param.length > 512) {
                    return false;
                }
            }
        }
        
        return true;
    }

    logSecurityEvent(event, socket, details = {}) {
        if (!this.security_log_enabled) return;
        
        const securityEvent = {
            timestamp: new Date().toISOString(),
            event: event,
            ip: socket ? (socket.realhost || socket.remoteAddress) : 'unknown',
            nickname: socket ? socket.nickname : 'unknown',
            details: details
        };
        
        this.security_events.push(securityEvent);
        
        if (this.security_events.length > 1000) {
            this.security_events.shift();
        }
        
        this.debugLog('security', `Security Event: ${event} from ${securityEvent.ip} (${securityEvent.nickname})`);
        
        if (this.irc_config.security_log_file) {
            fs.appendFileSync(this.irc_config.security_log_file, JSON.stringify(securityEvent) + '\n');
        }
    }

    async initializeSocket(socket, secure = false, oldSocket = null) {
        if (this.debug) {
            const originalWrite = socket.write.bind(socket);
            socket.write = function (...args) {
                var log_args = args.map(arg => {
                    if (typeof arg === 'string') {
                        return arg.replace(/\r\n/g, '').replace(/\n/g, '');
                    }
                    return arg;
                });
                console.log('<', ...log_args);
                return originalWrite(...args);
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

        socket._idleInterval = setInterval(async () => {
            if (socket.signedoff) {
                clearInterval(socket._idleInterval);
                return;
            }
            const now = this.getDate();
            if ((now - socket.lastseen) > this.socket_timeout + 10) {
                this.debugLog('warn', `Socket ${socket.remoteAddress} has been idle for too long, terminating session`);
                if (socket.nickname) {
                    await this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} QUIT :Ping timeout (${now - socket.lastseen} seconds)\r\n`, socket);
                    await this.broadcastToAllServers(`:${socket.uniqueId} QUIT :Ping timeout (${now - socket.lastseen} seconds)\r\n`, socket);
                }
                socket.signedoff = true;
                this.terminateSession(socket, true);
                return;
            } else if ((now - socket.lastseen) > this.socket_timeout) {
                if (socket.isserver) {
                    await this.safeWriteToSocket(socket, `:${this.serverId} PING ${this.serverId} ${this.servername}\r\n`);
                } else {
                    await this.safeWriteToSocket(socket, `PING :${this.servername}\r\n`);
                }
                return;
            }
        }, 10000);

        this.clients.push(socket);
        this.clientpeak = Math.max(this.clientpeak, this.clients.length);
    }

    async processSocketData(socket, data) {
        if (socket.signedoff) {
            return;
        }
        if (socket.upgrading_to_tls) {
            socket.removeAllListeners();
            socket.pause();
            socket.on('error', (err) => {
                this.debugLog('error', 'Error during TLS upgrade: ' + err.message);
                this.terminateSession(socket, true);
            });
            
            if (Buffer.isBuffer(data) ? data[0] === 0x16 : data.charCodeAt(0) === 0x16) {
                if (!this.enable_tls) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 421 * :TLS is not enabled on this server\r\n`);
                    this.terminateSession(socket, true);
                    return;
                }

                const keyBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.key));
                const certBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.cert));
                
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

                secureSocket.on('secure', async () => {
                    this.debugLog('info', 'Secure connection (STARTTLS) established with '+ socket.remoteAddress);
                    socket.removeAllListeners('error');
                    await this.initializeSocket(secureSocket, true, socket);
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

        if (typeof data !== 'string') {
            if (Buffer.isBuffer(data)) {
                data = data.toString('ascii');
            } else if (data && typeof data.toString === 'function') {
                data = data.toString();
            } else {
                return;
            }
        }
        const lines = data.split(/\r\n|\n/).filter(Boolean);
        for (let line of lines) {
            if (this.debug) {
                console.log(`> ${line}`);
            }
            
            if (!socket.isserver && !this.checkRateLimit(socket)) {
                this.debugLog('warn', `Rate limit exceeded for ${socket.remoteAddress}, disconnecting`);
                this.logSecurityEvent('RATE_LIMIT_EXCEEDED', socket, { limit: this.max_messages_per_second });
                await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Rate limit exceeded\r\n`);
                this.terminateSession(socket, true);
                return;
            }
            
            if (socket.isserver) {
                await this.processServerData(socket, line);
                continue;
            }            

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
                            continue;
                        }
                    }
                }
                this.processServerData(socket, line);
                continue;
            }

            const serverCommands = ['PASS', 'CAPAB', 'SERVER', 'SVINFO'];
            const firstWord = line.trim().split(' ')[0].toUpperCase();
            if (!prefix && serverCommands.includes(firstWord)) {
                this.processServerData(socket, line);
                continue;
            }

            const [command, ...params] = line.trim().split(' ');
            
            if (!this.validateCommand(command.toUpperCase(), params)) {
                this.logSecurityEvent('INVALID_COMMAND', socket, { command, params });
                await this.safeWriteToSocket(socket, `:${this.servername} 421 ${socket.nickname || '*'} ${command} :Unknown command\r\n`);
                continue;
            }
            
            const cmdUpper = command.toUpperCase();
            const handlerName = `handleCommand_${cmdUpper}`;
            if (typeof this[handlerName] === 'function') {
                await this[handlerName](socket, params, line);
            }
        }
    }

    async processServerData(socket, line) {
        const parts = line.split(' ');
        if (parts[0] == `:${socket.uniqueId}`) {
            parts.shift();
        }
        if (parts.length < 1) return;
        const command = parts[0].toUpperCase();
        
        if (/^\d{3}$/.test(command)) {
            await this.handleServerNumericReply(socket, command, parts, line);
            return;
        }

        const handlerName = `handleServerCommand_${command}`;
        if (typeof this[handlerName] === 'function') {
            await this[handlerName](socket, parts, line);
        } else {
            if (line.startsWith(':')) {
                var sourceUniqueId = parts[0].slice(1);
                var nickname = this.findUserByUniqueId(sourceUniqueId);
                if (!nickname) {
                    this.debugLog('warn', `No nickname found for unique ID ${sourceUniqueId}`);
                    return;
                }
                var srvCommand = parts[1];
                const srvHandlerName = `handleServerPrefixCommand_${srvCommand}`;
                if (typeof this[srvHandlerName] === 'function') {
                    await this[srvHandlerName](socket, nickname, sourceUniqueId, parts, line);
                } else {
                    if (this.checkRegistered(socket)) {
                        this.debugLog('warn', `Unhandled server command from ${sourceUniqueId}: ${srvCommand}`);
                    }
                }
            }
        }
    }

    deleteChannel(channel) {
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
        const nickname = this.nicknames.get(socket);
        if (nickname) {
            if (!socket.signedoff) {
                let serverSocket = null;
                for (const [srvSocket, users] of this.serverusers.entries()) {
                    if (users && typeof users.has === 'function' && users.has(nickname)) {               
                        serverSocket = srvSocket;
                        continue;
                    }
                }
                await this.broadcastUser(nickname, `:${nickname}!${socket.username}@${socket.host} QUIT :Client disconnected\r\n`, socket);
                await this.broadcastToAllServers(`:${socket.uniqueId} QUIT :Client disconnected\r\n`, serverSocket);
                socket.signedoff = true;
            }
            this.cleanupUserSession(nickname);
            this.nicknames.delete(socket);
        }
        if (socket.isserver) {
            const srvUsers = this.serverusers.get(socket) || [];
            for (const nickname of srvUsers) {
                this.debugLog('debug', `Removing user ${nickname} from server ${socket.servername}`);
                this.cleanupUserSession(nickname);                        
            }
            this.servers.delete(socket);
            this.serverusers.delete(socket);
        } else {
            this.clients = this.clients.filter(c => c !== socket);
        }        
        if (socket._idleInterval) {
            clearInterval(socket._idleInterval);
            socket._idleInterval = null;
        }
        
        const socketId = socket.remoteAddress + ':' + socket.remotePort;
        this.message_counts.delete(socketId);
        
        const clientIP = socket.remoteAddress;
        if (this.connections_per_ip.has(clientIP)) {
            const currentCount = this.connections_per_ip.get(clientIP);
            if (currentCount <= 1) {
                this.connections_per_ip.delete(clientIP);
            } else {
                this.connections_per_ip.set(clientIP, currentCount - 1);
            }
        }
        
        if (close) {
            socket.end();
        }
    }

    async sendWebTVNotice(message) {
        await this.broadcastToAllWebTVClients(`:${this.servername} NOTICE * :${message}\r\n`);
    }

    async sendWebTVNoticeTo(socket, message) {
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
        let count = 0;
        for (const channelObj of this.channelData.values()) {
            if (channelObj.users.has(username)) {
                count++;
            }
        }
        return count;
    }

    getUsersInChannel(channel) {
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
        const alreadyNotified = [];
        for (const channelObj of this.channelData.values()) {
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
        const alreadyNotified = [];
        if (this.channelData.has(channel)) {
            const channelObj = this.channelData.get(channel);
            for (const user of channelObj.users) {
                if (channelObj.modes.includes('Z') && (message.includes('PRIVMSG') || message.includes('NOTICE'))) {
                    const user_modes = this.getUserModes(user);
                    if (user_modes && user_modes.includes('z')) {
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
        const alreadyNotified = [];
        if (this.channelData.has(channel)) {
            const channelObj = this.channelData.get(channel);
            for (const user of channelObj.users) {
                const socket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                if (alreadyNotified.includes(socket)) {
                    continue;
                }
                if (socket && socket !== exceptSocket && this.clientIsWebTV(socket)) {
                    this.sendWebTVSpoofedActionTo(socket, channel, message);
                    alreadyNotified.push(socket);
                }
            }
        }
    }

    async broadcastChannelJoin(channel, sourceSocket, exceptSocket = null) {
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
                        const account = this.accounts.get(sourceSocket.nickname) || '*';
                        const userinfo = this.userinfo.get(sourceSocket.nickname) || '';
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
        for (const srvSocket of this.servers.keys()) {
            if (srvSocket && srvSocket !== exceptSocket) {
                await this.safeWriteToSocket(srvSocket, message);
            }
        }
    }    
  
    async broadcastWallops(message) {
        for (const [socket, nickname] of this.nicknames.entries()) {
            const usermodes = this.getUserModes(nickname);
            if (usermodes && (usermodes.includes('w') || usermodes.includes('o'))) {
                await this.safeWriteToSocket(socket, message);
            }
        }
    }

    async broadcastToAllClients(message, exceptSocket = null) {
        for (const client of this.clients) {
            if (client !== exceptSocket) {
                await this.safeWriteToSocket(client, message);
            }
        }
    }

    async broadcastToAllWebTVClients(message, exceptSocket = null) {
        for (const client of this.clients) {
            if (client !== exceptSocket && this.clientIsWebTV(client)) {
                await this.safeWriteToSocket(client, message);
            }
        }
    }    

    isIRCOp(nickname) {
        const modes = this.getUserModes(nickname);
        if (Array.isArray(modes)) {
            return modes.includes('o');
        }
        return false;
    }

    isSpyingOnConnections(nickname) {
        const modes = this.getUserModes(nickname);
        if (Array.isArray(modes)) {
            return modes.includes('c');
        }
        return false;
    }

    createChannel(channel, creator) {
        if (!this.channelData.has(channel)) {
            this.channelData.set(channel, {
                users: new Set(),
                ops: new Set([creator]),
                halfops: new Set(),
                voices: new Set(),
                topic: '',
                bans: [],
                exemptions: [],
                invites: new Set(),
                inviteexemptions: [],
                modes: [...this.default_channel_modes],
                mlock: [],
                limit: null,
                key: null,
                timestamp: this.getDate()
            });
        }
    }

    checkMask(mask, socket) {
        const host = socket.host;
        const realhost = socket.realhost;
        const realaddress = socket.remoteAddress;
        const nickname = this.nicknames.get(socket);
        let fullMask = `*!*@${host}`;
        let fullMask2 = `*!*@${realhost}`;
        let fullMask3 = `*!*@${realaddress}`;
        let userIdent;
        if (nickname) {
            userIdent = this.usernames.get(nickname) || nickname;
            fullMask = `${nickname}!${userIdent}@${host}`;
            fullMask2 = `${nickname}!${userIdent}@${realhost}`;
            fullMask3 = `${nickname}!${userIdent}@${realaddress}`;
        }
        
        if (!mask.includes('!')) {
            const maskRegex = new RegExp('^' + mask.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
            return maskRegex.test(nickname) || maskRegex.test(userIdent);
        }

        const [maskNick, rest] = mask.split('!', 2);
        const [maskUser, maskHost] = (rest || '').split('@', 2);

        const [fullNick, fullRest] = fullMask.split('!', 2);
        const [fullUser, fullHost] = (fullRest || '').split('@', 2);

        const nickRegex = new RegExp('^' + (maskNick || '*').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
        const userRegex = new RegExp('^' + (maskUser || '*').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
        const hostRegex = new RegExp('^' + (maskHost || '*').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
        let matches = nickRegex.test(fullNick) && userRegex.test(fullUser) && hostRegex.test(fullHost);
        if (!matches && fullMask2) {
            const [fullNick2, fullRest2] = fullMask2.split('!', 2);
            const [fullUser2, fullHost2] = (fullRest2 || '').split('@', 2);
            matches = nickRegex.test(fullNick2) && userRegex.test(fullUser2) && hostRegex.test(fullHost2);
        }
        if (!matches && fullMask3) {
            const [fullNick3, fullRest3] = fullMask3.split('!', 2);
            const [fullUser3, fullHost3] = (fullRest3 || '').split('@', 2);
            matches = nickRegex.test(fullNick3) && userRegex.test(fullUser3) && hostRegex.test(fullHost3);
        }
        return matches;
    }

    filterHostname(socket, hostname) {
        const username = this.nicknames.get(socket);
        let modes = null;
        if (username) {
            modes = this.getUserModes(username);
        }
        if (modes) {
            if (Array.isArray(modes) && modes.includes('x')) {
                if (typeof hostname === 'string') {
                    const ipSubdomainMatch = hostname.match(/^(\d+)-(\d+)-(\d+)-(\d+)\./);
                    if (ipSubdomainMatch) {
                        return `${ipSubdomainMatch[1]}-x-x-${ipSubdomainMatch[4]}.${hostname.split('.').slice(1).join('.')}`;
                    }
                    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
                    if (ipv4Match) {
                        return `${ipv4Match[1]}.x.x.${ipv4Match[4]}`;
                    }
                    const parts = hostname.split('.');
                    if (parts.length > 2) {
                        return `${parts[0]}.x.${parts[parts.length - 1]}`;
                    }
                    return 'hidden.host';
                }
            }
        }
        return hostname;
    }

    isBanned(channel, socket) {
        const nickname = this.nicknames.get(socket);
        channel = this.findChannel(channel);
        if (!channel) {
            return false;
        }
        const chanData = this.channelData.get(channel);
        if (chanData && chanData.bans) {
            const bans = chanData.bans;
            let isUserBanned = false;
            for (const banMask of bans) {
                isUserBanned = this.checkMask(banMask, socket);
                if (isUserBanned) {
                    if (chanData.exemptions) {
                        const exemptions = chanData.exemptions;
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
        for (const socket of this.nicknames.keys()) {
            if (socket.uniqueId === uniqueId) {
                return socket;
            }
        }
        const searchID = this.findUserByUniqueId(uniqueId);
        if (searchID) {
            for (const [srvSocket, users] of this.serverusers.entries()) {
                if (users.has(searchID)) {
                    return srvSocket;
                }
            }
        }        
        return null;
    }

    findUserByUniqueId(uniqueId) {
        for (const [nickname, id] of this.uniqueids.entries()) {
            if (id === uniqueId) {
                return nickname;
            }
        }
        return null;
    }

    addUserUniqueId(nickname, uniqueId) {
        this.uniqueids.set(nickname, uniqueId);
    }

    deleteUserUniqueId(nickname) {
        this.uniqueids.delete(nickname);
    }

    async doMOTD(nickname, socket = null) {
        const output_lines = [];
        output_lines.push(`:${this.servername} 375 ${nickname} :${this.servername} message of the day\r\n`);
        if (!this.irc_config.hide_version) {
            output_lines.push(`:${this.servername} 372 ${nickname} :This is zefIRCd v${this.version}, running on minisrv v${this.minisrv_config.version}\r\n`);
        }
        if (typeof this.irc_motd === 'string' && this.irc_motd.length > 0) {
            output_lines.push(`:${this.servername} 372 ${nickname} :${this.irc_motd}\r\n`);
        } else if (Array.isArray(this.irc_motd) && this.irc_motd.length > 0) {
            for (let line of this.irc_motd) {
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
        if (this.irc_config.channels && Array.isArray(this.irc_config.channels)) {
            return this.irc_config.channels.some(ch => ch.name === channel);
        }
        return false;
    }

    checkIfReservedChannelOp(socket, channel) {
        if (this.isReservedChannel(channel)) {
            const reservedChannel = this.irc_config.channels.find(ch => ch.name === channel);
            if (reservedChannel && reservedChannel.ops && Array.isArray(reservedChannel.ops)) {
                for (const mask of reservedChannel.ops) {
                    if (this.checkMask(mask, socket)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isRemoteServerUser(socket, username) {
        let serverUsers = this.serverusers.get(socket) || new Set();
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
        if (!this.serverusers.has(socket)) {
            this.serverusers.set(socket, new Set());
        }
        this.serverusers.get(socket).add(username);
    }

    getRemoteServerUserSocket(username) {
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
        for (const socket of this.nicknames.keys()) {
            if (socket.uniqueId === uniqueId) {
                return this.nicknames.get(socket);
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
        if (!username) return null;
        const lower = username.toLowerCase();
        for (const [nick, id] of this.uniqueids.entries()) {
            if (nick.toLowerCase() === lower) {
                return id;
            }
        }
        return null;
    }

    countGlobalUsers() {
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
        for (const channelObj of this.channelData.values()) {
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
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (this.uniqueids.has(id)) {
            return this.generateUniqueId(socket);
        }
        return id;
    }

    async sendThrottled(socket, lines, delayMs = 1) {
        for (const line of lines) {
            if (delayMs > 0) {
                await new Promise(res => setTimeout(res, delayMs));
            }
            if (socket.writable) {
                await this.safeWriteToSocket(socket, line);
            }
        }
    }

    findChannel(channel) {
        if (typeof channel !== 'string') return null;
        const lower = channel.toLowerCase();
        for (const existingChannel of this.channelData.keys()) {
            if (existingChannel.toLowerCase() === lower) {
                return existingChannel;
            }
        }
        return null;
    }

    findUser(username) {
        if (typeof username !== 'string') return null;
        const lower = username.toLowerCase();
        for (const nick of this.nicknames.values()) {
             if (nick.toLowerCase() === lower) {
                return nick;
            }
        }
        return null;
    }

    clientIsWebTV(socket) {
        if (socket && socket.client_version && socket.client_version.includes('WebTV')) {
            return true;
        }
        return false;
    }

    async broadcastUserIfCap(socket, message, exceptSocket = null, client_cap) {
        if (socket.client_caps && socket.client_caps.includes(client_cap)) {
            await this.broadcastUser(socket.nickname, message, exceptSocket);
        }
    }

    async broadcastUserIfCapAndChanOp(socket, message, exceptSocket = null, client_cap, channel) {
        if (socket.client_caps && socket.client_caps.includes(client_cap)) {
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
        for (const socket of this.clients) {
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
        let foundSocket = null;
        for (const [socket, nick] of this.nicknames.entries()) {
            if (nick.toLowerCase() === nickname.toLowerCase()) {
                foundSocket = socket;
                nickname = socket.nickname;
                break;
            }
        }
        if (!foundSocket) {
            for (const [srvSocket, users] of this.serverusers.entries()) {
                if (users) {
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
        const modes = this.usermodes.get(nickname);
        if (!modes || modes === true) {
            this.usermodes.set(nickname, [...this.default_user_modes]);
        }
        return this.usermodes.get(nickname);
    }

    setUserMode(nickname, mode, adding) {
        const modes = this.getUserModes(nickname);
        if (!modes) return;
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
        let hostname;
        if (socket && socket.remoteAddress) {
            try {
                hostname = socket.remoteAddress;
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
                    } else {
                        await this.safeWriteToSocket(socket, `:${this.servername} KILL ${socket.nickname} :K-lined\r\n`);
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
                            await this.broadcastToAllServers(`:${socket.uniqueId} KILL ${socket.uniqueId} :K-lined: ${kline.reason}\r\n`, socket);
                        } else {
                            await this.safeWriteToSocket(socket, `:${this.servername} KILL ${socket.nickname} :K-lined\r\n`);
                            await this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} KILL :K-lined\r\n`);
                            await this.broadcastToAllServers(`:${socket.uniqueId} KILL ${socket.uniqueId} :K-lined\r\n`, socket);
                        }
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
        if (!fs.existsSync(this.session_store_path)) {
            fs.mkdirSync(this.session_store_path, { recursive: true });
        }
        fs.writeFileSync(this.klines_path, JSON.stringify(this.klines, null, 2));        
    }

    loadKLinesFromFile() {
        if (fs.existsSync(this.klines_path)) {
            const data = fs.readFileSync(this.klines_path, 'utf8');
            this.klines = JSON.parse(data);
        }
    }

    isChannelOp(nickname, channel) {
        channel = this.findChannel(channel);
        if (!channel) {
            return false;
        }
        const channelOps = this.channelData.get(channel).ops;
        if (channelOps && typeof channelOps.has === 'function' && channelOps.has(nickname)) {
            return true;
        }
        if (this.isIRCOp(nickname)) {
            return true;
        }
        return false;
    }

    isChannelHalfOp(nickname, channel) {
        channel = this.findChannel(channel);
        if (!channel) {
            return false;
        }
        const channelHalfOps = this.channelData.get(channel).halfops;
        if (channelHalfOps && typeof channelHalfOps.has === 'function' && channelHalfOps.has(nickname)) {
            return true;
        }
        if (this.isIRCOp(nickname)) {
            return true;
        }
        return false;
    }

    processChannelModeParams(channel, mode, target) {
        let result = false;
        if (!target) {
            this.debugLog('warn', `No target specified for mode ${mode} on channel ${channel}`);
            return false;
        }
        if (mode === '+o' || mode === '-o') {
            const channelOps = this.channelData.get(channel).ops;
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
            const channelHalfOps = this.channelData.get(channel).halfops;
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
            const channelVoices = this.channelData.get(channel).voices;
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
            let channelBans = this.channelData.get(channel).bans;
            if (mode === '+b') {
                if (!channelBans.includes(target)) {
                    channelBans.push(target);
                    return true;
                }
            } else if (mode === '-b') {
                if (channelBans.includes(target)) {
                    this.channelData.get(channel).bans = channelBans.filter(ban => ban !== target);
                    return true;
                }
            }
        } else if (mode === '+e' || mode === '-e') {
            let channelExemptions = this.channelData.get(channel).exemptions;
            if (mode === '+e') {
                if (!channelExemptions.includes(target)) {
                    channelExemptions.push(target);
                    return true;
                }
            } else if (mode === '-e') {
                if (channelExemptions.includes(target)) {
                    this.channelData.get(channel).exemptions = channelExemptions.filter(exception => exception !== target);
                    return true;
                }
            }
        } else if (mode === '+I' || mode === '-I') {
            let channelInvites = this.channelData.get(channel).inviteexemptions;
            if (mode === '+I') {
                if (!channelInvites.includes(target)) {
                    channelInvites.push(target);
                    return true;
                }
            } else if (mode === '-I') {
                if (channelInvites.includes(target)) {
                    this.channelData.get(channel).inviteexemptions = channelInvites.filter(invite => invite !== target);
                    return true;
                }
            }
        } else if (mode === '+l' || mode === '-l') {
            if (mode === '+l') {
                result = this.setChannelMode(channel, 'l', true);
                if (result === false && this.channelData.get(channel).limit === parseInt(target)) {
                    return false;
                }
                this.channelData.get(channel).limit = parseInt(target);
                return true;
            } else {
                result = this.setChannelMode(channel, 'l', false);
                if (result === false && this.channelData.get(channel).limit === null) {
                    return false;
                }
                this.channelData.get(channel).limit = null;
                return true;
            }
        } else if (mode === '+k' || mode === '-k') {
            if (mode === '+k') {
                result = this.setChannelMode(channel, 'k', true);
                if (result === false && this.channelData.get(channel).key === target) {
                    return false;
                }
                this.channelData.get(channel).key = target;
                return true;
            } else {                
                result = this.setChannelMode(channel, 'k', false);
                if (result === false && !this.channelData.get(channel).key) {
                    return false;
                }
                this.channelData.get(channel).key = null;
                return true;
            }
        } 
        return false;
    }

    async processChannelModes(nickname, channel, modes, params, socket) {
        const modeChars = modes.split('');
        const validModes = [];
        const supportedChannelModes = (this.supported_channel_modes.split(',').join('') + this.supported_prefixes[0]).split('');
        let serverModeMsg = '';
        let target = null;
        if (socket.isserver) {
            const sourceUniqueId = this.uniqueids.get(nickname);
            serverModeMsg = `:${sourceUniqueId} MODE ${channel} `;
        } else {
            if (!this.checkRegistered(socket)) {
                return;
            }
            serverModeMsg = `:${socket.uniqueId} MODE ${channel} `;
        }
        const username = this.usernames.get(nickname);
        const hostname = this.hostnames.get(nickname);

        let modeMsg = `:${nickname}!${username}@${hostname} MODE ${channel} `;
        let WTVMsg = `${nickname} has set channel mode `;
        let addingFlag = false;
        let paramIndex = 0;
        const output_lines = [];  
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
                const chanData = this.channelData.get(channel);
                if (chanData && chanData.bans) {
                    for (const ban of chanData.bans) {
                        output_lines.push(`:${this.servername} 367 ${nickname} ${channel} ${ban}\r\n`);
                    }
                }
                output_lines.push(`:${this.servername} 368 ${nickname} ${channel} :End of channel ban list\r\n`);
                await this.sendThrottled(socket, output_lines);
                return;
            } else if (modes === 'e') {
                const chanData = this.channelData.get(channel);
                if (chanData && chanData.exemptions) {
                    for (const exemption of chanData.exemptions) {
                        output_lines.push(`:${this.servername} 348 ${nickname} ${channel} ${exemption}\r\n`);
                    }
                }
                output_lines.push(`:${this.servername} 349 ${nickname} ${channel} :End of channel exception list\r\n`);
                await this.sendThrottled(socket, output_lines);
                return;
            } else if (modes === 'I') {
                const chanData = this.channelData.get(channel);
                if (chanData && chanData.inviteexemptions) {
                    for (const invite of chanData.inviteexemptions) {
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
            let modeStr = '';
            const mc = modeChars[j];
            let result = false;
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
            if ([...this.supported_prefixes[0], 'I', 'b', 'e', 'l', 'k'].includes(mc)) {
                const plusminus = (addingFlag) ? "+" : "-";
                const param = params[paramIndex];
                if (socket.isserver) {
                    target = this.findUserByUniqueId(param);
                } else {
                    target = this.findUser(param) || param;
                }
                if (!target && !socket.isserver) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 401 ${nickname} ${param} :No such nick/channel\r\n`);
                    return;
                }
                result = this.processChannelModeParams(channel, plusminus + mc, target);
                paramIndex++;
            } else {
                result = this.setChannelMode(channel, mc, addingFlag);
                if (addingFlag) {
                    if (mc === 'S' && this.kick_insecure_users_on_secure) {
                        const usersInChannel = this.channelData.get(channel).users;
                        for (const user of usersInChannel) {
                            const userSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                            if (userSocket && !userSocket.secure) {
                                await this.safeWriteToSocket(userSocket, `:${nickname}!${username}@${socket.host} KICK ${channel} ${userSocket.nickname} :Channel is now +S (SSL-only, +z usermode required)\r\n`);
                                await this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} KICK ${channel} ${userSocket.nickname} :Channel is now +S (SSL-only, +z usermode required)\r\n`, userSocket);
                                const sourceUniqueId = this.uniqueids.get(nickname);
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
                    modeMsg += ' ' + (this.findUserByUniqueId(params[i]) || params[i]);
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
        setTimeout((sock) => {
            if (sock) {
                sock.error_count--;
            }
        }, 60000, socket);
    }

    async checkRegistered(socket, allowUnregistered = false, silent = false) {
        let retval = false;
        if (socket.isserver) {
            if (!socket.is_srv_authorized && (!socket.registered && !allowUnregistered)) {
                if (socket.writable && !silent) {
                    await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Unauthorized\r\n`);
                }
                this.addSocketError(socket);
            } else {
                retval = true;
            }
        }
        if (!socket.registered && (!socket.registered && !allowUnregistered)) {
            if (socket.writable && !silent) {
                await this.safeWriteToSocket(socket, `:${this.servername} 451 ${socket.uniqueId} :You have not registered\r\n`);
            }
            this.addSocketError(socket);
        } else {
            retval = true;
        }
        return retval;
    }

    setChannelMode(channel, mode, adding) {
        const modes = this.channelData.get(channel).modes;
        if (!modes) {
            return false;
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
        return false;
    }

    debugLog(type = 'debug', ...message) {
        const parsedMessage = message.map(m =>
            typeof m === 'object' ? JSON.stringify(m) : String(m)
        ).join(' ');

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
            return;
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
        const output_lines = [];
        output_lines.push(`:${this.servername} NOTICE AUTH :Welcome to \x02${this.network}\x0F\r\n`);
        output_lines.push(`:${this.servername} 001 ${nickname} :Welcome to the IRC server, ${nickname}\r\n`);
        output_lines.push(`:${this.servername} 002 ${nickname} :Your host is ${this.servername}, running version zefIRCd v${this.version}\r\n`);
        output_lines.push(`:${this.servername} 003 ${nickname} :This server is ready to accept commands\r\n`);
        
        function sortModesAlphaCapsFirst(modes) {
            return modes
            .split(',')
            .map(group => {
                return group
                .split('')
                .sort((a, b) => {
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
        const channelModesParts = this.supported_channel_modes.split(',');
        let sortedModesWithParams;
        if (channelModesParts.length > 1) {
            let modesToSort = channelModesParts.slice(0, -1).join('').split('');
            modesToSort.push(...this.supported_prefixes[0].split(''));
            modesToSort = Array.from(new Set(modesToSort));
            modesToSort.sort();
            sortedModesWithParams = modesToSort.join('');
        }
        const channelModes = this.supported_channel_modes.split(',').join('') + this.supported_prefixes[0];
        const sortedChannelModes = sortModesAlphaCapsFirst(channelModes).replace(/,/g, '');
        const sortedUserModes = sortModesAlphaCapsFirst(this.supported_user_modes);
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
        const serverCount = this.servers.size + 1;
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
        const totalSockets = this.clients.length + this.servers.size;
        this.socketpeak = Math.max(this.socketpeak, totalSockets);

        output_lines.push(`:${this.servername} 266 ${nickname} :Current Global Users: ${globalUsers}  Max: ${this.globalpeak}\r\n`);
        output_lines.push(`:${this.servername} 250 ${nickname} :Highest connection count: ${this.socketpeak} (${this.clientpeak} clients) (${this.totalConnections} connections received)\r\n`);
        let usermodes = this.usermodes.get(nickname);
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
        for (const srvSocket of this.servers.keys()) {
            if (srvSocket) {
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

Object.assign(WTVIRC.prototype, clientCommands);
Object.assign(WTVIRC.prototype, serverCommands);

module.exports = WTVIRC;