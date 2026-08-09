const net = require('net');
const dns = require('dns');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
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
    constructor(minisrv_config, service_name, wtvshared, sendToClient, netArg, cryptoArg) {
        this.minisrv_config = minisrv_config;
        this.service_name = service_name;
        this.service_config = minisrv_config.services[service_name] || {};
        this.wtvshared = wtvshared;
        this.version = '0.3.0';
        this.git_commit = this.getGitRevision();
        if (this.git_commit) {
            this.version += `-${this.git_commit}`;
        }
        this.debug = this.service_config.debug || false;
        this.server = null;
        this.clients = [];
        this.channelData = new Map();
        this.usernames = new Map(); // nickname -> username
        this.usermodes = new Map(); // nickname -> Array of modes (e.g. ['w', 'i'])
        this.usersignontimestamps = new Map(); // nickname -> timestamp since user signed on
        this.nicknames = new Map(); // socket -> nickname
        this.awaymsgs = new Map(); // nickname -> away message        
        this.servers = new Map(); // socket -> server information
        this.serverusers = new Map(); // server -> Set of users connected to this server
        this.peerSids = new Map(); // SID -> link socket
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
        this.allowed_user_characters = [...this.allowed_common_characters, '.']; 
        this.allowed_nick_characters = [...this.allowed_common_characters, '[',']','{','}','\\','|','^','-','~'];
        this.irc_config = this.service_config || {};
        this.channelprefixes = this.irc_config.channel_prefixes || ['#'];
        this.servername = this.irc_config.server_hostname || 'irc.local';
        this.network = this.irc_config.network || 'minisrv';
        this.oper_username = this.irc_config.oper_username || 'minisrv';
        this.oper_password = this.irc_config.oper_password || '';
        this.oper_enabled = this.irc_config.oper_enabled || false;
        this.vhost_suffixes = Array.isArray(this.irc_config.vhost_suffixes) ? this.irc_config.vhost_suffixes : [];
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
        this.userlen = this.irc_config.user_len || 16;
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
        this.kick_insecure_users_on_secure = this.irc_config.kick_insecure_users_on_secure !== false;
        this.hide_version = this.irc_config.hide_version || false;
        this.clientpeak = 0;
        this.globalpeak = 0;
        this.socketpeak = 0;
        this.modeparamlimit = 5;
        this.max_message_len = 512;
        this.reject_overlength_messages = this.irc_config.reject_overlength_messages !== false;
        this.totalConnections = 0;
        this.supported_channel_modes = "Ibe,k,l,CNOQRSTVZcimnprt";
        this.supported_user_modes = "BRZciorswxz";
        this.supported_prefixes = ["ohv", "@%+"];
        this.supported_client_caps = ['chghost', 'away-notify', 'echo-message', 'invite-notify', 'multi-prefix', 'userhost-in-names', 'account-notify', 'extended-join'];
        this.supported_server_caps = ['TBURST', 'EOB', 'IE', 'EX', 'QS', 'ENCAP'];
        this.enable_webtv_command_hacks = this.irc_config.enable_webtv_command_hacks !== false;
        this.supported_webtv_command_hacks = ["MODE", "KICK"];
        this._tlsSecureContext = null;
        this._usedUniqueIds = new Set();
        
        this.rate_limit_enabled = this.irc_config.rate_limit_enabled !== undefined ? this.irc_config.rate_limit_enabled : true;
        this.max_messages_per_second = this.irc_config.max_messages_per_second || 20;
        this.message_counts = new Map();
        
        this.failed_auth_attempts = new Map();
        this.max_auth_attempts = this.irc_config.max_auth_attempts || 3;
        this.auth_lockout_duration = this.irc_config.auth_lockout_duration || 300;
        
        this.connections_per_ip = new Map();
        this.max_connections_per_ip = this.irc_config.max_connections_per_ip || 3;
        
        this.security_log_enabled = this.irc_config.security_log_enabled !== false;
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
                    const ref = head.slice(5);
                    const hashPath = path.join(__dirname, '..', '..', '.git', ref);
                    if (fs.existsSync(hashPath)) {
                        const hash = fs.readFileSync(hashPath, 'utf8').trim();
                        return hash.slice(0, 7);
                    }
                } else {
                    return head.slice(0, 7);
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    getTlsSecureContext() {
        if (this._tlsSecureContext) {
            return this._tlsSecureContext;
        }
        if (!this.enable_tls || !this.irc_config.ssl_cert) {
            return null;
        }
        const keyBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.key));
        const certBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.cert));
        this._tlsSecureContext = tls.createSecureContext({
            key: keyBuffer,
            cert: certBuffer,
        });
        return this._tlsSecureContext;
    }

    start() {
        this.loadKLinesFromFile();

        if (this.enable_tls) {
            this.supported_client_caps.push('tls');
            try {
                this.getTlsSecureContext();
            } catch (e) {
                this.debugLog('error', `Failed to load TLS certificates: ${e.message}`);
                this.enable_tls = false;
            }
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
        this.server = net.createServer(socket => {
            socket.once('data', async firstChunk => {
                try {
                    this.totalConnections++;
                    
                    const clientIP = this.normalizeIp(socket.remoteAddress);
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

                        let secureContext;
                        try {
                            secureContext = this.getTlsSecureContext();
                        } catch (e) {
                            this.debugLog('error', `TLS context error: ${e.message}`);
                            this.terminateSession(socket, true);
                            return;
                        }
                        const secureSocket = new tls.TLSSocket(socket, {
                            isServer: true,
                            ALPNProtocols: ['irc'],
                            secureContext,
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
                            try {
                                this.debugLog('info', 'Secure connection (SSL) established with '+ socket.remoteAddress);
                                socket.removeAllListeners();
                                await this.initializeSocket(secureSocket, true);
                            } catch (e) {
                                this.debugLog('error', `Error initializing secure socket: ${e.message}`);
                                this.terminateSession(secureSocket, true);
                            }
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
                } catch (e) {
                    this.debugLog('error', `Error handling new connection: ${e.message}`);
                    this.terminateSession(socket, true);
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
        if (socket.destroyed || socket._terminated || socket.writable === false) {
            this.debugLog('error', 'Socket not writable, dropping write');
            return;
        }
        if (this.debug) {
            let logData = data.replace(/\r\n/g, '').replace(/\n/g, '');
            if (/^PASS\s+/i.test(logData) || / PASS /i.test(logData)) {
                logData = logData.replace(/(PASS\s+)(\S+)/i, '$1***');
            }
            console.log('<', logData);
        }
        try {
            const ok = socket.write(data);
            if (ok === false) {
                await new Promise((resolve) => {
                    let settled = false;
                    const finish = () => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        socket.removeListener('drain', onDrain);
                        socket.removeListener('error', onError);
                        resolve();
                    };
                    const onDrain = () => finish();
                    const onError = () => finish();
                    const timer = setTimeout(() => {
                        this.debugLog('warn', 'Socket drain timeout, dropping further wait');
                        finish();
                    }, 1000);
                    socket.once('drain', onDrain);
                    socket.once('error', onError);
                });
            }
        } catch (e) {
            this.debugLog('error', `Socket write failed: ${e.message}`);
        }
    }

    normalizeIp(addr) {
        if (!addr || typeof addr !== 'string') {
            return '';
        }
        let ip = addr;
        if (ip.startsWith('::ffff:')) {
            ip = ip.slice(7);
        }
        return ip.toLowerCase();
    }

    checkRateLimit(socket) {
        if (!this.rate_limit_enabled || socket.isserver || this.isIRCOp(socket.nickname)) {
            return true;
        }
        
        const now = Date.now();
        const socketId = this.normalizeIp(socket.remoteAddress) + ':' + socket.remotePort;
        
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
        const ip = this.normalizeIp(socket.realhost || socket.remoteAddress);
        const now = Date.now();
        
        if (!this.failed_auth_attempts.has(ip)) {
            return true;
        }
        
        const authData = this.failed_auth_attempts.get(ip);
        if (authData.lockoutUntil && now < authData.lockoutUntil) {
            return false;
        }
        if (authData.lockoutUntil && now >= authData.lockoutUntil) {
            this.failed_auth_attempts.delete(ip);
        }
        
        return true;
    }

    recordAuthFailure(socket) {
        const ip = this.normalizeIp(socket.realhost || socket.remoteAddress);
        const now = Date.now();
        
        if (!this.failed_auth_attempts.has(ip)) {
            this.failed_auth_attempts.set(ip, { count: 1, lockoutUntil: null });
            return;
        }
        
        const authData = this.failed_auth_attempts.get(ip);
        if (authData.lockoutUntil && now >= authData.lockoutUntil) {
            authData.count = 0;
            authData.lockoutUntil = null;
        }
        authData.count++;
        
        if (authData.count >= this.max_auth_attempts) {
            authData.lockoutUntil = now + (this.auth_lockout_duration * 1000);
            this.debugLog('warn', `IP ${ip} locked out for ${this.auth_lockout_duration} seconds due to failed auth attempts`);
        }
    }

    clearAuthFailures(socket) {
        const ip = this.normalizeIp(socket.realhost || socket.remoteAddress);
        this.failed_auth_attempts.delete(ip);
    }

    sanitizeInput(input, type = 'general') {
        if (typeof input !== 'string') {
            return '';
        }
        
        input = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        switch (type) {
            case 'nickname': {
                const sanitized = [...input]
                    .filter(char => this.allowed_nick_characters.includes(char))
                    .join('');
                return sanitized.slice(0, this.nicklen);
            }
            
            case 'channel': {
                const prefix = this.channelprefixes.find(p => input.startsWith(p));
                if (!prefix) return '';
                const nameWithoutPrefix = input.slice(prefix.length);
                const sanitized = [...nameWithoutPrefix]
                    .filter(char => this.allowed_chan_characters.includes(char))
                    .join('');
                return (prefix + sanitized).slice(0, this.channellen);
            }
            
            case 'username': {
                const sanitized = [...input]
                    .filter(char => this.allowed_user_characters.includes(char))
                    .join('');
                return sanitized.slice(0, this.userlen);
            }

            default:
                return input.slice(0, this.max_message_len);
        }
    }

    sanitizeTrailingParam(text) {
        if (text === undefined || text === null) {
            return '';
        }
        return String(text).replace(/[\r\n\0]/g, '');
    }

    formatUidBurstLine(sock, nickname) {
        const uniqueId = sock.uniqueId;
        const signonTime = Math.floor(this.usersignontimestamps.get(nickname) || this.getDate());
        const userModes = (this.getUserModes(nickname) || []).join('');
        const username = this.usernames.get(nickname) || sock.username || '';
        const host = sock.host || this.hostnames.get(nickname) || 'unknown';
        const ip = sock.remoteAddress || sock.realhost || '0';
        const userinfo = this.userinfo.get(nickname) || sock.userinfo || '';
        // TS6 UID: nick hops ts umodes user host ip uid :gecos
        return `:${this.serverId} UID ${nickname} 1 ${signonTime} +${userModes} ${username} ${host} ${ip} ${uniqueId} :${userinfo}\r\n`;
    }

    formatStatsUptimeLine(nickname) {
        const uptime = Math.max(0, this.getDate() - this.server_start_time);
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');
        return `:${this.servername} 242 ${nickname} :Server Up ${days} days ${hours}:${mm}:${ss}\r\n`;
    }

    buildLusersLines(nickname) {
        const visibleClients = Array.from(this.nicknames.values()).filter(nick => !(this.getUserModes(nick) || []).includes('i'));
        const invisibleClients = Array.from(this.nicknames.values()).filter(nick => (this.getUserModes(nick) || []).includes('i'));
        const operClients = Array.from(this.nicknames.values()).filter(nick => (this.getUserModes(nick) || []).includes('o'));
        const serverCount = this.servers.size + 1;
        const lines = [];
        lines.push(`:${this.servername} 251 ${nickname} :There are ${visibleClients.length} users and ${invisibleClients.length} invisible on ${serverCount} servers\r\n`);
        if (operClients.length > 0) {
            lines.push(`:${this.servername} 252 ${nickname} ${operClients.length} :operator(s) online\r\n`);
        }
        lines.push(`:${this.servername} 253 ${nickname} 0 :unknown connection(s)\r\n`);
        if (this.channelData.size > 0) {
            lines.push(`:${this.servername} 254 ${nickname} ${this.channelData.size} :channels formed\r\n`);
        }
        lines.push(`:${this.servername} 255 ${nickname} :I have ${this.clients.length} clients and ${serverCount} servers\r\n`);
        lines.push(`:${this.servername} 265 ${nickname} :Current local users ${this.clients.length}, max ${this.clientpeak}\r\n`);
        const globalUsers = this.countGlobalUsers();
        this.globalpeak = Math.max(this.globalpeak, globalUsers);
        lines.push(`:${this.servername} 266 ${nickname} :Current global users ${globalUsers}, max ${this.globalpeak}\r\n`);
        return lines;
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
            fs.promises.appendFile(this.irc_config.security_log_file, JSON.stringify(securityEvent) + '\n').catch((err) => {
                this.debugLog('error', `Failed to write security log: ${err.message}`);
            });
        }
    }

    async initializeSocket(socket, secure = false, oldSocket = null) {
        if (oldSocket) {
            socket.registered = oldSocket.registered;
            socket.nickname = oldSocket.nickname;
            socket.username = oldSocket.username;
            socket.userinfo = oldSocket.userinfo;
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
            socket._lineBuffer = oldSocket._lineBuffer || '';
            socket.loggingIn = oldSocket.loggingIn || false;
            socket.capNegotiating = oldSocket.capNegotiating || false;
            if (oldSocket._idleInterval) {
                clearInterval(oldSocket._idleInterval);
                oldSocket._idleInterval = null;
            }
            if (oldSocket.nickname && this.nicknames.get(oldSocket) === oldSocket.nickname) {
                this.nicknames.delete(oldSocket);
                this.nicknames.set(socket, oldSocket.nickname);
            }
            oldSocket._terminated = true;
            oldSocket.signedoff = true;
            this.clients = this.clients.filter(c => c !== oldSocket);
            try {
                oldSocket.removeAllListeners();
            } catch (e) { /* ignore */ }
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
            socket._lineBuffer = '';
            socket.loggingIn = false;
            socket.capNegotiating = false;
        }
        
        socket.secure = secure;
        socket.upgrading_to_tls = false;
        socket.error_count = 0;
        socket._terminated = false;
        socket.lastseen = this.getDate();
        if (!oldSocket) {
            await this.doInitialHandshake(socket);
        }
        
        socket._processQueue = Promise.resolve();
        socket.on('data', data => {
            socket.lastseen = this.getDate();
            socket._processQueue = socket._processQueue.then(async () => {
                try {
                    await this.processSocketData(socket, data);
                } catch (e) {
                    this.debugLog('error', `Error processing socket data: ${e.message}`);
                    this.terminateSession(socket, true);
                }
            }).catch(() => {});
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
            try {
                if (socket.signedoff || socket._terminated) {
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
            } catch (e) {
                this.debugLog('error', `Idle interval error: ${e.message}`);
            }
        }, 10000);

        this.clients.push(socket);
        this.clientpeak = Math.max(this.clientpeak, this.clients.length);
    }

    async processSocketData(socket, data) {
        if (socket.signedoff || socket._terminated) {
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

                let secureContext;
                try {
                    secureContext = this.getTlsSecureContext();
                } catch (e) {
                    this.debugLog('error', `STARTTLS context error: ${e.message}`);
                    this.terminateSession(socket, true);
                    return;
                }
                
                this.clients = this.clients.filter(c => c !== socket);
                const secureSocket = new tls.TLSSocket(socket, {
                    isServer: true,
                    ALPNProtocols: ['irc'],
                    secureContext,
                });
                socket.push(data);

                secureSocket.on('error', (err) => {
                    this.terminateSession(secureSocket, true);
                });
                
                secureSocket.on('close', () => {
                    this.terminateSession(secureSocket, false);
                });                    

                secureSocket.on('secure', async () => {
                    try {
                        this.debugLog('info', 'Secure connection (STARTTLS) established with '+ socket.remoteAddress);
                        socket.removeAllListeners('error');
                        await this.initializeSocket(secureSocket, true, socket);
                        this.clientpeak = Math.max(this.clientpeak, this.clients.length);
                    } catch (e) {
                        this.debugLog('error', `STARTTLS initialize error: ${e.message}`);
                        this.terminateSession(secureSocket, true);
                    }
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
        if (typeof socket._lineBuffer !== 'string') {
            socket._lineBuffer = '';
        }
        socket._lineBuffer += data;
        if (socket._lineBuffer.length > this.max_message_len * 4) {
            this.debugLog('warn', `Line buffer overflow from ${socket.remoteAddress}`);
            await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Input line too long\r\n`);
            this.terminateSession(socket, true);
            return;
        }
        const parts = socket._lineBuffer.split(/\r\n|\n/);
        socket._lineBuffer = parts.pop() || '';
        for (const line of parts) {
            if (!line) {
                continue;
            }
            if (this.reject_overlength_messages && line.length > this.max_message_len) {
                this.debugLog('warn', `Overlength message from ${socket.remoteAddress} (${line.length})`);
                await this.safeWriteToSocket(socket, `:${this.servername} 417 ${socket.nickname || '*'} :Input line too long\r\n`);
                continue;
            }
            if (this.debug) {
                let logLine = line;
                if (/^PASS\s+/i.test(logLine)) {
                    logLine = logLine.replace(/^(PASS\s+)\S+/i, '$1***');
                }
                console.log(`> ${logLine}`);
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

            // Server-link handshake commands are only accepted before client registration,
            // and never after the socket is a normal registered client.
            const serverHandshakeCommands = ['PASS', 'CAPAB', 'SERVER', 'SVINFO'];
            const firstWord = line.trim().split(' ')[0].toUpperCase();
            if (!line.startsWith(':') && serverHandshakeCommands.includes(firstWord)) {
                if (socket.registered || socket.nickname) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 421 ${socket.nickname || '*'} ${firstWord} :Unknown command\r\n`);
                    continue;
                }
                await this.processServerData(socket, line);
                continue;
            }

            // Prefixed TS6 lines are server-link only; never accept from clients.
            if (line.startsWith(':')) {
                this.debugLog('warn', `Ignoring prefixed line from non-server client ${socket.remoteAddress}`);
                continue;
            }

            const [command, ...params] = line.trim().split(' ');
            if (!command) {
                continue;
            }
            
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

    linkOwnsUid(socket, uniqueId) {
        if (!socket || !uniqueId) return false;
        if (socket.uniqueId && (uniqueId === socket.uniqueId || uniqueId.startsWith(socket.uniqueId))) {
            return true;
        }
        if (socket.servername && uniqueId.toLowerCase() === String(socket.servername).toLowerCase()) {
            return true;
        }
        for (const [sid, sock] of this.peerSids.entries()) {
            if (sock === socket && (uniqueId === sid || uniqueId.startsWith(sid))) {
                return true;
            }
        }
        // Allow UIDs for users already introduced on this link.
        const users = this.serverusers.get(socket);
        if (users) {
            const nick = this.findUserByUniqueId(uniqueId);
            if (nick && users.has(nick)) return true;
        }
        return false;
    }

    linkOwnsSid(socket, sid) {
        if (!socket || !sid) return false;
        if (socket.uniqueId && sid === socket.uniqueId) return true;
        return this.peerSids.get(sid) === socket;
    }

    async processServerData(socket, line) {
        // Only authorized server links may use the full server command surface.
        // Pre-auth handshake commands (PASS/CAPAB/SERVER/SVINFO) are allowed before authorization.
        if (!socket.linkState) {
            socket.linkState = 'none';
        }
        const parts = line.split(' ');
        const workingParts = parts.slice();
        let sourcePrefix = null;
        if (workingParts[0] && workingParts[0].startsWith(':')) {
            sourcePrefix = workingParts[0].slice(1);
            workingParts.shift();
        }
        if (workingParts.length < 1) return;
        const command = workingParts[0].toUpperCase();
        const handshakeCommands = ['PASS', 'CAPAB', 'SERVER', 'SVINFO'];
        const isHandshake = handshakeCommands.includes(command) && !sourcePrefix;

        if (!isHandshake && !(socket.isserver && socket.is_srv_authorized)) {
            this.debugLog('warn', `Rejecting server command ${command} from unauthorized socket`);
            await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Unauthorized\r\n`);
            this.addSocketError(socket);
            return;
        }

        // Enforce handshake ordering for bare handshake commands (pass → capab → server → svinfo → burst → eob).
        if (isHandshake) {
            const order = {
                none: ['PASS'],
                pass: ['PASS', 'CAPAB', 'SERVER'],
                capab: ['CAPAB', 'SERVER'],
                server: ['SVINFO'],
                svinfo: ['SVINFO'],
                burst: ['SVINFO'],
                eob: []
            };
            const allowed = order[socket.linkState];
            if (Array.isArray(allowed) && !allowed.includes(command)) {
                this.debugLog('warn', `Rejecting out-of-order handshake ${command} (linkState=${socket.linkState})`);
                await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Out of order command\r\n`);
                this.addSocketError(socket);
                return;
            }
        }

        if (/^\d{3}$/.test(command)) {
            await this.handleServerNumericReply(socket, command, workingParts, line);
            return;
        }

        if (sourcePrefix && !this.linkOwnsUid(socket, sourcePrefix) && command !== 'SERVER' && command !== 'SID') {
            this.debugLog('warn', `Rejecting prefixed ${command} from ${socket.servername}: UID ${sourcePrefix} not owned by link`);
            return;
        }

        const handlerName = `handleServerCommand_${command}`;
        if (typeof this[handlerName] === 'function') {
            await this[handlerName](socket, workingParts, line);
        } else if (sourcePrefix) {
            let nickname = this.findUserByUniqueId(sourcePrefix);
            if (!nickname) {
                // SID-sourced commands (TBURST/TOPIC/MODE/KILL/etc.) — not user UIDs.
                if (this.linkOwnsSid(socket, sourcePrefix) ||
                    (sourcePrefix.length === 3 && this.linkOwnsUid(socket, sourcePrefix))) {
                    nickname = socket.servername || sourcePrefix;
                } else {
                    this.debugLog('warn', `No nickname/SID found for unique ID ${sourcePrefix}`);
                    return;
                }
            }
            const srvCommand = workingParts[0];
            const srvHandlerName = `handleServerPrefixCommand_${srvCommand}`;
            if (typeof this[srvHandlerName] === 'function') {
                const prefixParts = [`:${sourcePrefix}`, ...workingParts];
                await this[srvHandlerName](socket, nickname, sourcePrefix, prefixParts, line);
            } else {
                this.debugLog('warn', `Unhandled server command from ${sourcePrefix}: ${srvCommand}`);
            }
        }
    }

    deleteChannel(channel) {
        if (!this.isReservedChannel(channel)) {
            this.channelData.delete(channel);
            this.debugLog('info', `Channel ${channel} deleted`);
        }
    }

    removeUserFromChannel(nickname, channel) {
        channel = this.findChannel(channel) || channel;
        if (!channel || !this.channelData.has(channel) || !nickname) {
            return false;
        }
        const channelObj = this.channelData.get(channel);
        channelObj.users.delete(nickname);
        channelObj.ops.delete(nickname);
        channelObj.halfops.delete(nickname);
        channelObj.voices.delete(nickname);
        channelObj.invites.delete(nickname);
        if (channelObj.users.size === 0) {
            this.deleteChannel(channel);
        }
        return true;
    }

    cleanupUserSession(nickname) {
        this.usersignontimestamps.delete(nickname);
        this.usernames.delete(nickname);
        this.usermodes.delete(nickname);
        this.awaymsgs.delete(nickname); 
        this.accounts.delete(nickname); 
        this.userinfo.delete(nickname);
        this.hostnames.delete(nickname);
        this.realhosts.delete(nickname);
        this.deleteUserUniqueId(nickname);         
        for (const ch of Array.from(this.channelData.keys())) {
            this.removeUserFromChannel(nickname, ch);
        }
    }

    async terminateSession(socket, close = false) {
        if (!socket || socket._terminated) {
            return;
        }
        socket._terminated = true;
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
            const srvUsers = this.serverusers.get(socket) || new Set();
            for (const remoteNick of srvUsers) {
                this.debugLog('debug', `Removing user ${remoteNick} from server ${socket.servername}`);
                const username = this.usernames.get(remoteNick) || remoteNick;
                const hostname = this.hostnames.get(remoteNick) || this.servername;
                await this.broadcastUser(remoteNick, `:${remoteNick}!${username}@${hostname} QUIT :Server disconnected\r\n`);
                await this.broadcastToAllServers(`:${this.uniqueids.get(remoteNick) || remoteNick} QUIT :Server disconnected\r\n`, socket);
                this.cleanupUserSession(remoteNick);
            }
            this.servers.delete(socket);
            this.serverusers.delete(socket);
            for (const [sid, sock] of Array.from(this.peerSids.entries())) {
                if (sock === socket) {
                    this.peerSids.delete(sid);
                }
            }
        } else {
            this.clients = this.clients.filter(c => c !== socket);
        }        
        if (socket._idleInterval) {
            clearInterval(socket._idleInterval);
            socket._idleInterval = null;
        }
        
        const socketId = this.normalizeIp(socket.remoteAddress) + ':' + socket.remotePort;
        this.message_counts.delete(socketId);
        
        const clientIP = this.normalizeIp(socket.remoteAddress);
        if (this.connections_per_ip.has(clientIP)) {
            const currentCount = this.connections_per_ip.get(clientIP);
            if (currentCount <= 1) {
                this.connections_per_ip.delete(clientIP);
            } else {
                this.connections_per_ip.set(clientIP, currentCount - 1);
            }
        }
        
        if (close) {
            try {
                socket.end();
            } catch (e) { /* ignore */ }
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
        if (!this.clientIsWebTV(socket)) {
            return;
        }
        for (const line of message) {
            const msg = line.split(' ');
            const firstWord = msg[0];
            const action = msg.slice(1).join(' ');
            await this.sendThrottled(socket, [`:${firstWord}!system@webtv PRIVMSG ${channel} :\x01ACTION ${action}\x01\r\n`]);
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

    formatNickPrefixes(nickname, channelObj, multiPrefix = false) {
        const ops = channelObj.ops || new Set();
        const halfops = channelObj.halfops || new Set();
        const voices = channelObj.voices || new Set();
        if (multiPrefix) {
            let prefixes = '';
            if (ops.has(nickname)) prefixes += '@';
            if (halfops.has(nickname)) prefixes += '%';
            if (voices.has(nickname)) prefixes += '+';
            return prefixes + nickname;
        }
        if (ops.has(nickname)) return '@' + nickname;
        if (halfops.has(nickname)) return '%' + nickname;
        if (voices.has(nickname)) return '+' + nickname;
        return nickname;
    }

    getUsersInChannel(channel, multiPrefix = false) {
        if (this.channelData.has(channel)) {
            const channelObj = this.channelData.get(channel);
            return Array.from(channelObj.users).map(user => this.formatNickPrefixes(user, channelObj, multiPrefix));
        }
        return [];
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
                        await this.safeWriteToSocket(sock, message);
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
            const ops = new Set();
            if (creator) {
                ops.add(creator);
            }
            this.channelData.set(channel, {
                users: new Set(),
                ops,
                halfops: new Set(),
                voices: new Set(),
                topic: '',
                topicSetter: '',
                topicTs: 0,
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

    globToRegExp(glob) {
        const escaped = String(glob || '*')
            .replace(/[.^$+(){}[\]\\|]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp('^' + escaped + '$', 'i');
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
            const maskRegex = this.globToRegExp(mask);
            return maskRegex.test(nickname) || maskRegex.test(userIdent);
        }

        const [maskNick, rest] = mask.split('!', 2);
        const [maskUser, maskHost] = (rest || '').split('@', 2);

        const [fullNick, fullRest] = fullMask.split('!', 2);
        const [fullUser, fullHost] = (fullRest || '').split('@', 2);

        const nickRegex = this.globToRegExp(maskNick || '*');
        const userRegex = this.globToRegExp(maskUser || '*');
        const hostRegex = this.globToRegExp(maskHost || '*');
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
            for (const banMask of chanData.bans) {
                if (!this.checkMask(banMask, socket)) {
                    continue;
                }
                let exempt = false;
                if (chanData.exemptions) {
                    for (const exemptMask of chanData.exemptions) {
                        if (this.checkMask(exemptMask, socket)) {
                            exempt = true;
                            break;
                        }
                    }
                }
                if (!exempt) {
                    return true;
                }
            }
        }
        return false;
    }

    findLocalSocketByUniqueId(uniqueId) {
        for (const socket of this.nicknames.keys()) {
            if (socket.uniqueId === uniqueId) {
                return socket;
            }
        }
        return null;
    }

    findSocketByUniqueId(uniqueId) {
        const local = this.findLocalSocketByUniqueId(uniqueId);
        if (local) {
            return local;
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

    isAuthorizedServer(socket) {
        return !!(socket && socket.isserver && socket.is_srv_authorized);
    }

    isServicesPeer(socket) {
        if (!this.isAuthorizedServer(socket)) {
            return false;
        }
        const info = socket.serverinfo || {};
        if (info.services === true || info.is_services === true) {
            return true;
        }
        const name = (info.name || socket.servername || '').toLowerCase();
        return name.includes('services') || name.includes('anope');
    }

    migrateNickKeyedMap(map, oldNick, newNick) {
        if (!map || !map.has(oldNick)) {
            return;
        }
        map.set(newNick, map.get(oldNick));
        map.delete(oldNick);
    }

    processRemoteNickChange(oldNick, newNick) {
        if (!oldNick || !newNick || oldNick === newNick) {
            return;
        }
        for (const channelObj of this.channelData.values()) {
            if (channelObj.users.has(oldNick)) {
                channelObj.users.delete(oldNick);
                channelObj.users.add(newNick);
            }
            if (channelObj.ops.has(oldNick)) {
                channelObj.ops.delete(oldNick);
                channelObj.ops.add(newNick);
            }
            if (channelObj.halfops.has(oldNick)) {
                channelObj.halfops.delete(oldNick);
                channelObj.halfops.add(newNick);
            }
            if (channelObj.voices.has(oldNick)) {
                channelObj.voices.delete(oldNick);
                channelObj.voices.add(newNick);
            }
            if (channelObj.invites.has(oldNick)) {
                channelObj.invites.delete(oldNick);
                channelObj.invites.add(newNick);
            }
        }
        this.migrateNickKeyedMap(this.usernames, oldNick, newNick);
        this.migrateNickKeyedMap(this.usermodes, oldNick, newNick);
        this.migrateNickKeyedMap(this.awaymsgs, oldNick, newNick);
        this.migrateNickKeyedMap(this.usersignontimestamps, oldNick, newNick);
        this.migrateNickKeyedMap(this.hostnames, oldNick, newNick);
        this.migrateNickKeyedMap(this.realhosts, oldNick, newNick);
        this.migrateNickKeyedMap(this.accounts, oldNick, newNick);
        this.migrateNickKeyedMap(this.userinfo, oldNick, newNick);
        const uid = this.uniqueids.get(oldNick);
        if (uid) {
            this.addUserUniqueId(newNick, uid);
            this.deleteUserUniqueId(oldNick);
        }
        for (const [srvSocket, users] of this.serverusers.entries()) {
            if (users && users.has(oldNick)) {
                users.delete(oldNick);
                users.add(newNick);
            }
        }
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
        const id = this.uniqueids.get(nickname);
        this.uniqueids.delete(nickname);
        if (id && this._usedUniqueIds && id.length > 3) {
            // free the random suffix portion for local UIDs
            this._usedUniqueIds.delete(id.slice(3));
        }
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
        const oldNick = socket.nickname;
        if (!oldNick || !newNick || oldNick === newNick) {
            return;
        }
        for (const channelObj of this.channelData.values()) {
            if (channelObj.users.has(oldNick)) {
                channelObj.users.delete(oldNick);
                channelObj.users.add(newNick);
            }
            if (channelObj.ops.has(oldNick)) {
                channelObj.ops.delete(oldNick);
                channelObj.ops.add(newNick);
            }
            if (channelObj.halfops.has(oldNick)) {
                channelObj.halfops.delete(oldNick);
                channelObj.halfops.add(newNick);
            }
            if (channelObj.voices.has(oldNick)) {
                channelObj.voices.delete(oldNick);
                channelObj.voices.add(newNick);
            }
            if (channelObj.invites.has(oldNick)) {
                channelObj.invites.delete(oldNick);
                channelObj.invites.add(newNick);
            }
        }
        this.migrateNickKeyedMap(this.usernames, oldNick, newNick);
        if (!this.usernames.has(newNick)) {
            this.usernames.set(newNick, socket.username || oldNick);
        }
        this.nicknames.set(socket, newNick);
        this.addUserUniqueId(newNick, socket.uniqueId);
        this.deleteUserUniqueId(oldNick);
        this.migrateNickKeyedMap(this.usermodes, oldNick, newNick);
        this.migrateNickKeyedMap(this.awaymsgs, oldNick, newNick);
        this.migrateNickKeyedMap(this.usersignontimestamps, oldNick, newNick);
        this.migrateNickKeyedMap(this.hostnames, oldNick, newNick);
        this.migrateNickKeyedMap(this.realhosts, oldNick, newNick);
        this.migrateNickKeyedMap(this.accounts, oldNick, newNick);
        this.migrateNickKeyedMap(this.userinfo, oldNick, newNick);
        socket.nickname = newNick;
    }

    generateUniqueId(socket) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const fullId = `${this.serverId}${id}`;
        if (this._usedUniqueIds.has(id) || this._usedUniqueIds.has(fullId)) {
            return this.generateUniqueId(socket);
        }
        for (const existing of this.uniqueids.values()) {
            if (existing === id || existing === fullId || existing.endsWith(id)) {
                return this.generateUniqueId(socket);
            }
        }
        this._usedUniqueIds.add(id);
        return id;
    }

    casefold(str) {
        if (typeof str !== 'string') {
            return '';
        }
        // RFC1459 casemapping: []\ are uppercase equivalents of {}|
        return str.toLowerCase()
            .replace(/\[/g, '{')
            .replace(/\]/g, '}')
            .replace(/\\/g, '|')
            .replace(/\^/g, '~');
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
        const folded = this.casefold(channel);
        for (const existingChannel of this.channelData.keys()) {
            if (this.casefold(existingChannel) === folded) {
                return existingChannel;
            }
        }
        return null;
    }

    findUser(username) {
        if (typeof username !== 'string') return null;
        const folded = this.casefold(username);
        for (const nick of this.nicknames.values()) {
             if (this.casefold(nick) === folded) {
                return nick;
            }
        }
        for (const users of this.serverusers.values()) {
            if (!users) continue;
            for (const nick of users) {
                if (typeof nick === 'string' && this.casefold(nick) === folded) {
                    return nick;
                }
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
        // Notify shared-channel peers that have the capability (recipient-gated).
        const alreadyNotified = [];
        for (const channelObj of this.channelData.values()) {
            if (!channelObj.users.has(socket.nickname)) continue;
            for (const user of channelObj.users) {
                const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                if (!sock || sock === exceptSocket || alreadyNotified.includes(sock)) continue;
                if (sock.client_caps && sock.client_caps.includes(client_cap)) {
                    await this.safeWriteToSocket(sock, message);
                    alreadyNotified.push(sock);
                }
            }
        }
    }

    async broadcastUserIfCapAndChanOp(socket, message, exceptSocket = null, client_cap, channel) {
        channel = this.findChannel(channel);
        if (!channel) {
            this.debugLog('warn', `Attempted to broadcast to channel ${channel} that does not exist.`);
            return;
        }
        const channelObj = this.channelData.get(channel);
        for (const user of channelObj.users) {
            const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
            if (!sock || sock === exceptSocket) continue;
            if (!(sock.client_caps && sock.client_caps.includes(client_cap))) continue;
            const isOp = channelObj.ops.has(user);
            const isHalfOp = channelObj.halfops.has(user);
            if (isOp || isHalfOp) {
                await this.safeWriteToSocket(sock, message);
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
        if (!nickname || typeof nickname !== 'string') {
            return null;
        }
        const resolved = this.findUser(nickname) || nickname;
        const modes = this.usermodes.get(resolved);
        if (!modes || modes === true) {
            // Pure read: do not mutate usermodes map here.
            return [];
        }
        return [...modes];
    }

    setUserMode(nickname, mode, adding) {
        const resolved = this.findUser(nickname) || nickname;
        let modes = this.usermodes.get(resolved);
        if (!modes || modes === true) {
            modes = [];
            this.usermodes.set(resolved, modes);
        }
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
        // Preserve the connecting IP as realhost for KLINE/ban matching.
        socket.realhost = socket.remoteAddress;
        socket.pause();
        socket.host = await this.getHostname(socket);
        socket.resume();
    }

    isKLineActive(kline) {
        if (!kline) {
            return false;
        }
        // Permanent when expiry is missing/null/0; otherwise active until expiry.
        if (!kline.expiry) {
            return true;
        }
        return kline.expiry > this.getDate();
    }

    async scanSocketForKLine(socket) {
        let changed = false;
        for (let i = this.klines.length - 1; i >= 0; i--) {
            const kline = this.klines[i];
            if (!this.isKLineActive(kline)) {
                this.klines.splice(i, 1);
                changed = true;
                continue;
            }
            if (this.checkMask(kline.mask, socket)) {
                if (kline.reason) {
                    await this.safeWriteToSocket(socket, `:${this.servername} KILL ${socket.nickname} :K-lined: ${kline.reason}\r\n`);
                } else {
                    await this.safeWriteToSocket(socket, `:${this.servername} KILL ${socket.nickname} :K-lined\r\n`);
                }
                if (changed) {
                    this.saveKLinesToFile();
                }
                this.terminateSession(socket, true);
                return true;
            }
        }
        if (changed) {
            this.saveKLinesToFile();
        }
        return false;        
    }

    async scanUsersForKLines() {
        let changed = false;
        for (let i = this.klines.length - 1; i >= 0; i--) {
            const kline = this.klines[i];
            if (!this.isKLineActive(kline)) {
                this.klines.splice(i, 1);
                changed = true;
                continue;
            }
            for (const socket of Array.from(this.nicknames.keys())) {
                if (this.checkMask(kline.mask, socket)) {
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
                }
            }
        }
        if (changed) {
            this.saveKLinesToFile();
        }
    }

    saveKLinesToFile() {
        try {
            if (!fs.existsSync(this.session_store_path)) {
                fs.mkdirSync(this.session_store_path, { recursive: true });
            }
            fs.writeFileSync(this.klines_path, JSON.stringify(this.klines, null, 2));
        } catch (e) {
            this.debugLog('error', `Failed to save klines: ${e.message}`);
        }
    }

    loadKLinesFromFile() {
        try {
            if (fs.existsSync(this.klines_path)) {
                const data = fs.readFileSync(this.klines_path, 'utf8');
                this.klines = JSON.parse(data);
                if (!Array.isArray(this.klines)) {
                    this.klines = [];
                }
            }
        } catch (e) {
            this.debugLog('error', `Failed to load klines, starting empty: ${e.message}`);
            this.klines = [];
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
            const channelBans = this.channelData.get(channel).bans;
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
            const channelExemptions = this.channelData.get(channel).exemptions;
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
            const channelInvites = this.channelData.get(channel).inviteexemptions;
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
            const sourceUniqueId = this.uniqueids.get(nickname) || nickname || socket.uniqueId || this.serverId;
            serverModeMsg = `:${sourceUniqueId} MODE ${channel} `;
        } else {
            if (!(await this.checkRegistered(socket))) {
                return;
            }
            serverModeMsg = `:${socket.uniqueId} MODE ${channel} `;
        }
        const username = this.usernames.get(nickname);
        const hostname = this.hostnames.get(nickname);

        let modeMsg = `:${nickname}!${username}@${hostname} MODE ${channel} `;
        let WTVMsg = `${nickname} has set channel mode `;
        let addingFlag = true;
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
            } else if (modes === 'b' || modes === 'e' || modes === 'I') {
                const chanData = this.channelData.get(channel);
                const onChannel = chanData && chanData.users.has(nickname);
                const secret = chanData && (chanData.modes.includes('s') || chanData.modes.includes('p'));
                if (!onChannel && !this.isIRCOp(nickname) && secret) {
                    if (modes === 'b') {
                        output_lines.push(`:${this.servername} 368 ${nickname} ${channel} :End of channel ban list\r\n`);
                    } else if (modes === 'e') {
                        output_lines.push(`:${this.servername} 349 ${nickname} ${channel} :End of channel exception list\r\n`);
                    } else {
                        output_lines.push(`:${this.servername} 337 ${nickname} ${channel} :End of channel invite list\r\n`);
                    }
                    await this.sendThrottled(socket, output_lines);
                    return;
                }
                if (!onChannel && !this.isIRCOp(nickname)) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 442 ${nickname} ${channel} :You're not on that channel\r\n`);
                    return;
                }
                if (modes === 'b') {
                    if (chanData && chanData.bans) {
                        for (const ban of chanData.bans) {
                            output_lines.push(`:${this.servername} 367 ${nickname} ${channel} ${ban}\r\n`);
                        }
                    }
                    output_lines.push(`:${this.servername} 368 ${nickname} ${channel} :End of channel ban list\r\n`);
                } else if (modes === 'e') {
                    if (chanData && chanData.exemptions) {
                        for (const exemption of chanData.exemptions) {
                            output_lines.push(`:${this.servername} 348 ${nickname} ${channel} ${exemption}\r\n`);
                        }
                    }
                    output_lines.push(`:${this.servername} 349 ${nickname} ${channel} :End of channel exception list\r\n`);
                } else {
                    if (chanData && chanData.inviteexemptions) {
                        for (const invite of chanData.inviteexemptions) {
                            output_lines.push(`:${this.servername} 336 ${nickname} ${channel} ${invite}\r\n`);
                        }
                    }
                    output_lines.push(`:${this.servername} 337 ${nickname} ${channel} :End of channel invite list\r\n`);
                }
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
                const isStatusMode = this.supported_prefixes[0].includes(mc);
                if (socket.isserver) {
                    if (isStatusMode) {
                        target = this.findUserByUniqueId(param) || this.findUser(param) || param;
                    } else {
                        target = param; // ban/except/invex/key/limit — raw param
                    }
                } else {
                    target = isStatusMode ? (this.findUser(param) || param) : param;
                    if (isStatusMode && !this.findUser(param) && !socket.isserver) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${nickname} ${param} :No such nick/channel\r\n`);
                        return;
                    }
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
                        const usersInChannel = Array.from(this.channelData.get(channel).users);
                        const kickReason = 'Channel is now +S (SSL/TLS required)';
                        for (const user of usersInChannel) {
                            const userSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                            if (userSocket && !userSocket.secure) {
                                await this.safeWriteToSocket(userSocket, `:${nickname}!${username}@${socket.host} KICK ${channel} ${userSocket.nickname} :${kickReason}\r\n`);
                                await this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} KICK ${channel} ${userSocket.nickname} :${kickReason}\r\n`, userSocket);
                                const sourceUniqueId = this.uniqueids.get(nickname);
                                await this.broadcastToAllServers(`:${sourceUniqueId} KICK ${channel} ${userSocket.uniqueId} :${kickReason}\r\n`);
                                this.removeUserFromChannel(userSocket.nickname, channel);
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
        if (socket.isserver) {
            if (socket.is_srv_authorized) {
                return true;
            }
            if (allowUnregistered) {
                return true;
            }
            if (socket.writable && !silent) {
                await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Unauthorized\r\n`);
            }
            this.addSocketError(socket);
            return false;
        }
        if (socket.registered || allowUnregistered) {
            return true;
        }
        if (socket.writable && !silent) {
            await this.safeWriteToSocket(socket, `:${this.servername} 451 ${socket.nickname || '*'} :You have not registered\r\n`);
        }
        this.addSocketError(socket);
        return false;
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
        if (socket.loggingIn || socket.registered) {
            return;
        }
        socket.loggingIn = true;
        if (await this.scanSocketForKLine(socket)) {
            socket.loggingIn = false;
            return;
        }
        this.addUserUniqueId(nickname, socket.uniqueId);
        this.hostnames.set(nickname, socket.host);
        this.realhosts.set(nickname, socket.realhost);
        // Register before optional VERSION probe so mid-login commands are not rejected.
        socket.registered = true;
        await this.safeWriteToSocket(socket, `:${this.servername} PRIVMSG ${socket.nickname} :\x01VERSION\x01\r\n`);
        let waited = 0;
        while (socket.client_version === '' && waited < 1000) {
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
            output_lines.push(`:${this.servername} 005 ${nickname} ${caps} :are supported by this server\r\n`);
        }
        output_lines.push(`:${this.servername} 042 ${nickname} ${socket.uniqueId} :your unique ID\r\n`);

        output_lines.push(...(await this.doMOTD(nickname)));        

        const totalSockets = this.clients.length + this.servers.size;
        this.socketpeak = Math.max(this.socketpeak, totalSockets);
        output_lines.push(...this.buildLusersLines(nickname));
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
            this.hostnames.set(nickname, socket.host);
            if (socket.client_caps && socket.client_caps.includes('chghost')) {
                output_lines.push(`:${socket.nickname}!${socket.username}@${socket.host} CHGHOST ${socket.username} ${socket.host}\r\n`);
            }
            output_lines.push(`:${this.servername} 396 ${socket.nickname} ${socket.host} :is now your visible host\r\n`);            
        }
        output_lines.push(`:${this.servername} 221 ${nickname} :+${this.usermodes.get(nickname).join('')}\r\n`);
        await this.sendThrottled(socket, output_lines);
        for (const srvSocket of this.servers.keys()) {
            if (srvSocket) {
                const nick = socket.nickname;
                await this.safeWriteToSocket(srvSocket, this.formatUidBurstLine(socket, nick));
                if (socket.realhost && socket.realhost !== socket.host) {
                    await this.safeWriteToSocket(srvSocket, `:${this.serverId} ENCAP * REALHOST ${socket.uniqueId} :${socket.realhost}\r\n`);
                }
            }
        } 
        await this.broadcastConnection(socket);
        socket.loggingIn = false;
    }
}

Object.assign(WTVIRC.prototype, clientCommands);
Object.assign(WTVIRC.prototype, serverCommands);

module.exports = WTVIRC;