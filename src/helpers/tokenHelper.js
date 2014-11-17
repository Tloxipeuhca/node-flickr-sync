var    _ = require('lodash'), 
    path = require('path');

var token = null;
try {
  token = require(path.resolve('token.json'));
}
catch(e) { }

try {
  if (process.argv[3]) {
    var confToken = require(path.resolve(process.argv[3]));
    token = _.extend(token || {}, confToken);
  }
}
catch(e) {
  console.log('Your specific token file can\'t be loaded: ', e);
}

module.exports = token;