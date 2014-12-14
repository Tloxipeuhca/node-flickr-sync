var                _ = require('lodash'),
               async = require('async'),
                conf = require('../helpers/confHelper'),
       downloadPhoto = require('./downloadPhoto'),
          fileHelper = require('../helpers/fileHelper'),
                  fs = require('fs'),
   getPhotosetPhotos = require('./getPhotosetPhotos'),
          htmlHelper = require('../helpers/htmlHelper'), 
                path = require('path'),
     photoSetManager = require('./photoSetManager'),           
             winston = require('winston');

module.exports = function(flickrApi, photoset, dirPath, callback) {
  async.waterfall([
    function(next) {
      // List all photos
      getPhotosetPhotos(flickrApi, photoset.id, next);
    },
    function(photos, next) {
      var tasks = [];
      _.each(photos, function(photo) { 
        tasks.push(
          function(parallelCallback) {
            downloadPhoto(flickrApi, photo, dirPath, parallelCallback);
          }
        );
      });
      async.parallelLimit(tasks, conf.photos.parallelDownloadPhotos || 1, next); 
    }
  ], callback);
};