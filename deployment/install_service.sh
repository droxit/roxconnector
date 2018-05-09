#!/bin/bash
# this script installs a systemd service file for the droxit API server
# it uses the current working directory as the application path and
# expects the path to a config file as the only argument

wd=$(pwd)
target=/usr/lib/systemd/system/roxcomposer.service
wd=${wd//\//\\/}

if [ "$1" == "" ]; then
	echo 'no config file path specified'
	exit 1
fi

conf=${1//\//\\/}

sed -e "s/<app_folder>/"$wd"/" -e "s/<config_path>/"$conf"/" roxcomposer.service > $target
