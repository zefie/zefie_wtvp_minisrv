const net = require('net');

class WTVIRC {
    /*
        * WTVIRC - A simple IRC server implementation for WebTV
        * Tested with WebTV and KvIRC
        * This is a basic implementation and does not cover all IRC features.
        * It supports basic commands like NICK, USER, JOIN, PART, PRIVMSG, NOTICE, TOPIC, AWAY, MODE, KICK, and PING.
        * TODO: Proper channel mode support, implement invite, enforce invite only channel mode.
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
        this.channelmodes = new Map(); // channel -> modes
        this.nicknames = new Map(); // socket -> nickname
        this.awaymsgs = new Map(); // nickname -> away message        
        this.nicklen = 30;
        this.servername = 'irc.local';
        this.caps = `AWAYLEN=200 CHANTYPES=# PREFIX=(ov)@+ CHANMODES=beI,k,l,imnp SAFELIST MAXLIST=b:100,e:100,i:100,k:100,l:50 CHANLIMIT=#:50 NICKLEN=${this.nicklen} TOPICLEN=390 KICKLEN=390`;
    }

    start() {
        this.server = net.createServer(socket => {
            socket.setEncoding('utf8');
            this.clients.push(socket);

            let registered = false;
            let nickname = '';
            let username = '';
            let channel = '';
            let host = socket.remoteAddress || 'minisrv.local';

            if (this.debug) {
                const originalWrite = socket.write;
                socket.write = function (...args) {
                    console.log(`[socket.write]`, ...args);
                    return originalWrite.apply(socket, args);
                };
            }

            socket.write(`:${this.servername} NOTICE AUTH :Welcome to minisrv IRC Server\r\n`);

            socket.on('data', data => {
                const lines = data.split(/\r\n|\n/).filter(Boolean);
                for (let line of lines) {
                    if (this.debug) {
                        console.log(`Received data from client: ${line}`);
                    }
                    const [command, ...params] = line.trim().split(' ');
                    switch (command.toUpperCase()) {
                        case 'KICK':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params.length < 2) {
                                socket.write(`:${this.servername} 461 ${nickname} KICK :Not enough parameters\r\n`);
                                break;
                            }
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
                            channel = params[0];
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
                            if (params.length > 0) {
                                socket.write(`:${this.servername} 301 ${nickname} :You are now marked as away\r\n`);
                                this.awaymsgs.set(nickname, params.join(' '));
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
                            if (!this.channels.has(channel)) {
                                socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                break;
                            }
                            const mode = params[1];
                            if (!mode) {
                                const modes = this.channelmodes.get(channel) || '';
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} ${modes}\r\n`);
                                break;
                            } else if (mode.startsWith('+m')) {
                                this.channelmodes.set(channel, (this.channelmodes.get(channel) || '') + 'm');
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} +m\r\n`);
                                break;
                            } else if (mode.startsWith('-m')) {
                                this.channelmodes.set(channel, (this.channelmodes.get(channel) || '').replace('m', ''));
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} -m\r\n`);
                                break;
                            } else if (mode.startsWith('+l')) {
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                const limit = parseInt(params[2], 10);
                                if (isNaN(limit) || limit < 0) {
                                    socket.write(`:${this.servername} 501 ${nickname} :Invalid channel limit\r\n`);
                                    break;
                                }
                                this.channelmodes.set(channel, (this.channelmodes.get(channel) || '') + `l${limit}`);
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} +l ${limit}\r\n`);
                                break;
                            } else if (mode.startsWith('-l')) {
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                const limit = parseInt(params[2], 10);
                                if (isNaN(limit) || limit < 0) {
                                    socket.write(`:${this.servername} 501 ${nickname} :Invalid channel limit\r\n`);
                                    break;
                                }
                                this.channelmodes.set(channel, (this.channelmodes.get(channel) || '').replace(`l${limit}`, ''));
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} -l ${limit}\r\n`);
                                break;
                            } else if (mode.startsWith('+k')) {
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                const key = params[2];
                                this.channelmodes.set(channel, (this.channelmodes.get(channel) || '') + `k${key}`);
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} +k ${key}\r\n`);
                                break;
                            } else if (mode.startsWith('-k')) {
                                if (params.length < 3) {
                                    socket.write(`:${this.servername} 461 ${nickname} MODE :Not enough parameters\r\n`);
                                    break;
                                }
                                const key = params[2];
                                this.channelmodes.set(channel, (this.channelmodes.get(channel) || '').replace(`k${key}`, ''));
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} -k ${key}\r\n`);
                                break;
                            } else if (mode.startsWith('+i')) {
                                this.channelmodes.set(channel, (this.channelmodes.get(channel) || '') + 'i');
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} +i\r\n`);
                                break;
                            } else if (mode.startsWith('-i')) {
                                this.channelmodes.set(channel, (this.channelmodes.get(channel) || '').replace('i', ''));
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} -i\r\n`); 
                                break;                              
                            } else if (mode.startsWith('+o')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                 
                                this.channelops.set(channel, (this.channelops.get(channel) || new Set()).add(nickname));
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} +o ${nickname}\r\n`);
                                break;
                            } else if (mode.startsWith('-o')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                    
                                this.channelops.set(channel, (this.channelops.get(channel) || new Set()).delete(nickname));
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} -o ${nickname}\r\n`);
                                break;
                            } else if (mode.startsWith('+v')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                   
                                this.channelvoices.set(channel, (this.channelvoices.get(channel) || new Set()).add(nickname));
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} +v ${nickname}\r\n`);
                                break;
                            } else if (mode.startsWith('-v')) {
                                if (!this.channelops.has(channel) || this.channelops.get(channel) === true) {
                                    socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                    break;
                                } else {
                                    if (!this.channelops.get(channel).has(nickname)) {
                                        socket.write(`:${this.servername} 482 ${nickname} ${channel} :You're not channel operator\r\n`);
                                        break;
                                    }
                                }                                   
                                this.channelvoices.set(channel, (this.channelvoices.get(channel) || new Set()).delete(nickname));
                                socket.write(`:${this.servername} 324 ${nickname} ${channel} -v ${nickname}\r\n`);
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
                                    break
                                } else {
                                    socket.write(`:${this.servername} 403 ${nickname} ${channel} :No such channel\r\n`);
                                    break
                                }
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
                            }
                            if (!registered && nickname && username) {
                                registered = true;
                                socket.write(`:${this.servername} 001 ${nickname} :Welcome to the IRC server, ${nickname}\r\n`);
                                socket.write(`:${this.servername} 002 ${nickname} :Your host is ${this.servername}, running version minisrv ${this.minisrv_config.version}\r\n`);
                                socket.write(`:${this.servername} 003 ${nickname} :This server is ready to accept commands\r\n`);
                                socket.write(`:${this.servername} 004 ${nickname} ${this.servername} minisrv ${this.minisrv_config.version} :End of /MOTD command\r\n`);
                                socket.write(`:${this.servername} 005 ${this.caps}\r\n`);
                            }                            
                            break;
                        case 'USER':
                            username = params[0];                      
                            if (!registered && nickname && username) {
                                registered = true;
                                this.usernames.set(nickname, username);
                                socket.write(`:${this.servername} 001 ${nickname} :Welcome to the IRC server, ${nickname}\r\n`);
                                socket.write(`:${this.servername} 002 ${nickname} :Your host is ${this.servername}, running version minisrv ${this.minisrv_config.version}\r\n`);
                                socket.write(`:${this.servername} 003 ${nickname} :This server is ready to accept commands\r\n`);
                                socket.write(`:${this.servername} 004 ${nickname} ${this.servername} minisrv ${this.minisrv_config.version} :End of /MOTD command\r\n`);
                                socket.write(`:${this.servername} 005 ${this.caps}\r\n`);
                            }
                            break;
                        case 'JOIN':
                            if (!registered) {
                                socket.write(`:irc.local 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            channel = params[0];
                            if (channel.includes(',')) {
                                var channels = channel.split(',');
                            } else {
                                var channels = [channel];
                            }
                            for (const ch of channels) {
                                if (this.channelbans.has(ch)) {
                                    const bans = this.channelbans.get(ch);
                                    // Check if the user's mask matches any ban mask
                                    // For simplicity, we'll use nickname as the mask (real IRC uses user@host)
                                    let isBanned = false;
                                    for (const banMask of bans) {
                                        // Simple mask matching: * matches any, ? matches one char, otherwise exact
                                        // Real IRC uses user!ident@host, here we just use nickname
                                        // Convert mask to regex
                                        let regex = '^' + banMask.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
                                            .replace(/\*/g, '.*')
                                            .replace(/\?/g, '.') + '$';
                                        if (new RegExp(regex, 'i').test(`${nickname}!${username}@${host}`)) {
                                            isBanned = true;
                                            break;
                                        }
                                    }
                                    if (isBanned) {
                                        socket.write(`:${this.servername} 474 ${nickname} ${ch} :Cannot join channel (+b)\r\n`);
                                        continue; // Skip joining this channel
                                    }
                                }
                                if (this.channelmodes.has(ch)) {
                                    const modes = this.channelmodes.get(ch);
                                    const keyMatch = modes.match(/k([^\s]+)/);
                                    if (keyMatch) {
                                        const channelKey = keyMatch[1];
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
                                        if (!invited.has(nickname)) {
                                            socket.write(`:${this.servername} 473 ${nickname} ${ch} :Cannot join channel (+i)\r\n`);
                                            continue; // Skip joining this channel
                                        }
                                        invited.delete(nickname);
                                        this.channelinvites.set(ch, invited);
                                    }
                                }
                                // Recursively process each channel join
                                const joinLine = `JOIN ${ch}`;
                                // Simulate a JOIN command for each channel
                                const [command, ...params] = joinLine.trim().split(' ');
                                // Reuse the JOIN logic for each channel
                                // Only run the code after $PLACEHOLDER$ for each channel
                                // (excluding the code before $PLACEHOLDER$ to avoid duplicate checks)
                                // You can refactor this logic into a helper if needed
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
                            if (params.length == 2) {
                                let reason = params.join(' ');
                                if (reason.startsWith(':')) {
                                    reason = reason.slice(1);
                                }
                                socket.write(`:${nickname}!${username}@${host} PART ${channel} :${reason}\r\n`);
                                this.broadcastUser(nickname, `:${nickname}!${username}@${host} PART ${channel} :${reason}\r\n`, socket);
                            } else {
                                socket.write(`:${nickname}!${username}@${host} PART ${channel}\r\n`);
                                this.broadcastUser(nickname, `:${nickname}!${username}@${host} PART ${channel}\r\n`, socket);
                            }
                            if (this.channels.has(channel)) {
                                this.channels.get(channel).delete(nickname);
                                if (this.channels.get(channel).size === 0) {
                                    this.channels.delete(channel);
                                    this.channelops.delete(channel);
                                    this.channelvoices.delete(channel);
                                    this.channeltopics.delete(channel);
                                    this.channelbans.delete(channel);
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
                            socket.write(`:${this.servername} 321 ${nickname} Channel :Users\r\n`);
                            for (const channel of channelsToList) {
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
                            if (params[0]) {
                                const target = params[0];
                                if (target.startsWith('#')) {
                                    // Channel message
                                    if (this.channelmodes.has(target) && this.channelmodes.get(target).includes('m')) {
                                        // Channel is moderated (+m)
                                        const voices = this.channelvoices.get(target) || new Set();
                                        const ops = this.channelops.get(target) || new Set();
                                        if (!(voices.has(nickname) || ops.has(nickname))) {
                                            socket.write(`:${this.servername} 404 ${nickname} ${target} :Cannot send to channel (+m)\r\n`);
                                            return;
                                        }
                                    }
                                }
                                const msg = line.slice(line.indexOf(':', 1) + 1);
                                this.broadcast(`:${nickname}!${username}@${host} PRIVMSG ${params[0]} :${msg}\r\n`, socket);
                            }
                            break;
                        case 'NOTICE':
                            if (!registered) {
                                socket.write(`:${this.servername} 451 ${nickname} :You have not registered\r\n`);
                                break;
                            }
                            if (params[0]) {
                                const msg = line.slice(line.indexOf(':', 1) + 1);
                                this.broadcast(`:${nickname}!${username}@${host} NOTICE ${params[0]} :${msg}\r\n`, socket);
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
                                socket.write(`:${this.servername} 311 ${nickname} ${whoisNick} ${whois_username} ${whoisSocket.remoteAddress} * ${whoisNick}\r\n`);
                                if (this.awaymsgs.has(whoisNick)) {
                                    socket.write(`:${this.servername} 301 ${nickname} ${whoisNick} :${this.awaymsgs.get(whoisNick)}\r\n`);
                                }
                                const userChannels = [];
                                for (const [ch, users] of this.channels.entries()) {
                                    if (users.has(whoisNick)) {
                                        let prefix = '';
                                        if (this.channelops.has(ch) && this.channelops.get(ch).has(whoisNick)) {
                                            prefix = '@';
                                        } else if (this.channelvoices.has(ch) && this.channelvoices.get(ch).has(whoisNick)) {
                                            prefix = '+';
                                        }
                                        userChannels.push(prefix + ch);
                                    }
                                }
                                if (userChannels.length > 0) {
                                    socket.write(`:${this.servername} 319 ${nickname} ${whoisNick} :${userChannels.join(' ')}\r\n`);
                                }
                                socket.write(`:${this.servername} 318 ${nickname} ${whoisNick} :End of /WHOIS list\r\n`);
                            } else {
                                socket.write(`:${this.servername} 401 ${nickname} ${whoisNick} :No such nick/channel\r\n`);
                            }
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
                            socket.end();
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

    broadcast(message, exceptSocket = null) {
        for (const client of this.clients) {
            if (client !== exceptSocket) {
                client.write(message);
            }
        }
    }
}

module.exports = WTVIRC;