//Complete data store deletion of JDBC store, everything else is stable

'use strict';

const request = require('request');
const fs = require('fs');
const convention = require('./convention');
const xmldom = require('xmldom');
const WMSCapabilities = require('wms-capabilities');
const path = require('path');
const sh = require('./useCommandLine').sh;
const gdalRetile = require('./useCommandLine').gdalRetile;
const rimraf = require('rimraf');

class geoserverConnectionError extends Error {}
class fileConnectionError extends Error {}

class sqlError extends Error {}
class cleanFolderError extends Error {}

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

//error checking done: complete
// NOTE: Would not let you create a mapping file if it already exists, would help prevent miserable errors
geoserverConnection.prototype.createJdbcMapping = function(layerName, srid='EPSG:4326', interpolation='1')	{
	return new Promise((resolve, reject) => {
		layerName = this.layerNameConvention(layerName);
		layerName = path.basename(layerName, '.tif');
		fs.readFile(path.resolve(convention.xmlTemplates, 'jdbcMap.xml'), 'utf8', (err, data) => {
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
				if(fs.existsSync(mapPath))	{
					console.log('current mapping file already exits, change name');
					throw new Error('file already exists, permission denied');
				}
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

geoserverConnection.prototype.addJdbcTableToPostgis = async function(mappingFilePath, layerName, tileDirectory, levels='2', srid='EPSG:4326')	{
	try {
		let message;
		if(srid.includes(':'))
			srid = srid.split(':')[1];
		let shOutput;

		shOutput = await sh('java -jar ' + convention.jdbcPluginPath + ' ddl -config ' + mappingFilePath + ' -spatialTNPrefix ' + layerName + '_tiled -pyramids ' + levels + ' -statementDelim ";" -srs ' + srid + ' -targetDir ' + path.join(__dirname, convention.sqlPrepared));

		shOutput = await sh(this.schema.psqlCommand + ' -f ' + path.join(__dirname, convention.sqlPrepared,'createmeta.sql'));
		if(shOutput.stdout === '' && shOutput.stderr !== '')
		{
			console.log('failed at making new meta table, continuing');
		}

		shOutput = await sh(this.schema.psqlCommand + ' -f ' + path.join(__dirname, convention.sqlPrepared,'add_'+layerName+'.sql'));
		if(shOutput.stdout === '' && shOutput.stderr !== '')
		{
			//rollback
			if(fs.existsSync(mappingFilePath))
				fs.unlinkSync(mappingFilePath);
			throw new sqlError('failed at inserting entries into metatable, rolling back');
		}

		shOutput = await sh('java -Xbootclasspath/a:/' + convention.jdbcPostgresClassPath + ' -jar ' + convention.jdbcPluginPath + ' import -config ' + mappingFilePath + ' -spatialTNPrefix ' + layerName + '_tiled -tileTNPrefix ' + layerName + '_tiled -dir ' + tileDirectory + ' -ext tif');
		console.log('cleaning tiles directory which contains Tiled pyramids, ' + tileDirectory);

		rimraf(path.resolve(tileDirectory, '*'), (err, data) => {
			if(err)	{
				throw err;
			}
		});
	}
	catch (e) {
		//rollback
		if(fs.existsSync(mappingFilePath))
			fs.unlinkSync(mappingFilePath);

		let shOutput = await sh(this.schema.psqlCommand + ' -f ' + path.join(__dirname, convention.sqlPrepared,'remove_'+layerName+'.sql'));
		if(shOutput.stdout === '' && shOutput.stderr !== '')
			throw new sqlError('could not remove tiledTables');
		rimraf(path.join(tileDirectory, '*'), (err, data) => {
			if(err)	{
				console.log('could not clean tile directory ', tileDirectory);
				throw new cleanFolderError('could not clean tile Directory ', tileDirectory)
			}
		});
		throw e;
	}
}

// NOTE: have to create meta table first
geoserverConnection.prototype.addJdbcStoreFromPostgisToGeoserver = function(namespace, layerName, mappingFilePath)	{
	return new Promise((resolve, reject) => {
		let url = 'file:'+ path.join(convention.jdbcMapPathRel, path.basename(mappingFilePath));
		console.log(url);
		fs.readFile(path.join(convention.xmlTemplates, 'addJdbcImageMosaic.xml'), 'utf-8', (err, data) => {
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
						if(resp.statusCode >= 200 && resp.statusCode < 300)
							resolve({resp: resp, body: body, storeName: layerName, outpath:mappingFilePath});
						else 	{
							console.log(resp.statusCode);
							reject(resp);
						}

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
				if(resp.statusCode >= 200 && resp.statusCode < 300)
					resolve({resp: resp, body: body, storeName: datastoreName, layerName:featureName});
				else 	{
					console.log(resp.statusCode);
					reject(resp);
				}
			}
		});
    });
};

//error checking done: complete
geoserverConnection.prototype.createJdbcCoverageFromRaster = async function(layerPath, layerName, workspace, tileDir, levels='3', srid='EPSG:4326', tileSize='1024', interpolation = '1') {
	layerName = this.layerNameConvention(layerName);
	let value;
	try {
		value = await gdalRetile(layerPath, layerName, tileDir, levels, srid, tileSize);
	} catch (e) {
		throw new Error('could not retile');
	}

	try {
		value = await this.createJdbcMapping(layerName, srid, interpolation);
	} catch (e) {
		//rollback
		console.log('cleaning tile directory');
		rimraf(path.join(tileDir, '*'), (err, data)	=> {
			if(err)	{
				throw new cleanFolderError('could not create mapping and could not clean tile Directory: ', tileDir);
			}
		});
		throw new Error('could not create mapping');
	}

	try {
		await this.addJdbcTableToPostgis(value.outpath, layerName, tileDir, levels, srid);
		value = await this.addJdbcStoreFromPostgisToGeoserver(workspace, layerName, value.outpath);
	} catch (e) {
		throw e;
	}
	try {
		await this.publishCoverageFromDataStore(layerName, workspace, value.storeName);
		resolve({layerName: layerName, workspace: workspace, storeName:value.storeName});
	} catch (e) {
		//rollback
		// await this.deleteDataStoreRecursively(workspace, value.storeName);
		let shOutput = await sh(this.schema.psqlCommand + ' -f ' + path.join(__dirname, convention.sqlPrepared,'remove_'+layerName+'.sql'));
		if(shOutput.stdout === '' && shOutput.stderr !== '')
			throw new sqlError('could not remove tiledTables');
		rimraf(path.join(tileDirectory, '*'), (err, data) => {
			if(err)	{
				console.log('could not clean tile directory ', tileDirectory);
				throw new cleanFolderError('could not clean tile Directory ', tileDirectory)
			}
		});
		throw e;
	}
}

// geoserverConnection.prototype.deleteJdbcStore = async function(workspace, storeName)	{
// 	let mappingFilePath = path.join('file:' + convention.jdbcMapPathRel, storeName+'_map.xml');
// 	if(!fs.existsSync(mappingFilePath))	{
// 		throw new Error('store does not exist or its mapping file is lost in which case it is broken and it is recommended to delete the store from admin page');
// 	}
// 	try {
// 		value = await sh(this.schema.psqlCommand + ' -f ' + path.join(__dirname, convention.sqlPrepared,'remove_'+storeName+'.sql'));
// 		fs.unlinkSync(mappingFilePath);
// 		this.deleteDataStoreRecursively();
// 	} catch (e) {
//
// 	}
//
// }
//error checking done: complete
geoserverConnection.prototype.addNamespace = function(namespace)	{
	return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(convention.xmlTemplates,'addNamespace.xml'), 'utf8', (err,data) => {
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
    			if(!err)	{
					if(resp.statusCode >= 200 && resp.statusCode < 300)
						resolve({resp: resp, body: body});
					else 	{
						console.log(resp.statusCode);
						reject(resp);
					}
				}
    			else {
    				reject(err);
    			}
    		});
    	})
    });
};

