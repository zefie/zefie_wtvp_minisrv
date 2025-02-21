const headerDelimiter = Buffer.from('\n\n');
let accumulatedBuffer = Buffer.alloc(0);
const process = require('process');
const fs = require('fs');
const path = require('path');
const classPath = path.resolve(__dirname + path.sep + "includes" + path.sep + "classes" + path.sep) + path.sep;
const { WTVShared, clientShowAlert } = require(classPath + "/WTVShared.js");
const WTVTellyScript = require(classPath + "/WTVTellyScript.js")

headers = `GET wtv-1800:/preregister
wtv-client-serial-number: 9111111111111111
wtv-show-time-record: 1 <file://disk/Browser/cSetup/cSetup.html>
wtv-request-type: primary
wtv-system-cpuspeed: 166187148
wtv-system-sysconfig: 4163328
wtv-disk-size: 8006
wtv-viewer: WebTVIntel--2.5-HE
wtv-incarnation: 1
Accept-Language: en
wtv-connect-session-id: 7b662075
wtv-system-version: 7181
wtv-capability-flags: 10935ffc8f
wtv-client-bootrom-version: 2046
wtv-client-rom-type: bf0app
wtv-open-access: true
wtv-system-chipversion: 51511296
User-Agent: Mozilla/4.0 WebTV/2.2.6.1 (compatible; MSIE 4.0)
wtv-encryption: true
wtv-script-id: 0
wtv-script-mod: 0

`


//wtv-client-rom-type: US-LC2-disk-0MB-8MB

const net = require('net');

// Create a socket connection to localhost on port 1615
const client = net.connect({ port: 1615, host: '127.0.0.1' }, () => {
  console.log('Connected to localhost:1615');
  // Optionally, write data to the server
  client.write(headers);
});

// Handle incoming data from the server
client.on('data', (chunk) => {
  accumulatedBuffer = Buffer.concat([accumulatedBuffer, chunk]);

  // Look for the header delimiter in the accumulated buffer
  const headerEndIndex = accumulatedBuffer.indexOf(headerDelimiter);
  
  if (headerEndIndex !== -1) {
    // Split the buffer into headers and body
    const headersBuffer = accumulatedBuffer.slice(0, headerEndIndex);
    const bodyBuffer = accumulatedBuffer.slice(headerEndIndex + headerDelimiter.length);
    
    // Optionally, if you expect more body data in subsequent chunks,
    // you can reset the accumulatedBuffer to only hold the current body
    accumulatedBuffer = bodyBuffer;
  }

  telly = new WTVTellyScript(accumulatedBuffer)
    console.log(telly.packed_header)
    console.log(telly.raw_data)
  // Optionally, close the connection after receiving data
  client.end();
});

// Handle the connection close event
client.on('end', () => {
  console.log('Disconnected from server');
});

// Handle errors
client.on('error', (err) => {
  console.error('Socket error:', err);
});
