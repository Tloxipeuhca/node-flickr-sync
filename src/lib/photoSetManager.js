var        _ = require('lodash'),
       async = require('async'),
        conf = require('../helpers/confHelper'),
  fileHelper = require('../helpers/fileHelper'),
          fs = require('fs'),
        path = require('path'),
uploadPhotos = require('./uploadPhotos'),
     winston = require('winston');

module.exports.createPhotosetAndUploadPhotos = function(flickrApi, photoSetName, dirPath, files, callback) {
  async.waterfall([
    function(next) {
      // Upload first photos
      uploadPhotos(flickrApi, dirPath, [files.shift()], next);
    },
    function(photos, next) {
      // Create photoset
      flickrApi.photosets.create({'title': photoSetName, 'primary_photo_id': photos[0].id}, function(error, photosets) {
        if (error) {
          return next(error);
        }
        next(null, photosets.photoset);
      });
    },
    function(photoset, next) {
      // Upload others photos and add it to photoSet
      uploadPhotosToPhotoset(flickrApi, photoset, dirPath, files, callback);
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
            flickrApi.photosets.addPhoto({'photoset_id': photoset.id, 'photo_id': photos[0].id}, next);
          }
        ], parallelCallback);
      }
    );
  });
  var parallelUpload = (conf && conf.photos) ? conf.photos.parallelUploadPhotos : 1;
  async.parallelLimit(tasks, parallelUpload, callback); 
};