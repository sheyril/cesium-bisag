//All asynchronous operations work
'use strict';

const request = require('request');
const fs = require('fs');
const convention = require('./convention');
const xmldom = require('xmldom');
const WMSCapabilities = require('wms-capabilities');
const path = require('path');
const postGisSchema = require('./postGisOperations');
const sh = require('./useCommandLine').sh;
const gdalRetile = require('./useCommandLine').gdalRetile;
const rimraf = require('rimraf');

class geoserverConnectionError extends Error {}
class fileConnectionError extends Error {}


class geoserverConnection	{
	constructor(baseHostName, user, pwd, sch)	{
		this.baseHostName = baseHostName;
		this.user = user;
		this.pwd = pwd;
		this.schema = sch;
	}
}

// NOTE: Custom convention which uses convention from convention.js directly, need to change only convention.js for changing layernames
geoserverConnection.prototype.layerNameConvention = function(FullLayerName)	{
	if(!FullLayerName.includes(':'))
		return convention.layerNameConvention(FullLayerName);
	let namespace = FullLayerName.split(':')[0];
	let layername = FullLayerName.split(':')[1];
	layername = convention.layerNameConvention(layername);
	FullLayerName = namespace + ':' + layername;
	return FullLayerName;
};

geoserverConnection.prototype.createJdbcMapping = function(layerName, srid='EPSG:4326', interpolation='1')	{
	return new Promise((resolve, reject) => {
		layerName = this.layerNameConvention(layerName);
		layerName = path.basename(layerName, '.tif');
		fs.readFile(path.resolve('./XMLfiles/jdbcMap.xml'), 'utf8', (err, data) => {
			if(err)	{
				reject(err);
				return;
			}
			else {
				data = data.replace('__name__', layerName);
				data = data.replace('__epsgSrid__', srid);
				data = data.replace('__interpolation__', interpolation);
				console.log(data);
				let mapPath = path.resolve(convention.jdbcMapPath, layerName+'_map.xml');
				fs.writeFile(mapPath, data, (err) => {
					if(err)	{
						reject(err);
						return;
					}
					else {
						resolve({outpath : mapPath, layerName: layerName});
						return;
					}
				})
			}
		})
	});
}

// geoserverConnection.prototype.gdalRetile = function(infilepath, layerName, targetDir, levels='2', srid='EPSG:4326', tileDim='1024')	{
// 	return new Promise((resolve, reject) => {
// 		// let layerName = path.basename(infilepath, '.tif');
// 		console.log('gdal_retile.py -r bilinear -co "TFW=YES" -ps ' + tileDim + ' ' + tileDim + ' -s_srs ' + srid + ' -of GTiff -ot Byte -levels ' + levels + ' -targetDir ' + targetDir + ' ' + infilepath);
// 		sh('gdal_retile.py -r bilinear -co "TFW=YES" -ps ' + tileDim + ' ' + tileDim + ' -s_srs ' + srid + ' -of GTiff -ot Byte -levels ' + levels + ' -targetDir ' + targetDir + ' ' + infilepath)
// 			.then(value => {
// 				resolve({layerName: layerName, tilesDirectory : targetDir});
// 			})
// 			.catch(err => {
// 				reject(err);
// 			});
// 	});
// }

