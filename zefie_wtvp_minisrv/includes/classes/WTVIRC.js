const net = require('net');
const dns = require('dns');

class WTVIRC {
    /*
        * WTVIRC - A simple IRC server implementation for WebTV
        * Tested with WebTV and KvIRC
        * This is a basic implementation and does not cover all IRC features.
        * It supports basic commands like NICK, USER, JOIN, PART, PRIVMSG, NOTICE, TOPIC, AWAY, MODE, KICK, and PING.
        * TODO: Validate and fix (if needed) ALL existing functionality. Then maybe add more stuff.
        * TODO: Masks (ban, invite, exempt, etc.) are not properly functional yet.
    */ 
    constructor(minisrv_config, host = 'localhost', port = 6667, debug = false) {
        this.minisrv_config = minisrv_config;
        this.version = 
        this.host = host;
        this.port = port;
        this.debug = debug;
        this.server = null;
        this.clients = [];
        this.usernames = new Map(); // nickname -> username
        this.channels = new Map();
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
        this.nicklen = 30;
        this.maxbans = 100;
        this.maxlimit = 50;
        this.maxexcept = 100;
        this.maxinvite = 100;
        this.maxkeylen = 50;
        this.channellimit = 50;
        this.topiclen = 390;
        this.kicklen = 390;
        this.awaylen = 200;
        this.channelprefixes = ['#','&'];
        this.default_channel_modes = ['n','t'];
        this.servername = 'irc.local';
        this.server_start_time = Date.now();
        this.allowed_characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_[]{}\\|^-';
        this.oper_username = minisrv_config.config.irc_oper_username || 'minisrv';
        this.oper_password = minisrv_config.config.irc_oper_password || 'changeme573';
        this.caps = `AWAYLEN=${this.awaylen} CHANTYPES=${this.channelprefixes.join('')} PREFIX=(ov)@+ USERMODES=ohiws CHANMODES=beI,k,l,itmnp MAXLIST=b:${this.maxbans},e:${this.maxexcept},i:${this.maxinvite},k:${this.maxkeylen},l:${this.maxlimit} CHANLIMIT=${this.channelprefixes.join('')}:${this.channellimit} NICKLEN=${this.nicklen} TOPICLEN=${this.topiclen} KICKLEN=${this.kicklen}`;
    }

