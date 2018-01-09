/*jshint esversion: 6 */

const bunyan = require('bunyan');

const log = bunyan.createLogger({
	name: 'rancher-export',
	streams: [
		{
			level: 'info',
			stream: process.stdout
		}
	]
});

module.exports = {
	log: log
};
