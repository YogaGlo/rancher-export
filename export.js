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

const rancherApi = 'https://rancher.ygstaging.com/v1',
	// rancherApiKey = '553C49929F1EF35CADB9',
	// rancherApiSecret = 'VFtfciGHFZLMfodqBW7GVPNxVqWYSfzsmGpdQpVw';


	rancherApiKey = '479D02118244B478495D',
	rancherApiSecret = 'WetC9KuUsecf5gNFQvKDdd8Dxas3556M51dM4ohc';

// get available Environments (NOTE: Environment is actually called 'project' in the API)
// TODO actually validate we're getting correct responses (there is no error checking below)
function getEnvironments(cb) {
	let requestURL = [rancherApi,'projects','?all=true'].join('/');

	rancherApiRequest(requestURL, function (err, data) {
		if (err) { return cb(err); }
		// Filter out inactive envs
		async.filter(data,
			// iteratee
			function (e, cb) {
				cb(null, (e.state === 'active'));
			},
			// callback
			function (err, results) {
				let envs = _.map(results, getBasicProps);
				log.debug({getEnvironments: envs});
				return cb(null, envs);
			}
		);
	});
}

// get Stacks of an Environment (NOTE: Stack is actually called 'environment' in the API)
// return an array of Stacks, populated with their Compose configs
function getStacks(environment, cb) {
	let requestURL = [rancherApi,'projects', environment.id, 'environments'].join('/');

	rancherApiRequest(requestURL, function (err, data) {
		if (err) { return cb(err); }
		async.map(data,
			// iteratee
			injectComposeConfig ,
			// callback
			function (err, stacks) {
				log.debug({getStacks: stacks});
				return cb(null, stacks);
			}
		);
	});
}

// Given the verbose stack object returned by the API, filter out the irrelevant fields, and retrieve and inject the Stack's compose config
function injectComposeConfig (stack, cb) {
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
		log.debug({injectComposeConfig : config});
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
			if (err) {
				throw (err);
			}
			if (_.isEmpty(res)) { return cb(new Error('Rancher API sent an empty response')); }
			let data = JSON.parse(res.text);
			log.debug({getComposeConfig: data});
			return cb(null, _.pick(data, ['dockerComposeConfig', 'rancherComposeConfig']));
		});
}

// given an environment, retrieve its stacks, and populate the environment object with these stacks
function injectStacks (environment, cb) {
	getStacks(environment, function (err, stacks) {
		if (err) { cb (err); }
		else {
			environment.stacks = stacks;
			cb (null, environment);
		}
	});
}

// helper to make Rancher API requests
function rancherApiRequest(requestURL, cb) {
	request
		.get(requestURL)
		.auth(rancherApiKey, rancherApiSecret)
		.set('Accept', 'application/json')
		.end(function (err, res) {
			log.debug({'rancherApiRequest': requestURL});
			if (err) { throw (err); }
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

// helper to get basic fields of a Rancher object
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
			if (err) { throw (err); }
			if (_.isEmpty(res)) { return cb(new Error('Rancher API sent an empty response')); }
			log.info(res);
		});
}


// MAIN
function getWorldConfig(cb) {
	async.autoInject({
		envs: function (cb) {
			getEnvironments(cb);
		},
		stacks: function (envs, cb) {
			// log.info({envs:envs})
			async.map(envs,	injectStacks , function (err, results) {
				log.info({inject: results})
				if (err) {
					cb (err);
				} else {
					cb(null, results);
				}
			});
		}
	}, function (err, results) {
			if (err) { return cb (err); }
			cb (results);
	});
}

// function f(cb) {
// 	async.auto({
// 		a: function (cb) {
// 			cb(null, 'foo');
// 		},
// 		b: ['a', function (r, cb) {
// 				log.info(r);
// 				cb(null, ['baz']);
// 			}]
// 	}, function (err, r) {
// 			log.info({r: r});
// 	});
// }

// f(function (x) {
// 	log.info(x);
// });


getWorldConfig(function (w) {
	log.info({w: w});
});


// getEnvironments(function (err, data) {
// 		log.info(data)
// })
