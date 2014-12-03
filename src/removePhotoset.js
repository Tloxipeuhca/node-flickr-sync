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

// How to execute
// arguments
//   argv2 path to photos conf json file
//   argv3 path to token json file
//   argv4 photoset name
// scripts
//   node src/removePhotoset.js conf.json token.json photosetName

if (!process.argv[4]) {
  return winston.warn('Remove photoset, photoset name is undefined');
}
if (_.contains(_.pluck(conf.photos.trash, 'name'), process.argv[4])) {
  return winston.warn('Remove photoset, you can\'t remove these pohotosets', JSON.stringify(_.pluck(conf.photos.trash, , 'name')));
}

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
    winston.info('Remove photoset by name '+process.argv[4]);
    // Get all photosets
    flickrApi.photosets.getList({"user_id": token.user_id, "perpage": 100000}, function(error, result) {
      if (error) {
        return next(error);
      }
      next(null, flickrApi, result.photosets.photoset);
    });
  },
  function(flickrApi, photosets, next) {
    winston.debug('Remove photosets content', JSON.stringify(photosets));
    var results = _.where(photosets, {'title': {'_content': process.argv[4]}});
    if (results.length === 0) {
      return next('Remove photoset, \''+process.argv[4]+'\' doesn\'t exist');
    }
    photoSetManager.removePhotoset(flickrApi, results[0], next);
  }
], function(error, result) {
  if (error) {
    return winston.error(error.toString());
  }
  winston.info("Good job");
});