'use strict';

const QGIS = require('./QGIS');
const postGisOperations = require('./postGisOperations');
const geoserverRequests = require('./geoserverRequests');
const convention = require('./convention');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const sh = require('./useCommandLine').sh;

class sqlError extends Error {}

//Creates a workspace of the name of the layer, creates a schema, creates a meta table in the schema of the same name as schema
//the name of scehma and meta table is the name of the layer in config file after convention is applied to normalize for postgis
//a postgis datastore is added to the namespace
//Has Problems inserting 1000 interval contours
//Publishing done
//Returns a promise when all layers are made and published

async function addTiledContoursToExistingTable(jsonLayerFile, geoserverConnectionObj)    {
    let jsonLayerObject;
    let data = fs.readFileSync(jsonLayerFile, 'utf-8');
    jsonLayerObject = JSON.parse(data);
    jsonLayerObject.layer.layerName = convention.layerNameConvention(jsonLayerObject.layer.layerName);

    try {
        await QGIS.generateTiledContours(jsonLayerFile);
        console.log('generated Tiled Contours for : ', jsonLayerObject.layer.layerName);
        console.log('preparing insertions file');
        value = await PrepareInsertionsForMetaTable(jsonLayerObject);
        tableInfoJsonObject = value.tableInfoJsonObject;
        console.log('insertion file created');
        console.log('inserting into table');
        sqlOutput = await geoserverConnectionObj.schema.runSqlFile(value.filepath);
        console.log('All insertions in meta table done, OK');

        let publishedResp = await publishTiledContours(jsonLayerObject, tableInfoJsonObject, geoserverConnectionObj);
        if(publishedResp.statusCode >= 300 || publishedResp.statusCode < 200)
            throw new Error('could not publish features to workspace : ' + jsonLayerObject.layer.layerName);
        await checkRowsOfEachTileAndTrim(jsonLayerObject, tableInfoJsonObject, geoserverConnectionObj);
    }
    catch(e) {
        console.log('could not generate tiled contours');
        throw e;
    }
}

