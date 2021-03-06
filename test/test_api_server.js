/*
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

var http = require('http');
var request = require('supertest');
var apiSrv = require('../src/roxconnector.js');
var Emitter = require('events').EventEmitter;
var emitter = new Emitter();

var apiPort = 8601;
var dummyPort = 8602;
var dummyMsg = '{"re": "ality"}';

function kthxbye() {
	console.log('----- all test successful -----');
	process.exit(0);
}
apiConfig = {
	SYSTEM: {
		port: apiPort
	},
	REST: {
		GET: {
			fortune_cookie: {
				handler: {
					type: 'http',
					options: {
						host: 'localhost',
						port: dummyPort,
						path: '/'
					}
				}
			}
		},
		POST: {
			echo: {
				handler: {
					type: 'process',
					command: ['cat', '-']
				}
			},
			fortune_cookie: {
				handler: {
					type: 'http',
					data: '-',
					options: {
						method: 'POST',
						host: 'localhost',
						port: dummyPort,
						path: '/'
					}
				}
			}
		}
	}
};

// we start a little dummy server to test the http-handler functionality
dummy = new http.Server().on('request', (req, res) => {
	if (req.method === 'GET') {
		res.writeHead(200, {
			'Content-Length': dummyMsg.length,
			'Content-Type': 'application/json'
		});
		res.write(dummyMsg);
		res.end();
	} else if (req.method === 'POST') {
		var data = '';
		req.on('data', function(chunk) {
			data += chunk;
		});
		req.on('end', function() {
			res.writeHead(200, {
				'Content-Length': data.length,
				'Content-Type': 'application/json'
			});
			res.write(data);
			res.end();
		});
	} else {
		res.writeHead(404);
		res.end();
	}
});
dummy.listen(dummyPort);

srv = apiSrv.new(apiConfig);
request = request(srv);

console.log('----- running tests -----');
console.log('** making a valid GET request **');
request.get('/fortune_cookie')
	.expect('Content-Type', /application\/json/)
	.expect(200, dummyMsg)
	.end(function(err, res) {
		if (err)
			throw err;
		console.log('** got the right answer **');
		emitter.emit('test1');
	});

emitter.on('test1', function() {
	console.log('** GETting invalid path **');
	request.get('/fortune_rookie')
		.expect('Content-Type', /application\/json/)
		.expect(404)
		.end(function(err, res) {
			if (err)
				throw err;
			console.log('** got 404 - good **');
			emitter.emit('test2');
		});
});

emitter.on('test2', function() {
	var testMsg = '{"msg":"blorp"}';
	console.log('** POSTing something to a process **');
	request.post('/echo')
		.send(testMsg)
		.set('Content-Type', 'application/json')
		.expect('Content-Type', /application\/json/)
		.expect(200, testMsg)
		.end(function(err, res) {
			if (err)
				throw err;
			console.log('** got the correct response **');
			emitter.emit('test3');
		});
});

emitter.on('test3', function() {
	var testMsg = '{"msg":"blorp"}';
	console.log('** POSTing something to a http handler **');
	request.post('/fortune_cookie')
		.send(testMsg)
		.set('Content-Type', 'application/json')
		.expect('Content-Type', /application\/json/)
		.expect(200, testMsg)
		.end(function(err, res) {
			if (err)
				throw err;
			console.log('** got the correct response **');
			emitter.emit('test4');
		});
});

emitter.on('test4', function() {
	console.log('** GETing something from URL with trailing slash **');
	request.get('/fortune_cookie/')
		.expect('Content-Type', /application\/json/)
		.expect(200, dummyMsg)
		.end(function(err, res) {
			if (err)
				throw err;
			console.log('** got the right answer **');
			kthxbye();
		});
});