//error checking done: complete
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
			if(!err)	{
				if(resp.statusCode >= 200 && resp.statusCode < 300)
					resolve({resp: resp, body: body});
				else 	{
					console.log(resp.statusCode);
					reject(resp);
				}
			}
			else {
    			reject(err);
    		}
    	});
    });
};

//error checking done: complete
geoserverConnection.prototype.addPostgisDatastore = function(storeWorkspace, storeName)  {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(convention.xmlTemplates ,'addPostGis.xml'), 'utf8', (err, data) => {
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
				if(!err)	{
					if(resp.statusCode >= 200 && resp.statusCode < 300)
						resolve({resp: resp, body: body});
					else 	{
						reject(resp);
					}
				}
    			else {
            		reject(new geoserverConnectionError('network error: could not connect to geoserver'));
    			}
            });
    	});
    });
};

//error checking done: complete
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
				if(resp.statusCode >= 200 && resp.statusCode < 300)	{
					resolve({resp: resp, body: body});
				}
				else 	{
					reject(resp);
				}
			}
			else {
    			reject(err);
    		}
    	});
    });

};

//error checking done: complete
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
			if(!err)	{
				if(resp.statusCode >= 200 && resp.statusCode < 300)
					resolve({resp: resp, body: body});
				else 	{
					reject(resp);
				}
			}
			else {
				reject(err);
			}
		});
    });
};

//error checking done: complete
geoserverConnection.prototype.publishFeature = function(featurePath, featureName, srid='EPSG:4326', workspaceName, datastoreName)	{
    return new Promise((resolve, reject) => {
        featureName = this.layerNameConvention(featureName);
		this.schema.sendFeatureToDB(featurePath, featureName, srid)
			.then(value => {
				return this.publishFeatureFromDataStore(featureName, workspaceName, datastoreName);
			})
			.then(value => {
				resolve(value);
			})
			.catch(e => {
				reject(e);
			});
    });
}

//error checking done: complete
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
				this.schema.deleteFeature(featureName)
					.then(value => {
						resolve(value)
					})
					.catch(err => {
						reject(err);
					})
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
                let gotLayer;
    			for(let layer of jsondoc.Capability.Layer.Layer)	{
    				if(layer.Name === passedLayer)	{
    					gotLayer = layer;
                		break;
    				}
    			}
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