// NOTE: have to create meta table first
geoserverConnection.prototype.addJdbcTableToPostgis = function(mappingFilePath, layerName, tileDirectory, levels='2', srid='EPSG:4326')	{
	return new Promise((resolve, reject) => {
		try {
			let message;
			if(srid.includes(':'))
				srid = srid.split(':')[1];
			console.log(levels);
			sh('java -jar ' + convention.jdbcPluginPath + ' ddl -config ' + mappingFilePath + ' -spatialTNPrefix ' + layerName + '_tiled -pyramids ' + levels + ' -statementDelim ";" -srs ' + srid + ' -targetDir ' + path.join(__dirname, 'sqlscripts'))
			.then(err => {
				console.log('java -jar ' + convention.jdbcPluginPath + ' ddl -config ' + mappingFilePath + ' -spatialTNPrefix ' + layerName + '_tiled -pyramids ' + levels + ' -statementDelim ";" -srs ' + srid + ' -targetDir ' + path.join(__dirname, 'sqlscripts'));
				sh(this.schema.psqlCommand + ' -f ' + path.join(__dirname, 'sqlscripts/createmeta.sql'));
			})
			.catch(err => {
				// message = err.message;
				// message += '\nfailed at meta creation';
				// err.message = message;
				reject(err);
			})
			.then(value => {
				console.log(this.schema.psqlCommand + ' -f ' + path.join(__dirname, 'sqlscripts/createmeta.sql'));
				return sh(this.schema.psqlCommand + ' -f ' + path.join(__dirname, '/sqlscripts/add_'+layerName+'.sql'));
			})
			.catch(err => {
				// message = err.message;
				// message += '\nfailed at creating tile tables and insertion in meta';
				// err.message = message;
				reject(err);
			})
			.then(value => {
				console.log(this.schema.psqlCommand + ' -f ' + path.join(__dirname, '/sqlscripts/add_'+layerName+'.sql'));
				resolve({outpath: mappingFilePath, layerName:layerName});
				return sh('java -Xbootclasspath/a:/' + convention.jdbcPostgresClassPath + ' -jar ' + convention.jdbcPluginPath + ' import -config ' + mappingFilePath + ' -spatialTNPrefix ' + layerName + '_tiled -tileTNPrefix ' + layerName + '_tiled -dir ' + tileDirectory + ' -ext tif');

			})
			.catch(err => {
				// message = err.message;
				// message += '\nimporting tile raster data using java utility';
				// err.message = message;
				reject(err);
			})
			.then(value => {
				console.log('java -Xbootclasspath/a:/' + convention.jdbcPostgresClassPath + ' -jar ' + convention.jdbcPluginPath + ' import -config ' + mappingFilePath + ' -spatialTNPrefix ' + layerName + '_tiled -tileTNPrefix ' + layerName + '_tiled -dir ' + tileDirectory + ' -ext tif');
				rimraf('./sqlscripts/*', (err, data) => {
					if(err) {
						reject(err);
					}
				});
			})
			.then(value => {
				console.log(path.join(tileDirectory, '*'));
				rimraf(path.resolve(tileDirectory, '*'), (err, data) => {
					if(err)	{
						reject(err);
					}
				});
			})
			.catch(err => {
				console.log(err);
				reject(err);
			});
		}

		catch (e) {
			rimraf(path.resolve(tileDirectory, '*'), (err, data) => {
				if(err)	{
					reject(err);
				}
			});
			reject(e);
		}
	});
}

geoserverConnection.prototype.addJdbcStoreFromPostgisToGeoserver = function(namespace, layerName, mappingFilePath)	{
	return new Promise((resolve, reject) => {
		let url = 'file:'+ path.join(convention.jdbcMapPathRel, path.basename(mappingFilePath));
		console.log(url);
		fs.readFile(path.resolve('./XMLfiles/addJdbcImageMosaic.xml'), 'utf-8', (err, data) => {
			if(err)	{
				reject(err);
				return;
			}
			else {
				data = data.replace('__name__', layerName);
				data = data.replace('workspace__name', namespace);
				data = data.replace('__url__', url);

				console.log(data);
				let options = {
	    			url: this.baseHostName + 'rest/workspaces/' + namespace + '/coveragestores',
	    			headers: {
	    				'content-type' : 'application/xml',
	    			},
	    			auth: {
	    				username: this.user,
	    				password: this.pwd
	    			},
	    			method: 'POST',
	    			body : data
	    		};
				console.log(options.url);
				request(options, (err, resp, body) => {
	    			if(!err)	{
	    				resolve({resp: resp, body: body, storeName: layerName});

					}
	    			else {
	    				reject(err);
	    			}
	    		});
			}
		});
	});
}

geoserverConnection.prototype.publishCoverageFromDataStore = function(featureName, workspaceName, datastoreName)	{
    return new Promise((resolve, reject) => {
        let options	= {
    		url: this.baseHostName + 'rest/workspaces/' + workspaceName + '/coveragestores/' + datastoreName + '/coverages',
    		headers: {'Content-Type':'application/xml'},
    		method: 'POST',
    		auth: {
    			username: this.user,
    			password: this.pwd
    		},
    		body: '<coverage><name>' + featureName + '</name><nativeCoverageName>' + featureName + '</nativeCoverageName></coverage>'
    	};
		request(options, (err, resp, body) => {
			if(err)
				reject(err);
			else {
				if(resp.statusCode !== 500)
					resolve({resp: resp, body: body, storeName: datastoreName, layerName:featureName});
				else
					reject(resp);
			}
		});
    });
};

