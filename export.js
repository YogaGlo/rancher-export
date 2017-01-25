/*jshint esversion: 6 */

const request = require('superagent'),
	async = require('async'),
	_ = require('lodash'),
	bunyan = require('bunyan'),
	PrettyStream = require('bunyan-pretty-stream');

const log = bunyan.createLogger({
	name: 'exporter',
	streams: [
		{
			level: 'info',
			stream: process.stdout
			// stream: new PrettyStream()
		}
	]
});

const rancherApi = 'https://rancher.ygstaging.com/v1/',
	rancherApiKey = '553C49929F1EF35CADB9',
	rancherApiSecret = 'VFtfciGHFZLMfodqBW7GVPNxVqWYSfzsmGpdQpVw';

// get available Environments (NOTE: Environment is actually called 'project' in the API)
function getEnvironments(cb) {
	let requestURL = [rancherApi,'projects'].join('/');

	rancherApiRequest(requestURL, function (err, data) {
		if (err) { return cb(err); }

		let envs = _.map(data, getBasicProps);
		log.debug({getEnvironments: envs});
		return cb(null, envs);
	});
}

// get Stacks of an Environment (NOTE: Stack is actually called 'environment' in the API)
function getStacks(environment, cb) {
	let requestURL = [rancherApi,'projects', environment.id, 'environments'].join('/');

	rancherApiRequest(requestURL, function (err, data) {
		if (err) { return cb(err); }
		async.map(data, extractStackConfig, function (err, stacks) {
			log.debug({getStacks: stacks});
			return cb(null, stacks);
		});
	});
}

// extract a concise stack config from a complete stack object returned by the API.
function extractStackConfig(stack, cb) {
	async.auto({
		basics: function (cb) {
			cb(null, getBasicProps(stack));
		},
		compose: function (cb) {
			getComposeConfig(stack, function (err, composeConfig) {
				if (err) { return cb(err); }
				cb(null, composeConfig);
			});
		}
	}, function (err, results) {
		if (err) { return (err); }
		let config = results.basics;
		config.composeconfig = results.compose;
		log.debug({extractStackConfig: config});
		return cb(null, config);
	});
}

// get Compose config for a stack
function getComposeConfig(stack, cb) {
	if ( stack.type !== 'environment' ) { // remember that Stack = environment in Rancher API parlance
		throw new Error('Expected a stack, got something else');
	}

	request
		.post(stack.links.self)
		.auth(rancherApiKey, rancherApiSecret)
		.set('Accept', 'application/json')
		.set('Content-Type', 'application/json')
		.query({action: "exportconfig"})
		.end(function (err, res) {
			if (err) { return cb(err); }
			if (_.isEmpty(res)) { return cb(new Error('Rancher API sent an empty response')); }
			let data = JSON.parse(res.text);
			log.debug({getComposeConfig: data});
			return cb(null, _.pick(data, ['dockerComposeConfig', 'rancherComposeConfig']));
		});
}


// helper to make Rancher API requests
function rancherApiRequest(requestURL, cb) {
	request
		.get(requestURL)
		.auth(rancherApiKey, rancherApiSecret)
		.set('Accept', 'application/json')
		.end(function (err, res) {
			if (err) { return cb(err); }
			if (_.isEmpty(res)) { return cb(new Error('Rancher API sent an empty response')); }
			let data = JSON.parse(res.text).data;
			return cb(null, data);
		});
}

// helper to make a filename
function makeFilename(environment, stack) {
	let name=[
		environment.name.toLowerCase().trim().split(' ').join('-'),
		stack.name.toLowerCase().trim().split(' ').join('-')
	].join('_');
	return (name + '.zip');
}

// helper to get basic interesting fields of a Rancher object
function getBasicProps(obj) {
	return _.pick(obj, ['id', 'name', 'description']);
}

// download a .zip Compose config for a Stack
function downloadComposeConfigFile(stack, cb) { // NOT IN USE
	let requestURL = [rancherApi, 'projects', stack.accountId, 'environments', stack.id, 'composeconfig'].join('/');
	request
		.get(requestURL)
		.auth(rancherApiKey, rancherApiSecret)
		.set('Accept', 'application/json')
		.end(function (err, res) {
			if (err) { return cb(err); }
			if (_.isEmpty(res)) { return cb(new Error('Rancher API sent an empty response')); }
			console.log(res);
		});
}

async.auto({
	envs: function (autoCb) {
		getEnvironments(autoCb);
	},
	stacks: ['envs',
		function (results, cb) {
			async.each(results.envs, function (env) {
				getStacks(env, function (err, stacks) {
					if (err) { cb (err); }
					else {
						env.stacks = stacks;
						cb();
					}
				});
			}, function (err) {
				if (err) {
					autoCb (err);
				} else {
					autoCb(null, results);
				}
			});
		}
	]
}, function (err, results) {
		log.debug({async: results});
});


// getEnvironments(function (err, e) {
// 	getStacks(e[0], function (err, s) {
// 		log.info({stacks: s})
// 	})
// });
