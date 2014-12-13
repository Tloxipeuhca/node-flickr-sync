var             _ = require('lodash'),
            async = require('async'),
             conf = require('./helpers/confHelper'),
downloadDirectory = require('./lib/downloadDirectory'),
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
      next(null, result.photosets.photoset);
    });
  },
  function(photosets, next) {
    // Sync directories to flickr
    // Get directories to sync
    var photosPath = path.resolve(conf.photos.path);
    winston.debug('Photosets', JSON.stringify(photosets));
    winston.debug('Directory path to sync', photosPath);
    if (!fs.existsSync(photosPath)) {
      return next('Dircectory path to sync doesn\'t exist: '+photosPath)
    }
    var directories = fileHelper.getDirectories(photosPath);
    if (conf.photos.mode === 'download') {
      return next(null, photosets, directories);
    }

    // Function to exclude directories to sync
    var filteredDirectories = fileHelper.applyExclusionRules(directories);
    winston.info(filteredDirectories.length + ' directories to sync', JSON.stringify(filteredDirectories));
    var tasks = [];
    _.each(filteredDirectories, function(directory) {
      tasks.push(
        function(parallelCallback) {
          uploadDirectory(_Flickr, directory, photosets, parallelCallback);
        }
      );
    });
    async.parallelLimit(tasks, conf.photos.parallelUploadDirectories, function(error, results) {
      next(null, photosets, directories);
    }); 
  },
  function(photosets, directories, next) {
    var directoriresName = [];
    _.each(directories, function(directory) {
      directoriresName.push(path.basename(directory));
    });
    var photosetsName = _.pluck(_.pluck(photosets, "title"), "_content");
    var filteredPhotosetsName = fileHelper.applyExclusionRules(photosetsName);
    var newPhotosets = [];
    var tasks = [];
    _.each(photosets, function(photoset, parallelCallback) {
      if (_.contains(filteredPhotosetsName, photoset.title._content) && !_.contains(directoriresName, photoset.title._content)) {
        newPhotosets.push(photoset);
      }
    });

    switch(conf.photos.mode) {
      case 'sync':
      case 'download':
        // Download photoset from flickr
        winston.info(newPhotosets.length+' photosets to download', JSON.stringify(newPhotosets));
        _.each(newPhotosets, function(photoset) {
          tasks.push(
            function(parallelCallback) {
              downloadDirectory(_Flickr, photoset, path.join(conf.photos.path, photoset.title._content), function(error) {
                parallelCallback();
              });
            }
          );
        });
        async.parallelLimit(tasks, conf.photos.parallelDownloadDirectories || 1, function(error, results) {
          next(null, photosets, directories);
        }); 
        break;
      case 'mirror':
        // Remove photoset from flickr
        winston.info(newPhotosets.length+' photosets to remove', JSON.stringify(newPhotosets));
        var removePhotoset = _.find(conf.photos.trash, {"type": "mirror"});
        _.each(newPhotosets, function(photoset) {
          tasks.push(
            function(parallelCallback) {
              //downloadDirectory(_Flickr, photoset, path.join(conf.photos.path, photoset.title._content), parallelCallback);
              photoSetManager.removePhotoset(_Flickr, photoset, removePhotoset, function(error) {
                parallelCallback();
              });
            }
          );
        });
        async.parallelLimit(tasks, conf.photos.parallelDownloadDirectories || 1, function(error, results) {
          next(null, photosets, directories);
        }); 

        break;
      case 'upload':
      default:
        next(null, photosets, directories);
    }
  }
], function(error, result) {
  if (error) {
    return winston.error(error.toString());
  }
  winston.info("Good job");
});