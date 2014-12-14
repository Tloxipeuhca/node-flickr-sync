var        _ = require('lodash'), 
       async = require('async'),
          fs = require('fs'),
  htmlHelper = require('../helpers/htmlHelper'),
      mkdirp = require('mkdirp'),
        path = require('path'),
     request = require('request'),
     winston = require('winston');

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    //console.log('content-type:', res.headers['content-type']);
    //console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

module.exports = function(flickrApi, photo, dirPath, callback) {
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
      flickrApi.photos.getSizes({"photo_id": photo.id}, function(error, result) {
        if (error || !result.sizes || !result.sizes.size) {
          return next(error, photo);
        }
        return next(null, result.sizes.size, photoInfo);
      });
    },
    function(photoSizes, photoInfo, next) {
      var originalPhoto = _.where(photoSizes, {'label': 'Original'});
      if (originalPhoto.length === 0) {
        return next(null, photo);
      }
      var description = {};
      
      try {
        description = JSON.parse(htmlHelper.htmlDecode(photoInfo.description._content));
        dirPath = path.join(dirPath, description.relativePath);
      }
      catch(e) {
        winston.warn("Donwload photo, description is not a valid JSON", JSON.stringify(htmlHelper.htmlDecode(photoInfo.description._content)));
      }

      var filePath = path.join(dirPath, photoInfo.title._content+'.'+photoInfo.originalformat);
      winston.info("Donwload photo", JSON.stringify({"photo": {"path": originalPhoto[0].source}, "file": {"path": filePath}}));

      try {
        if(!fs.existsSync(dirPath)) {
          mkdirp.sync(dirPath);
        }
        download(originalPhoto[0].source, filePath, next);
      }
      catch(e) {
        next("can't create dir "+dirPath);
      }
    }
  ], function(error, photo) {
    if (error) {
      winston.error("Download photo", error.toString());
    }
    callback(null, photo);
  });
};

