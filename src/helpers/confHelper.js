var    _ = require('lodash'), 
    conf = require('../../conf.json'),
    path = require('path'),
 winston = require('winston');

try {
  if (process.argv[2]) {
    var photosConf = require(path.resolve(process.argv[2]));
    _.extend(conf.photos, photosConf);
  }   
}
catch(e) {
  console.log('Your specific config file can\'t be loaded: ', e);
}

// Init winston for log
if (conf.winston) {
  winston.remove(winston.transports.Console);
  if (conf.winston.console) {
    winston.add(winston.transports.Console, conf.winston.console);
  }
  if (conf.winston.file) {
    winston.add(winston.transports.File, conf.winston.file);
  }
} 

module.exports = conf;