#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_CONFIG_PATH = path.join(ROOT_DIR, 'includes', 'config.json');
const USER_CONFIG_PATH = path.join(ROOT_DIR, 'user_config.json');

function parseJsonWithComments(json) {
    if (typeof json !== 'string') json = json ? json.toString() : '';
    let result = '';
    let i = 0;
    let isString = false;
    let isEscape = false;
    let isBlockComment = false;
    let isLineComment = false;

    while (i < json.length) {
        const char = json[i];
        const nextChar = json[i + 1];

        if (!isString && !isEscape && char === '/' && nextChar === '*') {
            isBlockComment = true;
            i += 1;
        } else if (isBlockComment && char === '*' && nextChar === '/') {
            isBlockComment = false;
            i += 1;
        } else if (!isString && !isEscape && char === '/' && nextChar === '/') {
            isLineComment = true;
            i += 1;
        } else if (isLineComment && (char === '\n' || char === '\r')) {
            isLineComment = false;
        } else if (!isBlockComment && !isLineComment) {
            if (char === '"' && !isEscape) {
                isString = !isString;
            }
            isEscape = char === '\\' && !isEscape;
            result += char;
        }
        i += 1;
    }

    return JSON.parse(result);
}

function readJsonWithComments(filePath, required) {
    if (!fs.existsSync(filePath)) {
        if (required) throw new Error(`Required file not found: ${filePath}`);
        return {};
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return parseJsonWithComments(raw);
}

function integrateConfig(main, user) {
    const out = Array.isArray(main) ? main.slice() : { ...main };
    for (const key of Object.keys(user || {})) {
        const userVal = user[key];
        if (userVal && typeof userVal === 'object' && !Array.isArray(userVal)) {
            out[key] = integrateConfig(out[key] || {}, userVal);
        } else {
            out[key] = userVal;
        }
    }
    return out;
}

function isAbsoluteLike(p) {
    return /^(?:[a-zA-Z]:)?[\\/]/.test(p);
}

function resolveFromRoot(p) {
    if (isAbsoluteLike(p)) return path.normalize(p);
    return path.resolve(ROOT_DIR, p);
}

function listUserJsonFiles(accountsRoot) {
    const files = [];

    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            if (/^user\d+\.json$/i.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }

    if (fs.existsSync(accountsRoot)) walk(accountsRoot);
    return files;
}

function decryptWithKey(value, key) {
    return CryptoJS.AES.decrypt(value, key).toString(CryptoJS.enc.Utf8);
}

function encryptWithKey(value, key) {
    return CryptoJS.AES.encrypt(value, key).toString();
}

function isPrintableAndSane(str) {
    if (typeof str !== 'string') return false;
    if (str.length === 0 || str.length > 512) return false;
    if (str.includes('\uFFFD')) return false;
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(str)) return false;
    return true;
}

function isSaneDecryptedValue(fieldName, decrypted) {
    if (!isPrintableAndSane(decrypted)) return false;

    if (fieldName === 'subscriber_password') {
        const isSha512Hex = /^[a-f0-9]{128}$/i.test(decrypted);
        if (isSha512Hex) return true;
        return decrypted.length <= 128;
    }

    return true;
}

function hasNestedKey(obj, pathParts) {
    let cur = obj;
    for (const part of pathParts) {
        if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, part)) return false;
        cur = cur[part];
    }
    return true;
}

function parseArgs() {
    const args = process.argv.slice(2);
    let oldKey = null;

    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--oldkey' && args[i + 1]) {
            oldKey = args[i + 1];
            i += 1;
        } else if (args[i].startsWith('--oldkey=')) {
            oldKey = args[i].slice('--oldkey='.length);
        }
    }

    return { oldKey };
}

function main() {
    const { oldKey } = parseArgs();

    const defaultConfig = readJsonWithComments(DEFAULT_CONFIG_PATH, true);
    const userConfig = readJsonWithComments(USER_CONFIG_PATH, false);

    const defaultKey = oldKey ||
        (defaultConfig && defaultConfig.config && defaultConfig.config.keys
            ? defaultConfig.config.keys.user_data_key
            : null);

    const userHasKey = hasNestedKey(userConfig, ['config', 'keys', 'user_data_key']);
    const userKey = userHasKey ? userConfig.config.keys.user_data_key : null;

    if (oldKey) {
        console.log(`Using provided --oldkey for decryption.`);
    }

    if (!defaultKey || typeof defaultKey !== 'string') {
        throw new Error('Default config key config.keys.user_data_key is missing or invalid.');
    }

    if (!userHasKey) {
        console.log('No config.keys.user_data_key found in user_config.json. Nothing to migrate.');
        return;
    }

    if (typeof userKey !== 'string' || userKey.length === 0) {
        throw new Error('user_config.json config.keys.user_data_key is invalid.');
    }

    if (userKey === defaultKey) {
        console.log('user_config.json key matches the default key. Nothing to migrate.');
        return;
    }

    const mergedConfig = integrateConfig(defaultConfig, userConfig);
    const sessionStore = mergedConfig && mergedConfig.config ? mergedConfig.config.SessionStore : null;
    if (!sessionStore || typeof sessionStore !== 'string') {
        throw new Error('config.SessionStore is missing or invalid.');
    }

    const accountsRoot = path.join(resolveFromRoot(sessionStore), 'accounts');
    const userFiles = listUserJsonFiles(accountsRoot);

    if (userFiles.length === 0) {
        console.log(`No user account files found in ${accountsRoot}. Nothing to migrate.`);
        return;
    }

    const writableUpdates = [];
    let touchedPasswordFields = 0;

    for (const userFile of userFiles) {
        let accountData;
        try {
            accountData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
        } catch (error) {
            throw new Error(`Failed to parse account file ${userFile}: ${error.message}`);
        }

        let fileChanged = false;

        for (const fieldName of ['subscriber_password', 'subscriber_smtp_password']) {
            const encryptedValue = accountData[fieldName];
            if (encryptedValue === null || typeof encryptedValue === 'undefined') continue;
            if (typeof encryptedValue !== 'string') {
                throw new Error(`Suspicious ${fieldName} value in ${userFile}: expected string/null.`);
            }
            if (encryptedValue.length === 0) continue;

            const decryptedValue = decryptWithKey(encryptedValue, defaultKey);
            if (!isSaneDecryptedValue(fieldName, decryptedValue)) {
                throw new Error(
                    `Aborting: decrypted ${fieldName} in ${userFile} appears invalid/binary. No files were updated.\n` +
                    `If you previously used a different key, re-run with: --oldkey "<your previous key>"`
                );
            }

            accountData[fieldName] = encryptWithKey(decryptedValue, userKey);
            fileChanged = true;
            touchedPasswordFields += 1;
        }

        if (fileChanged) {
            writableUpdates.push({ filePath: userFile, accountData });
        }
    }

    for (const update of writableUpdates) {
        fs.writeFileSync(update.filePath, JSON.stringify(update.accountData), 'utf8');
    }

    console.log(`Migrated ${touchedPasswordFields} encrypted password field(s) across ${writableUpdates.length} account file(s).`);
}

try {
    main();
} catch (error) {
    console.error(error.message || error);
    process.exit(1);
}