// From https://stackoverflow.com/a/42019773

'use strict';
const net = require('net');
const http = require('http');
const https = require('https');

exports.createServer = (opts, handler) => {
    const server = net.createServer(socket => {
        socket.once('data', buffer => {
            // Pause the socket
            socket.pause();

            // Determine if this is an HTTP(s) request
            const byte = buffer[0];

            let protocol;
            if (byte === 22) {
                protocol = 'https';
            } else if (32 < byte && byte < 127) {
                protocol = 'http';
            }

            const proxy = server[protocol];
            if (proxy) {
                // Push the buffer back onto the front of the data stream
                socket.unshift(buffer);

                // Emit the socket to the HTTP(s) server
                proxy.emit('connection', socket);
            }
            
            // As of NodeJS 10.x the socket must be 
            // resumed asynchronously or the socket
            // connection hangs, potentially crashing
            // the process. Prior to NodeJS 10.x
            // the socket may be resumed synchronously.
            process.nextTick(() => socket.resume()); 
        });
    });

    server.http = http.createServer(handler);
    server.https = https.createServer(opts, handler);
    return server;
};