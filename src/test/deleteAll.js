var async = require('async')
   Flickr = require("flickrapi"), 
    token = require('../helpers/tokenHelper');

var _Flickr = null;
async.waterfall([
  function(next) {
    Flickr.authenticate(token, next);
  },
  function(flickr, next) {
    _Flickr = flickr;
  	_Flickr.photos.search({'user_id': flickr.options.user_id}, function(error, result) {
      if (error) {
        return next(error);
      }
      return next(null, result.photos.photo);
    });
  },
  function(photos, next) {
    async.each(photos, function(photo, eachCallback) {
      console.log(photo.id);
      _Flickr.photos.delete({'photo_id': photo.id}, eachCallback);
    }, next);
  }
], function(error, result) {
  if (error) {
    return console.log(error);
  }
  console.log(result);
  console.log("end good job ");
});