var                _ = require('lodash'),
               async = require('async'),
                conf = require('../helpers/confHelper'),
          fileHelper = require('../helpers/fileHelper'),
                  fs = require('fs'),
                path = require('path'),
     photoSetManager = require('./photoSetManager'),           
             winston = require('winston');

module.exports = function(flickrApi, dirPath, photosets, callback) {
  async.waterfall([
    function(next) {
      // List all files recursively
      fileHelper.getPhotosRecursively(dirPath, next);
    },
    function(files, next) {
      if (files.length === 0) {
        return next();
      }
      // Check if flickr photoset exist
      var results = _.where(photosets.photoset, {'title': {'_content': path.basename(dirPath)}});
      // New photoset, upload photos
      if (results.length === 0) {
        return photoSetManager.createPhotosetAndUploadPhotos(flickrApi, path.basename(dirPath), dirPath, files, next);
      }
      // Sync existing photoSet
      return syncExistingPhotoSet(flickrApi, results[0], dirPath, files, next)
    }
  ], callback);
}

var syncExistingPhotoSet = module.exports.syncExistingPhotoSet = function(flickrApi, photoset, dirPath, files, callback) {
  async.waterfall([
    function(next) {
      flickrApi.photosets.getPhotos({"photoset_id": photoset.id}, function(error, results) {
        if (error) {
          return next(error);
        }
        return next(null, results.photoset.photo);
      });
    },
    function(photos, next) {
      var    newPhotos = [],
        existingPhotos = [];
      _.each(files, function(file) {
        var fileName = path.basename(file, path.extname(file));
        var results = _.where(photos, {'title': fileName});
        if (results.length === 0) {
          newPhotos.push(file);
        }
        else {
          existingPhotos.push(results[0]);
        }
      });

      photoSetManager.uploadPhotosToPhotoset(flickrApi, photoset, dirPath, newPhotos, function(error, results) {
        return next(error, existingPhotos);
      });
    },
    function(existingPhotos, next) {
      // Update photos perms
      var tasks = [];
      var photosConf = conf.photos;
      _.each(existingPhotos, function(photo) {
        if (photo.ispublic !== photosConf.isPublic ||
            photo.isfriend !== photosConf.isFriend ||
            photo.isfamily !== photosConf.isFamily) {
          winston.info("Update photo", JSON.stringify(photo));
          tasks.push(
            function(parallelCallback) {
              flickrApi.photos.setPerms({"photo_id": photo.id, "is_public": photosConf.isPublic, "is_friend": photosConf.isFriend, "is_family": photosConf.isFamily}, parallelCallback)
            }
          );
        }
      });
      async.parallelLimit(tasks, photosConf.parallelUpdatePerms || 1, next); 
    }
  ], callback);
};