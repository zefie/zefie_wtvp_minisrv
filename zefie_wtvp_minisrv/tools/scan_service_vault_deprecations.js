#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_USER_CONFIG_PATH = path.join(ROOT_DIR, 'user_config.json');
const DEFAULT_BASE_CONFIG_PATH = path.join(ROOT_DIR, 'includes', 'config.json');
const DEPRECIATED_CONFIG_PATH = path.join(ROOT_DIR, 'includes', 'depreciated.json');


function printUsage() {
  console.log('Usage: node tools/scan_service_vault_deprecations.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --vault <path>         Add a vault root to scan (can be repeated).');
  console.log('  --config <path>        Config file to read ServiceVaults from (default: user_config.json).');
  console.log('  --base-config <path>   Base config fallback (default: includes/config.json).');
  console.log('  --ext <csv>            File extensions to scan (default: .js). Example: --ext .js,.txt');
  console.log('  --json                 Emit machine-readable JSON output.');
  console.log('  --fail-on-found        Exit with code 2 if any deprecations are found.');
  console.log('  -h, --help             Show this help text.');
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
    const ch = json[i];
    const next = json[i + 1];

    if (!isString && !isEscape && ch === '/' && next === '*') {
      isBlockComment = true;
      i += 1;
    } else if (isBlockComment && ch === '*' && next === '/') {
      isBlockComment = false;
      i += 1;
    } else if (!isString && !isEscape && ch === '/' && next === '/') {
      isLineComment = true;
      i += 1;
    } else if (isLineComment && (ch === '\n' || ch === '\r')) {
      isLineComment = false;
    } else if (!isBlockComment && !isLineComment) {
      if (ch === '"' && !isEscape) {
        isString = !isString;
      }

      isEscape = ch === '\\' && !isEscape;
      result += ch;
    }

    i += 1;
  }

  return JSON.parse(result);
}

function readConfigIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return {};
  return parseJsonWithComments(raw);
}

function loadDepreciatedPatterns() {
  try {
    if (!fs.existsSync(DEPRECIATED_CONFIG_PATH)) {
      return {};
    }

    const raw = fs.readFileSync(DEPRECIATED_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return {};
    }

    const mapped = parsed
      .filter((entry) => entry && typeof entry.pattern === 'string')
      .map((entry) => ({
        id: entry.id || entry.pattern,
        pattern: new RegExp(entry.pattern, entry.flags || 'g'),
        message: entry.message || 'Deprecated API usage found',
        removeVersion: entry.removeVersion || null,
        replacement: entry.replacement || null
      }));

    return mapped.length > 0 ? mapped : {};
  } catch (error) {
    console.warn(`Warning: failed to load ${DEPRECIATED_CONFIG_PATH}: ${error.message}`);
    return {};
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    vaults: [],
    configPath: DEFAULT_USER_CONFIG_PATH,
    baseConfigPath: DEFAULT_BASE_CONFIG_PATH,
    extensions: new Set(['.js']),
    json: false,
    failOnFound: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--vault') {
      i += 1;
      const value = args[i];
      if (!value) throw new Error('Missing value for --vault');
      options.vaults.push(value);
      continue;
    }

    if (arg === '--config') {
      i += 1;
      const value = args[i];
      if (!value) throw new Error('Missing value for --config');
      options.configPath = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
      continue;
    }

    if (arg === '--base-config') {
      i += 1;
      const value = args[i];
      if (!value) throw new Error('Missing value for --base-config');
      options.baseConfigPath = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
      continue;
    }

    if (arg === '--ext') {
      i += 1;
      const value = args[i];
      if (!value) throw new Error('Missing value for --ext');

      options.extensions = new Set(
        value
          .split(',')
          .map((ext) => ext.trim().toLowerCase())
          .filter(Boolean)
          .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
      );
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--fail-on-found') {
      options.failOnFound = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function getConfiguredVaults(configPath, baseConfigPath) {
  const userConfig = readConfigIfExists(configPath) || {};
  const baseConfig = readConfigIfExists(baseConfigPath) || {};

  const userVaults = userConfig.config && Array.isArray(userConfig.config.ServiceVaults)
    ? userConfig.config.ServiceVaults
    : null;

  const baseVaults = baseConfig.config && Array.isArray(baseConfig.config.ServiceVaults)
    ? baseConfig.config.ServiceVaults
    : null;

  const selected = userVaults && userVaults.length > 0 ? userVaults : (baseVaults || []);
  return selected.map((vault) => path.resolve(ROOT_DIR, String(vault)));
}

function walkFiles(rootDir, extensions, fileList = []) {
  if (!fs.existsSync(rootDir)) return fileList;

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, extensions, fileList);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (extensions.has(ext)) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function toLineColumn(text, index) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function scanFile(filePath, patterns) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  for (const rule of patterns) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(content)) !== null) {
      const loc = toLineColumn(content, match.index);
      findings.push({
        ruleId: rule.id,
        match: match[0],
        message: rule.message,
        removeVersion: rule.removeVersion,
        replacement: rule.replacement,
        line: loc.line,
        column: loc.column
      });
    }
  }

  return findings;
}

