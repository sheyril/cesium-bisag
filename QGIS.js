const spawn = require('child_process').spawn;

function generateTiledContours()    {

}

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
    generatePseudocolor: generatePseudocolor
}
