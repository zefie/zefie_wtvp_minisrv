#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = path.resolve(__dirname, '..');
const USER_CONFIG_PATH = path.join(ROOT_DIR, 'user_config.json');

function printUsage() {
    console.log('Usage:');
    console.log('  node tools/configurator.js <dot.path.key> <value> [--overwrite]');
    console.log('  node tools/configurator.js <dot.path.key> --delete [--overwrite]');
    console.log('Examples:');
    console.log('  node tools/configurator.js config.keys.user_data_key mynewkey');
    console.log('  node tools/configurator.js config.passwords.enabled true --overwrite');
    console.log('  node tools/configurator.js config.fake.newkey --delete --overwrite');
}

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

function parseInputValue(raw) {
    const trimmed = raw.trim();
    const isLiteral = /^(?:-?\d+(?:\.\d+)?|true|false|null)$/i.test(trimmed);
    const startsLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"');

    if (!isLiteral && !startsLikeJson) {
        return raw;
    }

    try {
        return JSON.parse(trimmed);
    } catch (_error) {
        return raw;
    }
}

function readUserConfig(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}\n', 'utf8');
        return {};
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.trim()) return {};

    try {
        return parseJsonWithComments(content);
    } catch (error) {
        throw new Error(`Failed to parse user_config.json: ${error.message}`);
    }
}

function askYesNo(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            const normalized = String(answer || '').trim().toLowerCase();
            resolve(normalized === 'y' || normalized === 'yes');
        });
    });
}

function sortKeys(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    return Object.keys(obj).sort().reduce((sorted, key) => {
        sorted[key] = sortKeys(obj[key]);
        return sorted;
    }, {});
}

function getPathInfo(rootObj, parts) {
    let current = rootObj;

    for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i];

        if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
            current[part] = {};
        }

        current = current[part];
    }

    const leafKey = parts[parts.length - 1];
    const exists = Object.prototype.hasOwnProperty.call(current, leafKey);
    const oldValue = exists ? current[leafKey] : undefined;

    return {
        parent: current,
        leafKey,
        exists,
        oldValue
    };
}

async function main() {
    const args = process.argv.slice(2);
    const overwrite = args.includes('--overwrite');
    const deleteMode = args.includes('--delete');
    const positional = args.filter((arg) => arg !== '--overwrite' && arg !== '--delete');

    if ((deleteMode && positional.length < 1) || (!deleteMode && positional.length < 2)) {
        printUsage();
        process.exit(1);
    }

    const dotPath = positional[0];
    const valueRaw = deleteMode ? null : positional.slice(1).join(' ');
    const pathParts = dotPath.split('.').filter(Boolean);

    if (pathParts.length === 0) {
        throw new Error('Invalid path. Provide a dot-separated path like config.keys.user_data_key');
    }

    if (deleteMode && pathParts.length === 1) {
        const rootKey = pathParts[0];
        if (rootKey === 'config' || rootKey === 'services') {
            throw new Error('Deletion of root keys "config" and "services" is not allowed.');
        }
    }

    const config = readUserConfig(USER_CONFIG_PATH);

    if (deleteMode) {
        const pathInfo = getPathInfo(config, pathParts);
        if (!pathInfo.exists) {
            console.log('Key does not exist. No changes made.');
            return;
        }

        if (!overwrite) {
            const question = `Delete ${dotPath}? [y/N] `;
            const approved = await askYesNo(question);
            if (!approved) {
                console.log('No changes made.');
                return;
            }
        }

        delete pathInfo.parent[pathInfo.leafKey];
        fs.writeFileSync(USER_CONFIG_PATH, `${JSON.stringify(sortKeys(config), null, 2)}\n`, 'utf8');
        console.log(`Deleted ${dotPath}.`);
        return;
    }

    const pathInfo = getPathInfo(config, pathParts);
    const newValue = parseInputValue(valueRaw);

    if (pathInfo.exists && !overwrite) {
        const question = `Key ${dotPath} already exists. Overwrite? [y/N] `;
        const approved = await askYesNo(question);

        if (!approved) {
            console.log('No changes made.');
            return;
        }
    }

    pathInfo.parent[pathInfo.leafKey] = newValue;

    fs.writeFileSync(USER_CONFIG_PATH, `${JSON.stringify(sortKeys(config), null, 2)}\n`, 'utf8');

    if (pathInfo.exists) {
        console.log(`Updated ${dotPath}.`);
    } else {
        console.log(`Created ${dotPath}.`);
    }
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});