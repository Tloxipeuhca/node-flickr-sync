var    _ = require('lodash'), 
    conf = require('../../conf.json'),
    path = require('path');

try {
  if (process.argv[2]) {
    var photosConf = require(path.resolve(process.argv[2]));
    conf = _.extend(conf.photos, photosConf);
  }
}
catch(e) {
  console.log('Your specific config file can\'t be loaded: ', e);
}

module.exports = conf;