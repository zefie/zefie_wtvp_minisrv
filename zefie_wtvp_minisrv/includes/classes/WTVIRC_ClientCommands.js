const dns = require('dns');
const crypto = require('crypto');

module.exports = {
    async handleCommand_OPER(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!socket.secure) {
            await this.safeWriteToSocket(socket, `:${this.servername} 464 ${socket.nickname} :SSL required for OPER\r\n`);
            return;
        }
        if (!this.checkAuthAttempts(socket)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 491 ${socket.nickname} :Too many failed attempts. Try again later.\r\n`);
            this.logSecurityEvent('OPER_LOCKOUT', socket, { attempts: this.failed_auth_attempts.get(socket.realhost || socket.remoteAddress) });
            return;
        }
        if (!this.oper_enabled) {
            await this.safeWriteToSocket(socket, `:${this.servername} 491 ${socket.nickname} :This server does not support IRC operators\r\n`);
            return;
        }
        if (params.length < 2) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} OPER :Not enough parameters\r\n`);
            return;
        }
        const [operName, operPassword] = params;
        if (operName !== this.oper_username) {
            await this.safeWriteToSocket(socket, `:${this.servername} 491 ${socket.nickname} :No permission\r\n`);
            this.debugLog('warn', `Invalid oper name attempt: ${operName} from ${socket.nickname} (${socket.username}@${socket.realhost})`);
            this.logSecurityEvent('OPER_FAILED_USERNAME', socket, { provided_username: operName });
            this.recordAuthFailure(socket);
            return;
        }
        // Use timing-safe comparison to prevent timing attacks
        const providedPassword = Buffer.from(operPassword, 'utf8');
        const actualPassword = Buffer.from(this.oper_password, 'utf8');
        const passwordMatch = providedPassword.length === actualPassword.length && 
                            crypto.timingSafeEqual(providedPassword, actualPassword);
        
        if (!passwordMatch) {
            await this.safeWriteToSocket(socket, `:${this.servername} 464 ${socket.nickname} :Password incorrect\r\n`);
            this.debugLog('warn', `Invalid oper password attempt from ${socket.nickname} (${socket.username}@${socket.realhost}) (using oper name ${operName})`);
            this.logSecurityEvent('OPER_FAILED_PASSWORD', socket, { username: operName });
            this.recordAuthFailure(socket);
            return;
        }
        this.clearAuthFailures(socket);
        this.logSecurityEvent('OPER_SUCCESS', socket, { username: operName });
        this.setUserMode(socket.nickname, 'o', true);
        await this.safeWriteToSocket(socket, `:${this.servername} 381 ${socket.nickname} :You are now an IRC operator\r\n`);
        await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} MODE ${socket.nickname} +o\r\n`);
        await this.broadcastToAllServers(`:${socket.uniqueId} MODE ${socket.uniqueId} +o\r\n`);
        this.debugLog('info', `IRC operator ${socket.nickname} (${socket.username}@${socket.realhost}) has logged in with oper name ${operName}`);
    },

    async handleCommand_UPTIME(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        await this.safeWriteToSocket(socket, this.formatStatsUptimeLine(socket.nickname));
    },

    async handleCommand_SECURITY(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
            return;
        }
        
        // Show security statistics
        const output_lines = [];
        output_lines.push(`:${this.servername} NOTICE ${socket.nickname} :=== Security Report ===\r\n`);
        output_lines.push(`:${this.servername} NOTICE ${socket.nickname} :Active connections per IP: ${this.connections_per_ip.size}\r\n`);
        output_lines.push(`:${this.servername} NOTICE ${socket.nickname} :Failed auth attempts tracked: ${this.failed_auth_attempts.size}\r\n`);
        output_lines.push(`:${this.servername} NOTICE ${socket.nickname} :Security events logged: ${this.security_events.length}\r\n`);
        output_lines.push(`:${this.servername} NOTICE ${socket.nickname} :Rate limit violations: ${this.security_events.filter(e => e.event === 'RATE_LIMIT_EXCEEDED').length}\r\n`);
        output_lines.push(`:${this.servername} NOTICE ${socket.nickname} :=== End Report ===\r\n`);
        
        await this.sendThrottled(socket, output_lines);
    },

    async handleCommand_KICK(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (params.length < 2) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} KICK :Not enough parameters\r\n`);
            return;
        }
        const channel = this.findChannel(params[0]);                    
        const targetNick = this.findUser(params[1]);
        if (!channel || !this.channelData.has(channel)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${params[0]} :No such channel\r\n`);
            return;
        }
        if (!targetNick) {
            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[1]} :No such nick/channel\r\n`);
            return;
        }
        if (!this.channelData.get(channel).users.has(socket.nickname) && !this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 442 ${socket.nickname} ${channel} :You're not on that channel\r\n`);
            return;
        }
        const isOp = this.isChannelOp(socket.nickname, channel);
        const isHalfOp = this.isChannelHalfOp(socket.nickname, channel);
        if (!isOp && !isHalfOp) {
            await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
            return;
        }
        if (!isOp && isHalfOp && this.channelData.get(channel).ops.has(targetNick)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :You cannot kick a channel operator\r\n`);
            return;
        }
        socket.lastspoke = this.getDate();
        if (!this.channelData.get(channel).users.has(targetNick)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 441 ${socket.nickname} ${targetNick} ${channel} :They aren't on that channel\r\n`);
            return;
        }
        const chan_modes = this.channelData.get(channel).modes;
        if (chan_modes.includes('Q')) {
            await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :Cannot kick users, channel is +Q (no kicks allowed)\r\n`);
            return;
        }
        const targetSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === targetNick);
        let reason = '';
        if (params.length > 2) {
            reason = this.sanitizeTrailingParam(params.slice(2).join(' ').replace(/^:/, ''));
            if (reason.length > this.kicklen) {
                reason = reason.slice(0, this.kicklen);
            }
        }
        const kickLine = reason
            ? `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick} :${reason}\r\n`
            : `:${socket.nickname}!${socket.username}@${socket.host} KICK ${channel} ${targetNick}\r\n`;
        if (targetSocket) {
            await this.safeWriteToSocket(targetSocket, kickLine);
        }
        await this.broadcastChannel(channel, kickLine, targetSocket);
        const targetUid = (targetSocket && targetSocket.uniqueId) || this.uniqueids.get(targetNick) || targetNick;
        await this.broadcastToAllServers(`:${socket.uniqueId} KICK ${channel} ${targetUid}${reason ? ' :' + reason : ''}\r\n`);
        this.removeUserFromChannel(targetNick, channel);
    },

    async handleCommand_TOPIC(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (params.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} TOPIC :Not enough parameters\r\n`);
            return;
        }
        const channel = this.findChannel(params[0]);
        if (!channel || !this.channelData.has(channel)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${params[0]} :No such channel\r\n`);
            return;
        }
        if (!this.channelData.get(channel).users.has(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 442 ${socket.nickname} ${channel} :You're not on that channel\r\n`);
            return;
        }
        socket.lastspoke = this.getDate();
        if (params.length > 1) {
            const chan_modes = this.channelData.get(channel).modes;
            if (chan_modes.includes('t')) {
                if (!this.isChannelOp(socket.nickname, channel) && !this.isChannelHalfOp(socket.nickname, channel)) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
                    return;
                }
            }
            let topic = this.sanitizeTrailingParam(params.slice(1).join(' ').replace(/^:/, ''));
            if (topic.length > this.topiclen) {
                topic = topic.slice(0, this.topiclen);
            }
            const channelObj = this.channelData.get(channel);
            channelObj.topic = topic;
            channelObj.topicSetter = socket.nickname;
            channelObj.topicTs = this.getDate();
            await this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} TOPIC ${channel} :${topic}\r\n`);
            await this.broadcastToAllServers(`:${socket.uniqueId} TOPIC ${channel} :${topic}\r\n`);
        } else {
            const topic = this.channelData.get(channel).topic;
            if (topic) {
                await this.safeWriteToSocket(socket, `:${this.servername} 332 ${socket.nickname} ${channel} :${topic}\r\n`);
            } else {
                await this.safeWriteToSocket(socket, `:${this.servername} 331 ${socket.nickname} ${channel} :No topic is set\r\n`);
            }
        }
    },

    async handleCommand_AWAY(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        socket.lastspoke = this.getDate();
        if (params.length > 0) {
            const awayMsg = this.sanitizeTrailingParam(params.join(' ').replace(/^:/, ''));
            if (awayMsg.length > this.awaylen) {
                await this.safeWriteToSocket(socket, `:${this.servername} 417 ${socket.nickname} :Away message is too long\r\n`);
                return;
            }
            await this.safeWriteToSocket(socket, `:${this.servername} 306 ${socket.nickname} :You are now marked as away\r\n`);
            this.awaymsgs.set(socket.nickname, awayMsg);
            await this.broadcastUserIfCap(socket, `:${socket.nickname}!${socket.username}@${socket.host} AWAY :${awayMsg}\r\n`, socket, 'away-notify');
            await this.broadcastToAllServers(`:${socket.uniqueId} AWAY :${awayMsg}\r\n`);
        } else {
            await this.safeWriteToSocket(socket, `:${this.servername} 305 ${socket.nickname} :You are no longer marked as away\r\n`);                        
            this.awaymsgs.delete(socket.nickname);
            await this.broadcastUserIfCap(socket, `:${socket.nickname}!${socket.username}@${socket.host} AWAY\r\n`, socket, 'away-notify');
            await this.broadcastToAllServers(`:${socket.uniqueId} AWAY\r\n`);
        }
    },

    async handleCommand_CAP(socket, params) {
        const nick = socket.nickname || '*';
        const sub = (params[0] || '').toUpperCase();
        if (sub === 'LS') {
            socket.capNegotiating = true;
            const capsString = this.supported_client_caps.map(cap => cap.toLowerCase()).join(' ');
            await this.safeWriteToSocket(socket, `:${this.servername} CAP ${nick} LS :${capsString}\r\n`);
            return;
        }
        if (sub === 'LIST') {
            const capsString = (socket.client_caps || []).join(' ');
            await this.safeWriteToSocket(socket, `:${this.servername} CAP ${nick} LIST :${capsString}\r\n`);
            return;
        }
        if (sub === 'REQ') {
            socket.capNegotiating = true;
            let reqCaps = params.slice(1).join(' ');
            if (reqCaps.startsWith(':')) {
                reqCaps = reqCaps.slice(1);
            }
            reqCaps = reqCaps.split(/\s+/).filter(Boolean).map(cap => cap.toLowerCase());
            const unsupported = reqCaps.filter(cap => {
                const name = cap.startsWith('-') ? cap.slice(1) : cap;
                return !this.supported_client_caps.includes(name);
            });
            if (unsupported.length > 0) {
                await this.safeWriteToSocket(socket, `:${this.servername} CAP ${nick} NAK :${reqCaps.join(' ')}\r\n`);
            } else {
                const current = new Set(socket.client_caps || []);
                for (const cap of reqCaps) {
                    if (cap.startsWith('-')) {
                        current.delete(cap.slice(1));
                    } else {
                        current.add(cap);
                    }
                }
                socket.client_caps = Array.from(current);
                await this.safeWriteToSocket(socket, `:${this.servername} CAP ${nick} ACK :${reqCaps.join(' ')}\r\n`);
            }
            this.debugLog('info', `Client ${nick} CAP REQ: ${reqCaps.join(', ')}`);
            return;
        }
        if (sub === 'END') {
            socket.capNegotiating = false;
            if (socket.pendingLogin && socket.nickname && socket.username) {
                socket.pendingLogin = false;
                await this.doLogin(socket.nickname, socket);
            }
            return;
        }
        await this.safeWriteToSocket(socket, `:${this.servername} 410 ${nick} ${sub || '*'} :Invalid CAP subcommand\r\n`);
    },

    async handleCommand_MODE(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (params.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} MODE :Not enough parameters\r\n`);
            return;
        }
        let isChannel = true;
        let channel = this.findChannel(params[0]);
        if (!channel) {
            isChannel = false;
            channel = this.findUser(params[0]);
        }
        if (!channel) {
            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[0]} :No such nick/channel\r\n`);
            return;
        }
        if (!this.channelData.has(channel)) {
            isChannel = false;
        }
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
            return;
        }
        const mode = params[1];
        if (isUser) {
            if (!this.isIRCOp(socket.nickname) && channel !== socket.nickname) {
                await this.safeWriteToSocket(socket, `:${this.servername} 502 ${socket.nickname} :Cannot set modes on other users\r\n`);
            } else {
                const targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === channel) || socket;
                const usermodes = this.getUserModes(channel);
                if (!mode) { 
                    if (usermodes.length === 0) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 221 ${socket.nickname} +\r\n`);
                    } else {
                        await this.safeWriteToSocket(socket, `:${this.servername} 221 ${socket.nickname} +${usermodes.join('')}\r\n`);
                    }
                } else if (/^[+-][A-Za-z]{2,}/.test(mode)) {
                    // Apply each flag in MODE nick +iw etc.
                    let sign = '+';
                    for (const ch of mode) {
                        if (ch === '+' || ch === '-') {
                            sign = ch;
                            continue;
                        }
                        await this.handleCommand_MODE(socket, [params[0], sign + ch]);
                    }
                } else if (mode.startsWith('+x')) {
                    if (usermodes.includes('x')) {
                        return;
                    }
                    this.setUserMode(channel, 'x', true);
                    targetSock.host = this.filterHostname(targetSock, targetSock.realhost);
                    this.hostnames.set(channel, targetSock.host);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} +x\r\n`);
                    const chghostPlus = `:${channel}!${targetSock.username}@${targetSock.host} CHGHOST ${targetSock.username} ${targetSock.host}\r\n`;
                    if (targetSock.client_caps && targetSock.client_caps.includes('chghost')) {
                        await this.safeWriteToSocket(targetSock, chghostPlus);
                    }
                    await this.broadcastUserIfCap(targetSock, chghostPlus, targetSock, 'chghost');
                    await this.safeWriteToSocket(targetSock, `:${this.servername} 396 ${channel} ${targetSock.host} :is now your visible host\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} +x\r\n`);
                } else if (mode.startsWith('-x')) {
                    if (!usermodes.includes('x')) {
                        return;
                    }
                    this.setUserMode(channel, 'x', false);
                    targetSock.host = targetSock.realhost;
                    this.hostnames.set(channel, targetSock.host);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} -x\r\n`);
                    const chghostMinus = `:${channel}!${targetSock.username}@${targetSock.host} CHGHOST ${targetSock.username} ${targetSock.host}\r\n`;
                    if (targetSock.client_caps && targetSock.client_caps.includes('chghost')) {
                        await this.safeWriteToSocket(targetSock, chghostMinus);
                    }
                    await this.broadcastUserIfCap(targetSock, chghostMinus, targetSock, 'chghost');
                    await this.safeWriteToSocket(targetSock, `:${this.servername} 396 ${channel} ${targetSock.host} :is now your visible host\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} -x\r\n`);
                } else if (mode.startsWith('+w')) {
                    if (usermodes.includes('w')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'w', true);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} +w\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} +w\r\n`);
                } else if (mode.startsWith('-w')) {
                    if (!usermodes.includes('w')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'w', false);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} -w\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} -w\r\n`);
                } else if (mode.startsWith('+c')) {
                    if (!this.isIRCOp(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `User ${socket.nickname} attempted to set +c mode without being an IRC operator`);
                        return;
                    }
                    if (usermodes.includes('c')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'c', true);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} +c\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} +c\r\n`);
                } else if (mode.startsWith('-c')) {
                    if (!this.isIRCOp(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
                        this.debugLog('warn', `User ${socket.nickname} attempted to unset -c mode without being an IRC operator`);
                        return;
                    }
                    if (!usermodes.includes('c')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'c', false);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} -c\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} -c\r\n`);
                } else if (mode.startsWith('+i')) {
                    if (usermodes.includes('i')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'i', true);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} +i\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} +i\r\n`);
                } else if (mode.startsWith('-i')) {
                    if (!usermodes.includes('i')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'i', false);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} -i\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} -i\r\n`);
                } else if (mode.startsWith('+s')) {
                    if (usermodes.includes('s')) {
                        return;
                    }                                
                    this.setUserMode(channel, 's', true);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} +s\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} +s\r\n`);
                } else if (mode.startsWith('-s')) {
                    if (!usermodes.includes('s')) {
                        return;
                    }                                
                    this.setUserMode(channel, 's', false);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} -s\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} -s\r\n`);
                } else if (mode.startsWith('+B')) {
                    if (usermodes.includes('B')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'B', true);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} +B\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} +B\r\n`);
                } else if (mode.startsWith('-B')) {
                    if (!usermodes.includes('B')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'B', false);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} -B\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} -B\r\n`);                                
                } else if (mode.startsWith('+R')) {
                    if (usermodes.includes('R')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'R', true);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} +R\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} +R\r\n`);
                } else if (mode.startsWith('-R')) {
                    if (!usermodes.includes('R')) {
                        return;
                    }                                
                    this.setUserMode(channel, 'R', false);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} -R\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} -R\r\n`);
                } else if (mode.startsWith('+z') || mode.startsWith('-z') || mode.startsWith('+r') || mode.startsWith('-r')) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :is set by the server and cannot be changed\r\n`);
                } else if (mode.startsWith('+Z')) {
                    if (!socket.secure) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :You must be secure to set this mode\r\n`);
                        return;
                    }
                    if (usermodes.includes('Z')) {
                        return;
                    }
                    this.setUserMode(channel, 'Z', true);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} +Z\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} +Z\r\n`);
                } else if (mode.startsWith('-Z')) {
                    if (!socket.secure) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :You must be secure to set this mode\r\n`);
                        return;
                    }
                    if (!usermodes.includes('Z')) {
                        return;
                    }
                    this.setUserMode(channel, 'Z', false);
                    await this.safeWriteToSocket(targetSock, `:${channel}!${targetSock.username}@${targetSock.host} MODE ${channel} -Z\r\n`);
                    await this.broadcastToAllServers(`:${targetSock.uniqueId} MODE ${targetSock.uniqueId} -Z\r\n`);
                } else {
                    await this.safeWriteToSocket(socket, `:${this.servername} 472 ${socket.nickname} ${mode.slice(1)} :is unknown mode char to me\r\n`);
                }
            }
            return;
        }
        if (!mode) {
            if (!(await this.checkRegistered(socket))) {
                return;
            }
            const validPrefix = this.channelprefixes.some(prefix => channel.startsWith(prefix));
            if (!validPrefix) {
                await this.safeWriteToSocket(socket, `:${this.servername} 476 ${socket.nickname} ${channel} :Bad channel mask\r\n`);
                return;
            }
            if (!this.channelData.has(channel)) {
                await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
                return;
            }
            let chan_modes = this.channelData.get(channel).modes;

            chan_modes = chan_modes.map(mode => {
                if (typeof mode === 'string' && !mode.startsWith('+')) {
                    return '+' + mode;
                }
                return mode;
            });
            if (chan_modes.length > 0) {
                const params2 = [];
                let modeString =
                    chan_modes.map(m => {
                        if (typeof m === 'string' && (m === '+k' || m === '+l')) {
                            if (m === '+l') {
                                params2.push(this.channelData.get(channel).limit);
                            } else if (m === '+k') {
                                if (this.channelData.get(channel).users.has(socket.nickname)) {
                                    params2.push(this.channelData.get(channel).key);
                                }
                            }
                            return m.replace(/^\+/, '');
                        }
                        return m.replace(/^\+/, '');
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
            await this.safeWriteToSocket(socket, `:${this.servername} 329 ${socket.nickname} ${channel} ${this.channelData.get(channel).timestamp || 0}\r\n`);
        } else {
            await this.processChannelModes(socket.nickname, channel, mode, params.slice(2), socket);
        } 
    },

    async handleCommand_NICK(socket, params) {
        const old_nickname = socket.nickname;
        let new_nickname = params[0];
        const nickTarget = socket.nickname || '*';
        if (new_nickname && new_nickname.startsWith(':')) {
            new_nickname = new_nickname.slice(1);
        }
        if (!new_nickname || new_nickname.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 431 ${nickTarget} :No nickname\r\n`);
            return;
        }
        
        const sanitized_nickname = this.sanitizeInput(new_nickname, 'nickname');
        if (sanitized_nickname !== new_nickname || sanitized_nickname.length === 0) {
            await this.safeWriteToSocket(socket, `:${this.servername} 432 ${nickTarget} ${new_nickname} :Erroneus nickname (invalid characters)\r\n`);
            this.logSecurityEvent('INVALID_NICKNAME', socket, { provided: new_nickname, sanitized: sanitized_nickname });
            return;
        }
        new_nickname = sanitized_nickname;
        
        if (new_nickname.length > this.nicklen) {
            await this.safeWriteToSocket(socket, `:${this.servername} 432 ${nickTarget} ${new_nickname} :Erroneus nickname (too long)\r\n`);
            return;
        }
        const caseOnlyRename = !!(socket.nickname &&
            this.casefold(socket.nickname) === this.casefold(new_nickname) &&
            socket.nickname !== new_nickname);
        if (!caseOnlyRename && this.findUser(new_nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 433 ${nickTarget} ${new_nickname} :Nickname is already in use\r\n`);
            return; 
        }
        for (const prefix of this.channelprefixes) {
            if (new_nickname.startsWith(prefix)) {
                await this.safeWriteToSocket(socket, `:${this.servername} 432 ${nickTarget} ${new_nickname} :Erroneus nickname (you are not a channel)\r\n`);
                return;
            }
        }
        for (let i = 0; i < new_nickname.length; i++) {
            if (!this.allowed_nick_characters.includes(new_nickname[i])) {
                await this.safeWriteToSocket(socket, `:${this.servername} 432 ${nickTarget} ${new_nickname} :Erroneus nickname (invalid character)\r\n`);
                return;
            }
        }
        if (this.reservednicks && Array.isArray(this.reservednicks)) {
            if (this.reservednicks.some(nick => nick.toLowerCase() === new_nickname.toLowerCase())) {
                await this.safeWriteToSocket(socket, `:${this.servername} 432 ${nickTarget} ${new_nickname} :This nickname is reserved\r\n`);
                return;
            }
        }
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
            await this.safeWriteToSocket(socket, `:${this.servername} 447 ${nickTarget} :You cannot change your nickname while in a +N (no nick change) channel\r\n`);
            return;
        }

        if (!socket.nickname) {
            socket.nickname = new_nickname;
            this.nicknames.set(socket, socket.nickname);
        } else if (socket.nickname !== new_nickname) {
            this.processNickChange(socket, new_nickname);
            if (socket.registered) {
                await this.safeWriteToSocket(socket, `:${old_nickname}!${socket.username}@${socket.host} NICK :${new_nickname}\r\n`);
                await this.broadcastUser(socket.nickname, `:${old_nickname}!${socket.username}@${socket.host} NICK :${new_nickname}\r\n`, socket);                        
                await this.broadcastToAllServers(`:${socket.uniqueId} NICK ${new_nickname} :${this.getDate()}\r\n`);
            }
        }
        if (!socket.registered && socket.nickname && socket.username) {
            const totalSockets = this.clients.length + this.servers.size;
            this.socketpeak = Math.max(this.socketpeak, totalSockets);                        
            this.usernames.set(socket.nickname, socket.username);
            if (this.userinfo.has(socket.username) && !this.userinfo.has(socket.nickname)) {
                this.userinfo.set(socket.nickname, this.userinfo.get(socket.username));
                this.userinfo.delete(socket.username);
            }
            socket.lastspoke = this.getDate();
            this.usersignontimestamps.set(socket.nickname, socket.timestamp);
            if (socket.capNegotiating) {
                socket.pendingLogin = true;
            } else {
                await this.doLogin(socket.nickname, socket);
            }
        }
    },

    async handleCommand_USER(socket, params) {
        if (params.length < 4) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname || '*'} USER :Not enough parameters\r\n`);
            this.addSocketError(socket);
            return;
        }
        if (socket.registered) {
            await this.safeWriteToSocket(socket, `:${this.servername} 462 ${socket.nickname} :You may not reregister\r\n`);
            return;
        }
        socket.username = this.sanitizeInput(params[0], 'username') || params[0].slice(0, this.userlen);
        socket.userinfo = this.sanitizeTrailingParam(params.slice(3).join(' ').replace(/^:/, ''));
        this.userinfo.set(socket.nickname || socket.username, socket.userinfo);
        if (!socket.registered && socket.nickname && socket.username) {
            const totalSockets = this.clients.length + this.servers.size;
            this.socketpeak = Math.max(this.socketpeak, totalSockets);                        
            this.usernames.set(socket.nickname, socket.username);
            socket.lastspoke = this.getDate();
            this.usersignontimestamps.set(socket.nickname, socket.timestamp);
            if (socket.capNegotiating) {
                socket.pendingLogin = true;
            } else {
                await this.doLogin(socket.nickname, socket);
            }
        }
    },

    async handleCommand_JOIN(socket, params, line) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        const channel = params[0];
        let key = null;
        if (params.length === 2) {
            key = params[1];
            if (key && key.startsWith(':')) {
                key = key.slice(1);
            }
        }
        const channels = channel.includes(',') ? channel.split(',') : [channel];
        for (let ch of channels) {
            let code;
            for (let i = 0; i < ch.length; i++) {
                if (i === 0 && !this.channelprefixes.includes(ch[0])) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                    return;
                } 
                if (this.channelprefixes.includes(ch[1])) {
                    ch = ch.slice(1);
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
                continue;
            }     
            let validChannel = false;
            this.channelprefixes.forEach(prefix => {
                if (ch.startsWith(prefix)) {
                    validChannel = true;
                }
            });
            if (!validChannel) {
                await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                continue;
            }
            if (ch.length < 2 || ch.length > this.channellen) {
                await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${ch} :No such channel\r\n`);
                continue;
            }
            const foundChannel = this.findChannel(ch);
            if (foundChannel) {
                ch = foundChannel;
            } else {
                this.createChannel(ch, socket.nickname);
            }

            const joinLine = key ? `JOIN ${ch} ${key}` : `JOIN ${ch}`;
            const [joinCmd, ...joinParams] = joinLine.trim().split(' ');
            
            const chmodes = this.channelData.get(ch).modes;
            if (this.isBanned(ch, socket)) {
                await this.safeWriteToSocket(socket, `:${this.servername} 474 ${socket.nickname} ${ch} :Cannot join channel (+b)\r\n`);
                continue;
            }
            if (chmodes.includes('k')) {
                const channelKey = this.channelData.get(ch).key;
                const providedKey = joinParams[1];
                if (!providedKey || providedKey !== channelKey) {
                    code = (this.clientIsWebTV(socket) ? 474 : 475);
                    await this.safeWriteToSocket(socket, `:${this.servername} ${code} ${socket.nickname} ${ch} :Cannot join channel (+k)\r\n`);
                    continue;
                }
            }
            if (chmodes.includes('l')) {
                const limit = this.channelData.get(ch).limit;
                if (limit !== null && this.channelData.get(ch).users.size >= limit) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 471 ${socket.nickname} ${ch} :Cannot join channel (+l)\r\n`);
                    continue;
                }
            }
            if (chmodes.includes('i')) {
                const invited = this.channelData.get(ch).inviteexemptions;
                let isInvited = false;
                for (const inviteMask of invited) {
                    isInvited = this.checkMask(inviteMask, socket);
                    if (isInvited) {
                        break;
                    }
                }
                if (!this.channelData.get(ch).invites.has(socket.nickname) && !isInvited) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 473 ${socket.nickname} ${ch} :Cannot join channel (+i)\r\n`);
                    continue;
                }
                if (this.channelData.get(ch).invites.has(socket.nickname)) {
                    this.channelData.get(ch).invites.delete(socket.nickname);
                }
            }
            if (chmodes.includes('O')) {
                if (!this.isIRCOp(socket.nickname)) {
                    code = (this.clientIsWebTV(socket) ? 474 : 404);
                    await this.safeWriteToSocket(socket, `:${this.servername} ${code} ${socket.nickname} ${ch} :Cannot join channel (+O)\r\n`);
                    continue;
                }
            }
            if (chmodes.includes('S')) {
                if (!socket.secure) {
                    code = (this.clientIsWebTV(socket) ? 474 : 468);
                    await this.safeWriteToSocket(socket, `:${this.servername} ${code} ${socket.nickname} ${ch} :Cannot join channel (+S)\r\n`);
                    continue;
                }
            }
            if (chmodes.includes('R')) {
                if (!this.getUserModes(socket.nickname).includes('r')) {
                    code = (this.clientIsWebTV(socket) ? 474 : 447);
                    await this.safeWriteToSocket(socket, `:${this.servername} ${code} ${socket.nickname} ${ch} :Cannot join channel (+R)\r\n`);
                    continue;
                }
            }

            socket.lastspoke = this.getDate();
            if (!this.channelData.has(ch)) {
                this.createChannel(ch, socket.nickname);
            }
            const channelObj = this.channelData.get(ch);
            channelObj.users.add(socket.nickname);
            await this.broadcastChannelJoin(ch, socket);

            const modes = channelObj.modes;         
            let prefix = '';
            if (channelObj.ops.has(socket.nickname)) {
                prefix += '@';
            } else if (channelObj.halfops.has(socket.nickname)) {
                prefix += '%';
            } else if (channelObj.voices.has(socket.nickname)) {
                prefix += '+';
            }
            await this.broadcastToAllServers(`:${this.serverId} SJOIN ${this.getDate()} ${ch} +${modes.join('')} :${prefix}${socket.uniqueId}\r\n`);
            if (channelObj.topic) {
                const topic = channelObj.topic;
                if (topic) {
                    await this.safeWriteToSocket(socket, `:${this.servername} 332 ${socket.nickname} ${ch} :${topic}\r\n`);
                }
            }
            const multiPrefix = socket.client_caps.includes('multi-prefix');
            const users = this.getUsersInChannel(ch, multiPrefix);
            let output_lines = [];
            const prefixRegex = new RegExp(`^[${this.supported_prefixes[1].replace(/[\]\\-]/g, '\\$&')}]+`);
            if (users.length > 0) {
                users.sort((a, b) => {
                    const cleanA = a.replace(prefixRegex, '');
                    const cleanB = b.replace(prefixRegex, '');
                    const privA = channelObj.ops.has(cleanA) ? 1 : (channelObj.halfops.has(cleanA) ? 2 : (channelObj.voices.has(cleanA) ? 3 : 4));
                    const privB = channelObj.ops.has(cleanB) ? 1 : (channelObj.halfops.has(cleanB) ? 2 : (channelObj.voices.has(cleanB) ? 3 : 4));
                    if (privA !== privB) return privA - privB;
                    return cleanA.localeCompare(cleanB, undefined, { sensitivity: 'base' });
                });
                if (socket.client_caps.includes('userhost-in-names')) {
                    const userHosts = users.map(user => {
                        const nick = this.findUser(user.replace(prefixRegex, ''));
                        const username = this.usernames.get(nick) || 'unknown';
                        const host = this.hostnames.get(nick) || 'unknown';
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
            const awaymsg = this.awaymsgs.get(socket.nickname);
            if (awaymsg) {
                await this.broadcastUserIfCap(socket, `:${socket.nickname}!${socket.username}@${socket.host} AWAY :${awaymsg}\r\n`, socket, 'away-notify');
            }
            if (this.irc_config && Array.isArray(this.irc_config.channels)) {
                const channel_data = this.irc_config.channels.find(cfg => cfg.name === ch);
                if (channel_data && channel_data.intro) {
                    for (const introLine of channel_data.intro) {
                        await this.safeWriteToSocket(socket, `:${ch}!system@${this.servername} PRIVMSG ${ch} :${introLine}\r\n`);
                    }
                }
            }                        
            if (this.clientIsWebTV(socket) && this.enable_webtv_command_hacks) {
                output_lines = [];
                output_lines.push("You have joined " + ch);
                output_lines.push("Current channel modes: +" + channelObj.modes.join(''));
                const isOp = channelObj.ops.has(socket.nickname);
                const isHalfOp = channelObj.halfops.has(socket.nickname);
                const isVoice = channelObj.voices.has(socket.nickname);
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
    },

    async handleCommand_NAMES(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (params.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} NAMES :Not enough parameters\r\n`);
            return;
        }
        const channel = this.findChannel(params[0]);
        if (!channel || !this.channelData.has(channel)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${params[0]} :No such channel\r\n`);
            return;
        }
        const chanModes = this.channelData.get(channel).modes || [];
        const onChannel = this.channelData.get(channel).users.has(socket.nickname);
        if ((chanModes.includes('s') || chanModes.includes('p')) && !onChannel && !this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 366 ${socket.nickname} ${channel} :End of /NAMES list\r\n`);
            return;
        }
        const multiPrefix = socket.client_caps.includes('multi-prefix');
        const users = this.getUsersInChannel(channel, multiPrefix);
        const output_lines = [];
        const prefixRegex = new RegExp(`^[${this.supported_prefixes[1].replace(/[\]\\-]/g, '\\$&')}]+`);
        if (users.length > 0) {
            if (socket.client_caps.includes('userhost-in-names')) {
                const userHosts = users.map(user => {
                    const nick = this.findUser(user.replace(prefixRegex, ''));
                    const username = this.usernames.get(nick) || 'unknown';
                    const host = this.hostnames.get(nick) || 'unknown';
                    return `${user}!${username}@${host}`;
                });
                output_lines.push(`:${this.servername} 353 ${socket.nickname} = ${channel} :${userHosts.join(' ')}\r\n`);
            } else {
                output_lines.push(`:${this.servername} 353 ${socket.nickname} = ${channel} :${users.join(' ')}\r\n`);
            }
        }
        output_lines.push(`:${this.servername} 366 ${socket.nickname} ${channel} :End of /NAMES list\r\n`);
        await this.sendThrottled(socket, output_lines);
    },

    async handleCommand_PART(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        const channel = this.findChannel(params[0]);
        if (!channel || !this.channelData.has(channel) || !this.channelData.get(channel).users.has(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 442 ${socket.nickname} ${params[0]} :You're not on that channel\r\n`);
            return;
        }
        socket.lastspoke = this.getDate();
        if (params.length >= 2) {
            const reason = this.sanitizeTrailingParam(params.slice(1).join(' ').replace(/^:/, ''));
            await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel} :${reason}\r\n`);
            await this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel} :${reason}\r\n`, socket);
            await this.broadcastToAllServers(`:${socket.uniqueId} PART ${channel} :${reason}\r\n`);
        } else {
            await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel}\r\n`);
            await this.broadcastChannel(channel, `:${socket.nickname}!${socket.username}@${socket.host} PART ${channel}\r\n`, socket);
            await this.broadcastToAllServers(`:${socket.uniqueId} PART ${channel}\r\n`);
        }
        this.removeUserFromChannel(socket.nickname, channel);
    },

    async handleCommand_INVITE(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (params.length < 2) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} INVITE :Not enough parameters\r\n`);
            return;
        }
        const invitee = this.findUser(params[0]);
        const channel = this.findChannel(params[1]);
        if (!invitee || !channel) {
            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[0]} :No such nick/channel\r\n`);
            return;
        }
        if (!this.channelData.has(channel)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${channel} :No such channel\r\n`);
            return;
        }
        if (!this.channelData.get(channel).users.has(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 442 ${socket.nickname} ${channel} :You're not on that channel\r\n`);
            return;
        }
        const inviteOnly = this.channelData.get(channel).modes.includes('i');
        if (inviteOnly && !this.isChannelOp(socket.nickname, channel) && !this.isChannelHalfOp(socket.nickname, channel) && !this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :You're not channel operator\r\n`);
            return;
        }
        const inviteeSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === invitee);
        if (!inviteeSocket) {
            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${invitee} :No such nick/channel\r\n`);
            return;
        }
        if (!this.channelData.get(channel).users.has(invitee)) {
            if (this.channelData.get(channel).modes.includes('V')) {
                await this.safeWriteToSocket(socket, `:${this.servername} 482 ${socket.nickname} ${channel} :Cannot invite users, channel is +V (no invites allowed)\r\n`);
                return;
            }
            this.channelData.get(channel).invites.add(invitee);
            await this.safeWriteToSocket(socket, `:${this.servername} 341 ${socket.nickname} ${invitee} ${channel}\r\n`);
            await this.safeWriteToSocket(inviteeSocket, `:${socket.nickname}!${socket.username}@${socket.host} INVITE ${invitee} :${channel}\r\n`);
            await this.broadcastUserIfCap(socket, `:${socket.nickname}!${socket.username}@${socket.host} INVITE ${invitee} ${channel}\r\n`, inviteeSocket, 'invite-notify');
        } else {
            await this.safeWriteToSocket(socket, `:${this.servername} 443 ${socket.nickname} ${invitee} ${channel} :${invitee} is already on that channel\r\n`);
        }
    },

    async handleCommand_LIST(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        let channelsToList;
        if (params.length > 0 && params[0]) {
            channelsToList = params[0].split(',').filter(ch => ch.length > 0);
        } else {
            channelsToList = Array.from(this.channelData.keys());
        }
        await this.safeWriteToSocket(socket, `:${this.servername} 321 ${socket.nickname} :Channel :Users :Topic\r\n`);
        for (let channel of channelsToList) {
            const found = this.findChannel(channel) || (this.channelData.has(channel) ? channel : null);
            if (!found) {
                continue;
            }
            channel = found;
            if (!this.channelprefixes.some(prefix => channel.startsWith(prefix))) {
                continue;
            }
            const modes = this.channelData.get(channel).modes || [];
            if (modes.includes('p') || modes.includes('s')) {
                if (!this.channelData.get(channel).users.has(socket.nickname)) {
                    continue;
                }
            }
            const users = this.getUsersInChannel(channel);
            const topic = this.channelData.get(channel).topic || '';
            await this.safeWriteToSocket(socket, `:${this.servername} 322 ${socket.nickname} ${channel} ${users.length} :${topic}\r\n`);
        }
        await this.safeWriteToSocket(socket, `:${this.servername} 323 ${socket.nickname} :End of /LIST\r\n`);
    },

    async handleCommand_WHO(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!params[0]) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} WHO :Not enough parameters\r\n`);
            return;
        }
        const target = this.findChannel(params[0]) || this.findUser(params[0]) || params[0];

        let whoisSocket;
        let isChannel = false;
        for (const prefix of this.channelprefixes) {
            if (target.startsWith(prefix)) {
                isChannel = true;
                break;
            }
        }
        if (isChannel) {
            const modes = this.channelData.get(target) ? this.channelData.get(target).modes : [];
            if ((modes.includes('p') || modes.includes('s')) && (!this.channelData.has(target) || !this.channelData.get(target).users.has(socket.nickname))) {
                await this.safeWriteToSocket(socket, `:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                return;
            }
            if (this.channelData.has(target)) {
                const users = this.channelData.get(target).users;
                for (const user of users) {
                    let cleanUser = user;
                    if (!user) continue;
                    if (['@', '%', '+'].includes(cleanUser[0])) {
                        cleanUser = cleanUser.slice(1);
                    }
                    const hostname = this.hostnames.get(cleanUser);
                    const username = this.usernames.get(cleanUser) || cleanUser;
                    whoisSocket = Array.from(this.nicknames.keys()).find(
                        s => this.nicknames.get(s).toLowerCase() === cleanUser.toLowerCase()
                    ) || this.getRemoteServerUserSocket(cleanUser);

                    const userSecure = whoisSocket ? whoisSocket.secure : false;
                    let prefix = '';
                    const channelObj = this.channelData.get(target);                              
                    if (channelObj.ops.has(cleanUser)) {
                        prefix = '@';
                    } else if (channelObj.halfops.has(cleanUser)) {
                        prefix = '%';
                    } else if (channelObj.voices.has(cleanUser)) {
                        prefix = '+';
                    }
                    const userinfo = this.userinfo.get(cleanUser) || cleanUser;
                    const flags = `${(this.awaymsgs.has(cleanUser)) ? 'G' : 'H'}${(this.isIRCOp(cleanUser)) ? '*' : ''}${(userSecure) ? 'z' : ''}`;
                    const secondsIdle = whoisSocket ? (this.getDate() - whoisSocket.lastspoke) : 0;
                    await this.safeWriteToSocket(socket, `:${this.servername} 352 ${socket.nickname} ${target} ${username} ${hostname} ${this.servername} ${cleanUser} ${flags} 0 ${secondsIdle} 0 :${userinfo}\r\n`);
                }
            }
            await this.safeWriteToSocket(socket, `:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
        } else {
            const output_lines = [];
            if (target.includes('*') || target.includes('?')) {
                const maskRegex = this.globToRegExp(target);
                let found = false;
                for (const [sock, nick] of this.nicknames.entries()) {
                    if (maskRegex.test(nick)) {
                        const modes = this.getUserModes(nick) || [];
                        if (modes.includes('s') || (modes.includes('i') && nick !== socket.nickname && !this.isIRCOp(socket.nickname))) {
                            continue;
                        }
                        found = true;
                        const username = this.usernames.get(nick) || sock.username || nick;
                        const host = this.hostnames.get(nick) || sock.host || 'unknown';
                        const hopcount = 0;
                        output_lines.push(`:${this.servername} 352 ${socket.nickname} * ${username} ${host} ${this.servername} ${nick} ${(this.awaymsgs.has(nick)) ? 'G' : 'H'}${(sock.secure) ? 'z' : ''} :${hopcount} ${sock.userinfo || ''}\r\n`);
                    }
                }
                if (!found) {
                    output_lines.push(`:${this.servername} 401 ${socket.nickname} ${target} :No such nick/channel\r\n`);
                }
                output_lines.push(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                await this.sendThrottled(socket, output_lines);
            } else {
                whoisSocket = Array.from(this.nicknames.keys()).find(
                    s => this.nicknames.get(s).toLowerCase() === target.toLowerCase()
                );
                if (whoisSocket) {
                    if (this.getUserModes(whoisSocket.nickname).includes('s')) {
                        output_lines.push(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                        await this.sendThrottled(socket, output_lines);
                        return;
                    }
                    output_lines.push(`:${this.servername} 352 ${socket.nickname} * ${whoisSocket.nickname} ${whoisSocket.host} ${this.servername} ${whoisSocket.nickname} ${(this.awaymsgs.has(target)) ? 'G' : 'H'}${(whoisSocket.secure) ? 'z' : ''} :0 ${whoisSocket.userinfo}\r\n`);
                } else {
                    output_lines.push(`:${this.servername} 401 ${socket.nickname} ${target} :No such nick/channel\r\n`);
                }
                output_lines.push(`:${this.servername} 315 ${socket.nickname} ${target} :End of /WHO list\r\n`);
                await this.sendThrottled(socket, output_lines);
            }
        }
    },

    async handleCommand_PRIVMSG(socket, params, line) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        socket.lastspoke = this.getDate();
        if (params[0]) {
            const target = params[0];
            const targets = target.includes(',') ? target.split(',') : [target];
            let msg;
            if (targets.length > this.maxtargets) {
                await this.safeWriteToSocket(socket, `:${this.servername} 407 ${socket.nickname} :Too many targets. Maximum allowed is ${this.maxtargets}\r\n`);
                return;
            }
            for (let t of targets) {
                if (t === this.servername) {
                    msg = line.slice(line.indexOf(':', 1) + 1);
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
                    await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[0]} :No such nick/channel\r\n`);
                    continue;
                }
                const channelObj = this.channelData.get(t);                            
                msg = this.sanitizeTrailingParam(line.slice(line.indexOf(':', 1) + 1));
                if (isChan) {
                    if (!channelObj.users.has(socket.nickname)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel\r\n`);
                        continue;
                    }
                    if (this.isBanned(t, socket)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (banned)\r\n`);
                        continue;
                    }
                    if (channelObj.modes.includes('Z') && !socket.secure) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+Z)\r\n`);
                        continue;
                    }
                    if (channelObj.modes.includes('m')) {
                        if (!channelObj.voices.has(socket.nickname) && !channelObj.ops.has(socket.nickname) && !channelObj.halfops.has(socket.nickname)) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+m)\r\n`);
                            continue;
                        }
                    }
                    if (channelObj.modes.includes('c')) {
                        if (/[\x00-\x09\x0B\x0C\x0E-\x1F]/.test(msg)) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+c)\r\n`);
                            continue;
                        }
                    }
                    if (channelObj.modes.includes('C')) {
                        if (msg.includes('\x01')) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+C)\r\n`);
                            continue;
                        }
                    }
                    if (channelObj.modes.includes('O')) {
                        if (!this.isIRCOp(socket.nickname)) {
                            await this.safeWriteToSocket(socket, `:${this.servername} 404 ${socket.nickname} ${t} :Cannot send to channel (+O)\r\n`);
                            continue;
                        }
                    }
                }
                if (isChan) {
                    if (!this.channelData.has(t)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 403 ${socket.nickname} ${t} :No such channel\r\n`);
                        continue;
                    }
                    if (this.clientIsWebTV(socket) && msg.startsWith('/') && this.enable_webtv_command_hacks) {
                        const wtvcmd = msg.slice(1).split(' ');
                        if (wtvcmd[0].length > 0) {
                            const cmdUpper = wtvcmd[0].toUpperCase();
                            if (this.supported_webtv_command_hacks.includes(cmdUpper)) {
                                const handlerName = `handleCommand_${cmdUpper}`;
                                if (typeof this[handlerName] === 'function') {
                                    await this[handlerName](socket, [t, ...wtvcmd.slice(1)], msg);
                                }
                            }
                        }
                        continue;
                    }
                    const chanMsg = `:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${t} :${msg}\r\n`;
                    await this.broadcastChannel(t, chanMsg, socket);
                    await this.broadcastToAllServers(`:${socket.uniqueId} PRIVMSG ${t} :${msg}\r\n`);
                    if (socket.client_caps && socket.client_caps.includes('echo-message')) {
                        await this.safeWriteToSocket(socket, chanMsg);
                    }
                } else {
                    if (this.awaymsgs.has(t)) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 301 ${socket.nickname} ${t} :${this.awaymsgs.get(t)}\r\n`);
                    }
                    const targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s).toLowerCase() === t.toLowerCase()) || this.getRemoteServerUserSocket(t);
                    if (!targetSock) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${t} :No such nick/channel\r\n`);
                        continue;
                    }
                    if (targetSock.isserver) {
                        const sender_id = this.getUniqueId(socket.nickname);
                        const unique_id = this.getUniqueId(t);
                        await this.safeWriteToSocket(targetSock, `:${sender_id} PRIVMSG ${unique_id} :${msg}\r\n`);
                        continue;
                    }
                    const targetUserModes = this.getUserModes(t) || [];
                    const usermodes = this.getUserModes(socket.nickname) || [];
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
                    if (usermodes.includes('Z') && !targetUserModes.includes('Z')) {
                        await this.safeWriteToSocket(socket, `:${this.servername} 484 ${socket.nickname} ${t} :Cannot send to non-+Z user while you are +Z\r\n`);
                        continue;
                    }
                    await this.safeWriteToSocket(targetSock, `:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${targetSock.nickname} :${msg}\r\n`);
                    if (socket.client_caps && socket.client_caps.includes('echo-message')) {
                        await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} PRIVMSG ${targetSock.nickname} :${msg}\r\n`);
                    }
                }
            }
        }
    },

    async handleCommand_NOTICE(socket, params, line) {
        if (!(await this.checkRegistered(socket, false, true)) && params[0] !== this.servername) {                        
            return;
        }
        socket.lastspoke = this.getDate();
        if (params[0]) {
            const target = params[0];
            const targets = target.includes(',') ? target.split(',') : [target];
            let msg;
            if (targets.length > this.maxtargets) {
                await this.safeWriteToSocket(socket, `:${this.servername} 407 ${socket.nickname} :Too many targets. Maximum allowed is ${this.maxtargets}\r\n`);
                return;
            }
            for (const t of targets) {
                let isChan = false;
                if (t === this.servername) { 
                    msg = line.slice(line.indexOf(':', 1) + 1);
                    if (msg.startsWith('\x01VERSION')) {
                        socket.client_version = msg.replace('\x01VERSION ', '').replace('\x01', '');
                        break;
                    }
                }
                let foundT = t;
                for (const prefix of this.channelprefixes) {
                    if (t.startsWith(prefix)) {
                        isChan = true;
                        foundT = this.findChannel(t);
                        break;
                    }
                }
                if (!isChan) {
                    foundT = this.findUser(t);
                }                            
                if (!foundT) {
                    continue;
                }
                const channelObj = this.channelData.get(foundT);
                msg = this.sanitizeTrailingParam(line.slice(line.indexOf(':', 1) + 1));
                if (isChan) {
                    if (!this.channelData.has(foundT)) {
                        continue;
                    }
                    if (channelObj.modes.includes('T')) {
                        continue; // no notices
                    }
                    if (channelObj.modes.includes('n')) {
                        if (!this.channelData.get(foundT).users.has(socket.nickname)) {
                            continue;
                        }
                    }
                    if (this.isBanned(foundT, socket)) {
                        continue;
                    }
                    if (channelObj.modes.includes('m')) {
                        if (!channelObj.voices.has(socket.nickname) && !channelObj.ops.has(socket.nickname) && !channelObj.halfops.has(socket.nickname)) {
                            continue;
                        }
                    }
                    if (channelObj.modes.includes('O') && !this.isIRCOp(socket.nickname)) {
                        continue;
                    }
                    if (channelObj.modes.includes('c')) {
                        if (/[\x00-\x09\x0B\x0C\x0E-\x1F]/.test(msg)) {
                            continue;
                        }
                    }
                    if (channelObj.modes.includes('C')) {
                        if (msg.includes('\x01')) {
                            continue;
                        }
                    }
                    if (channelObj.modes.includes('Z') && !socket.secure) {
                        continue;
                    }
                    const noticeLine = `:${socket.nickname}!${socket.username}@${socket.host} NOTICE ${foundT} :${msg}\r\n`;
                    await this.broadcastChannel(foundT, noticeLine, socket);
                    await this.broadcastToAllServers(`:${socket.uniqueId} NOTICE ${foundT} :${msg}\r\n`);
                    if (socket.client_caps && socket.client_caps.includes('echo-message')) {
                        await this.safeWriteToSocket(socket, noticeLine);
                    }
                } else {
                    const targetSock = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s).toLowerCase() === foundT.toLowerCase()) || this.getRemoteServerUserSocket(foundT);
                    if (!targetSock) {
                        continue;
                    }
                    if (targetSock.isserver) {
                        const sender_id = this.getUniqueId(socket.nickname);
                        const unique_id = this.getUniqueId(foundT);
                        await this.safeWriteToSocket(targetSock, `:${sender_id} NOTICE ${unique_id} :${msg}\r\n`);
                        continue;
                    }
                    const targetUserModes = this.getUserModes(foundT) || [];
                    const usermodes = this.getUserModes(socket.nickname) || [];
                    if (targetUserModes.includes('R') && !usermodes.includes('r')) {
                        continue;
                    }
                    if (targetUserModes.includes('Z') && !socket.secure) {
                        continue;
                    }
                    if (usermodes.includes('Z') && !targetUserModes.includes('Z')) {
                        continue;
                    }
                    const cmd = this.clientIsWebTV(targetSock) ? 'PRIVMSG' : 'NOTICE';
                    await this.safeWriteToSocket(targetSock, `:${socket.nickname}!${socket.username}@${socket.host} ${cmd} ${targetSock.nickname} :${msg}\r\n`);
                    if (socket.client_caps && socket.client_caps.includes('echo-message')) {
                        await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} NOTICE ${targetSock.nickname} :${msg}\r\n`);
                    }
                }
            }
        }
    },

    async handleCommand_SYSTEM(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
            this.debugLog('warn', `SYSTEM command attempted by non-IRCOp: ${socket.nickname}`);
            return;
        }
        const type = params[0] ? params[0].toUpperCase() : '';
        const output_lines = [];
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
                    output_lines.push(`:${this.servername} 200 ${socket.nickname} :Channel: ${channelName}\r\n`);
                    for (const [key, value] of Object.entries(channelObj)) {
                        let valStr;
                        if (key === 'key') {
                            valStr = value ? '***' : String(value);
                        } else if (key === 'bans' || key === 'exemptions' || key === 'inviteexemptions') {
                            valStr = String(Array.isArray(value) ? value.length : 0);
                        } else if (value instanceof Set) {
                            valStr = Array.from(value).join(', ');
                        } else if (typeof value === 'object' && value !== null) {
                            valStr = JSON.stringify(value);
                        } else {
                            valStr = String(value);
                        }
                        output_lines.push(`:${this.servername} 200 ${socket.nickname} :  ${key}: ${valStr}\r\n`);
                    }
                }
                break;
            default:
                output_lines.push(`:${this.servername} 500 ${socket.nickname} :Unknown debug command\r\n`);
                break;
        }
        await this.sendThrottled(socket, output_lines);
    },

    async handleCommand_PING(socket, params) {
        const token = params.length ? params.join(' ') : this.servername;
        const clean = token.startsWith(':') ? token.slice(1) : token;
        await this.safeWriteToSocket(socket, `:${this.servername} PONG ${this.servername} :${clean}\r\n`);
    },

    async handleCommand_KLINE(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
            this.debugLog('warn', `KLINE command attempted by non-IRCOp: ${socket.nickname}`);
            return;
        }
        if (params.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} KLINE :Not enough parameters\r\n`);
            return;
        }
        let targetMask = params[0];
        let expiry = this.getDate() + 3600;
        let reasonParam = 1;
        if (!isNaN(parseInt(targetMask))) {
            expiry = this.getDate() + parseInt(targetMask);
            targetMask = params[1];
            reasonParam = 2;
        }
        if (this.klines.findIndex(k => k.mask === targetMask) !== -1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 200 ${socket.nickname} ${targetMask} :KLINE already exists for this mask\r\n`);
            return;
        }
        const reason = params.slice(reasonParam).join(' ') || '';
        const kline = {
            "mask": targetMask,
            "expiry": expiry,
            "reason": reason
        };
        this.klines.push(kline);
        this.saveKLinesToFile();
        if (reason) {
            await this.safeWriteToSocket(socket, `:${this.servername} 381 ${socket.nickname} :KLINE added for ${targetMask} (duration ${expiry - this.getDate()} seconds) [${reason}]\r\n`);
        } else {
            await this.safeWriteToSocket(socket, `:${this.servername} 381 ${socket.nickname} :KLINE added for ${targetMask} (duration ${expiry - this.getDate()} seconds)\r\n`);
        }
        await this.scanUsersForKLines();
    },

    async handleCommand_UNKLINE(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
            this.debugLog('warn', `UNKLINE command attempted by non-IRCOp: ${socket.nickname}`);
            return;
        }
        if (params.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} UNKLINE :Not enough parameters\r\n`);
            return;
        }
        const targetMask = params[0];
        const klineIndex = this.klines.findIndex(k => k.mask === targetMask);
        if (klineIndex === -1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 200 ${socket.nickname} ${targetMask} :No such KLINE\r\n`);
            return;
        }
        this.klines.splice(klineIndex, 1);
        this.saveKLinesToFile();
        await this.safeWriteToSocket(socket, `:${this.servername} 381 ${socket.nickname} :KLINE removed for ${targetMask}\r\n`);
    },

    async handleCommand_WHOIS(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (params.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} WHOIS :Not enough parameters\r\n`);
            return;
        }
        let whoisNick = params[0];
        const nickCheck = this.findUser(whoisNick);
        if (!nickCheck) {
            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${whoisNick} :No such nick/channel\r\n`);
            return;
        }
        whoisNick = nickCheck;
        const whoisSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === whoisNick);
        if (!whoisSocket) {
            const srvSocket = this.getRemoteServerUserSocket(whoisNick);
            const unique_id = this.getUniqueId(whoisNick);
            if (srvSocket && unique_id) {
                await this.safeWriteToSocket(srvSocket, `:${socket.uniqueId} WHOIS ${unique_id}\r\n`);
                return;
            }
            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${whoisNick} :No such nick/channel\r\n`);
            return;
        }
        const whois_username = this.usernames.get(whoisNick) || whoisSocket.username || whoisNick;
        const userinfo = this.userinfo.get(whoisNick) || whoisSocket.userinfo || 'unknown';
        const host = this.hostnames.get(whoisNick) || whoisSocket.host || 'unknown';
        await this.safeWriteToSocket(socket, `:${this.servername} 311 ${socket.nickname} ${whoisNick} ${whois_username} ${host} * :${userinfo}\r\n`);
        if (this.awaymsgs.has(whoisNick)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 301 ${socket.nickname} ${whoisNick} :${this.awaymsgs.get(whoisNick)}\r\n`);
        }
        const userChannels = [];
        const output_lines = [];
        for (const [ch, channelObj] of this.channelData.entries()) {
            if (channelObj.users.has(whoisNick)) {
                let prefix = '';
                const chanops = channelObj.ops;
                const chanhalfops = channelObj.halfops;
                const chanvoices = channelObj.voices;
                const modes = channelObj.modes;

                if ((modes.includes('p') || modes.includes('s')) && (!this.channelData.has(ch) || !this.channelData.get(ch).users.has(socket.nickname))) {
                    continue;
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
        output_lines.push(`:${this.servername} 312 ${socket.nickname} ${whoisNick} ${this.servername} :zefIRCd-${this.version}\r\n`);
        if (this.isIRCOp(whoisNick)) {
            output_lines.push(`:${this.servername} 313 ${socket.nickname} ${whoisNick} :is an IRC operator\r\n`);
        }
        const usermodes = this.getUserModes(whoisNick);
        if ((usermodes && usermodes.includes('z')) || whoisSocket.secure) {
            output_lines.push(`:${this.servername} 671 ${socket.nickname} ${whoisNick} :is using a secure connection\r\n`);
        }
        if (usermodes && usermodes.includes('r')) {
            output_lines.push(`:${this.servername} 307 ${socket.nickname} ${whoisNick} :is a registered nick\r\n`);
        }
        if (usermodes && usermodes.includes('B')) {
            output_lines.push(`:${this.servername} 335 ${socket.nickname} ${whoisNick} :is a bot\r\n`);
        }
        const now = this.getDate();
        const userTimestamp = whoisSocket.lastspoke || now;
        const idleTime = now - userTimestamp;
        output_lines.push(`:${this.servername} 317 ${socket.nickname} ${whoisNick} ${idleTime} ${this.usersignontimestamps.get(whoisNick) || 0} :seconds idle, signon time\r\n`);
        if (userChannels.length > 0) {
            output_lines.push(`:${this.servername} 319 ${socket.nickname} ${whoisNick} :${userChannels.join(' ')}\r\n`);
        }
        output_lines.push(`:${this.servername} 318 ${socket.nickname} ${whoisNick} :End of /WHOIS list\r\n`);
        await this.sendThrottled(socket, output_lines);
    },

    async handleCommand_KILL(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
            this.debugLog('warn', `KILL command attempted by non-IRCOp: ${socket.nickname}`);
            return;
        }
        if (params.length < 2) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} KILL :Not enough parameters\r\n`);
            return;
        }
        const target_nick = this.findUser(params[0]);
        if (!target_nick) {
            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${params[0]} :No such nick/channel\r\n`);
            return;
        }

        const cleanKillReason = this.sanitizeTrailingParam(params.slice(1).join(' ').replace(/^:/, ''));
        const targetSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === target_nick);
        if (!targetSocket) {
            await this.safeWriteToSocket(socket, `:${this.servername} 401 ${socket.nickname} ${target_nick} :No such nick/channel\r\n`);
            return;
        }

        await this.safeWriteToSocket(targetSocket, `ERROR :Closing Link: ${target_nick}[${targetSocket.realhost || targetSocket.remoteAddress}] (Killed (${socket.nickname} (${cleanKillReason})))\r\n`);
        await this.broadcastUser(target_nick, `:${socket.nickname}!${socket.username}@${socket.host} KILL ${target_nick} :${cleanKillReason}\r\n`);
        await this.broadcastToAllServers(`:${socket.uniqueId} KILL ${targetSocket.uniqueId} :${cleanKillReason}\r\n`);
        this.terminateSession(targetSocket, true);
    },

    async handleCommand_QUIT(socket, params) {
        if (!socket.nickname || !socket.registered) {
            this.terminateSession(socket, true);
            return;
        }
        if (params.length > 0) {
            const reason = this.sanitizeTrailingParam(params.join(' ').replace(/^:/, ''));
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
    },

    async handleCommand_MOTD(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        await this.doMOTD(socket.nickname, socket);
    },

    async handleCommand_VERSION(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        await this.safeWriteToSocket(socket, `:${this.servername} 351 ${socket.nickname} ${this.servername} zefIRCd ${this.version} :zefIRCd IRC server - a part of the zefie minisrv project\r\n`);
    },

    async handleCommand_WALLOPS(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isIRCOp(socket.nickname)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
            this.debugLog('warn', `WALLOPS command attempted by non-IRCOp: ${socket.nickname}`);
            return;
        }
        if (params.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} WALLOPS :Not enough parameters\r\n`);
            return;
        }
        const wallopsMessage = this.sanitizeTrailingParam(params.join(' ').replace(/^:/, ''));
        await this.broadcastWallops(`:${socket.nickname}!${socket.username}@${socket.host} WALLOPS :${wallopsMessage}\r\n`);
    },

    async handleCommand_VHOST(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isIRCOp(socket.nickname) && !this.allow_public_vhosts) {
            await this.safeWriteToSocket(socket, `:${this.servername} 481 ${socket.nickname} :Permission denied - you are not an IRC operator\r\n`);
            this.debugLog('warn', `VHOST command attempted by non-IRCOp: ${socket.nickname}`);
            return;
        }
        if (params.length < 1) {
            await this.safeWriteToSocket(socket, `:${this.servername} 461 ${socket.nickname} VHOST :Not enough parameters\r\n`);
            return;
        }
        const newVHost = params[0];
        if (!newVHost || !/^[a-zA-Z0-9.-]+$/.test(newVHost)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 501 ${socket.nickname} :Invalid VHost format\r\n`);
            return;
        }
        const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Pattern = /^([a-fA-F0-9:]+:+)+[a-fA-F0-9]+$/;
        if (ipv4Pattern.test(newVHost) || ipv6Pattern.test(newVHost)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 501 ${socket.nickname} :VHost cannot be an IP address\r\n`);
            return;
        }
        if (!this.isIRCOp(socket.nickname) && this.allow_public_vhosts) {
            const suffixes = this.vhost_suffixes || [];
            if (suffixes.length === 0 || !suffixes.some(s => typeof s === 'string' && newVHost.toLowerCase().endsWith(s.toLowerCase()))) {
                await this.safeWriteToSocket(socket, `:${this.servername} 501 ${socket.nickname} :VHost must end with an allowed suffix\r\n`);
                return;
            }
        }
        dns.lookup(newVHost, async (err, address) => {
            if (!err && address) {
                await this.safeWriteToSocket(socket, `:${this.servername} 501 ${socket.nickname} :VHost must not resolve to a real IP (resolved to: ${address})\r\n`);
                return;
            }
            if (socket.destroyed || socket._terminated) {
                return;
            }
            socket.host = newVHost;
            this.hostnames.set(socket.nickname, newVHost);
            if (socket.client_caps && socket.client_caps.includes('chghost')) {
                await this.safeWriteToSocket(socket, `:${socket.nickname}!${socket.username}@${socket.host} CHGHOST ${socket.username} ${socket.host}\r\n`);
            }
            await this.safeWriteToSocket(socket, `:${this.servername} 396 ${socket.nickname} ${socket.host} :is now your visible host\r\n`);
        });
    },

    async handleCommand_STARTTLS(socket, params) {
        if (!this.enable_tls) {
            await this.safeWriteToSocket(socket, `:${this.servername} 691 ${socket.nickname || '*'} :TLS is not enabled on this server\r\n`);
            return;
        }
        if (socket.secure) {
            await this.safeWriteToSocket(socket, `:${this.servername} 691 ${socket.nickname || '*'} :STARTTLS failed (already using TLS)\r\n`);
            return;
        }
        socket.upgrading_to_tls = true;
        await this.safeWriteToSocket(socket, `:${this.servername} 670 ${socket.nickname || '*'} :STARTTLS successful, go ahead with TLS handshake\r\n`);
    },

    async handleCommand_ISON(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        const online = [];
        for (const nick of params) {
            const found = this.findUser(nick);
            if (found) online.push(found);
        }
        await this.safeWriteToSocket(socket, `:${this.servername} 303 ${socket.nickname} :${online.join(' ')}\r\n`);
    },

    async handleCommand_USERHOST(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        const parts = [];
        for (const nick of params.slice(0, 5)) {
            const found = this.findUser(nick);
            if (!found) continue;
            const username = this.usernames.get(found) || found;
            const host = this.hostnames.get(found) || 'unknown';
            const away = this.awaymsgs.has(found) ? '-' : '+';
            parts.push(`${found}=${away}${username}@${host}`);
        }
        await this.safeWriteToSocket(socket, `:${this.servername} 302 ${socket.nickname} :${parts.join(' ')}\r\n`);
    },

    async handleCommand_TIME(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        await this.safeWriteToSocket(socket, `:${this.servername} 391 ${socket.nickname} ${this.servername} :${new Date().toString()}\r\n`);
    },

    async handleCommand_LUSERS(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        await this.sendThrottled(socket, this.buildLusersLines(socket.nickname));
    },

    async handleCommand_ADMIN(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        const owner = (this.minisrv_config.config && this.minisrv_config.config.service_owner) || 'minisrv admin';
        const contact = (this.minisrv_config.config && this.minisrv_config.config.service_owner_contact) || 'admin@local';
        await this.safeWriteToSocket(socket, `:${this.servername} 256 ${socket.nickname} :Administrative info about ${this.servername}\r\n`);
        await this.safeWriteToSocket(socket, `:${this.servername} 257 ${socket.nickname} :${owner}\r\n`);
        await this.safeWriteToSocket(socket, `:${this.servername} 258 ${socket.nickname} :${contact}\r\n`);
        await this.safeWriteToSocket(socket, `:${this.servername} 259 ${socket.nickname} :${contact}\r\n`);
    },

    async handleCommand_INFO(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        const lines = [
            `:${this.servername} 371 ${socket.nickname} :zefIRCd v${this.version} - IRC server powered by minisrv\r\n`,
            `:${this.servername} 371 ${socket.nickname} :https://github.com/zefie/zefie_wtvp_minisrv\r\n`,
            `:${this.servername} 374 ${socket.nickname} :End of /INFO list\r\n`
        ];
        await this.sendThrottled(socket, lines);
    },

    async handleCommand_STATS(socket, params) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        const query = (params[0] || '').toLowerCase();
        if (query === 'u') {
            await this.safeWriteToSocket(socket, this.formatStatsUptimeLine(socket.nickname));
        } else if (query === 'o') {
            await this.safeWriteToSocket(socket, `:${this.servername} 243 ${socket.nickname} O ${this.oper_enabled ? 'enabled' : 'disabled'} :IRC operator support\r\n`);
        } else {
            await this.safeWriteToSocket(socket, `:${this.servername} 219 ${socket.nickname} ${query || '*'} :End of /STATS report\r\n`);
            return;
        }
        await this.safeWriteToSocket(socket, `:${this.servername} 219 ${socket.nickname} ${query} :End of /STATS report\r\n`);
    }
};
