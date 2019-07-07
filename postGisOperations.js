/**
  * @module postGisOperations Provides objects and methods to use a postGIS schema
*/

const sh = require('./useCommandLine').sh;
const convention = require('./convention');
const path = require('path');

/**
  * Class representing a database connection to Postgres server*
  * @class database
  * @type {Object}
  * @property {string} host - Host of the Postgres server
  * @property {number|string} port - Port of the Postgres server
  * @property {string} name - Name of database
  * @property {string} user - Username for Role in the database, used for authentication
  * @property {string} pwd - Password for Role in the database, used for authentication
*/
class database  {
    /**
     * Create an instance of connected Postgres database
     * @param {string} host - Host of the Postgres server
     * @param {number|string} port - Port of the Postgres server
     * @param {string} name - Name of database
     * @param {string} user - Username for Role in the database, used for authentication
     * @param {string} pwd - Password for Role in the database, used for authentication
     * @returns {database} The database connection made
    */
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
  * @type {Object}
  * @property {database} db - database to which schema belongs
  * @property {string} name - Name of the schema
*/
class schema    {
    /**
     * @param {database} db - database to which schema belongs
     * @param {name} name - Name of the schema
     * @returns {schema} The instance to represent the Schema
    */
    constructor(db, name='public')   {
        this.name = name;
        this.db = db;
        this.psqlCommand = 'PGPASSWORD=' + this.db.pwd + ' psql -U ' + this.db.user +  ' -h ' + this.db.host + ' -p ' + this.db.port + ' -d ' + this.db.name;
    }
}

// /**
//   * @typedef {Object} SQLoutput
//   * @property {string} stdout - The output given by SQL in case of success
// */
/**
  * Creates a PostGIS table for a vector feature
  * @name schema#sendFeatureToDB
  * @function
  * @returns {Promise<Object<string, string>>} The output of the SQL query
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

schema.prototype.runSqlFile = function(filePath)    {
    return sh(this.psqlCommand + ' -f ' + filePath);
}

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
