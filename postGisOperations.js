const sh = require('./useCommandLine').sh;
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

schema.prototype.sendFeatureToDB = function(shapeFilePath, shapeFileName, SRID='EPSG:4326')  {
    spCom = 'shp2pgsql -I ' + ' -s ' + SRID + ' ' + shapeFilePath + ' ' + this.name + '.' +shapeFileName;
    return sh(spCom + ' | ' + this.psqlCommand);
}

schema.prototype.deleteFeature = function(fileNameInTable) {

    return new Promise((resolve, reject) => {
        str = "DROP TABLE IF EXISTS " + this.name + '.' + fileNameInTable;
        sh("echo " + str + ">temp.sql")
            .then((val1, val2) => {
                resolve(sh(this.psqlCommand + ' -f temp.sql'));
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
