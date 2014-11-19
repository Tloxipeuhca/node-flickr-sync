var        _ = require('lodash'),
       async = require('async'),
        conf = require('../helpers/confHelper'),
  fileHelper = require('../helpers/fileHelper'),
          fs = require('fs'),
        path = require('path'),
uploadPhotos = require('./uploadPhotos'),
     winston = require('winston');

var createPhotosetAndUploadPhotos = module.exports.createPhotosetAndUploadPhotos = function(flickrApi, photoSetName, dirPath, files, callback) {
  async.waterfall([
    function(next) {
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