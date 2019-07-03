// NOTE: The whole package uses a convention, to change the convention, function convention() in convention.js file can be changed and the change would be reflected everywhere
// NOTE: The convention is used because postgres does not allow identifiers to start with numeric
// NOTE: Another convention to use would be stricly no start numeric, but the contours interval length is determined by numbers
// NOTE: If this convention is accepted, the names of contour files will start with numbers

'use strict';

const postGisOperations = require('./postGisOperations');

exports.layerNameConvention = function(name) {
    if(name[0] !== '_')
        name = '_' + name;
    return name;
}

let defaultBaseDatabase = new postGisOperations.database('localhost', '5432', 'CesiumBisag', 'postgres', 'Firedragon12');

exports.datastore = 'CesiumBisag';

exports.jdbcMapPathRel = 'coverages/jdbcForCesium/';
exports.jdbcMapPath = '/home/orange/geoserver/data_dir/coverages/jdbcForCesium/';
exports.jdbcPostgresClassPath = '/usr/share/java/postgresql-jdbc.jar';
exports.jdbcPluginPath = '/home/orange/geoserver/webapps/geoserver/WEB-INF/lib/gt-imagemosaic-jdbc-21.1.jar';

exports.geoserverContoursWorkspace = 'Contours';
exports.geoserverRastersWorkspace = 'Rasters';
exports.geoserverHillShadesWorkspace = 'Hillshades';
exports.geoserverShadedReliefsWorkspace = 'Shadedreliefs';

exports.folderContours = './Stores/contours/';
exports.folderRasters = './Stores/rasters/';
exports.folderHillShades = './Stores/hillshades/';
exports.folderShadedReliefs = './Stores/shadedreliefs/';

exports.geoserverRootDirectory = '/home/orange/geoserver/';
exports.defaultBaseDatabase = ['localhost', '5432', 'CesiumBisag', 'postgres', 'Firedragon12'];
exports.defaultGeoserverConnection = ['http://localhost:8080/geoserver/', 'admin', 'geoserver', 'public'];
exports.defaultSchema = ['public'];

exports.retilingTemporaryFolder = '/home/orange/Desktop/3D_DEM_DATA/tiles/';
