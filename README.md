# droxit API server

## Files

### impress.js
This module provides a backend service with configureable REST endpoints. The following listing shows an example for the configuration's structure:

    {
      "SYSTEM": {
        "port": 8160,
        "loglevel": "warn",
        "logfile": "/var/log/droxit_api/server.log"
      },
      "REST": {
        "GET": {
          "clinicaltrials": {
            "getcounts": {
              "handler": {
                "type": "process",
                "command": [
                  "/usr/bin/python3",
                  "/Users/USERNAME/PATH/TO/CORE_SYSTEM_FOLDER/core/src/python/api/getCounts.py",
                  "PATH_TO_global_counts.json"
                ]
              }
            }
          },
          "droxit": {
            "handler": {
              "type": "http",
              "options": {
                "host": "droxit.de",
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
          }
        }
      }
    }

The **REST** property is meant to be the root of all RESTful service.
Endpoints can be defined freely in the method subtrees ('GET', 'POST' etc.). In the example POSTing to `localhost:8160/echo` would return the data we send with the POST request.
Endpoint handlers can either be of type process or http. Type process means that every time a request is sent to this endpoint the command array is executed as a subprocess and
anything printed to stdout during the subprocess' life time will be sent back to the client once the process terminates. Data sent via POST or PUT will be fed into the handler
process' stdin. The command structure looks like this:
 
    [ "executable", "arg1", "arg2" ... ]

Http handlers try to communicate with another service via http. The options field is fed to Node.js' native [http.request method](https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_http_request_options_callback)
therefore all options the method supports can be used. Besides type and options there is another optional field called data. This determins how data sent with the client request are handled. Without the field no data
is sent to the http service the handler points to. Putting a '-' as the field's value will cause data sent by the client to be relayed. Any other value in data will be sent with every request to the http service while
any data the client might send will be discarded.
 
The config's **SYSTEM** portion contains startup information for the server process. The mandatory _port_ parameter defines the TCP port to listen on while _loglevel_ and _logfile_ parameters are
optional. The default logging level is _warn_ and output is directed to _stderr_ if the _logfile_ option is missing. The server uses [Bunyan](https://github.com/trentm/node-bunyan) as its logging facility.
Bunyan's output is well suited for automated handling but not as good readable by humans. Therefore the bunyan package provides a binary that converts the logs into a format that's more legible for humans.
 
If the nodejs server gets started you have to pass an argument containing the path to the config file:
 
    minion@gru:~/core$: node src/nodejs/startServer.js src/nodejs/config.json

##### startServer.js
Use this to start an API server. The script requires the path to a working configuration file for this.

##### package.json
The package.json file is used by the node package manager (npm) for e.g. versioning or the dependency management.

##### testConfig.json `TEST ONLY ATM`
This file yields a testConfig to let the API server start and to explain the structure of the config file. This will be extended in future releases, so it contains a working default config.

##### droxit-api.service and install\_service.sh
The droxit-api.service file allows the api server to be deployed as a [systemd](https://en.wikipedia.org/wiki/Systemd) service. To depoy the service run

    sudo install_service.sh /path/to/config.js

from within this directory. The configuration file needs to point to a valid config. The file's location is written into the service and therefore is needed in this location for the server
to start up.

##### test\_api\_server.js
This is an automated test suite for the api server.