// NOTE: Interpolation is always kept 1, can change third parameter if createJdbcMapping for other types
geoserverConnection.prototype.createJdbcCoverageFromRaster = function(layerPath, layerName, workspace, tileDir, levels='3', srid='EPSG:4326', tileSize='1024') {
	return new Promise((resolve, reject) => {
		layerName = this.layerNameConvention(layerName);
		console.log(layerPath, layerName, workspace, tileDir, levels, srid, tileSize);
		gdalRetile(layerPath, layerName, tileDir, levels, srid, tileSize)
			.then(value => {
				return this.createJdbcMapping(value.layerName, srid, '1');
			})
			.then(value => {
				// console.log(tileDir);
				return this.addJdbcTableToPostgis(value.outpath, value.layerName, tileDir, levels, srid);
			})
			.then(value => {
				console.log(value);
				return this.addJdbcStoreFromPostgisToGeoserver(workspace, value.layerName, value.outpath);
			})
			.then(value => {
				return this.publishCoverageFromDataStore(layerName, workspace, value.storeName);
			})
			.then(value => {
				// resolve({storeName: value.storeName, layerName : value.layerName});
			})
			.catch(err =>{
				reject(err);
			});
	});

}

geoserverConnection.prototype.addNamespace = function(namespace)	{
	return new Promise((resolve, reject) => {
        fs.readFile(path.resolve('./XMLfiles/addNamespace.xml'), 'utf8', (err,data) => {
    		if(err)	{
    			reject(err);
				return;
			}
    		data = data.replace('workspace__name', namespace);
    		data = data.replace('uri__name', 'http://geoserver.org/' + namespace);
    		let options = {
    			url: this.baseHostName + 'rest/namespaces/',
    			headers: {
    				'content-type' : 'application/xml',
    			},
    			auth: {
    				username: this.user,
    				password: this.pwd
    			},
    			method: 'POST',
    			body : data
    		};
            request(options, (err, resp, body) => {
    			if(!err)
    				resolve({resp: resp, body: body});
    			else {
    				reject(err);
    			}
    		});
    	})
    });
};

geoserverConnection.prototype.deleteNamespace = function(namespace)	{
    return new Promise((resolve, reject) => {
        let options = {
    		headers: 'accept: application/xml',
    		auth : {
    			username: this.user,
    			password: this.pwd
    		},
    		method: 'DELETE',
    		url: this.baseHostName + 'rest/workspaces/' + namespace,
    		qs: {
    			'recurse' : 'true'
    		}
    	};
    	request(options, (err, resp, body) => {
    		if(!err)
    			resolve({resp: resp, body: body});
    		else {
    			reject(err);
				return;
    		}
    	});
    });
};

geoserverConnection.prototype.addPostgisDatastore = function(storeWorkspace, storeName)  {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve('./XMLfiles/addPostGis.xml'), 'utf8', (err, data) => {
    		if(err)
    			reject(err);

    		let sch = 'public';
    		data = data.replace('datastore__name', storeName);
    		data = data.replace('host__name', this.schema.db.host);
            data = data.replace('port__name', this.schema.db.port);
            data = data.replace('db__name', this.schema.db.name);
            data = data.replace('schema__name', this.schema.name);
            data = data.replace('user__name', this.schema.db.user);
            data = data.replace('pass__name', this.schema.db.pwd);

            let options = {
            	url : this.baseHostName + 'rest/workspaces/' + storeWorkspace + '/datastores',
            	headers: {'Content-Type': 'application/xml'},
            	auth: {
            		username: this.user,
            		password: this.pwd
            	},
            	method: 'POST',
            	body: data
            };
            request(options, (err, resp, body) => 	{
            	if(!err)
            		resolve({resp: resp, body: body});
            	else {
            		reject(err);
					return;
    			}
            });
    	});
    });
};

geoserverConnection.prototype.deleteDataStoreRecursively = function(storeWorkspace, storeName)	{
    return new Promise((resolve, reject) => {
        let options = {
    		url : this.baseHostName + 'rest/workspaces/' + storeWorkspace + '/datastores/' + storeName,
    		headers : {
    			'Accept': 'application/xml'
    		},
    		auth: {
    			username: this.user,
    			password: this.pwd
    		},
    		qs: {
    			'recurse': 'true',
    		},
    		method: 'DELETE',
    	};
    	console.log(this.user, this.pwd);
    	request(options, (err, resp, body) => {
    		if(!err)	{
                resolve({resp: resp, body: body});
    		}
    		else {
    			reject(err);
				return;
    		}
    	});
    });

};

