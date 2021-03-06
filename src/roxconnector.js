/*
 * ROXconnector API server package
 * This server exposes a freely configurable REST service for interaction with the core system
 *
 * |------------------- OPEN SOURCE LICENSE DISCLAIMER -------------------|
 * |                                                                      |
 * | Copyright (C) 2019  droxIT GmbH - devs@droxit.de                     |
 * |                                                                      |
 * | This file is part of ROXconnector.                                   |
 * |                                                                      |
 * | ROXconnector is free software: you can redistribute it and/or modify |
 * | it under the terms of the GNU General Public License as published by |
 * | the Free Software Foundation, either version 3 of the License, or    |
 * | (at your option) any later version.                                  |
 * |                                                                      |
 * | This program is distributed in the hope that it will be useful,      |
 * | but WITHOUT ANY WARRANTY; without even the implied warranty of       |
 * | MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the         |
 * | GNU General Public License for more details.                         |
 * |                                                                      |
 * | You have received a copy of the GNU General Public License           |
 * | along with this program. See also <http://www.gnu.org/licenses/>.    |
 * |                                                                      |
 * |----------------------------------------------------------------------|
 */

var fs = require('fs');
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var url = require('url');
var spawn = require('child_process').spawn;
var bunyan = require('bunyan');

var exp = module.exports;
var _plugins = {};

function setEndpoints(app, config, logger) {
	// handle errors gracefully
	app.use(function(err, req, res, next) {
		if (err) {
			logger.error(err);
			res.status(err.status).send(err.message);
		} else {
			next();
		}
	});
	// main http handling funcionality - available endpoints are defined in the config file
	app.use('/', function(req, res, next) {
		// setting headers to enable CORS (Cross Origin Ressource Sharing)
		res.header("Access-Control-Allow-Origin", req.get('Origin') || '*');
		res.header("Access-Control-Allow-Credentials", "true");
		res.header("Access-Control-Allow-Methods", "GET, HEAD, PUT, PATCH, POST, DELETE, OPTION");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Accept, Content-Type");

		res.append('Content-Type', 'application/json');
		logger.debug({
			request: req
		}, 'received request');

		if (req.method in config.REST) {
			// we only accept JSON encoded data bodies
			if (req.method === 'POST' || req.method === 'PUT') {
				if (!('content-type' in req.headers) ||
					(req.headers['content-type'] !== 'application/json' &&
						req.headers['content-type'] !== 'application/x-www-form-urlencoded')) {
					res.status(415).send('Invalid media type. MIME Type application/json required!');
					return;
				}
			}

			// check the config if the requested path is a valid endpoint
			var endpoint = config.REST[req.method];
			// get raw url
			var raw_url = url.parse(req.url).pathname;
			// remove trailing slash (if necessary)
			if (raw_url.charAt(raw_url.length - 1) == "/") {
				raw_url = raw_url.slice(0, -1);
			}
			var path = raw_url.slice(1).split('/');
			for (var p in path) {
				if (path[p] in endpoint)
					endpoint = endpoint[path[p]];
				else {
					res.status(404).send('{"reason": "Invalid path"}');
					return;
				}
			}

			var body = false;
			if (req.body && Object.keys(req.body).length !== 0) {
				body = req.body;
			}

			if ('handler' in endpoint) {
				if (endpoint.handler.type == 'process') {
					var jobConfig = endpoint.handler.command;
					var childProcess = spawn(jobConfig[0], jobConfig.slice(1));
					var childPid = childProcess.pid;
					var response = '';
					var error = '';

					if (body) {
						childProcess.stdin.write(JSON.stringify(body));
						childProcess.stdin.end();
					}

					childProcess.stdout.on('data', (data) => {
						response += data;
					});

					// logging stderr, to know if something bad happened
					childProcess.stderr.on('data', (data) => {
						error += data;
					});

					childProcess.on('exit', (code) => {
						logger.info({
							pid: childPid,
							exitCode: code
						}, 'child process exited');
						if (error) {
							try {
								logger.error({
									childPid: childPid,
									err_msg: error,
									requestBody: req.body,
									endpoint: '/' + path.join("/")
								}, 'handler process reported an error');
								err_obj = JSON.parse(error);
								res.status(err_obj.code).send(err_obj.reason);
							} catch (e) {
								res.status(500).send('{"reason": "internal server error"}');
							}
						} else
							res.send(response);
					});
				} else if (endpoint.handler.type == 'http') {
					if ('options' in endpoint.handler) {
						var data = '';
						// send a request to the handler
						var handlerReq = http.request(endpoint.handler.options, (r) => {
							var data = '';
							r.on('data', (chunk) => {
								data += chunk;
								logger.debug('received chunk: %s', chunk);
							});
							r.on('end', () => {
								logger.debug('sending data');
								res.send(data);
							});
						});
						handlerReq.on('error', (e) => {
							logger.error(e);
							res.status(500).send('{"reason": "internal server error"}');
						});
						if ('data' in endpoint.handler) {
							// use user data if any
							if (endpoint.handler.data === '-') {
								data = req.body;
							} else {
								data = endpoint.handler.data;
							}
						}

						if (data) {
							logger.debug({
								data: data
							}, "sending data to http handler");
							handlerReq.write(JSON.stringify(data));
						}
						handlerReq.end();
					} else {
						logger.error({
							path: "/" + path.join("/")
						}, "faulty configuration: endpoint is missing options field");
						res.status(500).send('{"reason": "internal server error"}');
					}
				} else if (endpoint.handler.type === 'plugin') {
					if (('name' in endpoint.handler) && ('function' in endpoint.handler)) {
						var pname = endpoint.handler.name;
						var func = endpoint.handler['function'];

						if ((pname in _plugins) && (func in _plugins[pname])) {
							var data = {};
							if (body) {
								data = body;
							}
							_plugins[pname][func](data, function(e, r) {
								if (e) {
									/*
									logger.error({
										plugin: pname,
										func: func,
										error: e
									}, "plugin returned an error"); */
									res.status(e.code).send(e.message);
								} else {
									res.send(r);
								}
							});
						} else {
							logger.error({
								path: "/" + path.join("/")
							}, "faulty configuration: plugin or function missing");
							res.status(500).send('{"reason": "internal server error"}');
						}
					} else {
						//TODO continue here
						logger.error({
							path: "/" + path.join("/")
						}, "faulty configuration: plugin handler is missing name or function argument");
						res.status(500).send('{"reason": "internal server error"}');
					}
					var func = endpoint.handler.function;
				} else {
					logger.error({
						path: "/" + path.join("/")
					}, "faulty configuration: invalid endpoint handler type");
					res.status(500).send('{"reason": "internal server error"}');
				}
			} else {
				res.status(404).send('{"reason": "Invalid path"}');
				return;
			}
		} else {
			res.status(400).send('Unsupported HTTP method used');
		}
	});
}

