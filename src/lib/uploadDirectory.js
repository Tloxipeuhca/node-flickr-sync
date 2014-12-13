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
      var results = _.where(photosets, {'title': {'_content': path.basename(dirPath)}});
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
      winston.debug("Get photoset photos", JSON.stringify({"id": photoset.id, "name": photoset.title._content}));
      getPhotosetPhotos(flickrApi, photoset.id, next);
    },
    function(photos, next) {
      // Upload new photos
      var newFlickPhotos = [],
          newLocalPhotos = [],
          existingPhotos = [],
               filesName = [];
         duplicatePhotos = [];
      _.each(files, function(file) {
        var fileName = path.basename(file, path.extname(file));
        filesName.push(fileName);
        var results = _.where(photos, {'title': fileName});
        if (results.length === 0) {
          newFlickPhotos.push(file);
        }
        else {
          results[0].path = file;
          existingPhotos.push(results.shift());
          duplicatePhotos.push(results);
        }
      });

      _.each(photos, function(photo) {
        if (!_.contains(filesName, photo.title)) {
          photo.dirPath = dirPath;
          newLocalPhotos.push(photo);
        }
      });

      photoSetManager.uploadPhotosToPhotoset(flickrApi, photoset, dirPath, newFlickPhotos, function(error, results) {
        return next(error, existingPhotos, _.flatten(duplicatePhotos), newLocalPhotos);
      });
    },
    function(existingPhotos, duplicatePhotos, newLocalPhotos, next) {
      // Update photos perms if needed
      var tasks = [];
      _.each(existingPhotos, function(photo) {
        var photoConf = fileHelper.getFileInfos(dirPath, photo.path);
        var isEqual = !(photo.ispublic !== photoConf.isPublic ||
                       photo.isfriend !== photoConf.isFriend ||
                       photo.isfamily !== photoConf.isFriend);
        winston.debug("Check photo perms", JSON.stringify({"id": photo.id, "isEqual": isEqual, "photo": {
          "isPublic": photo.ispublic,
          "isFriend": photo.isfriend,
          "isFamily": photo.isfamily
        }, "file": {
          "isPublic": photoConf.isPublic,
          "isFriend": photoConf.isFriend,
          "isFamily": photoConf.isFriend
        }}));
        if (!isEqual) {
          var perms = {"photo_id": photo.id, "is_public": photoConf.isPublic, "is_friend": photoConf.isFriend, "is_family": photoConf.isFamily};
          winston.info("Update photo perms", JSON.stringify(perms));
          tasks.push(
            function(parallelCallback) {
              flickrApi.photos.setPerms(perms, parallelCallback);
            }
          );
        }
      });
      async.parallelLimit(tasks, conf.photos.parallelUpdatePerms || 1, function(error) {
        return next(error, existingPhotos, duplicatePhotos, newLocalPhotos);
      }); 
    },
    function(existingPhotos, duplicatePhotos, newLocalPhotos, next) {
      if (!conf.photos.updateTags && !conf.photos.updateDescription) {
        return next(null, existingPhotos, duplicatePhotos, newLocalPhotos);
      }

      // Update photos info
      var tasks = [];
      var photosConf = conf.photos;
      _.each(existingPhotos, function(photo) { 
        tasks.push(
          function(parallelCallback) {
            updatePhotoInfos(flickrApi, photo, photo.path, dirPath, parallelCallback);
          }
        );
      });
      async.parallelLimit(tasks, photosConf.parallelUpdateInfos || 1, function(error, results) {
        return next(error, results, duplicatePhotos, newLocalPhotos);
      }); 
    }, 
    function(existingPhotos, duplicatePhotos, newLocalPhotos, next) {
      if (!conf.photos.removeDuplicated || duplicatePhotos.length === 0) {
        return next(null, existingPhotos, duplicatePhotos, newLocalPhotos);
      }

      // Remove duplicated photos
      winston.info("Remove duplicated photos", JSON.stringify(duplicatePhotos));
      var tasks = [];
      var duplicatedPhotoset = _.find(conf.photos.trash, {"type": "duplicated"});
      _.each(duplicatePhotos, function(photo) { 
        tasks.push(
          function(parallelCallback) {
            photoSetManager.removePhoto(flickrApi, photoset, photo, duplicatedPhotoset, parallelCallback);
          }
        );
      });
      async.parallelLimit(tasks, 1, function(error, results) {
        return next(error, existingPhotos, results, newLocalPhotos);
      }); 
    },
    function(existingPhotos, duplicatePhotos, newLocalPhotos, next) {
      if (newLocalPhotos.length === 0) {
        return next(null, existingPhotos, duplicatePhotos, newLocalPhotos);
      }
      switch(conf.photos.mode) {
        case 'mirror':
          // Remove non existing photos
          winston.info("Remove photos", JSON.stringify(newLocalPhotos));
          var tasks = [];
          var mirrorPhotoset = _.find(conf.photos.trash, {"type": "mirror"});
          _.each(newLocalPhotos, function(photo) { 
            tasks.push(
              function(parallelCallback) {
                photoSetManager.removePhoto(flickrApi, photoset, photo, mirrorPhotoset, parallelCallback);
              }
            );
          });
          async.parallelLimit(tasks, 1, function(error, results) {
            return next(error, existingPhotos, duplicatePhotos, results);
          }); 
          break;
        case 'sync':
        case 'download':
          // Download non existing photos
          winston.info("Download photos", JSON.stringify(newLocalPhotos));
          var tasks = [];
          _.each(newLocalPhotos, function(photo) { 
            tasks.push(
              function(parallelCallback) {
                downloadPhoto(flickrApi, photo, photo.dirPath, parallelCallback);
              }
            );
          });
          async.parallelLimit(tasks, 1, function(error, results) {
            return next(error, existingPhotos, duplicatePhotos, results);
          }); 
          break;
        case 'upload':
        default:
          return next(null, existingPhotos, duplicatePhotos, newLocalPhotos);
      }      
    }
  ], callback);
};

var updatePhotoInfos = module.exports.updatePhotoInfos = function(flickrApi, photo, filePath, dirPath, callback) {
  var fileInfo = fileHelper.getFileInfos(dirPath, filePath);
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
      var photoTags = _.pluck(photoInfo.tags.tag, "raw").sort();
      var fileTags = fileInfo._tags.sort();
      var isEqual = _.isEqual(photoTags, fileTags);
      winston.debug("Check photo tags", JSON.stringify({"id": photo.id, "isEqual": isEqual, "photo": photoTags, "file": fileTags}));

      if (isEqual) {
        return next(null, photoInfo);
      }
      winston.info("Update photo tags", JSON.stringify({"id": photo.id, "title": photo.title}));
      flickrApi.photos.setTags({"photo_id": photo.id, "tags": fileInfo.tags}, function(error, result) {
        next(error, photoInfo);
      });
    },
    function(photoInfo, next) {
      var photoDescription = htmlHelper.htmlDecode(photoInfo.description._content);
      var isEqual = photoDescription === fileInfo.description;
      winston.debug("Check photo description", JSON.stringify({"id": photo.id, "isEqual": isEqual, "photo": photoDescription, "file": fileInfo.description}));
      if (isEqual) {
        return next(null, photo);
      }
      winston.info("Update photo description", JSON.stringify(_.extend({"id": photo.id, "title": photo.title}, fileInfo._description)));
      flickrApi.photos.setMeta({"photo_id": photo.id, "description": fileInfo.description}, function(error, result) {
        next(error, photo);
      });
    }
  ], function(error, photo) {
    if (error) {
      winston.warn("Update photo infos", e.toString());
    }
    callback(null, photo);
  });
};