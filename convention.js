// NOTE: The whole package uses a convention, to change the convention, function convention() in convention.js file can be changed and the change would be reflected everywhere
// NOTE: The convention is used because postgres does not allow identifiers to start with numeric
// NOTE: Another convention to use would be stricly no start numeric, but the contours interval length is determined by numbers
// NOTE: If this convention is accepted, the names of contour files will start with numbers

/**
  * This module contains various conventions and configurations used in the project. Configure this file in your system by altering/updating required paths
  * @module convention
*/
'use strict';
/** The default layerNameConvention used everywhere in the project
  * @param {string} name - Name on which convention has to be applied
*/
exports.layerNameConvention = function(name) {
    if(name[0] !== '_')
        name = '_' + name;
    return name;
}

/** Default database to be used with geoserver
  * @type {string}
*/
exports.datastore = 'CesiumBisag';

/** Default Relative path to folder which contains mapping files for JDBC ImageMosaic
  * @type {string}
*/
exports.jdbcMapPathRel = 'coverages/jdbcForCesium/';

/** Default absolute path to folder which contains mapping files for JDBC ImageMosaic
  * @type {string}
*/
exports.jdbcMapPath = '/home/orange/geoserver/data_dir/coverages/jdbcForCesium/';

/** Default path to the required postgres class by java utility for JDBC. The class is automatically downloaded if geosrver is configured with PostgreSQL. Versoin may differ
  * @type {string}
*/
exports.jdbcPostgresClassPath = '/usr/share/java/postgresql-jdbc.jar';
/** Default path to the plugin file for JDBC ImageMosaic. It has to be extracted in WEB-INF/lib/ in geoserver after downloading the plugin. Version may differ
  * @type {string}
*/
exports.jdbcPluginPath = '/home/orange/geoserver/webapps/geoserver/WEB-INF/lib/gt-imagemosaic-jdbc-21.1.jar';

/** Default workspace name for contours in geoserver
  * @type {string}
*/
exports.geoserverContoursWorkspace = 'Contours';

/** Default workspace name for rasters in geoserver
  * @type {string}
*/
exports.geoserverRastersWorkspace = 'Rasters';

/** Default workspace name for hillshades in geoserver
  * @type {string}
*/
exports.geoserverHillShadesWorkspace = 'Hillshades';

/** Default workspace name for shadedreliefs in geoserver
  * @type {string}
*/
exports.geoserverShadedReliefsWorkspace = 'Shadedreliefs';


/** Default folder which contains contours in the file system
  * @type {string}
*/
exports.folderContours = './Stores/contours/';

/** Default folder which contains rasters in the file system
  * @type {string}
*/
exports.folderRasters = './Stores/rasters/';

/** Default folder which contains hillshades in the file system
  * @type {string}
*/
exports.folderHillShades = './Stores/hillshades/';

/** Default folder which contains shadedreliefs in the file system
  * @type {string}
*/
exports.folderShadedReliefs = './Stores/shadedreliefs/';


/** Default path to geoserver root directory
  * @type {string}
*/
exports.geoserverRootDirectory = '/home/orange/geoserver/';

/** Default database to be used with geoserver
  * @type {array<string>}
*/
exports.defaultBaseDatabase = ['localhost', '5432', 'CesiumBisag', 'postgres', 'Firedragon12'];

/** Default parameters to a geoserver connection
  * @type {array<string>}
*/
exports.defaultGeoserverConnection = ['http://localhost:8080/geoserver/', 'admin', 'geoserver', 'public'];

/** Default available schemas to be used
  * @type {array<string>}
*/
exports.defaultSchema = ['public'];


/** Default path for temporary folder used for retiling
  * @type {string}
*/
exports.retilingTemporaryFolder = '/home/orange/Desktop/3D_DEM_DATA/tiles/';


/** Default path to the folder that contains XML templates
  * @type {string}
*/
exports.xmlTemplates = './templateFiles/XML/';

/** Default path to the folder that contains SQL scripts templates
  * @type {string}
*/
exports.sqlTemplates = './templateFiles/SQL/';

/** Default path to the folder that contains XML prepared files
  * @type {string}
*/
exports.xmlPrepared = './preparedScripts/XML/';

/** Default path to the folder that contains SQL prepared scripts
  * @type {string}
*/
exports.sqlPrepared = './preparedScripts/SQL/';
