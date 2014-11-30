var      async = require('async')
        Flickr = require("flickrapi"), 
   tokenHelper = require('../helpers/tokenHelper');

var _Flickr = null;
async.waterfall([
  function(next) { 
    tokenHelper.init(next);
  },
  function(token, next) {
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
    var ids = [];
    async.each(photos, function(photo, eachCallback) {
      _Flickr.photos.delete({'photo_id': photo.id}, eachCallback);
    }, next);
  }
], function(error, results) {
  if (error) {
    return console.log(error);
  }
  //console.log('Deleted IDs: '+JSON.stringify(results));
  console.log("End good job ");
});