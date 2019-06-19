(function()  {
    const express = require('express');
    const request = require('request');
    const compression = require('compression');
    const path = require('path');
    const fs = require('fs');
    const webpack = require('webpack');
    const webpackDevMiddleware = require('webpack-dev-middleware');

    const config = require('./webpack.config.js');
    const compiler = webpack(config);


    let app = express();
    app.use(webpackDevMiddleware(compiler, {
        publicPath: config.output.publicPath
        })
    );

    // app.use(express.static(path.resolve(__dirname, 'dist')));
    // app.use(express.static(__dirname));
    // console.log(__dirname);
    app.use(compression());

    app.get('/geoserver/*/wms', function(req, res)  {
        let geoserverLink = 'http://localhost:8080';
        // console.log('got wms req');
        try {
            request.get(geoserverLink+req.url, {encoding:'binary'}, function(error, response)   {
                res.writeHead(200, {'Content-Type':'image/jpeg'});
                res.end(response.body, 'binary');
            });
        }
        catch(e)    {
            console.log(e);
        }
        //Catch errors in the error handler
    });


    app.get('/myFile*', (req, res) => {
        console.log('intercepted request');
        res.writeHead(200, {'Content-Type': 'application/geo+json'});
        fs.readFile('/home/orange/Documents/myFile.geojson', (err, data) => {
            if(err)
                throw err;
            else    {
                res.write(data);
                res.end();
            }
        });
    });

    const yargs = require('yargs').options({
        'port' : {
            'default' : 8585,
            'description' : 'Port to listen on.'
        },
        'public' : {
            'type' : 'boolean',
            'description' : 'Run a public server that listens on all interfaces.'
        },
        'upstream-proxy' : {
            'description' : 'A standard proxy server that will be used to retrieve data.  Specify a URL including port, e.g. "http://proxy:8000".'
        },
        'bypass-upstream-proxy-hosts' : {
            'description' : 'A comma separated list of hosts that will bypass the specified upstream_proxy, e.g. "lanhost1,lanhost2"'
        },
        'help' : {
            'alias' : 'h',
            'type' : 'boolean',
            'description' : 'Show this help.'
        }
    });
    var argv = yargs.argv;

    if (argv.help) {
        return yargs.showHelp();
    }

    var server = app.listen(argv.port, argv.public ? undefined : 'localhost', function() {
        if (argv.public) {
            console.log('Cesium development server running publicly.  Connect to http://localhost:%d/', server.address().port);
        } else {
            console.log('Cesium development server running locally.  Connect to http://localhost:%d/', server.address().port);
        }
    });


    server.on('error', function (e) {
        if (e.code === 'EADDRINUSE') {
            console.log('Error: Port %d is already in use, select a different port.', argv.port);
            console.log('Example: node server.js --port %d', argv.port + 1);
        } else if (e.code === 'EACCES') {
            console.log('Error: This process does not have permission to listen on port %d.', argv.port);
            if (argv.port < 1024) {
                console.log('Try a port number higher than 1024.');
            }
        }
        console.log(e);
        process.exit(1);
    });

    server.on('close', function() {
        console.log('Cesium development server stopped.');
    });

    var isFirstSig = true;
    process.on('SIGINT', function() {
        if (isFirstSig) {
            console.log('Cesium development server shutting down.');
            server.close(function() {
              process.exit(0);
            });
            isFirstSig = false;
        } else {
            console.log('Cesium development server force kill.');
            process.exit(1);
        }
    });

})();
