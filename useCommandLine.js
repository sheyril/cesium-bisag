let exec = require('child_process').exec;

exports.sh = function(cmd) {
    return new Promise(function(resolve, reject)    {
        exec(cmd, (err, stdout, stderr) => {
            if(err) {
                reject(err);
            }
            else {
                resolve({stdout: stdout, sdtderr: stderr});
            }
        });
    });
}
