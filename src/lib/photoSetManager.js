var        _ = require('lodash'),
       async = require('async'),
        conf = require('../helpers/confHelper'),
  fileHelper = require('../helpers/fileHelper'),
          fs = require('fs'),
   getPhotosetPhotos = require('./getPhotosetPhotos'),
        path = require('path'),
 tokenHelper = require('../helpers/tokenHelper'),
uploadPhotos = require('./uploadPhotos'),
     winston = require('winston');

var createPhotosetAndUploadPhotos = module.exports.createPhotosetAndUploadPhotos = function(flickrApi, photoSetName, dirPath, files, callback) {
  async.waterfall([
    function(next) {
      winston.info("Create photoset", JSON.stringify({"name": photoSetName}));
      if (files.length < 1) {
        return next('One photo is required to create a photoset.');
      }
      // Upload first photos
      uploadPhotos(flickrApi, dirPath, [files.shift()], next);
    },
    function(photos, next) {
      if (!photos[0].id) {
        if (files.length > 0) {
          return createPhotosetAndUploadPhotos(flickrApi, photoSetName, dirPath, files, callback);
        }
        return next(null, null);
      }
      // Create photoset
      winston.info("Create photoset "+photoSetName+" add photo "+ photos[0].id);
      flickrApi.photosets.create({'title': photoSetName, 'primary_photo_id': photos[0].id}, function(error, photosets) {
        if (error) {
          winston.error("Create photoset "+photoSetName);
          return next(error);
        }
        return next(null, photosets.photoset);
      });
      
    },
    function(photoset, next) {
      // Upload others photos and add it to photoSet
      if (files.length > 0) {
        return uploadPhotosToPhotoset(flickrApi, photoset, dirPath, files, next);
      }
      return next();
    } 
  ], callback);
};

var uploadPhotosToPhotoset = module.exports.uploadPhotosToPhotoset = function(flickrApi, photoset, dirPath, files, callback) {
  var tasks = [];
  _.each(files, function(file, parallelCallback) {
    tasks.push(
      function(parallelCallback) {
        async.waterfall([
          function(next) {
            uploadPhotos(flickrApi, dirPath, [file], next);
          },
          function(photos, next) {
            winston.info("Add photo "+photos[0].id+" to photoset "+photoset.id+".");
            flickrApi.photosets.addPhoto({'photoset_id': photoset.id, 'photo_id': photos[0].id}, function(error, result) {
              if (error) {
                winston.error("Add photo "+photos[0].id+" to photoset "+photoset.id+".", error.toString());
              }
              next(null, result);
            });
          }
        ], parallelCallback);
      }
    );
  });
  var parallelUpload = (conf && conf.photos) ? conf.photos.parallelUploadPhotos : 1;
  async.parallelLimit(tasks, parallelUpload, callback); 
};

var removePhotoset = module.exports.removePhotoset = function(flickrApi, photoset, callback) { 
  winston.info("Remove photoset "+photoset.title._content);
  if (_.contains(_.pluck(conf.photos.trash, 'name'), photoset.title._content)) {
    winston.warn("Remove photoset, you can't remove these photosets", JSON.stringify(_.pluck(conf.photos.trash, 'name')));
    return callback(null);
  }
  async.waterfall([
    function(next) {
       tokenHelper.init(next);
    },
    function(token, next) {
      getPhotosetPhotos(flickrApi, photoset.id, next);
    },
    function(photos, next) {
      var tasks = [];
      _.each(photos, function(photo) {
        tasks.push(
          function(parallelCallback) {
            removePhoto(flickrApi, photoset, photo, function(error) {
              parallelCallback();
            });
          }
        );
      });
      async.parallelLimit(tasks, 1, next); 
    }
  ], function(error) {
    if (error) {
      winston.error("Remove photoset "+photoset.title._content+" photos.", error.toString());
    }
    callback(null);
  });  
};

