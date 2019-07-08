//Done
/**
  * This module contains the functions to run python scripts for layer processing in qgis3
  * @module QGIS
*/

const convention = require('./convention');
const rimraf = require('rimraf');
const useCommandLine = require('./useCommandLine');
const path = require('path');
const fs = require('fs');

/**
  * Creates tiled contours from height maps
  * @function
  * @param {string} jsonLayerFile - Name of the layer from which contours are to be generated 
  * @returns {undefined} 
*/

function generateTiledContours(jsonLayerFile)    {
    return new Promise((resolve, reject) => {
        let jsonLayerObject;
        let data = fs.readFileSync(jsonLayerFile, 'utf-8');
        jsonLayerObject = JSON.parse(data);
        let layer = jsonLayerObject.layer;

        rimraf(path.join(layer.outLayerDirectoryPath, '*'), (err, data) => {
            if(err) {
                reject(err);
                return;
            }
            else {
                useCommandLine.sh('python3 ./QGISprocessing.py prepareTiledContours ' + jsonLayerFile)
                    .then(value => {
                        console.log('completed generation: ', new Date());
                        resolve(jsonLayerObject);
                    })
                    .catch(err => {
                        reject(err);
                    });
            }
        });
    });
}

/**
  * Creates contour from height maps
  * @function
  * @param {string} infilePath - Path to the layer from which contour is to be generated 
  * @param {string} outfilePath - Path of the contour layer which will be exported
  * @param {string} bands - Number of bands in the input file
  * @param {string} interval - Interval value at which the contours will be generated
  * @param {string} srid - SRS of the input file
  * @returns {null} 
*/

function generateContour(infilePath, outfilePath, bands, interval, srid)   {
    return new Promise((resolve, reject) => {
        useCommandLine.sh('python3 ./QGISprocessing.py contour ' +  infilePath + ' ' + outfilePath + ' ' + bands + ' ' + interval)
            .then(value => {
                resolve({data: data, outpath: outfilePath});
            })
            .catch(err => {
                reject(err);
            });
    });

}

/**
  * Creates hillshade from height maps
  * @function
  * @param {string} inp - Path to the layer from which hillshade is to be generated 
  * @param {string} outp - Path of the hillshade layer which will be exported
  * @param {string} srid - SRS of the input file
  * @returns {null} 
*/

function generateHillShade(inp, outp, srid)   {
    return new Promise((resolve, reject) => {
        useCommandLine.sh('python3 ./QGISprocessing.py hillshade ' +  infilePath + ' ' + outfilePath)
            .then(value => {
                resolve({data: data, outpath: outfilePath});
            })
            .catch(err => {
                reject(err);
            });
    });
}

/**
  * Creates pseudocolor from height maps
  * @function
  * @param {string} inp - Path to the layer from which singleband pseudocolor is to be generated 
  * @param {string} outp - Path of the pseudocolor layer which will be exported
  * @param {string} srid - SRS of the input file
  * @returns {null} 
*/

function generatePseudocolor(inp, outp, srid) {
    return new Promise((resolve, reject) => {
        useCommandLine.sh('python3 ./QGISprocessing.py psuedocolor ' +  infilePath + ' ' + outfilePath)
            .then(value => {
                resolve({data: data, outpath: outfilePath});
            })
            .catch(err => {
                reject(err);
            });
    });
}


module.exports = {
    generateContour: generateContour,
    generateHillShade: generateHillShade,
    generatePseudocolor: generatePseudocolor,
    generateTiledContours: generateTiledContours
}
