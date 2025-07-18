const fs = require('fs');
const pcap = require('pcap-parser');
const WTVSec = require('./includes/classes/WTVSec.js');
const WTVLZPF = require('./includes/classes/WTVLzpf.js');
const httpHeaderParser = require('http-string-parser');

const server_ip = '192.168.11.26'; // 🔁 Replace with actual IP
const connections = new Map(); // (key: `${srcIP}:${srcPort}<->${dstIP}:${dstPort}`)

function connectionKey(src, sport, dst, dport) {
    return `${src}:${sport}<->${dst}:${dport}`;
}

class ConnectionState {
    constructor() {
        this.packets = [];
        this.buffer = Buffer.alloc(0);
        this.rc4 = null;
        this.secure = false;
        this.wtv = null;
        this.incarnation = null;
    }

    feed(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        this.packets.push(data);

        // Parse headers if not done
        const text = this.buffer.toString();
        if (!this.wtv && text.includes('wtv-initial-key')) {
            const headers = httpHeaderParser.parseResponse(text).headers;
            if (headers['wtv-initial-key'] && headers['wtv-challenge']) {
                const initialKey = headers['wtv-initial-key'].trim();
                const challenge = headers['wtv-challenge'].trim();

                this.wtv = new WTVSec({
                    config: {
                        keys: {
                            initial_shared_key: initialKey,
                        },
                        debug_flags: {
                            debug: false
                        }
                    }
                });

                this.wtv.ProcessChallenge(challenge);
            }
        }

        if (!this.secure && text.includes('SECURE ON')) {
            const headers = httpHeaderParser.parseRequest(text).headers;
            let incarnationHeader = Object.keys(headers).find(k => k.toLowerCase() === 'wtv-incarnation');
            let incarnationValue = incarnationHeader ? headers[incarnationHeader].trim() : "1";

            this.incarnation = parseInt(incarnationValue);
            if (this.wtv) {
                this.wtv.set_incarnation(this.incarnation);
                this.secure = true;
                console.log("🔐 SECURE ON -- Starting decryption (incarnation =", this.incarnation + ")");
            }
        }
    }

    decrypt(data) {
        if (this.secure && this.wtv) {
            try {
                return this.wtv.Decrypt(0, data); // Use key1 by default
            } catch (e) {
                console.error("Decryption failed:", e);
                return data;
            }
        }
        return data;
    }
}

// Main PCAP processing
const parser = pcap.parse(fs.createReadStream('pcap.pcap'));

parser.on('packet', packet => {
    const data = packet.data;
    const ethType = data.readUInt16BE(12);
    if (ethType !== 0x0800) return; // Not IPv4

    const ipHeader = data.slice(14, 34);
    const protocol = ipHeader[9];
    if (protocol !== 6) return; // Not TCP

    const srcIP = ipHeader.slice(12, 16).join('.');
    const dstIP = ipHeader.slice(16, 20).join('.');
    const tcpHeaderStart = 34;
    const srcPort = data.readUInt16BE(tcpHeaderStart);
    const dstPort = data.readUInt16BE(tcpHeaderStart + 2);
    const tcpHeaderLen = (data[tcpHeaderStart + 12] >> 4) * 4;
    const tcpPayloadOffset = tcpHeaderStart + tcpHeaderLen;

    const payload = data.slice(tcpPayloadOffset);
    if (payload.length === 0) return;

    const isServer = srcIP === server_ip;
    const connKey = connectionKey(srcIP, srcPort, dstIP, dstPort);

    if (!connections.has(connKey)) {
        connections.set(connKey, new ConnectionState());
    }

    const state = connections.get(connKey);
    state.feed(payload);

    const decrypted = state.decrypt(payload);

 /* TODO
    if (decrypted.includes("wtv-lzpf")) {
        const headers = decrypted.toString('utf8').split("\n\n")[0];
        const lzpf_data = decrypted.slice(headers.length + 2);
        const lzpf = new WTVLZPF();
        process.stdout.write(headers);
        const decomp_data = lzpf.Decompress(lzpf_data);
        process.stdout.write(decomp_data);
    }
*/
    process.stdout.write(decrypted);
});

parser.on('end', () => {
    console.log('\n✅ Done parsing PCAP.');
});