async function prepareTiledContours(jsonLayerFile, geoObject, db)   {
    let jsonLayerObject;
    let data = fs.readFileSync(jsonLayerFile, 'utf-8');
    jsonLayerObject = JSON.parse(data);
    jsonLayerObject.layer.layerName = convention.layerNameConvention(jsonLayerObject.layer.layerName);
    fs.writeFileSync(jsonLayerFile, JSON.stringify(jsonLayerObject));
    let schema = new postGisOperations.schema(db, jsonLayerObject.layer.layerName);
    let geoserverConnectionObj = new geoserverRequests.geoserverConnection(geoObject.baseHostName, geoObject.user, geoObject.pwd, schema);

    let value, tableInfoJsonObject, sqlOutput;

    try {
        value = await createMetaTable(jsonLayerObject, geoserverConnectionObj);
        if(value.sqlOutput.stderr !== '' && value.sqlOutput.stdout === '') {
            //if table is created already it cant be created again
            console.log(value.sqlOutput);
            throw new sqlError('could not create schema and meta tables');
        }
    } catch (e) {
        throw e;
    }

    try {
        let namespaceResp =  await geoserverConnectionObj.addNamespace(jsonLayerObject.layer.layerName);
        if(namespaceResp.statusCode >= 300 || namespaceResp.statusCode < 200)
            throw new Error('could not create namespace ' + jsonLayerObject.layer.layerName);
    }
    catch (e) {
        console.log('error: could not add namespace, rolling back');
        let str = "DROP SCHEMA IF EXISTS " + jsonLayerObject.layer.layerName + ' CASCADE';
        await sh("echo \"" + str + "\" > " + path.join(convention.sqlPrepared ,"temp.sql"))
        await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared ,"temp.sql"));
        throw e;
    }

    try {
        let datastoreResp = await geoserverConnectionObj.addPostgisDatastore(jsonLayerObject.layer.layerName, jsonLayerObject.layer.layerName)
        if(datastoreResp >= 300 || datastoreResp < 200)
            throw new Error('coud not create datastore ' + jsonLayerObject.layer.layerName);
    } catch (e) {
        console.log('error: could create postgis datastore, rolling back');
        await geoserverConnectionObj.deleteNamespace(jsonLayerObject.layer.layerName);
        let str = "DROP SCHEMA IF EXISTS " + jsonLayerObject.layer.layerName + ' CASCADE';
        await sh("echo \"" + str + "\" > " + path.join(convention.sqlPrepared ,"temp.sql"))
        await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared ,"temp.sql"));
        throw e;
    }

    try {
        await QGIS.generateTiledContours(jsonLayerFile);
        console.log('generated Tiled Contours for : ', jsonLayerObject.layer.layerName);
    }
    catch (e) {
        console.log('could not generate tiled contours, rolling back');
        await geoserverConnectionObj.deleteDataStoreRecursively(jsonLayerObject.layer.layerName, jsonLayerObject.layer.layerName);
        await geoserverConnectionObj.deleteNamespace(jsonLayerObject.layer.layerName);
        let str = "DROP SCHEMA IF EXISTS " + jsonLayerObject.layer.layerName + ' CASCADE';
        await sh("echo \"" + str + "\" > " + path.join(convention.sqlPrepared ,"temp.sql"))
        await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared ,"temp.sql"));
        rimraf(path.join(jsonLayerObject.layer.outLayerDirectoryPath, '*'), (err ,data) => {
            if(err) {
                throw new Error('error: could not clean tiles folder, check ' + jsonLayerObject.layer.outLayerDirectoryPath + ' folder and remove the unnnecessary files to avoid clogging the system');
            }
        })
        throw e;
    }

    try {
        value = await PrepareInsertionsForMetaTable(jsonLayerObject);
        tableInfoJsonObject = value.tableInfoJsonObject;
    } catch (e) {
        console.log('could not create insertion files, rolling back');
        await geoserverConnectionObj.deleteDataStoreRecursively(jsonLayerObject.laer.layerName, jsonLayerObject.layer.layerName);
        await geoserverConnectionObj.deleteNamespace(jsonLayerObject.layer.layerName);
        let str = "DROP SCHEMA IF EXISTS " + jsonLayerObject.layer.layerName + ' CASCADE';
        await sh("echo \"" + str + "\" > " + path.join(convention.sqlPrepared ,"temp.sql"))
        await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared ,"temp.sql"));
        rimraf(path.join(jsonLayerObject.layer.outLayerDirectoryPath, '*'), (err ,data) => {
            if(err) {
                throw new Error('error: could not clean tiles folder, check ' + jsonLayerObject.layer.outLayerDirectoryPath + ' folder and remove the unnnecessary files to avoid clogging the system');
            }
        })
        throw e;
    }

    try {
        sqlOutput = await geoserverConnectionObj.schema.runSqlFile(value.filepath);
        console.log('All insertions done, OK');
    } catch (e) {
        console.log('error: could not complete insertions, dropping schema');
        let str = "DROP SCHEMA IF EXISTS " + jsonLayerObject.layer.layerName + ' CASCADE';
        await sh("echo \"" + str + "\" > " + path.join(convention.sqlPrepared ,"temp.sql"))
        await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared ,"temp.sql"));
        rimraf(path.join(jsonLayerObject.layer.outLayerDirectoryPath, '*'), (err ,data) => {
            if(err) {
                throw new Error('error: could not clean tiles folder, check ' + jsonLayerObject.layer.outLayerDirectoryPath + ' folder and remove the unnnecessary files to avoid clogging the system');
            }
        })
        throw e;
    }

    //Cut the tables with 0 rows from the meta table and the schema

    try {
        let publishedResp = await publishTiledContours(jsonLayerObject, tableInfoJsonObject, geoserverConnectionObj);
        if(publishedResp.statusCode >= 300 || publishedResp.statusCode < 200)
            throw new Error('could not publish features to workspace : ' + jsonLayerObject.layer.layerName);
    } catch (e) {
        await geoserverConnectionObj.deleteDataStoreRecursively(jsonLayerObject.layer.layerName, jsonLayerObject.layer.layerName);
        await geoserverConnectionObj.deleteNamespace(jsonLayerObject.layer.layerName);
        console.log('error: could create postgis datastore, rolling back');
        let str = "DROP SCHEMA IF EXISTS " + jsonLayerObject.layer.layerName + ' CASCADE';
        await sh("echo \"" + str + "\" > " + path.join(convention.sqlPrepared ,"temp.sql"))
        await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared ,"temp.sql"));
        throw e;
    }

    try {
        await checkRowsOfEachTileAndTrim(jsonLayerObject, tableInfoJsonObject, geoserverConnectionObj);
    } catch (e) {
        console.log(e);
        console.log('could not eliminate redundant rows, continuing. It is recommended to redo the elimination using checkRowsOfEachTileAndTrim function (do delete the workspace from geoserver and republish the tables)');
    }

    finally {
        //clean the tiles folder
        rimraf(path.join(jsonLayerObject.layer.outLayerDirectoryPath, '*'), (err ,data) => {
            if(err) {
                throw new Error('error: could not clean tiles folder, check ' + jsonLayerObject.layer.outLayerDirectoryPath + ' folder and remove the unnnecessary files to avoid clogging the system');
            }
        })
    }
}

