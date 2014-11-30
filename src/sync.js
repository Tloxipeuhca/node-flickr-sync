var             _ = require('lodash'),
            async = require('async'),
             conf = require('./helpers/confHelper'),
       fileHelper = require('./helpers/fileHelper'),
           Flickr = require("flickrapi"), 
               fs = require('fs'),
      tokenHelper = require('./helpers/tokenHelper'),
             path = require('path'),
  uploadDirectory = require('./lib/uploadDirectory'),
          winston = require('winston');

// How to execute
// arguments
//   optional argv2, argv3, argv4
//   argv2 path to photos conf json file
//   argv3 path to token json file
// scripts
//   node src/sync.js
//   node src/sync.js argConf.json
//   node src/sync.js argConf.json argToken.json

var _Flickr = null;
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
    // Get all photosets
    _Flickr = flickr;
    _Flickr.photosets.getList({"user_id": token.user_id, "perpage": 100000}, function(error, result) {
      if (error) {
        return next(error);
      }
      next(null, result.photosets);
    });
  },
  function(photosets, next) {
    // Get directories to sync
    var photosPath = path.resolve(conf.photos.path);
    winston.debug('Photosets', JSON.stringify(photosets));
    winston.debug('Directory path to sync', photosPath);
    if (!fs.existsSync(photosPath)) {
      return next('Dircectory path to sync doesn\'t exist: '+photosPath)
    }
    var directories = fileHelper.getDirectories(photosPath);
    // Function to exclude directories to sync
    directories = fileHelper.applyExclusionRules(directories);
    winston.debug(directories.length + ' directories to sync', JSON.stringify(directories));
    var tasks = [];
    _.each(directories, function(directory, parallelCallback) {
      tasks.push(
        function(parallelCallback) {
          uploadDirectory(_Flickr, directory, photosets, parallelCallback);
        }
      );
    });
    async.parallelLimit(tasks, conf.photos.parallelUploadDirectories, next); 
  }
], function(error, result) {
  if (error) {
    return winston.error(error.toString());
  }
  winston.info("Good job");
});