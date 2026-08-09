'use strict';

const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const workspaceRoot = __dirname;
const httpsDir = path.join(workspaceRoot, '..', 'includes', 'ServiceDeps', 'https');
const msnDir = path.join(workspaceRoot, '..', 'includes', 'ServiceDeps', 'msntv2');

const domains = [
    "headwaiter.trusted.msntv.msn.com",
    "sg1.trusted.msntv.msn.com",
    "sg2.trusted.msntv.msn.com",
    "sg3.trusted.msntv.msn.com",
    "sg4.trusted.msntv.msn.com",
    "msntv.msn.com",
    "mail.services.live.com",
    "login.live.com",
    "poptimize.msn.com",
    "favorites.msn.com",
    "messenger.msn.com",
    "livefilestore.com",
    "users.storage.live.com",
    "g.msn.com",
    "msnialogin.passport.com",
    "minisrv.local"
]

const defaultCaCertPath = path.join(msnDir, 'emac.crt');
const defaultCaKeyPath = path.join(msnDir, 'emac.key');
const defaultOutCertPath = path.join(msnDir, 'minisrv.crt');
const defaultOutKeyPath = path.join(msnDir, 'minisrv.key');

function parseArgs(argv) {
    const out = {};
    for (let i = 2; i < argv.length; i++) {
        const part = argv[i];
        if (!part.startsWith('--')) continue;
        const key = part.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            out[key] = true;
            continue;
        }
        out[key] = next;
        i += 1;
    }
    return out;
}


function loadPemOrThrow(filePath, label) {
    if (!fs.existsSync(filePath)) {
        throw new Error(label + ' file missing: ' + filePath);
    }
    return fs.readFileSync(filePath, 'utf8');
}

function ensureDirFor(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function signAlgorithm(sigName) {
    const lower = String(sigName || 'sha1').toLowerCase();
    if (lower === 'sha256') return forge.md.sha256.create();
    if (lower === 'sha384') return forge.md.sha384.create();
    if (lower === 'sha512') return forge.md.sha512.create();
    return forge.md.sha1.create();
}

function generateCert({ domains, caCertPem, caKeyPem, outCertPath, outKeyPath, years, sig }) {
    const caCert = forge.pki.certificateFromPem(caCertPem);
    const caKey = forge.pki.privateKeyFromPem(caKeyPem);

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));

    cert.validity.notBefore = new Date('2000-01-01T12:00:00Z');
    cert.validity.notAfter = new Date('2099-12-31T23:59:59Z');

    const cn = domains[0] || 'headwaiter.trusted.msntv.msn.com';
    cert.setSubject([
        { name: 'commonName', value: cn },
        { name: 'organizationName', value: 'Zefie Networks' },
        { name: 'countryName', value: 'US' }
    ]);
    cert.setIssuer(caCert.subject.attributes);

    cert.setExtensions([
        { name: 'basicConstraints', cA: false },
        { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
        { name: 'extKeyUsage', serverAuth: true },
        {
            name: 'subjectAltName',
            altNames: domains.map((d) => ({ type: 2, value: d }))
        }
    ]);

    cert.sign(caKey, signAlgorithm(sig));

    ensureDirFor(outCertPath);
    ensureDirFor(outKeyPath);
    fs.writeFileSync(outKeyPath, forge.pki.privateKeyToPem(keys.privateKey), 'utf8');
    fs.writeFileSync(outCertPath, forge.pki.certificateToPem(cert), 'utf8');

    return { cn, count: domains.length };
}

function main() {
    const args = parseArgs(process.argv);

    const caCertPath = path.resolve(workspaceRoot, args['ca-cert'] || defaultCaCertPath);
    const caKeyPath = path.resolve(workspaceRoot, args['ca-key'] || defaultCaKeyPath);
    const outCertPath = path.resolve(workspaceRoot, args['out-cert'] || defaultOutCertPath);
    const outKeyPath = path.resolve(workspaceRoot, args['out-key'] || defaultOutKeyPath);
    const years = Number(args.years || 15);
    const sig = String(args.sig || 'sha1');

    const caCertPem = loadPemOrThrow(caCertPath, 'CA cert');
    const caKeyPem = loadPemOrThrow(caKeyPath, 'CA key');

    const result = generateCert({
        domains,
        caCertPem,
        caKeyPem,
        outCertPath,
        outKeyPath,
        years,
        sig
    });

    console.log('[msn-san-cert] generated cert:', outCertPath);
    console.log('[msn-san-cert] generated key :', outKeyPath);
    console.log('[msn-san-cert] domains       :', result.count);
    console.log('[msn-san-cert] common name   :', result.cn);
    console.log('[msn-san-cert] signature alg :', sig);
}

if (require.main === module) {
    try {
        main();
    } catch (err) {
        console.error('[msn-san-cert] error:', err.message);
        process.exit(1);
    }
}
