const net = require('net');
const dns = require('dns');
const { crc16 } = require('easy-crc');
const tls = require('tls');
const fs = require('fs');
const WTVShared = require('./WTVShared.js').WTVShared;

class WTVIRC {
    /*
        * @constructor
        * @class WTVIRC
        * WTVIRC - A small IRC server implementation for WebTV
        * Tested with WebTV and KvIRC
        * This is a basic implementation and does not cover all IRC features.
        * Supports unencrypted and encrypted (SSL) connections on the same port.
        * It supports basic commands like NICK, USER, JOIN, PART, PRIVMSG, NOTICE, TOPIC, AWAY, MODE, KICK, and PING.
        * Basic IRCOp functionality is included, you can basically be an channel operator in every channel, or /kill users.
        * Channel modes are supported, including invite-only, topic protection, password protection, and user modes (op/voice).
        * SSL only channel mode +z is supported. As is usermode +Z (no DMs from non-SSL users)
        * 
        * TODO: k-line? probably not, but maybe in a different format.
        * TODO: Test for crashes with arbitrary data, or malformed commands (especially SSL handshake).
        * 
        * @param {Object} minisrv_config - The configuration object for minisrv.
        * @param {string} [host='localhost'] - The host to bind the IRC server to.
        * @param {number} [port=6667] - The port to bind the IRC server to.
        * @param {boolean} [debug=false] - Whether to enable debug mode for logging.
    */ 
    constructor(minisrv_config, host = 'localhost', port = 6667, debug = false) {
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        this.version = 
        this.host = host;
        this.port = port;
        this.debug = debug;
        this.server = null;
        this.clients = [];
        this.usernames = new Map(); // nickname -> username
        this.channels = new Map();
        this.channeltimestamps = new Map(); // channel -> timestamp of creation
        this.channelops = new Map(); // channel -> Set of operators
        this.channelvoices = new Map(); // channel -> Set of voiced users
        this.channeltopics = new Map(); // channel -> topic
        this.channelinvites = new Map(); // channel -> Set of invited users
        this.channelbans = new Map(); // channel -> Set of banned users
        this.channelexemptions = new Map(); // channel -> Set of exempted users
        this.inviteexceptions = new Map(); // channel -> Set of users who can bypass invite only mode
        this.channelmodes = new Map(); // channel -> Array of modes (e.g. ['m', 'i', 'l10', 'k secret'])
        this.usertimestamps = new Map(); // nickname -> timestamp since last message
        this.usermodes = new Map(); // nickname -> Array of modes (e.g. ['w', 'i'])
        this.usersignontimestamps = new Map(); // nickname -> timestamp since user signed on
        this.nicknames = new Map(); // socket -> nickname
        this.awaymsgs = new Map(); // nickname -> away message        
        this.channelprefixes = ['#','&'];
        this.default_channel_modes = ['n','t'];
        this.default_user_modes = ['x'];
        this.servername = 'irc.local';
        this.server_start_time = Date.now();
        this.allowed_characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_[]{}\\|^-';
        this.irc_config = minisrv_config.config.irc || {};
        this.oper_username = this.irc_config.oper_username || 'minisrv';
        this.oper_password = this.irc_config.oper_password || 'changeme573';
        this.oper_enabled = this.irc_config.oper_enabled || this.debug || false; // Default to off to prevent accidental use with default credentials
        this.irc_motd = this.irc_config.motd || 'Welcome to the minisrv WebTV IRC server!';
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
        this.enable_ssl = this.irc_config.enable_ssl || false;
        this.maxtargets = this.irc_config.max_targets || 4;
        this.kick_insecure_on_z = this.irc_config.kick_insecure_on_z || true; // If true, users without SSL connections will be kicked from a channel when +z is applied
        this.clientpeak = 0;
        this.caps = [
            `AWAYLEN=${this.awaylen} CASEMAPPING=rfc1459 CHANMODES=beI,k,l,itmnpz CHANNELLEN=${this.channellen} CHANTYPES=${this.channelprefixes.join('')} PREFIX=(ov)@+ USERMODES=oxizZws MAXLIST=b:${this.maxbans},e:${this.maxexcept},i:${this.maxinvite},k:${this.maxkeylen},l:${this.maxlimit}`,
            `CHARSET=ascii MODES=3 EXCEPTS=e INVEX=I CHANLIMIT=${this.channelprefixes.join('')}:${this.channellimit} NICKLEN=${this.nicklen} TOPICLEN=${this.topiclen} KICKLEN=${this.kicklen}`
        ];
    }

