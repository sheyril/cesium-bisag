const sh = require('./useCommandLine').sh;
const convention = require('./convention');
const path = require('path');

class database  {
    constructor( host, port, name, user, pwd)    {
        this.name = name;
        this.user = user;
        this.pwd = pwd;
        this.host = host;
        this.port = port;
    }
}

class schema    {
    constructor(db, name='public')   {
        this.name = name;
        this.db = db;
        this.psqlCommand = 'PGPASSWORD=' + this.db.pwd + ' psql -U ' + this.db.user +  ' -h ' + this.db.host + ' -p ' + this.db.port + ' -d ' + this.db.name;
    }
}

schema.prototype.sendFeatureToDB = async function(shapeFilePath, shapeFileName, SRID='EPSG:4326')  {
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
                return sh(this.psqlCommand + ' -f temp.sql');
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