async function deleteTiledContours(jsonLayerFile, geoObject)    {
    let jsonLayerObject;
    let data = fs.readFileSync(jsonLayerFile, 'utf-8');
    jsonLayerObject = JSON.parse(data);
    jsonLayerObject.layer.layerName = convention.layerNameConvention(jsonLayerObject.layer.layerName);
    try {
        await geoObject.deleteDataStoreRecursively(jsonLayerObject.layer.layerName, jsonLayerObject.layer.layerName);
        await geoObject.deleteNamespace(jsonLayerObject.layer.layerName);
        let str = "DROP SCHEMA IF EXISTS " + jsonLayerObject.layer.layerName + ' CASCADE';
        await sh("echo \"" + str + "\" > " + path.join(convention.sqlPrepared ,"temp.sql"))
        await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared ,"temp.sql"));
    } catch (e) {
        throw e;
    }
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
                    let script = fs.readFileSync(path.join(convention.sqlTemplates, 'addToContourMetaTableTemplate.sql'), 'utf-8');
                    let nameArr = path.basename(file, '.shp').split('_');
                    script = script.replace('ZOOM__LEVEL', nameArr[1]);
                    script = script.replace('INTERVAL__LENGTH', nameArr[2]);
                    script = script.replace('MIN__X', nameArr[3]);
                    script = script.replace('MAX__X', nameArr[4]);
                    script = script.replace('MIN__Y', nameArr[5]);
                    script = script.replace('MAX__Y', nameArr[6]);
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
            fs.writeFileSync(path.join(convention.sqlPrepared, 'addToMeta.sql'), data);
            console.log('Created Insertion into meta table files');
            resolve({jsonLayerObject : jsonLayerObject, filepath: path.join(convention.sqlPrepared, 'addToMeta.sql'), tableInfoJsonObject: tableInfoJsonObject});
        });
    });
}

async function checkRowsOfEachTileAndTrim(jsonLayerObject, tableInfoJsonObject, geoObject)   {
    let layers = tableInfoJsonObject.layers;
    console.log(layers.length);
    console.log('inside trimming');
    for(let i=0; i<layers.length; i++) {
        let script = '';
        script = fs.readFileSync(path.join(convention.sqlTemplates, 'getCountOfTable.sql'), 'utf-8');
        script = script.replace('schema__name', jsonLayerObject.layer.layerName);
        script = script.replace('table__name', layers[i].layerName);
        fs.writeFileSync(path.join(convention.sqlPrepared, 'getCountOfTable.sql'), script);
        let value = await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared, 'getCountOfTable.sql'));
        if(value.stdout !== null)   {
            let sqlOutput = value.stdout.split('\n')[2].split(' ');
            if('0123456789'.indexOf(sqlOutput[sqlOutput.length-1]) !== -1)  {
                //if the last value is a number, ie valid count
                if(parseInt(sqlOutput[sqlOutput.length-1]) === 0)   {
                    //now trim this row
                    script = fs.readFileSync(path.join(convention.sqlTemplates, 'cutTablesInMeta.sql'), 'utf-8');
                    // console.log(script);
                    script = script.replace('schema__name', jsonLayerObject.layer.layerName);
                    script = script.replace('schema__name', jsonLayerObject.layer.layerName);
                    script = script.replace('table__name', jsonLayerObject.layer.layerName);
                    script = script.replace('layer__name', layers[i].layerName);
                    script = script.replace('layer__name', layers[i].layerName);
                    fs.writeFileSync(path.join(convention.sqlPrepared, 'cutTablesInMeta.sql'), script);
                    console.log('deleting: ', layers[i].layerName);
                    await geoObject.deleteFeature(jsonLayerObject.layer.layerName + ':' + layers[i].layerName);
                    let opt = await geoObject.schema.runSqlFile(path.join(convention.sqlPrepared, 'cutTablesInMeta.sql'));
                    console.log(opt);
                }
            }
        }
    }
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
        fs.readFile(path.join(convention.sqlTemplates,'/CreateContourMetaTableTemplate.sql') , 'utf-8', (err, script) => {
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__layername__', layer.layerName);
            script = script.replace('__indexname__', 'ix_'+layer.layerName);
            fs.writeFileSync(path.join(convention.sqlPrepared,'createmetaForVector.sql'), script);
            geoserverConnectionObj.schema.runSqlFile(path.join(convention.sqlPrepared, 'createmetaForVector.sql'))
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
    prepareTiledContours : prepareTiledContours,
    deleteTiledContours : deleteTiledContours
};
