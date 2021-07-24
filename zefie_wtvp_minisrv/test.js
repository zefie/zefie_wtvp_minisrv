const { promisify } = require('util');
const { resolve } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const { exec } = require("child_process");
var path = require('path');

async function getFiles(dir) {
	const subdirs = await readdir(dir);
	const files = await Promise.all(subdirs.map(async (subdir) => {
		const res = resolve(dir, subdir);
		return (await stat(res)).isDirectory() ? getFiles(res) : res;
	}));
	return files.reduce((a, f) => a.concat(f), []);
}

getFiles(__dirname)
	.then(files => {
		files.forEach(function (file) {
			if (path.extname(file) == ".js" && file.indexOf("node_modules") == -1) {
				console.log(" * Checking syntax of", file.replace(__dirname + path.sep, "." + path.sep));
				exec("node --check \"" + file + "\"", (error, stdout, stderr) => {
					if (stderr.length > 0) {
						console.log(`${stderr}`);
						return;
					}
				});
			}
		});
	})
	.catch(e => console.error(e));

