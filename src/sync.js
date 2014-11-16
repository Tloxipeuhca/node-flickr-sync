var             _ = require('lodash'),
            async = require('async'),
             conf = require('./helpers/confHelper'),
       fileHelper = require('./helpers/fileHelper'),
           Flickr = require("flickrapi"), 
               fs = require('fs'),
            token = require('./helpers/tokenHelper'),
  uploadDirectory = require('./lib/uploadDirectory'),
          winston = require('winston');

// How to execute
// optional argv2, argv3
// node src/sync.js
// node src/sync.js argConf.json argToken.json

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

var _Flickr = null;
async.waterfall([
  function(next) {
    // Get flickr token
    Flickr.authenticate(token, next);
  },
  function(flickr, next) {
    // Get all photosets
    _Flickr = flickr;
    _Flickr.photosets.getList({"user_id": token.user_id, "perpage": 100000}, function(error, result) {
      if (error) {
        return next(error);
      }
      next(null, result.photosets);
    })
  },
  function(photosets, next) {
    // Get directories to sync
    winston.debug('Photosets', JSON.stringify(photosets));
    winston.debug('Directory path to sync', conf.photos.path);
    if (!fs.existsSync(conf.photos.path)) {
      return next('Dircectory paht to sync doesn\'t exist: '+conf.photos.path)
    }
    var directories = fileHelper.getDirectories(conf.photos.path);
    // Function to exclude directories to sync
    directories = fileHelper.applyExclusionRules(directories);
    winston.debug('Directories to sync', JSON.stringify(directories));
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
    return winston.error(error);
  }
  winston.info("Good job");
});