const spawn = require('child_process').spawn;
const convention = require('./convention');
const rimraf = require('rimraf');
const fs = require('fs');
const useCommandLine = require('./useCommandLine');
const path = require('path');

function generateTiledContours(inJsonFile)    {
    return new Promise((resolve, reject) => {
        fs.readFile(inJsonFile, (err, data) => {
            let jsonLayerObj = JSON.parse(data);
            jsonLayerObj.layer.layerName = convention.layerNameConvention(jsonLayerObj.layer.layerName);
            let layer = jsonLayerObj.layer;
            rimraf(path.join(layer.outLayerDirectoryPath, '*'), (err, data) => {
                if(err) {
                    reject(err);
                    return;
                }
                else {
                    console.log('python3 ./QGISprocessing.py tileThemHere ' + layer.inputLayerPath + ' ' + layer.outLayerDirectoryPath + ' ' + layer.layerName + ' ' + layer.bands + ' ' + layer.intervals + ' ' + layer.tileSize);
                    useCommandLine.sh('python3 ./QGISprocessing.py tileThemHere ' + layer.inputLayerPath + ' ' + layer.outLayerDirectoryPath + ' ' + layer.layerName + ' ' + layer.bands + ' ' + layer.intervals + ' ' + layer.tileSize)
                        .then(value => {
                            console.log('completed generation: ', new Date());
                            let files = fs.readdirSync(layer.outLayerDirectoryPath);
                            console.log(files.length);
                            resolve(jsonLayerObj);
                        })
                        .catch(err => {
                            reject(err);
                        });
                }
            });
        })
    });
}

// function generateTiledContours(inJsonFile)    {
//     return new Promise((resolve, reject) => {
//         fs.readFile(inJsonFile, (err, data) => {
//             let jsonLayerObj = JSON.parse(data);
//             jsonLayerObj.layer.layerName = convention.layerNameConvention(jsonLayerObj.layer.layerName);
//             let layer = jsonLayerObj.layer;
//             useCommandLine.gdalRetile(layer.inputLayerPath, layer.layerName, convention.retilingTemporaryFolder, layer.levels, layer.srid, layer.tileSize)
//                 .then(value => {
//                     console.log('got in then');
//                     rimraf(path.join(layer.outLayerDirectoryPath, '*'), (err, data) => {
//                         if(err) {
//                             reject(err);
//                             return;
//                         }
//                         else {
//                             let intervalString = '';
//                             for(interval of layer.intervals)
//                                 intervalString += interval + ' ';
//                             useCommandLine.sh('python3 ./QGISprocessing.py prepareContour ' + value.tilesDirectory + ' ' + layer.outLayerDirectoryPath + ' '+ layer.layerName + ' ' + layer.srid +' '+ layer.bands + ' ' + intervalString)
//                                 .then(value => {
//                                     console.log('completed generation: ', new Date());
//                                     let files = fs.readdirSync(layer.outLayerDirectoryPath);
//                                     console.log(files.length);
//                                     resolve(jsonLayerObj);
//                                 })
//                                 .catch(err => {
//                                     reject(err);
//                                 });
//                         }
//                     });
//                 })
//                 .catch(err => {
//                     reject(err);
//                 });
//         });
//     });
// }

// function prepareContour()   {
//     return new Promise((resolve, reject) => {
//         try {
//             let process = spawn('python3', ['./QGISprocessing.py', "prepareContour", "/home/orange/Desktop/3D_DEM_DATA/tiles", "/home/orange/Desktop/3D_DEM_DATA/allShp", "myContours", 'EPSG:4326', 1, 100]);
//             process.stdout.on('data', (data) => {
//                 // resolve({data: data, outpath : outfilePath, srid: srid[0]});
//                 console.log('got data');
//             });
//         }
//         catch(e) {
//             reject(e);
//         }
//     });
//
// }

function generateContour(infilePath, outfilePath, bands, interval, srid)   {
    return new Promise((resolve, reject) => {
        try {
            let process = spawn('python3', ['./QGISprocessing.py', "contour", infilePath, outfilePath, bands, interval]);
            process.stdout.on('data', (data) => {
                resolve({data: data, outpath : outfilePath, srid: srid[0]});
            });
        }
        catch(e) {
            reject(e);
        }
    });

}

function generateHillShade(inp, outp, srid)   {
    return new Promise((resolve, reject) => {
        try {
            let process = spawn('python3', ['./QGISprocessing.py', "hillshade", infilePath, outfilePath]);
            process.stdout.on('data', (data) => {
                resolve({data: data, outpath : outfilePath, srid:srid[0]});
            });
        }
        catch(e) {
            reject(e);
        }
    });
}

function generatePseudocolor(inp, outp, srid) {
    return new Promise((resolve, reject) => {
        try {
            let process = spawn('python3', ['./QGISprocessing.py', "psuedocolor", infilePath, outfilePath]);
            process.stdout.on('data', (data) => {
                resolve({data: data, outpath : outfilePath, srid:srid[0]});
            });
        }
        catch(e) {
            reject(e);
        }
    });
}


module.exports = {
    generateContour: generateContour,
    generateHillShade: generateHillShade,
    generatePseudocolor: generatePseudocolor,
    generateTiledContours: generateTiledContours
    // prepareContour : prepareContour
}
