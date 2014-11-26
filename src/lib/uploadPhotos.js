var        _ = require('lodash'),
       async = require('async'),
        conf = require('../helpers/confHelper'),
  fileHelper = require('../helpers/fileHelper'),
      Flickr = require("flickrapi"), 
          fs = require('fs'),
        path = require('path'),
 tokenHelper = require('../helpers/tokenHelper'),
     winston = require('winston');

module.exports = function(flickrApi, dirPath, filePaths, callback) {
  async.waterfall([
    function(next) {
      tokenHelper.init(next);
    },
    function(token, next) {
      var photos = [];
      _.each(filePaths, function(filePath) {
        var fileInfo = fileHelper.getFileInfos(dirPath, filePath);
        photos.push({
          title: fileInfo.nameWithoutExt,
          tags: fileInfo.tags.join(' '),
          photo: fileInfo.path,
          description: JSON.stringify(_.pick(fileInfo, 'relativePath')),
          is_public: conf.photos.isPublic, 
          is_friend: conf.photos.isFriend, 
          is_family: conf.photos.isFamily
        });
      });
      var clonedPhotos = _.clone(photos);
      var uploadOptions = {photos: photos};
      winston.info("Upload photos", JSON.stringify(uploadOptions.photos));
      Flickr.upload(uploadOptions, token, function(error, results) {
        if (error) {
          winston.error(error);
          // Don't add error to continue the process
          return next(null, clonedPhotos);
        }
        _.each(clonedPhotos, function(photo, index) {
          photo.id = results[index];
        });
        winston.info("Upload photos success", JSON.stringify(clonedPhotos));
        next(null, clonedPhotos);
      });
    }
  ], callback);  
};