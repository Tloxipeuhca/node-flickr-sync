var      _ = require('lodash'),
     async = require('async'),
    Flickr = require("flickrapi"),
        fs = require('fs');

var Permissions = {
  "READ": { value: 0, name: "read", rules: ["read"]},
  "WRITE": { value: 1, name: "write", rules: ["read", "write"]},
  "DELETE": { value: 2, name: "delete", rules: ["read", "write", "delete"]}
}

var getToken = module.exports = function(appConf, permissionName, tokenPath, callback) {
  async.waterfall([
    function(next) {  
      Flickr.authenticate(_.extend(appConf, {permissions: getPermission(permissionName).name}), function(error, flickr) {
        if (error) {
          return next(error);
        }
        var token = _.extend(flickr.options, {"force_auth": true});
        return next(null, _.pick(token, "api_key", "secret", "user_id", "access_token", "access_token_secret", "force_auth"));
      });
    },
    function(token, next) { 
      fs.writeFile(tokenPath, JSON.stringify(token), function(error, result) {
        next(error, token);
      });
    }
  ], callback); 
};

function getPermission(name) {
  var permission = getEnumByKey(Permissions, 'name', name);
  return permission || Permissions.DELETE;
}

function getEnumByKey(enumName, keyName, keyValue) {
  var enumObject = null;
  for(key in enumName) {
    if (enumName[key][keyName] === keyValue) {
      enumObject = enumName[key]
    }
  }
  return enumObject;
}