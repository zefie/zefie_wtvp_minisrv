'use strict';
const path = require('path');
var classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
require(classPath + "Prototypes.js");
const WTVIRC = require(classPath + "WTVIRC.js");
const { WTVShared, clientShowAlert } = require(classPath + "WTVShared.js");
const wtvshared = new WTVShared(); // creates minisrv_config
const net = require('net');

var minisrv_config = wtvshared.readMiniSrvConfig(true, false, true);

if (!minisrv_config.config.irc || !minisrv_config.config.irc.enabled) {
    console.error('IRC is not enabled in the configuration.');
    process.exit(1);
}

const HOST = 'localhost';
const PORT = minisrv_config.config.irc.port; // Example IRC port

const client = new net.Socket();

var lastLine = '';

client.connect(PORT, HOST, () => {
    console.log(`Connected to ${HOST}:${PORT}`);
    // You can send data here, e.g.:
    // client.write('NICK testuser\r\n');
    // client.write('USER testuser 0 * :Test User\r\n');
});

client.on('data', (data) => {
    console.log('Received:', data.toString());
    lastLine = data.toString();
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on('error', (err) => {
    console.error('Connection error:', err);
});


testCase4();

function testCase1() {
    // Try to auth as a server when we are not allowed to
    client.write('SERVER testserver 0 * :Test Server\r\n');
    client.write('PASS \b\b\b\b\b\b\b\b\b\b\r\n');
    client.write('SERVER testserver 0 * :Test Server\r\n');
    client.write(`SVINFO 6 6 0 :-1\r\n`);
    client.write('PASS \b\b\b\b\b\b\b\b\b\b\r\n');
    // we should be disconnected here
}

function testCase2() {
    // Malformed user authentication
    client.write('NICK invaliduser\r\n');
    client.write('USER invaliduser\r\n');
    client.write('NICK invaliduser2\r\n');
    client.write('NICK invaliduser\r\n');
    client.write('USER invaliduser\r\n');
    client.write('USER invaliduser\r\n');
    client.write('USER invaliduser\r\n');
    client.write('USER invaliduser\r\n');
    // we should be disconnected here
}

async function waitFor(expectedResponse) {
    while (!lastLine.includes(expectedResponse)) {
        await new Promise(resolve => setTimeout(resolve, 10)); // wait for 10ms
    }
}
    
async function testCase3() {
    // join, msg, quit
    client.write('NICK testuser\r\n');
    client.write('USER testuser 0 * :Test User\r\n');
    await waitFor("005");
    client.write('JOIN #testchannel\r\n');
    await new Promise(resolve => setTimeout(resolve, 10)); // wait for 10ms
    client.write('PRIVMSG #testchannel :Hello, world!\r\n');
    await new Promise(resolve => setTimeout(resolve, 10)); // wait for 10ms
    client.write('PART #testchannel\r\n');
    await new Promise(resolve => setTimeout(resolve, 10)); // wait for 10ms
    client.write('QUIT :Goodbye\r\n');
    // we should be disconnected here
}

function testCase4() {
    // Arbitrary commands
    client.write('NICK testuser\r\n');
    client.write('MODE testuser +i\r\n');
    client.write('TOPIC #testchannel :New topic\r\n');
    client.write('KICK #testchannel testuser :You have been kicked\r\n');
    client.write('NOTICE testuser :This is a notice\r\n');
    client.write('INVITE testuser #testchannel\r\n');
    client.write('WHO #testchannel\r\n');
    client.write('LIST\r\n');
}