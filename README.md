# ROXconnector API server

A fast and flexible Node.js server for delivering RESTful APIs based on JSON data serialization - with plugin support.
The endpoint definition resides inside the servers config file - not within the code.
Endpoints can be configured to either invoke a process, be relayed to another server via http or mapped onto a plugin function.

## Why use ROXconnector?

There are serveral reasons for using ROXconnector as your API gateway:

* Easy setup: ROXconnector is operational within minutes
* Integration with other services: you can use ROXconnector to map REST calls to other services via HTTP
* Extensibility: add new functionality to your endpoints with your own Node modules - access your own code from within the API server itself
* REST setup inside the configuration: define your whole API in a single JSON file. Simply restart ROXconnector to see the changes
* In essence: be fast and flexible

## Installation

The following software components need to installed before proceeding:

* [Node.js 8.10.0](https://nodejs.org) or higher - a JavaScript runtime.
* [npm](https://www.npmjs.com/) - a package manager for JavaScript applications.

Set up an application folder for ROXconnector to reside in - we will use `/opt/roxconnector` as an example.
Then you simply have to extract the package and install the dependencies via `npm`.

```bash
mkdir /opt/roxconnector/
cd /opt/roxconnector
tar xf /tmp/roxconnector-0.2.0.tgz
npm install
```

This will install the node dependencies under `node_modules` within the roxconnector folder. The dependencies can also be installed system wide by providing the `-g` flag.

```bash
npm install -g
```

This step usually requires superuser priviledges.

## Usage

You will need a working configuration file to run `ROXconnector` - explained below.

```bash
cd /opt/roxconnector
node startServer.js path/to/config.js
```

## Configuration

ROXconnector is configured via one central JSON config file which contains all needed parameters.
The file is divided into three segments: SYSTEM, REST and PLUGINS.

### SYSTEM

```json
{
  "SYSTEM": {
    "port": 8160,
    "loglevel": "warn",
    "logfile": "/var/log/roxconnector/server.log"
  }
}
```

The config's **SYSTEM** portion contains startup information for the server process. The mandatory _port_ parameter defines the TCP port to listen on while _loglevel_ and _logfile_ parameters are
optional. The default log level is _warn_ and output is directed to _stderr_ if the _logfile_ option is missing. The server uses [Bunyan](https://github.com/trentm/node-bunyan) as its logging facility.
Bunyan's output is well suited for automated handling but not as well readable by humans. Therefore the bunyan package provides a binary that converts the logs into a format that's more legible.
If you have installed the node dependencies globally the bunyan application should be inside your path environment. Otherwise you can call it from the `node_modules` folder:

```bash
# pipe console output into bunyan
node start_server.js | node_modules/bunyan/bin/bunyan
# or view logs on disk
cat /var/log/roxconnector/server.log | node_modules/bunyan/bin/bunyan
```

### REST

```json
"REST": {
  "GET": {
    "mybackend": {
      "handler": {
        "type": "http",
        "options": {
          "host": "my.backend.de",
          "path": "/"
        }
      }
    }
  },
  "POST": {
    "echo": {
      "handler": {
        "type": "process",
        "command": ["cat", "-"]
      }
    },
    "nested": {
      "path": {
        "handler": {
          "type": "plugin",
          "name": "myplugin",
          "function": "some_function"
        }
      }
    }
  }
}
```

The **REST** property is root of all RESTful service endpoints.
Endpoints can be defined freely in the method subtrees ('GET', 'POST' etc.). In the example POSTing to `localhost:8160/echo` would return the data we send with the POST request.
Endpoint handlers can either be of type process or http. Type process means that every time a request is sent to this endpoint the command array is executed as a subprocess and
anything printed to stdout during the subprocess' life time will be sent back to the client once the process terminates. Data sent via POST or PUT will be fed into the handler
process' stdin. The command structure looks like this:
 
    [ "executable", "arg1", "arg2" ... ]

Http handlers try to communicate with another service via http. The options field is fed to Node.js' native [http.request method](https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_http_request_options_callback)
therefore all options the method supports can be used. Besides type and options there is another optional field called data. This determins how data sent with the client request are handled. Without the field no data
is sent to the http service the handler points to. Putting a '-' as the field's value will cause data sent by the client to be relayed. Any other value in data will be sent with every request to the http service while
any data the client might send will be discarded.


Plugin handlers are straight forward. In this example a `POST` call to the path `/nested/path/` would result in a call to `some_function` from the plugin `myplugin` (more on plugins later).

### PLUGINS

```json
"PLUGINS": {
  "myplugin": {
    "path": "./plugins/myplugin.js",
    "params": {
      "plugin_parameter": "some_information"
    }
  }
}
```
Any plugin that is supposed to be loaded needs to be present in this section with their path and optionally a params dictionary that is passed on to the plugin upon loading.

## Writing plugins

An ROXconnector plugin is a Node.js module that adheres to certain export conventions and exports an `init` function. `module.exports` must be a function that takes a single argument
and registers its endpoint handlers within this argument:

```javascript
module.exports = function (container) {
    container.init = init;
    container.some_function = sfunc;
    // ....
}
```
The `init` function will be called with the parameters from the config when the module is loaded at startup. Our example config would trigger this call:

```javascript
init( { plugin_parameter: "some_information" } );
```

Use this to initialize your plugin.

All exported functions can be mapped to REST endpoints in the ROXconnector config file. In the example config above we mapped `/nested/path` to `some_function`.
Assuming the following client request:

```bash
curl -XPOST localhost:7475/nested/path -H 'Content-Type: application/json' -d '{ "arg": 213 }'
```

the resulting function call would be `sfunc({arg: 123})`.


## droxit-api.service and install\_service.sh
The roxconnector.service file allows the api server to be deployed as a [systemd](https://en.wikipedia.org/wiki/Systemd) service. To depoy the service run

    sudo install_service.sh /path/to/config.js

from within this directory. The configuration file needs to point to a valid config. The file's location is written into the service and therefore is needed at this location for the server
to start up.

