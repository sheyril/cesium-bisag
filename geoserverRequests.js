//Complete data store deletion of JDBC store, everything else is stable
/**
  * This module contains the class to represent a geosrver connection and various methods to publish, delete and prepare data for geoserver
  * @module geoserverRequests
*/
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

/**
  * @class geoserverConnection
  * @property {string} baseHostName - Basic hostname for geoserver connection, example: http://localhost:8080/geoserver/
  * @property {string} user - Username for the admin of geoserver. Used for authentication
  * @property {string} pwd - Password for the admin of geoserver. Used for authentication
  * @property {schema} schema - The PostGIS schema that this connection is connected to
  * @param {string} baseHostName - Basic hostname for geoserver connection, example: http://localhost:8080/geoserver/
  * @param {string} user - Username for the admin of geoserver. Used for authentication
  * @param {string} pwd - Password for the admin of geoserver. Used for authentication
  * @param {schema} schema - The PostGIS schema that this connection is connected to
  * @property {function} layerNameConvention - Follow convention on names of layer. In case the name does not follow convention it would be changed
  * @property {function} createJdbcMapping - Make Map File for Raster to be imported as JDBC ImageMosaic. Helper function for createJdbcCoverageFromRaster
  * @property {function} addJdbcTableToPostgis - Import the raster into PostGIS as JDBC addJdbcImageMosaic. Helper function for createJdbcCoverageFromRaster
  * @property {function} addJdbcStoreFromPostgisToGeoserver - Creates a JDBC store in geoserver, the store should be already made before. Helper function for createJdbcCoverageFromRaster
  * @property {function} publishCoverageFromDataStore - Publishes JDBC ImageMosaic Coverage from DataStore made. Helper function for createJdbcCoverageFromRaster
  * @property {function} createJdbcCoverageFromRaster - Converts a raster into JDBC ImageMosaic and publishes it to geoserver after making a PostGIS Store and importing data from  it
  * @property {function} addNamespace - Creates a new namespace/workspace in geoserver
  * @property {function} deleteNamespace - Deletes a namespace/workspace from geoserver
  * @property {function} addPostgisDatastore - Adds a PostGIS datasource for vector files in geoserver
  * @property {function} deleteDataStoreRecursively - Deletes a PostGIS datastore recursively
  * @property {function} publishFeatureFromDataStore - Publishes a feature table present in the PostGIS datastore to geoserver. Helper function for publishFeature
  * @property {function} publishFeature - Publishes a feature/VectorFile to geoserver
  * @property {function} deleteFeature - Deletes a feature from geoserver. Also drops the table containg the feature in PostGIS
  * @property {function} getMapWMS - Makes a WMS request to geoserver
*/
class geoserverConnection	{
	constructor(baseHostName, user, pwd, sch)	{
		this.baseHostName = baseHostName;
		this.user = user;
		this.pwd = pwd;
		this.schema = sch;
	}
}

/**
  * Used as a helper function everywhere to follow convention :  All layernames start with '_'. Takes into account that the name may also contain name of the workspace it belonged to in geoserver and does not change the name of the workspace but only changes the name of the layer
  * Note: The convention can be changed by changing this function and the helper function layerNameConvention it uses from ./convention.js
  * @method
  * @param {string} FullLayerName - Name of the layer to be used with geoserver and PostGIS.
  * @returns {string} Name of the layer after convention has been applied
*/
geoserverConnection.prototype.layerNameConvention = function(FullLayerName)	{
	if(!FullLayerName.includes(':'))
		return convention.layerNameConvention(FullLayerName);
	let namespace = FullLayerName.split(':')[0];
	let layername = FullLayerName.split(':')[1];
	layername = convention.layerNameConvention(layername);
	FullLayerName = namespace + ':' + layername;
	return FullLayerName;
};

/**
  * Helper Function for createJdbcCoverageFromRaster
  * Creates the mapping file which helps JDBC ImageMosaic provide information about the raster to geoserver for configuration. For more information visit the official website and see tutorials on use of JDBC ImageMosaic
  * @param {string} layerName - Name of the Raster Layer which would be shown on geoserver and PostGIS after conversion to JDBC ImageMosaic
  * @param {string} [srid='EPSG:4326'] - SRS of the Raster Layer
  * @param {string|number} [interpolation='1'] - Interpolation to be used to make coverage
  * @returns {Promise<{outpath: string, layerName : layerName}>} - Returns a promise that resolves once the mapping file is generated. The object returned contains path to mapping file and the name of the layer successfully
*/
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