    start() {
        this.server_start_time = Date.now();
        this.server = net.createServer(socket => {
            socket.setEncoding('utf8');
            this.clients.push(socket);

            let registered = false;
            let nickname = '';
            let username = '';
            let channel = '';
            let host = this.getHostname(socket);
            let timestamp = Date.now();

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

            socket.write(`:${this.servername} NOTICE AUTH :Welcome to minisrv IRC Server\r\n`);

            socket.on('data', data => {
                const lines = data.split(/\r\n|\n/).filter(Boolean);
                for (let line of lines) {
                    if (this.debug) {
                        console.log(`> ${line}`);
                    }
                    const [command, ...params] = line.trim().split(' ');
                    switch (command.toUpperCase()) {
                        case 'OPER':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params.length < 2) {
                                socket.write(`:${this.servername} 461 ${nickname} OPER :Not enough parameters\r\n`);
                                break;
                            }
                            const [operName, operPassword] = params;
                            if (operName !== this.oper_username) {
                                socket.write(`:${this.servername} 491 ${nickname} :No permission\r\n`);
                                break;
                            }
                            if (operPassword !== this.oper_password) {
                                socket.write(`:${this.servername} 464 ${nickname} :Password incorrect\r\n`);
                                break;
                            }
                            var usermodes = this.usermodes.get(nickname) || [];
                            if (usermodes === true) {
                                usermodes = [];
                            }
                            this.usermodes.set(nickname, [...usermodes, 'o']);
                            socket.write(`:${this.servername} 381 ${nickname} :You are now an IRC operator\r\n`);
                            socket.write(`:${nickname}!${username}@${host} MODE ${nickname} +o\r\n`);
                            break;
                        case 'UPTIME':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            const uptime = Math.floor((Date.now() - this.server_start_time) / 1000);
                            const days = Math.floor(uptime / 86400);
                            const hours = Math.floor((uptime % 86400) / 3600);
                            const minutes = Math.floor((uptime % 3600) / 60);
                            const seconds = uptime % 60;
                            socket.write(`:${this.servername} 242 ${nickname} :Server uptime is ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds\r\n`);
                            break;
                        case 'KICK':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params.length < 2) {
                                socket.write(`:${this.servername} 461 ${nickname} KICK :Not enough parameters\r\n`);
                                break;
                            }
                            this.usertimestamps.set(nickname, Date.now());
                            channel = params[0];
                            const targetNick = params[1];
                            if (!this.channels.has(channel)) {
                                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                break;
                            }
                            if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                break;
                            } else {
                                if (!this.channelops.get(channel).has(nickname)) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                }
                            }                            
                            if (!this.channels.get(channel).has(targetNick)) {
                                socket.write(`:${this.servername} 441 ${nickname} ${targetNick} :They aren't on that channel\r\n`);
                                break;
                            }
                            this.channels.get(channel).delete(targetNick);
                            socket.write(`:${nickname}!${username}@${host} KICK ${channel} ${targetNick}\r\n`);
                            this.broadcastUser(nickname, `:${nickname}!${username}@${host} KICK ${channel} ${targetNick}\r\n`, socket);
                            break;
                        case 'TOPIC':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params.length < 1) {
                                socket.write(`:${this.servername} 461 ${nickname} TOPIC :Not enough parameters\r\n`);
                                break;
                            }
                            const chanmodes = this.channelmodes.get(channel) || [];
                            if (chanmodes.includes('t')) {
                                // Only allow channel operators to change the topic if +t is set
                                if (!this.channelops.has(channel) || !this.channelops.get(channel).has(nickname)) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                }
                            }
                            this.usertimestamps.set(nickname, Date.now());
                            channel = params[0];                            
                            if (!this.channels.has(channel)) {
                                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                break;
                            }                        
                            if (params.length > 1) {
                                var topic = params.slice(1).join(' ');
                                if (topic.startsWith(':')) {
                                    topic = topic.slice(1);
                                }
                                this.channeltopics.set(channel, topic);
                                socket.write(`:${this.servername} 332 ${nickname} ${channel} :${topic}\r\n`);
                                this.broadcastUser(nickname, `:${nickname}!${username}@${host} TOPIC ${channel} :${topic}\r\n`, socket);
                            } else {
                                const topic = this.channeltopics.get(channel) || 'No topic set';
                                socket.write(`:${this.servername} 331 ${nickname} ${channel} :${topic}\r\n`);
                            }
                            break;
                        case "AWAY":
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            this.usertimestamps.set(nickname, Date.now());
                            if (params.length > 0) {
                                socket.write(`:${this.servername} 301 ${nickname} :You are now marked as away\r\n`);
                                let awayMsg = params.join(' ');
                                if (awayMsg.startsWith(':')) {
                                    awayMsg = awayMsg.slice(1);
                                }
                                this.awaymsgs.set(nickname, awayMsg);
                            } else {
                                socket.write(`:${this.servername} 305 ${nickname} :You are no longer marked as away\r\n`);
                                this.awaymsgs.delete(nickname);
                            }
                            break;
                        case 'CAP':
                            // Minimal CAP support: just acknowledge LS
                            if (params[0] && params[0].toUpperCase() === 'LS') {
                                socket.write('CAP * LS :\r\n');
                            }
                            break;
                        case 'MODE':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params.length < 1) {
                                socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
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
                                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel or user\r\n`);
                                break;
                            }
                            const mode = params[1];
                            if (isUser) {
                                if (!this.isIRCOp(nickname) && channel !== nickname) {
                                    socket.write(`:${this.servername} 501 ${nickname} :Cannot set modes on other users\r\n`);
                                } else {
                                    
                                    var usermodes = this.usermodes.get(nickname) || [];
                                    if (usermodes === true) {
                                        usermodes = [];
                                    }
                                    if (!mode) { 
                                        // List user modes
                                        if (usermodes.length === 0) {
                                            socket.write(`:${this.servername} 324 ${nickname} ${channel} :No modes set\r\n`);
                                        } else {
                                            const modes = usermodes.map(m => (m.startsWith('+') ? m : '+' + m)).join(' ');
                                            socket.write(`:${this.servername} 324 ${nickname} ${channel} :${modes}\r\n`);
                                        }
                                    } else if (mode.startsWith('+h')) {
                                        this.usermodes.set(nickname, [...usermodes, 'h']);
                                        host = this.getHostname(socket);
                                        socket.write(`:${nickname}!${username}@${host} MODE ${nickname} +h\r\n`);
                                    } else if (mode.startsWith('-h')) {
                                        this.usermodes.set(nickname, (usermodes).filter(m => m !== 'h'));
                                        host = this.getHostname(socket);
                                        socket.write(`:${nickname}!${username}@${host} MODE ${nickname} -h\r\n`);
                                    } else if (mode.startsWith('+w')) {
                                        this.usermodes.set(nickname, [...usermodes, 'w']);
                                        socket.write(`:${nickname}!${username}@${host} MODE ${nickname} +w\r\n`);
                                    } else if (mode.startsWith('-w')) {
                                        this.usermodes.set(nickname, (usermodes).filter(m => m !== 'w'));
                                        socket.write(`:${nickname}!${username}@${host} MODE ${nickname} -w\r\n`);
                                    } else if (mode.startsWith('+i')) {
                                        this.usermodes.set(nickname, [...usermodes, 'i']);
                                        socket.write(`:${nickname}!${username}@${host} MODE ${nickname} +i\r\n`);
                                    } else if (mode.startsWith('-i')) {
                                        this.usermodes.set(nickname, (usermodes).filter(m => m !== 'i'));
                                        socket.write(`:${nickname}!${username}@${host} MODE ${nickname} -i\r\n`);
                                    }
                                }
                                break;
                            }
                            if (!mode) {
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
                                    socket.write(`:${this.servername} 324 ${nickname} ${channel} ${m}\r\n`);
                                });
                                break;
                            } else if (mode.startsWith('+m')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                if (!chan_modes.includes('m')) {
                                    this.channelmodes.set(channel, [...chan_modes, 'm']);
                                }                                
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +m\r\n`);
                                break;
                            } else if (mode.startsWith('-m')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, (chan_modes).filter(m => m !== 'm'));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -m\r\n`);
                                break;
                            } else if (mode.startsWith("+I")) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                const inviteMask = params[2];
                                if (!inviteMask) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (!this.inviteexceptions.has(channel)) {
                                    this.inviteexceptions.set(channel, new Set());
                                }
                                this.inviteexceptions.get(channel).add(inviteMask);
                                socket.write(`:${this.servername} 346 ${nickname} ${channel} ${inviteMask}\r\n`);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +I ${inviteMask}\r\n`, socket);
                                break;
                            } else if (mode.startsWith("-I")) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                const inviteMask = params[2];
                                if (!inviteMask) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (this.inviteexceptions.has(channel)) {
                                    this.inviteexceptions.get(channel).delete(inviteMask);
                                    socket.write(`:${this.servername} 347 ${nickname} ${channel} ${inviteMask}\r\n`);
                                    this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -I ${inviteMask}\r\n`, socket);
                                    break;
                                } else {
                                    socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                    break;
                                }                                
                            } else if (mode.startsWith('+l')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                const limit = parseInt(params[2], 10);
                                if (isNaN(limit) || limit < 0) {
                                    socket.write(`:${this.servername} 501 ${nickname} :Invalid channel limit\r\n`);
                                    break;
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                    if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                // replace limit mode if it exists
                                chan_modes = chan_modes.filter(m => !/^l\d+$/.test(m));
                                this.channelmodes.set(channel, [...chan_modes, `l${limit}`]);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +l ${limit}\r\n`);
                                break;
                            } else if (mode.startsWith('-l')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                
                                if (params.length < 2) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, (chan_modes).filter(m => !/^l\d+$/.test(m)));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -l\r\n`);
                                break;
                            } else if (mode.startsWith('+k')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                const key = params[2];
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, [...chan_modes, `k ${key}`]);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +k ${key}\r\n`);
                                break;
                            } else if (mode.startsWith('-k')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                
                                if (params.length < 2) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, (chan_modes).filter(m => !/^k.*$/.test(m)));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -k\r\n`);
                                break;
                            } else if (mode.startsWith('+i')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, [...chan_modes, 'i']);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +i\r\n`);
                                break;
                            } else if (mode.startsWith('-i')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, (chanmodes).filter(m => m !== 'i'));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -i\r\n`);
                                break;
                            } else if (mode.startsWith('+o')) {
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                 
                                const target_nickname = params[2];
                                this.channelops.set(channel, (this.channelops.get(channel) || new Set()).add(target_nickname));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +o ${target_nickname}\r\n`);
                                break;
                            } else if (mode.startsWith('-o')) {
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                    
                                const target_nickname = params[2];                                
                                this.channelops.set(channel, (this.channelops.get(channel) || new Set()).delete(target_nickname));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -o ${target_nickname}\r\n`);
                                break;
                            } else if (mode.startsWith('+v')) {
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                const target_nickname = params[2];
                                this.channelvoices.set(channel, (this.channelvoices.get(channel) || new Set()).add(target_nickname));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +v ${target_nickname}\r\n`);
                                break;
                            } else if (mode.startsWith('-v')) {
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                   
                                const target_nickname = params[2];
                                this.channelvoices.set(channel, (this.channelvoices.get(channel) || new Set()).delete(target_nickname));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -v ${target_nickname}\r\n`, socket);
                                break;
                            } else if (mode.startsWith('+b')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                    
                                const banMask = params[2];
                                if (!banMask) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (!this.channelbans.has(channel)) {
                                    this.channelbans.set(channel, new Set());
                                }
                                this.channelbans.get(channel).add(banMask);
                                socket.write(`:${this.servername} 367 ${nickname} ${channel} ${banMask}\r\n`);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +b ${banMask}\r\n`, socket);
                                break
                            } else if (mode.startsWith('-b')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                 
                                const banMask = params[2];
                                if (!banMask) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (this.channelbans.has(channel)) {
                                    this.channelbans.get(channel).delete(banMask);
                                    socket.write(`:${this.servername} 368 ${nickname} ${channel} ${banMask}\r\n`);
                                    this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -b ${banMask}\r\n`, socket);
                                    break
                                } else {
                                    socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                    break
                                }
                            } else if (mode.startsWith('+e')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                const exemptMask = params[2];
                                if (!exemptMask) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (!this.channelexemptions.has(channel)) {
                                    this.channelexemptions.set(channel, new Set());
                                }
                                this.channelexemptions.get(channel).add(exemptMask);
                                socket.write(`:${this.servername} 347 ${nickname} ${channel} ${exemptMask}\r\n`);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +e ${exemptMask}\r\n`, socket);
                                break;
                            } else if (mode.startsWith('-e')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                const exemptMask = params[2];
                                if (!exemptMask) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                if (this.channelexemptions.has(channel)) {
                                    this.channelexemptions.get(channel).delete(exemptMask);
                                    socket.write(`:${this.servername} 348 ${nickname} ${channel} ${exemptMask}\r\n`);
                                    this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -e ${exemptMask}\r\n`, socket);
                                    break;
                                } else {
                                    socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                    break;
                                }
                            } else if (mode.startsWith("+n")) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, [...chan_modes, 'n']);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +n\r\n`);
                                break;
                            } else if (mode.startsWith("-n")) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, (chan_modes).filter(m => m !== 'n'));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -n\r\n`);
                                break;
                            } else if (mode.startsWith('+s')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, [...chan_modes, 's']);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +s\r\n`);
                                break;
                            } else if (mode.startsWith('-s')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, (chan_modes).filter(m => m !== 's'));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -s\r\n`);
                                break;
                            } else if (mode.startsWith('+p')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, [...chan_modes, 'p']);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +p\r\n`);
                                break;
                            } else if (mode.startsWith('-p')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, (chan_modes).filter(m => m !== 'p'));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -p\r\n`);
                                break;
                            } else if (mode.startsWith('+t')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, [...chan_modes, 't']);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} +t\r\n`);
                                break;
                            } else if (mode.startsWith('-t')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }
                                var chan_modes = this.channelmodes.get(channel);
                                if (!chan_modes || chan_modes === true) {
                                    chan_modes = [];
                                }
                                this.channelmodes.set(channel, (chan_modes).filter(m => m !== 't'));
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} MODE ${channel} -t\r\n`);
                                break;
                            } else if (mode === 'b') {
                                if (this.channelbans.has(channel)) {
                                    const bans = Array.from(this.channelbans.get(channel));
                                    for (const ban of bans) {
                                        socket.write(`:${this.servername} 367 ${nickname} ${channel} ${ban}\r\n`);
                                    }
                                }
                                socket.write(`:${this.servername} 368 ${nickname} ${channel} :End of channel ban list\r\n`);
                                break;
                            } else {
                                socket.write(`:${this.servername} 501 ${nickname} :Unknown MODE flag\r\n`);
                                break;
                            }
                        case 'NICK':
                            var new_nickname = params[0];
                            if (!new_nickname || new_nickname.length < 1) {
                                socket.write(`:${this.servername} 431 * :No nickname\r\n`);
                                break;
                            }
                            if (new_nickname.length > 30) {
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
                            if (!nickname) {
                                // If no nickname is set, set it now
                                nickname = new_nickname;
                            }
                            this.nicknames.set(socket, nickname);
                            if (nickname && this.usernames.has(nickname)) {
                                this.usernames.delete(nickname);
                            }
                            this.usernames.set(nickname, username);
                            if (nickname && nickname !== new_nickname) {
                                socket.write(`:${nickname}!${username}@${host} NICK :${new_nickname}\r\n`);
                                this.broadcastUser(nickname, `:${nickname}!${username}@${host} NICK :${new_nickname}\r\n`, socket);
                                nickname = new_nickname;
                                this.nicknames.set(socket, nickname);
                                // Update nickname in all channels
                                for (const [ch, users] of this.channels.entries()) {
                                    if (users.has(nickname)) {
                                        users.delete(nickname);
                                        users.add(new_nickname);
                                    }
                                }
                                // Update away message mapping if present
                                if (this.awaymsgs.has(nickname)) {
                                    const msg = this.awaymsgs.get(nickname);
                                    this.awaymsgs.delete(nickname);
                                    this.awaymsgs.set(new_nickname, msg);
                                }
                                // Update user timestamp
                                if (this.usertimestamps.has(nickname)) {
                                    this.usertimestamps.delete(nickname);
                                }
                                this.usertimestamps.set(new_nickname, Date.now());
                                if (this.usersignontimestamps.has(nickname)) {
                                    this.usersignontimestamps.delete(nickname);
                                }
                                this.usersignontimestamps.set(new_nickname, timestamp);
                            }
                            if (!registered && nickname && username) {
                                registered = true;
                                this.usertimestamps.set(nickname, Date.now());
                                this.usersignontimestamps.set(new_nickname, timestamp);
                                this.doLogin(nickname, socket);
                            }                            
                            break;
                        case 'USER':
                            username = params[0];                      
                            if (!registered && nickname && username) {
                                registered = true;
                                this.usernames.set(nickname, username);
                                this.usertimestamps.set(nickname, Date.now());
                                this.usersignontimestamps.set(new_nickname, timestamp);
                                this.doLogin(nickname, socket);
                            }
                            break;
                        case 'JOIN':
                            var key = null;
                            if (!registered) {
                                socket.write(`:irc.local 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            channel = params[0];
                            if (params.length == 2) {
                                key = params[1];
                            }
                            for (let i = 0; i < channel.length; i++) {
                                if (i == 0 && !this.channelprefixes.includes(channel[i])) {
                                    socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                    return;
                                } 
                                if (i == 0) {
                                    continue;
                                }
                                if (!this.allowed_characters.includes(channel[i])) {
                                    socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
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
                                const [command, ...params] = joinLine.trim().split(' ');
                                var validChannel = false;
                                this.channelprefixes.forEach(prefix => {
                                    if (ch.startsWith(prefix)) {
                                        validChannel = true;
                                    }
                                });
                                if (!validChannel) {
                                    socket.write(`:${this.servername} 403 ${nickname} ${ch} :No such channel\r\n`);
                                    continue; // Skip this channel
                                }
                                if (!this.channels.has(ch)) {
                                    this.createChannel(ch, nickname);
                                }
                                if (this.channelbans.has(ch)) {
                                    if (this.isBanned(nickname, ch)) {
                                        socket.write(`:${this.servername} 474 ${nickname} ${ch} :Cannot join channel (+b)\r\n`);
                                        continue; // Skip joining this channel
                                    }
                                }
                                if (this.channelmodes.has(ch)) {
                                    const modes = this.channelmodes.get(ch);
                                    if (!modes || modes === true) {
                                        continue; // Skip if no modes are set
                                    }
                                    const keyMode = modes.find(m => typeof m === 'string' && m.startsWith('k '));
                                    if (keyMode) {
                                        const channelKey = keyMode.split(' ')[1];
                                        // The key must be provided as the second parameter in the JOIN command
                                        // params[1] is the key for the first channel, params[2] for the second, etc.
                                        // For simplicity, assume only one channel per JOIN or the key is always params[1]
                                        const providedKey = params[1];
                                        if (!providedKey || providedKey !== channelKey) {
                                            socket.write(`:${this.servername} 475 ${nickname} ${ch} :Cannot join channel (+k)\r\n`);
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
                                            // inviteMask can be nick!user@host or wildcards
                                            const maskParts = inviteMask.split(/[!@]/);
                                            const nickPart = maskParts[0] || '*';
                                            const userPart = maskParts[1] || '*';
                                            const hostPart = maskParts[2] || '*';
                                            // Build user mask for this user
                                            const userMask = `${nickname}!${username}@${host}`;
                                            // Convert mask to regex
                                            const maskRegex = new RegExp('^' +
                                                inviteMask
                                                    .replace(/\./g, '\\.')
                                                    .replace(/\*/g, '.*')
                                                    .replace(/\?/g, '.') +
                                                '$');
                                            if (maskRegex.test(userMask)) {
                                                isInvited = true;
                                                break;
                                            }
                                        }
                                        if (!invited.has(nickname) && !isInvited) {
                                            socket.write(`:${this.servername} 473 ${nickname} ${ch} :Cannot join channel (+i)\r\n`);
                                            continue; // Skip joining this channel
                                        }
                                        if (!isInvited) {
                                            invited.delete(nickname);
                                        }
                                        this.channelinvites.set(ch, invited);
                                    }
                                }
                                // Check if the user is in too many channels
                                if (this.getChannelCount(nickname) >= this.channellimit) {
                                    socket.write(`:${this.servername} 405 ${nickname} ${ch} :Too many channels\r\n`);
                                    continue; // Skip joining this channel
                                }
                                // Check if the channel user limit has been reached
                                if (this.channelmodes.has(ch) && this.channelmodes.get(ch).includes('l')) {
                                    const limitMatch = this.channelmodes.get(ch).match(/l(\d+)/);
                                    if (limitMatch) {
                                        const limit = parseInt(limitMatch[1], 10);
                                        if (this.channels.has(ch) && this.channels.get(ch).size >= limit) {
                                            socket.write(`:${this.servername} 471 ${nickname} ${ch} :Cannot join channel (+l)\r\n`);
                                            continue; // Skip joining this channel
                                        }
                                    }
                                }
                                // If we reach here, the user can join the channel
                                // Reuse the JOIN logic for each channel
                                // Only run the code after $PLACEHOLDER$ for each channel
                                // (excluding the code before $PLACEHOLDER$ to avoid duplicate checks)
                                // You can refactor this logic into a helper if needed
                                this.usertimestamps.set(nickname, Date.now());                            
                                socket.write(`:${nickname}!${username}@${host} JOIN ${ch}\r\n`);
                                if (!this.channels.has(ch)) {
                                    this.channels.set(ch, new Set());
                                }
                                this.channels.get(ch).add(nickname);
                                if (!this.channelops.has(ch) || this.channelops.get(ch) === true) {
                                    this.channelops.set(ch, new Set());
                                    this.channelops.get(ch).add(nickname);
                                }                                
                                this.broadcastUser(nickname, `:${nickname}!${username}@${host} JOIN ${ch}\r\n`, socket);
                                if (this.channeltopics.has(ch)) {
                                    const topic = this.channeltopics.get(ch);
                                    socket.write(`:${this.servername} 332 ${nickname} ${ch} :${topic}\r\n`);
                                } else {
                                    socket.write(`:${this.servername} 331 ${nickname} ${ch} :No topic is set\r\n`);
                                }                               
                                var users = this.getUsersInChannel(ch);
                                if (users.length > 0) {
                                    socket.write(`:${this.servername} 353 ${nickname} = ${ch} :${users.join(' ')}\r\n`);
                                }
                                socket.write(`:${this.servername} 366 ${nickname} ${ch} :End of /NAMES list\r\n`);
                            }
                            break;
                        case 'NAMES':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params.length < 1) {
                                socket.write(`:${this.servername} 461 ${nickname} NAMES :Not enough parameters\r\n`);
                                break;
                            }
                            channel = params[0];
                            if (!this.channels.has(channel)) {
                                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                break;
                            }
                            var users = this.getUsersInChannel(channel);
                            if (users.length > 0) {
                                socket.write(`:${this.servername} 353 ${nickname} = ${channel} :${users.join(' ')}\r\n`);
                            }
                            socket.write(`:${this.servername} 366 ${nickname} ${channel} :End of /NAMES list\r\n`);
                            break;
                        case 'PART':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            channel = params[0];
                            if (!this.channels.has(channel) || !this.channels.get(channel).has(nickname)) {
                                socket.write(`:${this.servername} 442 ${nickname} ${channel} :You're not on that channel\r\n`);
                                break;
                            }
                            this.usertimestamps.set(nickname, Date.now());
                            if (params.length == 2) {
                                let reason = params.join(' ');
                                if (reason.startsWith(':')) {
                                    reason = reason.slice(1);
                                }
                                socket.write(`:${nickname}!${username}@${host} PART ${channel} :${reason}\r\n`);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} PART ${channel} :${reason}\r\n`, socket);
                            } else {
                                socket.write(`:${nickname}!${username}@${host} PART ${channel}\r\n`);
                                this.broadcastChannel(channel, `:${nickname}!${username}@${host} PART ${channel}\r\n`, socket);
                            }
                            if (this.channels.has(channel)) {
                                this.channels.get(channel).delete(nickname);
                                if (this.channels.get(channel).size === 0) {
                                    this.channels.delete(channel);
                                    this.channelops.delete(channel);
                                    this.channelvoices.delete(channel);
                                    this.channeltopics.delete(channel);
                                    this.channelbans.delete(channel);
                                    this.channelexemptions.delete(channel);
                                    this.channelinvites.delete(channel);
                                    this.channelmodes.delete(channel);
                                }
                            }
                            break;
                        case 'INVITE':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params.length < 2) {
                                socket.write(`:${this.servername} 461 ${nickname} INVITE :Not enough parameters\r\n`);
                                break;
                            }
                            const invitee = params[0];
                            channel = params[1];
                            if (!this.channels.has(channel)) {
                                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                break;
                            }
                            if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                break;
                            } else {
                                if (!this.channelops.get(channel).has(nickname)) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                }
                            }
                            if (!this.nicknames.has(socket)) {
                                socket.write(`:${this.servername} 401 ${nickname} ${invitee} :No such nick/channel\r\n`);
                                break;
                            }
                            const inviteeSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === invitee);
                            if (!inviteeSocket) {
                                socket.write(`:${this.servername} 401 ${nickname} ${invitee} :No such nick/channel\r\n`);
                                break;
                            }
                            if (!this.channels.has(channel) || !this.channels.get(channel).has(invitee)) {
                                if (!this.channelinvites) this.channelinvites = new Map();
                                const invited = this.channelinvites.get(channel) || new Set();
                                invited.add(invitee);
                                this.channelinvites.set(channel, invited);
                                socket.write(`:${this.servername} 341 ${nickname} ${invitee} ${channel} :Invited to channel\r\n`);
                                inviteeSocket.write(`:${this.servername} 341 ${nickname} ${invitee} ${channel} :You have been invited to join ${channel}\r\n`);
                                break;
                            } else {
                                socket.write(`:${this.servername} 443 ${nickname} ${invitee} ${channel} :${invitee} is already on that channel\r\n`);
                                break;
                            }
                        case 'LIST':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            let channelsToList;
                            if (params.length > 0 && params[0]) {
                                channelsToList = params[0].split(',').filter(ch => ch.length > 0);
                            } else {
                                channelsToList = Array.from(this.channels.keys());
                            }
                            socket.write(`:${this.servername} 321 ${nickname} :Channel :Users :Topic\r\n`);
                            for (const channel of channelsToList) {
                                if (this.channelmodes.has(channel)) {
                                    var modes = this.channelmodes.get(channel);
                                    if (modes === true) {
                                        modes = [];
                                    }
                                    if (modes.includes('p')) {
                                        if (!this.channels.has(channel) || !this.channels.get(channel).has(nickname)) {
                                            continue; // Skip if user is not in the channel
                                        }
                                    }
                                    if (modes.includes('s')) {
                                        if (!this.channels.has(channel) || !this.channels.get(channel).has(nickname)) {
                                            continue; // Skip if user is not in the channel
                                        }
                                    }
                                }
                                const users = this.getUsersInChannel(channel);
                                const topic = this.channeltopics.get(channel) || 'No topic is set';
                                socket.write(`:${this.servername} 322 ${nickname} ${channel} ${users.length} :${topic}\r\n`);
                            }
                            socket.write(`:${this.servername} 323 ${nickname} :End of /LIST\r\n`);
                            break;
                        case 'WHO':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (!params[0]) {
                                socket.write(`:${this.servername} 461 ${nickname} WHO :Not enough parameters\r\n`);
                                break;
                            }
                            const target = params[0];
                            if (target.startsWith('#')) {
                                // WHO for channel
                                if (this.channelmodes.has(target)) {
                                    const modes = this.channelmodes.get(target);
                                    if ((modes.includes('p') || modes.includes('s')) && (!this.channels.has(target) || !this.channels.get(target).has(nickname))) {
                                        socket.write(`:${this.servername} 315 ${nickname} ${target} :End of /WHO list\r\n`);
                                        break;
                                    }
                                }
                                if (this.channels.has(target)) {
                                    const users = this.getUsersInChannel(target);
                                    for (const user of users) {
                                        const sock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                                        if (sock) {
                                            socket.write(`:${this.servername} 352 ${nickname} * ${user} ${sock.remoteAddress} ${this.servername} ${user} H :0 ${user}\r\n`);
                                        }
                                    }
                                }
                                socket.write(`:${this.servername} 315 ${nickname} ${target} :End of /WHO list\r\n`);
                            } else {
                                // WHO for nickname
                                let found = false;
                                for (const [sock, nick] of this.nicknames.entries()) {
                                    if (nick === target) {
                                        found = true;
                                        socket.write(`:${this.servername} 352 ${nickname} * ${nick} ${sock.remoteAddress} ${this.servername} ${nick} H :0 ${nick}\r\n`);
                                        break;
                                    }
                                }
                                if (!found) {
                                    socket.write(`:${this.servername} 401 ${nickname} ${target} :No such nick/channel\r\n`);
                                }                                    
                                socket.write(`:${this.servername} 315 ${nickname} ${target} :End of /WHO list\r\n`);
                                break;
                            }
                            break;
                        case 'PRIVMSG':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            this.usertimestamps.set(nickname, Date.now());                            
                            if (params[0]) {
                                const target = params[0];
                                isChannel = false;
                                this.channelprefixes.forEach(prefix => {
                                    if (target.startsWith(prefix)) {
                                        isChannel = true;
                                    }
                                });
                                if (isChannel) {
                                    // Channel message
                                    if (this.channelmodes.has(target) && this.channelmodes.get(target).includes('m')) {
                                        // Channel is moderated (+m)
                                        var voices = this.channelvoices.get(target) || new Set();
                                        var ops = this.channelops.get(target) || new Set();
                                        if (voices === true) voices = new Set();
                                        if (ops === true) ops = new Set();
                                        if (!(voices.has(nickname) || ops.has(nickname))) {
                                            socket.write(`:${this.servername} 404 ${nickname} ${target} :Cannot send to channel (+m)\r\n`);
                                            break;
                                        }
                                    }
                                    if (this.channelmodes.has(target) && this.channelmodes.get(target).includes('n')) {
                                        // Channel is no-external-messages (+n)
                                        if (!this.channels.has(target) || !this.channels.get(target).has(nickname)) {
                                            socket.write(`:${this.servername} 404 ${nickname} ${target} :Cannot send to channel (+n)\r\n`);
                                            break;
                                        }
                                    }                                    
                                }
                                const msg = line.slice(line.indexOf(':', 1) + 1);
                                if (isChannel) {
                                    if (!this.channels.has(target)) {
                                        socket.write(`:${this.servername} 403 ${nickname} ${target} :No such channel\r\n`);
                                        break;
                                    }
                                    this.broadcastChannel(target, `:${nickname}!${username}@${host} PRIVMSG ${target} :${msg}\r\n`, socket);
                                    break;
                                } else {
                                    const targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === target);
                                    if (!targetSock) {
                                        socket.write(`:${this.servername} 401 ${nickname} ${target} :No such nick/channel\r\n`);
                                        return;
                                    }
                                    const msg = line.slice(line.indexOf(':', 1) + 1);
                                    targetSock.write(`:${nickname}!${username}@${host} PRIVMSG ${target} :${msg}\r\n`);
                                    break;
                                }
                            }
                            break;
                        case 'NOTICE':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            this.usertimestamps.set(nickname, Date.now());                            
                            if (params[0]) {
                                const msg = line.slice(line.indexOf(':', 1) + 1);
                                let validTarget = false;
                                for (const prefix of this.channelprefixes) {
                                    if (params[0].startsWith(prefix)) {
                                        validTarget = true;
                                        break;
                                    }
                                }
                                if (validTarget) {
                                    if (this.channelmodes.has(target) && this.channelmodes.get(target).includes('n')) {
                                        // Channel is no-external-messages (+n)
                                        if (!this.channels.has(target) || !this.channels.get(target).has(nickname)) {
                                            socket.write(`:${this.servername} 404 ${nickname} ${target} :Cannot send to channel (+n)\r\n`);
                                            break;
                                        }
                                    }
                                    if (!this.channels.has(params[0])) {
                                        socket.write(`:${this.servername} 403 ${nickname} ${params[0]} :No such channel\r\n`);
                                        break;
                                    }
                                    this.broadcastChannel(params[0], `:${nickname}!${username}@${host} NOTICE ${params[0]} :${msg}\r\n`, socket);
                                    break;
                                } else {
                                    // Assume it's a nick, check if it exists
                                    const targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === params[0]);
                                    if (!targetSock) {
                                        socket.write(`:${this.servername} 401 ${nickname} ${params[0]} :No such nick/channel\r\n`);
                                        return;
                                    }
                                    targetSock.write(`:${nickname}!${username}@${host} NOTICE ${params[0]} :${msg}\r\n`);
                                }                                
                            }
                            break;
                        case 'PING':
                            socket.write(`PONG ${params.join(' ')}\r\n`);
                            break;
                        case 'WHOIS':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params.length < 1) {
                                socket.write(`:${this.servername} 461 ${nickname} WHOIS :Not enough parameters\r\n`);
                                break;
                            }
                            const whoisNick = params[0];
                            const whoisSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === whoisNick);
                            if (whoisSocket) {
                                const whois_username = this.usernames.get(whoisNick);
                                socket.write(`:${this.servername} 311 ${nickname} ${whoisNick} ${whois_username} ${this.getHostname(whoisSocket)} * ${whoisNick}\r\n`);
                                if (this.awaymsgs.has(whoisNick)) {
                                    socket.write(`:${this.servername} 301 ${nickname} ${whoisNick} :${this.awaymsgs.get(whoisNick)}\r\n`);
                                }
                                const userChannels = [];
                                for (const [ch, users] of this.channels.entries()) {
                                    if (users.has(whoisNick)) {
                                        let prefix = '';
                                        var chanops = this.channelops.get(ch) || new Set();
                                        var chanvoices = this.channelvoices.get(ch) || new Set();
                                        const modes = this.channelmodes.get(ch) || [];
                                        if ((modes.includes('p') || modes.includes('s')) && (!this.channels.has(ch) || !this.channels.get(ch).has(nickname))) {
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
                                socket.write(`:${this.servername} 312 ${nickname} ${whoisNick} ${this.servername} :minisrv-${this.minisrv_config.version}\r\n`);
                                if (this.isIRCOp(whoisNick)) {
                                    socket.write(`:${this.servername} 313 ${nickname} ${whoisNick} :is an IRC operator\r\n`);
                                }
                                var now = Date.now();
                                var userTimestamp = this.usertimestamps.get(whoisNick) || now;
                                var idleTime = Math.floor((now - userTimestamp) / 1000);
                                socket.write(`:${this.servername} 317 ${nickname} ${whoisNick} ${idleTime} :seconds idle\r\n`);
                                if (userChannels.length > 0) {
                                    socket.write(`:${this.servername} 319 ${nickname} ${whoisNick} :${userChannels.join(' ')}\r\n`);
                                }
                                socket.write(`:${this.servername} 318 ${nickname} ${whoisNick} :End of /WHOIS list\r\n`);
                            } else {
                                socket.write(`:${this.servername} 401 ${nickname} ${whoisNick} :No such nick/channel\r\n`);
                            }
                            break;
                        case 'KILL':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (!this.isIRCOp(nickname)) {
                                socket.write(`:${this.servername} 481 ${nickname} :Permission denied - you are not an IRC operator\r\n`);
                                break;
                            }
                            if (params.length < 2) {
                                socket.write(`:${this.servername} 461 ${nickname} KILL :Not enough parameters\r\n`);
                                break;
                            }
                            const target_nick = params[0];
                            const killReason = params.slice(1).join(' ');
                            let cleanKillReason = killReason;
                            if (cleanKillReason.startsWith(':')) {
                                cleanKillReason = cleanKillReason.slice(1);
                            }
                            const targetSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === target_nick);
                            if (!targetSocket) {
                                socket.write(`:${this.servername} 401 ${nickname} ${target_nick} :No such nick/channel\r\n`);
                                break;
                            }

                            // Broadcast the KILL message to all users
                            this.broadcastUser(target_nick, `:${nickname}!${username}@${host} KILL ${target_nick} :${cleanKillReason}\r\n`);
                            this.terminateSession(targetSocket, target_nick);
                            break;
                        case 'QUIT':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                            } else {
                                if (params.length > 0) {
                                    let reason = params.join(' ');
                                    if (reason.startsWith(':')) {
                                        reason = reason.slice(1);
                                    }
                                    socket.write(`:${nickname}!${username}@${host} QUIT :${reason}\r\n`);
                                    this.broadcastUser(nickname, `:${nickname}!${username}@${host} QUIT :${reason}\r\n`, socket);
                                } else {
                                    socket.write(`:${nickname}!${username}@${host} QUIT\r\n`);
                                    this.broadcastUser(nickname, `:${nickname}!${username}@${host} QUIT\r\n`, socket);
                                }
                            }
                            this.terminateSession(socket, nickname);
                            break;
                        default:
                            // Ignore unknown commands
                            break;
                    }
                }
            });

            socket.on('end', () => {
                this.clients = this.clients.filter(c => c !== socket);
                this.nicknames.delete(socket);
            });

            socket.on('error', () => {
                this.clients = this.clients.filter(c => c !== socket);
                this.nicknames.delete(socket);
            });
        });

        this.server.listen(this.port, this.host, () => {
            if (this.debug) {
                console.log(`IRC server started on port ${this.host}:${this.port}`);
            }
        });
    }

    terminateSession(socket, nickname) {
        if (nickname) {
            this.usertimestamps.delete(nickname);
            this.usersignontimestamps.delete(nickname);
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
                        this.channels.delete(ch);
                        this.channelops.delete(ch);
                        this.channelvoices.delete(ch);
                        this.channeltopics.delete(ch);
                        this.channelbans.delete(ch);
                        this.channelexemptions.delete(ch);
                        this.channelinvites.delete(ch);
                        this.channelmodes.delete(ch);
                    }
                }
            });
        }
        socket.end();
    }

    isBanned(nickname, channel) {
        if (this.channelbans.has(channel)) {
            const bans = this.channelbans.get(channel);
            // Check if the user's mask matches any ban mask
            let isBanned = false;
            for (const banMask of bans) {
                // Simple mask matching: * matches any, ? matches one char, otherwise exact
                // IRC uses user!ident@host
                const regex = new RegExp('^' + banMask.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
                if (regex.test(nickname)) {
                    isBanned = true;
                    break;
                }
                if (this.channelexemptions.has(channel)) {
                    const exemptions = this.channelexemptions.get(channel);
                    for (const exemptMask of exemptions) {
                        const exemptRegex = new RegExp('^' + exemptMask.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
                        if (exemptRegex.test(nickname)) {
                            isBanned = false;
                            break;
                        }
                    }
                }
            }
            return isBanned;
        }
        return false;
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
        }
    }

    getHostname(socket) {
        const username = this.nicknames.get(socket);
        const modes = this.usermodes.get(username);
        var hostname = '';
        if (socket && socket.remoteAddress) {
            try {
                // Synchronously resolve the hostname (not recommended for production, but simple for this context)
                // For async, you'd need to refactor the call site to handle promises/callbacks
                let resolved = socket.remoteAddress;
                dns.reverse(socket.remoteAddress, (err, hostnames) => {
                    if (!err && hostnames && hostnames.length > 0) {
                        resolved = hostnames[0];
                    }
                });
                hostname = resolved;
            } catch (e) {
                hostname = socket.remoteAddress;
            }
        }

        if (Array.isArray(modes) && modes.includes('h')) {
            // Masked hostname for +h users
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
        if (hostname) {
            return hostname;
        }
        return 'unknown.host';
    }

    doLogin(nickname, socket) {
        socket.write(`:${this.servername} 001 ${nickname} :Welcome to the IRC server, ${nickname}\r\n`);
        socket.write(`:${this.servername} 002 ${nickname} :Your host is ${this.servername}, running version minisrv ${this.minisrv_config.version}\r\n`);
        socket.write(`:${this.servername} 003 ${nickname} :This server is ready to accept commands\r\n`);
        socket.write(`:${this.servername} 004 ${nickname} ${this.servername} minisrv ${this.minisrv_config.version} ohiws obtkmeIlvn beIklov\r\n`);
        socket.write(`:${this.servername} 005 ${this.caps}\r\n`);
    }
}

module.exports = WTVIRC;