    start() {
        this.server_start_time = Date.now();
        this.server = net.createServer((socket) => {            
            // Detect SSL handshake and wrap socket if needed
            socket.once('data', (firstChunk) => {
                socket.removeAllListeners('data');
                socket.pause();
                socket.on('error', (err) => {
                    if (this.debug) {
                        console.error('Socket error:', err);
                    }                    
                    this.terminateSession(socket, true);
                });
                // Check if the first byte indicates SSL/TLS handshake (0x16 for TLS Handshake)
                if (Buffer.isBuffer(firstChunk) ? firstChunk[0] === 0x16 : firstChunk.charCodeAt(0) === 0x16) {
                    if (!this.enable_ssl) {
                        // If SSL is not enabled, close the socket
                        socket.write(`:${this.servername} 421 * :SSL is not enabled on this server\r\n`);
                        socket.end();
                        return;
                    }

                    // SSL detected, upgrade socket to TLS
                    const keyBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.key));
                    const certBuffer = fs.readFileSync(this.wtvshared.parseConfigVars(this.irc_config.ssl_cert.cert));

                    // Upgrade the socket to TLS (SSL handshake)

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
                        this.terminateSession(secureSocket, true);
                    });
                    
                    secureSocket.on('close', () => {
                        this.terminateSession(secureSocket, false);
                    });                    

                    // Only start processing after handshake is complete
                    secureSocket.on('secure', () => {
                        if (this.debug) {
                            console.log('Secure connection established');
                        }
                        if (this.debug) {
                            const originalWrite = secureSocket.write;
                            secureSocket.write = function (...args) {
                                var log_args = args.map(arg => {
                                    if (typeof arg === 'string') {
                                        return arg.replace(/\r\n/g, '\\r\\n').replace(/\n/g, '\\n');
                                    }
                                    return arg;
                                });
                                console.log('<', ...log_args);
                                return originalWrite.apply(secureSocket, args);
                            };
                        }                           
                        // Feed the first chunk into the TLS socket for handshake
                        socket.removeAllListeners('error');
                        secureSocket.setEncoding('ascii');
                        secureSocket.registered = false;
                        secureSocket.nickname = '';
                        secureSocket.username = '';
                        secureSocket.realhost = socket.remoteAddress
                        secureSocket.host = this.filterHostname(secureSocket, socket.remoteAddress);
                        this.getHostname(secureSocket, (hostname) => {
                            secureSocket.realhost = hostname;
                            secureSocket.host = this.filterHostname(secureSocket, hostname);
                        });

                        secureSocket.timestamp = Date.now();
                        secureSocket.secure = true;
                        secureSocket.uniqueId = parseInt(crc16('CCITT-FALSE', Buffer.from(String(secureSocket.remoteAddress) + String(secureSocket.remotePort), "utf8")).toString(16), 16);
                        // Push the secure socket to clients
                        this.clients.push(secureSocket);
                        this.clientpeak = Math.max(this.clientpeak, this.clients.length);                                                
                        secureSocket.write(`:${this.servername} NOTICE AUTH :Welcome to minisrv IRC Server\r\n`);
                        secureSocket.on('data', data => {
                            this.processSocketData(secureSocket, data);
                        });
                        secureSocket.on('end', () => {
                            this.terminateSession(secureSocket, false);
                        });
                    });                    
                    secureSocket.resume();              
                    return;
                } else {
                    // Not SSL, re-emit the data event for normal processing
                    if (this.debug) {
                        const originalWrite = socket.write;
                        socket.write = function (...args) {
                            var log_args = args.map(arg => {
                                if (typeof arg === 'string') {
                                    return arg.replace(/\r\n/g, '\\r\\n').replace(/\n/g, '\\n');
                                }
                                return arg;
                            });
                            console.log('<', ...log_args);
                            return originalWrite.apply(socket, args);
                        };
                    }                                          
                    socket.setEncoding('ascii');
                    socket.registered = false;
                    socket.nickname = '';
                    socket.username = '';
                    socket.realhost = socket.remoteAddress;
                    socket.host = this.filterHostname(socket, socket.remoteAddress);
                    this.getHostname(socket, (hostname) => {
                        socket.realhost = hostname;
                        socket.host = this.filterHostname(socket, hostname);
                    });
                    socket.timestamp = Date.now();                    
                    socket.secure = false; 
                    socket.uniqueId = parseInt(crc16('CCITT-FALSE', Buffer.from(String(socket.remoteAddress) + String(socket.remotePort), "utf8")).toString(16), 16);

                    socket.write(`:${this.servername} NOTICE AUTH :Welcome to minisrv IRC Server\r\n`);
                    socket.on('data', data => {
                        this.processSocketData(socket, data);
                    });

                    socket.on('end', () => {
                        this.terminateSession(socket, false);
                    });

                    socket.on('error', () => {
                        this.terminateSession(socket, true);
                    });
                    socket.emit('data', firstChunk.toString('ascii'));
                    socket.resume();
                    this.clients.push(socket);
                    this.clientpeak = Math.max(this.clientpeak, this.clients.length);
                    return;
                }
            });
        });
        this.server.listen(this.port, this.host, () => {
            if (this.debug) {
                console.log(`IRC server started on port ${this.host}:${this.port}`);
            }
        });        
    }

    processSocketData(socket, data) {
        // Ensure data is a string
        if (typeof data !== 'string') {
            if (Buffer.isBuffer(data)) {
                data = data.toString('utf8');
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
            const [command, ...params] = line.trim().split(' ');
            switch (command.toUpperCase()) {
                case 'OPER':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (!this.oper_enabled) {
                        socket.write(`:${this.servername} 491 ${socket.nickname} :This server does not support IRC operators\r\n`);
                        break;
                    }
                    if (params.length < 2) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} OPER :Not enough parameters\r\n`);
                        break;
                    }
                    const [operName, operPassword] = params;
                    if (operName !== this.oper_username) {
                        socket.write(`:${this.servername} 491 ${socket.nickname} :No permission\r\n`);
                        break;
                    }
                    if (operPassword !== this.oper_password) {
                        socket.write(`:${this.servername} 464 ${socket.nickname} :Password incorrect\r\n`);
                        break;
                    }
                    var usermodes = this.usermodes.get(socket.nickname) || [];
                    if (usermodes === true) {
                        usermodes = [];
                    }
                    this.usermodes.set(socket.nickname, [...usermodes, 'o']);
                    socket.write(`:${this.servername} 381 ${socket.nickname} :You are now an IRC operator\r\n`);
                    socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +o\r\n`);
                    break;
                case 'UPTIME':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    const uptime = Math.floor((Date.now() - this.server_start_time) / 1000);
                    const days = Math.floor(uptime / 86400);
                    const hours = Math.floor((uptime % 86400) / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = uptime % 60;
                    socket.write(`:${this.servername} 242 ${socket.nickname} :Server uptime is ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds\r\n`);
                    break;
                case 'KICK':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                        socket.write(`:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
                        break;
                    } else {
                        if (!this.channelops.get(channel).has(socket.nickname)) {
                            socket.write(`:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
                            break;
                        }
                    }                            
                    if (params.length < 2) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} KICK :Not enough parameters\r\n`);
                        break;
                    }
                    this.usertimestamps.set(socket.nickname, Date.now());
                    var channel = params[0];
                    const targetNick = params[1];

                    if (!this.channels.has(channel)) {
                        socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                        break;
                    }                      
                    if (!this.channels.get(channel).has(targetNick)) {
                        socket.write(`:${this.servername} 441 ${socket.nickname} ${targetNick} :They aren't on that channel\r\n`);
                        break;
                    }
                    this.channels.get(channel).delete(targetNick);
                    var targetSocket = Array.from(this.clients).find(s => this.nicknames.get(s) === targetNick);
                    if (params.length > 2) {
                        let reason = params.slice(2).join(' ');
                        if (reason.startsWith(':')) {
                            reason = reason.slice(1);
                        }
                        targetSocket.write(`:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick} :${reason}\r\n`);
                        this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick} :${reason}\r\n`);
                        break;
                    } else {
                        targetSocket.write(`:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick}\r\n`);
                        this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick}\r\n`);
                    }
                    break;
                case 'TOPIC':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (params.length < 1) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} TOPIC :Not enough parameters\r\n`);
                        break;
                    }
                    var chan_modes = this.channelmodes.get(channel) || [];
                    if (chan_modes.includes('t')) {
                        // Only allow channel operators to change the topic if +t is set
                        if (!this.channelops.has(channel) || !this.channelops.get(channel).has(socket.nickname)) {
                            socket.write(`:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
                            break;
                        }
                    }
                    this.usertimestamps.set(socket.nickname, Date.now());
                    var channel = params[0];
                    if (!this.channels.has(channel)) {
                        socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                        break;
                    }                        
                    if (params.length > 1) {
                        var topic = params.slice(1).join(' ');
                        if (topic.startsWith(':')) {
                            topic = topic.slice(1);
                        }
                        this.channeltopics.set(channel, topic);
                        socket.write(`:${this.servername} 332 ${socket.nickname} ${channel} :${topic}\r\n`);
                        this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} TOPIC ${channel} :${topic}\r\n`, socket);
                    } else {
                        const topic = this.channeltopics.get(channel) || 'No topic set';
                        socket.write(`:${this.servername} 331 ${socket.nickname} ${channel} :${topic}\r\n`);
                    }
                    break;
                case "AWAY":
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    this.usertimestamps.set(socket.nickname, Date.now());
                    if (params.length > 0) {
                        socket.write(`:${this.servername} 306 ${socket.nickname} :You are now marked as away\r\n`);
                        let awayMsg = params.join(' ');
                        if (awayMsg.startsWith(':')) {
                            awayMsg = awayMsg.slice(1);
                        }
                        this.awaymsgs.set(socket.nickname, awayMsg);
                    } else {
                        socket.write(`:${this.servername} 305 ${socket.nickname} :You are no longer marked as away\r\n`);
                        this.awaymsgs.delete(socket.nickname);
                    }
                    break;
                case 'CAP':
                    // Minimal CAP support: just acknowledge LS
                    if (params[0] && params[0].toUpperCase() === 'LS') {
                        socket.write('CAP * LS :\r\n');
                    }
                    break;
                case 'MODE':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (params.length < 1) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} MODE :Not enough parameters\r\n`);
                        break;
                    }
                    channel = params[0];
                    var isChannel = true;
                    if (!this.channels.has(channel)) {
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
                        socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel or user\r\n`);
                        break;
                    }
                    const mode = params[1];
                    if (isUser) {
                        if (!this.isIRCOp(socket.nickname) && channel !== socket.nickname) {
                            socket.write(`:${this.servername} 501 ${socket.nickname} :Cannot set modes on other users\r\n`);
                        } else {

                            var usermodes = this.usermodes.get(socket.nickname) || [];
                            if (usermodes === true) {
                                usermodes = [];
                            }
                            if (!mode) { 
                                // List user modes
                                if (usermodes.length === 0) {
                                    socket.write(`:${this.servername} 324 ${socket.nickname} ${channel} :No modes set\r\n`);
                                } else {
                                    const modes = usermodes.map(m => (m.startsWith('+') ? m : '+' + m)).join(' ');
                                    socket.write(`:${this.servername} 324 ${socket.nickname} ${channel} :${modes}\r\n`);
                                }
                            } else if (mode.startsWith('+x')) {
                                this.usermodes.set(socket.nickname, [...usermodes, 'x']);
                                socket.host = this.filterHostname(socket, socket.realhost);
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +x\r\n`);
                                socket.write(`:${this.servername} 396 ${socket.nickname} ${socket.host} :is now your displayed host\r\n`);
                            } else if (mode.startsWith('-x')) {
                                this.usermodes.set(socket.nickname, (usermodes).filter(m => m !== 'x'));
                                socket.host = socket.realhost
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -x\r\n`);
                                socket.write(`:${this.servername} 396 ${socket.nickname} ${socket.host} :is now your displayed host\r\n`);
                            } else if (mode.startsWith('+w')) {
                                this.usermodes.set(socket.nickname, [...usermodes, 'w']);
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +w\r\n`);
                            } else if (mode.startsWith('-w')) {
                                this.usermodes.set(socket.nickname, (usermodes).filter(m => m !== 'w'));
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -w\r\n`);
                            } else if (mode.startsWith('+i')) {
                                this.usermodes.set(socket.nickname, [...usermodes, 'i']);
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +i\r\n`);
                            } else if (mode.startsWith('-i')) {
                                this.usermodes.set(socket.nickname, (usermodes).filter(m => m !== 'i'));
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -i\r\n`);
                            } else if (mode.startsWith('+s')) {
                                this.usermodes.set(socket.nickname, [...usermodes, 's']);
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +s\r\n`);
                            } else if (mode.startsWith('-s')) {
                                this.usermodes.set(socket.nickname, (usermodes).filter(m => m !== 's'));
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -s\r\n`);
                            } else if (mode.startsWith('+z') || mode.startsWith('-z')) {
                                socket.write(`:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :is set by the server and cannot be changed\r\n`);
                            } else if (mode.startsWith('+Z')) {
                                if (!socket.secure) {
                                    socket.write(`:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :You must be secure to set this mode\r\n`);
                                    break;
                                }
                                this.usermodes.set(socket.nickname, [...usermodes, 'Z']);
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +Z\r\n`);
                            } else if (mode.startsWith('-Z')) {
                                if (!socket.secure) {
                                    socket.write(`:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :You must be secure to set this mode\r\n`);
                                    break;
                                }
                                this.usermodes.set(socket.nickname, (usermodes).filter(m => m !== 'Z'));
                                socket.write(`:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} -Z\r\n`);
                            } else {
                                socket.write(`:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :is unknown mode char to me\r\n`);
                            }
                        }
                        break;
                    }
                    if (!mode) {
                        if (!socket.registered) {
                            socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                            break;
                        }
                        let validPrefix = this.channelprefixes.some(prefix => channel.startsWith(prefix));
                        if (!validPrefix) {
                            socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                            break;
                        }
                        if (!this.channels.has(channel)) {
                            socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                            break;
                        }
                        var chan_modes = this.channelmodes.get(channel);
                        if (!chan_modes || chan_modes === true) {
                            chan_modes = [];
                        }

                        chan_modes = chan_modes.map(mode => {
                            if (typeof mode === 'string' && !mode.startsWith('+')) {
                                return '+' + mode;
                            }
                            return mode;
                        });
                        chan_modes.forEach(m => {
                            socket.write(`:${this.servername} 324 ${socket.nickname} ${channel} ${m}\r\n`);
                        });
                        socket.write(`:${this.servername} 329 ${socket.nickname} ${channel} ${this.channeltimestamps.get(channel) || Date.now()}\r\n`);
                        break;
                    } else {
                        this.processChannelModeBatch(socket.nickname, channel, mode, params.slice(2));
                        break;
                    } 
                case 'NICK':
                    var new_nickname = params[0];
                    if (new_nickname.startsWith(':')) {
                        new_nickname = new_nickname.slice(1);
                    }
                    if (!new_nickname || new_nickname.length < 1) {
                        socket.write(`:${this.servername} 431 * :No nickname\r\n`);
                        break;
                    }
                    if (new_nickname.length > this.nicklen) {
                        socket.write(`:${this.servername} 432 * ${new_nickname} :Erroneus nickname\r\n`);
                        break;
                    }
                    var result = Array.from(this.nicknames.values()).find(nick => nick === new_nickname);
                    if (result) {
                        socket.write(`:${this.servername} 433 * ${new_nickname} :Nickname is already in use\r\n`);
                        break; 
                    }
                    for (const prefix of this.channelprefixes) {
                        if (new_nickname.startsWith(prefix)) {
                            socket.write(`:${this.servername} 432 * ${new_nickname} :Erroneus nickname\r\n`);
                            return;
                        }
                    }
                    for (let i = 0; i < new_nickname.length; i++) {
                        if (!this.allowed_characters.includes(new_nickname[i])) {
                            socket.write(`:${this.servername} 432 * ${new_nickname} :Erroneus nickname\r\n`);
                            return;
                        }
                    }
                    if (!socket.nickname) {
                        // If no nickname is set, set it now
                        socket.nickname = new_nickname;
                    }
                    this.nicknames.set(socket, socket.nickname);
                    if (socket.nickname && this.usernames.has(socket.nickname)) {
                        this.usernames.delete(socket.nickname);
                    }
                    this.usernames.set(socket.nickname, socket.username);
                    if (socket.nickname && socket.nickname !== new_nickname) {
                        socket.write(`:${socket.nickname}!${socket.username}@${socket.host} NICK :${new_nickname}\r\n`);
                        this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} NICK :${new_nickname}\r\n`, socket);
                        socket.nickname = new_nickname;
                        this.nicknames.set(socket, socket.nickname);
                        // Update nickname in all channels
                        for (const [ch, users] of this.channels.entries()) {
                            if (users.has(socket.nickname)) {
                                users.delete(socket.nickname);
                                users.add(new_nickname);
                            }
                        }
                        // Update away message mapping if present
                        if (this.awaymsgs.has(socket.nickname)) {
                            const msg = this.awaymsgs.get(socket.nickname);
                            this.awaymsgs.delete(socket.nickname);
                            this.awaymsgs.set(new_nickname, msg);
                        }
                        // Update user timestamp
                        if (this.usertimestamps.has(socket.nickname)) {
                            this.usertimestamps.delete(socket.nickname);
                        }
                        this.usertimestamps.set(new_nickname, Date.now());
                        if (this.usersignontimestamps.has(socket.nickname)) {
                            this.usersignontimestamps.delete(socket.nickname);
                        }
                        this.usersignontimestamps.set(new_nickname, socket.timestamp);
                    }
                    if (!socket.registered && socket.nickname && socket.username) {
                        socket.registered = true;
                        this.usertimestamps.set(socket.nickname, Date.now());
                        this.usersignontimestamps.set(new_nickname, socket.timestamp);
                        this.doLogin(socket.nickname, socket);
                    }
                    break;
                case 'USER':
                    socket.username = params[0];
                    if (!socket.registered && socket.nickname && socket.username) {
                        socket.registered = true;
                        this.usernames.set(socket.nickname, socket.username);
                        this.usertimestamps.set(socket.nickname, Date.now());
                        this.usersignontimestamps.set(socket.nickname, socket.timestamp);
                        this.doLogin(socket.nickname, socket);
                    }
                    break;
                case 'JOIN':
                    var key = null;
                    if (!socket.registered) {
                        socket.write(`:irc.local 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    channel = params[0];
                    if (params.length == 2) {
                        key = params[1];
                    }
                    for (let i = 0; i < channel.length; i++) {
                        if (i == 0 && !this.channelprefixes.includes(channel[i])) {
                            socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                            return;
                        } 
                        if (i == 0) {
                            continue;
                        }
                        if (!this.allowed_characters.includes(channel[i])) {
                            socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                            return;
                        }
                    }
                    if (channel.includes(',')) {
                        var channels = channel.split(',');
                    } else {
                        var channels = [channel];
                    }
                    for (const ch of channels) {
                        var joinLine = '';
                        if (key) {
                            joinLine = `JOIN ${ch} ${key}`;
                        } else {
                            joinLine = `JOIN ${ch}`;
                        }
                        // Simulate a JOIN command for each channel
                        if (this.getChannelCount(socket.nickname) >= this.channellimit) {
                            socket.write(`:${this.servername} 405 ${socket.nickname} ${ch} :Too many channels\r\n`);
                            continue; // Skip joining this channel
                        }                             
                        const [command, ...params] = joinLine.trim().split(' ');
                        var validChannel = false;
                        this.channelprefixes.forEach(prefix => {
                            if (ch.startsWith(prefix)) {
                                validChannel = true;
                            }
                        });
                        if (!validChannel) {
                            socket.write(`:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                            continue; // Skip this channel
                        }
                        if (ch.length < 2 || ch.length > this.channellen) {
                            socket.write(`:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                            continue; // Skip this channel
                        }
                        if (!this.channels.has(ch)) {
                            this.createChannel(ch, socket.nickname);
                        }
                        if (this.channelbans.has(ch)) {
                            if (this.isBanned(ch, socket)) {
                                socket.write(`:${this.servername} 474 ${socket.nickname} ${ch} :Cannot join channel (+b)\r\n`);
                                continue; // Skip joining this channel
                            }
                        }
                        if (this.channelmodes.has(ch)) {
                            const modes = this.channelmodes.get(ch);
                            if (!modes || modes === true) {
                                continue; // Skip if no modes are set
                            }
                            // Check if the user is in too many channels                       
                            const keyMode = modes.find(m => typeof m === 'string' && m.startsWith('k '));
                            if (keyMode) {
                                const channelKey = keyMode.split(' ')[1];
                                // The key must be provided as the second parameter in the JOIN command
                                // params[1] is the key for the first channel, params[2] for the second, etc.
                                // For simplicity, assume only one channel per JOIN or the key is always params[1]
                                const providedKey = params[1];
                                if (!providedKey || providedKey !== channelKey) {
                                    socket.write(`:${this.servername} 475 ${socket.nickname} ${ch} :Cannot join channel (+k)\r\n`);
                                    continue; // Skip joining this channel
                                }
                            }
                            if (this.channelmodes.has(ch) && this.channelmodes.get(ch).includes('i')) {
                                // Channel is invite-only (+i)
                                // For simplicity, let's assume you have an invited list per channel (not implemented yet)
                                // We'll use a Map: this.channelinvites = new Map(); // channel -> Set of invited nicks
                                if (!this.channelinvites) this.channelinvites = new Map();
                                const invited = this.channelinvites.get(ch) || new Set();                                        
                                let isInvited = false;
                                for (const inviteMask of invited) {
                                    isInvited = checkMask(inviteMask, socket);
                                    if (isInvited) {
                                        break; // Stop checking if we found a match
                                    }
                                }
                                if (!invited.has(socket.nickname) && !isInvited) {
                                    socket.write(`:${this.servername} 473 ${socket.nickname} ${ch} :Cannot join channel (+i)\r\n`);
                                    continue; // Skip joining this channel
                                }
                                if (!isInvited) {
                                    invited.delete(socket.nickname);
                                }
                                this.channelinvites.set(ch, invited);
                            }
                            if (this.channelmodes.has(ch) && this.channelmodes.get(ch).includes('z')) {
                                // Channel is restricted to users with a secure connection (+z)
                                if (!socket.secure) {
                                    socket.write(`:${this.servername} 474 ${socket.nickname} ${ch} :Cannot join channel (+z)\r\n`);
                                    continue; // Skip joining this channel
                                }
                            }
                        }
                        // Check if the channel user limit has been reached
                        if (this.channelmodes.has(ch) && this.channelmodes.get(ch).includes('l')) {
                            const limitMatch = this.channelmodes.get(ch).match(/l(\d+)/);
                            if (limitMatch) {
                                const limit = parseInt(limitMatch[1], 10);
                                if (this.channels.has(ch) && this.channels.get(ch).size >= limit) {
                                    socket.write(`:${this.servername} 471 ${socket.nickname} ${ch} :Cannot join channel (+l)\r\n`);
                                    continue; // Skip joining this channel
                                }
                            }
                        }
                        // If we reach here, the user can join the channel
                        // Reuse the JOIN logic for each channel
                        // Only run the code after $PLACEHOLDER$ for each channel
                        // (excluding the code before $PLACEHOLDER$ to avoid duplicate checks)
                        // You can refactor this logic into a helper if needed
                        this.usertimestamps.set(socket.nickname, Date.now());                            
                        socket.write(`:${socket.nickname}!${socket.username}@${socket.host} JOIN ${ch}\r\n`);
                        if (!this.channels.has(ch)) {
                            this.channels.set(ch, new Set());
                        }
                        this.channels.get(ch).add(socket.nickname);
                        if (!this.channelops.has(ch) || this.channelops.get(ch) === true) {
                            this.channelops.set(ch, new Set());
                            this.channelops.get(ch).add(socket.nickname);
                        }
                        this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} JOIN ${ch}\r\n`, socket);
                        if (this.channeltopics.has(ch)) {
                            const topic = this.channeltopics.get(ch);
                            socket.write(`:${this.servername} 332 ${socket.nickname} ${ch} :${topic}\r\n`);
                        } else {
                            socket.write(`:${this.servername} 331 ${socket.nickname} ${ch} :No topic is set\r\n`);
                        }
                        var users = this.getUsersInChannel(ch);
                        if (users.length > 0) {
                            socket.write(`:${this.servername} 353 ${socket.nickname} = ${ch} :${users.join(' ')}\r\n`);
                        }
                        socket.write(`:${this.servername} 366 ${socket.nickname} ${ch} :End of /NAMES list\r\n`);
                    }
                    break;
                case 'NAMES':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (params.length < 1) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} NAMES :Not enough parameters\r\n`);
                        break;
                    }
                    channel = params[0];
                    if (!this.channels.has(channel)) {
                        socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                        break;
                    }
                    var users = this.getUsersInChannel(channel);
                    if (users.length > 0) {
                        socket.write(`:${this.servername} 353 ${socket.nickname} = ${channel} :${users.join(' ')}\r\n`);
                    }
                    socket.write(`:${this.servername} 366 ${socket.nickname} ${channel} :End of /NAMES list\r\n`);
                    break;
                case 'PART':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    channel = params[0];
                    if (!this.channels.has(channel) || !this.channels.get(channel).has(socket.nickname)) {
                        socket.write(`:${this.servername} 442 ${socket.nickname} ${channel} :You're not on that channel\r\n`);
                        break;
                    }
                    this.usertimestamps.set(socket.nickname, Date.now());
                    if (params.length == 2) {
                        let reason = params.join(' ');
                        if (reason.startsWith(':')) {
                            reason = reason.slice(1);
                        }
                        socket.write(`:${socket.nickname}!${socket.username}@${socket.host} PART ${channel} :${reason}\r\n`);
                        this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel} :${reason}\r\n`, socket);
                    } else {
                        socket.write(`:${socket.nickname}!${socket.username}@${socket.host} PART ${channel}\r\n`);
                        this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel}\r\n`, socket);
                    }
                    if (this.channels.has(channel)) {
                        this.channels.get(channel).delete(socket.nickname);
                        if (this.channels.get(channel).size === 0) {
                            this.deleteChannel(channel);
                        }
                    }
                    break;
                case 'INVITE':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (params.length < 2) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} INVITE :Not enough parameters\r\n`);
                        break;
                    }
                    const invitee = params[0];
                    channel = params[1];
                    if (!this.channels.has(channel)) {
                        socket.write(`:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                        break;
                    }
                    if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                        socket.write(`:${this.servername} 482 ${socket.socket.nickname} ${channel} :You're not channel operator\r\n`);
                        break;
                    } else {
                        if (!this.channelops.get(channel).has(socket.nickname)) {
                            socket.write(`:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
                            break;
                        }
                    }
                    if (!this.nicknames.has(socket)) {
                        socket.write(`:${this.servername} 401 ${socket.nickname} ${invitee} :No such nick/channel\r\n`);
                        break;
                    }
                    const inviteeSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === invitee);
                    if (!inviteeSocket) {
                        socket.write(`:${this.servername} 401 ${socket.nickname} ${invitee} :No such nick/channel\r\n`);
                        break;
                    }
                    if (!this.channels.has(channel) || !this.channels.get(channel).has(invitee)) {
                        if (!this.channelinvites) this.channelinvites = new Map();
                        const invited = this.channelinvites.get(channel) || new Set();
                        invited.add(invitee);
                        this.channelinvites.set(channel, invited);
                        socket.write(`:${this.servername} 341 ${socket.socket.nickname} ${invitee} ${channel} :Invited to channel\r\n`);
                        inviteeSocket.write(`:${this.servername} 341 ${nickname} ${invitee} ${channel} :You have been invited to join ${channel}\r\n`);
                        break;
                    } else {
                        socket.write(`:${this.servername} 443 ${socket.nickname} ${invitee} ${channel} :${invitee} is already on that channel\r\n`);
                        break;
                    }
                case 'LIST':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    let channelsToList;
                    if (params.length > 0 && params[0]) {
                        channelsToList = params[0].split(',').filter(ch => ch.length > 0);
                    } else {
                        channelsToList = Array.from(this.channels.keys());
                    }
                    socket.write(`:${this.servername} 321 ${socket.nickname} :Channel :Users :Topic\r\n`);
                    for (const channel of channelsToList) {
                        if (!this.channelprefixes.some(prefix => channel.startsWith(prefix))) {
                            continue; // Skip invalid channel names
                        }
                        if (this.channelmodes.has(channel)) {
                            var modes = this.channelmodes.get(channel);
                            if (modes === true) {
                                modes = [];
                            }
                            if (modes.includes('p')) {
                                if (!this.channels.has(channel) || !this.channels.get(channel).has(socket.nickname)) {
                                    continue; // Skip if user is not in the channel
                                }
                            }
                            if (modes.includes('s')) {
                                if (!this.channels.has(channel) || !this.channels.get(channel).has(socket.nickname)) {
                                    continue; // Skip if user is not in the channel
                                }
                            }
                        }
                        const users = this.getUsersInChannel(channel);
                        const topic = this.channeltopics.get(channel) || 'No topic is set';
                        socket.write(`:${this.servername} 322 ${socket.nickname} ${channel} ${users.length} :${topic}\r\n`);
                    }
                    socket.write(`:${this.servername} 323 ${socket.nickname} :End of /LIST\r\n`);
                    break;
                case 'WHO':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (!params[0]) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} WHO :Not enough parameters\r\n`);
                        break;
                    }
                    const target = params[0];
                    if (target.startsWith('#')) {
                        // WHO for channel
                        if (this.channelmodes.has(target)) {
                            const modes = this.channelmodes.get(target);
                            if ((modes.includes('p') || modes.includes('s')) && (!this.channels.has(target) || !this.channels.get(target).has(socket.nickname))) {
                                socket.write(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                                break;
                            }
                        }
                        if (this.channels.has(target)) {
                            const users = this.getUsersInChannel(target);
                            for (const user of users) {
                                const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                                if (sock) {
                                    socket.write(`:${this.servername} 352 ${socket.nickname} * ${user} ${sock.host} ${this.servername} ${user} H :0 ${user}\r\n`);
                                }
                            }
                        }
                        socket.write(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                    } else {
                        // WHO for nickname
                        let found = false;
                        for (const [sock, nick] of this.nicknames.entries()) {
                            if (nick === target) {
                                found = true;
                                socket.write(`:${this.servername} 352 ${socket.nickname} * ${nick} ${sock.host} ${this.servername} ${nick} H :0 ${nick}\r\n`);
                                break;
                            }
                        }
                        if (!found) {
                            socket.write(`:${this.servername} 401 ${socket.nickname} ${target} :No such nick/channel\r\n`);
                        }                                    
                        socket.write(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                        break;
                    }
                    break;
                case 'PRIVMSG':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    this.usertimestamps.set(socket.nickname, Date.now());
                    if (params[0]) {
                        const target = params[0];
                        let targets = target.includes(',') ? target.split(',') : [target];
                        if (targets.length > this.maxtargets) {
                            socket.write(`:${this.servername} 407 ${socket.nickname} :Too many targets. Maximum allowed is ${this.maxtargets}\r\n`);
                            return;
                        }
                        for (const t of targets) {
                            let isChan = false;
                            for (const prefix of this.channelprefixes) {
                                if (t.startsWith(prefix)) {
                                    isChan = true;
                                    break;
                                }
                            }
                            if (isChan) {
                                // Channel message
                                if (this.channelmodes.has(t) && this.channelmodes.get(t).includes('m')) {
                                    // Channel is moderated (+m)
                                    var voices = this.channelvoices.get(t) || new Set();
                                    var ops = this.channelops.get(t) || new Set();
                                    if (voices === true) voices = new Set();
                                    if (ops === true) ops = new Set();
                                    if (!(voices.has(socket.nickname) || ops.has(socket.nickname))) {
                                        socket.write(`:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+m)\r\n`);
                                        continue;
                                    }
                                }
                                if (this.channelmodes.has(t) && this.channelmodes.get(t).includes('n')) {
                                    // Channel is no-external-messages (+n)
                                    if (!this.channels.has(t) || !this.channels.get(t).has(socket.nickname)) {
                                        socket.write(`:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+n)\r\n`);
                                        continue;
                                    }
                                }
                            }
                            const msg = line.slice(line.indexOf(':', 1) + 1);
                            if (isChan) {
                                if (!this.channels.has(t)) {
                                    socket.write(`:${this.servername} 403 ${socket.nickname} ${t} :No such channel\r\n`);
                                    continue;
                                }
                                this.broadcastChannel(t, `:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${t} :${msg}\r\n`, socket);
                            } else {
                                if (this.awaymsgs.has(t)) {
                                    socket.write(`:${this.servername} 301 ${socket.nickname} ${t} :${this.awaymsgs.get(t)}\r\n`);
                                }
                                var targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === t);
                                if (!targetSock) {
                                    socket.write(`:${this.servername} 401 ${socket.nickname} ${t} :No such nick/channel\r\n`);
                                    continue;
                                }
                                var targetUserModes = this.usermodes.get(t) || [];
                                if (targetUserModes.includes('Z') && !socket.secure) {
                                    socket.write(`:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to user (+Z)\r\n`);
                                    continue;
                                }
                                var usermodes = this.usermodes.get(socket.nickname);
                                if (!usermodes || usermodes === true) {
                                    usermodes = [];
                                }
                                if (usermodes.includes('Z') && !targetUserModes.includes('Z')) {
                                    socket.write(`:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to non-+Z user while you are +Z\r\n`);
                                    continue;
                                }
                                targetSock.write(`:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${t} :${msg}\r\n`);
                            }
                        }
                        return;
                    }
                    break;
                case 'NOTICE':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    this.usertimestamps.set(socket.nickname, Date.now());
                    if (params[0]) {
                        const target = params[0];
                        let targets = target.includes(',') ? target.split(',') : [target];
                        if (targets.length > this.maxtargets) {
                            socket.write(`:${this.servername} 407 ${socket.nickname} :Too many targets. Maximum allowed is ${this.maxtargets}\r\n`);
                            return;
                        }
                        for (const t of targets) {
                            let isChan = false;
                            for (const prefix of this.channelprefixes) {
                                if (t.startsWith(prefix)) {
                                    isChan = true;
                                    break;
                                }
                            }
                            if (isChan) {
                                // Channel notice
                                if (this.channelmodes.has(t) && this.channelmodes.get(t).includes('n')) {
                                    // Channel is no-external-messages (+n)
                                    if (!this.channels.has(t) || !this.channels.get(t).has(socket.nickname)) {
                                        socket.write(`:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+n)\r\n`);
                                        continue;
                                    }
                                }
                                if (!this.channels.has(t)) {
                                    socket.write(`:${this.servername} 403 ${socket.nickname} ${t} :No such channel\r\n`);
                                    continue;
                                }
                                this.broadcastChannel(t, `:${socket.nickname}!${socket.username}@${socket.host} NOTICE ${t} :${msg}\r\n`, socket);
                            } else {
                                // Assume it's a nick, check if it exists
                                var targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === t);
                                if (!targetSock) {
                                    socket.write(`:${this.servername} 401 ${socket.nickname} ${t} :No such nick/channel\r\n`);
                                    continue;
                                }
                                var targetUserModes = this.usermodes.get(t) || [];
                                if (targetUserModes.includes('Z') && !socket.secure) {
                                    socket.write(`:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to user (+Z)\r\n`);
                                    continue;
                                }
                                var usermodes = this.usermodes.get(socket.nickname);
                                if (!usermodes || usermodes === true) {
                                    usermodes = [];
                                }
                                if (usermodes.includes('Z') && !targetUserModes.includes('Z')) {
                                    socket.write(`:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to non-+Z user while you are +Z\r\n`);
                                    continue;
                                }
                                targetSock.write(`:${socket.nickname}!${socket.username}@${socket.host} NOTICE ${t} :${msg}\r\n`);
                            }
                        }
                        return;                   
                    }
                    break;
                case 'PING':
                    socket.write(`PONG ${params.join(' ')}\r\n`);
                    break;
                case 'WHOIS':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (params.length < 1) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} WHOIS :Not enough parameters\r\n`);
                        break;
                    }
                    const whoisNick = params[0];
                    const whoisSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === whoisNick);
                    if (whoisSocket) {
                        const whois_username = this.usernames.get(whoisNick);
                        socket.write(`:${this.servername} 311 ${socket.nickname} ${whoisNick} ${whois_username} ${this.filterHostname(whoisSocket, whoisSocket.realhost)} * ${whoisNick}\r\n`);
                        if (this.awaymsgs.has(whoisNick)) {
                            socket.write(`:${this.servername} 301 ${socket.nickname} ${whoisNick} :${this.awaymsgs.get(whoisNick)}\r\n`);
                        }
                        const userChannels = [];
                        for (const [ch, users] of this.channels.entries()) {
                            if (users.has(whoisNick)) {
                                let prefix = '';
                                var chanops = this.channelops.get(ch) || new Set();
                                var chanvoices = this.channelvoices.get(ch) || new Set();
                                const modes = this.channelmodes.get(ch) || [];
                                if ((modes.includes('p') || modes.includes('s')) && (!this.channels.has(ch) || !this.channels.get(ch).has(socket.nickname))) {
                                    continue; // Skip listing this channel if it's private/secret and user is not in it
                                }
                                if (chanops.has(whoisNick)) {
                                    prefix = '@';
                                } else if (chanvoices.has(whoisNick)) {
                                    prefix = '+';
                                }
                                userChannels.push(prefix + ch);
                            }
                        }
                        socket.write(`:${this.servername} 312 ${socket.nickname} ${whoisNick} ${this.servername} :minisrv-${this.minisrv_config.version}\r\n`);
                        if (this.isIRCOp(whoisNick)) {
                            socket.write(`:${this.servername} 313 ${socket.nickname} ${whoisNick} :is an IRC operator\r\n`);
                        }
                        usermodes = this.usermodes.get(whoisNick) || [];
                        if (usermodes && usermodes.includes('s')) {
                            socket.write(`:${this.servername} 671 ${socket.nickname} ${whoisNick} :is using a secure connection\r\n`);
                        }
                        var now = Date.now();
                        var userTimestamp = this.usertimestamps.get(whoisNick) || now;
                        var idleTime = Math.floor((now - userTimestamp) / 1000);
                        socket.write(`:${this.servername} 317 ${socket.nickname} ${whoisNick} ${idleTime} :seconds idle\r\n`);
                        if (userChannels.length > 0) {
                            socket.write(`:${this.servername} 319 ${socket.nickname} ${whoisNick} :${userChannels.join(' ')}\r\n`);
                        }
                        socket.write(`:${this.servername} 318 ${socket.nickname} ${whoisNick} :End of /WHOIS list\r\n`);
                    } else {
                        socket.write(`:${this.servername} 401 ${socket.nickname} ${whoisNick} :No such nick/channel\r\n`);
                    }
                    break;
                case 'KILL':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname)) {
                        socket.write(`:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        break;
                    }
                    if (params.length < 2) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} KILL :Not enough parameters\r\n`);
                        break;
                    }
                    const target_nick = params[0];
                    const killReason = params.slice(1).join(' ');
                    let cleanKillReason = killReason;
                    if (cleanKillReason.startsWith(':')) {
                        cleanKillReason = cleanKillReason.slice(1);
                    }
                    var targetSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === target_nick);
                    if (!targetSocket) {
                        socket.write(`:${this.servername} 401 ${socket.nickname} ${target_nick} :No such nick/channel\r\n`);
                        break;
                    }

                    // Broadcast the KILL message to all users
                    this.broadcastUser(target_nick, `:${socket.nickname}!${socket.username}@${socket.host} KILL ${target_nick} :${cleanKillReason}\r\n`);
                    this.terminateSession(targetSocket, true);
                    break;
                case 'QUIT':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                    } else {
                        if (params.length > 0) {
                            let reason = params.join(' ');
                            if (reason.startsWith(':')) {
                                reason = reason.slice(1);
                            }
                            socket.write(`:${socket.nickname}!${socket.username}@${socket.host} QUIT :${reason}\r\n`);
                            this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} QUIT :${reason}\r\n`, socket);
                        } else {
                            socket.write(`:${socket.nickname}!${socket.username}@${socket.host} QUIT\r\n`);
                            this.broadcastUser(socket.nickname, `:${socket.nickname}!${socket.username}@${socket.host} QUIT\r\n`, socket);
                        }
                    }
                    this.terminateSession(socket, true);
                    break;
                case 'MOTD':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    this.doMOTD(socket.nickname, socket);
                    break;
                case 'VERSION':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    socket.write(`:${this.servername} 351 ${socket.nickname} ${this.servername} minisrv ${this.minisrv_config.version} :minisrv IRC server\r\n`);
                    break;
                case 'WALLOPS':
                    if (!socket.registered) {
                        socket.write(`:${this.servername} 451 ${socket.nickname} :You have not registered\r\n`);
                        break;
                    }
                    if (!this.isIRCOp(socket.nickname)) {
                        socket.write(`:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        break;
                    }
                    if (params.length < 1) {
                        socket.write(`:${this.servername} 461 ${socket.nickname} WALLOPS :Not enough parameters\r\n`);
                        break;
                    }
                    var wallopsMessage = params.join(' ');
                    if (wallopsMessage.startsWith(':')) {
                        wallopsMessage = wallopsMessage.slice(1);
                    }
                    this.broadcastWallops(`:${socket.nickname}!${socket.username}@${socket.host} WALLOPS :${wallopsMessage}\r\n`);
                default:
                    // Ignore unknown commands
                    break;
            }
        }
    }

    deleteChannel(channel) {
        this.channels.delete(channel);
        this.channelops.delete(channel);
        this.channelvoices.delete(channel);
        this.channeltopics.delete(channel);
        this.channelbans.delete(channel);
        this.channelexemptions.delete(channel);
        this.channelinvites.delete(channel);
        this.channelmodes.delete(channel);
        this.channeltimestamps.delete(channel);
        if (this.debug) {
            console.log(`Channel ${channel} deleted`);
        }       
    }

    terminateSession(socket, close = false) {
        const nickname = this.nicknames.get(socket);
        if (nickname) {
            this.usertimestamps.delete(nickname);
            this.usersignontimestamps.delete(nickname);
            this.usernames.delete(nickname);
            this.usermodes.delete(nickname);
            this.awaymsgs.delete(nickname);            
            for (const [ch, ops] of this.channelops.entries()) {
                if (ops && ops !== true && ops.has(nickname)) {
                    ops.delete(nickname);
                }
            }
            for (const [ch, voices] of this.channelvoices.entries()) {
                if (voices && voices !== true && voices.has(nickname)) {
                    voices.delete(nickname);
                }
            }
            // Remove user from any pending invites
            for (const [ch, invites] of (this.channelinvites || new Map()).entries()) {
                if (invites && invites.has(nickname)) {
                    invites.delete(nickname);
                }
            }
            this.channels.forEach((users, ch) => {
                if (users.has(nickname)) {
                    users.delete(nickname);
                    if (users.size === 0) {
                        this.deleteChannel(ch);
                    }
                }
            });
            this.nicknames.delete(socket);
        }
        this.clients = this.clients.filter(c => c !== socket);
        if (close) {
            socket.end();
        }
    }

    sendWebTVNotice(message) {
        this.broadcast(`:${this.servername} NOTICE * :${message}\r\n`);
    }

    sendWebTVNoticeTo(username, message) {
        const socket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === username);
        if (socket) {
            socket.write(`:${this.servername} NOTICE * :${message}\r\n`);
        }
    }

    sendToChannelAs(username, channel, message) {
        const users = this.getUsersInChannel(channel);
        for (const user of users) {
            const socket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
            if (socket) {
                socket.write(`:${username}!${username}@${this.servername} PRIVMSG ${channel} :${message}\r\n`);
            }
        }
    }

    getChannelCount(username) {
        // returns the number of channels a user is in
        let count = 0;
        for (const [channel, users] of this.channels.entries()) {
            if (users.has(username)) {
                count++;
            }
        }
        return count;
    }

    getUsersInChannel(channel) {
        if (this.channels.has(channel)) {
            const ops = this.channelops.get(channel) || new Set();
            const voices = this.channelvoices.get(channel) || new Set();
            return Array.from(this.channels.get(channel)).map(user => {
                if (ops === true) return user;
                if (voices === true) return user;
                if (ops.has(user)) return '@' + user;
                if (voices.has(user)) return '+' + user;
                return user;
            });
        }
        return [];
    }

    broadcastUser(username, message, exceptSocket = null) {
        for (const [channel, users] of this.channels.entries()) {
            if (users.has(username)) {
                for (const user of users) {
                    const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                    if (sock && sock !== exceptSocket) {
                        sock.write(message);
                    }
                }
            }
        }
    }

    broadcastChannel(channel, message, exceptSocket = null) {
        if (this.channels.has(channel)) {
            const users = this.channels.get(channel);
            for (const user of users) {
                const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                if (sock && sock !== exceptSocket) {
                    sock.write(message);
                }
            }
        }
    }

    broadcastWallops(message) {
        for (const [socket, nickname] of this.nicknames.entries()) {
            const usermodes = this.usermodes.get(nickname) || [];
            if (usermodes.includes('w') || usermodes.includes('o')) {
                socket.write(message);
            }
        }
    }

    broadcast(message, exceptSocket = null) {
        for (const client of this.clients) {
            if (client !== exceptSocket) {
                client.write(message);
            }
        }
    }

    isIRCOp(nickname) {
        // Check if the user is an IRC operator
        if (!this.usermodes.has(nickname)) return false;
        const modes = this.usermodes.get(nickname);
        if (Array.isArray(modes)) {
            return modes.includes('o');
        }
        return false;
    }

    createChannel(channel, creator) {
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
            this.channelops.set(channel, new Set([creator]));
            this.channelvoices.set(channel, new Set());
            this.channeltopics.set(channel, 'No topic set');
            this.channelbans.set(channel, new Set());
            this.channelexemptions.set(channel, new Set());
            this.channelinvites.set(channel, new Set());
            this.channelmodes.set(channel, this.default_channel_modes.slice());
            this.channeltimestamps.set(channel, Math.floor(Date.now() / 1000));
        }
    }

    checkMask(mask, socket) {
        const username = this.nicknames.get(socket);
        if (!username) return false;
        console.log
        const userIdent = this.usernames.get(username) || username;
        const host = socket.host
        const realhost = socket.realhost
        const fullMask = `${username}!${userIdent}@${host}`;
        const fullMask2 = `${username}!${userIdent}@${realhost}`;

        // If mask does not contain '!', treat as nickname or username only
        if (!mask.includes('!')) {
            // Wildcard match for just the nickname or username
            // Try matching against both nickname and username
            const maskRegex = new RegExp('^' + mask.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
            return maskRegex.test(username) || maskRegex.test(userIdent);
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
        return matches;
    }

    getHostname(socket, callback) {
        if (socket && socket.remoteAddress) {
            try {
                dns.reverse(socket.remoteAddress, (err, hostnames) => {
                    if (!err && hostnames && hostnames.length > 0) {
                        callback(hostnames[0]);
                    } else if (this.debug) {
                        console.error(`DNS reverse lookup failed for ${socket.remoteAddress}:`, err);
                        callback(socket.remoteAddress);
                    }
                });
            } catch (e) {
                if (this.debug) {
                    console.error(`Error resolving hostname for ${socket.remoteAddress}:`, e);
                }
                callback(socket.remoteAddress);
            }
        }
    }

    filterHostname(socket, hostname) {
        const username = this.nicknames.get(socket);
        var modes = null;
        if (username) {
            modes = this.usermodes.get(username);
        }
        if (modes) {
            if (Array.isArray(modes) && modes.includes('x')) {
                // Masked hostname for +x users
                if (typeof hostname === 'string') {
                    // Mask everything except the first and last octet for IPv4
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
        const nickname = this.nicknames.get(socket);
        if (this.channelbans.has(channel)) {
            const bans = this.channelbans.get(channel);
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
        for (const [socket, nickname] of this.nicknames.entries()) {
            if (socket.uniqueId === uniqueId) {
                return socket;
            }
        }
        return null;
    }

    getSocketUniqueId(socket) {
        return socket.uniqueId;
    }

    // Enhanced MODE command: support multiple mode flags and parameters in a single command
    // Example: /mode #chan +mik password
    // This method parses and applies multiple channel mode changes in one call.
    processChannelModeBatch(nickname, channel, modeString, params) {
        const socket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === nickname);


        // Parse mode string and parameters
        let adding = true;
        let paramIndex = 0;
        let modeChanges = [];
        let modeFlags = modeString.replace(/^:/, '').split('');
        let paramModes = {
            'k': true, // key
            'l': true, // limit
            'b': true, // ban
            'e': true, // exception
            'I': true, // invite-exception
            'o': true, // op
            'v': true  // voice
        };
        for (let i = 0; i < modeFlags.length; i++) {
            let c = modeFlags[i];
            // If the mode is 'b', 'e', or 'I', allow it with or without a param
            if ((c === 'b' || c === 'e' || c === 'I') && paramIndex >= params.length) {
                this.processChannelModeCommand(nickname, channel, c, null);
                return;
            }
            if (c === '+') {
                adding = true;
            } else if (c === '-') {
                adding = false;
            } else {
                let param = null;
                if (paramModes[c]) {
                    // Only consume a param if available
                    if (paramIndex < params.length) {
                        param = params[paramIndex++];
                    }
                }
                modeChanges.push({ adding, mode: c, param });
            }
        }

        // Allow IRCop to set channel modes, or require channel operator
        if (
            !this.isIRCOp(nickname) &&
            (
            !this.channelops.has(channel) ||
            this.channelops.get(channel) === true ||
            !this.channelops.get(channel).has(nickname)
            )
        ) {
            socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
            return;
        }
        // Now apply each mode change
        for (const change of modeChanges) {
            let modeFlag = (change.adding ? '+' : '-') + change.mode;
            let modeParam = change.param ? [null, null, change.param] : [];
            // Use the existing single-mode handler for each
            this.processChannelModeCommand(nickname, channel, modeFlag, modeParam);
        }
    }

    processChannelModeCommand(nickname, channel, mode, params) {
        const socket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === nickname);
        const username = this.usernames.get(nickname);
        if (mode.startsWith('+m')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            if (!chan_modes.includes('m')) {
                this.channelmodes.set(channel, [...chan_modes, 'm']);
            }                                
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +m\r\n`);
            return;
        } else if (mode.startsWith('-m')) {
                          
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => m !== 'm'));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -m\r\n`);
            return;
        } else if (mode.startsWith("+I")) {
            if (params.length < 3) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            const inviteMask = params[2];
            if (!inviteMask) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            if (!this.inviteexceptions.has(channel)) {
                this.inviteexceptions.set(channel, new Set());
            }
            if (this.inviteexceptions.get(channel).length >= this.maxinvite) {
                socket.write(`:${this.servername} 478 ${nickname} ${channel} :Too many invite exceptions\r\n`);
                return;
            }            
            this.inviteexceptions.get(channel).add(inviteMask);
            socket.write(`:${this.servername} 346 ${nickname} ${channel} ${inviteMask}\r\n`);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +I ${inviteMask}\r\n`, socket);
            return;
        } else if (mode.startsWith("-I")) {
            if (params.length < 3) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            const inviteMask = params[2];
            if (!inviteMask) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            if (this.inviteexceptions.has(channel)) {
                this.inviteexceptions.get(channel).delete(inviteMask);
                socket.write(`:${this.servername} 347 ${nickname} ${channel} ${inviteMask}\r\n`);
                this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -I ${inviteMask}\r\n`, socket);
                return;
            } else {
                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                return;
            }                                
        } else if (mode.startsWith('+l')) {
                            
            if (params.length < 3) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            const limit = parseInt(params[2], 10);
            if (isNaN(limit) || limit < 0) {
                socket.write(`:${this.servername} 501 ${nickname} :Invalid channel limit\r\n`);
                return;
            }
            var chan_modes = this.channelmodes.get(channel);
                if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            // replace limit mode if it exists
            chan_modes = chan_modes.filter(m => !/^l\d+$/.test(m));
            this.channelmodes.set(channel, [...chan_modes, `l${limit}`]);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +l ${limit}\r\n`);
            return;
        } else if (mode.startsWith('-l')) {                            
            if (params.length < 2) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => !/^l\d+$/.test(m)));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -l\r\n`);
            return;
        } else if (mode.startsWith('+k')) {                            
            if (params.length < 3) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            const key = params[2];
            if (key.length < 1 || key.length > this.max_keylen) {
                socket.write(`:${this.servername} 501 ${nickname} :Invalid channel key\r\n`);
                return;
            }
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, [...chan_modes, `k ${key}`]);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +k ${key}\r\n`);
            return;
        } else if (mode.startsWith('-k')) {                            
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => !/^k.*$/.test(m)));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -k\r\n`);
            return;
        } else if (mode.startsWith('+i')) {                               
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, [...chan_modes, 'i']);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +i\r\n`);
            return;
        } else if (mode.startsWith('-i')) {                              
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => m !== 'i'));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -i\r\n`);
            return;
        } else if (mode.startsWith('+o')) {
            if (params.length < 3) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }                               
            const target_nickname = params[2];
            this.channelops.set(channel, (this.channelops.get(channel) || new Set()).add(target_nickname));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +o ${target_nickname}\r\n`);
            return;
        } else if (mode.startsWith('-o')) {
            if (params.length < 3) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }                                 
            const target_nickname = params[2];                                
            this.channelops.set(channel, (this.channelops.get(channel) || new Set()).delete(target_nickname));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -o ${target_nickname}\r\n`);
            return;
        } else if (mode.startsWith('+v')) {
            if (params.length < 3) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            const target_nickname = params[2];
            this.channelvoices.set(channel, (this.channelvoices.get(channel) || new Set()).add(target_nickname));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +v ${target_nickname}\r\n`);
            return;
        } else if (mode.startsWith('-v')) {
            if (params.length < 3) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }                                
            const target_nickname = params[2];
            this.channelvoices.set(channel, (this.channelvoices.get(channel) || new Set()).delete(target_nickname));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -v ${target_nickname}\r\n`, socket);
            return;
        } else if (mode.startsWith('+b')) {                                  
            const banMask = params[2];
            if (!banMask) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            if (!this.channelbans.has(channel)) {
                this.channelbans.set(channel, new Set());
            }
            if (this.channelbans.get(channel).length >= this.maxbans) {
                socket.write(`:${this.servername} 478 ${nickname} ${channel} :Channel ban list is full\r\n`);
                return;
            }            
            this.channelbans.get(channel).add(banMask);
            socket.write(`:${this.servername} 367 ${nickname} ${channel} ${banMask}\r\n`);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +b ${banMask}\r\n`, socket);
            return
        } else if (mode.startsWith('-b')) {                                
            const banMask = params[2];
            if (!banMask) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            if (this.channelbans.has(channel)) {
                this.channelbans.get(channel).delete(banMask);
                socket.write(`:${this.servername} 368 ${nickname} ${channel} ${banMask}\r\n`);
                this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -b ${banMask}\r\n`, socket);
                return
            } else {
                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                return
            }
        } else if (mode.startsWith('+e')) {
            const exemptMask = params[2];
            if (!exemptMask) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            if (!this.channelexemptions.has(channel)) {
                this.channelexemptions.set(channel, new Set());
            }
            if (this.channelexemptions.get(channel).size >= this.maxexemptions) {
                socket.write(`:${this.servername} 478 ${nickname} ${channel} :Channel exemption list is full\r\n`);
                return;
            }            
            this.channelexemptions.get(channel).add(exemptMask);
            socket.write(`:${this.servername} 347 ${nickname} ${channel} ${exemptMask}\r\n`);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +e ${exemptMask}\r\n`, socket);
            return;
        } else if (mode.startsWith('-e')) {
            const exemptMask = params[2];
            if (!exemptMask) {
                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                return;
            }
            if (this.channelexemptions.has(channel)) {
                this.channelexemptions.get(channel).delete(exemptMask);
                socket.write(`:${this.servername} 348 ${nickname} ${channel} ${exemptMask}\r\n`);
                this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -e ${exemptMask}\r\n`, socket);
                return;
            } else {
                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                return;
            }
        } else if (mode.startsWith("+n")) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, [...chan_modes, 'n']);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +n\r\n`);
            return;
        } else if (mode.startsWith("-n")) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => m !== 'n'));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -n\r\n`);
            return;
        } else if (mode.startsWith('+s')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, [...chan_modes, 's']);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +s\r\n`);
            return;
        } else if (mode.startsWith('-s')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => m !== 's'));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -s\r\n`);
            return;
        } else if (mode.startsWith('+p')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, [...chan_modes, 'p']);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +p\r\n`);
            return;
        } else if (mode.startsWith('-p')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => m !== 'p'));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -p\r\n`);
            return;
        } else if (mode.startsWith('+z')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            if (!socket.secure) {
                socket.write(`:${this.servername} 484 ${nickname} ${channel} :You must be connected via SSL/TLS to set +z\r\n`);
                return;
            }
            this.channelmodes.set(channel, [...chan_modes, 'z']);
            if (this.kick_insecure_on_z) {
                const usersInChannel = this.channels.get(channel) || new Set();
                for (const user of usersInChannel) {
                    const userSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                    if (userSocket && !userSocket.secure) {
                        userSocket.write(`:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${userSocket.nickname} :Channel is now +z (SSL-only)\r\n`);
                        this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${userSocket.nickname} :Channel is now +z (SSL-only)\r\n`, userSocket);
                        this.channels.get(channel).delete(user);
                    }
                }                
            }
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +z\r\n`);
            return;
        } else if (mode.startsWith('-z')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => m !== 'z'));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -z\r\n`);
            return;
        } else if (mode.startsWith('+t')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, [...chan_modes, 't']);
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} +t\r\n`);
            return;
        } else if (mode.startsWith('-t')) {
            var chan_modes = this.channelmodes.get(channel);
            if (!chan_modes || chan_modes === true) {
                chan_modes = [];
            }
            this.channelmodes.set(channel, (chan_modes).filter(m => m !== 't'));
            this.broadcastChannel(channel, `:${nickname}!${username}@${socket.host} MODE ${channel} -t\r\n`);
            return;
        } else if (mode === 'b') {
            if (this.channelbans.has(channel)) {
                const bans = Array.from(this.channelbans.get(channel));
                for (const ban of bans) {
                    socket.write(`:${this.servername} 367 ${nickname} ${channel} ${ban}\r\n`);
                }
            }
            socket.write(`:${this.servername} 368 ${nickname} ${channel} :End of channel ban list\r\n`);
            return;
        } else if (mode === 'e') {
            if (this.channelexemptions.has(channel)) {
                const exemptions = Array.from(this.channelexemptions.get(channel));
                for (const exemption of exemptions) {
                    socket.write(`:${this.servername} 348 ${nickname} ${channel} ${exemption}\r\n`);
                }
            }
            socket.write(`:${this.servername} 349 ${nickname} ${channel} :End of channel exception list\r\n`);
            return;
        } else if (mode === 'I') {
            if (this.channelinvites.has(channel)) {
                const invites = Array.from(this.channelinvites.get(channel));
                for (const invite of invites) {
                    socket.write(`:${this.servername} 336 ${nickname} ${channel} ${invite}\r\n`);
                }
            }
            socket.write(`:${this.servername} 337 ${nickname} ${channel} :End of channel invite list\r\n`);
            return;
        } else {
            socket.write(`:${this.servername} 472 ${nickname} ${mode} :is unknown mode char to me\r\n`);
            return;
        }
    }

    doMOTD(nickname, socket) {
        socket.write(`:${this.servername} 375 ${nickname} :- minisrv ${this.minisrv_config.version} Message of the Day\r\n`);
        socket.write(`:${this.servername} 372 ${nickname} :${this.irc_motd}\r\n`);
        socket.write(`:${this.servername} 376 ${nickname} :End of /MOTD command\r\n`);
    }

    doLogin(nickname, socket) {
        socket.write(`:${this.servername} 001 ${nickname} :Welcome to the IRC server, ${nickname}\r\n`);
        socket.write(`:${this.servername} 002 ${nickname} :Your host is ${this.servername}, running version minisrv ${this.minisrv_config.version}\r\n`);
        socket.write(`:${this.servername} 003 ${nickname} :This server is ready to accept commands\r\n`);
        socket.write(`:${this.servername} 004 ${nickname} ${this.servername} minisrv ${this.minisrv_config.version} oxizZws obtkmeZIlvn beIklov\r\n`);
        for (const caps of this.caps) {
            socket.write(`:${this.servername} 005 ${caps}\r\n`);
        }   
        socket.write(`:${this.servername} 042 ${nickname} ${socket.uniqueId} :your unique ID\r\n`);

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

        socket.write(`:${this.servername} 251 ${nickname} :There are ${visibleClients.length} visible users and ${invisibleClients.length} invisible users on this server\r\n`);
        socket.write(`:${this.servername} 252 ${nickname} ${operClients.length} :operator(s) online\r\n`);
        socket.write(`:${this.servername} 253 ${nickname} ${this.channels.size} :channels formed\r\n`);
        socket.write(`:${this.servername} 255 ${nickname} :I have ${this.clients.length} clients and 1 server\r\n`);
        socket.write(`:${this.servername} 265 ${nickname} :Current Local Users: ${this.clients.length}  Max: ${this.clientpeak}\r\n`);
        for (const mode of this.default_user_modes) {
            var usermodes = this.usermodes.get(nickname);
            if (!usermodes || usermodes === true) {
                usermodes = [];
            }
            if (!usermodes.includes(mode)) {
                usermodes.push(mode);
                this.usermodes.set(nickname, usermodes);
            }
        }
        if (socket.secure) {
            var usermodes = this.usermodes.get(nickname);
            if (!usermodes || usermodes === true) {
                usermodes = [];
            }
            usermodes.push('z');
            this.usermodes.set(nickname, usermodes);
        }
        socket.write(`:${this.servername} 221 ${nickname} :+${this.usermodes.get(nickname).join('')}\r\n`);
        this.getHostname(socket, (hostname) => {
            socket.host = this.filterHostname(socket, hostname);
            socket.realhost = hostname;
            socket.write(`:${this.servername} 396 ${nickname} ${socket.host} :is now your displayed host\r\n`);
        });        
    }
}

module.exports = WTVIRC;