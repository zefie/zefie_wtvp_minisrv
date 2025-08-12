const { promisify } = require('util');
const { resolve } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const { exec } = require("child_process");
var path = require('path');

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
					let serviceName = serviceMatch[1];
					
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
						if (service.modules) {
							for (const moduleName of service.modules) {
								eslintConfig.globals[moduleName] = "readonly";
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

