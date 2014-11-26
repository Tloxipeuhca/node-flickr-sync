var       async = require('async')
         Flickr = require("flickrapi"), 
    tokenHelper = require('../helpers/tokenHelper');

var photoId = '15540907729';

async.waterfall([
  function(next) { 
    tokenHelper.init(next);
  },
  function(token, next) {
    Flickr.authenticate(token, next);
  },
  function(flickr, next) {
  	flickr.photos.delete({'photo_id': photoId}, next);
  }
], function(error, result) {
  if (error) {
    return console.log(error);
  }
  console.log("end good job");
});