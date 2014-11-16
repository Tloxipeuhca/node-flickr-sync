var      _ = require('lodash'),
    Flickr = require("flickrapi"),
        fs = require('fs');

var flickrOptions = {
  api_key: "9c9515c8996226d490da361705fe50ad",
  secret: "87e765b550d062d0",
  permissions: "delete"
};

// How to execute
// optional argv2 argv3
// node src/loadToken.js
// node src/loadToken.js C:\\Users\\yannick\\Desktop\\token.js delete

var Permissions = {
  "READ": { value: 0, name: "read", rules: ["read"]},
  "WRITE": { value: 1, name: "write", rules: ["read", "write"]},
  "DELETE": { value: 2, name: "delete", rules: ["read", "write", "delete"]}
}
flickrOptions = _.extend(flickrOptions, {permissions: getPermission(process.argv[3]).name})

Flickr.authenticate(flickrOptions, function(error, flickr) {
  var token = _.extend(flickr.options, {"force_auth": true});
  token = _.pick(token, "api_key", "secret", "user_id", "access_token", "access_token_secret", "force_auth");

  var pathUrl = process.argv[2] || "./token.json";
  fs.writeFile(pathUrl, JSON.stringify(token), function(error) {
    if (error) {
      return console.log("The token.json can't be created: "+error);
    } 
    console.log("The token.json file has been successfuly created. Path: "+pathUrl);
  });
});  

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