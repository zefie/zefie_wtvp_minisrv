const { promisify } = require('util');
const { resolve } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const { exec } = require("child_process");
const path = require('path');

// Usage: node test.js [filename|directory]
// If no argument is provided, checks all JavaScript files in the project
// If filename is provided, checks only that specific file
// If directory is provided, recursively checks all JavaScript files in that directory

async function getFiles(dir) {
	const subdirs = await readdir(dir);
	const files = await Promise.all(subdirs.map(async (subdir) => {
		const res = resolve(dir, subdir);
		return (await stat(res)).isDirectory() ? getFiles(res) : res;
	}));
	return files.reduce((a, f) => a.concat(f), []);
}

function checkScopeErrors(file) {
	return new Promise((resolve) => {
		// Create a temporary ESLint config file to avoid command-line escaping issues
		const tempConfigPath = path.join(__dirname, '.temp-eslint-config.json');
		
		// Check if file is in ServiceDeps or ServiceVault directories
		const normalizedFile = file.replace(/\\/g, '/');
		const isServiceFile = normalizedFile.includes('includes/ServiceDeps') || normalizedFile.includes('includes/ServiceVault');
		
		const eslintConfig = {
			"parserOptions": {
				"ecmaVersion": 2022,
				"sourceType": "module"
			},
			"env": {
				"node": true,
				"es2022": true
			},
			"rules": {
				"no-redeclare": 2,
				"no-undef": 2,
				"no-use-before-define": ["error", {"variables": false, "functions": false, "classes": false}],
				"block-scoped-var": 2,
				"no-const-assign": 2,
				"prefer-const": 1,
				"no-var": 1,
				"no-restricted-globals": [
					"warn",
					{
						"name": "escape",
						"message": "escape() is deprecated. Use encodeURIComponent() instead."
					},
					{
						"name": "unescape", 
						"message": "unescape() is deprecated. Use decodeURIComponent() instead."
					}
				],
				"no-restricted-syntax": [
					"warn",
					// String methods
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.property.name='substr']",
						"message": "String.prototype.substr() is deprecated. Use String.prototype.slice() instead."
					},
					{
						"selector": "CallExpression[callee.name='substr']",
						"message": "substr() is deprecated. Use slice() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.property.name='substring']",
						"message": "substring() found, for continuity, please use String.prototype.slice() instead."
					},
					{
						"selector": "CallExpression[callee.name='substring']",
						"message": "substring() found, for continuity, please use slice() instead."
					},
					// Buffer methods
					{
						"selector": "CallExpression[callee.type='Buffer'][callee.property.name='slice']",
						"message": "Found .slice() call. If this is on a Buffer, use Buffer.subarray() instead for better performance."
					},
					{
						"selector": "NewExpression[callee.name='Buffer']",
						"message": "new Buffer() is deprecated. Use Buffer.from(), Buffer.alloc(), or Buffer.allocUnsafe() instead."
					},
					// Node.js specific deprecations
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='fs'][callee.property.name='exists']",
						"message": "fs.exists() is deprecated. Use fs.existsSync() or fs.access() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isArray']",
						"message": "util.isArray() is deprecated. Use Array.isArray() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isBoolean']",
						"message": "util.isBoolean() is deprecated. Use typeof x === 'boolean' instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isBuffer']",
						"message": "util.isBuffer() is deprecated. Use Buffer.isBuffer() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isDate']",
						"message": "util.isDate() is deprecated. Use x instanceof Date instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isError']",
						"message": "util.isError() is deprecated. Use x instanceof Error instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isFunction']",
						"message": "util.isFunction() is deprecated. Use typeof x === 'function' instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isNull']",
						"message": "util.isNull() is deprecated. Use x === null instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isNullOrUndefined']",
						"message": "util.isNullOrUndefined() is deprecated. Use x == null instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isNumber']",
						"message": "util.isNumber() is deprecated. Use typeof x === 'number' instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isObject']",
						"message": "util.isObject() is deprecated. Use typeof x === 'object' && x !== null instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isPrimitive']",
						"message": "util.isPrimitive() is deprecated. Use manual type checking instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isRegExp']",
						"message": "util.isRegExp() is deprecated. Use x instanceof RegExp instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isString']",
						"message": "util.isString() is deprecated. Use typeof x === 'string' instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isSymbol']",
						"message": "util.isSymbol() is deprecated. Use typeof x === 'symbol' instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='isUndefined']",
						"message": "util.isUndefined() is deprecated. Use x === undefined instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='debug']",
						"message": "util.debug() is deprecated. Use console.error() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='error']",
						"message": "util.error() is deprecated. Use console.error() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='print']",
						"message": "util.print() is deprecated. Use console.log() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='puts']",
						"message": "util.puts() is deprecated. Use console.log() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='util'][callee.property.name='pump']",
						"message": "util.pump() is deprecated. Use stream.pipeline() instead."
					},
					// Domain module (deprecated)
					{
						"selector": "CallExpression[callee.name='require'][arguments.0.value='domain']",
						"message": "The 'domain' module is deprecated. Use AsyncLocalStorage or async_hooks instead."
					},
					// Crypto deprecations
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='crypto'][callee.property.name='createCredentials']",
						"message": "crypto.createCredentials() is deprecated. Use tls.createSecureContext() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='crypto'][callee.property.name='Credentials']",
						"message": "crypto.Credentials is deprecated. Use tls.SecureContext instead."
					},
					// Custom project-specific deprecations
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.name='session_data'][callee.property.name='hasCap']",
						"message": "session_data.hasCap() is deprecated. Use session_data.capabilities.get() instead."
					},
					{
						"selector": "CallExpression[callee.type='MemberExpression'][callee.object.type='MemberExpression'][callee.object.property.name='session_data'][callee.property.name='hasCap']",
						"message": "session_data.hasCap() is deprecated. Use session_data.capabilities.get() instead."
					}
				]
			}
		};
		
		// Add global variables for service files to ignore specific undefined variables
		if (isServiceFile) {
			eslintConfig.globals = {
				"wtvmime": "readonly",
				"http": "readonly",
				"https": "readonly",
				"sharp": "readonly",
				"util": "readonly",
				"nunjucks": "readonly",
				"URL": "readonly",
				"URLSearchParams": "readonly",
				"wtvshared": "readonly",
				"zlib": "readonly",
				"clientShowAlert": "readonly",
				"WTVClientSessionData": "readonly",
				"WTVClientCapabilities": "readonly",
				"strftime": "readonly",
				"CryptoJS": "readonly",
				"crypto": "readonly",
				"fs": "readonly",
				"path": "readonly",
				"debug": "readonly",
				"minisrv_config": "readonly",
				"socket": "readonly",
				"headers": "readonly",
				"data": "readonly",
				"request_is_async": "readonly",
				"minisrv_version_string": "readonly",
				"getServiceString": "readonly",
				"sendToClient": "readonly",
				"service_vaults": "readonly",
				"service_deps": "readonly",
				"ssid_sessions": "readonly",
				"moveArrayKey": "readonly",
				"cwd": "readonly",
				"request_headers": "readonly",
				"session_data": "readonly",
				"service_name": "readonly"
			};
			
			// Check if this is a privileged service by examining the file path
			try {
				// Load WTVShared to read configuration
				const WTVShared = require('./includes/classes/WTVShared.js')['WTVShared'];
				const wtvshared = new WTVShared(null, true); // Load config, suppress output
				const config = wtvshared.minisrv_config;
				
				// Extract service name from file path
				// Look for patterns like includes/ServiceVault/wtv-servicename or includes/ServiceDeps/.../wtv-servicename
				const serviceMatch = normalizedFile.match(/includes\/Service(?:Vault|Deps)(?:\/[^\/]*)*?\/(wtv-[a-z0-9-]+|[a-z0-9-]+)(?:\/|$)/);
				if (serviceMatch) {
					const serviceName = serviceMatch[1];
					
					// Try both with and without wtv- prefix
					const serviceNameWithPrefix = serviceName.startsWith('wtv-') ? serviceName : `wtv-${serviceName}`;
					const serviceNameWithoutPrefix = serviceName.startsWith('wtv-') ? serviceName.replace('wtv-', '') : serviceName;
					
					// Check if either service name exists and is privileged
					const service = config.services[serviceNameWithPrefix] || config.services[serviceNameWithoutPrefix];

					
					if (service && service.privileged === true) {
						// Add additional globals for privileged services
						eslintConfig.globals = {
							...eslintConfig.globals,
							"privileged": "readonly",
							"SessionStore": "readonly",
							"socket_sessions": "readonly",
							"reloadConfig": "readonly",
							"classPath": "readonly",
							"session_data": "readonly",
						};
					}

					if (serviceName === "wtv-guide") {
						eslintConfig.globals["wtvguide"] = "readonly";
					}

					if (service && service.modules) {
						for (const moduleName of service.modules) {
							eslintConfig.globals[moduleName] = "readonly";
							if (moduleName === "WTVNews") {
								eslintConfig.globals["wtvnewsserver"] = "readonly";
							}
						}
					}					
				}
			} catch (e) {
				// If we can't load config, just continue with basic globals
				console.log(` * Warning: Could not load config for privileged service detection: ${e.message}`);
			}
		}
		
		// Write temporary config file
		fs.writeFileSync(tempConfigPath, JSON.stringify(eslintConfig, null, 2));
		
		// Use ESLint to check for scope-related errors with let/const
		const eslintCmd = `npx eslint --no-eslintrc --config "${tempConfigPath}" --format compact "${file}"`;
		
		exec(eslintCmd, (error, stdout, stderr) => {
			// Clean up temporary config file
			try {
				fs.unlinkSync(tempConfigPath);
			} catch (e) {
				// Ignore cleanup errors
			}
			
			if (stdout && stdout.trim().length > 0) {
				console.log(` * Scope errors found in ${file.replace(__dirname + path.sep, "." + path.sep)}:`);
				console.log(stdout);
			}
			resolve();
		});
	});
}

