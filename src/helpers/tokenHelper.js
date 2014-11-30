var    _ = require('lodash'), 
appToken = require('../../app.json'),
    conf = require('./confHelper'),
      fs = require('fs'),
getToken = require('../lib/getToken'),
    path = require('path'),
 winston = require('winston');

module.exports.init = function(callback) {
  try {
    var tokenPath = path.resolve('token.json');
    if (process.argv[3]) {
      tokenPath = path.resolve(process.argv[3]);
    }

    if (fs.existsSync(tokenPath)) {
      return callback(null, require(tokenPath));
    }

    getToken(appToken, "delete", tokenPath, callback);  
  }
  catch(e) { 
    callback('Error while loading token file, '+e.toString());
  }
};