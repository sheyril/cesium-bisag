/**
  * This module contains wrappers around commandline commands
  * @module useCommandLine
*/
'use strict';

let exec = require('child_process').exec;
const rimraf = require('rimraf');
const path = require('path');


/**
 * Executes the passed in command in command line
 * @todo Create a namespace for useCommandline to avoid polluting global namespace and do testing
 * @function
 * @param {string} cmd - The Command to be exectued in the Command Line
 * @returns {Promise<{stdout: string, stderr: string}>} - Returns a Promise that is resolved when the command has completed execution
*/
function sh (cmd) {
    return new Promise(function(resolve, reject)    {
        console.log(cmd);
        exec(cmd, (err, stdout, stderr) => {
            if(err) {
                reject(err);
            }
            else {
                resolve({stdout:stdout, stderr:stderr});
            }
        });
    });
}

/**
 * Tiles the input raster layer into the output directory and creates zoom level pyramids too
 * Note: It first cleans the directory in which it is going to output the tiles. Therefore previous data stored in the directory would be lost
 * @function
 * @todo Create a namespace for useCommandline to avoid polluting global namespace and do testing
 * @param {string} infilepath - Path to the input Layer to be retiled
 * @param {string} layerName - Name of the layer
 * @param {string} targetDir - Path to the folder in which retiled layers are sent
 * @param {string|number} levels - Number of pyramids to be created for the layer
 * @param {string} srid - SRS of the Layer
 * @param {string|number} tileDim - The size of the tiles to be generated in pixels
 * @returns {Promise<{layerName:string, tilesDirectory:string}>} Returns a promise that resolves when tiling is done
*/

function gdalRetile(infilepath, layerName, targetDir, levels='2', srid='EPSG:4326', tileDim='1024')	{
	return new Promise((resolve, reject) => {
		rimraf(path.join(targetDir, '*'), (err, data) => {
            sh('gdal_retile.py -r bilinear -co "TFW=YES" -ps ' + tileDim + ' ' + tileDim + ' -s_srs ' + srid + ' -of GTiff -ot Byte -levels ' + levels + ' -targetDir ' + targetDir + ' ' + infilepath)
                .then(value => {
                    resolve({layerName: layerName, tilesDirectory : targetDir});
                    console.log('done retiling');
                })
                .catch(err => {
                    // console.log(err);
                    reject(err);
                });
        });
	});
}
module.exports = {
    sh : sh,
    gdalRetile : gdalRetile
}
