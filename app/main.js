/*jshint esversion: 6 */

const exporter = require('./exporter'),
	filer = require('./filer'),
	log = require('./logger').log;

//// MAIN
exporter.rancherExport(function (rancher) {
	filer.save(rancher);
});

// can be used for testing
// save(require('./test/mock-full.json'))
