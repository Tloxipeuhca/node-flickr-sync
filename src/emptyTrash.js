var             _ = require('lodash'),
            async = require('async'),
             conf = require('./helpers/confHelper'),
       fileHelper = require('./helpers/fileHelper'),
           Flickr = require("flickrapi"), 
               fs = require('fs'),
      tokenHelper = require('./helpers/tokenHelper'),
             path = require('path'),
  photoSetManager = require('./lib/photoSetManager'),    
  uploadDirectory = require('./lib/uploadDirectory'),
          winston = require('winston');

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
  function(flickrApi, token, next) {
    winston.info('Empty the trash photoset \''+conf.photos.trashAlbumName+'\'');
    // Get all photosets
    flickrApi.photosets.getList({"user_id": token.user_id, "perpage": 100000}, function(error, result) {
      if (error) {
        return next(error);
      }
      next(null, flickrApi, result.photosets.photoset);
    });
  },
  function(flickrApi, photosets, next) {
    winston.debug('Photosets', JSON.stringify(photosets));
    var results = _.where(photosets, {'title': {'_content': conf.photos.trashAlbumName}});
    if (results.length === 0) {
      return next('Delete trash photoset \''+conf.photos.trashAlbumName+'\' doesn\'t exist');
    }
    photoSetManager.deletePhotoset(flickrApi, results[0], next);
  }
], function(error, result) {
  if (error) {
    return winston.error(error.toString());
  }
  winston.info("Good job");
});