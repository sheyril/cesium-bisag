//Done
const convention = require('./convention');
const rimraf = require('rimraf');
const useCommandLine = require('./useCommandLine');
const path = require('path');

//Cleans the outputdirectory and outputs tiled contours into the directory and complies to nameing convention
function generateTiledContours(jsonLayerObject)    {
    return new Promise((resolve, reject) => {
        let layer = jsonLayerObject.layer;
        rimraf(path.join(layer.outLayerDirectoryPath, '*'), (err, data) => {
            if(err) {
                reject(err);
                return;
            }
            else {
                useCommandLine.sh('python3 ./QGISprocessing.py prepareTiledContours ' + layer.inputLayerPath + ' ' + layer.outLayerDirectoryPath + ' ' + layer.layerName + ' ' + layer.bands + ' ' + layer.intervals + ' ' + layer.tileSize)
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
