/*jshint esversion: 6 */

var mock = require('./test/mock.json');

const log = require('./logger').log,
	_ = require('lodash'),
	async = require('async'),
	fs = require('fs'),
	getBasicProps = require('./exporter').getBasicProps,
	sanitize = require('sanitize-filename');

// Root path for the export.
const	exportRootPath = __dirname + '/export';

// Create the root directory for export
function createRootDirectory(cb) {
	fs.mkdir(exportRootPath, cb);
}

// formatter to transform a given Env or Stack data into a filename
function makeFilename(data) {
	log.debug({makeFilename: data});
	if (! _.has(data, 'name')) {
		throw new Error ('Need a name, but got something without \'name\' property');
	}
	let filename = data.name;
	// sanitize input
	filename = sanitize(filename);
	// format the string
	filename = filename.toLowerCase().trim().split(' ').join('-');
	return filename;
}

// given a Rancher obj (env or stack), create a directory to hold its export
function createDirectory(obj, workdir, cb) {
	// process.chdir(workdir); // change into working directory first
	async.autoInject({
		meta: function (cb) {
			let meta = getBasicProps(obj);
			cb(null, meta);
		},
		name: function (meta, cb) {
			let name = makeFilename(meta);
			cb(null, name);
		},
		absent: function (name, cb) {
			log.debug({createDirectory: {cwd: process.cwd()}});
			fs.stat(`${workdir}/${name}`, function (err, stats) {
				if (err && err.code !== 'ENOENT') { cb (err); } // err is bad, but 'ENOENT' is good.
				if (stats) {
					cb(new Error (`Path '${workdir}/${name}' already exists`));
				} else {
					cb();
				}
			});
		},
		mkdir: function (name, absent, cb) {
			fs.mkdir(`${workdir}/${name}`, cb);
		}
	}, function (err, results) {
		if (err) { throw (err);}
		let newDir = `${workdir}/${results.name}`;
		log.debug({createDirectory: {created: newDir}});
		cb(newDir);
	});
}

function writeFile(data, path, cb) {
	fs.open(path);
}

function saveYaml(stack, path) {
	log.debug(`Saving yaml for ${stack.name}`);
	// body...
}

// Given an obj (stack or env), save its metadata as json
function saveMeta(obj, path) {
	log.debug(`Saving metadata for ${obj.name}`);
}

// Given an object (stack or env), export it to a directory
function exportObj(obj, dir, exportCb) {
	createDirectory(obj, dir, function (dir) {
		saveMeta(obj, dir); // dir is now the new directory that was created

		if ( _.has(obj, 'stacks')) { 	// this is an env - export all stacks
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

		else { // this is a stack
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
			async.each(envs, function (e, cb) {
				exportObj(e, workdir, function (err) {
					if(err) { cb (err);}
					cb();
				});
			}, function (err) {
					autoCb (err);
			});
		}
	}, function (err, results) {
		if (err) { throw (err); }
		log.debug({save: results});
	});
}



/*
* Directory structure:
*
*		export
*		├── env-1
*		│   ├── meta.json
*		│   ├── stack-1
*		│   │   ├── docker-compose.yml
*		│   │   ├── meta.json
*		│   │   └── rancher-compose.yml
*		│   └── ...stack-n
*		│       ├── meta.json
*		│       └── ...
*		└── ...env-n
*		    ├── meta.json
*		    └── ...
*/




// createRootDirectory(function () {
// 	createDirectory(mock[0], exportRootPath);
// });



// save(mock)

module.exports = {
	save: save
};
