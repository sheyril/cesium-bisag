(function()  {
    const express = require('express');
    const request = require('request');
    const compression = require('compression');
    const path = require('path');
    const fs = require('fs');
    const cors = require('cors');


    const webpack = require('webpack');
    const webpackDevMiddleware = require('webpack-dev-middleware');
    const config = require('./webpack.config.js');
    const compiler = webpack(config);

    const layerProcessing = require('./layerProcessing');
    const convention = require('./convention');
    const geoserverConnection = require('./geoserverRequests');
    const postGisOperations = require('./postGisOperations');

    let geoserverLink = 'http://localhost:8080';

    let app = express();
    app.use(webpackDevMiddleware(compiler, {
        publicPath: config.output.publicPath
        })
    );

    app.use(compression());
    app.use(cors());
    app.get('/geoserver/*/wms', function(req, res, next)  {
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
        next();
    });

    app.get(/\/geoserver\/tiledcontours/, function(req, res, next) {
        try {
            let query = req.query;
            /*
                query structure: min_x, min_y, max_x, max_y, layer, interval
            */
            let database  = new postGisOperations.database(convention.defaultBaseDatabase[0], convention.defaultBaseDatabase[1], 'CesiumBisag', convention.defaultBaseDatabase[3], convention.defaultBaseDatabase[4]);

            console.log(query);
            const initOptions = {
                schema : [query.layer]
            };
            let xQuery = '((min_x >= ' + query.min_x + ' AND min_x <= ' + query.max_x  + ') OR (max_x >= ' + query.min_x + ' AND max_x <= ' + query.max_x + '))';
            let yQuery = '((min_y >= ' + query.min_y + ' AND min_y <= ' + query.max_y  + ') OR (max_y >= ' + query.min_y + ' AND max_y <= ' + query.max_y + '))';
            let sqlQuery = 'SELECT tiledname FROM ' + query.layer + ' WHERE ' + xQuery + ' AND ' + yQuery + ' AND interval_length = ' + query.interval + ';';
            const pgp = require('pg-promise')(initOptions);

            let db = pgp('postgres://' + database.user + ':' + database.pwd + '@' + database.host + ':' + database.port + '/' + database.name);
            db.any(sqlQuery) //, [query.layer, query.min_x, query.max_x, query.min_y, query.max_y, query.interval])
                .then(value => {
                    console.log('got valid result from postgres');
                    console.log(typeof value);
                    res.writeHead(200, {
                        'Content-Type' : 'application/json',
                        'Access-Control-Allow-Origin' : '*'
                    });
                    res.write(JSON.stringify(value));
                    res.end();
                })
                .catch(err => {
                    console.log(err);
                    res.writeHead(400);
                    res.end();
                });

        } catch (e) {
            console.log(e);
            next();
        }
    });

    app.get(/\/geoserver\/generate\/contours/, function(req, res, next)  {
        try{
            let queries = req.query;
            console.log('got request');
            layerProcessing.publishContourAfterGenerating('Rasters:'+queries.layers, queries.bands, queries.interval, geoserverConnectionObj)
                .then(value => {
                    console.log('got here before writehead');
                    res.writeHead(200, {
                        'Content-Type':'text/plain',
                        'Access-Control-Allow-Origin' : '*'
                    });
                    console.log('heyo finally');
                    res.end('Contours:'+path.basename(value.vectorPath, '.shp'));
                    return value;
                })
                .then(value => {
                    layerProcessing.deleteVectorFromSystem(value.vectorPath);
                })
                .catch(err => {
                    console.log('in error')
                    // res.writeHead(500);
                    console.log(err);
                    next();
                })

        }
        catch(e){
            console.log('got error: ', e);
            next();
        }
    });

    server = app.listen(8585);
    console.log('Cesium server running locally on http://localhost:8585/');

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