/** Helper Function to createJdbcCoverageFromRaster. Imports data into raster table for JDBC ImageMosaic in PostGIS. For more information visit the official website and see tutorials on use of JDBC ImageMosaic
  * @async
  * @method
  * @param {string} mappingFilePath - Path to the mapping file created using createJdbcMapping
  * @param {string} layerName - Name of the layer
  * @param {string} tileDirectory - Path to the directory to be used to temporarily store tiles and pyramids created for Mosaic (Note: It does not delete the contents after generating them, the main function createJdbcCoverageFromRaster does)
  * @param {string|number} [levels=2] - Number of levels to be created for the pyramid
  * @param {string} [srid='EPSG:4326'] - SRS of the Raster Layer
  * @returns {Promise<null>} - A Promise that is resolved when a Table is added and data is imported to PostGIS successfully
*/
geoserverConnection.prototype.addJdbcTableToPostgis = async function(mappingFilePath, layerName, tileDirectory, levels=2, srid='EPSG:4326')	{
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

/** Helper Function for createJdbcCoverageFromRaster. Creates a JDBC ImageMosaic Store in geoserver. For more information visit the official website and see tutorials on use of JDBC ImageMosaic
  * @method
  * @param {string} namespace - workspace/namespace of geoserver in which store has to be created
  * @param {string} layerName - Name of the layer
  * @param {string} mappingFilePath - Path to the mapping file used for JDBC addJdbcImageMosaic.
  * @returns {Promise<{resp:string, body: string, storeName: string, outpath: string}>} - Returns a promise that is resolved when the store is created in geoserver successfully
*/
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

/** Helper function for createJdbcCoverageFromRaster. Publishes the created ImageMosaic Table in PostGIS to geoserver. For more information visit the official website and see tutorials on use of JDBC ImageMosaic
  * @method
  * @param {string} layerName - Name of the Layer to be published
  * @param {string} workspaceName - Name of the workspace the layer has to be published in
  * @param {string} datastoreName - Name of the DataStore the layer has to be published from
  * @returns {Promise<{resp: string, body: string, storeName: string, layerName: string}>} - Returns a promise that is resolved when the coverage is published to geoserver successfully
*/
geoserverConnection.prototype.publishCoverageFromDataStore = function(layerName, workspaceName, datastoreName)	{
    return new Promise((resolve, reject) => {
        let options	= {
    		url: this.baseHostName + 'rest/workspaces/' + workspaceName + '/coveragestores/' + datastoreName + '/coverages',
    		headers: {'Content-Type':'application/xml'},
    		method: 'POST',
    		auth: {
    			username: this.user,
    			password: this.pwd
    		},
    		body: '<coverage><name>' + layerName + '</name><nativeCoverageName>' + layerName + '</nativeCoverageName></coverage>'
    	};
		request(options, (err, resp, body) => {
			if(err)
				reject(err);
			else {
				if(resp.statusCode >= 200 && resp.statusCode < 300)
					resolve({resp: resp, body: body, storeName: datastoreName, layerName:layerName});
				else 	{
					console.log(resp.statusCode);
					reject(resp);
				}
			}
		});
    });
};

/**
  * Creates a JDBC ImageMosaic Coverage from a given Raster Layer. Takes care of creating the mapping file, following conventions, creating datastore and publishing the coverage to geoserver. For more information visit the official website and see tutorials on use of JDBC ImageMosaic
  * @method
  * @async
  * @param {string} layerPath - Path to the Raster Layer for which ImageMosaic is constructed
  * @param {string} layerName - Name of the layer. This name is used to publish to geoserver
  * @param {string} workspace - Name of the workspace in which layer has to be published
  * @param {string} tileDir - Path to the tile Directory to use for creating tiles and pyramids. The directory is cleaned after use.
  * @param {string|number} [levels=2] - Number of pyramid levels to be created
  * @param {string} srid - SRS of the raster layer. (If wrong SRS given the layer preview would be blank on geoserver)
  * @param {number} tileSize - Size of an individual tile in pixels
  * @param {number} [interpolation=1] - interpolation to be used. Mostly the default value 1 is used. For custom interpolation visit the official website and see tutorials on use of JDBC ImageMosaic. If you are not sure let it go to default
  * @returns {Promise<{layerName: string, workspace: string, storeName: string}>} - Returns a promise that is resolved when the raster has been converted to JDBC ImageMosaic and published successfully
*/
geoserverConnection.prototype.createJdbcCoverageFromRaster = async function(layerPath, layerName, workspace, tileDir, levels=2, srid='EPSG:4326', tileSize=1024, interpolation = 1) {
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
		rimraf(tileDir, (err, data) => {
			if(err) {
				console.log('could not clean tile directory', tileDir);
				throw new cleanFolderError('could not clean tileDirectory ', tileDir)
			}
		});
		return({layerName: layerName, workspace: workspace, storeName:value.storeName});
	} catch (e) {
		//rollback
		// await this.deleteDataStoreRecursively(workspace, value.storeName);
		let shOutput = await sh(this.schema.psqlCommand + ' -f ' + path.join(__dirname, convention.sqlPrepared,'remove_'+layerName+'.sql'));
		if(shOutput.stdout === '' && shOutput.stderr !== '')
			throw new sqlError('could not remove tiledTables');
		rimraf(path.join(tileDirectory, '*'), (err, data) => {
			if(err)	{
				console.log('could not clean tile directory ', tileDirectory);
				throw new cleanFolderError('could not clean tile Directory ', tileDir);
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

/**Creates a new Namespace/Workspace in geoserver
  * @param {string} namespace - Name of the Namespace/Workspace to be created
  * @returns {Promise<resp: string, body: string>} - A promise that is resolved when a new namespace is created successfully
*/
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

/** Deletes an existing namespace/workspace from geoserver. Note: If there is some error in deleting the namespace try deleting all datastores, coveragestores and layers from the namespace
  * @method
  * @param {string} namespace - Name of the workspace/namespace to be deleted
  * @returns {Promise<resp: string, body: string>} - Returns a promise that is resolved if the namespace is deleted successfully
*/
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

/** Adds a PostGIS datastore to geoserver for publishing vector layers from a PostGIS database
  * @method
  * @param {string} storeWorkspace - Workspace/Namespace in which store has to be created
  * @param {string} storeName - Name of the store to be created
  * @returns {Promise<{resp: string, body: string}>} - Returns a promise that is resolved if the datastore has been added successfully
*/
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

/** Deletes a PostGIS datastore from geosrver recursively ie. It also deletes all the layers. Be careful with this function. In case it is deleted by accident the data is not lost and can be republished by creating the store again
  * @method
  * @param {string} storeWorkspace - Workspace in which datastore to be deleted exists
  * @param {string} storeName - Name of the store to be deleted
  * @returns {Promise<{resp: string, body: string}>} - Returns a promise that is resolved if the datastore is deleted successfully
*/
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

/** Helper function for publishFeature
  * @method
  * @param {string} featureName
  * @param {string} workspaceName
  * @param {string} datastoreName
  * @returns {Promise<{resp: string, body: string}>} - A promise that is resolved if the feature is published from datastore successfully
*/
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

/** Publishes a feature/VectorLayer to geoserver from file system
  * @method
  * @param {string} featurePath - path to the feature/vectorLayer to be added
  * @param {string} featureName - Name of the vector Layer. This name would be shown on geoserver once published
  * @param {string} srid - SRS of the Vector layer
  * @param {string} workspaceName - Name of the workspace in which feature is to be inserted
  * @param {string} datastoreName - Name of the datastore from which vector layer is to be published
  * @returns {Promise<{resp: string, body: string}>} - Returns a promise that is resolved if the feature is published successfully
*/
geoserverConnection.prototype.publishFeature = function(featurePath, featureName, srid, workspaceName, datastoreName)	{
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

/** Deletes a VectorLayer/Feature from geoserver and the PostGIS database. NOTE: Data is lost be careful with this function
  * @param {string} passedLayer - Full name of the layer to be deleted from geoserver. Format of layername: 'workspaceName:layerName'
  * @returns {Promise<stdout: string, stderr: string>} - Returns a promise that is resolved when the feature is deleted successfully
*/
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

/** Makes a WMS getMap request to geoserver. Some changes have been made. Check if the function works
  * @param {string} passedLayer - full name of the layer to be requested from geoserver. Format of layername: 'workspaceName:layerName'
  * @param {string} layerFolderPath - Path where the requested layer has to be written/outputted
  * @returns {Promise<{outpath: string, srid: string, bbox: string}>} - Returns a promise that is resolved if the request was successful
*/
geoserverConnection.prototype.getMapWMS = function(passedLayer, layerFolderPath)	{

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
    					fs.writeFile(path.resolve(layerFolderPath, layername + '.tif'), image, (error) => {
    						if(error)
    							reject(error);
    						else {
    							resolve({
    								outpath: path.resolve(layerFolderPath, layername + '.tif'),
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
