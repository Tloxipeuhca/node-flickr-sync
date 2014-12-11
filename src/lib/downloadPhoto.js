var    _ = require('lodash'), 
   async = require('async'),
      fs = require('fs'),
 request = require('request');

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

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
      //console.log('*************photoInfo*********************')
      //console.log(photoInfo)
      //console.log(photoSizes)
      //console.log(JSON.parse(htmlDecode(photoInfo.description._content)))
      var originalPhoto = _.where(photoSizes, {'label': 'Original'});
      if (originalPhoto.length === 0) {
        return next(null, photo);
      }
      //console.log(originalPhoto[0].source)
      //console.log(dirPath+'\\'+photoInfo.title._content+'.'+photoInfo.originalformat)
      download(originalPhoto[0].source, dirPath+'\\'+photoInfo.title._content+'.'+photoInfo.originalformat, next);
    }
  ], function(error, photo) {
    if (error) {
      winston.warn("Download photo", e.toString());
    }
    callback(null, photo);
  });
};

function htmlEncode(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function htmlDecode(value){
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}