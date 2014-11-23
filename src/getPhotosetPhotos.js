var             _ = require('lodash'),
         appToken = require('../app.json'),
            async = require('async'),
             conf = require('./helpers/confHelper'),
       fileHelper = require('./helpers/fileHelper'),
           Flickr = require("flickrapi"), 
               fs = require('fs'),
getPhotosetPhotos = require('./lib/getPhotosetPhotos'),
         getToken = require('./lib/getToken'),
             path = require('path'),
          winston = require('winston');

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

/*if (process.argv.length < 3) {
  return winston.warn("You must specify the photosetId.")
}  */

var photosetId = '72157648985206250';

var _Flickr = null;
async.waterfall([
  function(next) {
    // load token

    var token = require('./helpers/tokenHelper');
    if(token) {
      return next(null, token);
    }
    else {
      getToken(appToken, "delete", process.argv[3] || './token.json', function(error, token, tokenPath) {
        if (error) {
          return next(error);
        }
        delete require.cache[require.resolve('./helpers/tokenHelper')];
        return next(null, token);
      });
    }
  },
  function(token, next) {
    // Get flickrToken
    Flickr.authenticate(token, function(error, flickr) {
      next(error, flickr, token);
    });
  },
  function(flickr, token, next) {
    winston.info(token);
    getPhotosetPhotos(flickr, photosetId, next);
  }
], function(error, result) {
  if (error) {
    return winston.error(error.toString());
  }
  winston.info("Good job", JSON.stringify(result));
});