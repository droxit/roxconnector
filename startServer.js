/*
 * Helper script to start an API server with a given config file
 */
var fs = require('fs');
var apiSrv = require('./droxitApi.js');

function gatherPlugins(conf) {
	var plugins = {};
	for(name in conf) {
		var args = conf[name];
		if('path' in args) {
			plugins[name] = require(args['path'])(plugins[name]);
			if('params' in args)
				plugins[name].init(args['params']);
		} else {
			console.error('Path parameter missing from plugin definition');
			process.exit(1);
		}
	}
}

if (process.argv[2] == undefined) {
	console.error('The server needs a valid config file, passed as the first command line parameter, so please start the server again with a config file.');
	process.exit(1);
}

// read the config file, so the server only needs to execute the commands of the config file
fs.readFile(process.argv[2], 'utf-8', function(err, config) {
	if (!err) {
		config = JSON.parse(config);
		plugins = {};
		if('PLUGINS' in config) {
			plugins = gatherPlugins(config['PLUGINS']);
		}
		var server = apiSrv.new(config, plugins);
	} else {
		console.error(err);
		process.exit(1);
	}
});
