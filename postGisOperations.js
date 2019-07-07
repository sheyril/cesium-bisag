/**
  * This module contains classes to represent a PostgreSQL/PostGIS database and schema. It has various methods to communicate with schemas and update them
  * @module postGisOperations
*/

'use strict';
const sh = require('./useCommandLine').sh;
const convention = require('./convention');
const path = require('path');

/**
  * Class representing a database connection to Postgres server
  * @class database
  * @property {string} host - Host of the Postgres server
  * @property {number|string} port - Port of the Postgres server
  * @property {string} name - Name of database
  * @property {string} user - Username for Role in the database, used for authentication
  * @property {string} pwd - Password for Role in the database, used for authentication

  * @param {string} host - Host of the Postgres server
  * @param {number|string} port - Port of the Postgres server
  * @param {string} name - Name of database
  * @param {string} user - Username for Role in the database, used for authentication
  * @param {string} pwd - Password for Role in the database, used for authentication
*/
class database  {
    constructor( host, port, name, user, pwd)    {
        this.name = name;
        this.user = user;
        this.pwd = pwd;
        this.host = host;
        this.port = port;
    }
}

/**
  * Class representing a schema of a database connection
  * @class schema
  * @property {database} db - database to which schema belongs
  * @property {string} name - Name of the schema
  * @property {function} sendFeatureToDB - Creates a PostGIS table in the schema for the input feature
  * @param {database} db - database to which schema belongs
  * @param {name} name - Name of the schema
  * @returns {schema} The instance to represent the Schema
*/
class schema    {
    constructor(db, name='public')   {
        this.name = name;
        this.db = db;
        this.psqlCommand = 'PGPASSWORD=' + this.db.pwd + ' psql -U ' + this.db.user +  ' -h ' + this.db.host + ' -p ' + this.db.port + ' -d ' + this.db.name;
    }
}

/**
  * Creates a PostGIS table for a vector feature
  * @method
  * @param {string} shapeFilePath - Path to the input shapeFile to be added
  * @param {string} shapeFileName - Name of the table that would store the shapefile. Essentially the name of the shapefile hereafter
  * @param {string} srid            SRS of shapefile
  * @returns {Promise<{stdout: string, stderr: string}>} - The output of the SQL query
*/
schema.prototype.sendFeatureToDB = function(shapeFilePath, shapeFileName, SRID='EPSG:4326')  {
    return new Promise((resolve, reject) => {
        spCom = 'shp2pgsql -I ' + ' -s ' + SRID + ' ' + shapeFilePath + ' ' + this.name + '.' +shapeFileName;
        sh(spCom + ' | ' + this.psqlCommand)
            .then(value => {
                if(value.stdout === '' && value.stderr !== '')  {
                    reject(value);
                }
                else {
                    resolve(value);
                }
            })
            .catch(err => {
                reject(err);
            })
    });
}

/**
  * Runs a SQL file with SQL code in the PostgreSQL schema
  * @method
  * @param {string} filePath - Path of the SQL file that contains SQL code to be run
  * @returns {Promise<{stdout: string, stderr: string}>}
*/
schema.prototype.runSqlFile = function(filePath)    {
    return sh(this.psqlCommand + ' -f ' + filePath);
}

/**
  * Deletes a Feature from PostGIS schema
  * @method
  * @param {string} fileNameInTable - The name of the table to be dropped. Normally it is the same as the name of the table
  * @returns {Promise<{stdout: string, stderr: string}>}
*/
schema.prototype.deleteFeature = function(fileNameInTable) {
    return new Promise((resolve, reject) => {
        str = "DROP TABLE IF EXISTS " + this.name + '.' + fileNameInTable;
        sh("echo " + str + "> " + path.join(convention.sqlPrepared ,"temp.sql"))
            .then(value => {
                return sh(this.psqlCommand + ' -f ' + path.join(convention.sqlPrepared, temp.sql));
            })
            .then(value => {
                if(value.stdout === '' && value.stderr !== '')  {
                    reject(value);
                }
                else {
                    resolve(value);
                }
            })
            .catch(err => {
                reject(err);
            });

    });
}

module.exports = {
    database : database,
    schema : schema
}
