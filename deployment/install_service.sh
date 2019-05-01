#!/bin/bash
# this script installs a systemd service file for the droxit API server
# it uses the current working directory as the application path and
# expects the path to a config file as the only argument
#
# |------------------- OPEN SOURCE LICENSE DISCLAIMER -------------------|
# |                                                                      |
# | Copyright (C) 2019  droxIT GmbH - devs@droxit.de                     |
# |                                                                      |
# | This file is part of ROXconnector.                                   |
# |                                                                      |
# | ROXconnector is free software: you can redistribute it and/or modify |
# | it under the terms of the GNU General Public License as published by |
# | the Free Software Foundation, either version 3 of the License, or    |
# | (at your option) any later version.                                  |
# |                                                                      |
# | This program is distributed in the hope that it will be useful,      |
# | but WITHOUT ANY WARRANTY; without even the implied warranty of       |
# | MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the         |
# | GNU General Public License for more details.                         |
# |                                                                      |
# | You have received a copy of the GNU General Public License           |
# | along with this program. See also <http://www.gnu.org/licenses/>.    |
# |                                                                      |
# |----------------------------------------------------------------------|
#

wd=$(pwd)
target=/usr/lib/systemd/system/roxcomposer.service
wd=${wd//\//\\/}

if [ "$1" == "" ]; then
	echo 'no config file path specified'
	exit 1
fi

conf=${1//\//\\/}

sed -e "s/<app_folder>/"$wd"/" -e "s/<config_path>/"$conf"/" roxcomposer.service > $target
