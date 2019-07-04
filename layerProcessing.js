'use strict';

const QGIS = require('./QGIS');
const postGisOperations = require('./postGisOperations');
const geoserverRequests = require('./geoserverRequests');
const convention = require('./convention');
const path = require('path');
const fs = require('fs');


//Creates a workspace of the name of the layer, creates a schema, creates a meta table in the schema of the same name as schema
//the name of scehma and meta table is the name of the layer in config file after convention is applied to normalize for postgis
//a postgis datastore is added to the namespace
//Has Problems inserting 1000 interval contours
//Publishing done
//Returns a promise when all layers are made and published
function prepareTiledContours(jsonLayerFile, geoObject, db) {

    return new Promise((resolve, reject)  => {
        let myJsonLayerObject;
        let data = fs.readFileSync(jsonLayerFile, 'utf-8');
        myJsonLayerObject = JSON.parse(data);
        myJsonLayerObject.layer.layerName = convention.layerNameConvention(myJsonLayerObject.layer.layerName);

        let schema = new postGisOperations.schema(db, myJsonLayerObject.layer.layerName);
        let geoserverConnectionObj = new geoserverRequests.geoserverConnection(geoObject.baseHostName, geoObject.user, geoObject.pwd, schema);

        QGIS.generateTiledContours(jsonLayerFile)
            .then(jsonLayerObject => {
                jsonLayerObject.layer.layerName = convention.layerNameConvention(jsonLayerObject.layer.layerName);
                myJsonLayerObject = jsonLayerObject;
                
                console.log(myJsonLayerObject);
                console.log('creating all meta tables', new Date());
                // console.log(new Date());
                return createMetaTable(jsonLayerObject, geoserverConnectionObj);
            })
            .then(value => {
                if(value.sqlOutput.stderr !== '' && value.sqlOutput.stdout === '') {
                    //if table is created already it cant be created again
                    console.log(value.sqlOutput);
                    return Promise.reject(value.sqlOutput);
                }
                else {
                    console.log('before insertions', new Date());
                    return PrepareInsertionsForMetaTable(value.jsonLayerObject);
                }
            })
            .then(value => {
                // console.log(value.tableInfoJsonObject);
                console.log('inserting all records in all meta tables');
                // console.log('in insertion then: ', value.jsonLayerObject);
                return {sqlOutput: geoserverConnectionObj.schema.runSqlFile(value.filepath),  jsonLayerObject: value.jsonLayerObject, tableInfoJsonObject:value.tableInfoJsonObject};
            })
            .then(value => {
                console.log('insertion done. OK');
                return( {namespaceResp: geoserverConnectionObj.addNamespace(value.jsonLayerObject.layer.layerName), tableInfoJsonObject:value.tableInfoJsonObject, jsonLayerObject: value.jsonLayerObject});
            })
            .then(value => {
                console.log('made namespace: ', value.jsonLayerObject.layerName);
                return( {datastoreResp: geoserverConnectionObj.addPostgisDatastore(value.jsonLayerObject.layer.layerName, value.jsonLayerObject.layer.layerName), tableInfoJsonObject:value.tableInfoJsonObject, jsonLayerObject: value.jsonLayerObject } );
            })
            .then(value => {
                console.log('publishing all features');
                return {publishedReturn: publishTiledContours(value.jsonLayerObject, value.tableInfoJsonObject, geoserverConnectionObj), jsonLayerObject : value.jsonLayerObject, tableInfoJsonObject : value.tableInfoJsonObject};
            })
            .then(value => {
                console.log(value);
            })
            .catch(err => {
                console.log(err);
            })
    });
}


function PrepareInsertionsForMetaTable(jsonLayerObject)    {
    return new Promise((resolve, reject) => {
        let data = '';
        let jsonData = {};
        let tableInfoJsonObject = {layers: []};

        let layer = jsonLayerObject.layer;
        let tiledTableName;

        console.log('in insertions ', new Date());
        fs.readdir(layer.outLayerDirectoryPath, (err, files) => {
            let count = 0;
            let j;
            let layers = [];
            for(j=0; j<files.length; j++)   {
                let file = files[j];
                if(path.extname(file) === '.shp')   {
                    let script = fs.readFileSync('./sqlscripts/addToContourMetaTableTemplate.sql', 'utf-8');
                    let nameArr = path.basename(file, '.shp').split('_');
                    script = script.replace('INTERVAL__LENGTH', nameArr[1]);
                    script = script.replace('MIN__X', nameArr[2]);
                    script = script.replace('MAX__X', nameArr[3]);
                    script = script.replace('MIN__Y', nameArr[4]);
                    script = script.replace('MAX__Y', nameArr[5]);
                    script = script.replace('__layername__', layer.layerName);
                    script = script.replace('__layername__', layer.layerName);
                    tiledTableName = layer.layerName + '_' + count ;
                    script = script.replace('TILED__NAME', '\'' + tiledTableName + '\'');
                    data += script;
                    layers.push({layerName:tiledTableName, filepath:path.join(layer.outLayerDirectoryPath, file)});
                    count++;
                }
            }
            tableInfoJsonObject.layers = layers;
            fs.writeFileSync('./sqlscripts/addToMeta.sql', data);
            console.log('Created Insertion into meta table files');
            resolve({jsonLayerObject : jsonLayerObject, filepath:'./sqlscripts/addToMeta.sql', tableInfoJsonObject: tableInfoJsonObject});
        });
    });
}

function publishTiledContours(jsonLayerObject, tableInfoJsonObject, geoserverConnectionObj)  {
    return new Promise((resolve, reject) => {
        let layers = tableInfoJsonObject.layers;
        console.log(jsonLayerObject, layers);
        for(let i=0; i<layers.length; i++)  {
            geoserverConnectionObj.publishFeature(layers[i].filepath, layers[i].layerName, jsonLayerObject.layer.srid, jsonLayerObject.layer.layerName, jsonLayerObject.layer.layerName)
                .then(value => {
                    if(i === layers.length-1)   {
                        console.log('publised all feature tiles to geoserver');
                        resolve(value);
                    }
                })
                .catch(err => {
                    reject(err);
                })
        }
    });
}

function createMetaTable(jsonLayerObject, geoserverConnectionObj)    {
    return new Promise((resolve, reject) => {
        let layer = jsonLayerObject.layer;
        fs.readFile('./sqlscripts/CreateContourMetaTableTemplate.sql', 'utf-8', (err, script) => {
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__indexname__', 'ix_'+layer.layerName);
            fs.writeFileSync('./sqlscripts/createmeta.sql', script);
            geoserverConnectionObj.schema.runSqlFile('./sqlscripts/createmeta.sql')
                .then(value => {
                    console.log(value);
                    resolve({jsonLayerObject : jsonLayerObject, sqlOutput : value});
                })
                .catch(err => {
                    console.log(err);
                    reject(err);
                });
        });
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
    publishContourAfterGenerating : publishContourAfterGenerating,
    prepareTiledContours : prepareTiledContours
};
