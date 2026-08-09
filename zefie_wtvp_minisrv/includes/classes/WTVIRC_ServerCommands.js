const crypto = require('crypto');

module.exports = {
    async handleServerCommand_PASS(socket, parts) {
        if (parts.length < 2) {
            this.debugLog('warn', 'Invalid PASS command from server');
            return;
        }
        const password = parts[1];
        const servers = this.irc_config.servers || {};
        let matchedServer = null;
        let matchedKey = null;
        for (const [key, serverObj] of Object.entries(servers)) {
            if (!serverObj || !serverObj.password) continue;
            const provided = Buffer.from(password, 'utf8');
            const expected = Buffer.from(serverObj.password, 'utf8');
            const match = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
            if (match) {
                matchedServer = serverObj;
                matchedKey = key;
                break;
            }
        }
        if (!matchedServer) {
            this.debugLog('warn', 'Invalid server password provided');
            await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Invalid server password\r\n`);
            this.addSocketError(socket);
            if (socket.error_count >= 5) {
                await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Too many errors, disconnecting\r\n`);
                this.terminateSession(socket, true);
            }
            return;
        }
        socket.is_srv_authorized = true;
        socket.linkState = 'pass';
        socket.serverinfo = { ...matchedServer, name: matchedServer.name || matchedKey };
        var totalSockets = this.clients.length + this.servers.size;
        this.socketpeak = Math.max(this.socketpeak, totalSockets);
        this.debugLog('info', `Server ${socket.serverinfo.name} authorized via PASS`);
        const ourPass = matchedServer.password;
        await this.safeWriteToSocket(socket, `PASS ${ourPass}\r\n`);
    },

    async handleServerCommand_CAPAB(socket, parts) {
        if (!(await this.checkRegistered(socket, true))) {
            return;
        }
        if (!socket.is_srv_authorized && socket.linkState !== 'pass') {
            this.debugLog('warn', 'CAPAB before PASS');
        }
        if (parts.length < 2) {
            this.debugLog('warn', 'Invalid CAPAB command from server');
            return;
        }
        var capabilities = parts.slice(1).join(' ');
        if (capabilities.startsWith(':')) {
            capabilities = capabilities.slice(1);
        }
        capabilities = capabilities.split(/\s+/).filter(Boolean);
        this.debugLog('info', `Received CAPAB from server: ${capabilities.join(' ')}`);
        var output_reply = this.supported_server_caps.slice();
        socket.linkState = 'capab';
        await this.safeWriteToSocket(socket, `CAPAB :${output_reply.join(' ')}\r\n`);
    },

    async handleServerCommand_SERVER(socket, parts, line) {
        if (!(await this.checkRegistered(socket, true))) {
            return;
        }
        if (!socket.is_srv_authorized) {
            this.debugLog('warn', 'SERVER command rejected: PASS not completed');
            await this.safeWriteToSocket(socket, `:${this.servername} ERROR :Unauthorized\r\n`);
            this.terminateSession(socket, true);
            return;
        }
        if (parts.length < 6) {
            this.debugLog('warn', 'Invalid SERVER command from server');
            return;
        }
        var serverName = parts[1];
        var serverId = parts[3];
        socket.isserver = true;
        this.clients = this.clients.filter(c => c !== socket);
        socket.registered = true;
        socket.servername = serverName;
        socket.uniqueId = serverId;
        socket.serverIdent = line;
        socket.linkState = 'server';
        this.servers.set(socket, serverName);
        this.peerSids.set(serverId, socket);
        await this.safeWriteToSocket(socket, `SERVER ${this.servername} 1 ${this.serverId} + :${this.server_hello}\r\n`);
        socket.linkState = 'burst';
        for (const [sock, nickname] of this.nicknames.entries()) {
            if (!sock || !nickname) continue;
            await this.safeWriteToSocket(socket, this.formatUidBurstLine(sock, nickname));
            if (sock.realhost && sock.realhost !== sock.host) {
                await this.safeWriteToSocket(socket, `:${this.serverId} ENCAP * REALHOST ${sock.uniqueId} :${sock.realhost}\r\n`);
            }
            const account = this.accounts.get(nickname);
            if (account) {
                await this.safeWriteToSocket(socket, `:${this.serverId} ENCAP * LOGIN ${sock.uniqueId} :${account}\r\n`);
            }
        }
        for (const [channel, channelObj] of this.channelData.entries()) {
            const modes = channelObj.modes || [];
            const memberTokens = [];
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
                    memberTokens.push(`${userPrefix}${userUniqueId}`);
                }
            }
            if (memberTokens.length === 0 && !channelObj.topic && !(channelObj.bans && channelObj.bans.length)) {
                continue;
            }
            let modeStr = modes.join('');
            const modeParams = [];
            if (modes.includes('k') && channelObj.key) {
                modeParams.push(channelObj.key);
            }
            if (modes.includes('l') && channelObj.limit != null) {
                modeParams.push(String(channelObj.limit));
            }
            const ts = channelObj.timestamp || this.getDate();
            const modePart = modeStr ? `+${modeStr}` : '+';
            const paramPart = modeParams.length ? ` ${modeParams.join(' ')}` : '';
            const membersPart = memberTokens.length ? ` :${memberTokens.join(' ')}` : ' :';
            await this.safeWriteToSocket(socket, `:${this.serverId} SJOIN ${ts} ${channel} ${modePart}${paramPart}${membersPart}\r\n`);
            if (channelObj.bans && channelObj.bans.length) {
                await this.safeWriteToSocket(socket, `:${this.serverId} BMASK ${ts} ${channel} b :${channelObj.bans.join(' ')}\r\n`);
            }
            if (channelObj.exemptions && channelObj.exemptions.length) {
                await this.safeWriteToSocket(socket, `:${this.serverId} BMASK ${ts} ${channel} e :${channelObj.exemptions.join(' ')}\r\n`);
            }
            if (channelObj.inviteexemptions && channelObj.inviteexemptions.length) {
                await this.safeWriteToSocket(socket, `:${this.serverId} BMASK ${ts} ${channel} I :${channelObj.inviteexemptions.join(' ')}\r\n`);
            }
            if (channelObj.topic) {
                const topicTs = channelObj.topicTs || ts;
                const setter = channelObj.topicSetter || this.servername;
                await this.safeWriteToSocket(socket, `:${this.serverId} TBURST ${ts} ${channel} ${topicTs} ${setter} :${channelObj.topic}\r\n`);
            }
        }

        const ident = socket.serverIdent && socket.serverIdent.endsWith('\r\n') ? socket.serverIdent : `${socket.serverIdent || ''}\r\n`;
        await this.broadcastToAllServers(ident, socket);
        await this.safeWriteToSocket(socket, `:${this.serverId} EOB\r\n`);
    },

    async handleServerCommand_SVINFO(socket, parts) {
        if (!(await this.checkRegistered(socket, true))) {
            return;
        }
        if (!socket.is_srv_authorized) {
            return;
        }
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SVINFO command from server');
            return;
        }
        if (socket.linkState === 'server' || socket.linkState === 'burst' || socket.linkState === 'capab') {
            socket.linkState = socket.linkState === 'burst' ? 'burst' : 'svinfo';
        }
        const serverInfoMessage = `:${this.serverId} SVINFO 6 6 0 ${this.getDate()}\r\n`;
        await this.safeWriteToSocket(socket, serverInfoMessage);
    },

    async handleServerCommand_EOB(socket, parts) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        socket.linkState = 'eob';
        socket.peerEob = true;
        this.debugLog('info', `End of burst from ${socket.servername || 'peer'}`);
    },

    async handleServerCommand_SID(socket, parts) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        // SID <name> <hops> <sid> :<description>
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SID from server');
            return;
        }
        const sid = parts[3];
        this.peerSids.set(sid, socket);
        await this.broadcastToAllServers(`:${socket.uniqueId || this.serverId} SID ${parts.slice(1).join(' ')}\r\n`, socket);
    },

    async handleServerCommand_BMASK(socket, parts) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        // BMASK <ts> <channel> <type> :<masks>
        if (parts.length < 5) return;
        const channel = this.findChannel(parts[2]) || parts[2];
        const type = parts[3];
        let masks = parts.slice(4).join(' ');
        if (masks.startsWith(':')) masks = masks.slice(1);
        if (!this.channelData.has(channel)) {
            this.createChannel(channel);
        }
        const channelObj = this.channelData.get(channel);
        const list = type === 'b' ? channelObj.bans : (type === 'e' ? channelObj.exemptions : (type === 'I' ? channelObj.inviteexemptions : null));
        if (Array.isArray(list)) {
            for (const mask of masks.split(/\s+/).filter(Boolean)) {
                if (!list.includes(mask)) list.push(mask);
            }
        }
        await this.broadcastToAllServers(`:${socket.uniqueId || socket.servername} BMASK ${parts.slice(1).join(' ')}\r\n`, socket);
    },

    async handleServerCommand_TMODE(socket, parts, line) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        // TMODE <ts> <channel> <modes> [params...]
        if (parts.length < 4) return;
        const channel = this.findChannel(parts[2]) || parts[2];
        if (!this.channelData.has(channel)) {
            this.createChannel(channel);
        }
        const modes = parts[3];
        const modeParams = parts.slice(4);
        await this.processChannelModes(socket.uniqueId || socket.servername || this.servername, channel, modes, modeParams, socket);
    },

    async handleServerCommand_ENCAP(socket, parts, line) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        // ENCAP <target> <subcommand> [params...]
        if (parts.length >= 4) {
            const sub = (parts[2] || '').toUpperCase();
            if (sub === 'REALHOST' && parts.length >= 4) {
                const uid = parts[3];
                let realhost = parts.slice(4).join(' ').replace(/^:/, '');
                const nick = this.findUserByUniqueId(uid);
                if (nick && realhost) {
                    this.realhosts.set(nick, realhost);
                    const local = this.findLocalSocketByUniqueId(uid);
                    if (local) local.realhost = realhost;
                }
            } else if (sub === 'LOGIN' && parts.length >= 4) {
                const uid = parts[3];
                let account = parts.slice(4).join(' ').replace(/^:/, '');
                const nick = this.findUserByUniqueId(uid);
                if (nick) {
                    if (!account || account === '*') {
                        this.accounts.delete(nick);
                    } else {
                        this.accounts.set(nick, account);
                    }
                    await this.broadcastUserIfCap(
                        { nickname: nick, username: this.usernames.get(nick) || nick, host: this.hostnames.get(nick) || '' },
                        `:${nick}!${this.usernames.get(nick) || nick}@${this.hostnames.get(nick) || ''} ACCOUNT ${account || '*'}\r\n`,
                        null,
                        'account-notify'
                    );
                }
            }
        }
        await this.broadcastToAllServers(line.endsWith('\r\n') ? line : line + '\r\n', socket);
    },

    async handleServerCommand_EUID(socket, parts) {
        // EUID nick hops ts umode user host ip uid realhost account :gecos
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (parts.length < 11) {
            this.debugLog('warn', `EUID invalid: ${parts.join(' ')}`);
            return;
        }
        const nickname = parts[1];
        const timestamp = parseInt(parts[3], 10) || 0;
        const userModes = (parts[4] || '').replace(/^\+/, '').split('');
        const username = parts[5];
        const hostname = parts[6];
        const ipaddress = parts[7];
        const userUniqueId = parts[8];
        const realhost = parts[9] === '*' ? ipaddress : parts[9];
        const accountName = parts[10] === '*' ? null : parts[10];
        let userinfo = parts.slice(11).join(' ');
        if (userinfo.startsWith(':')) userinfo = userinfo.slice(1);

        if (!userUniqueId || userUniqueId.length < 3 || !this.linkOwnsSid(socket, userUniqueId.slice(0, 3))) {
            this.debugLog('warn', `EUID rejected: SID ${userUniqueId && userUniqueId.slice(0, 3)} not owned by link`);
            return;
        }
        if (this.findUser(nickname) || this.findUserByUniqueId(userUniqueId)) {
            this.debugLog('warn', `EUID collision for nick/uid ${nickname}/${userUniqueId}, ignoring`);
            return;
        }
        this.addRemoteServerUser(socket, nickname);
        this.addUserUniqueId(nickname, userUniqueId);
        this.globalpeak = Math.max(this.globalpeak, this.countGlobalUsers());
        this.usersignontimestamps.set(nickname, timestamp);
        this.usernames.set(nickname, username);
        this.hostnames.set(nickname, hostname);
        this.realhosts.set(nickname, realhost || ipaddress);
        this.userinfo.set(nickname, userinfo);
        this.usermodes.set(nickname, []);
        for (const mode of userModes) {
            if (mode) this.setUserMode(nickname, mode, true);
        }
        if (accountName) {
            this.accounts.set(nickname, accountName);
        }
        await this.broadcastToAllServers(
            `:${socket.uniqueId || this.serverId} EUID ${nickname} 1 ${timestamp} +${userModes.join('')} ${username} ${hostname} ${ipaddress} ${userUniqueId} ${realhost || '*'} ${accountName || '*'} :${userinfo}\r\n`,
            socket
        );
    },

    async handleServerCommand_SAVE(socket, parts) {
        // SAVE <uid> <ts> — force nick to UID on collision
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (parts.length < 2) {
            this.debugLog('warn', `SAVE nick collision recovery not implemented: ${parts.join(' ')}`);
            return;
        }
        const uid = parts[1];
        const nick = this.findUserByUniqueId(uid);
        if (!nick) {
            this.debugLog('warn', `SAVE for unknown UID ${uid}`);
            return;
        }
        const localSock = this.findLocalSocketByUniqueId(uid);
        if (localSock) {
            const oldNick = localSock.nickname;
            this.processNickChange(localSock, uid);
            await this.safeWriteToSocket(localSock, `:${oldNick}!${localSock.username}@${localSock.host} NICK :${uid}\r\n`);
            await this.broadcastUser(uid, `:${oldNick}!${localSock.username}@${localSock.host} NICK :${uid}\r\n`, localSock);
        } else {
            // Remote nick: rename in maps only
            const oldNick = nick;
            this.migrateNickKeyedMap(this.usernames, oldNick, uid);
            this.migrateNickKeyedMap(this.usermodes, oldNick, uid);
            this.migrateNickKeyedMap(this.hostnames, oldNick, uid);
            this.migrateNickKeyedMap(this.realhosts, oldNick, uid);
            this.migrateNickKeyedMap(this.userinfo, oldNick, uid);
            this.migrateNickKeyedMap(this.accounts, oldNick, uid);
            this.migrateNickKeyedMap(this.awaymsgs, oldNick, uid);
            this.migrateNickKeyedMap(this.usersignontimestamps, oldNick, uid);
            this.addUserUniqueId(uid, uid);
            this.deleteUserUniqueId(oldNick);
            for (const users of this.serverusers.values()) {
                if (users && users.has(oldNick)) {
                    users.delete(oldNick);
                    users.add(uid);
                }
            }
            for (const channelObj of this.channelData.values()) {
                if (channelObj.users.has(oldNick)) {
                    channelObj.users.delete(oldNick);
                    channelObj.users.add(uid);
                }
                for (const set of [channelObj.ops, channelObj.halfops, channelObj.voices, channelObj.invites]) {
                    if (set.has(oldNick)) {
                        set.delete(oldNick);
                        set.add(uid);
                    }
                }
            }
        }
        await this.broadcastToAllServers(`:${socket.uniqueId || this.serverId} SAVE ${uid} ${parts[2] || this.getDate()}\r\n`, socket);
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
        if (!(await this.checkRegistered(socket))) {
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
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        // TS6: UID nick hops ts umodes user host ip uid :gecos
        if (parts.length < 9) {
            this.debugLog('warn', 'Invalid UID command from server');
            return;
        }
        var nickname = parts[1];
        const hops = parts[2];
        const timestamp = parseInt(parts[3], 10) || 0;
        const userModes = (parts[4] || '').replace(/^\+/, '').split('');
        var username = parts[5];
        var hostname = parts[6];
        const ipaddress = parts[7];
        const userUniqueId = parts[8];
        var userinfo = parts.slice(9).join(' ');
        if (userinfo.startsWith(':')) {
            userinfo = userinfo.slice(1);
        }
        if (!userUniqueId || userUniqueId.length < 3 || !this.linkOwnsSid(socket, userUniqueId.slice(0, 3))) {
            this.debugLog('warn', `UID rejected: SID ${userUniqueId && userUniqueId.slice(0, 3)} not owned by link`);
            return;
        }
        if (this.findUser(nickname) || this.findUserByUniqueId(userUniqueId)) {
            this.debugLog('warn', `UID collision for nick/uid ${nickname}/${userUniqueId}, ignoring`);
            return;
        }
        this.addRemoteServerUser(socket, nickname);
        this.addUserUniqueId(nickname, userUniqueId);
        this.globalpeak = Math.max(this.globalpeak, this.countGlobalUsers());
        this.usersignontimestamps.set(nickname, timestamp);
        this.usernames.set(nickname, username);
        this.hostnames.set(nickname, hostname);
        this.realhosts.set(nickname, ipaddress);
        this.userinfo.set(nickname, userinfo);
        this.usermodes.set(nickname, []);
        for (const mode of userModes) {
            if (mode) this.setUserMode(nickname, mode, true);
        }
        await this.broadcastToAllServers(
            `:${socket.uniqueId || this.serverId} UID ${nickname} ${hops} ${timestamp} +${userModes.join('')} ${username} ${hostname} ${ipaddress} ${userUniqueId} :${userinfo}\r\n`,
            socket
        );
    },

    async handleServerCommand_SVSHOST(socket, parts) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isServicesPeer(socket)) {
            this.debugLog('warn', 'SVSHOST rejected from non-services peer');
            return;
        }
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SVSHOST command from server');
            return;
        }
        var uniqueId = parts[1];
        // Accept SVSHOST uid host  OR  SVSHOST uid ts host
        var hostname = parts.length >= 4 ? parts[parts.length - 1] : parts[2];
        if (hostname && hostname.startsWith(':')) hostname = hostname.slice(1);
        var nickname = this.findUserByUniqueId(uniqueId);
        if (!nickname) {
            this.debugLog('warn', `No user found for unique ID ${uniqueId}`);
            return;
        }
        this.hostnames.set(nickname, hostname);
        var targetSocket = this.findLocalSocketByUniqueId(uniqueId);
        const chghostLine = `:${nickname}!${this.usernames.get(nickname) || nickname}@${hostname} CHGHOST ${this.usernames.get(nickname) || nickname} ${hostname}\r\n`;
        if (targetSocket) {
            targetSocket.host = hostname;
            await this.safeWriteToSocket(targetSocket, `:${this.servername} 396 ${targetSocket.nickname} ${targetSocket.host} :is now your visible host\r\n`);
        }
        await this.broadcastUserIfCap({ nickname }, chghostLine, targetSocket, 'chghost');
        if (targetSocket && targetSocket.client_caps && targetSocket.client_caps.includes('chghost')) {
            await this.safeWriteToSocket(targetSocket, chghostLine);
        }
        await this.broadcastToAllServers(`:${socket.uniqueId || socket.servername} SVSHOST ${parts.slice(1).join(' ')}\r\n`, socket);
    },

    async handleServerCommand_SVSACCOUNT(socket, parts) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isServicesPeer(socket)) {
            this.debugLog('warn', 'SVSACCOUNT rejected from non-services peer');
            return;
        }
        if (parts.length < 3) {
            this.debugLog('warn', 'Invalid SVSACCOUNT command from server');
            return;
        }
        var uniqueId = parts[1];
        var accountName = parts[parts.length - 1];
        if (accountName.startsWith(':')) accountName = accountName.slice(1);
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
        const username = this.usernames.get(nickname) || nickname;
        const host = this.hostnames.get(nickname) || '';
        const accountLine = `:${nickname}!${username}@${host} ACCOUNT ${accountName}\r\n`;
        const targetSocket = this.findLocalSocketByUniqueId(uniqueId);
        if (targetSocket && targetSocket.client_caps && targetSocket.client_caps.includes('account-notify')) {
            await this.safeWriteToSocket(targetSocket, accountLine);
        }
        await this.broadcastUserIfCap({ nickname }, accountLine, targetSocket, 'account-notify');
        await this.broadcastToAllServers(`:${socket.uniqueId || socket.servername} SVSACCOUNT ${parts.slice(1).join(' ')}\r\n`, socket);
    },

    async handleServerCommand_SVSNICK(socket, parts, line) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (!this.isServicesPeer(socket)) {
            this.debugLog('warn', 'SVSNICK rejected from non-services peer');
            return;
        }
        if (parts.length < 5) {
            this.debugLog('warn', 'Invalid SVSNICK command from server');
            return;
        }
        var oldNick = this.findUserByUniqueId(parts[1]);
        var newNick = parts[3];
        if (!oldNick || !newNick) {
            return;
        }
        if (this.findUser(newNick) && this.casefold(this.findUser(newNick)) !== this.casefold(oldNick)) {
            this.debugLog('warn', `SVSNICK collision: ${newNick} already in use`);
            return;
        }
        const username = this.usernames.get(oldNick) || oldNick;
        const hostname = this.hostnames.get(oldNick) || this.servername;
        await this.broadcastUser(oldNick, `:${oldNick}!${username}@${hostname} NICK :${newNick}\r\n`);
        const localSocket = this.findLocalSocketByUniqueId(parts[1]);
        if (localSocket) {
            this.processNickChange(localSocket, newNick);
        } else {
            this.processRemoteNickChange(oldNick, newNick);
        }
        await this.broadcastToAllServers(line, socket);
    },

    async handleServerCommand_SJOIN(socket, parts) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SJOIN from server');
            return;
        }
        const channelTs = parseInt(parts[1], 10) || this.getDate();
        var channel = this.findChannel(parts[2]) || parts[2];
        var modes = (parts[3] || '').replace(/^\+/, '');
        // Collect mode params for k/l then trailing member list
        const rest = parts.slice(4);
        let memberField = '';
        const modeParams = [];
        let colonIdx = rest.findIndex(p => p.startsWith(':'));
        if (colonIdx === -1) {
            // Entire rest may be members without leading colon on first token only
            memberField = rest.join(' ');
        } else {
            for (let i = 0; i < colonIdx; i++) modeParams.push(rest[i]);
            memberField = rest.slice(colonIdx).join(' ');
        }
        if (memberField.startsWith(':')) {
            memberField = memberField.slice(1);
        }
        if (!this.channelData.has(channel)) {
            this.createChannel(channel);
        }
        const channelObj = this.channelData.get(channel);
        if (!channelObj.timestamp || channelTs < channelObj.timestamp) {
            channelObj.timestamp = channelTs;
        }
        let paramIdx = 0;
        if (modes) {
            for (const mc of modes) {
                if (!mc) continue;
                if (mc === 'k') {
                    if (!channelObj.modes.includes('k')) channelObj.modes.push('k');
                    if (modeParams[paramIdx] != null) channelObj.key = modeParams[paramIdx];
                    paramIdx++;
                } else if (mc === 'l') {
                    if (!channelObj.modes.includes('l')) channelObj.modes.push('l');
                    if (modeParams[paramIdx] != null) channelObj.limit = parseInt(modeParams[paramIdx], 10) || null;
                    paramIdx++;
                } else if (!channelObj.modes.includes(mc)) {
                    channelObj.modes.push(mc);
                }
            }
        }
        const members = memberField.split(/\s+/).filter(Boolean);
        for (let token of members) {
            let isOp = false, isHalf = false, isVoice = false;
            while (token.length && ['@', '%', '+'].includes(token[0])) {
                if (token[0] === '@') isOp = true;
                if (token[0] === '%') isHalf = true;
                if (token[0] === '+') isVoice = true;
                token = token.slice(1);
            }
            if (!token || /^[0-9]+$/.test(token)) continue; // skip stray numeric mode params
            var nickname = this.findUserByUniqueId(token);
            if (!nickname) continue;
            if (!channelObj.users.has(nickname)) {
                channelObj.users.add(nickname);
            }
            if (isOp) channelObj.ops.add(nickname);
            if (isHalf) channelObj.halfops.add(nickname);
            if (isVoice) channelObj.voices.add(nickname);
            var username = this.usernames.get(nickname) || nickname;
            var hostname = this.hostnames.get(nickname) || '';
            const localSock = this.findLocalSocketByUniqueId(token);
            await this.broadcastChannel(channel, `:${nickname}!${username}@${hostname} JOIN ${channel}\r\n`, localSock);
        }
        const paramPart = modeParams.length ? ` ${modeParams.join(' ')}` : '';
        await this.broadcastToAllServers(`:${socket.uniqueId || this.serverId} SJOIN ${channelTs} ${channel} +${modes}${paramPart} :${memberField}\r\n`, socket);
    },

    async handleServerCommand_SQUIT(socket, parts) {
        const reason = parts.slice(2).join(' ').replace(/^:/, '') || 'SQUIT';
        await this.broadcastToAllServers(`:${socket.servername} SQUIT ${parts[1]} :${reason}\r\n`, socket);
        await this.terminateSession(socket, true);
    },

    async handleServerNumericReply(socket, command, parts, line) {
        if (!(await this.checkRegistered(socket))) {
            return;
        }
        // parts: [numeric, targetUid, ...]
        var targetID = parts[1];
        var targetSocket = this.findLocalSocketByUniqueId(targetID);
        if (!targetSocket) {
            this.debugLog('warn', `No local socket found for unique ID ${targetID}`);
            return;
        }
        const rest = parts.slice(2).join(' ');
        await this.safeWriteToSocket(targetSocket, `:${socket.servername || this.servername} ${command} ${targetSocket.nickname} ${rest}\r\n`.replace(/\r\n\r\n$/, '\r\n'));
    },

    // Prefix command handlers (default case in processServerData)
    async handleServerPrefixCommand_QUIT(socket, nickname, sourceUniqueId, parts) {
        var user_name = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname) || this.servername;
        var message = this.sanitizeTrailingParam(parts.slice(2).join(' ').replace(/^:/, ''));
        await this.broadcastUser(nickname, `:${nickname}!${user_name}@${hostname} QUIT :${message}\r\n`);
        const serverUsers = this.serverusers.get(socket);
        if (serverUsers && typeof serverUsers.delete === 'function') {
            serverUsers.delete(nickname);
        }
        this.cleanupUserSession(nickname);
        await this.broadcastToAllServers(`:${sourceUniqueId} QUIT :${message}\r\n`, socket);
    },

    async handleServerPrefixCommand_JOIN(socket, nickname, sourceUniqueId, parts) {
        var channelName = parts[2];
        if (channelName && channelName.startsWith(':')) {
            channelName = channelName.slice(1);
        }
        var channel = this.findChannel(channelName);
        if (!channel || !this.channelData.has(channel)) {
            channel = channelName;
            this.createChannel(channel);
        }
        if (!this.channelData.get(channel).users.has(nickname)) {
            this.channelData.get(channel).users.add(nickname);
        }
        var username = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname) || '';
        const localSock = this.findLocalSocketByUniqueId(sourceUniqueId);
        await this.broadcastChannel(channel, `:${nickname}!${username}@${hostname} JOIN ${channel}\r\n`, localSock);
        await this.broadcastToAllServers(`:${sourceUniqueId} JOIN ${channel}\r\n`, socket);
    },

    async handleServerPrefixCommand_PART(socket, nickname, sourceUniqueId, parts) {
        var channel = this.findChannel(parts[2]);
        if (!channel) {
            this.debugLog('warn', `No channel found for PART command: ${parts[2]}`);
            return;
        }
        var username = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname) || '';
        let reason = parts.slice(3).join(' ');
        if (reason.startsWith(':')) reason = reason.slice(1);
        const partLine = reason
            ? `:${nickname}!${username}@${hostname} PART ${channel} :${reason}\r\n`
            : `:${nickname}!${username}@${hostname} PART ${channel}\r\n`;
        await this.broadcastChannel(channel, partLine);
        this.removeUserFromChannel(nickname, channel);
        await this.broadcastToAllServers(`:${sourceUniqueId} PART ${channel}${reason ? ' :' + reason : ''}\r\n`, socket);
    },

    async handleServerPrefixCommand_AWAY(socket, nickname, sourceUniqueId, parts) {
        let awayMsg = parts.slice(2).join(' ');
        if (awayMsg.startsWith(':')) awayMsg = awayMsg.slice(1);
        awayMsg = this.sanitizeTrailingParam(awayMsg);
        const username = this.usernames.get(nickname) || nickname;
        const hostname = this.hostnames.get(nickname) || '';
        if (awayMsg) {
            this.awaymsgs.set(nickname, awayMsg);
            await this.broadcastUserIfCap(
                { nickname },
                `:${nickname}!${username}@${hostname} AWAY :${awayMsg}\r\n`,
                null,
                'away-notify'
            );
        } else {
            this.awaymsgs.delete(nickname);
            await this.broadcastUserIfCap(
                { nickname },
                `:${nickname}!${username}@${hostname} AWAY\r\n`,
                null,
                'away-notify'
            );
        }
        await this.broadcastToAllServers(
            awayMsg ? `:${sourceUniqueId} AWAY :${awayMsg}\r\n` : `:${sourceUniqueId} AWAY\r\n`,
            socket
        );
    },

    async handleServerPrefixCommand_KICK(socket, nickname, sourceUniqueId, parts) {
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid KICK from server');
            return;
        }
        var channel = this.findChannel(parts[2]) || parts[2];
        var targetIdOrNick = parts[3];
        var targetNick = this.findUserByUniqueId(targetIdOrNick) || this.findUser(targetIdOrNick) || targetIdOrNick;
        let reason = parts.slice(4).join(' ');
        if (reason.startsWith(':')) reason = reason.slice(1);
        if (!this.channelData.has(channel)) {
            return;
        }
        var username = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname) || '';
        const kickLine = reason
            ? `:${nickname}!${username}@${hostname} KICK ${channel} ${targetNick} :${reason}\r\n`
            : `:${nickname}!${username}@${hostname} KICK ${channel} ${targetNick}\r\n`;
        const targetSocket = this.findLocalSocketByUniqueId(this.uniqueids.get(targetNick)) ||
            Array.from(this.nicknames.keys()).find(s => this.nicknames.get(s) === targetNick);
        if (targetSocket) {
            await this.safeWriteToSocket(targetSocket, kickLine);
        }
        await this.broadcastChannel(channel, kickLine, targetSocket);
        this.removeUserFromChannel(targetNick, channel);
        await this.broadcastToAllServers(`:${sourceUniqueId} KICK ${channel} ${this.uniqueids.get(targetNick) || targetIdOrNick}${reason ? ' :' + reason : ''}\r\n`, socket);
    },

    async handleServerPrefixCommand_GLOBOPS(socket, nickname, sourceUniqueId, parts) {
        var message = this.sanitizeTrailingParam(parts.slice(2).join(' ').replace(/^:/, ''));
        for (const [clientSock, nick] of this.nicknames.entries()) {
            if (this.isIRCOp(nick)) {
                await this.safeWriteToSocket(clientSock, `:${nickname} NOTICE ${nick} :*** GLOBOPS -- ${nickname}: ${message}\r\n`);
            }
        }
        await this.broadcastToAllServers(`:${sourceUniqueId} GLOBOPS :${message}\r\n`, socket);
    },

    async handleServerPrefixCommand_TBURST(socket, nickname, sourceUniqueId, parts) {
        // :src TBURST <channelTS> <channel> <topicTS> <setter> :<topic>
        if (parts.length < 7) {
            this.debugLog('warn', `Invalid TBURST command from server: ${parts.join(' ')}`);
            return;
        }
        const channelTs = parts[2];
        var channel = this.findChannel(parts[3]) || parts[3];
        const topicTs = parseInt(parts[4], 10) || 0;
        const setter = parts[5] || nickname;
        var topic = this.sanitizeTrailingParam(parts.slice(6).join(' ').replace(/^:/, ''));
        if (!this.channelData.has(channel)) {
            this.createChannel(channel);
        }
        const channelObj = this.channelData.get(channel);
        channelObj.topic = topic;
        channelObj.topicSetter = setter;
        channelObj.topicTs = topicTs;
        if (channelTs && !Number.isNaN(parseInt(channelTs, 10))) {
            channelObj.timestamp = parseInt(channelTs, 10) || channelObj.timestamp;
        }
        await this.broadcastChannel(channel, `:${setter} TOPIC ${channel} :${topic}\r\n`);
        await this.broadcastToAllServers(`:${sourceUniqueId} TBURST ${channelTs} ${channel} ${topicTs} ${setter} :${topic}\r\n`, socket);
    },

    async handleServerPrefixCommand_KILL(socket, nickname, sourceUniqueId, parts, line) {
        if (parts.length < 3) {
            this.debugLog('warn', `Invalid KILL command from server: ${line}`);
            return;
        }
        var targetUniqueId = parts[2];
        var targetSocket = this.findLocalSocketByUniqueId(targetUniqueId);
        var targetNickname = this.findUserByUniqueId(targetUniqueId);
        if (!targetNickname) {
            this.debugLog('warn', `KILL for unknown uid ${targetUniqueId}`);
            return;
        }
        var sourceUsername = this.usernames.get(nickname) || nickname;
        var reason = parts.slice(3).join(' ');
        if (reason.startsWith(':')) reason = reason.slice(1);
        if (targetSocket) {
            await this.safeWriteToSocket(targetSocket, `:${nickname}!${sourceUsername}@${(socket.serverinfo && socket.serverinfo.name) || socket.servername} KILL ${targetNickname} :${reason}\r\n`);
            await this.broadcastUser(targetNickname, `:${nickname}!${sourceUsername}@${(socket.serverinfo && socket.serverinfo.name) || socket.servername} KILL ${targetNickname} :${reason}\r\n`, targetSocket);
            await this.broadcastToAllServers(`:${sourceUniqueId} KILL ${targetUniqueId} :${reason}\r\n`, socket);
            this.terminateSession(targetSocket, true);
        } else {
            await this.broadcastUser(targetNickname, `:${nickname}!${sourceUsername}@${(socket.serverinfo && socket.serverinfo.name) || socket.servername} KILL ${targetNickname} :${reason}\r\n`);
            this.cleanupUserSession(targetNickname);
            const serverUsers = this.serverusers.get(socket);
            if (serverUsers) serverUsers.delete(targetNickname);
            await this.broadcastToAllServers(`:${sourceUniqueId} KILL ${targetUniqueId} :${reason}\r\n`, socket);
        }
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
        var targetNickname = this.findUserByUniqueId(targetUniqueId);
        var targetSocket = this.findLocalSocketByUniqueId(targetUniqueId);
        if (!targetNickname) {
            this.debugLog('warn', `No user found for target unique ID ${targetUniqueId}`);
            return;
        }
        let modeStr = parts.slice(3).join(' ');
        if (modeStr.startsWith(':')) modeStr = modeStr.slice(1);
        let adding = true;
        for (const char of modeStr) {
            if (char === '+') adding = true;
            else if (char === '-') adding = false;
            else if (char && char !== ' ') this.setUserMode(targetNickname, char, adding);
        }
        if (targetSocket) {
            await this.safeWriteToSocket(targetSocket, `:${targetSocket.nickname}!${targetSocket.username}@${targetSocket.host} MODE ${targetSocket.nickname} ${modeStr}\r\n`);
            if (this.clientIsWebTV(targetSocket) && this.enable_webtv_command_hacks) {
                await this.sendWebTVNoticeTo(targetSocket, `The network has set your user mode: ${modeStr}`);
            }
        }
        await this.broadcastToAllServers(`:${sourceUniqueId} MODE ${targetUniqueId} ${modeStr}\r\n`, socket);
    },

    async handleServerPrefixCommand_NICK(socket, nickname, sourceUniqueId, parts) {
        if (parts.length < 3) {
            this.debugLog('warn', 'Invalid NICK command from server');
            return;
        }
        var newNick = parts[2];
        if (newNick.startsWith(':')) newNick = newNick.slice(1);
        const existing = this.findUser(newNick);
        if (existing && this.casefold(existing) !== this.casefold(nickname)) {
            this.debugLog('warn', `Remote NICK collision: ${newNick}`);
            return;
        }
        const username = this.usernames.get(nickname) || nickname;
        const hostname = this.hostnames.get(nickname) || '';
        await this.broadcastUser(nickname, `:${nickname}!${username}@${hostname} NICK :${newNick}\r\n`);
        const localSocket = this.findLocalSocketByUniqueId(sourceUniqueId);
        if (localSocket) {
            this.processNickChange(localSocket, newNick);
        } else {
            this.processRemoteNickChange(nickname, newNick);
        }
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
        var topic = this.sanitizeTrailingParam(parts.slice(3).join(' ').replace(/^:/, ''));
        const channelObj = this.channelData.get(channel);
        channelObj.topic = topic;
        channelObj.topicSetter = nickname;
        channelObj.topicTs = this.getDate();
        var username = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname) || '';
        await this.broadcastChannel(channel, `:${nickname}!${username}@${hostname} TOPIC ${channel} :${topic}\r\n`, socket);
        await this.broadcastToAllServers(`:${sourceUniqueId} TOPIC ${channel} :${topic}\r\n`, socket);
    },

    async handleServerPrefixCommand_PRIVMSG(socket, nickname, sourceUniqueId, parts, line) {
        var target = parts[2];
        var message = this.sanitizeTrailingParam(parts.slice(3).join(' ').replace(/^:/, ''));
        var sourceUsername = this.usernames.get(nickname) || nickname;
        const host = this.hostnames.get(nickname) || socket.remoteAddress;
        if (this.channelprefixes.some(prefix => target.startsWith(prefix))) {
            const channel = this.findChannel(target) || target;
            if (this.channelData.has(channel)) {
                await this.broadcastChannel(channel, `:${nickname}!${sourceUsername}@${host} PRIVMSG ${channel} :${message}\r\n`);
            }
            await this.broadcastToAllServers(`:${sourceUniqueId} PRIVMSG ${target} :${message}\r\n`, socket);
            return;
        }
        var targetSocket = this.findLocalSocketByUniqueId(target);
        var targetNickname = this.findUserByUniqueId(target) || this.getUsernameFromUniqueId(target);
        if (!targetSocket) {
            this.debugLog('warn', `No local socket for PRIVMSG target ${target}`);
            await this.broadcastToAllServers(`:${sourceUniqueId} PRIVMSG ${target} :${message}\r\n`, socket);
            return;
        }
        await this.safeWriteToSocket(targetSocket, `:${nickname}!${sourceUsername}@${host} PRIVMSG ${targetNickname} :${message}\r\n`);
        await this.broadcastToAllServers(`:${sourceUniqueId} PRIVMSG ${target} :${message}\r\n`, socket);
    },

    async handleServerPrefixCommand_NOTICE(socket, nickname, sourceUniqueId, parts, line) {
        var target = parts[2];
        var message = this.sanitizeTrailingParam(parts.slice(3).join(' ').replace(/^:/, ''));
        var sourceUsername = this.usernames.get(nickname) || nickname;
        const host = this.hostnames.get(nickname) || socket.remoteAddress;
        if (this.channelprefixes.some(prefix => target.startsWith(prefix))) {
            const channel = this.findChannel(target) || target;
            if (this.channelData.has(channel)) {
                await this.broadcastChannel(channel, `:${nickname}!${sourceUsername}@${host} NOTICE ${channel} :${message}\r\n`);
            }
            await this.broadcastToAllServers(`:${sourceUniqueId} NOTICE ${target} :${message}\r\n`, socket);
            return;
        }
        var targetSocket = this.findLocalSocketByUniqueId(target);
        var targetNickname = this.findUserByUniqueId(target) || this.getUsernameFromUniqueId(target);
        if (!targetSocket) {
            await this.broadcastToAllServers(`:${sourceUniqueId} NOTICE ${target} :${message}\r\n`, socket);
            return;
        }
        var srvCommand = this.clientIsWebTV(targetSocket) ? 'PRIVMSG' : 'NOTICE';
        await this.safeWriteToSocket(targetSocket, `:${nickname}!${sourceUsername}@${host} ${srvCommand} ${targetNickname} :${message}\r\n`);
        await this.broadcastToAllServers(`:${sourceUniqueId} NOTICE ${target} :${message}\r\n`, socket);
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
        if (!this.isServicesPeer(socket)) {
            this.debugLog('warn', 'SVSJOIN rejected from non-services peer');
            return;
        }
        if (parts.length < 3) {
            this.debugLog('warn', 'Invalid SVSJOIN command from server');
            return;
        }
        var targetUniqueId = parts[2];
        var channelName = this.findChannel(parts[3]);
        var targetSocket = this.findLocalSocketByUniqueId(targetUniqueId);
        if (!targetSocket) {
            this.debugLog('warn', `No local socket found for target unique ID ${targetUniqueId}`);
            return;
        }
        var username = this.usernames.get(targetSocket.nickname) || targetSocket.nickname;
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
            await this.safeWriteToSocket(targetSocket, `:${this.servername} 324 ${targetSocket.nickname} ${channelName} +${modeString}${modeParams.length ? ' ' + modeParams.join(' ') : ''}\r\n`);
        }
        const paramPart = modeParams.length ? ` ${modeParams.join(' ')}` : '';
        await this.broadcastToAllServers(
            `:${this.serverId} SJOIN ${this.getDate()} ${channelName} +${modeString}${paramPart} :${targetUniqueId}\r\n`,
            socket
        );
    },

    async handleServerPrefixCommand_SVSMODE(socket, nickname, sourceUniqueId, parts) {
        if (!this.isServicesPeer(socket)) {
            this.debugLog('warn', 'SVSMODE rejected from non-services peer');
            return;
        }
        if (parts.length < 4) {
            this.debugLog('warn', 'Invalid SVSMODE command from server');
            return;
        }
        var targetUniqueId = parts[2];
        var modeStr = parts[3] || parts[4] || '';
        if (modeStr.startsWith(':')) modeStr = modeStr.slice(1);
        var targetNickname = this.findUserByUniqueId(targetUniqueId);
        var targetSocket = this.findLocalSocketByUniqueId(targetUniqueId);
        if (!targetNickname) {
            this.debugLog('warn', `No user found for target unique ID ${targetUniqueId}`);
            return;
        }
        let adding = true;
        for (const char of modeStr) {
            if (char === '+') {
                adding = true;
            } else if (char === '-') {
                adding = false;
            } else if (char) {
                this.setUserMode(targetNickname, char, adding);
            }
        }
        var username = this.usernames.get(nickname) || nickname;
        var hostname = this.hostnames.get(nickname) || '';
        if (targetSocket) {
            await this.safeWriteToSocket(targetSocket, `:${nickname}!${username}@${hostname} MODE ${targetNickname} ${modeStr}\r\n`);
        }
        await this.broadcastToAllServers(`:${sourceUniqueId} SVSMODE ${targetUniqueId} ${modeStr}\r\n`, socket);
    }
};
