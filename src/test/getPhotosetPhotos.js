var             _ = require('lodash'),
            async = require('async'),
             conf = require('./helpers/confHelper'),
       fileHelper = require('./helpers/fileHelper'),
           Flickr = require("flickrapi"), 
               fs = require('fs'),
getPhotosetPhotos = require('./lib/getPhotosetPhotos'),
      tokenHelper = require('./helpers/tokenHelper'),
             path = require('path'),
          winston = require('winston');

var photosetId = '72157648985206250';

async.waterfall([
  function(next) {
    tokenHelper.init(next);
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