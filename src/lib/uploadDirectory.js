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
        //winston.info("Create photoset", JSON.stringify({"name": path.basename(dirPath)}));
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
      var     newPhotos = [],
         existingPhotos = [],
        duplicatePhotos = [];
      _.each(files, function(file) {
        var fileName = path.basename(file, path.extname(file));
        var results = _.where(photos, {'title': fileName});
        if (results.length === 0) {
          newPhotos.push(file);
        }
        else {
          results[0].path = file;
          existingPhotos.push(results.shift());
          duplicatePhotos.push(results);
        }
      });

      photoSetManager.uploadPhotosToPhotoset(flickrApi, photoset, dirPath, newPhotos, function(error, results) {
        return next(error, existingPhotos, _.flatten(duplicatePhotos));
      });
    },
    function(existingPhotos, duplicatePhotos, next) {
      // Update photos perms if needed
      var tasks = [];
      _.each(existingPhotos, function(photo) {
        var photoConf = fileHelper.getFileInfos(dirPath, photo.path);
        if (photo.ispublic !== photoConf.isPublic ||
            photo.isfriend !== photoConf.isFriend ||
            photo.isfamily !== photoConf.isFamily) {
          console.log(photoConf)
          winston.info("Update photo perms", JSON.stringify(photo));
          tasks.push(
            function(parallelCallback) {
              flickrApi.photos.setPerms({"photo_id": photo.id, "is_public": photoConf.isPublic, "is_friend": photoConf.isFriend, "is_family": photoConf.isFamily}, parallelCallback);
            }
          );
        }
      });
      async.parallelLimit(tasks, conf.photos.parallelUpdatePerms || 1, function(error) {
        return next(error, existingPhotos, duplicatePhotos);
      }); 
    },
    function(existingPhotos, duplicatePhotos, next) {
      if (!conf.photos.updateTags) {
        return next(null, existingPhotos, duplicatePhotos);
      }

      // Update photos tags
      var tasks = [];
      var photosConf = conf.photos;
      _.each(existingPhotos, function(photo) { 
        tasks.push(
          function(parallelCallback) {
            updatePhotoTags(flickrApi, photo, photo.path, dirPath, parallelCallback);
          }
        );
      });
      async.parallelLimit(tasks, photosConf.parallelUpdateTags || 1, function(error, results) {
        return next(error, results, duplicatePhotos);
      }); 
    }, 
    function(existingPhotos, duplicatePhotos, next) {
      if (!conf.photos.removeDuplicated || duplicatePhotos.length === 0) {
        return next(null);
      }

      // Remove duplicated photos
      winston.info("Duplicated photos", JSON.stringify(duplicatePhotos));
      var tasks = [];
      _.each(duplicatePhotos, function(photo) { 
        tasks.push(
          function(parallelCallback) {
            photoSetManager.deletePhoto(flickrApi, photoset, photo, parallelCallback);
          }
        );
      });
      async.parallelLimit(tasks, 1, function(error, results) {
        return next(null);
      }); 
    }
  ], callback);
};

var updatePhotoTags = module.exports.updatePhotoTags = function(flickrApi, photo, filePath, dirPath, callback) {
  async.waterfall([
    function(next) {
      flickrApi.photos.getInfo({"photo_id": photo.id}, function(error, result) {
        if (error) {
          return next(error, photo);
        }
        return next(null, result.photo);
      });
    },
    function(photoInfo, next) {
      var fileInfo = fileHelper.getFileInfos(dirPath, filePath);
      var photoTags = _.pluck(photoInfo.tags.tag, "raw").sort();
      var fileTags = fileInfo._tags.sort();
      var isEqual = _.isEqual(photoTags, fileTags);
      winston.debug("Photo tags", JSON.stringify({"id": photo.id, "photo": photoTags, "file": fileTags, "isEqual": isEqual}));

      if (isEqual) {
        return next(null, photo);
      }
      winston.info("Update photo tags", JSON.stringify({"id": photo.id}));
      flickrApi.photos.setTags({"photo_id": photo.id, "tags": fileInfo.tags}, function(error, result) {
        next(error, photo);
      });
    }
  ], function(error, photo) {
    if (error) {
      winston.warn("Update photo tags", e.toString());
    }
    callback(null, photo);
  });
}