function checkSyntax(file) {
	return new Promise((resolve) => {
		exec("node --check \"" + file + "\"", (error, stdout, stderr) => {
			if (stderr.length > 0) {
				console.log(`${stderr}`);
			}
			resolve();
		});
	});
}

getFiles(__dirname)
	.then(async files => {
		// Check if a specific file or directory was provided as command line argument
		const targetPath = process.argv[2];
		let jsFiles;
		
		if (targetPath) {
			// If a specific path is provided, resolve it and check if it exists
			const fullPath = path.resolve(__dirname, targetPath);
			
			if (fs.existsSync(fullPath)) {
				const stats = fs.statSync(fullPath);
				
				if (stats.isFile()) {
					// Single file provided
					if (path.extname(fullPath) === ".js") {
						jsFiles = [fullPath];
						console.log(`Checking specific file: ${targetPath}\n`);
					} else {
						console.error(`Error: File "${targetPath}" is not a JavaScript file.`);
						process.exit(1);
					}
				} else if (stats.isDirectory()) {
					// Directory provided - recursively get all JS files
					console.log(`Checking directory: ${targetPath}\n`);
					const directoryFiles = await getFiles(fullPath);
					jsFiles = directoryFiles.filter(file => 
						path.extname(file) === ".js" && 
						file.indexOf("node_modules") === -1
					);
					if (jsFiles.length === 0) {
						console.log("No JavaScript files found in the specified directory.");
						process.exit(0);
					}
					console.log(`Found ${jsFiles.length} JavaScript file(s) in directory.\n`);
				} else {
					console.error(`Error: "${targetPath}" is neither a file nor a directory.`);
					process.exit(1);
				}
			} else {
				console.error(`Error: Path "${targetPath}" not found.`);
				process.exit(1);
			}
		} else {
			// If no specific path, check all JS files as before
			jsFiles = files.filter(file => 
				path.extname(file) == ".js" && 
				file.indexOf("node_modules") == -1
			);
			console.log("Running syntax and scope checks on all JavaScript files...\n");
		}
		
		for (const file of jsFiles) {
			console.log(" * Checking", file.replace(__dirname + path.sep, "." + path.sep));
			
			// Check syntax first
			await checkSyntax(file);
			
			// Then check for scope errors
			await checkScopeErrors(file);
		}
		
		console.log("\nChecks completed.");
	})
	.catch(e => console.error(e));

