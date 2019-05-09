/*
 * Helper script to start an API server with a given config file
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
 *
 */

var fs = require('fs');
var apiSrv = require('./roxconnector.js');

if (process.argv[2] == undefined) {
	console.error('The server needs a valid config file, passed as the first command line parameter, so please start the server again with a config file.');
	process.exit(1);
}

// read the config file, so the server only needs to execute the commands of the config file
fs.readFile(process.argv[2], 'utf-8', function(err, config) {
	if (!err) {
		config = JSON.parse(config);
		var server = apiSrv.new(config);
	} else {
		console.error(err);
		process.exit(1);
	}
});
