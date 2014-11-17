var    _ = require('lodash'), 
    path = require('path');

var token = {};
try {
  token = require('../../token.json');
}
catch(e) {}

try {
  if (process.argv[3]) {
    var confToken = require(path.resolve(process.argv[3]));
    conf = _.extend(token, confToken);
  }
}
catch(e) {
  console.log('Your specific token file can\'t be loaded: ', e);
}

module.exports = token;