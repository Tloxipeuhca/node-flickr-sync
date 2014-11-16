var async = require('async')
   Flickr = require("flickrapi"), 
    token = require('../helpers/tokenHelper');

async.waterfall([
  function(next) {
    Flickr.authenticate(token, next);
  },
  function(flickr, next) {
  	flickr.photos.search({
  		'user_id': flickr.options.user_id
  	}, next);
  }
], function(error, result) {
  if (error) {
    return console.log(error);
  }
  console.log(result.photos.photo);
  console.log("end good job "+result.photos.total);
});