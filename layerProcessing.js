'use strict';

const QGIS = require('./QGIS');
const postGisOperations = require('./postGisOperations');
const geoserverRequests = require('./geoserverRequests');
const convention = require('./convention');
const path = require('path');
const fs = require('fs');

function prepareTiledContours(inputLayerPath, outputFolder, layerName, srid, bands, intervals) {
    return new Promise((resolve, reject)  => {
        
    });
}

function publishContourAfterGenerating(filename, bands, interval, geoserverConnectionObj)  {
    return new Promise((resolve, reject) => {
        let rasterPath, vectorPath;
        geoserverConnectionObj.getMapWMS(filename)
            .then((value) => {
                rasterPath = value.outpath;
                return QGIS.generateContour(value.outpath, path.resolve(convention.folderContours, path.basename(value.outpath, '.tif') + '.shp'), bands, interval, value.srid);
            })
            .then(value => {
                vectorPath = value.outpath;
                return geoserverConnectionObj.publishFeature(value.outpath, path.basename(value.outpath, '.shp'), value.srid, convention.geoserverContoursWorkspace, convention.datastore);
            })
            .then(value => {
                return deleteFileFromSystem(rasterPath);
            })
            .then(value => {
                resolve({vectorPath: vectorPath, rasterPath: rasterPath});
            })
            .catch(err => {
                reject(err);
            });
    });
}

function deleteFileFromSystem(filepath) {
    return new Promise((resolve, reject) =>  {
        fs.unlink(path.resolve(filepath), (err) => {
            if(err)
                reject(err);
            else    {
                resolve({outpath : filepath});
            }
        });
    });
}


function deleteVectorFromSystem(filepath)   {
    // console.log(filepath);
    return new Promise((resolve, reject) => {
        try {
            filepath = path.resolve(convention.folderContours, path.basename(filepath, '.shp'));
            deleteFileFromSystem(filepath + '.shp')
                .then(val => {
                    resolve({outpath : path.basename(filepath)});
                })
                .catch(err => {
                    if(err.errno !== -2)    {
                        throw err;
                        //file found but could not delete
                    }
                });
            deleteFileFromSystem(filepath + '.dbf')
                .then(val => {})
                .catch(err => {
                    if(err.errno !== -2)    {
                        throw err;
                        //file found but could not delete
                    }
                });
            deleteFileFromSystem(filepath + '.prj')
                .then(val => {})
                .catch(err => {
                    if(err.errno !== -2)    {
                        throw err;
                        //file found but could not delete
                    }
                });
            deleteFileFromSystem(filepath + '.shx')
                .then(val => {})
                .catch(err => {
                    if(err.errno !== -2)    {
                        throw err;
                        //file found but could not delete
                    }
            });
        }
        catch(e) {
            reject(e);
        }
    })

}

module.exports = {
    deleteVectorFromSystem : deleteVectorFromSystem,
    publishContourAfterGenerating : publishContourAfterGenerating
};
