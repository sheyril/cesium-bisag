//Complete
let exec = require('child_process').exec;
const rimraf = require('rimraf');
const path = require('path');

function sh (cmd) {
    return new Promise(function(resolve, reject)    {
        console.log(cmd);
        exec(cmd, (err, stdout, stderr) => {
            if(err) {
                reject(err);
            }
            else {
                resolve({stdout:stdout, stderr:stderr});
            }
        });
    });
}

// NOTE: Clears the whole tile directory first and then runs gdal_retile
function gdalRetile(infilepath, layerName, targetDir, levels='2', srid='EPSG:4326', tileDim='1024')	{
	return new Promise((resolve, reject) => {
		rimraf(path.join(targetDir, '*'), (err, data) => {
            sh('gdal_retile.py -r bilinear -co "TFW=YES" -ps ' + tileDim + ' ' + tileDim + ' -s_srs ' + srid + ' -of GTiff -ot Byte -levels ' + levels + ' -targetDir ' + targetDir + ' ' + infilepath)
                .then(value => {
                    resolve({layerName: layerName, tilesDirectory : targetDir});
                    console.log('done retiling');
                })
                .catch(err => {
                    // console.log(err);
                    reject(err);
                });
        });
	});
}


module.exports = {
    sh : sh,
    gdalRetile : gdalRetile
}
