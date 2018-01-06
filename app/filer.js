/*jshint esversion: 6 */

const log = require('./logger').log,
	_ = require('lodash'),
	async = require('async'),
	fs = require('fs-extra'),
	getBasicProps = require('./exporter').getBasicProps,
	sanitize = require('sanitize-filename');

// Root path for the export.
const exportRootPath = __dirname + '/export';

// Create the root directory for export
function createRootDirectory(cb) {
	if(fs.existsSync(exportRootPath)){
		fs.removeSync(exportRootPath)
	}

	fs.mkdir(exportRootPath, cb);
}

// Formatter to transform a given Env or Stack data into a filename
function makeFilename(data) {
	log.debug({makeFilename: data});
	if (! _.has(data, 'name')) {
		throw new Error ('Need a name, but got something without a \'name\' property');
	}
	let filename = data.name;
	// sanitize input
	filename = sanitize(filename);
	// format the string
	filename = filename.toLowerCase().trim().split(' ').join('-');
	return filename;
}

// Given a Rancher obj (env or stack), create a directory to hold its export
function createDirectory(obj, workdir, cb) {
	async.autoInject({
		meta: function (autoCb) {
			let meta = getBasicProps(obj);
			autoCb(null, meta);
		},
		name: function (meta, autoCb) {
			let name = makeFilename(meta);
			autoCb(null, name);
		},
		absent: function (name, autoCb) {
			log.debug({createDirectory: {cwd: process.cwd()}});
			fs.stat(`${workdir}/${name}`, function (err, stats) {
				// err is bad, but 'ENOENT' is good.
				if (err && err.code !== 'ENOENT') { return autoCb (err); }
				if (stats) {
					return autoCb(new Error (`Path '${workdir}/${name}' already exists`));
				}
				autoCb();
			});
		},
		mkdir: function (name, absent, autoCb) {
			fs.mkdir(`${workdir}/${name}`, autoCb);
		}
	}, function (err, results) {
		if (err) {
			log.error(err);
			throw (err);
		}
		let newDir = `${workdir}/${results.name}`;
		log.debug({createDirectory: {created: newDir}});
		cb(newDir);
	});
}

// Save YAMLs for the stack
function saveYaml(stack, path) {
	fs.writeFile(`${path}/docker-compose.yml`, stack.composeConfig.dockerComposeConfig, function (err) {
		if (err) { throw err; }
	});
	fs.writeFile(`${path}/rancher-compose.yml`, stack.composeConfig.rancherComposeConfig, function (err) {
		if (err) { throw err; }
	});
}

// Given an obj (stack or env), save its metadata as json
function saveMeta(obj, path) {
	async.autoInject({
		filename: function (cb) {
			cb(null, makeFilename(obj) + '-meta.json');
		},
		meta: function (cb) {
			let meta = {
				name: obj.name,
				description: obj.description
			};
			if (_.has(obj, 'stacks')) {
				meta.stacks = obj.stacks.length;
			}
			log.debug({meta: meta});
			cb(null, meta);
		}
	}, function (err, results) {
		let fullpath = `${path}/${results.filename}`;
		log.debug({saveMeta: results.meta });
		fs.writeFile(fullpath, JSON.stringify(results.meta), function (err) {
			if (err) { throw err; }
			log.debug({saveMeta: {wrote: fullpath}});
		});
	});
}

// Given an object (stack or env), export it to a directory
function exportObj(obj, dir, exportCb) {
	createDirectory(obj, dir, function (dir) {
		// dir is now the new directory that was created
		saveMeta(obj, dir);

		if ( _.has(obj, 'stacks')) {
			// this is an env - export all stacks
			envName = obj.name;
			async.each(obj.stacks, function (stack, cb) {
				exportObj(stack, dir, function (err) {
					log.debug({exportObj: {name: stack.name, dir: dir}});
					cb(err);
				});
			}, function (err) {
				exportCb(err);
			});
		}

		else {
			// this is a stack
			saveYaml(obj, dir);
			log.debug ({exportObj: {stack: obj.name, dir: dir}});
			log.info (`Exported stack ${obj.name}`);
			exportCb();
		}
	});
}

function save(envs) {
	let workdir = exportRootPath;
	async.autoInject({
		createRoot: function (autoCb) {
			createRootDirectory(autoCb);
		},
		exportEnvs: function (createRoot, autoCb) {
			async.each(envs, function (e, eachCb) {
				exportObj(e, workdir, function (err) {
					if (err) { return eachCb (err);}
					eachCb();
				});
			}, function (err) {
				autoCb(err);
			});
		}
	}, function (err, results) {
		if (err) { throw (err); }
		log.debug({save: results});
	});
}

module.exports = {
	save: save
};

/*
* Directory structure:
*
*		export
*		├── env-1
*		│   ├── env-1-meta.json
*		│   ├── stack-1
*		│   │   ├── docker-compose.yml
*		│   │   ├── stack-1-meta.json
*		│   │   └── rancher-compose.yml
*		│   └── ...stack-n
*		│       ├── stack-n-meta.json
*		│       └── ...
*		└── ...env-n
*		    ├── env-n-meta.json
*		    └── ...
*/
