module.exports = {
    async handleServerCommand_PASS(socket, parts) {
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
            setTimeout((sock) => {
                if (sock) {
                    sock.error_count--;
                }
            }, 60000, socket);
            if (socket.error_count >= 5) {
                await this.safeWriteToSocket(socket, `:${this.servername} :ERROR :Too many errors, disconnecting\r\n`);
                this.terminateSession(socket, true);
            }
            return;
        }                    
        socket.serverinfo = matchedServer;
    },

    async handleServerCommand_CAPAB(socket, parts) {
        if (!this.checkRegistered(socket, true)) {
            return;
        }
        if (parts.length < 2) {
            this.debugLog('warn', 'Invalid CAPAB command from server');
            return;
        }
        var capabilities = parts.slice(1).join(' ').slice(1);
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
    },

    async handleServerCommand_SERVER(socket, parts, line) {
        if (!this.checkRegistered(socket, true)) {
            return;
        }
        if (parts.length < 6) {
            this.debugLog('warn', 'Invalid SERVER command from server');
            return;
        }
        var serverName = parts[1];
        var serverNumber = parts[2];
        var serverId = parts[3];
        var serverExtra = parts[4];
        var serverInfo = parts.slice(5).join(' ');
        socket.isserver = true;
        this.clients = this.clients.filter(c => c !== socket);
        this.clientpeak = this.clientpeak - 1;
        socket.registered = true;
        socket.servername = serverName;
        socket.uniqueId = serverId;
        socket.serverIdent = line;
        this.servers.set(socket, serverName);
        await this.safeWriteToSocket(socket, `SERVER ${this.servername} 1 ${this.serverId} + :${this.server_hello}\r\n`);
        for (const [sock, nickname] of this.nicknames.entries()) {
            if (!sock || !nickname) continue;
            const uniqueId = sock.uniqueId;
            const signonTime = Math.floor(this.usersignontimestamps.get(nickname) || this.getDate());
            const userModes = this.getUserModes(nickname).join('');
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
        await this.safeWriteToSocket(socket, `:${this.serverId} EOB \r\n`);
    },

    async handleServerCommand_SVINFO(socket, parts) {
        if (!this.checkRegistered(socket, true)) {
            return;
        }
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SVINFO command from server');
            return;
        }
        const serverInfoMessage = `:${this.serverId} SVINFO 6 6 0 ${this.getDate()}\r\n`;
        await this.safeWriteToSocket(socket, serverInfoMessage);
    },

    async handleServerCommand_PING(socket, parts) {
        var pong = parts.slice(1).join(' ');
        if (pong.startsWith(':')) {
            pong = pong.slice(1);
        }
        await this.safeWriteToSocket(socket, `:${this.serverId} PONG ${pong}\r\n`);
    },

    async handleServerCommand_PONG(socket, parts) {
        // Ignore PONG from server
    },

    async handleServerCommand_RESV(socket, parts) {
        if (!this.checkRegistered(socket)) {
            return;
        }
        if (parts.length < 2) {
            this.debugLog('warn', 'Invalid RESV command from server');
            return;
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
    },

    async handleServerCommand_UID(socket, parts) {
        if (!this.checkRegistered(socket)) {
            return;
        }
        if (parts.length < 10) {
            this.debugLog('warn', 'Invalid UID command from server');
            return;
        }
        var nickname = parts[1];
        const server_Id = parts[2];
        const timestamp = parseInt(parts[3]) || 0;
        const userModes = parts[4].replace(/^\+/, "").split('');
        var username = parts[5];
        var hostname = parts[6];
        const ipaddress = parts[7];
        const ipaddress2 = parts[8];
        const userUniqueId = parts[9];
        var userinfo = parts.slice(10).join(' ').slice(1);
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
    },

    async handleServerCommand_SVSHOST(socket, parts) {
        if (!this.checkRegistered(socket)) {
            return;
        }
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SVSHOST command from server');
            return;
        }
        var uniqueId = parts[1];
        var hostname = parts[3];
        var targetSocket = this.findSocketByUniqueId(uniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for unique ID ${uniqueId}`);
            return;
        }
        this.hostnames.set(this.findUserByUniqueId(uniqueId), hostname);
        targetSocket.host = hostname;
        if (targetSocket.client_caps && targetSocket.client_caps.includes('CHGHOST')) {
            await this.safeWriteToSocket(targetSocket, `:${targetSocket.nickname}!${targetSocket.username}@${targetSocket.host} CHGHOST ${targetSocket.username} ${targetSocket.host}\r\n`);
        }
        await this.safeWriteToSocket(targetSocket, `:${this.servername} 396 ${targetSocket.nickname} ${targetSocket.host} :is now your visible host\r\n`);
        await this.broadcastToAllServers(`:${socket.servername} SVSHOST ${uniqueId} ${hostname}\r\n`, socket);
    },

    async handleServerCommand_SVSACCOUNT(socket, parts) {
        if (!this.checkRegistered(socket)) {
            return;
        }
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SVSACCOUNT command from server');
            return;
        }
        var uniqueId = parts[1];
        var accountName = parts[3];
        var nickname = this.findUserByUniqueId(uniqueId);
        if (!nickname) {
            this.debugLog('warn', `No user found for unique ID ${uniqueId}`);
            return;
        }
        if (accountName === '*') {
            this.accounts.delete(nickname);
        } else {
            this.accounts.set(nickname, accountName);
        }
        var targetSocket = this.findSocketByUniqueId(uniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for unique ID ${uniqueId}`);
            return;
        }
        if (targetSocket.client_caps && targetSocket.client_caps.includes('account-notify')) {
            await this.safeWriteToSocket(targetSocket, `:${targetSocket.nickname}!${targetSocket.username}@${targetSocket.host} ACCOUNT ${accountName}\r\n`);
        }
    },

    async handleServerCommand_SVSNICK(socket, parts, line) {
        if (!this.checkRegistered(socket)) {
            return;
        }
        if (parts.length < 5) {
            this.debugLog('warn', 'Invalid SVSNICK command from server');
            return;
        }
        var oldNick = this.findUserByUniqueId(parts[1]);
        var newNick = parts[3];
        var targetSocket = this.findSocketByUniqueId(parts[1]);
        await this.broadcastUser(oldNick, `:${oldNick}!${this.usernames.get(oldNick)}@${targetSocket.host} NICK :${newNick}\r\n`);
        this.processNickChange(targetSocket, newNick);
        await this.broadcastToAllServers(line, socket);
    },

    async handleServerCommand_SJOIN(socket, parts) {
        if (!this.checkRegistered(socket)) {
            return;
        }
        var channel = parts[2];
        var modes = parts[3];
        var uniqueId = parts[4];
        if (uniqueId.startsWith(':')) {
            uniqueId = uniqueId.slice(1);
        }                
        if (!uniqueId) {
            await this.broadcastToAllServers(`:${socket.servername} SJOIN ${this.getDate()} ${channel} +${modes} :\r\n`, socket);
            return;
        }
        while (['@', '%', '+'].includes(uniqueId[0])) {
            uniqueId = uniqueId.slice(1);
        }
        var userSocket = this.findSocketByUniqueId(uniqueId);
        var nickname = this.findUserByUniqueId(uniqueId);
        var username = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname);
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
    },

    async handleServerCommand_SQUIT(socket, parts) {
        await this.broadcastToAllServers(`:${socket.servername} SQUIT ${parts[1]} :${parts.slice(2).join(' ').slice(1)}\r\n`, socket);
        this.servers.delete(socket);
    },

    async handleServerNumericReply(socket, command, parts, line) {
        if (!this.checkRegistered(socket)) {
            return;
        }
        var senderID = parts[1];
        var targetSocket = this.findSocketByUniqueId(senderID);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for unique ID ${senderID}`);
            return;
        }                
        var responded = false;
        switch (command) {
            case '307':
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
            return;
        }
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid numeric reply from server');
            return;
        }
        const numericCode = parts[0];
        const targetID = parts[1];
        var numericMessage = parts.slice(3).join(' ');
        if (numericMessage.startsWith(':')) {
            numericMessage = numericMessage.slice(1);
        }

        if (!targetSocket) {
            this.debugLog('warn', `No socket found for target unique ID ${targetID}`);
            return;
        }
        await this.safeWriteToSocket(targetSocket, `:${socket.serverinfo.name} ${numericCode} ${targetID} :${numericMessage}\r\n`);
    },

    // Prefix command handlers (default case in processServerData)
    async handleServerPrefixCommand_QUIT(socket, nickname, sourceUniqueId, parts) {
        var user_name = this.usernames.get(nickname) || nickname;
        var message = parts.slice(2).join(' ').slice(1);
        const serverUsers = this.serverusers.get(socket);
        if (serverUsers && typeof serverUsers.delete === 'function') {
            const nickToRemove = this.findUserByUniqueId(sourceUniqueId);
            serverUsers.delete(nickToRemove);
            this.cleanupUserSession(nickToRemove);
        }
        await this.broadcastToAllServers(`:${nickname}!${user_name}@${this.servername} QUIT :${message}\r\n`, socket);
    },

    async handleServerPrefixCommand_JOIN(socket, nickname, sourceUniqueId, parts) {
        var channel = this.findChannel(parts[3]);
        if (!channel || !this.channelData.has(channel)) {
            channel = parts[3];
            this.createChannel(channel);
        }
        var userSocket = this.findSocketByUniqueId(sourceUniqueId);
        if (!userSocket) {
            this.debugLog('warn', `No socket found for source unique ID ${sourceUniqueId}`);
            return;
        }
        var username = this.usernames.get(nickname) || nickname;
        if (!this.channelData.get(channel).users.has(nickname)) {
            this.channelData.get(channel).users.add(nickname);
        }
        await this.broadcastChannelJoin(channel, userSocket);
        await this.broadcastToAllServers(`:${sourceUniqueId} JOIN ${channel}\r\n`, socket);
    },

    async handleServerPrefixCommand_PART(socket, nickname, sourceUniqueId, parts) {
        var channel = this.findChannel(parts[2]);
        if (!channel) {
            this.debugLog('warn', `No channel found for PART command: ${parts[2]}`);
            return;
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

        var userSocket = this.findSocketByUniqueId(sourceUniqueId);
        var username = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname);                            
        await this.broadcastChannel(channel, `:${nickname}!${username}@${hostname} PART ${channel} :${parts.slice(4).join(' ')}\r\n`, userSocket);
        if (this.channelData.has(channel) && this.channelData.get(channel).users.size === 0) {
            this.deleteChannel(channel);
        }
        await this.broadcastToAllServers(`:${sourceUniqueId} PART ${channel} :${parts.slice(4).join(' ')}\r\n`, socket);
    },

    async handleServerPrefixCommand_GLOBOPS(socket, nickname, sourceUniqueId, parts) {
        var message = parts.slice(3).join(' ');
        await this.broadcastToAllServers(`:${sourceUniqueId} GLOBOPS :${message}`, socket);
    },

    async handleServerPrefixCommand_TBURST(socket, nickname, sourceUniqueId, parts) {
        if (parts.length < 6) {
            this.debugLog('warn', `Invalid TBURST command from server: ${parts.join(' ')}`);
            return;
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
    },

    async handleServerPrefixCommand_KILL(socket, nickname, sourceUniqueId, parts, line) {
        if (parts.length < 3) {
            this.debugLog('warn', `Invalid KILL command from server: ${line}`);
            return;
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
    },

    async handleServerPrefixCommand_MODE(socket, nickname, sourceUniqueId, parts) {
        var targetUniqueId = parts[2];
        if (this.channelprefixes.some(prefix => targetUniqueId.startsWith(prefix))) {
            var targetChannel = this.findChannel(targetUniqueId);
            if (!targetChannel) {
                this.debugLog('warn', `No channel found for MODE command: ${parts.join(' ')}`);
                return;
            }
            if (this.channelData.has(targetChannel)) {
                var modes = parts[3];
                await this.processChannelModes(nickname, targetChannel, modes, parts.slice(4), socket);
            }
            return;
        }                        
        var targetSocket = this.findSocketByUniqueId(targetUniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
            return;
        }
        await this.safeWriteToSocket(targetSocket, `:${targetSocket.nickname} MODE ${targetSocket.nickname} ${parts.slice(2).join(' ')}\r\n`);
        if (this.clientIsWebTV(targetSocket) && this.enable_webtv_command_hacks) {
            await this.sendWebTVNoticeTo(targetSocket, `The network has set your user mode: ${parts.slice(3).join(' ')}`);
        }
        await this.broadcastToAllServers(`:${sourceUniqueId} MODE ${targetUniqueId} ${parts.slice(3).join(' ')}\r\n`, socket);
    },

    async handleServerPrefixCommand_NICK(socket, nickname, sourceUniqueId, parts) {
        if (parts.length < 3) {
            this.debugLog('warn', 'Invalid NICK command from server');
            return;
        }
        var targetSocket = this.findSocketByUniqueId(sourceUniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for source unique ID ${sourceUniqueId}`);
            return;
        }
        var oldNick = targetSocket.nickname;
        var newNick = parts[2];    
        
        if (this.nicknames.has(newNick)) {
            await this.safeWriteToSocket(targetSocket, `:${this.servername} 433 ${oldNick} ${newNick} :Nickname is already in use\r\n`);
            return;
        }
        this.processNickChange(targetSocket, newNick);
        await this.broadcastUser(oldNick, `:${targetSocket.nickname}!${targetSocket.username}@${targetSocket.host} NICK :${newNick}\r\n`, targetSocket);
        await this.broadcastToAllServers(`:${sourceUniqueId} NICK ${newNick}\r\n`, socket);
    },

    async handleServerPrefixCommand_TOPIC(socket, nickname, sourceUniqueId, parts) {
        if (parts.length < 3) {
            this.debugLog('warn', 'Invalid TOPIC command from server');
            return;
        }
        var channel = this.findChannel(parts[2]);
        if (!channel || !this.channelData.has(channel)) {
            await this.safeWriteToSocket(socket, `:${this.servername} 403 ${nickname} ${parts[2]} :No such channel\r\n`);
            return;
        }                            
        var topic = parts.slice(3).join(' ');
        if (topic.startsWith(':')) {
            topic = topic.slice(1);
        }
        this.channelData.get(channel).topic = topic;
        var username = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname) || '';
        await this.broadcastChannel(channel, `:${nickname}!${username}@${hostname} TOPIC ${channel} :${topic}\r\n`, socket);
        await this.broadcastToAllServers(`:${sourceUniqueId} TOPIC ${channel} :${topic}\r\n`, socket);
    },

    async handleServerPrefixCommand_PRIVMSG(socket, nickname, sourceUniqueId, parts, line) {
        var targetUniqueId = parts[2];
        var message = parts.slice(3).join(' ');
        if (message.startsWith(':')) {
            message = message.slice(1);
        }
        var sourceSocket = this.findSocketByUniqueId(sourceUniqueId);
        var sourceUsername = this.usernames.get(nickname) || nickname;
        const host = this.hostnames.get(nickname) || (sourceSocket ? sourceSocket.host : socket.remoteAddress);
        if (this.channelprefixes.some(prefix => targetUniqueId.startsWith(prefix))) {
            if (this.channelData.has(targetUniqueId)) {
                const users = this.channelData.get(targetUniqueId).users;
                for (const user of users) {
                    const userSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                    if (userSocket && userSocket.uniqueId !== sourceUniqueId) {
                        const userHost = this.hostnames.get(user) || (sourceSocket ? sourceSocket.host : socket.remoteAddress);
                        await this.sendThrottled(userSocket, [`:${nickname}!${sourceUsername}@${userHost} PRIVMSG ${targetUniqueId} :${message}\r\n`], 30);
                        await this.broadcastToAllServers(`:${sourceUniqueId} PRIVMSG ${targetUniqueId} :${message}\r\n`, socket);
                    }
                }
            }
            return;
        }
        var targetSocket = this.findSocketByUniqueId(targetUniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
            return;
        }
        var targetNickname = this.getUsernameFromUniqueId(targetUniqueId); 
        var srvCommand = 'PRIVMSG';
        if (this.clientIsWebTV(targetSocket)) {
            srvCommand = 'PRIVMSG';
        }
        await this.sendThrottled(targetSocket, [`:${nickname}!${sourceUsername}@${host} ${srvCommand} ${targetNickname} :${message}\r\n`], 30);
        await this.broadcastToAllServers(`:${sourceUniqueId} ${srvCommand} ${targetUniqueId} :${message}\r\n`, socket);
    },

    async handleServerPrefixCommand_NOTICE(socket, nickname, sourceUniqueId, parts, line) {
        var targetUniqueId = parts[2];
        var message = parts.slice(3).join(' ');
        if (message.startsWith(':')) {
            message = message.slice(1);
        }
        var sourceSocket = this.findSocketByUniqueId(sourceUniqueId);
        var sourceUsername = this.usernames.get(nickname) || nickname;
        const host = this.hostnames.get(nickname) || (sourceSocket ? sourceSocket.host : socket.remoteAddress);
        if (this.channelprefixes.some(prefix => targetUniqueId.startsWith(prefix))) {
            if (this.channelData.has(targetUniqueId)) {
                const users = this.channelData.get(targetUniqueId).users;
                for (const user of users) {
                    const userSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === user);
                    if (userSocket && userSocket.uniqueId !== sourceUniqueId) {
                        const userHost = this.hostnames.get(user) || (sourceSocket ? sourceSocket.host : socket.remoteAddress);
                        await this.sendThrottled(userSocket, [`:${nickname}!${sourceUsername}@${userHost} NOTICE ${targetUniqueId} :${message}\r\n`], 30);
                        await this.broadcastToAllServers(`:${sourceUniqueId} NOTICE ${targetUniqueId} :${message}\r\n`, socket);
                    }
                }
            }
            return;
        }
        var targetSocket = this.findSocketByUniqueId(targetUniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
            return;
        }
        var targetNickname = this.getUsernameFromUniqueId(targetUniqueId); 
        var srvCommand = 'NOTICE';
        if (this.clientIsWebTV(targetSocket)) {
            srvCommand = 'PRIVMSG';
        }
        await this.sendThrottled(targetSocket, [`:${nickname}!${sourceUsername}@${host} ${srvCommand} ${targetNickname} :${message}\r\n`], 30);
        await this.broadcastToAllServers(`:${sourceUniqueId} ${srvCommand} ${targetUniqueId} :${message}\r\n`, socket);
    },

    async handleServerPrefixCommand_WHOIS(socket, nickname, sourceUniqueId, parts) {
        if (parts.length < 3) {
            this.debugLog('warn', 'Invalid WHOIS command from server');
            return;
        }
        var targetUniqueId = parts[2];
        var targetSocket = this.findSocketByUniqueId(targetUniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
            return;
        }
        var whoisNick = this.findUserByUniqueId(targetUniqueId);
        if (!whoisNick) {
            whoisNick = parts[3].slice(1);
        }
        const whoisSocket = Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s).toLowerCase() === whoisNick.toLowerCase());
        if (whoisSocket) {
            whoisNick = whoisSocket.nickname;
            const whois_username = this.usernames.get(whoisNick);
            var userinfo = this.userinfo.get(whoisNick) || whoisSocket.userinfo || '';
            const output_lines = [];
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
            output_lines.push(`:${this.serverId} 312 ${targetUniqueId} ${whoisNick} ${this.servername} :zefIRCd v${this.version}\r\n`);
            if (this.isIRCOp(whoisNick)) {
                output_lines.push(`:${this.serverId} 313 ${targetUniqueId} ${whoisNick} :is an IRC operator\r\n`);
            }
            var targetModes = this.getUserModes(whoisNick);
            if (targetModes && targetModes.includes('s')) {
                output_lines.push(`:${this.serverId} 671 ${targetUniqueId} ${whoisNick} :is using a secure connection\r\n`);
            }
            if (targetModes && targetModes.includes('r')) {
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
    },

    async handleServerPrefixCommand_SVSJOIN(socket, nickname, sourceUniqueId, parts) {
        if (parts.length < 3) {
            this.debugLog('warn', 'Invalid SVSJOIN command from server');
            return;
        }
        var targetUniqueId = parts[2];
        var channelName = this.findChannel(parts[3]);
        var targetSocket = this.findSocketByUniqueId(targetUniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
            return;
        }
        var username = this.usernames.get(targetSocket.nickname) || socket.nickname;
        var hostname = this.hostnames.get(targetSocket.nickname) || '';
        if (!channelName || !this.channelData.has(channelName)) {
            channelName = parts[3];
            this.createChannel(channelName);
        }
        if (!this.channelData.get(channelName).users.has(targetSocket.nickname)) {
            this.channelData.get(channelName).users.add(targetSocket.nickname);
        }
        await this.broadcastChannelJoin(channelName, targetSocket);
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
    },

    async handleServerPrefixCommand_SVSMODE(socket, nickname, sourceUniqueId, parts) {
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SVSMODE command from server');
            return;
        }
        var targetUniqueId = parts[2];
        var targetSocket = this.findSocketByUniqueId(targetUniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No socket found for target unique ID ${targetUniqueId}`);
            return;
        }
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
    }
};