geoserverConnection.prototype.publishFeatureFromDataStore = function(featureName, workspaceName, datastoreName)	{
    return new Promise((resolve, reject) => {
        let options	= {
    		url: this.baseHostName + 'rest/workspaces/' + workspaceName + '/datastores/' + datastoreName + '/featuretypes',
    		headers: {'Content-Type':'text/xml'},
    		method: 'POST',
    		auth: {
    			username: this.user,
    			password: this.pwd
    		},
    		body: '<featureType><name>' + featureName + '</name></featureType>'
    	};
		request(options, (err, resp, body) => {
			if(err)
				reject(err);
			else {
				console.log(options);
				resolve({resp: resp, body: body});
			}
		})
    });
};

geoserverConnection.prototype.publishFeature = function(featurePath, featureName, srid='EPSG:4326', workspaceName, datastoreName)	{
    return new Promise((resolve, reject) => {
        featureName = this.layerNameConvention(featureName);
		this.schema.sendFeatureToDB(featurePath, featureName, srid)
			.then(value => {
				resolve(this.publishFeatureFromDataStore(featureName, workspaceName, datastoreName));
			})
			.catch(e => {
				reject(e);
			});
    });
}

geoserverConnection.prototype.deleteFeature = function(passedLayer)	{

    return new Promise((resolve, reject) => {
        passedLayer = this.layerNameConvention(passedLayer);
    	let namespace = passedLayer.split(':')[0];
    	let featureName = passedLayer.split(':')[1];

    	let options = {
    		url : this.baseHostName + 'rest/workspaces/' + namespace + '/layers/' + featureName,
    		headers: {
    			'accept' : 'applicaiton/xml'
    		},
    		auth: {
    			'username' : this.user,
    			'password' : this.pwd
    		},
    		qs: {
    			'recurse' : 'true'
    		},
    		method: 'delete'
    	};
    	request(options, (err, resp, body) => {
    		if(!err)	{
				resolve(this.schema.deleteFeature(featureName));
    		}
    		else
    			reject(err);
    	});
    });
}

geoserverConnection.prototype.getMapWMS = function(passedLayer)	{

    return new Promise((resolve, reject) => {
		passedLayer = this.layerNameConvention(passedLayer);
	    let namespace = passedLayer.split(':')[0];
    	let layername = passedLayer.split(':')[1];

		// console.log(passedLayer);
    	//do getcapabilities first
    	let options = {
    		url: this.baseHostName + 'wms?',
    		method: 'GET',
    		headers: {
    			'accept' : 'application/xml'
    		},
    		qs:	{
    			service: 'wms',
    			version: '1.1.1',
    			request: 'GetCapabilities'
    		}
    	};

     	request(options, (error1, resp, body) => {
    		let jsondoc;
    		if(!error1)	{
    			jsondoc = new WMSCapabilities(body, xmldom.DOMParser).toJSON();
    			// NOTE: Searching capabilties doc using for, better to keep the document in postgres sql and then change it whenever a change is encountered, and use postgres sql for retrieving data
    			// NOTE: since all we need is bounding box and srs, the sql store can store only these values
    			// NOTE: primary index would be name of the raster
                // console.log(jsondoc);
    			let gotLayer;
    			for(let layer of jsondoc.Capability.Layer.Layer)	{
    				if(layer.Name === passedLayer)	{
    					gotLayer = layer;
                        // console.log(layer);
    					break;
    				}
    			}
                // console.log(gotLayer);
    			let mapOptions = {
    				method: 'GET',
    				encoding: null,
    				headers: 'accept:image/jpeg',
    				url: this.baseHostName + namespace + '/wms',
    				qs: {
    					service: 'wms',
    					version : '1.1.1',
    					request : 'GetMap',
    					format : 'image/geotiff',
    					tiled : 'true',
    					layers : passedLayer,
    					bbox: '' + gotLayer.LatLonBoundingBox[0] + ',' + gotLayer.LatLonBoundingBox[1] + ',' + gotLayer.LatLonBoundingBox[2] + ',' + gotLayer.LatLonBoundingBox[3],
    					width: '256',	// NOTE: use this by default, can be changed according to requirements
    					height: '256',
    					srs: gotLayer.SRS
    				}
    			};
    			request(mapOptions, (err, response, image) => {
    				if(!err)	{
    					fs.writeFile(path.resolve(convention.folderRasters + layername + '.tif'), image, (error) => {
    						if(error)
    							reject(error);
    						else {
    							resolve({
    								outpath: path.resolve(convention.folderRasters, layername+ '.tif'),
    								srid: gotLayer.SRS,
    								bbox: gotLayer.LatLonBoundingBox
    							});
    						}
    					});
    				}
    				else {
    					reject(err);
    				}
    			});
    		}
    		else {
    	           reject(error1);
    		}
    	});
    });
}

module.exports = {
	geoserverConnection : geoserverConnection
}
