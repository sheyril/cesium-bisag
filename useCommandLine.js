/**
  * Module to run CLI
  * Note: For changing Operating systems, this module may need some changes. Refer to OS specific commands for the commands used here.
  * @module useCommandLine Wrapper around command line functions in ubuntu (BASH)
*/
let exec = require('child_process').exec;
const rimraf = require('rimraf');
const path = require('path');

/**
  * @typedef {Object} CLIoutput - output given by commandline
  * @property {string} stdout - Output given by CLI on success
  * @property {string} stderr - Error given by CLI on failure
*/

/**
 * @function
 * @param {string} cmd - The Command to be exectued in the Command Line
 * @async
 * @returns {CLIoutput}
 * @throws {Error} Error thrown by Command line
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
 * @function
 * @param {string} infilepath - Path to the input Layer to be retiled
 * @param {string} layerName - Name of the layer
 * @param {string} targetDir - Path to the folder in which retiled layers are sent
 * @param {string|number} levels - Number of pyramids to be created for the layer
 * @param {string} srid - SRS of the Layer
 * @param {string|number} tileDim - The size of the tiles to be generated in pixels
 * @async
 * @returns {Object} tilesInfo Information about the tiles
 * @returns {string} tilesInfo.layerName name of the layer
 * @returns {string} tilesInfo.tilesDirectory path to tiles directory
 * @throws {Error} Error if retiling was unsuccessful
*/
// NOTE: Clears the whole tile directory first and then runs gdal_retile
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