function startServer(app, config) {
	try {
		var server = app.listen(config.SYSTEM.port, function() {
			var host = server.address().address;
			var port = server.address().port;

			logger.info("droxitApi server is listening at http://%s:%s", host, port);
		}).on('error', (err) => {
			logger.fatal("could not start server - %s", err)
			process.exit(1)
		});
	} catch (e) {
		logger.fatal("could not start server - %s", e)
		process.exit(1)
	}
}

function gatherPlugins(conf, logger) {
	var plugins = {};
	for (name in conf) {
		var args = conf[name];
		if (!('params' in args))
			args.params = {};
		args.params.logger = logger;
		if ('path' in args) {
			plugins[name] = {};
			require(args['path'])(plugins[name]);
			plugins[name].init(args['params']);
		} else {
			console.error('Path parameter missing from plugin definition');
			process.exit(1);
		}
	}

	return plugins;
}

// loogerName is only relevant if you want to start multiple servers from within the same
// process and want to separate their logging (which might be a good idea since their output would
// be indistinguishable otherwise)
exp.new = function(config, loggerName = 'droxit-api-server-logger') {
	var app = express();
	if ('upload_limit' in config.SYSTEM) {
		var limit = {
			'limit': config.SYSTEM.upload_limit,
		}
		app.use(bodyParser.json(limit));
	} else {
		app.use(bodyParser.json());
	}
	app.use(bodyParser.urlencoded({
		extended: true
	}));

	loglevel = "warn";
	if ('loglevel' in config.SYSTEM) {
		loglevel = config.SYSTEM.loglevel;
	}
	logOpts = {
		name: loggerName
	};

	if ('logfile' in config.SYSTEM) {
		logOpts.streams = [{
			path: config.SYSTEM.logfile,
			level: loglevel
		}];
	} else {
		logOpts.level = loglevel;
	}

	logger = bunyan.createLogger(logOpts);
	if (!('port' in config.SYSTEM)) {
		logger.fatal("missing port parameter in config file");
		process.exit(1);
	}

	if ('PLUGINS' in config)
		_plugins = gatherPlugins(config.PLUGINS, logger);

	setEndpoints(app, config, logger);
	startServer(app, config);

	return app;
};
