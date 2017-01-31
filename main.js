/*jshint esversion: 6 */

const rancherExport = require('./exporter').rancherExport,
	save = require('./filer').save,
	log = require('./logger').log;

//// MAIN
// rancherExport(function (r) {
// 	save(r);
// 	// log.info({rancher: r});
// });


save(require('./test/mock-full.json'))