var removePhoto = module.exports.removePhoto = function(flickrApi, photoset, photo, callback) { 
  winston.info("Remove photo", JSON.stringify({"photoset": { "id": photoset.id, "title": photoset.title._content}, "photo": photo.id}));
  if (_.contains(_.pluck(conf.photos.trash, 'name'), photoset.title._content)) {
    winston.warn("Remove photo, you can't remove photo from these photosets", JSON.stringify(_.pluck(conf.photos.trash, 'name')));
    return callback(null);
  }
  async.waterfall([
    function(next) {
       tokenHelper.init(next);
    },
    function(token, next) {
      flickrApi.photosets.getList({"user_id": token.user_id, "perpage": 100000}, function(error, result) {
        if (error) {
          return next(error);
        }
        next(null, result.photosets.photoset);
      })
    },
    function(photosets, next) {
      // Copy photo to trash
      var duplicatedAlbumName = _.find(conf.photos.trash, {"name": "duplicated"});
      var results = _.where(photosets, {'title': {'_content': duplicatedAlbumName}});
      if (results.length === 0) {
        flickrApi.photosets.create({'title': duplicatedAlbumName, 'primary_photo_id': photo.id}, function(error, photosets) {
          if (error) {
            return next("Create photoset "+photoSetName);
          }
          return next(null);
        });
      }
      else {
        flickrApi.photosets.addPhoto({'photoset_id': results[0].id, 'photo_id': photo.id}, function(error, result) {
          if (error) {
            return next("Add photo "+photo.id+" to photoset "+results[0].id+".", error.toString());
          }
          return next(null);
        });      
      }
    },
    function(next) {
      // Add meta
      flickrApi.photos.setMeta({'photo_id': photo.id, "description": JSON.stringify({"from": {"id": photoset.id, "title": photoset.title._content}})}, function(error, result) {
        if (error) {
          return next("Add meta to photo "+photo.id, error.toString());
        }
        next(null);
      });
    },
    function(next) {
      // Remove photo from current photoset
      flickrApi.photosets.removePhoto({'photoset_id': photoset.id, 'photo_id': photo.id}, function(error, result) {
        if (error) {
          return next("Remove photo "+photo.id+" from photoset "+photoset.id, error.toString());
        }
        next(null);
      });
    }
  ], function(error) {
    if (error) {
      winston.error("Remove photo "+photo.id+" from "+photoset.title._content+". ", error.toString());
    }
    callback(null);
  });  
};

var deletePhotoset = module.exports.deletePhotoset = function(flickrApi, photoset, callback) { 
  winston.info("Delete photoset "+photoset.title._content);
  if (!_.contains(_.pluck(conf.photos.trash, 'name'), photoset.title._content)) {
    winston.warn("Delete photoset, you can't only delete these photosets", JSON.stringify(_.pluck(conf.photos.trash, 'name')));
    return callback(null);
  }
  async.waterfall([
    function(next) {
       tokenHelper.init(next);
    },
    function(token, next) {
      getPhotosetPhotos(flickrApi, photoset.id, next);
    },
    function(photos, next) {
      var tasks = [];
      _.each(photos, function(photo) {
        tasks.push(
          function(parallelCallback) {
            deletePhoto(flickrApi, photoset, photo, function(error) {
              parallelCallback();
            });
          }
        );
      });
      async.parallelLimit(tasks, 1, next); 
    }
  ], function(error) {
    if (error) {
      winston.error("Delete photoset "+photoset.title._content+" photos.", error.toString());
    }
    callback(null);
  });
};

var deletePhoto = module.exports.deletePhoto = function(flickrApi, photoset, photo, callback) { 
  winston.info("Delete photo "+photo.id);
  if (!_.contains(_.pluck(conf.photos.trash, 'name'), photoset.title._content)) {
    winston.warn("Delete photo, you can't only delete photo from these photosets", JSON.stringify(_.pluck(conf.photos.trash, 'name')));
    return callback(null);
  }
  flickrApi.photos.delete({'photo_id': photo.id}, function(error, result) {
    if (error) {
      winston.error('Delete photo', error.toString());
    }
    callback(null, result);
  });
};