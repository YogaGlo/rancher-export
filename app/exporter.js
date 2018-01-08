/*jshint esversion: 6 */

require('dotenv').config();

const request = require('superagent'),
	async = require('async'),
	_ = require('lodash'),
	log = require('./logger').log;


const rancherApi = process.env.CATTLE_URL,
	rancherApiKey = process.env.CATTLE_ACCESS_KEY,
	rancherApiSecret = process.env.CATTLE_SECRET_KEY;

// Get available Environments (NOTE: Environment is actually called 'project' in the API)
// TODO actually validate we're getting correct responses (there is no error checking below)
function getEnvironments(cb) {
	let requestURL = [rancherApi,'projects','?all=true'].join('/');

	rancherApiRequest(requestURL, function (err, data) { // 'data' is an array of environments with all the cruft
		if (err) { return cb(err); }
		// Filter out inactive envs
		async.filter(data,
			// filter
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

// Get Stacks of an Environment (NOTE: Stack is actually called 'environment' in the API)
// Return an array of Stacks, populated with their Compose configs
function getStacks(environment, cb) {
	let requestURL = [rancherApi,'projects', environment.id, 'environments'].join('/');

	rancherApiRequest(requestURL, function (err, data) { // 'data' is an array of stacks with all the cruft
		if (err) { return cb(err); }
		async.map(data,	injectComposeConfig, function (err, stacks) {
			log.debug({getStacks: stacks});
			return cb(null, stacks);
		});
	});
}

// Given the verbose stack object returned by the API, filter out the irrelevant fields, and retrieve and inject the Stack's compose config
function injectComposeConfig (stack, cb) {
	async.auto({
		basics: function (autoCb) {
			autoCb(null, getBasicProps(stack));
		},
		compose: function (autoCb) {
			getComposeConfig(stack, function (err, composeConfig) {
				if (err) { return autoCb(err); }
				autoCb(null, composeConfig);
			});
		}
	}, function (err, results) {
		if (err) { return cb (err); }
		let config = results.basics;
		config.composeConfig = results.compose;
		log.debug({injectComposeConfig : config});
		return cb(null, config);
	});
}

// Get Compose config for a stack
function getComposeConfig(stack, cb) {
	// special case for when the export an ad-hoc Compose project. (E.g a docker-compose project running in CI.)
	// We want to skip those.
	// TODO there should be a cleaner way to catch these and skip altogether.
	if (stack.type === 'composeProject') {
		return cb(null, {dockerComposeConfig:"", rancherComposeConfig:""});
	}

	// remember that Stack = environment in Rancher API parlance
	if ( stack.type !== 'environment' ) {
		log.error({getComposeConfig: {stack: stack}});
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

// Given an environment, retrieve its stacks, and populate the environment object with these stacks
function injectStacks (environment, cb) {
	getStacks(environment, function (err, stacks) {
		if (err) { return cb (err); }
		environment.stacks = stacks;
		cb (null, environment);
	});
}

// Helper to make Rancher API requests
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

// Helper to get basic fields of a Rancher object
function getBasicProps(obj) {
	return _.pick(obj, ['id', 'name', 'description']);
}

// Return the entire config for all environments visible to this API key pair
function rancherExport(cb) {
	async.waterfall([
			function (waterfallCb) {
				getEnvironments(waterfallCb);
			},
			function (envs, waterfallCb) {
				async.map(envs,	injectStacks, function (err, results) {
					if (err) { return waterfallCb (err); }
					waterfallCb(null, results);
				});
			}
		], function (err, envs) {
			if (err) { return cb(err); }
			log.debug({envs:envs});
			cb(envs);
	});
}

module.exports = {
	rancherExport: rancherExport,
	getBasicProps: getBasicProps
};
