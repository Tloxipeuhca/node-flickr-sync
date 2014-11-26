var                _ = require('lodash'),
               async = require('async'),
                conf = require('../helpers/confHelper'),
          fileHelper = require('../helpers/fileHelper'),
                  fs = require('fs'),
   getPhotosetPhotos = require('./getPhotosetPhotos'),
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
        winston.info("Create photoset", JSON.stringify({"name": path.basename(dirPath)}));
        return photoSetManager.createPhotosetAndUploadPhotos(flickrApi, path.basename(dirPath), dirPath, files, next);
      }
      // Sync existing photoSet
      return syncExistingPhotoSet(flickrApi, results[0], dirPath, files, next)
    }
  ], callback);
};

var syncExistingPhotoSet = module.exports.syncExistingPhotoSet = function(flickrApi, photoset, dirPath, files, callback) {
  async.waterfall([
    function(next) {
      winston.info("Get photoset photos", JSON.stringify({"id": photoset.id, "name": photoset.title._content}));
      getPhotosetPhotos(flickrApi, photoset.id, next);
    },
    function(photos, next) {
      // Upload new photos
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
      // Update photos perms if needed
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
      async.parallelLimit(tasks, photosConf.parallelUpdatePerms || 1, function(error) {
        return next(error, existingPhotos);
      }); 
    },
    function(existingPhotos, next) {
      // Update photos tags
      // Algo
      // 1) get photo from photo.id
      // 2) get current photos tags (fileHelper.getFileInfos(dirPath, (photo.comment.relativePath || currentFolder);
      // 3) update tags
      // var fileInfo = fileHelper.getFileInfos(dirPath, filePath);
      return next();
    }
  ], callback);
};