function formatRelative(targetPath) {
  return path.relative(ROOT_DIR, targetPath) || targetPath;
}

function main() {
  const options = parseArgs(process.argv);
  const deprecationPatterns = loadDepreciatedPatterns();
  if (deprecationPatterns.length === 0) {
    console.warn('No deprecation patterns found. Exiting without scanning.');
    process.exit(0);
  }

  const configuredVaults = getConfiguredVaults(options.configPath, options.baseConfigPath);
  const explicitVaults = options.vaults.map((vault) => (
    path.isAbsolute(vault) ? path.resolve(vault) : path.resolve(process.cwd(), vault)
  ));

  const vaultsToScan = [...new Set([...configuredVaults, ...explicitVaults])];
  if (vaultsToScan.length === 0) {
    throw new Error('No ServiceVault paths found. Define config.ServiceVaults or pass --vault.');
  }

  const missingVaults = [];
  const filesToScan = [];

  for (const vaultPath of vaultsToScan) {
    if (!fs.existsSync(vaultPath)) {
      missingVaults.push(vaultPath);
      continue;
    }
    walkFiles(vaultPath, options.extensions, filesToScan);
  }

  const results = [];
  let totalFindings = 0;

  for (const filePath of filesToScan) {
    const findings = scanFile(filePath, deprecationPatterns);
    if (findings.length > 0) {
      totalFindings += findings.length;
      results.push({ file: filePath, findings });
    }
  }

  if (options.json) {
    const payload = {
      rootDir: ROOT_DIR,
      scannedVaults: vaultsToScan,
      missingVaults,
      scannedFiles: filesToScan.length,
      matchedFiles: results.length,
      totalFindings,
      results
    };
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('ServiceVault deprecation scan');
    console.log(`- Vault roots: ${vaultsToScan.length}`);
    console.log(`- Missing vault roots: ${missingVaults.length}`);
    console.log(`- Files scanned: ${filesToScan.length}`);
    console.log(`- Files with deprecations: ${results.length}`);
    console.log(`- Total deprecations: ${totalFindings}`);

    if (missingVaults.length > 0) {
      console.log('');
      console.log('Missing vault roots:');
      for (const missing of missingVaults) {
        console.log(`  - ${formatRelative(missing)}`);
      }
    }

    if (results.length > 0) {
      console.log('');
      for (const result of results) {
        console.log(formatRelative(result.file));
        for (const finding of result.findings) {
          console.log(`  ${finding.line}:${finding.column}  ${finding.ruleId}`);
          console.log(`    ${finding.message}`);
          if (finding.removeVersion) {
            console.log(`    Remove version: ${finding.removeVersion}`);
          }
          console.log(`    Match: ${finding.match}`);
          if (finding.replacement) {
            console.log(`    Fix: ${finding.replacement}`);
          }
        }
      }
    }
  }

  if (totalFindings > 0 && options.failOnFound) {
    process.exit(2);
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message || error}`);
  process.exit(1);
}
